import { Stage } from './stage.js';
import { Knot } from './objects/knot.js';
import { Field } from './objects/field.js';
import { prefersReducedMotion } from '../lib/dom.js';

/**
 * Composes the WebGL background and exposes a tiny, DOM-friendly API so the UI
 * layer never has to know Three.js exists.
 *
 * @param {HTMLCanvasElement} canvas
 */
export function createBackground(canvas) {
  const reduced = prefersReducedMotion();

  const stage = new Stage(canvas);
  const knot = stage.add(new Knot());
  // Fewer points when motion is reduced — the field is pure ambience.
  const field = stage.add(new Field({ count: reduced ? 400 : 1200 }));

  if (reduced) {
    // Keep the scene, lose the churn: no displacement, no drift.
    knot.uniforms.uDistort.value = 0.25;
  }

  // Apply the initial responsive sizing pass.
  knot.resize(window.innerWidth);

  return {
    stage,
    knot,
    field,

    start: () => stage.start(),
    stop: () => stage.stop(),

    /** Register extra per-frame work on the single shared rAF loop. */
    onTick: (fn) => stage.onTick(fn),

    /**
     * Retint the whole scene. Called as project rows are hovered so the
     * background carries the active project's identity colour.
     * @param {string} hex
     */
    setAccent(hex) {
      knot.setAccent(hex);
      field.setAccent(hex);
      // Keep CSS in sync: every accent-reactive style reads `--accent`.
      document.documentElement.style.setProperty('--accent', hex);
    },

    /** One-shot energy surge. */
    pulse(strength = 1) {
      if (!reduced) knot.pulse(strength);
    },

    dispose: () => stage.dispose(),
  };
}
