import { animated, useInView, useSpring } from '@react-spring/web';
import { SPRING } from '../lib/config.js';
import { useReducedMotion } from '../hooks/useMediaFlag.js';

/**
 * Scroll-in reveal, spring-driven like everything else here.
 *
 * `useInView` is react-spring's own IntersectionObserver wrapper, so the reveal
 * shares the animation loop the rest of the page is already running rather
 * than adding a second scheduler.
 */
export function Reveal({ children, delay = 0, className = '', as: Tag = 'div' }) {
  const reducedMotion = useReducedMotion();
  const [ref, inView] = useInView({ rootMargin: '-12% 0px', once: true });

  const style = useSpring({
    opacity: inView ? 1 : 0,
    y: inView ? 0 : 26,
    delay: inView ? delay : 0,
    config: reducedMotion ? SPRING.contentReduced : SPRING.content,
    immediate: reducedMotion,
  });

  const Animated = animated[Tag] ?? animated.div;

  return (
    <Animated
      ref={ref}
      className={className}
      style={{
        opacity: style.opacity,
        transform: style.y.to((v) => `translate3d(0, ${v}px, 0)`),
      }}
    >
      {children}
    </Animated>
  );
}
