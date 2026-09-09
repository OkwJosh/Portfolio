import { memo, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  ContactShadows,
  Environment,
  Lightformer,
  PerformanceMonitor,
  PerspectiveCamera,
} from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import * as THREE from 'three';
import { LaptopRig } from './LaptopRig.jsx';

/**
 * Light that eases toward the active accent instead of snapping to it.
 *
 * Lives inside the Canvas because it needs `useFrame`. Colour is interpolated
 * in a ref-held THREE.Color — no React state, so changing accent costs nothing
 * beyond the lerp.
 */
function AccentFill({ accent }) {
  const light = useRef();
  const target = useMemo(() => new THREE.Color(accent), [accent]);

  useFrame((_, delta) => {
    if (!light.current) return;
    target.set(accent);
    // Frame-rate independent approach; ~0.35s to close most of the gap.
    light.current.color.lerp(target, 1 - Math.exp(-8 * delta));
  });

  return <directionalLight ref={light} position={[-4, 2, -3]} intensity={0.85} />;
}

/**
 * The WebGL layer. Fixed behind the page so the laptop travels with the reader
 * through every section rather than scrolling out of existence.
 */
function LaptopHeroImpl({
  angle,
  handlers,
  pose,
  channel,
  project,
  projectKey,
  accent,
  compact,
  theme,
  velocity,
  actions,
  onOpenedChange,
  reducedMotion,
  coarsePointer,
  onBootComplete,
  filling,
  fillProgress,
  onFillArrived,
  /**
   * A fullscreen page is over the canvas.
   *
   * This does NOT stop the render loop, however tempting that is.
   * `@react-spring/three` sets react-spring's GLOBAL frameLoop to 'demand' and
   * advances it from r3f's useFrame — so `frameloop="never"` freezes every
   * spring in the app, including the DOM ones animating the page on top. The
   * expansion stalled at 47% until this was reverted.
   *
   * Dropping the two post-passes instead gets most of the saving with none of
   * the coupling.
   */
  covered,
}) {
  /**
   * Resolution is dropped when the frame budget slips and restored when it
   * recovers. `flipflops` stops it oscillating between the two forever on a
   * machine that sits right on the boundary — after 3 reversals it settles.
   */
  const [dpr, setDpr] = useState(coarsePointer ? 1.25 : 1.75);

  return (
    <div className="canvas-layer">
      <Canvas
        /* On phones the canvas renders IN FRONT of the page, so it must not
           swallow taps meant for the content behind it. r3f sets
           `pointer-events: auto` inline on its container — no stylesheet rule
           can beat that — so it has to be overridden through `style`. drei's
           Html sets its own inline value per channel deeper in the tree, so
           the on-screen controls still receive taps. */
        style={{ pointerEvents: compact ? 'none' : 'auto' }}
        // Adaptive, driven by PerformanceMonitor below. A 3x DPR phone would
        // otherwise render ~9x the pixels for no visible gain.
        dpr={dpr}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        // Nothing here needs shadow maps; ContactShadows is one cheap pass.
        shadows={false}
      >
        {/* The camera is raised but must also AIM at the origin. Left level it
            looks straight out at y = 1.15, which pushes everything at y ≈ 0 to
            the bottom of the frame — that's what buried the laptop off the
            bottom edge of the hero. -atan(1.1 / 6.3) points it at the origin,
            so world-space y = 0 is frame centre and the placement maths in the
            rig means what it says. */}
        <PerformanceMonitor
          flipflops={3}
          onDecline={() => setDpr((d) => Math.max(1, d - 0.5))}
          onIncline={() => setDpr((d) => Math.min(2, d + 0.25))}
        />

        <PerspectiveCamera makeDefault fov={35} position={[0, 1.1, 6.3]} rotation={[-0.1728, 0, 0]} />

        {/* Light mode needs more ambient fill: a dark key-lit object against a
            pale page reads as a silhouette. */}
        <ambientLight intensity={theme === 'light' ? 0.9 : 0.35} />
        <directionalLight position={[3, 5, 4]} intensity={theme === 'light' ? 1.9 : 1.5} />
        <AccentFill accent={accent} />

        {/* The environment is built from Lightformers rather than a `preset`.
            drei's presets fetch an HDR from a third-party CDN at runtime — a
            hero that renders as flat grey plastic when that host is slow isn't
            a trade worth making. Emitter rects cost one small offscreen render
            and give sharper, art-directed streaks on the aluminium anyway. */}
        <Environment resolution={256} frames={1}>
          <Lightformer form="rect" intensity={2.4} position={[0, 3, 2]} scale={[6, 3, 1]} target={[0, 0, 0]} />
          <Lightformer form="rect" intensity={1.1} position={[-4, 1, 1]} scale={[3, 4, 1]} color="#8b95ff" target={[0, 0, 0]} />
          <Lightformer form="rect" intensity={0.9} position={[4, 0.5, -1]} scale={[3, 3, 1]} color="#ffffff" target={[0, 0, 0]} />
          <Lightformer form="ring" intensity={0.6} position={[0, -2, 3]} scale={4} color="#4f5bff" target={[0, 0, 0]} />
        </Environment>

        <LaptopRig
          angle={angle}
          handlers={handlers}
          pose={pose}
          channel={channel}
          project={project}
          projectKey={projectKey}
          accent={accent}
          compact={compact}
          theme={theme}
          velocity={velocity}
          actions={actions}
          onOpenedChange={onOpenedChange}
          reducedMotion={reducedMotion}
          coarsePointer={coarsePointer}
          onBootComplete={onBootComplete}
          filling={filling}
          fillProgress={fillProgress}
          onFillArrived={onFillArrived}
        />

        {/* An extra offscreen render pass every frame. 128 is indistinguishable
            from 256 once blurred, and it's skipped on touch where the fill-rate
            budget is tightest — and while a fullscreen page covers the canvas,
            where it would be rendering into nothing. */}
        {!coarsePointer && !covered && (
          <ContactShadows
            position={[0, -1.25, 0]}
            opacity={theme === 'light' ? 0.24 : 0.42}
            scale={11}
            blur={2.8}
            far={3}
            resolution={128}
            frames={reducedMotion ? 1 : Infinity}
          />
        )}

        {/* Bloom only — a high luminance threshold means it catches the emissive
            screen and nothing else. Skipped on touch, where fill-rate hurts most. */}
        {!coarsePointer && !covered && (
          <EffectComposer enableNormalPass={false}>
            <Bloom intensity={theme === 'light' ? 0.32 : 0.7} luminanceThreshold={theme === 'light' ? 0.75 : 0.5} luminanceSmoothing={0.3} mipmapBlur />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
}

/**
 * Memoised: App re-renders whenever a project is previewed, the theme flips or
 * the section changes, and reconciling the whole <Canvas> tree for a prop that
 * didn't change is pure waste. Every prop here is either a primitive, a stable
 * config object, a SpringValue or a useCallback, so the comparison is cheap and
 * usually true.
 */
export const LaptopHero = memo(LaptopHeroImpl);
