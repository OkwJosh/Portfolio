import { useEffect, useState } from 'react';

/**
 * Subscribes to a media query and re-renders when it flips.
 *
 * Initialised from the query itself rather than from `false`, so the first
 * paint is already correct — starting false would play one frame of the
 * animation we're trying to suppress for reduced-motion users.
 */
export function useMediaFlag(query) {
  const [matches, setMatches] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches,
  );

  useEffect(() => {
    const list = window.matchMedia(query);
    const onChange = (event) => setMatches(event.matches);
    list.addEventListener('change', onChange);
    setMatches(list.matches);
    return () => list.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

export const useReducedMotion = () => useMediaFlag('(prefers-reduced-motion: reduce)');

/**
 * True on touch/pen-first devices. Drag-to-open needs a persistent cursor, so
 * these get tap-to-toggle instead — same spring curve, different input gesture.
 */
export const useCoarsePointer = () => useMediaFlag('(hover: none), (pointer: coarse)');
