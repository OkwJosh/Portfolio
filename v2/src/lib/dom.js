/**
 * Small DOM + math helpers. Deliberately dependency-free so this module can be
 * imported from anywhere (including the Three.js layer) without cycles.
 */

export const $ = (selector, scope = document) => scope.querySelector(selector);

export const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Frame-rate independent damping.
 *
 * A naive `lerp(a, b, 0.1)` per frame moves twice as fast at 120fps as it does
 * at 60fps. Converting the factor through an exponential decay makes the easing
 * identical on every display.
 *
 * @param {number} current
 * @param {number} target
 * @param {number} smoothing  higher = snappier
 * @param {number} dt         delta time in seconds
 */
export const damp = (current, target, smoothing, dt) =>
  lerp(current, target, 1 - Math.exp(-smoothing * dt));

export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const isCoarsePointer = () =>
  window.matchMedia('(hover: none), (pointer: coarse)').matches;

/** Zero-padded number, e.g. pad(4, 2) -> "04". */
export const pad = (n, width = 2) => String(Math.round(n)).padStart(width, '0');

/**
 * Build a DOM node from an HTML string. Used by the renderers in `src/ui/`
 * to keep markup readable instead of a wall of createElement calls.
 */
export const html = (strings, ...values) => {
  const markup = strings.reduce((acc, str, i) => acc + str + (values[i] ?? ''), '');
  const template = document.createElement('template');
  template.innerHTML = markup.trim();
  return template.content.firstElementChild;
};

/** Escapes text before it is interpolated into an `html` template. */
export const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
