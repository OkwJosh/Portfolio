import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { animated, useSpring } from '@react-spring/web';
import { useReducedMotion } from '../hooks/useMediaFlag.js';
import { cubicBezier, clamp, lerp } from '../lib/spring.js';
import { VIEW } from '../lib/config.js';
import { identity } from '../data/site.js';

const PAGE_EASE = cubicBezier(...VIEW.easing);

/**
 * 0 below `a`, 1 above `b`, linear in between. Deliberately linear: `p` has
 * already been through the easing curve, and shaping it twice would flatten
 * the start of every fade into a hold.
 */
const ramp = (v, a, b) => (b <= a ? (v >= b ? 1 : 0) : clamp((v - a) / (b - a), 0, 1));

/**
 * The project detail page — a real document that takes over the rectangle the
 * laptop's screen is already filling, and hands it back on the way out.
 *
 * ── The transform ─────────────────────────────────────────────────────────
 * This is a FLIP, and the maths is worth stating because it is the answer to
 * "what translate/scale makes a nested box cover the window".
 *
 * The element is authored FULLSCREEN (`inset: 0`, so its untransformed box is
 * `vw x vh` at the origin) and scaled DOWN onto the source rectangle, rather
 * than being authored small and scaled up. That ordering matters: at p = 1 the
 * transform is exactly identity, so the finished page is pixel-exact rather
 * than the product of a division.
 *
 * With `transform-origin: 0 0`, `translate(tx, ty) scale(sx, sy)` maps a local
 * point q to `(tx + sx·qx, ty + sy·qy)` in viewport coordinates. To land the
 * element on a box `b`:
 *
 *     sx = b.width / vw          tx = b.left
 *     sy = b.height / vh         ty = b.top
 *
 * because local (0,0) then lands on (b.left, b.top) and local (vw, vh) lands on
 * (b.left + b.width, b.top + b.height). Note the translate is NOT multiplied by
 * the scale — it is applied in the parent's coordinate space, which is the one
 * `b` is measured in. Going the other way (a nested child grown to fill the
 * window) is the same relation inverted: `translate(-r.left, -r.top)
 * scale(vw / r.width, vh / r.height)`, again with the origin at 0 0.
 *
 * Interpolating both ends of that between p = 0 and p = 1 is the whole
 * animation.
 *
 * ── Why it is usually a dissolve ──────────────────────────────────────────
 * The laptop has already flown to centre and zoomed until its screen covers
 * the window, so `fromRect` IS the viewport give or take a percent — sx and sy
 * are ~1 and there is nothing left to scale. The transform stays in place as
 * the correctness guarantee (and for the degenerate case where the rect was
 * never measured), but what you actually see is the 3D screen dissolving into
 * the real page at the same size, in the same place. That is the seam this is
 * built to hide.
 *
 * A non-uniform scale distorts its contents, so when there IS travel to do the
 * body only fades in once the box is near its final shape. When there isn't,
 * that delay is pure dead time and the fade starts immediately.
 *
 * @param {DOMRect|null} fromRect the laptop screen's box, in viewport coords
 * @param {'open'|'closing'} phase
 * @param {() => void} onCollapsed fired once the rectangle has been handed back
 */
