import { useEffect, useMemo, useRef } from 'react';
import { Html } from '@react-three/drei';
import { animated, useSpring, useSprings } from '@react-spring/web';
import * as THREE from 'three';
import { BOOT, LAPTOP, SPRING, STAGGER_MS, screenMetrics } from '../lib/config.js';
import { certifications, identity, skillGroups, socials } from '../data/site.js';

/**
 * Every channel fills the SAME five slots.
 *
 * That is a hard constraint, not a coincidence: `useSprings` takes a fixed
 * count, and changing the count while a stagger is mid-flight is how you get
 * rows stuck at opacity 0. Fixed slots mean switching channels is just new
 * content in the same springs, and the stagger replays cleanly every time.
 */
const SLOTS = ['media', 'title', 'subtitle', 'body', 'meta'];

/**
 * Channels whose content is interactive, so the Html layer accepts input.
 * `launch` is deliberately absent — it is a transient loading screen with no
 * controls, and letting it take input while it covers the whole viewport would
 * put an invisible click target over the page arriving behind it.
 */
const INTERACTIVE = new Set(['project', 'contact', 'achievements']);

/**
 * The lid's screen — an emissive panel with real DOM rendered on it, behaving
 * like a small OS that changes application as you move through the page.
 *
 * ORIENTATION: the screen sits on the lid's *underside* in local space. Shut,
 * that face points at the keyboard; opening rotates it to face the viewer.
 * Hence the +90° X rotation turning the plane's default +Z normal into -Y.
 */
export function Screen({
  opened,
  channel,
  project,
  accent,
  compact,
  theme,
  reducedMotion,
  actions,
  onBootComplete,
  fillProgress,
}) {
  const { width, lidDepth, bezel } = LAPTOP;

  const screenWidth = width - bezel * 2;
  const screenDepth = lidDepth - bezel * 2;
  const { pxPerUnit, distanceFactor } = screenMetrics(!compact);

  const panelMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#05060c',
        emissive: new THREE.Color('#0e1734'),
        emissiveIntensity: 1.15,
        roughness: 0.25,
        metalness: 0.1,
      }),
    [],
  );

  // The panel glow takes the active accent, so the bloom around the screen
  // carries the colour of whatever is on it.
  useEffect(() => {
    // The panel glow carries the active accent so the bloom around the screen
    // matches its content. Dimmer on light, where a hot glow just blows out.
    panelMaterial.emissive.set(accent).multiplyScalar(theme === 'light' ? 0.16 : 0.32);
  }, [accent, theme, panelMaterial]);

  useEffect(() => () => panelMaterial.dispose(), [panelMaterial]);

  // `boot` is a stable object, so the whole slot tree is rebuilt only when the
  // channel or project changes — never while the loader is running.
  const boot = useMemo(
    () => ({ durationMs: BOOT.durationMs, reducedMotion, onComplete: onBootComplete }),
    [reducedMotion, onBootComplete],
  );

  // `fillProgress` is a ref, so its identity is stable and it never invalidates
  // this memo — the launch bar reads it per frame rather than per render.
  const view = useMemo(
    () => buildView(channel, project, actions, boot, fillProgress),
    [channel, project, actions, boot, fillProgress],
  );

  // Changing this replays the stagger AND fires the wipe — on open, on channel
  // change, and on every project swap.
  const screenKey = `${channel}:${project?.id ?? '-'}`;

  /**
   * Explicit per-item `delay` rather than `useTrail`: a trail's spacing falls
   * out of the physics and can't be pinned to a number. Only the start time is
   * scheduled — the motion itself is still a spring.
   */
  const [springs] = useSprings(
    SLOTS.length,
    (i) => ({
      opacity: opened ? 1 : 0,
      y: opened ? 0 : 18,
      delay: opened ? i * STAGGER_MS : 0,
      config: reducedMotion ? SPRING.contentReduced : SPRING.content,
    }),
    [opened, screenKey, reducedMotion],
  );

  // A light bar sweeping across on every channel change — the screen reads as
  // repainting rather than as content silently swapping.
  const [wipe] = useSpring(
    () => ({
      from: { x: -1.15 },
      to: { x: 1.15 },
      reset: true,
      immediate: reducedMotion,
      config: { tension: 190, friction: 26 },
    }),
    [screenKey, reducedMotion],
  );

  return (
    <group position={[0, -0.002, lidDepth / 2]} rotation={[Math.PI / 2, 0, 0]}>
      {/* Always present, so the screen is never a black hole and the Bloom
          pass has something to catch even while the lid is shut. */}
      <mesh material={panelMaterial}>
        <planeGeometry args={[screenWidth, screenDepth]} />
      </mesh>

      {opened && (
        <Html
          transform
          // Exact fit: drei sizes transformed HTML as px * (distanceFactor/400),
          // so authoring the DOM at worldSize * pxPerUnit and using the matching
          // factor fills the panel precisely at either density.
          distanceFactor={distanceFactor}
          position={[0, 0, 0.004]}
          /* The project and contact channels carry real controls, so they take
             input. The others stay transparent — otherwise the screen would
             swallow the drag gesture meant for the lid. */
          pointerEvents={INTERACTIVE.has(channel) ? 'auto' : 'none'}
          style={{
            width: `${screenWidth * pxPerUnit}px`,
            height: `${screenDepth * pxPerUnit}px`,
          }}
        >
          <div
            className="screen"
            data-compact={compact ? 'true' : 'false'}
            data-channel={channel}
            data-theme={theme}
            style={{ '--accent': accent }}
          >
            <div className="screen-bar">
              <span className="screen-light" />
              <span className="screen-light" />
              <span className="screen-light" />
              <span className="screen-url">{view.url}</span>
            </div>

            <div className="screen-body">
              {SLOTS.map((slot, i) => (
                <animated.div
                  key={slot}
                  className={`screen-slot screen-slot--${slot}`}
                  style={{
                    opacity: springs[i].opacity,
                    // react-spring/web doesn't map `y` onto a transform the way
                    // Framer Motion does — do it explicitly.
                    transform: springs[i].y.to((v) => `translate3d(0, ${v}px, 0)`),
                  }}
                >
                  {view[slot]}
                </animated.div>
              ))}
            </div>

            <animated.div
              className="screen-wipe"
              style={{ transform: wipe.x.to((x) => `translate3d(${x * 100}%, 0, 0) skewX(-12deg)`) }}
            />
          </div>
        </Html>
      )}
    </group>
  );
}

