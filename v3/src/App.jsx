import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LaptopHero } from './hero/LaptopHero.jsx';
import { useHinge } from './hero/useHinge.js';
import { useSceneDirector } from './hero/useSceneDirector.js';
import { useCoarsePointer, useMediaFlag, useReducedMotion } from './hooks/useMediaFlag.js';
import { BOOT, FILL, POSES, VIEW } from './lib/config.js';
import { identity, projects } from './data/site.js';
import { Work } from './sections/Work.jsx';
import { Stack } from './sections/Stack.jsx';
import { About } from './sections/About.jsx';
import { Achievements } from './sections/Achievements.jsx';
import { Contact } from './sections/Contact.jsx';
import { DemoDialog } from './ui/DemoDialog.jsx';
import { Magnetic } from './ui/Magnetic.jsx';
import { SectionHud } from './ui/SectionHud.jsx';
import { ThemeToggle, readTheme } from './ui/ThemeToggle.jsx';
import { ProjectView } from './ui/ProjectView.jsx';

/**
 * The lid is not draggable while the laptop is filling the frame.
 *
 * The fill solves the laptop's placement from the CURRENT hinge angle, and
 * holds the lid at FILL.hinge via an effect keyed on focus — so a stray drag
 * mid-flight would move the panel off head-on, the cover solve would be for a
 * rectangle that isn't there, and the effect would never re-fire to correct it.
 * A frozen module-level object so the prop identity stays stable.
 */
const NO_HANDLERS = {};

/** Which screen "application" each section puts on the laptop. */
const CHANNEL = {
  hero: 'profile',
  work: 'project',
  stack: 'stack',
  about: 'profile',
  achievements: 'achievements',
  contact: 'contact',
};

