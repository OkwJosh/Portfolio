import { animated, useInView, useSprings } from '@react-spring/web';
import { useMemo } from 'react';
import { SPRING, STAGGER_MS } from '../lib/config.js';
import { useReducedMotion } from '../hooks/useMediaFlag.js';

/**
 * Heading that reveals word by word from behind its own baseline.
 *
 * Each word sits in an `overflow: clip` wrapper, so it slides up from *under*
 * the line rather than just fading — the mask is what makes it read as
 * typesetting rather than as an opacity transition.
 *
 * Splitting on words, not characters: at heading sizes a per-character stagger
 * reads as letters arriving separately instead of as one confident gesture.
 */
export function SplitHeading({ children, className = '', as: Tag = 'h2' }) {
  const reducedMotion = useReducedMotion();
  const [ref, inView] = useInView({ rootMargin: '-10% 0px', once: true });

  const words = useMemo(() => String(children).split(' '), [children]);

  const [springs] = useSprings(
    words.length,
    (i) => ({
      y: inView ? 0 : 110,
      opacity: inView ? 1 : 0,
      delay: inView ? i * STAGGER_MS : 0,
      config: reducedMotion ? SPRING.contentReduced : SPRING.content,
      immediate: reducedMotion,
    }),
    [inView, reducedMotion],
  );

  return (
    <Tag ref={ref} className={`split ${className}`} aria-label={String(children)}>
      {springs.map((style, i) => (
        <span className="split-word" key={words[i] + i} aria-hidden="true">
          <animated.span
            style={{
              display: 'inline-block',
              opacity: style.opacity,
              transform: style.y.to((v) => `translate3d(0, ${v}%, 0)`),
            }}
          >
            {words[i]}
          </animated.span>
        </span>
      ))}
    </Tag>
  );
}
