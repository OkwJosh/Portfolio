import { useEffect, useRef } from 'react';
import { animated, useSpring } from '@react-spring/web';
import { SECTIONS } from '../lib/config.js';
import { useReducedMotion } from '../hooks/useMediaFlag.js';

const TITLES = {
  hero: 'Intro',
  work: 'Work',
  stack: 'Stack',
  about: 'About',
  achievements: 'Wins',
  contact: 'Contact',
};

/**
 * Fixed chrome: which section you're in, and how far through the page.
 *
 * PERFORMANCE: the scroll bar is driven by a rAF that writes `transform`
 * straight to the DOM node. It used to be React state lifted into App, which
 * meant every ~0.5% of scroll re-rendered the entire app — including the
 * <Canvas> element tree — hundreds of times per page. Reconciling the 3D tree
 * on a scroll tick is the single most expensive thing this page was doing.
 * Nothing here re-renders while you scroll now.
 *
 * @param {React.MutableRefObject<number>} progress 0-1, from useSceneDirector
 */
export function SectionHud({ section, progress }) {
  const reducedMotion = useReducedMotion();
  const index = Math.max(0, SECTIONS.indexOf(section));
  const bar = useRef(null);

  useEffect(() => {
    let raf = 0;
    let shown = -1;
    // Eased toward the target so a flung trackpad doesn't make the bar jump.
    let eased = progress.current;

    const tick = () => {
      eased += (progress.current - eased) * 0.18;
      // Sub-pixel changes aren't visible; skip the style write entirely.
      if (Math.abs(eased - shown) > 0.0015) {
        shown = eased;
        if (bar.current) bar.current.style.transform = `scaleX(${eased})`;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [progress]);

  /**
   * The FUNCTION form with a deps array is essential. In the object form
   * `reset: true` re-evaluates on every render and restarts the animation from
   * `opacity: 0` each time — and this component's parent used to re-render
   * constantly. That was the label flickering: it was being told to start over
   * dozens of times a second. With deps it resets only when the section changes.
   */
  const [label] = useSpring(
    () => ({
      from: { opacity: 0, y: 12 },
      to: { opacity: 1, y: 0 },
      reset: true,
      config: { mass: 1, tension: 240, friction: 26 },
      immediate: reducedMotion,
    }),
    [section, reducedMotion],
  );

  return (
    <>
      <div className="hud" aria-hidden="true">
        <span className="hud-index">
          {String(index + 1).padStart(2, '0')}
          <span className="hud-total">/{String(SECTIONS.length).padStart(2, '0')}</span>
        </span>

        <span className="hud-label">
          <animated.span
            style={{
              opacity: label.opacity,
              transform: label.y.to((v) => `translate3d(0, ${v}px, 0)`),
            }}
          >
            {TITLES[section] ?? section}
          </animated.span>
        </span>
      </div>

      <div ref={bar} className="scroll-bar" aria-hidden="true" />
    </>
  );
}
