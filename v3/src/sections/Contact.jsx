import { identity, socials } from '../data/site.js';
import { Reveal } from '../ui/Reveal.jsx';

/**
 * The close. No copy competing for the frame — the laptop comes forward, takes
 * the whole stage, and becomes the contact interface itself: the links on its
 * screen are real anchors and genuinely clickable.
 *
 * The section is `pointer-events: none` apart from its label. Without that, an
 * empty full-viewport section would sit over the canvas and swallow every
 * click meant for the screen — the same class of bug that stopped the lid
 * opening earlier.
 *
 * The links are duplicated into the footer, visually quiet but focusable, so
 * contact never depends on WebGL having initialised.
 */
export function Contact() {
  return (
    <section id="contact" className="section section--stage" data-side="center">
      <Reveal className="stage-label">
        <p className="eyebrow">04 — Contact</p>
        <p className="stage-hint">Everything you need is on the screen</p>
      </Reveal>

      <footer className="footer">
        <span>© 2026 {identity.name}</span>

        <nav className="footer-links" aria-label="Contact links">
          {socials.map((social) => (
            <a
              key={social.label}
              href={social.href}
              {...(social.href.startsWith('mailto:')
                ? {}
                : { target: '_blank', rel: 'noopener noreferrer' })}
            >
              {social.label}
            </a>
          ))}
        </nav>

        <a href="#hero">Back to top ↑</a>
      </footer>
    </section>
  );
}
