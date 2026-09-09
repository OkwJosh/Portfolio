/**
 * Every tunable number for the laptop hero, in one place.
 * Nothing else in the component tree should hard-code a dimension.
 */

/**
 * HINGE AXIS — X, not Y.
 *
 * A laptop lid hinges about the axis that RUNS ALONG the back edge. With the
 * base lying in the XZ plane (width on X, depth on Z) that axis is X; a Y-axis
 * rotation would swing the lid sideways like a door. Applied in Laptop.jsx as
 * `rotation-x` on the lid group.
 */
export const LAPTOP = {
  width: 3.0,
  baseDepth: 2.1,
  baseHeight: 0.11,
  lidDepth: 2.0,
  lidThickness: 0.07,
  /** Border between the lid edge and the screen surface. */
  bezel: 0.09,
  cornerRadius: 0.04,
  /** Degrees. 0 = shut, 110 = fully open. Snap targets are the two ends. */
  maxAngle: 110,
};

/** Reveal the screen UI once the lid is this far open (0-1). */
export const OPEN_THRESHOLD = 0.8;

/**
 * Screen UI is real DOM rendered in 3D via drei's <Html transform>.
 *
 * Fitting it to the bezel is exact, not eyeballed. In transform mode drei sizes
 * the element as:
 *
 *     worldWidth = clientWidth * (distanceFactor / 400)
 *
 * (see the `ratio` calculation in drei/web/Html.js). So if the DOM is authored
 * at `worldSize * SCREEN_PX_PER_UNIT` pixels, the distanceFactor that makes it
 * fill the screen precisely is `400 / SCREEN_PX_PER_UNIT` — independent of the
 * screen's actual dimensions.
 *
 * Raising PX_PER_UNIT renders the UI at a higher pixel density for the same
 * physical size. 200 means the ~2.8-unit screen is authored at ~568px wide.
 */
/**
 * ── Why this is responsive ───────────────────────────────────────────────
 * The DOM is authored at N px per world unit, then scaled to whatever the
 * screen occupies on the display. On a phone the panel lands at roughly 300
 * CSS px wide — so a 564px-wide UI (2.82 units × 200) gets scaled to ~55% and
 * 14px body text renders at 8px. Unreadable.
 *
 * Authoring at FEWER px per unit on small screens means less scaling down, so
 * the type stays legible. It also means less room, which is why the compact
 * screen layout drops the media column rather than shrinking everything.
 */
export const SCREEN_PX_PER_UNIT = { wide: 200, narrow: 112 };

/** Density plus the distanceFactor that makes it fill the panel exactly. */
export const screenMetrics = (wide) => {
  const pxPerUnit = wide ? SCREEN_PX_PER_UNIT.wide : SCREEN_PX_PER_UNIT.narrow;
  return { pxPerUnit, distanceFactor: 400 / pxPerUnit };
};

/**
 * Spring presets.
 *
 * `hinge` is the brief's stiffness ~120 / damping ~14. In react-spring terms
 * that is tension/friction, giving a damping ratio of 14 / (2*sqrt(120)) ≈ 0.64
 * — underdamped, so it overshoots slightly and settles. That overshoot is the
 * whole feel; do not "fix" it by raising friction.
 */
export const SPRING = {
  hinge: { mass: 1, tension: 120, friction: 14 },
  /** Reduced motion: same spring model, critically damped and much faster. */
  hingeReduced: { mass: 1, tension: 260, friction: 34 },
  /** Staggered screen content. */
  content: { mass: 1, tension: 210, friction: 22 },
  contentReduced: { mass: 1, tension: 320, friction: 38 },
};

/** Per-element offset for the screen content stagger, in ms. */
export const STAGGER_MS = 50;

/** Continuous-follow springs, run by our own integrator (see lib/spring.js). */
export const FOLLOW = {
  tilt: { stiffness: 90, damping: 15 },
  dock: { stiffness: 140, damping: 22 },
};

/** Max parallax tilt in degrees, on each axis. */
export const MAX_TILT = 7;

/** Idle bob: ~4s period, sub-0.02 unit amplitude. */
export const BOB = { period: 4, amplitude: 0.018 };

/**
 * Boot sequence. The loader bar's own spring drives the handoff — see
 * BootProgress in Screen.jsx — so these are the only two numbers involved and
 * nothing can drift out of sync with the bar.
 */
/**
 * `?boot=<ms>` shortens or skips the intro. Handy when you're iterating on a
 * section further down the page and don't want to sit through the loader every
 * reload, and it's what the Playwright checks use — headless Chromium is
 * software-rendered, and react-spring clamps per-frame dt to 64ms, so a 6.5s
 * animation genuinely takes over a minute there.
 */
