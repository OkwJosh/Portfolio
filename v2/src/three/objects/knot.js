import * as THREE from 'three';
import { animate } from 'animejs';
import { simplex3d, rotate2d } from '../glsl/noise.glsl.js';
import { damp } from '../../lib/dom.js';

/* ──────────────────────────────────────────────────────────────────────────
   Shaders
   The same program drives all three passes; `uMode` selects the look:
     0 = wireframe body   1 = additive halo   2 = solid occluder core
   ────────────────────────────────────────────────────────────────────────── */

const vertexShader = /* glsl */ `
${simplex3d}
${rotate2d}

uniform float uTime;
uniform vec2  uPointer;
uniform float uDistort;
uniform float uEnergy;
uniform float uScale;

varying float vNoise;
varying vec3  vNormalView;
varying vec3  vViewPosition;

void main() {
  vec3 pos = position;

  // Two octaves: a slow swell plus finer chatter that reads as surface detail.
  float swell  = snoise(pos * 1.15 + vec3(0.0, 0.0, uTime * 0.22));
  float detail = snoise(pos * 3.40 - vec3(uTime * 0.14, 0.0, 0.0));
  float amp    = uDistort * (0.13 + uEnergy * 0.17);

  pos += normal * (swell * amp + detail * amp * 0.32);

  // The cursor shears the knot: X twists it around Y, Y tilts it around X.
  // Multiplying by the vertex coordinate makes the twist accumulate along the
  // axis rather than rotating the whole mesh rigidly.
  pos.xz = sn_rotate(pos.xz, uPointer.x * 0.40 * pos.y);
  pos.yz = sn_rotate(pos.yz, uPointer.y * 0.22 * pos.x);

  pos *= uScale;

  vNoise = swell;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  vViewPosition = mvPosition.xyz;
  vNormalView = normalize(normalMatrix * normal);

  gl_Position = projectionMatrix * mvPosition;
}
`;

// Precision is left to the Three.js prefix so the varyings match the vertex
// stage exactly — declaring a different precision here is a link-time error
// on strict drivers.
const fragmentShader = /* glsl */ `
uniform vec3  uColorA;
uniform vec3  uColorB;
uniform float uOpacity;
uniform float uEnergy;
uniform int   uMode;

varying float vNoise;
varying vec3  vNormalView;
varying vec3  vViewPosition;

void main() {
  vec3  viewDir = normalize(-vViewPosition);
  // Fresnel: bright where the surface turns away from the camera.
  float fresnel = pow(1.0 - clamp(dot(viewDir, normalize(vNormalView)), 0.0, 1.0), 2.1);

  if (uMode == 2) {
    // Solid core — almost black, just enough rim to separate it from the void.
    // It exists to occlude the far side of the wireframe and give real depth.
    vec3 core = mix(vec3(0.02, 0.024, 0.04), uColorB * 0.22, fresnel);
    gl_FragColor = vec4(core, 1.0);
    return;
  }

  vec3 color = mix(uColorA, uColorB, clamp(vNoise * 0.5 + 0.5, 0.0, 1.0));
  color = mix(color, uColorB, fresnel * 0.85);
  color += fresnel * 0.30 * uEnergy;

  float alpha = uMode == 1
    ? uOpacity * fresnel * (0.55 + uEnergy * 0.6)   // halo: rim only
    : uOpacity * (0.30 + fresnel * 0.85);           // wire: body + hot rim

  gl_FragColor = vec4(color, alpha);
}
`;

/**
 * Knot — an animated, noise-displaced wireframe TorusKnot.
 *
 * Three meshes share one uniform set:
 *   wire  — the wireframe itself
 *   halo  — a slightly larger additive copy that fakes bloom without a
 *           post-processing pass (no EffectComposer = one less dependency
 *           and a much cheaper frame)
 *   core  — a solid, near-black copy just inside the wire that occludes the
 *           back faces so the knot reads as a solid object
 */
