import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  BOB,
  FILL,
  FIT_MARGIN,
  FOLLOW,
  IMPULSE,
  LAPTOP,
  MAX_TILT,
  OPEN_THRESHOLD,
  POSE_SPRING,
} from '../lib/config.js';
import { Spring, clamp, cubicBezier, degToRad, lerp } from '../lib/spring.js';
import * as THREE from 'three';
import { Laptop } from './Laptop.jsx';

/** Front of the base (z +1.05) to the top of the reclined lid (z -1.85). */
const LAPTOP_DEPTH = 2.9;

/**
 * Vertical extent of the model at a given lid angle, in local units.
 *
 * This matters because the group's origin is the BASE, not the centre: the
 * laptop grows upward from y = 0. A pose at y = 0 therefore put the centroid
 * ~0.93 units above frame centre and the lid top at 1.92 — off the top of the
 * frame at every pose, cropping the screen. Measuring it live also means the
 * clamp is exact while the lid is opening, and lets the shut laptop (0.14 tall)
 * be scaled up instead of being budgeted as if it were 2 units tall.
 */
function modelBounds(hingeDeg) {
  const r = degToRad(hingeDeg);
  const bottom = -LAPTOP.baseHeight / 2;
  const top =
    LAPTOP.baseHeight / 2 +
    Math.sin(r) * LAPTOP.lidDepth +
    Math.cos(r) * (LAPTOP.lidThickness / 2);
  return { height: top - bottom, centre: (top + bottom) / 2 };
}
const SIDE_SIGN = { left: -1, right: 1, center: 0 };

const FILL_EASE = cubicBezier(...FILL.easing);

/** Screen panel size in world units (the lid minus its bezel). */
const SCREEN_W = LAPTOP.width - LAPTOP.bezel * 2;
const SCREEN_H = LAPTOP.lidDepth - LAPTOP.bezel * 2;

/**
 * Offset from the GROUP ORIGIN to the centre of the SCREEN, at a lid angle.
 *
 * The origin is the base, and the screen is two transforms away from it — up
 * onto the lid hinge, then out along the reclined lid. Zooming "into the
 * screen" means putting THIS point on the camera axis, not the group origin,
 * which is 1.04 units below it and 1.22 behind.
 */
function screenCentreLocal(hingeDeg) {
  const r = degToRad(hingeDeg);
  const ly = -0.002;
  const lz = LAPTOP.lidDepth / 2;
  return {
    y: LAPTOP.baseHeight / 2 + (ly * Math.cos(r) + lz * Math.sin(r)),
    z: -LAPTOP.baseDepth / 2 + (-ly * Math.sin(r) + lz * Math.cos(r)),
  };
}

/**
 * Where the laptop must sit for its SCREEN to fill the viewport.
 *
 * This is the 3D equivalent of "what translate/scale makes a nested box cover
 * the window", and it is solved rather than tuned — which is the entire reason
 * the move is correct on a 21:9 monitor and on a phone in portrait.
 *
 * The screen panel is `SCREEN_W x SCREEN_H` world units. At distance d a
 * perspective camera sees a window `2·d·tan(fov/2)` tall and that times the
 * aspect ratio wide. To COVER it, the panel at world scale s must satisfy both:
 *
 *     s·SCREEN_W  >=  2·d·tan(fov/2)·aspect
 *     s·SCREEN_H  >=  2·d·tan(fov/2)
 *
 * Both are linear in d, so let c = max(2·tan(fov/2)·aspect / SCREEN_W,
 * 2·tan(fov/2) / SCREEN_H) — the scale required per unit of distance — and the
 * distance that satisfies the tighter of the two is simply d = s / c.
 *
 * We fix s and solve for d rather than the other way round, so the laptop stays
 * one physical object of one physical size and only its depth in the scene
 * changes with the window shape. Solving for s instead would make the laptop
 * literally grow, and the perspective on the chassis would stop being believable.
 *
 * `max`, not `min`: this is `cover`, not `contain`. The panel's 1.55 aspect
 * almost never matches a browser window, so it overflows on one axis instead of
 * letterboxing — a black bar down the side of a "fullscreen" project page is
 * exactly the seam this whole move exists to avoid.
 */
