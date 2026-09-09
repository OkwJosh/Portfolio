import { $ } from '../lib/dom.js';

const STORAGE_KEY = 'oj-theme';

const SUN = /* html */ `
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
  <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
</svg>`;

const MOON = /* html */ `
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
  <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
</svg>`;

/** The theme applied before first paint by the inline script in index.html. */
export const getTheme = () =>
  document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';

/**
 * Wires the header toggle.
 *
 * The button is labelled with the theme you'd switch *to*, not the one you're
 * in — "LIGHT" while dark — because an unlabelled sun/moon icon is genuinely
 * ambiguous about which state it represents.
 *
 * @param {(theme: 'light' | 'dark') => void} onChange notified on every change,
 *        including the initial call, so the WebGL scene can match.
 */
export function initTheme(onChange) {
  const button = $('#theme-toggle');

  const paint = (theme) => {
    const next = theme === 'dark' ? 'light' : 'dark';
    if (button) {
      button.innerHTML = `${theme === 'dark' ? SUN : MOON}<span>${next}</span>`;
      button.setAttribute('aria-label', `Switch to ${next} theme`);
      button.setAttribute('title', `Switch to ${next} theme`);
    }
    onChange?.(theme);
  };

  const apply = (theme, persist = true) => {
    document.documentElement.dataset.theme = theme;
    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY, theme);
      } catch {
        // Private mode / storage disabled — the theme still applies for the
        // session, it just won't be remembered.
      }
    }
    paint(theme);
  };

  paint(getTheme());

  button?.addEventListener('click', () => {
    apply(getTheme() === 'dark' ? 'light' : 'dark');
  });

  // Follow the OS only while the visitor hasn't made an explicit choice.
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (event) => {
    let stored = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    if (!stored) apply(event.matches ? 'light' : 'dark', false);
  });

  return { get: getTheme, set: apply };
}
