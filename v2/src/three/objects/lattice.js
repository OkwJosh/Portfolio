import * as THREE from 'three';
import { animate } from 'animejs';
import { simplex3d } from '../glsl/noise.glsl.js';
import { damp } from '../../lib/dom.js';

/* ──────────────────────────────────────────────────────────────────────────
   Shaders
   ────────────────────────────────────────────────────────────────────────── */

const vertexShader = /* glsl */ `
${simplex3d}

uniform float uTime;
uniform float uScanSpeed;
uniform float uEnergy;
uniform float uExtent;
uniform vec3  uPointerLocal;

varying float vEnergy;
varying float vHot;
varying vec3  vNormalView;

void main() {
  // Column 3 of the instance matrix is its translation — the cell's position.
  vec3 origin = instanceMatrix[3].xyz;

  // 1. Slow noise field. The volume breathes rather than sitting inert.
  float n = snoise(origin * 1.05 + vec3(0.0, uTime * 0.11, 0.0));
  float field = clamp(n * 0.5 + 0.5, 0.0, 1.0);

  // 2. A plane sweeping up through the volume, lighting each layer as it
  //    passes. This is the bit that reads as "processing" rather than "blob".
  float scanY = mix(-uExtent, uExtent, fract(uTime * uScanSpeed));
  float scan = 1.0 - smoothstep(0.0, 0.20, abs(origin.y - scanY));

  // 3. Cursor proximity, projected onto the z = 0 plane by the CPU side.
  float near = 1.0 - smoothstep(0.0, 0.95, distance(origin, uPointerLocal));

  float energy = field * 0.5 + scan * 0.95 + near * 0.85 + uEnergy * 0.35;

  // Cells shrink toward nothing when idle, so the volume stays airy and the
  // headline behind it keeps its contrast.
  float scale = 0.26 + clamp(energy, 0.0, 1.6) * 0.85;

  vec3 offset = (instanceMatrix * vec4(position, 1.0)).xyz - origin;
  vec3 finalPos = origin + offset * scale;

  vEnergy = energy;
  vHot = max(scan, near);

  vNormalView = normalize(normalMatrix * mat3(instanceMatrix) * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(finalPos, 1.0);
}
`;

const fragmentShader = /* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uPulse;
uniform float uFloor;

varying float vEnergy;
varying float vHot;
varying vec3  vNormalView;

void main() {
  // There are no lights in the scene, so a fixed key direction separates the
  // cube faces. Without it every cell reads as a flat square.
  float key = dot(normalize(vNormalView), normalize(vec3(0.35, 0.80, 0.55))) * 0.5 + 0.5;

  vec3 color = mix(uColorA, uColorB, clamp(vEnergy, 0.0, 1.0));
  color = mix(color, uPulse, clamp(vHot, 0.0, 1.0) * 0.8);
  color *= 0.55 + key * 0.6;

  // Idle cells fade out as well as shrink — together that keeps the volume
  // see-through instead of a solid ball parked over the type.
  float alpha = uFloor + clamp(vEnergy, 0.0, 1.0) * (1.0 - uFloor);

  gl_FragColor = vec4(color, alpha);
}
`;

/* ──────────────────────────────────────────────────────────────────────────
   Entity
   ────────────────────────────────────────────────────────────────────────── */

/** Tween a THREE.Color toward a hex. Channels are listed explicitly because
 *  spreading a Color would also pick up isColor, which is not a number. */
function tintTo(color, hex, duration = 550) {
  const { r, g, b } = new THREE.Color(hex);
  animate(color, { r, g, b, duration, ease: 'outQuad' });
}

/**
 * Lattice — a hollow, voxelised sphere of cubes: a compute volume.
 *
 * Cells sit on a regular 3D grid, culled to a spherical shell so the middle
 * stays open and the type behind it can breathe. Each cell's size and
 * brightness come from three sources combined in the vertex shader:
 *
 *   1. a slow simplex field, so the whole volume drifts
 *   2. a scan plane sweeping bottom → top, lighting each layer in turn
 *   3. cursor proximity, which pushes a bright bulge under the pointer
 *
 * One `InstancedMesh`, so the whole thing is a single draw call regardless of
 * cell count. Deliberately discipline-neutral — it reads as systems and data
 * rather than as any one platform.
 */