function fillPlacement(camera, aspect, hingeDeg, out) {
  const tanHalf = Math.tan(degToRad(camera.fov / 2));

  /**
   * The panel is only exactly head-on at FILL.hinge. While the lid is still
   * settling onto that angle it is tilted by Δ, and a tilted rectangle projects
   * to cos(Δ) of its height — so the cover maths has to use the PROJECTED
   * height or the frame shows background along the top edge for the first few
   * hundred milliseconds. Floored so a wild angle can't divide by ~zero.
   */
  const skew = Math.max(Math.cos(degToRad(hingeDeg - FILL.hinge)), 0.2);

  const c =
    Math.max((2 * tanHalf * aspect) / SCREEN_W, (2 * tanHalf) / (SCREEN_H * skew)) * FILL.overscan;
  const scale = FILL.scale;
  const distance = scale / c;

  // Put the SCREEN CENTRE on the camera axis at that distance...
  camera.getWorldDirection(out.dir);
  out.point.copy(camera.position).addScaledVector(out.dir, distance);

  // ...then back off to where the group ORIGIN has to be to achieve it. The
  // origin is the base of the chassis, over a unit below and behind the screen
  // centre — aiming the origin at the camera instead is how you get a zoom that
  // ends up looking at the keyboard.
  const centre = screenCentreLocal(hingeDeg);
  out.x = out.point.x;
  out.y = out.point.y - scale * centre.y;
  out.z = out.point.z - scale * centre.z;
  out.scale = scale;
  return out;
}

/**
 * How much frame a rotated laptop actually covers.
 *
 * Clamping against `LAPTOP.width` alone is wrong the moment a pose turns the
 * laptop: rotating by θ about Y swings the deep dimension into the horizontal
 * silhouette, so the real footprint is `w·|cos θ| + d·|sin θ|`. The work pose
 * (θ ≈ 0.44) is 3.95 units wide, not 3.0 — a 30% under-estimate, which is
 * exactly how it ended up cropped off the right edge.
 */
const footprint = (w, d, angle) => w * Math.abs(Math.cos(angle)) + d * Math.abs(Math.sin(angle));

/** The seven channels that make up a pose. */
const CHANNELS = ['px', 'py', 'pz', 'rx', 'ry', 'rz', 'scale'];

/**
 * The choreographer. Everything that moves the laptop as a whole lives here:
 *
 *   pose      — springs toward the current section's target attitude
 *   tilt      — cursor parallax, added on top of the pose
 *   bob       — idle float, faded out as the lid opens
 *   kick      — scroll momentum and interaction impulses
 *
 * All of it runs in ONE `useFrame` writing straight to the group transform.
 * Nothing here touches React state except the screen-open latch, because
 * mounting the screen's DOM genuinely is a render.
 *
 * The distinction that makes this feel alive: pose changes move a spring's
 * *target*, while interactions inject velocity directly. A target change eases;
 * an injected velocity reads as an impact.
 */
