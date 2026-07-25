import { animate, onScroll, stagger, utils } from 'animejs';
import { $$, prefersReducedMotion } from '../lib/dom.js';

/**
 * Scroll-triggered reveals for everything outside the hero.
 *
 * Uses Anime.js' built-in `onScroll` observer as the animation's `autoplay`
 * source — the animation exists immediately but is only advanced once the
 * element crosses the threshold. `repeat: false` makes it a one-shot.
 */
export function initReveals() {
  // The hero has its own entrance timeline; don't double-animate it.
  const targets = $$('[data-reveal]').filter((el) => !el.closest('.hero'));

  if (prefersReducedMotion()) {
    utils.set(targets, { opacity: 1 });
    return;
  }

  utils.set(targets, { opacity: 0, y: 32 });

  animate(targets, {
    opacity: 1,
    y: 0,
    duration: 1000,
    ease: 'out(3)',
    delay: stagger(90),
    autoplay: onScroll({
      // Fire when the element's top reaches 85% down the viewport.
      enter: 'bottom-=15% top',
      repeat: false,
    }),
  });
}

/**
 * Counts the stat numbers up when they scroll into view.
 * Elements opt in with `data-count`, plus optional `data-pad` / `data-suffix`.
 */
export function initCounters() {
  const stats = $$('[data-count]');
  if (prefersReducedMotion() || !stats.length) return;

  stats.forEach((el) => {
    const to = Number(el.dataset.count);
    const width = Number(el.dataset.pad || 0);
    const suffix = el.dataset.suffix || '';
    const value = { n: 0 };

    animate(value, {
      n: to,
      duration: 1600,
      ease: 'out(4)',
      onUpdate: () => {
        const n = Math.round(value.n);
        el.textContent = (width ? String(n).padStart(width, '0') : String(n)) + suffix;
      },
      autoplay: onScroll({ target: el, enter: 'bottom-=10% top', repeat: false }),
    });
  });
}
