import { useCallback, useRef } from 'react';
import { animated, to, useSpring } from '@react-spring/web';
import { useCoarsePointer, useReducedMotion } from '../hooks/useMediaFlag.js';

/**
 * Magnetic hover: the element leans toward the cursor while it's near, then
 * springs back when it leaves.
 *
 * The pull is capped as a fraction of the element's own size rather than a
 * fixed pixel count, so a small button and a wide one feel like the same
 * material instead of the small one flying around.
 */
export function Magnetic({ children, strength = 0.32, className = '' }) {
  const ref = useRef(null);
  const reducedMotion = useReducedMotion();
  const coarsePointer = useCoarsePointer();

  const [style, api] = useSpring(() => ({
    x: 0,
    y: 0,
    config: { mass: 1, tension: 260, friction: 22 },
  }));

  // The element's box is measured ONCE on enter, not on every move.
  // getBoundingClientRect forces a synchronous layout, and doing that at
  // pointermove frequency — while a WebGL scene is running — is a real stall.
  const box = useRef(null);

  const onEnter = useCallback((event) => {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    box.current = { cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2 };
    // Seed from the entry point so the first frame isn't a jump from zero.
    api.start({
      x: (event.clientX - box.current.cx) * strength,
      y: (event.clientY - box.current.cy) * strength,
    });
  }, [api, strength]);

  const onMove = useCallback(
    (event) => {
      const b = box.current;
      if (!b) return;
      api.start({ x: (event.clientX - b.cx) * strength, y: (event.clientY - b.cy) * strength });
    },
    [api, strength],
  );

  const onLeave = useCallback(() => {
    box.current = null;
    api.start({ x: 0, y: 0 });
  }, [api]);

  if (reducedMotion || coarsePointer) {
    return <span className={className}>{children}</span>;
  }

  return (
    <animated.span
      ref={ref}
      className={className}
      onPointerEnter={onEnter}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{
        display: 'inline-block',
        // Both values must go through `to` together. Reading y via `.get()`
        // inside x's interpolator would sample it once and never track it.
        transform: to([style.x, style.y], (x, y) => `translate3d(${x}px, ${y}px, 0)`),
      }}
    >
      {children}
    </animated.span>
  );
}