export function LaptopRig({
  angle,
  handlers,
  pose,
  channel,
  project,
  projectKey,
  accent,
  compact,
  theme,
  velocity,
  actions,
  onOpenedChange,
  reducedMotion,
  coarsePointer,
  onBootComplete,
  /**
   * A REF holding true from the moment View is clicked until the page has
   * collapsed — not a boolean prop.
   *
   * `useFrame`'s callback is swapped in a layout effect, and the Canvas subtree
   * has its own reconciler root whose effects flush on their own schedule. A
   * boolean read out of the frame closure is therefore a frame or two behind
   * the DOM — invisible at 60fps, but on a struggling device it leaves the
   * laptop covering the screen for seconds after the page has already gone.
   * A ref is read fresh every frame and cannot go stale. `velocity` is passed
   * the same way, for the same reason.
   */
  filling,
  /** Written every frame with the fill clock, for the launch screen's bar. */
  fillProgress,
  /** Fired once, the frame the screen has finished covering the viewport. */
  onFillArrived,
}) {
  const group = useRef();
  const [opened, setOpened] = useState(false);

  /**
   * The fill move's own clock, 0 (docked) to 1 (screen covering the window).
   *
   * A ref, not state and not a spring. Not state because it changes every frame
   * and would re-render the entire Canvas tree; not a spring because this is an
   * authored cinematic move — see the note on FILL.easing.
   *
   * It runs in BOTH directions off the same number, which is what makes Back an
   * exact reverse rather than a second animation that approximately undoes the
   * first.
   */
  const fill = useRef(0);
  const arrived = useRef(false);
  /** Reused across frames — fillPlacement must not allocate 60x a second. */
  const placement = useMemo(
    () => ({ dir: new THREE.Vector3(), point: new THREE.Vector3(), x: 0, y: 0, z: 0, scale: 1 }),
    [],
  );

  useEffect(() => {
    onOpenedChange?.(opened);
  }, [opened, onOpenedChange]);

  const springs = useMemo(() => {
    const pose7 = Object.fromEntries(CHANNELS.map((c) => [c, new Spring(0, POSE_SPRING)]));
    return {
      ...pose7,
      tiltX: new Spring(0, FOLLOW.tilt),
      tiltY: new Spring(0, FOLLOW.tilt),
      // Kick springs sit at rest on 0; interactions push velocity into them and
      // they oscillate back. Never given a target other than zero.
      kickY: new Spring(0, { stiffness: 55, damping: 7 }),
      kickX: new Spring(0, { stiffness: 70, damping: 9 }),
    };
  }, []);

  // Seeded on the first frame instead of here — x and scale depend on the
  // frustum, which isn't measurable until we're inside useFrame.
  const seeded = useRef(false);

  // ── Impulse on project change ──────────────────────────────────────────
  // Pushing velocity into the Y spring makes the laptop physically flick as the
  // screen swaps content, then wobble back. A tween to a new angle and back
  // would look scripted; this looks struck.
  const lastProject = useRef(projectKey);
  useEffect(() => {
    if (lastProject.current === projectKey) return;
    const forward = projectKey > lastProject.current;
    lastProject.current = projectKey;
    if (reducedMotion) return;
    springs.kickY.velocity += forward ? IMPULSE.project : -IMPULSE.project;
  }, [projectKey, reducedMotion, springs]);

  // A smaller kick when the lid opens, so opening has weight.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (opened && !wasOpen.current && !reducedMotion) {
      springs.kickX.velocity -= IMPULSE.open;
    }
    wasOpen.current = opened;
  }, [opened, reducedMotion, springs]);

  // Pointer target from our own listener rather than r3f's `state.pointer`:
  // that keeps its last value after the cursor leaves the window, so the
  // laptop would stay tilted.
  const pointerTarget = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (reducedMotion || coarsePointer) return undefined;

    const onMove = (event) => {
      pointerTarget.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointerTarget.current.y = -((event.clientY / window.innerHeight) * 2 - 1);
    };
    const onLeave = () => {
      pointerTarget.current.x = 0;
      pointerTarget.current.y = 0;
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    window.addEventListener('blur', onLeave);

    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('blur', onLeave);
    };
  }, [reducedMotion, coarsePointer]);

  useFrame((state, delta) => {
    const node = group.current;
    if (!node || !pose) return;

    const openness = angle.get() / LAPTOP.maxAngle;

    // ── Collision-free placement ─────────────────────────────────────────
    // Measure the frustum AT THE POSE'S OWN Z, every frame. A hard-coded x
    // can't stay clear of the copy, because the visible width at a given
    // depth depends on the viewport aspect — an x that clears the text at
    // 16:9 drives through it at 21:9.
    const view = state.viewport.getCurrentViewport(state.camera, [0, 0, pose.z]);
    const sign = SIDE_SIGN[pose.side] ?? 0;

    // The laptop owns half the frame (or all of it when centred), and sits in
    // the middle of that half.
    const lane = sign === 0 ? view.width : view.width / 2;
    const targetX = sign * (view.width / 4);

    // Clamp so the laptop can never grow wider than its lane, or taller than
    // the frame. This is what makes overlap impossible rather than unlikely.
    // A pose may raise its own margin (the contact stage does) — that gutter
    // exists to clear the copy, so a section with no copy doesn't need it.
    // Measure the ROTATED silhouette, not the axis-aligned box — see the note
    // on `footprint` above. The parallax tilt and the interaction kicks are
    // ADDED to the pose rotation at render time, so the clamp has to budget for
    // the worst case or the laptop clips the frame exactly when you move the
    // cursor to its far side.
    const fit = pose.fit ?? FIT_MARGIN;
    // Parallax tilt is disabled on touch and for reduced motion, so only those
    // paths need to reserve room for it. Budgeting for tilt that never happens
    // shrinks the phone laptop — and with it the legibility of its screen.
    const tiltSlack = reducedMotion || coarsePointer ? 0 : degToRad(MAX_TILT);
    const slack = tiltSlack + 0.1; // + headroom for the kick springs
    const bounds = modelBounds(angle.get());
    const spanX = footprint(LAPTOP.width, LAPTOP_DEPTH, Math.abs(pose.rotation[1]) + slack);
    const spanY = footprint(bounds.height, LAPTOP_DEPTH, Math.abs(pose.rotation[0]) + slack);
    const maxByWidth = (lane * fit) / spanX;
    const maxByHeight = (view.height * fit) / spanY;
    const targetScale = Math.min(pose.scale, maxByWidth, maxByHeight);

    // On narrow screens `y` is a fraction of the visible height so the laptop
    // holds the lower band at any phone aspect; on wide it's world units.
    const targetY = Math.abs(pose.y) <= 1 && sign === 0 ? view.height * pose.y : pose.y;

    if (!seeded.current) {
      springs.px.jump(targetX);
      springs.py.jump(targetY);
      springs.pz.jump(pose.z);
      springs.rx.jump(pose.rotation[0]);
      springs.ry.jump(pose.rotation[1]);
      springs.rz.jump(pose.rotation[2]);
      springs.scale.jump(targetScale);
      seeded.current = true;
    }

    // ── Screen latch, with hysteresis ────────────────────────────────────
    // Without the gap, a lid parked exactly on the threshold would mount and
    // unmount the screen DOM on alternating frames.
    if (!opened && openness >= OPEN_THRESHOLD) setOpened(true);
    else if (opened && openness < OPEN_THRESHOLD - 0.12) setOpened(false);

    // ── Pose ─────────────────────────────────────────────────────────────
    const px = springs.px.set(targetX).step(delta);
    const py = springs.py.set(targetY).step(delta);
    const pz = springs.pz.set(pose.z).step(delta);
    const rx = springs.rx.set(pose.rotation[0]).step(delta);
    const ry = springs.ry.set(pose.rotation[1]).step(delta);
    const rz = springs.rz.set(pose.rotation[2]).step(delta);
    const scale = springs.scale.set(targetScale).step(delta);

    // ── Scroll momentum ──────────────────────────────────────────────────
    // Feeding velocity (not a target) means fast scrolling visibly drags the
    // laptop and it recovers on its own.
    if (!reducedMotion && velocity) {
      const kick = clamp(
        velocity.current * IMPULSE.scroll * delta,
        -IMPULSE.scrollMax,
        IMPULSE.scrollMax,
      );
      springs.kickX.velocity += kick;
      // Consume the sample. ScrollTrigger's onUpdate only fires WHILE scrolling,
      // so the last reading sits there at full value once you stop — without
      // this decay the laptop would keep being kicked forever.
      velocity.current *= Math.exp(-6 * delta);
    }
    const kickY = springs.kickY.set(0).step(delta);
    const kickX = springs.kickX.set(0).step(delta);

    // ── Fill clock ───────────────────────────────────────────────────────
    // Advanced by wall time, then run through the authored curve. Driving the
    // same number forwards and backwards is what makes Back an exact reverse.
    const wants = filling?.current === true;
    const fillMs = reducedMotion ? FILL.reducedMs : FILL.durationMs;
    fill.current = clamp(fill.current + ((wants ? 1 : -1) * delta * 1000) / fillMs, 0, 1);
    const t = FILL_EASE(fill.current);
    // Published raw, not eased: the bar is a readout of how much of the move
    // is done, and easing it would make it stall visibly at both ends.
    if (fillProgress) fillProgress.current = fill.current;

    /**
     * The hand-off is driven by the move itself reaching its end, not by a
     * parallel timer in App. Two clocks drift the moment a tab throttles, and
     * the page would then expand out of a screen still on its way in.
     *
     * The latch clears the moment we stop filling — NOT when the clock reaches
     * zero. Clicking View again during the return trip never lets the clock
     * bottom out, so a latch tied to `fill.current === 0` would still be set,
     * the callback would never fire a second time, and the sequence would sit
     * in `approach` forever with a laptop covering the screen and no page.
     */
    if (!wants) {
      arrived.current = false;
    } else if (fill.current === 1 && !arrived.current) {
      arrived.current = true;
      onFillArrived?.();
    }

    // ── Idle bob ─────────────────────────────────────────────────────────
    // Parallax, bob and kicks fade out as the fill takes over — a screen you
    // are about to read shouldn't drift or lean toward the cursor. Scaling the
    // CONTRIBUTION by `alive` rather than gating on a flag means they ease away
    // WITH the move instead of being switched off under you, and it needs no
    // per-pose opt-in: at t = 1 the laptop is dead steady by construction.
    const alive = 1 - t;

    let bob = 0;
    if (!reducedMotion) {
      const phase = (state.clock.elapsedTime * Math.PI * 2) / BOB.period;
      // Amplitude tapers as the lid opens — an open laptop bobbing reads as
      // unstable rather than alive.
      bob = Math.sin(phase) * BOB.amplitude * lerp(1, 0.35, openness) * alive;
    }

    // ── Cursor parallax ──────────────────────────────────────────────────
    let tiltX = 0;
    let tiltY = 0;
    if (!reducedMotion && !coarsePointer) {
      tiltX = springs.tiltX.set(-pointerTarget.current.y * degToRad(MAX_TILT)).step(delta);
      tiltY = springs.tiltY.set(pointerTarget.current.x * degToRad(MAX_TILT)).step(delta);
    }

    // ── Compose ──────────────────────────────────────────────────────────
    // Shift down by the model's centroid so `pose.y` means "put the laptop's
    // CENTRE here" rather than "put its base here". Without this every pose
    // floats a full half-height too high and the lid clips the top of frame.
    let x = px;
    let y = py + bob - bounds.centre * scale;
    let z = pz;
    let sc = scale;
    let ax = rx + (tiltX + kickX) * alive;
    let ay = ry + (tiltY + kickY) * alive;
    let az = rz;

    /**
     * ── The fill ─────────────────────────────────────────────────────────
     * One blend, applied to the WHOLE rig — chassis, deck, lid and screen are
     * children of this group, so there is no way for the laptop to stay parked
     * while its screen animates. The docked pose is still being sprung
     * underneath, so at t = 0 the laptop is exactly where the section put it
     * and Back lands on a live target rather than a remembered one.
     *
     * Rotation goes to zero because `fillPlacement` assumes the panel is
     * square to the camera; anything else and the "cover" solve is for a
     * rectangle that isn't there.
     */
    if (t > 0) {
      const target = fillPlacement(state.camera, state.camera.aspect, angle.get(), placement);
      x = lerp(x, target.x, t);
      y = lerp(y, target.y, t);
      z = lerp(z, target.z, t);
      sc = lerp(sc, target.scale, t);
      ax = lerp(ax, 0, t);
      ay = lerp(ay, 0, t);
      az = lerp(az, 0, t);
    }

    node.position.set(x, y, z);
    node.rotation.set(ax, ay, az);
    node.scale.setScalar(sc);
  });

  return (
    <group ref={group}>
      <Laptop
        angle={angle}
        handlers={handlers}
        opened={opened}
        channel={channel}
        project={project}
        accent={accent}
        compact={compact}
        theme={theme}
        reducedMotion={reducedMotion}
        actions={actions}
        onBootComplete={onBootComplete}
        fillProgress={fillProgress}
      />
    </group>
  );
}
