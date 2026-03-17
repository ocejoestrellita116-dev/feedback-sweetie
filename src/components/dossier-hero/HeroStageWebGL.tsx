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
import { useGLBScene } from './use-glb-loader';
import { useExperience } from '../experience/ExperienceProvider';

/* ─── Props ─── */

interface StageProps {
  progress: number;
  phase: DossierPhaseId;
  localProgress: number;
}

/* ─── Helpers ─── */

function lerpState(a: PhaseSceneState, b: PhaseSceneState, t: number): PhaseSceneState {
  const l = THREE.MathUtils.lerp;
  return {
    cameraZ: l(a.cameraZ, b.cameraZ, t),
    cameraY: l(a.cameraY, b.cameraY, t),
    sceneTiltMultiplier: l(a.sceneTiltMultiplier, b.sceneTiltMultiplier, t),
    orbGlow: l(a.orbGlow, b.orbGlow, t),
  };
}

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

/* ─── Scene content (lives inside Canvas) ─── */

function SceneContent({ progress, phase, localProgress }: StageProps) {
  const { pointerLerpX, pointerLerpY } = useExperience();
  const { camera } = useThree();
  const { scene: glbScene, nodes, loaded } = useGLBScene();

  // Scene root ref for tilt
  const sceneRootRef = useRef<THREE.Group>(null);
  const currentState = useRef<PhaseSceneState>({ ...PHASE_SCENE.closed });
  const grainRef = useRef<THREE.ShaderMaterial>(null);

  // Store original positions of nodes for shift animation
  const originalPositions = useRef<Map<string, THREE.Vector3>>(new Map());

  useEffect(() => {
    if (!loaded || !glbScene) return;
    // Capture original positions
    Object.entries(nodes).forEach(([key, node]) => {
      if (node) {
        originalPositions.current.set(key, node.position.clone());
      }
    });
  }, [loaded, glbScene, nodes]);

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

    // 1. Target phase state
    const phaseKeys = Object.keys(PHASE_SCENE) as DossierPhaseId[];
    const phaseIdx = phaseKeys.indexOf(phase);
    const nextIdx = Math.min(phaseIdx + 1, phaseKeys.length - 1);
    const target = lerpState(PHASE_SCENE[phase], PHASE_SCENE[phaseKeys[nextIdx]], localProgress);

    // 2. Smooth lerp
    const s = currentState.current;
    const lerpAmt = 1 - Math.pow(1 - SCENE_LERP, delta * 60);
    s.cameraZ = THREE.MathUtils.lerp(s.cameraZ, target.cameraZ, lerpAmt);
    s.cameraY = THREE.MathUtils.lerp(s.cameraY, target.cameraY, lerpAmt);
    s.sceneTiltMultiplier = THREE.MathUtils.lerp(s.sceneTiltMultiplier, target.sceneTiltMultiplier, lerpAmt);
    s.orbGlow = THREE.MathUtils.lerp(s.orbGlow, target.orbGlow, lerpAmt);

    // 3. Camera position with pointer parallax
    const px = (pointerLerpX - 0.5) * POINTER_RANGES.cameraPointerX;
    const py = (pointerLerpY - 0.5) * -POINTER_RANGES.cameraPointerY;
    (camera as THREE.PerspectiveCamera).position.set(
      px,
      s.cameraY + py,
      s.cameraZ,
    );
    camera.lookAt(0, 0.8, 0);

    // 4. Scene root tilt from pointer
    if (sceneRootRef.current) {
      const tiltMul = s.sceneTiltMultiplier;
      sceneRootRef.current.rotation.y = (pointerLerpX - 0.5) * POINTER_RANGES.sceneTiltY * tiltMul;
      sceneRootRef.current.rotation.x = (pointerLerpY - 0.5) * -POINTER_RANGES.sceneTiltX * tiltMul;
    }

    // 5. Per-node secondary motion
    const elapsed = state.clock.elapsedTime;
    Object.entries(nodes).forEach(([key, node]) => {
      if (!node) return;
      const behaviour = NODE_BEHAVIOUR[key as SemanticNodeKey];
      if (!behaviour) return;

      const orig = originalPositions.current.get(key);
      if (!orig) return;

      let yOffset = 0;
      let xShift = 0;
      let zShift = 0;

      // Float animation (orb)
      if (behaviour.float) {
        yOffset = Math.sin(elapsed * behaviour.float.speed * Math.PI * 2) * behaviour.float.amp;
      }

      // Pointer-driven shift (tickets, rails)
      if (behaviour.pointerShift) {
        xShift = (pointerLerpX - 0.5) * behaviour.pointerShift.x;
        zShift = (pointerLerpY - 0.5) * behaviour.pointerShift.y;
      }

      // Artifact tilt
      if (behaviour.pointerTilt) {
        node.rotation.y = (pointerLerpX - 0.5) * POINTER_RANGES.artifactTiltY;
        node.rotation.x = (pointerLerpY - 0.5) * -POINTER_RANGES.artifactTiltX;
      }

      node.position.set(
        orig.x + xShift,
        orig.y + yOffset,
        orig.z + zShift,
      );
    });

    // 6. Grain
    if (grainRef.current) {
      grainRef.current.uniforms.uTime.value = elapsed;
    }
  });

  return (
    <>
      {/* Lighting — authored at runtime, not from GLB */}
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

      {/* GLB scene */}
      <group ref={sceneRootRef}>
        {loaded && glbScene && <primitive object={glbScene} />}
      </group>

      {/* Grain overlay — screen-space, closest to camera */}
      <mesh position={[0, 1, 3.5]} renderOrder={10}>
        <planeGeometry args={[14, 10]} />
        <primitive object={grainMat} ref={grainRef} attach="material" />
      </mesh>
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