export class Knot {
  constructor({ accent = '#4f5bff', base = '#818cf8' } = {}) {
    // Segment counts are tuned for wireframe legibility, not smooth shading:
    // the topology *is* the artwork. Going much denser turns the mesh into a
    // grey smear and triples the line count across all three passes.
    this.geometry = new THREE.TorusKnotGeometry(1.15, 0.36, 200, 28, 2, 3);

    // One shared uniform object, spread into each material. Spreading copies
    // the *references*, so writing `uniforms.uTime.value` updates all three.
    this.uniforms = {
      uTime: { value: 0 },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uDistort: { value: 1 },
      uEnergy: { value: 0 },
      uScale: { value: 1 },
      uColorA: { value: new THREE.Color(base) },
      uColorB: { value: new THREE.Color(accent) },
    };

    this.wire = new THREE.Mesh(this.geometry, this._material({ mode: 0, opacity: 0.85, wireframe: true }));

    this.halo = new THREE.Mesh(
      this.geometry,
      this._material({
        mode: 1,
        opacity: 0.6,
        wireframe: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.halo.scale.setScalar(1.045);

    this.core = new THREE.Mesh(
      this.geometry,
      this._material({ mode: 2, opacity: 1, wireframe: false, transparent: false }),
    );
    this.core.scale.setScalar(0.985);

    this.object3D = new THREE.Group();
    // Draw order matters: core first (writes depth), then wire, then the
    // additive halo last so it blends over everything already on screen.
    this.object3D.add(this.core, this.wire, this.halo);
    this.object3D.rotation.set(0.4, 0.2, 0);

    // Vertices are displaced on the GPU, so the CPU bounding sphere under-
    // reports the real extent and the mesh can vanish near the frustum edge.
    for (const mesh of [this.core, this.wire, this.halo]) mesh.frustumCulled = false;

    // Damped rotation targets driven by the pointer.
    this._targetRot = { x: 0.4, y: 0.2 };
  }

  _material({ mode, opacity, wireframe, blending = THREE.NormalBlending, depthWrite = true, transparent = true }) {
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      // Same uniform object references across every material.
      uniforms: {
        ...this.uniforms,
        uOpacity: { value: opacity },
        uMode: { value: mode },
      },
      wireframe,
      transparent,
      blending,
      depthWrite,
    });
  }

  /**
   * Tween the accent colour — used when a project row is hovered so the mesh
   * picks up that project's identity colour.
   *
   * Anime.js animates any plain object, and THREE.Color is exactly that: three
   * numeric r/g/b props. No adapter needed.
   *
   * @param {string} hex e.g. '#34d399'
   */
  setAccent(hex) {
    const target = new THREE.Color(hex);
    animate(this.uniforms.uColorB.value, {
      r: target.r,
      g: target.g,
      b: target.b,
      duration: 650,
      ease: 'outQuad',
    });
  }

  /** Momentary surge in distortion + brightness. Fired on hover and on click. */
  pulse(strength = 1) {
    animate(this.uniforms.uEnergy, {
      value: [{ to: strength, duration: 220, ease: 'outQuad' }, { to: 0, duration: 1400, ease: 'outExpo' }],
    });
  }

  update({ dt, elapsed, pointer }) {
    this.uniforms.uTime.value = elapsed;
    this.uniforms.uPointer.value.set(pointer.smooth.x, pointer.smooth.y);

    // Base drift, offset by the cursor. `damp` keeps it smooth at any refresh rate.
    this._targetRot.y = elapsed * 0.14 + pointer.smooth.x * 0.55;
    this._targetRot.x = 0.35 + pointer.smooth.y * -0.42;

    this.object3D.rotation.y = damp(this.object3D.rotation.y, this._targetRot.y, 3, dt);
    this.object3D.rotation.x = damp(this.object3D.rotation.x, this._targetRot.x, 3, dt);
    this.object3D.rotation.z += dt * 0.035;

    // Fast cursor movement subtly inflates the mesh.
    this.uniforms.uScale.value = damp(this.uniforms.uScale.value, 1 + pointer.speed * 0.05, 4, dt);
  }

  resize(width) {
    // Shrink on phones so the knot sits behind the type rather than through it.
    const scale = width < 768 ? 0.78 : 1;
    this.object3D.scale.setScalar(scale);
  }

  dispose() {
    this.geometry.dispose();
    for (const mesh of [this.wire, this.halo, this.core]) mesh.material.dispose();
  }
}
