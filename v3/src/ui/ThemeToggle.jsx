import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'oj-theme-v3';

const SUN = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
  </svg>
);

const MOON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
  </svg>
);

/** Read the theme the inline <head> script already applied. */
export const readTheme = () =>
  typeof document === 'undefined' || document.documentElement.dataset.theme !== 'light'
    ? 'dark'
    : 'light';

/**
 * Theme toggle.
 *
 * Labelled with the theme it switches *to* — a bare sun/moon icon is genuinely
 * ambiguous about which state it represents. The `onChange` callback exists
 * because the WebGL scene has to follow: material colours and blend behaviour
 * can't be expressed in CSS.
 */
export function ThemeToggle({ onChange }) {
  const [theme, setTheme] = useState(readTheme);

  // Tell the scene about the theme that was applied before React mounted.
  useEffect(() => {
    onChange?.(theme);
  }, [theme, onChange]);

  const apply = useCallback((next, persist = true) => {
    document.documentElement.dataset.theme = next;
    setTheme(next);
    if (!persist) return;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private mode — the theme still applies, it just won't be remembered.
    }
  }, []);

  // Follow the OS only while the visitor hasn't made an explicit choice.
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: light)');
    const onSystemChange = (event) => {
      let stored = null;
      try {
        stored = localStorage.getItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
      if (!stored) apply(event.matches ? 'light' : 'dark', false);
    };
    query.addEventListener('change', onSystemChange);
    return () => query.removeEventListener('change', onSystemChange);
  }, [apply]);

  const next = theme === 'dark' ? 'light' : 'dark';

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => apply(next)}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
    >
      {theme === 'dark' ? SUN : MOON}
      <span>{next}</span>
    </button>
  );
}
