import { animate } from 'animejs';
import { $, damp, isCoarsePointer } from '../lib/dom.js';
import { pointer } from '../lib/pointer.js';

/**
 * Custom cursor: a hard dot that tracks 1:1 and a ring that trails behind it.
 *
 * Interactive elements opt in with `data-cursor`:
 *   data-cursor="link"                       -> ring swells
 *   data-cursor="view" data-cursor-label="…" -> ring swells further + shows a label
 *
 * Position is written straight to `transform` from the render loop rather than
 * from the pointermove handler — that decouples cursor smoothing from mouse
 * polling rate and keeps everything on one frame budget.
 */
export function createCursor() {
  // Touch devices keep their native affordances; nothing to build.
  if (isCoarsePointer()) return { update() {}, destroy() {} };

  const dot = $('#cursor-dot');
  const ring = $('#cursor-ring');
  const label = $('#cursor-label');
  if (!dot || !ring) return { update() {}, destroy() {} };

  // Ring position is damped independently of the dot; this gap *is* the effect.
  const ringPos = { x: pointer.client.x, y: pointer.client.y };
  let scale = 1;
  let targetScale = 1;

  const setLabel = (text) => {
    if (text) label.textContent = text;
    animate(label, { opacity: text ? 1 : 0, duration: 260, ease: 'outQuad' });
  };

  const onOver = (event) => {
    const el = event.target.closest?.('[data-cursor]');
    if (!el) return;
    const kind = el.dataset.cursor;
    const text = el.dataset.cursorLabel;
    targetScale = text ? 2.35 : 1.75;
    setLabel(text || '');
    ring.style.borderColor = kind === 'close' ? '#f472b6' : '';
  };

  const onOut = (event) => {
    if (!event.target.closest?.('[data-cursor]')) return;
    // Ignore moves *within* the same interactive element.
    if (event.relatedTarget?.closest?.('[data-cursor]') === event.target.closest('[data-cursor]')) return;
    targetScale = 1;
    setLabel('');
  };

  // Shrink on press for tactile feedback.
  const onDown = () => (scale *= 0.7);

  document.addEventListener('pointerover', onOver, { passive: true });
  document.addEventListener('pointerout', onOut, { passive: true });
  document.addEventListener('pointerdown', onDown, { passive: true });

  return {
    update({ dt }) {
      const { x, y } = pointer.client;

      // Dot: near-instant, just enough damping to remove pointer jitter.
      dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;

      // Ring: trails, and stretches slightly toward the direction of travel.
      ringPos.x = damp(ringPos.x, x, 14, dt);
      ringPos.y = damp(ringPos.y, y, 14, dt);
      scale = damp(scale, targetScale, 10, dt);

      const stretch = 1 + pointer.speed * 0.35;
      ring.style.transform =
        `translate3d(${ringPos.x}px, ${ringPos.y}px, 0) scale(${scale * stretch}, ${scale / stretch})`;
    },

    destroy() {
      document.removeEventListener('pointerover', onOver);
      document.removeEventListener('pointerout', onOut);
      document.removeEventListener('pointerdown', onDown);
    },
  };
}
