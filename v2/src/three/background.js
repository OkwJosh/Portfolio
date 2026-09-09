import { Stage } from './stage.js';
import { Lattice } from './objects/lattice.js';
import { Field } from './objects/field.js';
import { prefersReducedMotion } from '../lib/dom.js';

/**
 * Composes the WebGL background and exposes a tiny, DOM-friendly API so the UI
 * layer never has to know Three.js exists.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {string} accent initial house accent
 */
export function createBackground(canvas, accent = '#4f5bff') {
  const reduced = prefersReducedMotion();

  const stage = new Stage(canvas);
  const lattice = stage.add(new Lattice({ accent }));
  // Fewer points when motion is reduced — the field is pure ambience.
  const field = stage.add(new Field({ count: reduced ? 400 : 1200, accent }));

  if (reduced) {
    // Keep the structure, lose the churn: the scan crawls instead of sweeping.
    lattice.uniforms.uScanSpeed.value = 0.02;
  }

  // Apply the initial responsive sizing pass.
  lattice.resize(window.innerWidth);

  return {
    stage,
    lattice,
    field,

    start: () => stage.start(),
    stop: () => stage.stop(),

    /** Register extra per-frame work on the single shared rAF loop. */
    onTick: (fn) => stage.onTick(fn),

    /** Smoothed frames per second, for the HUD readout. */
    get fps() {
      return stage.fps;
    },

    /** Which WebGL backend actually got created — 'WebGL 2' or 'WebGL'. */
    get renderer() {
      return stage.renderer.capabilities.isWebGL2 ? 'WebGL 2' : 'WebGL';
    },

    /**
     * Retint the whole scene. Called as project rows are hovered so the
     * background carries the active project's identity colour.
     * @param {string} hex
     */
    setAccent(hex) {
      lattice.setAccent(hex);
      field.setAccent(hex);
      // Keep CSS in sync: every accent-reactive style reads `--accent`.
      document.documentElement.style.setProperty('--accent', hex);
    },

    /**
     * Match the page theme — see the notes in lattice.setTheme / field.setTheme.
     * @param {'light' | 'dark'} theme
     */
    setTheme(theme) {
      lattice.setTheme(theme);
      field.setTheme(theme);
    },

    /** One-shot energy surge that sweeps the volume. */
    pulse(strength = 1) {
      if (!reduced) lattice.pulse(strength);
    },

    dispose: () => stage.dispose(),
  };
}
