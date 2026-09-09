/**
 * A minimal spring integrator for values that follow a target *every frame*.
 *
 * Why this exists alongside @react-spring/three:
 *   - react-spring is imperative and excels at discrete state transitions —
 *     "the lid was released, snap it open". That's what drives the hinge.
 *   - Parallax tilt and scroll docking have a target that changes on every
 *     pointer/scroll event. Calling `api.start()` at that rate allocates and
 *     re-schedules constantly. A plain integrator stepped inside the existing
 *     useFrame loop costs nothing and never allocates.
 *
 * Both are real spring physics, so the feel matches. Neither is a linear tween.
 */
export class Spring {
  constructor(value = 0, { stiffness = 120, damping = 14, mass = 1 } = {}) {
    this.value = value;
    this.target = value;
    this.velocity = 0;
    this.stiffness = stiffness;
    this.damping = damping;
    this.mass = mass;
  }

  /** Aim at a new target; the value eases there over subsequent frames. */
  set(target) {
    this.target = target;
    return this;
  }

  /** Teleport, killing any momentum. Used for reduced-motion and on mount. */
  jump(value) {
    this.value = value;
    this.target = value;
    this.velocity = 0;
    return this;
  }

  /**
   * Advance by `dt` seconds.
   *
   * Integrated in fixed sub-steps rather than one variable-sized step: a spring
   * stepped with dt straight from the frame clock is stiffness-dependent and
   * can visibly ring — or diverge outright — when the frame rate drops. Fixed
   * sub-steps make 60Hz, 120Hz and a stuttering tab produce the same curve.
   */
  step(dt) {
    const STEP = 1 / 240;
    // Clamp so a backgrounded tab returning with a huge dt can't explode.
    let remaining = Math.min(dt, 1 / 20);

    while (remaining > 0) {
      const h = Math.min(STEP, remaining);
      const force = (this.target - this.value) * this.stiffness - this.velocity * this.damping;
      this.velocity += (force / this.mass) * h;
      this.value += this.velocity * h;
      remaining -= h;
    }

    return this.value;
  }
}

export const lerp = (a, b, t) => a + (b - a) * t;

/**
 * A real CSS `cubic-bezier(x1, y1, x2, y2)` as a JS easing function.
 *
 * Springs are right for anything reacting to input, but a deliberate
 * cinematic move — the laptop flying to centre and zooming until its screen
 * fills the window — wants an authored curve with a defined start and end,
 * not physics that overshoots.
 *
 * The curve is parametric: x and y are both cubic in t, and CSS gives us y for
 * a given x. So we solve x(t) = target with Newton-Raphson, falling back to
 * bisection when the derivative is too flat for Newton to be safe.
 */
export function cubicBezier(x1, y1, x2, y2) {
  const A = (a, b) => 1 - 3 * b + 3 * a;
  const B = (a, b) => 3 * b - 6 * a;
  const C = (a) => 3 * a;

  const curve = (t, a, b) => ((A(a, b) * t + B(a, b)) * t + C(a)) * t;
  const slope = (t, a, b) => 3 * A(a, b) * t * t + 2 * B(a, b) * t + C(a);

  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;

    let t = x;
    for (let i = 0; i < 8; i += 1) {
      const d = slope(t, x1, x2);
      if (Math.abs(d) < 1e-6) break;
      const err = curve(t, x1, x2) - x;
      if (Math.abs(err) < 1e-6) return curve(t, y1, y2);
      t -= err / d;
    }

    // Newton bailed — bisect, which always converges on a monotonic curve.
    let lo = 0;
    let hi = 1;
    t = x;
    while (hi - lo > 1e-6) {
      if (curve(t, x1, x2) < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return curve(t, y1, y2);
  };
}

export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const degToRad = (deg) => (deg * Math.PI) / 180;
