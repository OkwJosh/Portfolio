import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSpring } from '@react-spring/three';
import { CLICK_SLOP_PX, DEG_PER_PX, FLICK_VELOCITY, LAPTOP, SPRING } from '../lib/config.js';
import { clamp } from '../lib/spring.js';

/**
 * Owns the lid angle: drag on desktop, tap on touch, spring snap on release.
 *
 * Returns a react-spring `SpringValue` in DEGREES (0 shut → 110 open) rather
 * than radians, so the drag maths, the clamp and the open-threshold all read in
 * the same unit the design is specified in. The conversion to radians happens
 * once, at the group that consumes it.
 *
 * @param {{ reducedMotion: boolean, coarsePointer: boolean }} options
 */
export function useHinge({ reducedMotion, coarsePointer }) {
  const config = reducedMotion ? SPRING.hingeReduced : SPRING.hinge;

  const [{ angle }, api] = useSpring(() => ({ angle: 0, config }), [config]);

  // Drag bookkeeping lives in a ref: it changes on every pointermove and must
  // never trigger a React render.
  const drag = useRef({
    active: false,
    startY: 0,
    startAngle: 0,
    travelled: 0,
    lastY: 0,
    lastTime: 0,
    velocity: 0, // degrees per second
  });

  const settle = useCallback(
    (target) => {
      api.start({ angle: target, config, immediate: false });
    },
    [api, config],
  );

  const open = useCallback(() => settle(LAPTOP.maxAngle), [settle]);
  const close = useCallback(() => settle(0), [settle]);

  const toggle = useCallback(() => {
    settle(angle.get() > LAPTOP.maxAngle / 2 ? 0 : LAPTOP.maxAngle);
  }, [angle, settle]);

  /** Open only if it isn't already — used when the page selects a project. */
  const ensureOpen = useCallback(() => {
    if (angle.get() < LAPTOP.maxAngle * 0.9) open();
  }, [angle, open]);

  const onPointerMove = useCallback(
    (event) => {
      const state = drag.current;
      if (!state.active) return;

      // Dragging UP opens, hence the inversion: screen Y grows downward.
      const delta = (state.startY - event.clientY) * DEG_PER_PX;
      const next = clamp(state.startAngle + delta, 0, LAPTOP.maxAngle);

      const now = performance.now();
      const elapsed = (now - state.lastTime) / 1000;
      if (elapsed > 0) {
        // Track velocity in the same unit as the angle so the flick threshold
        // is expressible in degrees/second.
        state.velocity = ((state.lastY - event.clientY) * DEG_PER_PX) / elapsed;
      }
      state.lastY = event.clientY;
      state.lastTime = now;
      state.travelled = Math.max(state.travelled, Math.abs(state.startY - event.clientY));

      // `immediate` is the whole point: while the finger is down the lid tracks
      // the pointer 1:1 with zero lag. The spring only takes over on release.
      api.start({ angle: next, immediate: true });
    },
    [api],
  );

  const onPointerUp = useCallback(() => {
    const state = drag.current;
    if (!state.active) return;
    state.active = false;

    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);

    // A press that never really moved is a click, not a drag.
    if (state.travelled < CLICK_SLOP_PX) {
      toggle();
      return;
    }

    const current = angle.get();

    // Throw it the way it was moving. Snapping purely to the nearest end makes
    // a fast flick feel like it was ignored.
    if (Math.abs(state.velocity) > FLICK_VELOCITY) {
      settle(state.velocity > 0 ? LAPTOP.maxAngle : 0);
      return;
    }

    settle(current > LAPTOP.maxAngle / 2 ? LAPTOP.maxAngle : 0);
  }, [angle, onPointerMove, settle, toggle]);

  const onPointerDown = useCallback(
    (event) => {
      // Touch devices have no persistent cursor to drag with — they toggle.
      if (coarsePointer) return;

      event.stopPropagation();

      drag.current = {
        active: true,
        startY: event.clientY,
        startAngle: angle.get(),
        travelled: 0,
        lastY: event.clientY,
        lastTime: performance.now(),
        velocity: 0,
      };

      // Listeners go on the window, not the mesh: the pointer routinely leaves
      // the lid mid-drag and the gesture has to survive that.
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
    },
    [angle, coarsePointer, onPointerMove, onPointerUp],
  );

  const onClick = useCallback(
    (event) => {
      if (!coarsePointer) return; // desktop clicks are resolved in onPointerUp
      event.stopPropagation();
      toggle();
    },
    [coarsePointer, toggle],
  );

  // Drop stray listeners if the component unmounts mid-gesture.
  useEffect(
    () => () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    },
    [onPointerMove, onPointerUp],
  );

  const handlers = useMemo(
    () => ({ onPointerDown, onClick }),
    [onPointerDown, onClick],
  );

  return { angle, handlers, toggle, open, close, ensureOpen, settleTo: settle };
}