export default function App() {
  const reducedMotion = useReducedMotion();
  const coarsePointer = useCoarsePointer();
  const wide = useMediaFlag(POSES.breakpoint);

  const { section, progress, velocity } = useSceneDirector();

  // NOTE: scroll progress deliberately never becomes React state here. The HUD
  // takes the ref and animates its bar itself — see SectionHud. Lifting it into
  // App re-rendered the whole <Canvas> tree on every scroll tick.

  // The hinge lives here, not inside the canvas, because three different things
  // drive it: the drag, the hero button, and scrolling into a new section.
  // Destructured because the hook returns a fresh object each render.
  const { angle, handlers, toggle, settleTo, ensureOpen } = useHinge({
    reducedMotion,
    coarsePointer,
  });

  const [opened, setOpened] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [demo, setDemo] = useState(null);
  // Seeded from the <head> script's decision so the first render already
  // matches the painted theme.
  const [theme, setTheme] = useState(readTheme);
  /**
   * The View sequence, in four states:
   *
   *   idle      normal browsing
   *   approach  the whole laptop flies to centre and zooms until its screen
   *             covers the viewport — 3D, chassis and all
   *   open      the real project page has taken over that rectangle (DOM)
   *   closing   the page is handing the rectangle back
   *
   * The laptop HOLDS the fill through open and closing, so the page always has
   * a stationary box to hand back to; only once the page has gone does the fill
   * reverse and the laptop travel back to wherever the section has it.
   */
  const [viewStage, setViewStage] = useState('idle');
  const [screenRect, setScreenRect] = useState(null);
  const isFocused = viewStage !== 'idle';
  /**
   * The same flag as a ref, for the rig.
   *
   * The rig reads this inside `useFrame`, and a boolean prop reaches that
   * closure a frame or two late — the Canvas subtree is a separate reconciler
   * root and swaps the callback in a layout effect. Measured on a device
   * rendering at ~0.3fps, the page had unmounted and the focus flag had
   * cleared while the laptop still sat covering the screen. Written during
   * render rather than in an effect so it is already correct by the time the
   * next frame runs.
   */
  const filling = useRef(false);
  filling.current = isFocused;
  /**
   * The fill clock, 0-1, written by the rig every frame and read by the launch
   * screen's progress bar.
   *
   * The bar IS the zoom's progress rather than a second animation timed to
   * look like it. A parallel duration spring would drift the moment a frame is
   * dropped and the bar would still be at 80% as the screen finished covering
   * the viewport — the same failure the boot loader was rebuilt to avoid. It
   * also means the bar drains in exact step with the laptop pulling back out.
   */
  const fillProgress = useRef(0);
  /**
   * Post-passes are only worth dropping once the page is genuinely opaque —
   * killing bloom mid-dissolve is a visible pop, and the whole point of this
   * sequence is that you cannot see the seam.
   */
  const [covered, setCovered] = useState(false);

  // ─── 3D Laptop Boot & Entrance Choreography ───
  //
  // The progress VALUE is not React state. It used to be, updated by a 25ms
  // interval — 40 re-renders per second of this entire tree, including the 3D
  // canvas props and the fixed HUD. That is what made both the loader bar and
  // the section label stutter. The bar now animates itself inside the laptop
  // screen (see BootProgress in Screen.jsx) and reports back exactly once.
  const [bootState, setBootState] = useState('loading'); // 'loading' -> 'docking' -> 'ready'

  useEffect(() => {
    // The laptop starts shut centre-stage; lift the lid so the boot screen is
    // visible while it fills.
    const timerOpen = setTimeout(() => settleTo(110), 200);
    return () => clearTimeout(timerOpen);
  }, [settleTo]);

  /**
   * Fired by the progress bar's own spring when it reaches 100%. Driving the
   * handoff from the bar itself means the two can't drift: a parallel timer
   * would keep running while a throttled tab froze the animation, and the
   * laptop would dock with the bar still half full.
   */
  const onBootComplete = useCallback(() => {
    setBootState((current) => (current === 'loading' ? 'docking' : current));
  }, []);

  // Docking -> ready once the laptop has travelled to its hero pose.
  useEffect(() => {
    if (bootState !== 'docking') return undefined;
    const timer = setTimeout(() => setBootState('ready'), BOOT.settleMs);
    return () => clearTimeout(timer);
  }, [bootState]);

  /**
   * Boot outranks the section. Focus deliberately does NOT: the section pose
   * keeps being sprung underneath the fill, so it is a live target for Back
   * rather than a position remembered from a second ago — and the fill is one
   * authored move from wherever the laptop actually is, not a spring to a
   * focus pose with a zoom layered on top of it.
   */
  const poseKey = bootState === 'loading' ? 'loading' : section;
  const pose = (wide ? POSES.wide : POSES.narrow)[poseKey] ?? POSES.wide.hero;
  /**
   * `launch` is the screen the laptop wears on the way IN: the app's mark and
   * a progress bar, nothing else. The project's detail belongs on the page
   * that is about to take over — putting it on the screen first meant reading
   * the same content twice, once badly, through a 2.6x CSS upscale in motion.
   *
   * ── Why it drops at `closing`, not at `idle` ─────────────────────────────
   * Coming back is not a load. You already have the content, so loading
   * language is wrong on the way out — and a progress bar running backwards
   * reads as *undoing* rather than closing.
   *
   * Instead the screen returns to the project card the instant Back is
   * pressed, while the page is still fully opaque and covering it. The swap
   * and its wipe happen entirely out of sight; by the time the page has
   * dissolved, the laptop is already carrying the card it started from, and it
   * shrinks back to the docked pose holding it. The whole trip is a loop that
   * closes on exactly the frame it opened from.
   *
   * Swapping at `idle` instead would put that content change at the END of the
   * return, in the open, on a small panel — the one place it is visible.
   */
  const launching = viewStage === 'approach' || viewStage === 'open';
  const channel =
    bootState === 'loading' ? 'boot' : launching ? 'launch' : (CHANNEL[section] ?? 'profile');

  // In the work section the screen always shows *something*; elsewhere the
  // project is irrelevant, so the channel ignores it.
  const project = projects[previewIndex] ?? projects[0];
  const accent = channel === 'project' || channel === 'launch' ? project.accent : identity.accent;

  /**
   * On mount or scrolling into a section, drive the lid — it opens smoothly.
   * While filling it goes to FILL.hinge instead: the one angle at which the
   * panel faces the lens dead on, which is what lets it cover the frame with
   * no foreshortening.
   */
  useEffect(() => {
    if (bootState === 'loading') return;
    settleTo(isFocused ? FILL.hinge : pose.hinge);
  }, [section, pose.hinge, settleTo, bootState, isFocused]);

  /**
   * While focused the page is frozen: scrolling would move the sections behind
   * the laptop and hand the pose back to the section director mid-read.
   * Escape leaves, matching every other overlay on the web.
   */
  useEffect(() => {
    if (!isFocused) return undefined;

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.dataset.focus = 'true';

    const onKey = (event) => {
      // Bailing out mid-flight goes straight back to idle: there is no page to
      // collapse yet, and 'closing' would mount one just to animate it away.
      if (event.key === 'Escape') {
        setViewStage((v) => (v === 'approach' ? 'idle' : v === 'idle' ? v : 'closing'));
      }
    };
    window.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = previous;
      delete document.documentElement.dataset.focus;
      window.removeEventListener('keydown', onKey);
    };
  }, [isFocused]);

  /**
   * One stable object rather than two props threaded through four layers —
   * and stable identity matters here, because it feeds Screen's `useMemo` and
   * LaptopHero's `memo`.
   *
   * There is no exit action: the launch screen is a sub-second loading state
   * with no controls, and Escape covers bailing out of it.
   */
  const actions = useMemo(
    () => ({
      onWatchDemo: setDemo,
      onView: () => setViewStage((v) => (v === 'idle' ? 'approach' : v)),
    }),
    [],
  );

  /**
   * Hand off from the 3D fill to the real page.
   *
   * The laptop's screen is real DOM — drei renders it through a CSS 3D matrix —
   * so it has a bounding box, and by now that box IS the viewport. Measuring it
   * rather than assuming it is what keeps the hand-off honest: if the fill were
   * ever a few pixels off, the page starts from where the screen actually is
   * and closes the gap, instead of jumping.
   *
   * Fired by the rig the frame the move lands, not by a timer running alongside
   * it — the same reason the boot bar owns its own hand-off. Two clocks drift
   * apart the moment a tab throttles.
   */
  const onFillArrived = useCallback(() => {
    /**
     * Measured on the NEXT frame, not this one.
     *
     * The rig fires this from inside its own `useFrame`, and the screen's DOM
     * is positioned by drei's CSS-matrix write in a DIFFERENT `useFrame` whose
     * order relative to ours is not guaranteed — it is a child, so its
     * subscription may well run first. Measuring immediately can therefore
     * catch the matrix from the frame BEFORE the move landed. At 60fps that is
     * a sub-pixel error; on a struggling device it is the whole animation, and
     * the page hands over from a rectangle the laptop has already left.
     *
     * One rAF puts the measurement after the current frame has fully committed.
     */
    requestAnimationFrame(() => {
      const el = document.querySelector('.screen');
      setScreenRect(el ? el.getBoundingClientRect() : null);
      setViewStage((v) => (v === 'approach' ? 'open' : v));
    });
  }, []);

  // Re-measure if the window changes size while the page is open, so Back
  // still hands back to wherever the laptop's screen actually is now. The rig
  // re-solves the fill for the new aspect on its own; this keeps the DOM side
  // in step with it.
  useEffect(() => {
    if (viewStage !== 'open') return undefined;
    const onResize = () => {
      const el = document.querySelector('.screen');
      if (el) setScreenRect(el.getBoundingClientRect());
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [viewStage]);

  // Bloom and contact shadows go once the page is genuinely opaque — see the
  // note on `covered` above.
  useEffect(() => {
    if (viewStage !== 'open') {
      setCovered(false);
      return undefined;
    }
    const timer = setTimeout(() => setCovered(true), VIEW.crossfadeMs);
    return () => clearTimeout(timer);
  }, [viewStage]);

  const closeView = useCallback(() => setViewStage('closing'), []);
  // Only now does the laptop leave the focus pose and zoom back out.
  const onViewCollapsed = useCallback(() => setViewStage('idle'), []);

  const onSelect = useCallback(
    (id) => {
      /**
       * The list cannot change the project once View has been pressed.
       *
       * Selection fires on hover as well as click, and the work list is still
       * sitting there behind the veil while the laptop flies at you. Any
       * pointer drift across a row would swap the project MID-LAUNCH: caught
       * in testing on a phone viewport, where the launch screen read
       * "NuraHelp" at t+700ms and "BrainStorm" at t+1400ms — you press View on
       * one project and the page that arrives is a different one.
       */
      if (viewStage !== 'idle') return;
      const index = projects.findIndex((entry) => entry.id === id);
      if (index >= 0) setPreviewIndex(index);
      // Nothing to select onto if the lid is shut.
      ensureOpen();
    },
    [ensureOpen, viewStage],
  );

  const cycle = useCallback((step) => {
    setPreviewIndex((current) => (current + step + projects.length) % projects.length);
  }, []);

  /**
   * Arrow keys cycle projects while the work section holds the laptop, and
   * while the page is open — there they flip the page itself. The rig turns
   * each change into a physical flick, so this reads as flipping through them
   * rather than as a list selection.
   *
   * NOT during `approach` or `closing`: those are transitions with a project
   * already committed to, and swapping it mid-move means the page that lands
   * is not the one that was asked for.
   */
  useEffect(() => {
    const browsing = viewStage === 'idle' && section === 'work';
    if (!browsing && viewStage !== 'open') return undefined;

    const onKey = (event) => {
      if (event.key === 'ArrowRight') cycle(1);
      else if (event.key === 'ArrowLeft') cycle(-1);
      else return;
      event.preventDefault();
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [section, cycle, viewStage]);

  const activeId = useMemo(() => projects[previewIndex]?.id, [previewIndex]);

  return (
    <>
      <LaptopHero
        angle={angle}
        handlers={isFocused ? NO_HANDLERS : handlers}
        pose={pose}
        channel={channel}
        project={project}
        // A monotonic key so the rig can tell which direction the change went
        // and kick the laptop the corresponding way.
        projectKey={previewIndex}
        accent={accent}
        compact={!wide}
        theme={theme}
        velocity={velocity}
        actions={actions}
        onOpenedChange={setOpened}
        reducedMotion={reducedMotion}
        coarsePointer={coarsePointer}
        onBootComplete={onBootComplete}
        // The laptop holds the fill through open and closing, so the page has a
        // stationary rectangle to take over and hand back. A ref, not a
        // boolean — see the note where it is declared.
        filling={filling}
        fillProgress={fillProgress}
        onFillArrived={onFillArrived}
        // Skips bloom + contact shadows while the page covers the canvas. NOT
        // a frameloop pause — see the note in LaptopHero.
        covered={covered}
      />

      {viewStage !== 'idle' && viewStage !== 'approach' && (
        <ProjectView
          project={project}
          fromRect={screenRect}
          phase={viewStage === 'open' ? 'open' : 'closing'}
          onClose={closeView}
          onCollapsed={onViewCollapsed}
          onWatchDemo={setDemo}
        />
      )}

      <div className="focus-veil" aria-hidden="true" />

      <SectionHud section={section} progress={progress} />
      <ThemeToggle onChange={setTheme} />

      <main className="page">
        <section className="hero section" id="hero" data-side={pose.side}>
          <div
            className="hero-copy"
            style={{
              opacity: bootState === 'ready' ? 1 : 0,
              transform: bootState === 'ready' ? 'translateY(0)' : 'translateY(24px)',
              transition: 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
              pointerEvents: bootState === 'ready' ? 'auto' : 'none',
            }}
          >
            <p className="eyebrow">
              {identity.name} — {identity.role}
            </p>
            {/* Authored in content.json as an array of lines — the breaks are
                a typographic decision about this specific phrase, so they
                belong with the words rather than hard-coded around them. */}
            <h1 className="display">
              {identity.headline.map((line, i) => (
                <Fragment key={`${line}-${i}`}>
                  {i > 0 && <br />}
                  {line}
                </Fragment>
              ))}
            </h1>
            <p className="lede">{identity.bio}</p>

            <div className="hero-actions">
              {/* An explicit control, not just a hint. The drag is the nice
                  interaction; this is the one that always works — including
                  for keyboard users, who can't drag anything. */}
              <Magnetic>
                <button type="button" className="btn btn-solid" onClick={toggle}>
                  {opened ? 'Close the laptop' : 'Open the laptop'}
                </button>
              </Magnetic>
              <Magnetic>
                <a className="btn btn-ghost" href="#work">
                  See the work
                </a>
              </Magnetic>
              <Magnetic>
                <a
                  className="btn btn-ghost"
                  href={identity.resume}
                  download={`${identity.name.replace(/\s+/g, '_')}.pdf`}
                >
                  Résumé ↓
                </a>
              </Magnetic>
            </div>

            <p className="hint">
              {/* On phones the canvas sits in front of the page and passes taps
                  through, so the lid isn't a tap target — scrolling drives it. */}
              {coarsePointer ? 'Or just keep scrolling' : 'Or drag the lid open — then keep scrolling'}
            </p>
          </div>
        </section>

        <Work activeId={activeId} onSelect={onSelect} onCycle={cycle} />
        <Stack />
        <About />
        <Achievements />
        <Contact />
      </main>

      <DemoDialog project={demo} onClose={() => setDemo(null)} />
    </>
  );
}
