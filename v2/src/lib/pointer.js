import { damp, clamp } from './dom.js';

/**
 * A single shared pointer model.
 *
 * Everything that reacts to the cursor — the WebGL mesh, the custom cursor, the
 * HUD readout — reads from this one object, so they all stay in lockstep and we
 * only bind one `pointermove` listener for the whole page.
 *
 * Coordinate spaces:
 *   client  — raw CSS pixels
 *   ndc     — normalised device coords, -1..1 with +Y up (what Three.js wants)
 *   smooth  — `ndc` run through exponential damping, for anything that should
 *             trail the cursor rather than snap to it
 */
class Pointer {
  constructor() {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;

    this.client = { x: cx, y: cy };
    this.ndc = { x: 0, y: 0 };
    this.smooth = { x: 0, y: 0 };
    /** 0..1 — how fast the cursor is currently travelling, damped. */
    this.speed = 0;
    /** True once the user has actually moved a fine pointer. */
    this.active = false;

    this._prev = { x: cx, y: cy };
    this._bound = false;
  }

  bind() {
    if (this._bound) return this;
    this._bound = true;

    window.addEventListener('pointermove', this._onMove, { passive: true });
    // Recentre on leave so the scene drifts back to rest.
    window.addEventListener('pointerleave', this._onLeave, { passive: true });
    return this;
  }

  destroy() {
    window.removeEventListener('pointermove', this._onMove);
    window.removeEventListener('pointerleave', this._onLeave);
    this._bound = false;
  }

  _onMove = (event) => {
    this.active = true;
    this.client.x = event.clientX;
    this.client.y = event.clientY;
    this.ndc.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.ndc.y = -((event.clientY / window.innerHeight) * 2 - 1);
  };

  _onLeave = () => {
    this.ndc.x = 0;
    this.ndc.y = 0;
  };

  /**
   * Advance the damped values. Called once per frame from the render loop —
   * never bind this to `pointermove` directly, or the easing becomes tied to
   * mouse polling rate rather than the display.
   *
   * @param {number} dt delta time in seconds
   */
  update(dt) {
    this.smooth.x = damp(this.smooth.x, this.ndc.x, 4.5, dt);
    this.smooth.y = damp(this.smooth.y, this.ndc.y, 4.5, dt);

    const dx = this.client.x - this._prev.x;
    const dy = this.client.y - this._prev.y;
    const travelled = Math.hypot(dx, dy);
    this._prev.x = this.client.x;
    this._prev.y = this.client.y;

    // Normalise against a ~40px/frame "fast flick" and decay back to zero.
    const instant = clamp(travelled / 40, 0, 1);
    this.speed = damp(this.speed, instant, 6, dt);
  }
}

/** Shared singleton — import this, don't instantiate your own. */
export const pointer = new Pointer();
