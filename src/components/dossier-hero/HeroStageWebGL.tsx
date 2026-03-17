import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { DossierPhaseId } from './dossier-hero.types';
import {
  PHASE_SCENE,
  SCENE_LERP,
  POINTER_RANGES,
  CAMERA_DEFAULTS,
  LIGHTING,
  NODE_BEHAVIOUR,
  type PhaseSceneState,
  type SemanticNodeKey,
} from './hero-scene.config';
import { useGLBScene, type SemanticNodes } from './use-glb-loader';
import { useExperience } from '../experience/ExperienceProvider';

/* ─── Props ─── */

interface StageProps {
  progress: number;
  phase: DossierPhaseId;
  localProgress: number;
  onCriticalMissing?: () => void;
}

/* ─── Helpers ─── */

function lerpState(a: PhaseSceneState, b: PhaseSceneState, t: number): PhaseSceneState {
  const l = THREE.MathUtils.lerp;
  return {
    cameraZ: l(a.cameraZ, b.cameraZ, t),
    cameraY: l(a.cameraY, b.cameraY, t),
    sceneTiltMultiplier: l(a.sceneTiltMultiplier, b.sceneTiltMultiplier, t),
    heroArtifactY: l(a.heroArtifactY, b.heroArtifactY, t),
    heroArtifactScale: l(a.heroArtifactScale, b.heroArtifactScale, t),
    supportY: l(a.supportY, b.supportY, t),
    supportSpread: l(a.supportSpread, b.supportSpread, t),
    atmosphereOpacity: l(a.atmosphereOpacity, b.atmosphereOpacity, t),
    orbGlow: l(a.orbGlow, b.orbGlow, t),
  };
}

const INITIAL_STATE: PhaseSceneState = { ...PHASE_SCENE.closed };

/* ─── Grain overlay shader ─── */

const grainVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const grainFrag = /* glsl */ `
uniform float uTime;
uniform float uOpacity;
varying vec2 vUv;
float rand(vec2 co) { return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  float n = rand(vUv * 800.0 + uTime * 3.0);
  gl_FragColor = vec4(vec3(n), uOpacity);
}`;

/* ─── Motion functions ─── */

function applyPhaseMotion(
  current: PhaseSceneState,
  target: PhaseSceneState,
  delta: number,
  camera: THREE.Camera,
  pointerLerpX: number,
  pointerLerpY: number,
  heroArtifactRef: React.RefObject<THREE.Group | null>,
  supportRef: React.RefObject<THREE.Group | null>,
) {
  const lerpAmt = 1 - Math.pow(1 - SCENE_LERP, delta * 60);
  const l = THREE.MathUtils.lerp;
  const s = current;

  // Lerp all state fields
  s.cameraZ = l(s.cameraZ, target.cameraZ, lerpAmt);
  s.cameraY = l(s.cameraY, target.cameraY, lerpAmt);
  s.sceneTiltMultiplier = l(s.sceneTiltMultiplier, target.sceneTiltMultiplier, lerpAmt);
  s.heroArtifactY = l(s.heroArtifactY, target.heroArtifactY, lerpAmt);
  s.heroArtifactScale = l(s.heroArtifactScale, target.heroArtifactScale, lerpAmt);
  s.supportY = l(s.supportY, target.supportY, lerpAmt);
  s.supportSpread = l(s.supportSpread, target.supportSpread, lerpAmt);
  s.atmosphereOpacity = l(s.atmosphereOpacity, target.atmosphereOpacity, lerpAmt);
  s.orbGlow = l(s.orbGlow, target.orbGlow, lerpAmt);

  // Camera — subtle drift only
  const px = (pointerLerpX - 0.5) * POINTER_RANGES.cameraPointerX;
  const py = (pointerLerpY - 0.5) * -POINTER_RANGES.cameraPointerY;
  (camera as THREE.PerspectiveCamera).position.set(px, s.cameraY + py, s.cameraZ);
  camera.lookAt(0, 0.8, 0);

  // Hero artifact group — position, scale, and additive pointer tilt
  if (heroArtifactRef.current) {
    heroArtifactRef.current.position.y = s.heroArtifactY;
    const sc = s.heroArtifactScale;
    heroArtifactRef.current.scale.set(sc, sc, sc);
    heroArtifactRef.current.rotation.y = (pointerLerpX - 0.5) * POINTER_RANGES.artifactTiltY;
    heroArtifactRef.current.rotation.x = (pointerLerpY - 0.5) * -POINTER_RANGES.artifactTiltX;
  }

  // Support group
  if (supportRef.current) {
    supportRef.current.position.y = s.supportY;
    const sp = 1 + s.supportSpread;
    supportRef.current.scale.set(sp, 1, sp);
  }
}