/** Builds the five slots for the active channel. */
/**
 * The boot loader.
 *
 * Owns ONE spring and no React state. The previous version drove a `progress`
 * number through `setState` on a 25ms interval — 40 re-renders per second of
 * the whole app — and painted the fill with `width` under a
 * `transition: width 0.12s`. A 120ms transition retargeted every 25ms never
 * finishes, so the bar permanently trailed and jerked. That was the glitch.
 *
 * Here react-spring writes straight to the DOM nodes: React renders this once.
 * The fill uses `scaleX`, which the compositor handles, rather than `width`,
 * which relayouts every frame.
 */
function BootProgress({ durationMs, reducedMotion, onComplete }) {
  const [{ p }] = useSpring(
    () => ({
      from: { p: 0 },
      to: { p: 100 },
      // A determinate loader should advance at a steady rate; `duration` gives
      // the linear ramp people expect instead of a physics ease-out.
      config: { duration: reducedMotion ? BOOT.reducedMs : durationMs },
      // The boot sequence advances when the BAR finishes, not on a parallel
      // timer. Two independent clocks drift apart the moment the tab throttles,
      // and you get the laptop docking with the bar still at 70%.
      onRest: () => onComplete?.(),
    }),
    [durationMs, reducedMotion],
  );

  return (
    <div className="boot">
      <div
        className="boot-track"
        role="progressbar"
        aria-label="Loading"
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <animated.div
          className="boot-fill"
          style={{ transform: p.to((v) => `scaleX(${v / 100})`) }}
        />
      </div>

      <div className="boot-meta">
        <animated.span className="boot-status">{p.to(bootStatus)}</animated.span>
        <animated.span className="boot-percent">{p.to((v) => `${Math.round(v)}%`)}</animated.span>
      </div>
    </div>
  );
}

/** Status line for a given percentage. A table, not six nested ternaries. */
const BOOT_STEPS = [
  [20, 'Power-on self test'],
  [40, 'Mounting WebGL engine'],
  [60, 'Compiling shaders'],
  [80, 'Loading projects'],
  [96, 'Verifying credentials'],
  [Infinity, 'Ready'],
];

function bootStatus(value) {
  return BOOT_STEPS.find(([limit]) => value < limit)[1];
}

