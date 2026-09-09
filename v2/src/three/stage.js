import * as THREE from 'three';
import { pointer } from '../lib/pointer.js';

/**
 * Stage — the render loop, camera and renderer for the background canvas.
 *
 * It owns the *only* requestAnimationFrame loop in the app. Anything that needs
 * per-frame work registers with `onTick()` (DOM-side work: cursor, HUD) or is
 * added as an entity with `add()` (scene-side work: meshes).
 *
 * Frame order is deliberate:
 *   1. pointer.update(dt)   — one shared, damped pointer for everyone
 *   2. tick callbacks       — DOM readers/writers
 *   3. entity.update(ctx)   — scene graph
 *   4. renderer.render()
 */
export class Stage {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    this.canvas = canvas;
    this.entities = [];
    this.ticks = new Set();
    this.running = false;
    this.elapsed = 0;
    /** Smoothed frames per second — read by the HUD. */
    this.fps = 60;
    this._raf = 0;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true, // let the CSS background show through
      powerPreference: 'high-performance',
    });
    // Capping DPR at 2 is the single biggest perf win on high-density displays.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    this.camera.position.set(0, 0, 6.2);

    this.clock = new THREE.Clock();

    this._onResize = this._onResize.bind(this);
    this._onVisibility = this._onVisibility.bind(this);
    this._loop = this._loop.bind(this);

    window.addEventListener('resize', this._onResize);
    window.addEventListener('orientationchange', this._onResize);
    document.addEventListener('visibilitychange', this._onVisibility);

    this._onResize();
  }

  /**
   * Register a scene entity.
   * @param {{ object3D: THREE.Object3D, update?: (ctx: object) => void, resize?: (w:number,h:number)=>void, dispose?: () => void }} entity
   */
  add(entity) {
    this.entities.push(entity);
    if (entity.object3D) this.scene.add(entity.object3D);
    return entity;
  }

  /**
   * Register a per-frame callback. Returns an unsubscribe function.
   * @param {(ctx: { dt: number, elapsed: number }) => void} fn
   */
  onTick(fn) {
    this.ticks.add(fn);
    return () => this.ticks.delete(fn);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    this._raf = requestAnimationFrame(this._loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this._raf);
  }

  _loop() {
    if (!this.running) return;
    this._raf = requestAnimationFrame(this._loop);

    // Clamp dt so a backgrounded tab doesn't produce one enormous step that
    // slingshots every damped value across the screen on return.
    const dt = Math.min(this.clock.getDelta(), 1 / 30);
    this.elapsed += dt;

    // Exponential moving average — a raw 1/dt readout is unreadably jittery.
    if (dt > 0) this.fps += (1 / dt - this.fps) * 0.05;

    pointer.update(dt);

    // `camera` is in the context because entities that project the cursor into
    // world space (the tree) need it, and re-importing the stage would cycle.
    const ctx = { dt, elapsed: this.elapsed, pointer, camera: this.camera };
    for (const fn of this.ticks) fn(ctx);
    for (const entity of this.entities) entity.update?.(ctx);

    this.renderer.render(this.scene, this.camera);
  }

  _onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height, false);

    this.camera.aspect = width / height;
    // Pull the camera back on narrow viewports so the mesh never crops badly.
    this.camera.position.z = width < 768 ? 8.4 : 6.2;
    this.camera.updateProjectionMatrix();

    for (const entity of this.entities) entity.resize?.(width, height);

    // Render one frame immediately so resizing never shows a stale buffer.
    if (this.running) this.renderer.render(this.scene, this.camera);
  }

  _onVisibility() {
    if (document.hidden) {
      this.stop();
    } else {
      this.clock.getDelta(); // discard the time spent hidden
      this.start();
    }
  }

  dispose() {
    this.stop();
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('orientationchange', this._onResize);
    document.removeEventListener('visibilitychange', this._onVisibility);
    for (const entity of this.entities) entity.dispose?.();
    this.renderer.dispose();
  }
}
