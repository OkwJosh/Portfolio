import { animate, utils } from 'animejs';
import { $, $$, clamp, damp, esc, html } from '../lib/dom.js';
import { pointer } from '../lib/pointer.js';
import { identity, nav, socials, stack } from '../data/site.js';

/**
 * Everything in the fixed chrome that is rendered from data or updated per
 * frame: nav, marquee, socials, scroll progress, telemetry HUD.
 */

/** Nav links + smooth in-page scrolling. */
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

/** Infinite tech marquee. Two identical tracks make the loop seamless. */
function renderMarquee() {
  const container = $('#marquee');
  if (!container) return;

  const items = stack
    .map((tech) => `<span class="marquee-item" data-cursor="link">${esc(tech)}</span>`)
    .join('');

  container.innerHTML = `
    <div class="marquee-track" aria-hidden="false">${items}</div>
    <div class="marquee-track" aria-hidden="true">${items}</div>`;
}

function renderSocials() {
  const container = $('#socials');
  if (!container) return;

  socials.forEach((social) => {
    const external = !social.href.startsWith('mailto:');
    container.appendChild(html`
      <a class="social" href="${esc(social.href)}" data-cursor="link"
         ${external ? 'target="_blank" rel="noopener noreferrer"' : ''}>
        <span class="label text-paper">${esc(social.label)}</span>
        <span class="label">${esc(social.handle)}</span>
        <span class="label label-accent">↗</span>
      </a>
    `);
  });
}

/** Wire up assets that Vite hashes at build time. */
function wireAssets() {
  const resume = $('#resume-link');
  if (resume) resume.href = identity.resume;

  const portrait = $('#portrait');
  if (portrait) portrait.src = identity.portrait;
}

/**
 * Highlights the nav link for the section currently in view and mirrors it in
 * the HUD. One IntersectionObserver beats a scroll handler doing getBoundingClientRect
 * on every section, every frame.
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
 * @returns {{ update(ctx: { dt: number }): void }}
 */
export function initChrome() {
  renderNav();
  renderMarquee();
  renderSocials();
  wireAssets();
  initSectionTracking();

  const progress = $('#progress');
  const coords = $('#hud-coords');
  const clock = $('#hud-clock');

  let scrolled = 0;
  let lastClock = '';

  // Tuck the header away while scrolling down, bring it back on scroll up.
  // Only fires on an actual direction change — not on every scroll event.
  const header = $('.site-header');
  let lastY = window.scrollY;
  let tucked = false;
  window.addEventListener(
    'scroll',
    () => {
      const y = window.scrollY;
      const shouldTuck = y > lastY && y > 400;
      lastY = y;
      if (shouldTuck === tucked) return;
      tucked = shouldTuck;
      animate(header, { y: tucked ? -90 : 0, duration: 550, ease: 'out(3)' });
    },
    { passive: true },
  );

  return {
    update({ dt }) {
      // Scroll progress — damped so the bar glides instead of stuttering.
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const target = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
      scrolled = damp(scrolled, target, 10, dt);
      utils.set(progress, { scaleX: scrolled });

      // Telemetry readouts.
      if (coords) {
        coords.textContent =
          `X ${pointer.smooth.x.toFixed(3)} / Y ${pointer.smooth.y.toFixed(3)}`;
      }
      if (clock) {
        const now = new Date().toLocaleTimeString('en-GB', { hour12: false });
        if (now !== lastClock) {
          clock.textContent = now;
          lastClock = now;
        }
      }
    },
  };
}