/**
 * The launching app's icon — the project's own image, in a rounded tile.
 *
 * The artwork is square (1.00–1.22 across the set), so `cover` crops almost
 * nothing and it reads as an app icon rather than a cropped thumbnail. The
 * accent gradient stays behind it: for the marks with transparency it becomes
 * the icon's backdrop, and for the full-bleed ones it is simply never seen.
 *
 * No extra network cost — the same file is already on the project channel and
 * in the work list, so by the time anyone can press View it is in cache.
 *
 * `aria-hidden` because the project's name is spelled out directly beneath it.
 */
function AppMark({ project }) {
  return (
    <span className="app-mark" aria-hidden="true">
      <img className="app-mark-img" src={project.image} alt="" />
    </span>
  );
}

/**
 * The launch bar — a readout of the zoom, not an animation of its own.
 *
 * Owns no state and no spring. It reads the rig's fill clock every frame and
 * writes `scaleX` straight to the DOM, so it is physically incapable of
 * drifting from the laptop: it reaches 100% on precisely the frame the screen
 * finishes covering the viewport, and drains in step as the laptop pulls back.
 * A parallel duration spring — the obvious implementation — would still be at
 * 80% on a device that dropped a frame. That is the bug the boot loader was
 * rebuilt to remove; this avoids having two clocks at all.
 *
 * `scaleX` and not `width`: transform is composited, width relayouts.
 */