/**
 * ── The absent param is not zero ─────────────────────────────────────────
 * `URLSearchParams.get()` returns **null** when the key is missing, and
 * `Number(null)` is `0`, not `NaN`. Coercing straight to a number therefore
 * made `Number.isFinite(0) && 0 >= 0` true on every ordinary visit, and the
 * intro ran with `durationMs: 0` — the loader never animated at all and the
 * authored duration below was dead code the whole time. Test the string for
 * null BEFORE coercing; that is the only thing separating "no override" from
 * "override with zero", which is a value we deliberately support.
 */
const bootParam =
  typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('boot');
const bootOverride = bootParam === null ? NaN : Number(bootParam);

export const BOOT = {
  /**
   * How long the progress bar takes to fill.
   *
   * The status line walks six steps (see BOOT_STEPS in Screen.jsx). At 4200ms
   * each one held for ~0.7s, which is under the time it takes to read a line
   * and look at the bar — the sequence went past before it registered as a
   * sequence. 6500 gives each step ~1.1s and the intro room to land.
   */
  durationMs: Number.isFinite(bootOverride) && bootOverride >= 0 ? bootOverride : 6500,
  /**
   * Reduced motion still gets a loader, just not a paced one.
   *
   * This was 300ms, which is a flash rather than a loader. Reduced motion
   * means "don't move things about", not "skip the content" — a bar filling in
   * place is not the kind of motion the preference is protecting against.
   */
  reducedMs: 1200,
  /** Pause after it completes before the hero copy arrives. */
  settleMs: 1100,
};

/**
 * The FILL move — "view this project".
 *
 * The WHOLE laptop (chassis, deck and lid together) leaves its docked pose,
 * travels to the centre of the frame and zooms until its SCREEN exactly covers
 * the viewport, chassis overflowing off-frame in every direction. Only then
 * does the real project page take over, at the same size and position.
 *
 * It is not an entry in POSES because it cannot be written as fixed
 * coordinates: the distance that makes the screen cover the window depends on
 * the window's aspect ratio, so it has to be solved every frame. See
 * `fillPlacement` in LaptopRig — that is the whole responsiveness story.
 *
 * `hinge` is 99.9°, the angle at which the screen's normal is exactly opposite
 * the camera direction (the camera looks down 9.9°). Head-on means no
 * foreshortening, which is what lets a 1.55-aspect panel cover any window.
 */
export const FILL = {
  hinge: 99.9,
  /** World scale is held CONSTANT and the DISTANCE is solved for instead, so
   *  the laptop is always the same physical object and only its depth in the
   *  scene changes with the window shape. */
  scale: 1,
  /**
   * A hair more than "exactly covering". The lid is still settling onto 99.9°
   * while the move runs, and a screen that covers the frame to the pixel will
   * show a one-pixel sliver of background on a fractional-DPR display. 1.5% is
   * invisible and makes the edge case impossible.
   */
  overscan: 1.015,
  /**
   * An authored curve, not a spring. This is a cinematic move with a defined
   * start and end: a spring's overshoot on a screen-filling zoom reads as a
   * bug, not as personality.
   *
   * The curve is a short ease-in into a long, flat ease-out — it commits the
   * moment you click (so it feels responsive rather than laggy) and coasts
   * into the final frame instead of arriving and stopping.
   */
  durationMs: 950,
  easing: [0.62, 0.02, 0.18, 1],
  /** Reduced motion still needs the hand-off to happen — just not cinematically. */
  reducedMs: 180,
};

export const VIEW = {
  /**
   * The hand-off. Once the laptop's screen covers the window, the real page is
   * already the same size and in the same place, so this is a dissolve rather
   * than a second zoom — see the `seamless` branch in ProjectView.
   */
  crossfadeMs: 460,
  /** Leaving is quicker than arriving; waiting to go back always feels slow. */
  closeMs: 320,
  /** Curve for both, matching FILL's deceleration. */
  easing: [0.22, 1, 0.24, 1],
};

/** Section order. Also the id of each <section> in the DOM. */
export const SECTIONS = ['hero', 'work', 'stack', 'about', 'achievements', 'contact'];

/**
 * CHOREOGRAPHY — one 3D pose per section.
 *
 * The laptop travels through the page, taking a different attitude in each
 * section and springing between them. Every value here is a *target*.
 *
 * ── Why `side` and not an x coordinate ───────────────────────────────────
 * A hard-coded world x cannot guarantee the laptop stays clear of the copy:
 * the visible width at a given z depends on the viewport aspect, so an x that
 * clears the text at 16:9 drives straight through it at 21:9 or on a tablet.
 *
 * Instead each pose declares which HALF of the frame it occupies. The rig
 * measures the frustum at the pose's own z every frame, centres the laptop in
 * its half, and clamps the scale so the laptop's own width can never exceed
 * that half. CSS puts the copy in the OTHER half via `data-side`. The two
 * cannot overlap at any viewport, because neither is guessing.
 *
 * `hinge` is part of the pose, so scrolling drives the lid: it opens into the
 * work section and shuts again if you scroll back to the top.
 */
