import { achievements, certifications } from '../data/site.js';
import { sideFor } from '../lib/config.js';
import { Reveal } from '../ui/Reveal.jsx';

export function Achievements() {
  return (
    <section id="achievements" className="section" data-side={sideFor('achievements')}>
      <Reveal className="section-head">
        <p className="eyebrow">04 — Recognition & Credentials</p>
        <h2 className="heading">Achievements &amp; Certifications</h2>
      </Reveal>

      <div className="achievements-container">
        {/* Key Milestone Cards */}
        <div className="achievements-grid mb-10">
          {achievements.map((item, i) => (
            <Reveal key={item.id} delay={i * 60}>
              <div
                className="achievement-card glow-card"
                style={{ '--card-accent': item.color }}
              >
                <div className="achievement-stat-badge">
                  <span className="achievement-stat" style={{ color: item.color }}>
                    {item.stat}
                  </span>
                  <span className="achievement-stat-label">{item.statLabel}</span>
                </div>
                <div className="achievement-content">
                  <span className="achievement-cat">{item.category}</span>
                  <h3 className="achievement-title">{item.title}</h3>
                  <p className="achievement-desc">{item.description}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Certifications List */}
        <Reveal delay={240}>
          <h3 className="certifications-heading">Verified Credentials</h3>
        </Reveal>

        <div className="certifications-grid">
          {certifications.map((cert, i) => (
            <Reveal key={cert.id} delay={280 + i * 50}>
              <a
                href={cert.credentialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="cert-card"
                style={{ '--cert-accent': cert.color }}
              >
                <div className="cert-header">
                  <div>
                    <h4 className="cert-title">{cert.title}</h4>
                    <p className="cert-issuer">
                      {cert.issuer} · {cert.date}
                    </p>
                  </div>
                  <span className="cert-badge">{cert.badge}</span>
                </div>

                <div className="cert-skills">
                  {cert.skills.map((skill) => (
                    <span key={skill} className="chip">
                      {skill}
                    </span>
                  ))}
                </div>
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
