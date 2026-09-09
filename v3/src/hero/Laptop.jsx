import { useEffect, useMemo } from 'react';
import { RoundedBox } from '@react-three/drei';
import { animated } from '@react-spring/three';
import * as THREE from 'three';
import { LAPTOP } from '../lib/config.js';
import { degToRad } from '../lib/spring.js';
import { Screen } from './Screen.jsx';

const AnimatedGroup = animated('group');

/**
 * Laptop built from primitives — no .glb, no draco, nothing to load.
 *
 * Geometry layout (base centred on the origin, lying in the XZ plane):
 *
 *          z-  ┌──────────────┐  ← hinge lives here, at the BACK edge
 *              │              │
 *              │     base     │
 *          z+  └──────────────┘  ← front edge, faces the camera
 *
 * The lid is a child group whose origin IS the hinge, positioned at the back
 * edge on top of the base. Rotating that group about X swings the lid on a
 * real hinge — the lid never translates, which is the difference between a
 * laptop opening and a lid sliding off.
 *
 * Local lid space runs from z = 0 (hinge) to z = +lidDepth (top edge of the
 * screen). At angle 0 it lies flat over the keyboard; rotating by -θ lifts the
 * far edge up and back.
 */
export function Laptop({
  angle,
  handlers,
  opened,
  channel,
  project,
  accent,
  compact,
  theme,
  reducedMotion,
  actions,
  onBootComplete,
  fillProgress,
}) {
  const { width, baseDepth, baseHeight, lidDepth, lidThickness, cornerRadius } = LAPTOP;

  // Materials are built once. Re-instantiating a material every render forces
  // a shader recompile on the next frame — the classic R3F stutter.
  /**
   * A near-black shell disappears against a dark page and reads as a hole in a
   * light one, so the casing takes a silver finish in light mode. Colours are
   * assigned in an effect below rather than baked into the useMemo, so a theme
   * switch tweens the existing materials instead of rebuilding them (which
   * would force a shader recompile mid-transition).
   */
  const materials = useMemo(
    () => ({
      shell: new THREE.MeshStandardMaterial({ metalness: 0.62, roughness: 0.36 }),
      lidBack: new THREE.MeshStandardMaterial({ metalness: 0.7, roughness: 0.3 }),
      deck: new THREE.MeshStandardMaterial({ metalness: 0.4, roughness: 0.6 }),
      pad: new THREE.MeshStandardMaterial({ metalness: 0.2, roughness: 0.85 }),
      /* Renders nothing but still raycasts, which `visible={false}` would not —
         three skips invisible objects when hit-testing. This is what makes the
         drag target forgiving on a 0.07-unit-thin lid. */
      hit: new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    }),
    [],
  );

  useEffect(() => {
    const palette =
      theme === 'light'
        ? { shell: '#c9ccd8', lidBack: '#b9bdcb', deck: '#e6e8ef', pad: '#d3d6e0' }
        : { shell: '#1b1d26', lidBack: '#15171f', deck: '#101219', pad: '#0a0b10' };
    materials.shell.color.set(palette.shell);
    materials.lidBack.color.set(palette.lidBack);
    materials.deck.color.set(palette.deck);
    materials.pad.color.set(palette.pad);
  }, [theme, materials]);

  useEffect(
    () => () => Object.values(materials).forEach((material) => material.dispose()),
    [materials],
  );

  // A shallow keyboard well and a trackpad — two extra meshes is enough to stop
  // the base reading as a featureless slab.
  const deck = useMemo(
    () => ({
      well: [width * 0.72, 0.012, baseDepth * 0.46],
      wellPos: [0, baseHeight / 2 + 0.004, -baseDepth * 0.12],
      pad: [width * 0.26, 0.008, baseDepth * 0.24],
      padPos: [0, baseHeight / 2 + 0.005, baseDepth * 0.28],
    }),
    [width, baseDepth, baseHeight],
  );

  return (
    <group>
      {/* ── BASE ─────────────────────────────────────────────────────── */}
      <RoundedBox
        args={[width, baseHeight, baseDepth]}
        radius={cornerRadius}
        smoothness={4}
        material={materials.shell}
      />
      <mesh position={deck.wellPos} material={materials.deck}>
        <boxGeometry args={deck.well} />
      </mesh>
      <mesh position={deck.padPos} material={materials.pad}>
        <boxGeometry args={deck.pad} />
      </mesh>

      {/* ── LID ──────────────────────────────────────────────────────────
          The group's origin is the hinge. `angle` is in degrees and negated:
          a positive X rotation would drive the lid down through the base. */}
      <AnimatedGroup
        position={[0, baseHeight / 2, -baseDepth / 2]}
        rotation-x={angle.to((deg) => -degToRad(deg))}
      >
        <RoundedBox
          args={[width, lidThickness, lidDepth]}
          radius={cornerRadius}
          smoothness={4}
          position={[0, lidThickness / 2, lidDepth / 2]}
          material={materials.lidBack}
        />

        {/* Oversized invisible grab volume, sharing the lid's transform. */}
        <mesh
          position={[0, lidThickness / 2, lidDepth / 2]}
          material={materials.hit}
          {...handlers}
        >
          <boxGeometry args={[width * 1.02, lidThickness * 3.4, lidDepth * 1.02]} />
        </mesh>

        <Screen
          opened={opened}
          channel={channel}
          project={project}
          accent={accent}
          compact={compact}
          theme={theme}
          reducedMotion={reducedMotion}
          actions={actions}
          onBootComplete={onBootComplete}
          fillProgress={fillProgress}
        />
      </AnimatedGroup>
    </group>
  );
}