export const POSES = {
  wide: {
    loading: { side: 'center', y: 0.02, z: 1.1, rotation: [0.08, 0, 0], scale: 1.05, hinge: 0 },
    hero: { side: 'right', y: -0.35, z: 0, rotation: [0.12, -0.14, 0], scale: 1, hinge: 110 },
    // Turns to present the screen to the reader.
    work: { side: 'right', y: -0.05, z: 1.0, rotation: [0.05, -0.44, 0.03], scale: 0.95, hinge: 110 },
    // Crosses to the other side and tips back, seen from above like a device
    // on a desk. The side change is the most legible transition in the page.
    stack: { side: 'left', y: 0.02, z: 0.5, rotation: [0.44, 0.5, -0.05], scale: 0.88, hinge: 92 },
    about: { side: 'right', y: -0.1, z: 0.6, rotation: [0.08, -0.5, 0.03], scale: 0.9, hinge: 110 },
    achievements: { side: 'left', y: -0.05, z: 0.65, rotation: [0.1, 0.42, -0.04], scale: 0.9, hinge: 106 },
    // Comes forward, squares up, and takes the whole frame. `fit` overrides the
    // default margin: that gutter exists to keep the laptop off the copy, and
    // there is no copy here — so the stage gets to fill 94% of the height.
    contact: { side: 'center', y: -0.02, z: 2.5, rotation: [0.05, 0, 0], scale: 1.45, hinge: 106, fit: 0.94 },
  },
  /* There is deliberately no `focus` pose. Viewing a project is the FILL move,
     and its placement is solved from the viewport every frame rather than
     written down here — see FILL above. The section pose stays live underneath
     it, which is what gives Back an exact position to return to. */
  /**
   * Narrow: no room for a side-by-side, so the laptop always takes the lower
   * band of the frame and the copy sits above it. `y` is a FRACTION of the
   * visible height here, not world units, so it tracks any phone aspect.
   */
  narrow: {
    loading: { side: 'center', y: -0.05, z: 0.6, rotation: [0.1, 0, 0], scale: 0.7, hinge: 0 },
    hero: { side: 'center', y: -0.3, z: 0, rotation: [0.14, 0, 0], scale: 0.62, hinge: 110 },
    work: { side: 'center', y: -0.28, z: 0.4, rotation: [0.08, -0.22, 0.02], scale: 0.58, hinge: 110 },
    stack: { side: 'center', y: -0.28, z: 0.3, rotation: [0.38, 0.26, -0.04], scale: 0.55, hinge: 92 },
    about: { side: 'center', y: -0.28, z: 0.3, rotation: [0.08, -0.26, 0.02], scale: 0.56, hinge: 110 },
    achievements: { side: 'center', y: -0.28, z: 0.3, rotation: [0.12, 0.22, -0.02], scale: 0.56, hinge: 106 },
    // Sits low rather than centred: the label and footer both live in the top
    // band on a phone, so the stage has to start below them. Dropping `y` keeps
    // the scale — lowering `fit` instead would have made the contact laptop
    // SMALLER than the work one, which defeats the whole point of the zoom.
    contact: { side: 'center', y: -0.14, z: 1.4, rotation: [0.05, 0, 0], scale: 1.1, hinge: 106, fit: 0.94 },
  },
  breakpoint: '(min-width: 1000px)',
};

/**
 * Fraction of its half the laptop is allowed to fill. The remainder is the
 * guaranteed gutter between the laptop and the copy.
 */
export const FIT_MARGIN = 0.86;

/**
 * Which half the laptop takes in a section — read by the DOM so CSS can put
 * the copy in the OTHER half. Single-sourced from POSES so the layout and the
 * choreography can never disagree about who owns which side.
 */
export const sideFor = (id) => POSES.wide[id]?.side ?? 'center';

/** Pose spring — slightly underdamped so section changes land with a settle. */
export const POSE_SPRING = { stiffness: 95, damping: 16 };

/**
 * Impulses, injected straight into a spring's velocity rather than moved as a
 * target. That's the difference between "it animates" and "it got hit".
 */
export const IMPULSE = {
  /** Y-axis kick when the previewed project changes, in rad/s. */
  project: 5.4,
  /** Extra kick when the lid is opened. */
  open: 3.2,
  /** Rad/s per px/s of scroll — the laptop carries scroll momentum. */
  scroll: 0.00055,
  /** Ceiling, so a trackpad flick can't spin it. */
  scrollMax: 0.42,
};

/** Drag sensitivity: degrees of hinge per pixel of vertical pointer travel. */
export const DEG_PER_PX = 0.55;

/** Past this many px, a pointer-up is a drag-release rather than a click. */
export const CLICK_SLOP_PX = 4;

/**
 * Flick threshold in degrees/second. A fast release throws the lid the way it
 * was moving instead of snapping to whichever end happens to be nearer — this
 * is most of what makes a drag feel responsive rather than obedient.
 */
export const FLICK_VELOCITY = 90;
