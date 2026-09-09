import { skillGroups } from '../data/site.js';
import { sideFor } from '../lib/config.js';
import { Reveal } from '../ui/Reveal.jsx';

/**
 * Its own section so the laptop has a pose to travel to — it tips back and
 * turns away here, viewed from above like a device on a desk, while the screen
 * switches to the stack channel.
 */
export function Stack() {
  const total = skillGroups.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <section id="stack" className="section" data-side={sideFor('stack')}>
      <Reveal className="section-head">
        <p className="eyebrow">02 — Stack</p>
        <h2 className="heading">Tools I reach for</h2>
        <p className="section-note">
          {total} technologies, grouped by what they actually do.
        </p>
      </Reveal>

      <div className="stack-grid">
        {skillGroups.map((group, i) => (
          <Reveal key={group.label} delay={i * 60}>
            <div className="stack-card">
              <p className="stack-label">
                {group.label}
                <span>{String(group.items.length).padStart(2, '0')}</span>
              </p>
              <div className="stack-items">
                {group.items.map((item) => (
                  <span key={item.name} className="skill">
                    {item.logo ? (
                      <img src={item.logo} alt="" data-mono={item.mono ? 'true' : undefined} />
                    ) : (
                      <span className="skill-mark" aria-hidden="true" />
                    )}
                    {item.name}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