function LaunchProgress({ progress }) {
  const fill = useRef(null);
  const percent = useRef(null);

  useEffect(() => {
    let raf = 0;
    let shown = -1;

    const tick = () => {
      const value = progress?.current ?? 0;
      // Sub-pixel changes aren't visible; skip the style write entirely.
      if (Math.abs(value - shown) > 0.002) {
        shown = value;
        if (fill.current) fill.current.style.transform = `scaleX(${value})`;
        if (percent.current) percent.current.textContent = `${Math.round(value * 100)}%`;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [progress]);

  return (
    <div className="launch-progress">
      <div
        className="launch-track"
        role="progressbar"
        aria-label="Opening project"
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div ref={fill} className="launch-fill" />
      </div>
      <span ref={percent} className="launch-percent">
        0%
      </span>
    </div>
  );
}

/** Builds the five slots for the active channel. */
function buildView(channel, project, actions, boot, fillProgress) {
  if (channel === 'boot') {
    return {
      url: 'okwoli.dev',
      media: <img src={identity.portrait} alt="" className="screen-avatar" />,
      title: <h2 className="screen-title">Okwoli.OS</h2>,
      subtitle: <p className="screen-sub">Starting up — v3.0</p>,
      body: (
        <BootProgress
          durationMs={boot.durationMs}
          reducedMotion={boot.reducedMotion}
          onComplete={boot.onComplete}
        />
      ),
      meta: <Chips items={['React 19', 'R3F 9', 'WebGL 2']} />,
    };
  }

  if (channel === 'project' && project) {
    return {
      url: `okwoli.dev/work/${project.id}`,
      media: <img src={project.image} alt="" className="screen-shot" />,
      title: <h2 className="screen-title">{project.title}</h2>,
      subtitle: (
        <p className="screen-sub">
          {project.category} · {project.year}
        </p>
      ),
      // The description lives here rather than in the list tile — the tile is a
      // label, the screen is the detail view.
      body: <p className="screen-copy">{project.description}</p>,
      meta: (
        <div className="screen-actions">
          <button
            type="button"
            className="screen-cta"
            onClick={() => actions?.onWatchDemo?.(project)}
          >
            <span className="screen-cta-play" aria-hidden="true" />
            Watch demo
          </button>
          <button
            type="button"
            className="screen-cta screen-cta--ghost"
            onClick={() => actions?.onView?.(project)}
          >
            View
            <span aria-hidden="true">↗</span>
          </button>
        </div>
      ),
    };
  }

  /**
   * LAUNCH — what the screen wears while the laptop flies at you.
   *
   * A loading screen, not a preview: the app's mark and a bar, and nothing to
   * read. The detail belongs to the page that is a beat away from taking over
   * this exact rectangle, and putting it here first meant the same content
   * appeared twice — once through a 2.6x CSS upscale, in motion, which is the
   * one place it looks worst.
   *
   * It uses ONE slot rather than five. Every channel still fills the same five
   * (see SLOTS) so the stagger springs never change count; the other four just
   * hold nothing here, and the layout centres what's left.
   */
  if (channel === 'launch' && project) {
    return {
      url: `okwoli.dev/work/${project.id}`,
      media: null,
      title: null,
      subtitle: null,
      body: (
        <div className="launch">
          <AppMark project={project} />
          <p className="launch-name">{project.title}</p>
          <LaunchProgress progress={fillProgress} />
        </div>
      ),
      meta: null,
    };
  }

  if (channel === 'stack') {
    const total = skillGroups.reduce((sum, group) => sum + group.items.length, 0);
    const marks = skillGroups.flatMap((group) => group.items).filter((item) => item.logo);
    return {
      url: 'okwoli.dev/stack',
      media: (
        <div className="screen-logos">
          {marks.slice(0, 9).map((item) => (
            <img key={item.name} src={item.logo} alt="" data-mono={item.mono ? 'true' : undefined} />
          ))}
        </div>
      ),
      title: <h2 className="screen-title">Stack</h2>,
      subtitle: <p className="screen-sub">{total} technologies · 4 groups</p>,
      body: (
        <ul className="screen-list">
          {skillGroups.map((group) => (
            <li key={group.label}>
              <span>{group.label}</span>
              <span>{String(group.items.length).padStart(2, '0')}</span>
            </li>
          ))}
        </ul>
      ),
      meta: <Chips items={['Flutter', 'Python', 'Google Cloud', 'Firebase']} />,
    };
  }

  if (channel === 'achievements') {
    return {
      url: 'okwoli.dev/achievements',
      media: <img src={identity.portrait} alt="" className="screen-avatar" />,
      title: <h2 className="screen-title">Credentials</h2>,
      subtitle: <p className="screen-sub">Verified Badges &amp; Milestones</p>,
      body: (
        <ul className="screen-list">
          {certifications.slice(0, 3).map((cert) => (
            <li key={cert.id}>
              <a
                href={cert.credentialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex justify-between w-full hover:text-[var(--accent)] transition-colors"
                style={{ textDecoration: 'none' }}
              >
                <span>{cert.title}</span>
                <span style={{ color: 'var(--accent)' }}>{cert.badge} ↗</span>
              </a>
            </li>
          ))}
        </ul>
      ),
      meta: <Chips items={['Google Cloud', 'Meta Certified', 'Firebase Prof', 'Top-Rated']} />,
    };
  }

  if (channel === 'contact') {
    return {
      url: 'okwoli.dev/contact',
      media: <img src={identity.portrait} alt="" className="screen-avatar" />,
      title: <h2 className="screen-title">Let&apos;s build</h2>,
      subtitle: (
        <a className="screen-mail" href={`mailto:${identity.email}`}>
          {identity.email}
        </a>
      ),
      body: (
        <p className="screen-copy">Open to roles and freelance work. Usually replies within a day.</p>
      ),
      // Real anchors, rendered inside the 3D screen and genuinely clickable.
      meta: <SocialLinks />,
    };
  }

  return {
    url: 'okwoli.dev',
    media: <img src={identity.portrait} alt="" className="screen-avatar" />,
    title: <h2 className="screen-title">{identity.name}</h2>,
    subtitle: (
      <p className="screen-sub">
        {identity.role} — {identity.focus}
      </p>
    ),
    body: <p className="screen-copy">{identity.bio}</p>,
    meta: <SocialLinks />,
  };
}

/**
 * The social row on the laptop screen.
 *
 * Shared by the hero/about screen and the contact screen because they were
 * already visually identical — but the hero's version was a list of inert
 * <li> labels that merely looked like buttons, so clicking GitHub in the hero
 * did nothing. They are the same real anchors now.
 *
 * These stay clickable even on the channels the Html layer marks
 * pointer-events:none: the anchors opt back in themselves (see .screen-links a
 * in the stylesheet). That is deliberate — the rest of the panel must keep
 * passing pointer events through to the canvas, or the lid stops being
 * draggable in the hero, which is the one interaction the hero is built around.
 */
function SocialLinks() {
  return (
    <ul className="screen-links">
      {socials.map((social) => (
        <li key={social.label}>
          <a
            href={social.href}
            {...(social.href.startsWith('mailto:')
              ? {}
              : { target: '_blank', rel: 'noopener noreferrer' })}
          >
            <span>{social.label}</span>
            <span className="screen-links-arrow">↗</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function Chips({ items }) {
  return (
    <ul className="screen-chips">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
