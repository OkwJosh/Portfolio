import { animate, createTimeline, utils } from 'animejs';
import { $, pad, prefersReducedMotion } from '../lib/dom.js';

/**
 * Preloader: a 000 → 100 counter, then a two-layer curtain wipe upward.
 *
 * Resolves once the wipe is clear of the viewport, so the caller can start the
 * hero reveal against a clean stage.
 *
 * @returns {Promise<void>}
 */
export function runPreloader() {
  const root = $('#preloader');
  const curtain = $('#curtain');
  const count = $('#preloader-count');
  const bar = $('#preloader-bar');
  const status = $('#preloader-status');

  const finish = () => {
    root?.remove();
    curtain?.remove();
    document.body.dataset.loading = 'false';
  };

  if (prefersReducedMotion()) {
    finish();
    return Promise.resolve();
  }

  // Collapse both layers upward.
  utils.set([root, curtain], { transformOrigin: '50% 0%' });

  return new Promise((resolve) => {
    const progress = { value: 0 };

    createTimeline({
      defaults: { ease: 'out(3)' },
      onComplete: () => {
        finish();
        resolve();
      },
    })
      // 1. Count up. The easing makes it stall and surge like a real load.
      .add(progress, {
        value: 100,
        duration: 1700,
        ease: 'inOut(2)',
        onUpdate: () => {
          count.textContent = pad(progress.value, 3);
          if (progress.value > 55 && status) status.textContent = 'Building scene';
          if (progress.value > 88 && status) status.textContent = 'Ready';
        },
      })
      // 2. Progress hairline, running in parallel (negative offset).
      .add(bar, { scaleX: [0, 1], duration: 1700, ease: 'inOut(2)' }, 0)
      // 3. Content lifts out.
      .add([count, status], { y: [0, -40], opacity: [1, 0], duration: 600 }, '-=150')
      // 4. Two-layer wipe — the offset between them is what makes it feel deep.
      .add(root, { scaleY: [1, 0], duration: 900, ease: 'inOut(4)' }, '-=300')
      .add(curtain, { scaleY: [1, 0], duration: 900, ease: 'inOut(4)' }, '-=780');
  });
}

/**
 * Fades the WebGL canvas in behind the curtain so the mesh never "pops".
 * @param {HTMLCanvasElement} canvas
 */
export function revealCanvas(canvas) {
  if (prefersReducedMotion()) return;
  utils.set(canvas, { opacity: 0 });
  animate(canvas, { opacity: 1, duration: 2000, ease: 'out(2)' });
}