function applyPointerMotion(
  sceneRef: React.RefObject<THREE.Group | null>,
  nodes: SemanticNodes,
  pointerLerpX: number,
  pointerLerpY: number,
  tiltMul: number,
  originals: Map<string, THREE.Vector3>,
) {
  // Scene root tilt
  if (sceneRef.current) {
    sceneRef.current.rotation.y = (pointerLerpX - 0.5) * POINTER_RANGES.sceneTiltY * tiltMul;
    sceneRef.current.rotation.x = (pointerLerpY - 0.5) * -POINTER_RANGES.sceneTiltX * tiltMul;
  }

  // Per-node pointer shift & tilt
  Object.entries(nodes).forEach(([key, node]) => {
    if (!node) return;
    const behaviour = NODE_BEHAVIOUR[key as SemanticNodeKey];
    if (!behaviour) return;

    const orig = originals.get(key);
    if (!orig) return;

    let xShift = 0;
    let zShift = 0;

    if (behaviour.pointerShift) {
      xShift = (pointerLerpX - 0.5) * behaviour.pointerShift.x;
      zShift = (pointerLerpY - 0.5) * behaviour.pointerShift.y;
    }

    if (behaviour.pointerTilt) {
      node.rotation.y = (pointerLerpX - 0.5) * POINTER_RANGES.artifactTiltY;
      node.rotation.x = (pointerLerpY - 0.5) * -POINTER_RANGES.artifactTiltX;
    }

    // Only apply X/Z shift (Y handled by secondary motion)
    node.position.x = orig.x + xShift;
    node.position.z = orig.z + zShift;
  });
}

/** Orb pointer-lag state (module-level to persist across frames) */
const orbLag = { x: 0.5, y: 0.5 };
const ORB_LAG_FACTOR = 0.03; // much slower than main lerp → trailing feel
const ORB_LAG_RANGE = 0.12;  // max positional offset from pointer

function applySecondaryMotion(
  nodes: SemanticNodes,
  elapsed: number,
  originals: Map<string, THREE.Vector3>,
  pointerLerpX: number,
  pointerLerpY: number,
) {
  // Update orb lag toward current pointer
  orbLag.x += (pointerLerpX - orbLag.x) * ORB_LAG_FACTOR;
  orbLag.y += (pointerLerpY - orbLag.y) * ORB_LAG_FACTOR;

  Object.entries(nodes).forEach(([key, node]) => {
    if (!node) return;
    const behaviour = NODE_BEHAVIOUR[key as SemanticNodeKey];
    if (!behaviour) return;

    const orig = originals.get(key);
    if (!orig) return;

    let yOffset = 0;

    // Sin-based float
    if (behaviour.float) {
      yOffset = Math.sin(elapsed * behaviour.float.speed * Math.PI * 2) * behaviour.float.amp;
    }

    // Orb pointer lag offset
    if (key === 'orb') {
      const lagX = (orbLag.x - 0.5) * ORB_LAG_RANGE;
      const lagY = (orbLag.y - 0.5) * -ORB_LAG_RANGE * 0.6;
      node.position.x = orig.x + lagX;
      node.position.z = orig.z + lagY;
    }

    if (yOffset !== 0) {
      node.position.y = orig.y + yOffset;
    }
  });
}

/* ─── Scene content (lives inside Canvas) ─── */

