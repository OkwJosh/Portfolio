import './styles/main.css';

import { $ } from './lib/dom.js';
import { pointer } from './lib/pointer.js';
import { createBackground } from './three/background.js';
import { createCursor } from './ui/cursor.js';
import { createDemo } from './ui/demo.js';
import { createHeroTimeline } from './ui/hero.js';
import { initChrome } from './ui/chrome.js';
import { initCounters, initReveals } from './ui/reveal.js';
import { initWork } from './ui/work.js';
import { revealCanvas, runPreloader } from './ui/preloader.js';

/**
 * Entry point.
 *
 * Boot order matters:
 *   1. Build the WebGL scene and start its loop immediately — it renders behind
 *      the preloader curtain, so the first visible frame is already warm.
 *   2. Build the DOM layer and register its per-frame work on the *same* rAF
 *      loop the renderer uses. One loop, one frame budget.
 *   3. Run the preloader, then play the hero timeline.
 */
function boot() {
  pointer.bind();

  // ── 1. WebGL ────────────────────────────────────────────────────────────
  const canvas = $('#gl');
  const background = createBackground(canvas);
  revealCanvas(canvas);
  background.start();

  // ── 2. DOM ──────────────────────────────────────────────────────────────
  const chrome = initChrome();
  const cursor = createCursor();
  const demo = createDemo();
  const work = initWork(background, demo);

  // Everything DOM-side that needs a frame hooks into the renderer's loop.
  background.onTick((ctx) => {
    cursor.update(ctx);
    chrome.update(ctx);
    work.update(ctx);
  });

  // ── 3. Choreography ─────────────────────────────────────────────────────
  const hero = createHeroTimeline();

  runPreloader().then(() => {
    hero.play();
    background.pulse(1.2); // the scene "wakes up" with the headline

    // Scroll observers are registered only after the preloader releases the
    // body's scroll lock — measuring thresholds against a locked, 100vh body
    // gives every element below the fold the wrong trigger point.
    // Nothing flashes in the meantime: `.anim-hidden` keeps them at opacity 0.
    initReveals();
    initCounters();
  });
}

// The module is deferred by default, but guard anyway so the script can also be
// dropped into <head> without breaking.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
