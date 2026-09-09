import { $, $$, clamp, damp, esc, html } from '../lib/dom.js';
import { identity, nav, skillGroups, socials, stack } from '../data/site.js';

/**
 * Everything in the fixed chrome that is rendered from data or updated per
 * frame: nav, stack grid, marquee, socials, scroll progress, runtime HUD.
 */

/** Nav links. In-page scrolling is handled by CSS `scroll-behavior`. */
function renderNav() {
  const container = $('#nav');
  if (!container) return;

  nav.forEach((item) => {
    container.appendChild(html`
      <a href="#${esc(item.id)}" class="label nav-link" data-cursor="link" data-nav="${esc(item.id)}">
        ${esc(item.label)}
      </a>
    `);
  });
}

/** Grouped skill cards with logos. */
function renderStack() {
  const container = $('#stack-grid');
  if (!container) return;

  skillGroups.forEach((group) => {
    const skills = group.items
      .map((item) => {
        // Not every skill ships with a mark (Google Cloud, CI/CD). Those get a
        // small accent square so the row still aligns.
        const mark = item.logo
          ? `<img src="${esc(item.logo)}" alt="" loading="lazy"
                  ${item.invertOnDark ? 'data-mono="true"' : ''} />`
          : '<span class="skill-mark" aria-hidden="true"></span>';
        return `<span class="skill" data-cursor="link">${mark}${esc(item.name)}</span>`;
      })
      .join('');

    container.appendChild(html`
      <div class="stack-group panel">
        <div>
          <p class="label text-fg">${esc(group.label)}</p>
          <p class="note mt-2">${esc(group.note)}</p>
        </div>
        <div class="flex flex-wrap gap-2">${skills}</div>
      </div>
    `);
  });
}

/** Infinite tech marquee. Two identical tracks make the loop seamless. */
function renderMarquee() {
  const container = $('#marquee');
  if (!container) return;

  const items = stack.map((tech) => `<span class="marquee-item">${esc(tech)}</span>`).join('');
  container.innerHTML = `
    <div class="marquee-track">${items}</div>
    <div class="marquee-track">${items}</div>`;
}

function renderSocials() {
  const container = $('#socials');
  if (!container) return;

  socials.forEach((social) => {
    const external = !social.href.startsWith('mailto:');
    container.appendChild(html`
      <a class="social" href="${esc(social.href)}" data-cursor="link"
         ${external ? 'target="_blank" rel="noopener noreferrer"' : ''}>
        <span class="label text-fg">${esc(social.label)}</span>
        <span class="flex items-center gap-3">
          <span class="label">${esc(social.handle)}</span>
          <span class="label label-accent">↗</span>
        </span>
      </a>
    `);
  });
}

/** Wire up assets that Vite hashes at build time. */
function wireAssets() {
  for (const el of [$('#resume-link'), $('#resume-btn')]) {
    if (el) el.href = identity.resume;
  }
  const portrait = $('#portrait');
  if (portrait) portrait.src = identity.portrait;

  // Derive the "technologies" stat from the stack itself so the two can't
  // drift apart when a skill is added.
  const techStat = $('#stat-tech');
  if (techStat) {
    techStat.dataset.count = String(stack.length);
    techStat.textContent = `${stack.length}+`;
  }
}

/**
 * Highlights the nav link for the section currently in view and mirrors it in
 * the HUD. One IntersectionObserver beats a scroll handler measuring every
 * section on every frame.
 */
function initSectionTracking() {
  const sections = $$('[data-section]');
  const links = $$('[data-nav]');
  const readout = $('#hud-section');
  if (!sections.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      // The entry closest to the top of the viewport wins.
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (!visible) return;

      const id = visible.target.id;
      links.forEach((link) => {
        // `aria-current` is presence-based — set it to "page" or remove it.
        if (link.dataset.nav === id) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      });
      if (readout) readout.textContent = visible.target.dataset.section;
    },
    { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
  );

  sections.forEach((section) => observer.observe(section));
}

/**
 * Builds the chrome and returns a per-frame updater for the live bits.
 *
 * @param {{ fps: number, renderer: string }} background
 * @returns {{ update(ctx: { dt: number }): void }}
 */
export function initChrome(background) {
  renderNav();
  renderStack();
  renderMarquee();
  renderSocials();
  wireAssets();
  initSectionTracking();

  const progress = $('#progress');
  const header = $('#site-header');
  const fpsEl = $('#hud-fps');
  const rendererEl = $('#hud-renderer');

  if (rendererEl) rendererEl.textContent = background.renderer;

  // Frost the header once the page has moved off the top. Only writes on an
  // actual state change, not on every scroll event.
  let scrolledPast = false;
  window.addEventListener(
    'scroll',
    () => {
      const next = window.scrollY > 24;
      if (next === scrolledPast) return;
      scrolledPast = next;
      if (header) header.dataset.scrolled = String(next);
    },
    { passive: true },
  );

  let scrolled = 0;
  let lastFps = '';

  return {
    update({ dt }) {
      // Scroll progress — damped so the bar glides instead of stuttering.
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const target = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
      scrolled = damp(scrolled, target, 10, dt);
      if (progress) progress.style.transform = `scaleX(${scrolled})`;

      // Real renderer telemetry — meaningful to a technical visitor, unlike
      // the raw cursor coordinates this used to show.
      if (fpsEl) {
        const next = `${Math.round(background.fps)} FPS`;
        if (next !== lastFps) {
          fpsEl.textContent = next;
          lastFps = next;
        }
      }
    },
  };
}
