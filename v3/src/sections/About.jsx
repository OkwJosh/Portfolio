import { identity, skillGroups } from '../data/site.js';
import { sideFor } from '../lib/config.js';
import { Reveal } from '../ui/Reveal.jsx';

export function About() {
  const total = skillGroups.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <section id="about" className="section" data-side={sideFor('about')}>
      <Reveal className="section-head">
        <p className="eyebrow">03 — Profile</p>
        <h2 className="heading">About</h2>
      </Reveal>

      <div className="about-grid">
        <Reveal>
          <figure className="portrait">
            <img src={identity.portrait} alt={identity.name} />
            <figcaption>
              <span>{identity.name}</span>
              <span>{identity.location}</span>
            </figcaption>
          </figure>
        </Reveal>

        <div className="about-copy">
          <Reveal delay={60}>
            <p className="about-lead">I turn ideas into systems people actually keep using.</p>
          </Reveal>
          <Reveal delay={120}>
            <p>
              I work across the whole stack — client, service and infrastructure — and lead
              implementation from architecture through to release. Cross-platform apps in
              Flutter, APIs in Python and Node, hosted on Google Cloud and Firebase.
            </p>
          </Reveal>
          <Reveal delay={180}>
            <p>
              I care about the invisible parts: state management that stays legible at
              scale, data models that survive their second year, and builds that ship on
              time.
            </p>
          </Reveal>

          <Reveal delay={240} className="stat-row">
            <div className="stat">
              <span className="stat-value">04</span>
              <span className="stat-label">Shipped projects</span>
            </div>
            <div className="stat">
              {/* Derived from the stack itself so the two can't drift apart. */}
              <span className="stat-value">{total}+</span>
              <span className="stat-label">Technologies</span>
            </div>
            <div className="stat">
              <span className="stat-value">03</span>
              <span className="stat-label">Layers of the stack</span>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
