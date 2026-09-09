import { animate, utils } from 'animejs';
import { $, damp, esc, html, pad, isCoarsePointer } from '../lib/dom.js';
import { pointer } from '../lib/pointer.js';
import { identity, projects } from '../data/site.js';

const ARROW = /* html */ `
<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
     stroke-width="2.5" stroke-linecap="square" aria-hidden="true">
  <path d="M7 17 17 7M9 7h8v8" />
</svg>`;

/**
 * One row: index / name + category / description + tech / CTA.
 *
 * The description is not decoration — without it the list is four proper nouns
 * and a visitor has no idea what any of them do.
 */
const row = (project, i) => html`
  <button class="work-row" type="button"
          data-id="${esc(project.id)}"
          style="--row-accent:${esc(project.accent)}"
          data-cursor="view" data-cursor-label="Watch"
          aria-label="Watch the ${esc(project.title)} demo">
    <span class="work-index">${pad(i + 1)} — ${esc(project.year)}</span>

    <span>
      <span class="work-name">${esc(project.title)}</span>
      <span class="work-cat">${esc(project.category)} · ${esc(project.platform)}</span>
    </span>

    <span>
      <span class="work-desc">${esc(project.description)}</span>
      <span class="work-tech">
        ${project.tech.map((t) => `<span class="chip">${esc(t)}</span>`).join('')}
      </span>
    </span>

    <span class="work-cta">Watch demo ${ARROW}</span>
  </button>
`;

/**
 * Renders the work list and wires its hover choreography.
 *
 * Hovering a row drives four things at once:
 *   1. the row itself (accent wash, name slide, chip borders — all CSS)
 *   2. the fixed giant outlined title behind the list
 *   3. the thumbnail trailing the cursor
 *   4. the WebGL scene, which retints to the project's accent and pulses
 *
 * @param {{ setAccent(hex: string): void, pulse(strength?: number): void }} background
 * @param {{ open(project: object): void }} demo
 */
export function initWork(background, demo) {
  const list = $('#work-list');
  const titleWrap = $('#work-title');
  const titleText = titleWrap?.querySelector('span');
  const peek = $('#work-peek');
  const peekImg = $('#work-peek-img');

  if (!list) return { update() {} };

  projects.forEach((project, i) => list.appendChild(row(project, i)));

  // Preload thumbnails so the peek panel never shows an empty frame.
  projects.forEach((p) => {
    const img = new Image();
    img.src = p.image;
  });

  const rows = [...list.querySelectorAll('.work-row')];
  const coarse = isCoarsePointer();
  const peekPos = { x: pointer.client.x, y: pointer.client.y };
  let active = null;

  const enter = (project, element) => {
    if (active === project.id) return;
    active = project.id;

    list.dataset.hovering = 'true';
    rows.forEach((r) => (r.dataset.active = String(r === element)));

    // Scene reacts.
    background.setAccent(project.accent);
    background.pulse(0.9);

    if (coarse) return;

    // Giant fixed title swaps with a vertical wipe.
    titleText.textContent = project.title;
    animate(titleWrap, { opacity: [0, 1], duration: 400, ease: 'outQuad' });
    animate(titleText, {
      y: ['14%', '0%'],
      scale: [0.965, 1],
      duration: 900,
      ease: 'out(4)',
    });

    // Thumbnail pops in. The scale lives on the <img>, never on the <figure> —
    // the figure's transform is owned exclusively by the per-frame trail below,
    // and two writers on one transform will fight.
    peekImg.src = project.image;
    peekImg.alt = `${project.title} preview`;
    animate(peek, { opacity: [0, 1], duration: 400, ease: 'outQuad' });
    animate(peekImg, { scale: [1.18, 1], duration: 900, ease: 'out(4)' });
  };

  const leave = () => {
    if (!active) return;
    active = null;

    list.dataset.hovering = 'false';
    rows.forEach((r) => (r.dataset.active = 'false'));

    // Back to the house electric blue.
    background.setAccent(identity.accent);

    if (coarse) return;

    animate(titleWrap, { opacity: 0, duration: 350, ease: 'outQuad' });
    animate(peek, { opacity: 0, duration: 300, ease: 'outQuad' });
  };

  rows.forEach((element, i) => {
    const project = projects[i];
    element.addEventListener('pointerenter', () => enter(project, element));
    element.addEventListener('focus', () => enter(project, element));
    element.addEventListener('click', () => {
      background.pulse(1.6);
      demo.open(project);
    });
  });

  list.addEventListener('pointerleave', leave);
  list.addEventListener('focusout', (event) => {
    if (!list.contains(event.relatedTarget)) leave();
  });

  return {
    /** Called from the shared render loop to trail the peek thumbnail. */
    update({ dt }) {
      if (coarse || !active) return;
      peekPos.x = damp(peekPos.x, pointer.client.x, 9, dt);
      peekPos.y = damp(peekPos.y, pointer.client.y, 9, dt);
      // Lean into the direction of travel — a little life, not a full physics sim.
      const tilt = (pointer.client.x - peekPos.x) * 0.08;
      utils.set(peek, {
        translateX: `${peekPos.x}px`,
        translateY: `${peekPos.y}px`,
        rotate: `${tilt}deg`,
      });
    },
  };
}
