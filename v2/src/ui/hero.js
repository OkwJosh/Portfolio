import { createTimeline, splitText, stagger, utils } from 'animejs';
import { $$, prefersReducedMotion } from '../lib/dom.js';

/**
 * Hero entrance choreography.
 *
 * Anime.js `splitText` wraps every character in its own span; `wrap: 'clip'`
 * adds an overflow-clipped parent per character, which is what lets the glyphs
 * slide up from *behind* the baseline rather than just fading.
 *
 * `accessible: true` keeps an aria-label on the original element, so screen
 * readers still announce "Mobile Experiences" and not sixteen loose letters.
 *
 * @returns {import('animejs').Timeline} paused timeline — call `.play()`
 */
export function createHeroTimeline() {
  const headings = $$('[data-split]');
  const reveals = $$('.hero [data-reveal]');
  const reduced = prefersReducedMotion();

  const timeline = createTimeline({
    defaults: { ease: 'out(4)' },
    autoplay: false,
  });

  if (reduced) {
    // Straight fade, no transforms.
    utils.set(reveals, { opacity: 0 });
    timeline.add(reveals, { opacity: 1, duration: 400, delay: stagger(40) });
    return timeline;
  }

  headings.forEach((heading, lineIndex) => {
    const { chars } = splitText(heading, {
      chars: { wrap: 'clip' },
      accessible: true,
    });

    utils.set(chars, { y: '110%', rotate: 6 });

    timeline.add(
      chars,
      {
        y: '0%',
        rotate: 0,
        duration: 1250,
        // A tiny per-character offset reads as one confident motion; anything
        // above ~40ms starts to look like letters arriving separately.
        delay: stagger(28),
      },
      // Lines overlap heavily so the whole headline lands as a single gesture.
      lineIndex === 0 ? 0 : `-=${1250 - 180}`,
    );
  });

  // Everything else rises in behind the headline.
  utils.set(reveals, { opacity: 0, y: 24 });
  timeline.add(
    reveals,
    { opacity: 1, y: 0, duration: 900, delay: stagger(70) },
    '-=900',
  );

  return timeline;
}
