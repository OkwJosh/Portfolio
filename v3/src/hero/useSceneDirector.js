import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SECTIONS } from '../lib/config.js';

gsap.registerPlugin(ScrollTrigger);

/**
 * Decides which section the reader is in, and how fast they're travelling.
 *
 * Deliberately NOT scroll-jacking: nothing is pinned and no wheel event is
 * intercepted. One ScrollTrigger per section reports which is active; the rig
 * springs the laptop toward that section's pose. Because the transition is a
 * spring rather than a scrubbed tween, the laptop *arrives* with a settle
 * instead of tracking the scrollbar linearly.
 *
 * Scroll velocity is measured here rather than taken from ScrollTrigger so the
 * unit is plain px/s and the rig can convert it to an angular impulse.
 *
 * @returns {{ section: string, progress: React.MutableRefObject<number>,
 *             velocity: React.MutableRefObject<number> }}
 */
export function useSceneDirector() {
  const [section, setSection] = useState(SECTIONS[0]);

  /** 0-1 through the whole document — used for slow continuous drift. */
  const progress = useRef(0);
  /** Signed scroll velocity in px/s, decayed each frame by the rig. */
  const velocity = useRef(0);

  useEffect(() => {
    const triggers = SECTIONS.map((id) => {
      const element = document.getElementById(id);
      if (!element) return null;

      return ScrollTrigger.create({
        trigger: element,
        // A band across the middle of the viewport: whichever section covers
        // it owns the laptop. Top/bottom edges would flip-flop on short
        // sections as they enter and leave simultaneously.
        start: 'top 55%',
        end: 'bottom 55%',
        onToggle: (self) => {
          if (self.isActive) setSection(id);
        },
      });
    }).filter(Boolean);

    const page = ScrollTrigger.create({
      trigger: document.body,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        progress.current = self.progress;
        velocity.current = self.getVelocity();
      },
    });

    // Fonts and images settling change section offsets after mount.
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener('load', refresh);

    return () => {
      window.removeEventListener('load', refresh);
      triggers.forEach((trigger) => trigger.kill());
      page.kill();
    };
  }, []);

  return { section, progress, velocity };
}
