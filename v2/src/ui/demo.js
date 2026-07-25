import { animate } from 'animejs';
import { $, esc } from '../lib/dom.js';

/**
 * Project demo overlay.
 *
 * The iframe `src` is only set while open and cleared on close — otherwise the
 * embedded player keeps buffering (and, on some providers, playing audio)
 * behind a hidden dialog.
 */
export function createDemo() {
  const root = $('#demo');
  const panel = $('#demo-panel');
  const frame = $('#demo-frame');
  const title = $('#demo-title');
  const meta = $('#demo-meta');
  const close = $('#demo-close');

  let open = false;
  let lastFocused = null;

  const show = (project) => {
    open = true;
    lastFocused = document.activeElement;

    title.textContent = project.title;
    meta.innerHTML = `${esc(project.category)} &nbsp;·&nbsp; ${esc(project.year)} &nbsp;·&nbsp; ${esc(project.tech.join(' / '))}`;
    frame.src = project.demo;

    root.dataset.open = 'true';
    document.body.style.overflow = 'hidden';

    animate(root, { opacity: [0, 1], duration: 350, ease: 'outQuad' });
    animate(panel, {
      opacity: [0, 1],
      scale: [0.94, 1],
      y: [30, 0],
      duration: 700,
      ease: 'out(4)',
    });

    close.focus({ preventScroll: true });
  };

  const hide = () => {
    if (!open) return;
    open = false;

    document.body.style.overflow = '';
    animate(panel, { opacity: 0, scale: 0.96, y: 20, duration: 300, ease: 'inQuad' });
    animate(root, {
      opacity: 0,
      duration: 300,
      ease: 'inQuad',
      onComplete: () => {
        root.dataset.open = 'false'; // CSS returns it to visibility:hidden
        frame.src = ''; // stop playback — a hidden iframe keeps buffering
      },
    });

    lastFocused?.focus?.({ preventScroll: true });
  };

  close.addEventListener('click', hide);
  // Click the backdrop (but not the panel) to dismiss.
  root.addEventListener('click', (event) => {
    if (event.target === root) hide();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') hide();
  });

  return { open: show, close: hide };
}