export function ProjectView({ project, fromRect, phase, onClose, onCollapsed, onWatchDemo }) {
  const reducedMotion = useReducedMotion();
  const closeRef = useRef(null);
  const scroller = useRef(null);
  const shell = useRef(null);

  const opening = phase === 'open';

  /**
   * The element's own untransformed size, not `window.innerWidth/innerHeight`.
   *
   * On mobile those two disagree: `100vh` is the LARGE viewport (URL bar
   * hidden) while `innerHeight` is whatever is on screen right now, and a FLIP
   * computed against the wrong one leaves a band of canvas along the bottom
   * exactly when the bar is showing. `offsetWidth/offsetHeight` are layout
   * values, unaffected by the transform we are about to apply to them.
   */
  const [size, setSize] = useState(() => ({
    w: typeof window === 'undefined' ? 1 : window.innerWidth,
    h: typeof window === 'undefined' ? 1 : window.innerHeight,
  }));

  useLayoutEffect(() => {
    const el = shell.current;
    if (!el) return undefined;
    const measure = () => setSize({ w: el.offsetWidth, h: el.offsetHeight });
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const [{ p }] = useSpring(
    () => ({
      from: { p: opening ? 0 : 1 },
      to: { p: opening ? 1 : 0 },
      immediate: reducedMotion,
      /**
       * A duration and an authored curve, not a spring. Springs are right for
       * anything reacting to input; this is the tail of a cinematic move and
       * has to match the curve the laptop just flew in on. Overshoot on a
       * fullscreen page reads as a rendering fault.
       */
      config: {
        duration: opening ? VIEW.crossfadeMs : VIEW.closeMs,
        easing: PAGE_EASE,
      },
      onRest: () => {
        if (!opening) onCollapsed?.();
      },
    }),
    [phase, reducedMotion],
  );

  useEffect(() => {
    if (!opening) return undefined;
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [opening, onClose]);

  // Scroll back to the top when switching projects inside the view.
  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = 0;
  }, [project.id]);

  const vw = Math.max(size.w, 1);
  const vh = Math.max(size.h, 1);
  // The fallback only fires if the screen was never measured — Escape pressed
  // in the same frame the fill landed, say. A centred box keeps that graceful.
  const raw = fromRect ?? { left: vw * 0.3, top: vh * 0.3, width: vw * 0.4, height: vh * 0.4 };

  /**
   * Clipped to the window.
   *
   * The fill is `cover`, not `contain`: the panel's 1.55 aspect almost never
   * matches the browser's, so it deliberately OVERFLOWS on one axis — by ~15%
   * vertically at 16:9. Animating from a box larger than the window would run
   * the page through a 15% non-uniform squash on its way to settling, which is
   * a distortion of content the reader is already trying to read.
   *
   * What is actually on screen is the screen's intersection with the window —
   * and when the fill has done its job, that intersection IS the window. So
   * this is both the correct source box and the thing that makes the hand-off
   * a dissolve at a fixed size on every aspect ratio, rather than only on the
   * one the panel happens to match.
   */
  const left = Math.max(raw.left, 0);
  const top = Math.max(raw.top, 0);
  const box = {
    left,
    top,
    width: Math.max(Math.min(raw.left + raw.width, vw) - left, 1),
    height: Math.max(Math.min(raw.top + raw.height, vh) - top, 1),
  };

  const sx = box.width / vw;
  const sy = box.height / vh;

  /**
   * How far the box has to travel, as a fraction of the viewport. Near zero
   * when the laptop's screen is already covering the window — which is the
   * whole point of the fill — and the hand-off becomes a pure dissolve at a
   * fixed size rather than a second, redundant zoom.
   */
  const travel = Math.max(
    Math.abs(1 - sx),
    Math.abs(1 - sy),
    Math.abs(box.left) / vw,
    Math.abs(box.top) / vh,
  );
  const seamless = travel < 0.06;

  // The surface arrives just ahead of the words, so the page reads as
  // developing rather than as two things fading in at once.
  const surfaceFade = seamless ? [0, 0.62] : [0, 0.35];
  const bodyFadeAt = seamless ? [0.18, 1] : [0.6, 1];

  const shellStyle = {
    opacity: p.to((v) => ramp(v, surfaceFade[0], surfaceFade[1])),
    transform: p.to(
      (v) =>
        `translate3d(${lerp(box.left, 0, v)}px, ${lerp(box.top, 0, v)}px, 0) ` +
        `scale(${lerp(sx, 1, v)}, ${lerp(sy, 1, v)})`,
    ),
    /**
     * Square corners as it fills the frame, like a window maximising. Divided
     * by sx so the radius is 10 CSS px on screen at p = 0 rather than 10px
     * multiplied by the scale. Skipped entirely when seamless — a rounded
     * corner on something already covering the window just cuts a notch out of
     * the laptop screen behind it.
     */
    borderRadius: seamless ? 0 : p.to((v) => `${lerp(10 / Math.max(sx, 0.01), 0, v)}px`),
  };

  const bodyFade = { opacity: p.to((v) => ramp(v, bodyFadeAt[0], bodyFadeAt[1])) };

  const gallery = project.gallery?.length ? project.gallery : [project.image];

  return (
    <animated.div
      ref={shell}
      className="pv"
      style={{ ...shellStyle, '--accent': project.accent }}
      role="dialog"
      aria-modal="true"
      aria-label={`${project.title} — project detail`}
    >
      <animated.div className="pv-inner" style={bodyFade} ref={scroller}>
        <header className="pv-bar">
          <button ref={closeRef} type="button" className="pv-back" onClick={onClose}>
            <span aria-hidden="true">←</span> Back
          </button>
          <span className="pv-url">okwoli.dev/work/{project.id}</span>
        </header>

        <div className="pv-body">
          <section className="pv-head">
            <p className="pv-eyebrow">
              {project.category} · {project.platform} · {project.year}
            </p>
            <h1 className="pv-title">{project.title}</h1>
            <p className="pv-lede">{project.description}</p>

            <div className="pv-actions">
              <button type="button" className="pv-cta" onClick={() => onWatchDemo?.(project)}>
                <span className="pv-play" aria-hidden="true" />
                Watch demo
              </button>
              <a className="pv-cta pv-cta--ghost" href={identity.resume} download>
                Résumé ↓
              </a>
            </div>
          </section>

          <figure className="pv-shot">
            <img src={project.image} alt={`${project.title} interface`} />
          </figure>

          <section className="pv-grid">
            <div className="pv-col">
              <h2 className="pv-h2">Overview</h2>
              <p className="pv-copy">{project.overview ?? project.description}</p>

              {project.highlights?.length > 0 && (
                <>
                  <h2 className="pv-h2">Engineering</h2>
                  <ul className="pv-list">
                    {project.highlights.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <aside className="pv-side">
              <div className="pv-fact">
                <span className="pv-fact-label">Role</span>
                <span className="pv-fact-value">{project.role ?? 'Developer'}</span>
              </div>
              <div className="pv-fact">
                <span className="pv-fact-label">Platform</span>
                <span className="pv-fact-value">{project.platform}</span>
              </div>
              <div className="pv-fact">
                <span className="pv-fact-label">Shipped</span>
                <span className="pv-fact-value">{project.year}</span>
              </div>

              <div className="pv-fact">
                <span className="pv-fact-label">Stack</span>
                <span className="pv-chips">
                  {project.tech.map((tech) => (
                    <span key={tech}>{tech}</span>
                  ))}
                </span>
              </div>

              {project.recognition?.length > 0 && (
                <div className="pv-fact">
                  <span className="pv-fact-label">Recognition</span>
                  <ul className="pv-awards">
                    {project.recognition.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </aside>
          </section>

          <section className="pv-gallery-wrap">
            <h2 className="pv-h2">Screens</h2>
            <div className="pv-gallery">
              {gallery.map((src, i) => (
                <figure key={src}>
                  <img src={src} alt={`${project.title} screen ${i + 1}`} loading="lazy" />
                </figure>
              ))}
            </div>
          </section>

          <footer className="pv-foot">
            <button type="button" className="pv-cta" onClick={() => onWatchDemo?.(project)}>
              <span className="pv-play" aria-hidden="true" />
              Watch the demo
            </button>
            <button type="button" className="pv-back" onClick={onClose}>
              <span aria-hidden="true">←</span> Back to the laptop
            </button>
          </footer>
        </div>
      </animated.div>
    </animated.div>
  );
}