export class Lattice {
  constructor({ accent = '#4f5bff', base = '#818cf8', resolution = 16, radius = 1.9 } = {}) {
    // Shell bounds as a fraction of the radius. A solid ball would just be an
    // opaque lump; hollowing it out is what makes it read as a structure.
    const innerRatio = 0.62;

    const positions = [];
    const half = (resolution - 1) / 2;

    for (let x = 0; x < resolution; x += 1) {
      for (let y = 0; y < resolution; y += 1) {
        for (let z = 0; z < resolution; z += 1) {
          const nx = (x - half) / half;
          const ny = (y - half) / half;
          const nz = (z - half) / half;
          const r = Math.sqrt(nx * nx + ny * ny + nz * nz);
          if (r > 1 || r < innerRatio) continue;
          positions.push(new THREE.Vector3(nx * radius, ny * radius, nz * radius));
        }
      }
    }

    this.cellCount = positions.length;
    this.extent = radius;

    const spacing = (2 * radius) / resolution;
    this.geometry = new THREE.BoxGeometry(1, 1, 1);

    this.uniforms = {
      uTime: { value: 0 },
      uScanSpeed: { value: 0.11 },
      uEnergy: { value: 0 },
      uExtent: { value: radius },
      uFloor: { value: 0.18 },
      uPointerLocal: { value: new THREE.Vector3() },
      uColorA: { value: new THREE.Color(base) },
      uColorB: { value: new THREE.Color(accent) },
      uPulse: { value: new THREE.Color('#ffffff') },
    };

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: this.uniforms,
      transparent: true,
      // Small cells and an x-ray look: skipping depth writes lets the far side
      // of the shell show through, which sells the volume.
      depthWrite: false,
    });

    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, this.cellCount);
    this.mesh.frustumCulled = false; // cells are scaled on the GPU

    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3().setScalar(spacing * 0.55);

    positions.forEach((position, i) => {
      matrix.compose(position, quaternion, scale);
      this.mesh.setMatrixAt(i, matrix);
    });
    this.mesh.instanceMatrix.needsUpdate = true;

    this.object3D = new THREE.Group();
    this.object3D.add(this.mesh);
    this.object3D.rotation.set(0.25, 0.4, 0);
    this._targetRot = { x: 0.25, y: 0.4 };

    // Scratch vectors, reused each frame so the loop allocates nothing.
    this._ray = new THREE.Vector3();
    this._hit = new THREE.Vector3();
  }

  /** Retint for the active project. */
  setAccent(hex) {
    tintTo(this.uniforms.uColorB.value, hex, 650);
  }

  /**
   * Match the page theme.
   *
   * Normal blending throughout, so unlike an additive object this does not
   * vanish on a light background — but the base colour and the highlight both
   * have to invert or the volume turns to mush against white.
   *
   * @param {'light' | 'dark'} theme
   */
  setTheme(theme) {
    const light = theme === 'light';
    tintTo(this.uniforms.uColorA.value, light ? '#2a2fd6' : '#818cf8');
    tintTo(this.uniforms.uPulse.value, light ? '#05060a' : '#ffffff');
    // Idle cells need more presence on white than they do on near-black.
    this.uniforms.uFloor.value = light ? 0.26 : 0.18;
  }

  /** Momentary surge — fired on project hover and on load. */
  pulse(strength = 1) {
    animate(this.uniforms.uEnergy, {
      value: [
        { to: strength, duration: 220, ease: 'outQuad' },
        { to: 0, duration: 1500, ease: 'outExpo' },
      ],
    });
    // Briefly race the scan plane so the surge visibly sweeps the volume.
    animate(this.uniforms.uScanSpeed, {
      value: [
        { to: 0.4, duration: 260, ease: 'outQuad' },
        { to: 0.11, duration: 1700, ease: 'outExpo' },
      ],
    });
  }

  update({ dt, elapsed, pointer, camera }) {
    this.uniforms.uTime.value = elapsed;

    // Where the cursor lands on the z = 0 plane, in the lattice's local space.
    this._ray.set(pointer.smooth.x, pointer.smooth.y, 0.5).unproject(camera);
    this._ray.sub(camera.position).normalize();
    if (Math.abs(this._ray.z) > 1e-4) {
      const distance = -camera.position.z / this._ray.z;
      this._hit.copy(camera.position).addScaledVector(this._ray, distance);
      // One frame of lag on matrixWorld here, which is imperceptible.
      this.object3D.worldToLocal(this._hit);
      this.uniforms.uPointerLocal.value.copy(this._hit);
    }

    this._targetRot.y = elapsed * 0.07 + pointer.smooth.x * 0.38;
    this._targetRot.x = 0.2 + pointer.smooth.y * -0.28;

    this.object3D.rotation.y = damp(this.object3D.rotation.y, this._targetRot.y, 3, dt);
    this.object3D.rotation.x = damp(this.object3D.rotation.x, this._targetRot.x, 3, dt);
  }

  resize(width) {
    // Shrink on phones so the volume sits behind the type rather than through it.
    this.object3D.scale.setScalar(width < 768 ? 0.72 : 1);
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.mesh.dispose();
  }
}
