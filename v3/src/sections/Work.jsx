import { projects } from '../data/site.js';
import { sideFor } from '../lib/config.js';
import { Reveal } from '../ui/Reveal.jsx';

/**
 * The work list is an INDEX, not a detail view.
 *
 * A tile carries only what identifies the project — name, year, category,
 * platform, stack. The description and the demo control live on the laptop
 * screen, which is the detail pane. Splitting them this way keeps the list
 * scannable and gives the 3D element an actual job rather than a decorative one.
 *
 * Selecting is separate from opening: a tile publishes itself to the screen,
 * and the demo opens from the button on the screen. On touch that becomes a
 * clean two-step — tap a tile to load it, tap the screen to watch it.
 *
 * `onSelect` fires on focus as well as pointer, so tabbing drives the laptop
 * exactly like the mouse does.
 */
export function Work({ activeId, onSelect, onCycle }) {
  return (
    <section id="work" className="section" data-side={sideFor('work')}>
      <Reveal className="section-head">
        <p className="eyebrow">01 — Selected work</p>
        <h2 className="heading">Shipped projects</h2>
        <p className="section-note">
          Pick one — it loads onto the laptop, with the demo button on screen.
        </p>
      </Reveal>

      <div className="work-list">
        {projects.map((project, i) => (
          <Reveal key={project.id} delay={i * 60}>
            <button
              type="button"
              className="work-row"
              data-active={activeId === project.id}
              style={{ '--accent': project.accent }}
              aria-pressed={activeId === project.id}
              onPointerEnter={() => onSelect(project.id)}
              onFocus={() => onSelect(project.id)}
              onPointerMove={(event) => {
                // Feeds the row's cursor-tracking glow. A CSS variable rather
                // than state: this fires constantly and must never re-render.
                const rect = event.currentTarget.getBoundingClientRect();
                event.currentTarget.style.setProperty(
                  '--mx',
                  `${((event.clientX - rect.left) / rect.width) * 100}%`,
                );
              }}
              onClick={() => onSelect(project.id)}
              aria-label={`Show ${project.title} on the laptop`}
            >
              <span className="work-top">
                <span className="work-name">{project.title}</span>
                <span className="work-year">{project.year}</span>
              </span>

              <span className="work-cat">
                {project.category} · {project.platform}
              </span>

              <span className="work-tech">
                {project.tech.map((tech) => (
                  <span key={tech} className="chip">
                    {tech}
                  </span>
                ))}
              </span>
            </button>
          </Reveal>
        ))}
      </div>

      <Reveal delay={120} className="work-nav">
        <button type="button" onClick={() => onCycle(-1)} aria-label="Previous project">
          ←
        </button>
        <span>
          Flip through <kbd>←</kbd> <kbd>→</kbd>
        </span>
        <button type="button" onClick={() => onCycle(1)} aria-label="Next project">
          →
        </button>
      </Reveal>
    </section>
  );
}
