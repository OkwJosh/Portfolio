import { useEffect, useRef } from 'react';
import { animated, useSpring } from '@react-spring/web';
import { SPRING } from '../lib/config.js';

/**
 * Video demo overlay.
 *
 * The iframe `src` is only set while open and cleared on close — a hidden
 * iframe keeps buffering (and on some providers keeps playing audio) behind
 * the dialog otherwise.
 */
export function DemoDialog({ project, onClose }) {
  const closeRef = useRef(null);

  const style = useSpring({
    opacity: project ? 1 : 0,
    scale: project ? 1 : 0.94,
    config: SPRING.content,
  });

  useEffect(() => {
    if (!project) return undefined;

    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus({ preventScroll: true });

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [project, onClose]);

  if (!project) return null;

  return (
    <animated.div
      className="dialog"
      style={{ opacity: style.opacity }}
      role="dialog"
      aria-modal="true"
      aria-label={`${project.title} demo`}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <animated.div
        className="dialog-panel"
        style={{ transform: style.scale.to((s) => `scale(${s})`) }}
      >
        <div className="dialog-head">
          <div>
            <h3>{project.title}</h3>
            <p>
              {project.category} · {project.platform} · {project.tech.join(' / ')}
            </p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close demo">
            Close ✕
          </button>
        </div>
        <iframe
          className="dialog-frame"
          src={project.demo}
          title={`${project.title} demo`}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </animated.div>
    </animated.div>
  );
}
