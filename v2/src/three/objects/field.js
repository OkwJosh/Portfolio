import * as THREE from 'three';
import { animate } from 'animejs';
import { damp } from '../../lib/dom.js';

const vertexShader = /* glsl */ `
uniform float uTime;
uniform float uSize;
uniform float uPixelRatio;

attribute float aScale;
attribute float aOffset;

varying float vAlpha;

void main() {
  vec3 pos = position;

  // Each point drifts on its own phase so the field never pulses in unison.
  pos.y += sin(uTime * 0.35 + aOffset) * 0.22;
  pos.x += cos(uTime * 0.24 + aOffset * 1.7) * 0.18;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

  // Perspective size attenuation, corrected for device pixel ratio.
  gl_PointSize = uSize * aScale * uPixelRatio * (18.0 / -mvPosition.z);

  // Fade with depth so the field dissolves into the background.
  // Note the "1.0 - smoothstep(lo, hi, x)" form: smoothstep with edge0 > edge1
  // is undefined behaviour in the GLSL ES spec, so never invert the edges.
  vAlpha = 1.0 - smoothstep(4.0, 22.0, -mvPosition.z);

  gl_Position = projectionMatrix * mvPosition;
}
`;

// No `precision` statement here on purpose — Three.js injects one, and
// redeclaring it as mediump while the vertex stage stays highp makes `vAlpha`
// a mismatched varying, which strict drivers reject at link time.
const fragmentShader = /* glsl */ `
uniform vec3 uColor;
varying float vAlpha;

void main() {
  // Round the square point sprite off into a soft disc.
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float falloff = 1.0 - smoothstep(0.05, 0.5, d);

  gl_FragColor = vec4(uColor, falloff * vAlpha * 0.75);
}
`;

/**
 * Field — a slowly drifting shell of points behind the knot.
 *
 * Its job is parallax: it counter-rotates against the cursor slightly harder
 * than the knot does, which is what sells the depth of the whole scene.
 */
export class Field {
  constructor({ count = 1200, accent = '#818cf8' } = {}) {
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const offsets = new Float32Array(count);

    for (let i = 0; i < count; i += 1) {
      // Distribute inside a spherical shell, biased outward so the middle
      // stays clear for the knot.
      const radius = 3.2 + Math.random() * 7.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3 + 0] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.7; // flatten
      positions[i * 3 + 2] = radius * Math.cos(phi);

      scales[i] = 0.35 + Math.random() * 1.4;
      offsets[i] = Math.random() * Math.PI * 2;
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
    this.geometry.setAttribute('aOffset', new THREE.BufferAttribute(offsets, 1));

    this.uniforms = {
      uTime: { value: 0 },
      uSize: { value: 14 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      uColor: { value: new THREE.Color(accent) },
    };

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.object3D = new THREE.Points(this.geometry, this.material);
    // Points are displaced in the vertex shader, so the CPU-side bounding
    // sphere is a lie. Culling against it can pop the field out at the edges.
    this.object3D.frustumCulled = false;
  }

  setAccent(hex) {
    const target = new THREE.Color(hex);
    animate(this.uniforms.uColor.value, {
      r: target.r,
      g: target.g,
      b: target.b,
      duration: 900,
      ease: 'outQuad',
    });
  }

  update({ dt, elapsed, pointer }) {
    this.uniforms.uTime.value = elapsed;

    // Parallax — deliberately stronger than the knot's, and inverted.
    this.object3D.rotation.y = damp(this.object3D.rotation.y, elapsed * 0.02 - pointer.smooth.x * 0.22, 2, dt);
    this.object3D.rotation.x = damp(this.object3D.rotation.x, pointer.smooth.y * 0.18, 2, dt);
  }

  resize() {
    this.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