function SceneContent({ progress, phase, localProgress, onCriticalMissing }: StageProps) {
  const { pointerLerpX, pointerLerpY } = useExperience();
  const { camera } = useThree();
  const { nodes, grouped, loaded, criticalMissing } = useGLBScene();

  useEffect(() => {
    if (criticalMissing && onCriticalMissing) onCriticalMissing();
  }, [criticalMissing, onCriticalMissing]);

  const sceneRef = useRef<THREE.Group>(null);
  const heroArtifactRef = useRef<THREE.Group>(null);
  const supportRef = useRef<THREE.Group>(null);
  const currentState = useRef<PhaseSceneState>({ ...INITIAL_STATE });
  const grainRef = useRef<THREE.ShaderMaterial>(null);

  // Store original positions for shift animations
  const originalPositions = useRef<Map<string, THREE.Vector3>>(new Map());

  useEffect(() => {
    if (!loaded) return;
    Object.entries(nodes).forEach(([key, node]) => {
      if (node) {
        originalPositions.current.set(key, node.position.clone());
      }
    });
  }, [loaded, nodes]);

  // Grain material
  const grainMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: grainVert,
    fragmentShader: grainFrag,
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 0.02 } },
    transparent: true,
    depthWrite: false,
  }), []);

  useEffect(() => {
    return () => { grainMat.dispose(); };
  }, [grainMat]);

  useFrame((state, delta) => {
    if (!loaded) return;

    // 1. Compute target from phase + localProgress blend
    const phaseKeys = Object.keys(PHASE_SCENE) as DossierPhaseId[];
    const phaseIdx = phaseKeys.indexOf(phase);
    const nextIdx = Math.min(phaseIdx + 1, phaseKeys.length - 1);
    const target = lerpState(PHASE_SCENE[phase], PHASE_SCENE[phaseKeys[nextIdx]], localProgress);

    // 2. Phase motion — camera, group transforms
    applyPhaseMotion(currentState.current, target, delta, camera, pointerLerpX, pointerLerpY, heroArtifactRef, supportRef);

    // 3. Pointer motion — scene tilt, per-node shift
    applyPointerMotion(sceneRef, nodes, pointerLerpX, pointerLerpY, currentState.current.sceneTiltMultiplier, originalPositions.current);

    // 4. Secondary motion — orb float etc
    applySecondaryMotion(nodes, state.clock.elapsedTime, originalPositions.current);

    // 5. Grain
    if (grainRef.current) {
      grainRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={LIGHTING.ambient.intensity} />
      <directionalLight
        position={LIGHTING.key.position}
        intensity={LIGHTING.key.intensity}
        castShadow
        shadow-mapSize-width={LIGHTING.key.shadowMapSize}
        shadow-mapSize-height={LIGHTING.key.shadowMapSize}
        shadow-camera-near={0.5}
        shadow-camera-far={20}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
        shadow-bias={-0.001}
      />
      <directionalLight
        position={LIGHTING.fill.position}
        intensity={LIGHTING.fill.intensity}
      />

      {/* Scene graph with explicit groups */}
      <group ref={sceneRef}>
        {/* Hero artifact group: dossier + pedestal */}
        <group ref={heroArtifactRef}>
          {loaded && grouped.heroArtifact.map((node, i) => (
            <primitive key={`hero-${i}`} object={node} />
          ))}
        </group>

        {/* Support group: orb, tickets, rails */}
        <group ref={supportRef}>
          {loaded && grouped.support.map((node, i) => (
            <primitive key={`support-${i}`} object={node} />
          ))}
        </group>

        {/* Atmosphere group: portal + grain */}
        <group>
          {loaded && grouped.atmosphere.map((node, i) => (
            <primitive key={`atmo-${i}`} object={node} />
          ))}
          <mesh position={[0, 1, 3.5]} renderOrder={10}>
            <planeGeometry args={[14, 10]} />
            <primitive object={grainMat} ref={grainRef} attach="material" />
          </mesh>
        </group>
      </group>
    </>
  );
}

/* ─── Exported Canvas wrapper ─── */

export function HeroStageWebGL(props: StageProps) {
  return (
    <div className="absolute inset-0">
      <Canvas
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        camera={{
          fov: CAMERA_DEFAULTS.fov,
          near: CAMERA_DEFAULTS.near,
          far: CAMERA_DEFAULTS.far,
          position: CAMERA_DEFAULTS.position,
        }}
        shadows
        style={{ position: 'absolute', inset: 0 }}
        dpr={[1, 1.5]}
        frameloop="always"
      >
        <SceneContent {...props} />
      </Canvas>
    </div>
  );
}
