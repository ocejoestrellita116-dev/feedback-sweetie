import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { DossierPhaseId } from './dossier-hero.types';
import { PHASE_SCENE, POINTER_PARALLAX, SCENE_LERP, type PhaseSceneState } from './hero-stage.config';
import { useExperience } from '../experience/ExperienceProvider';

/* ─────── Props ─────── */

interface StageProps {
  progress: number;
  phase: DossierPhaseId;
  localProgress: number;
  frames: HTMLImageElement[];
  loaded: boolean;
}

/* ─────── Helpers ─────── */

function getCSSColorHSL(token: string): THREE.Color {
  const el = document.documentElement;
  const raw = getComputedStyle(el).getPropertyValue(`--${token}`).trim();
  if (!raw) return new THREE.Color(0x000000);
  const [h, s, l] = raw.split(/\s+/).map(parseFloat);
  return new THREE.Color().setHSL(h / 360, s / 100, l / 100);
}

function lerpSceneState(a: PhaseSceneState, b: PhaseSceneState, t: number): PhaseSceneState {
  const l = THREE.MathUtils.lerp;
  return {
    cameraZ: l(a.cameraZ, b.cameraZ, t),
    bookScale: l(a.bookScale, b.bookScale, t),
    bookY: l(a.bookY, b.bookY, t),
    bookRotZ: l(a.bookRotZ, b.bookRotZ, t),
    atmosphereOpacity: l(a.atmosphereOpacity, b.atmosphereOpacity, t),
    grainOpacity: l(a.grainOpacity, b.grainOpacity, t),
  };
}

/* ─────── Atmosphere shader ─────── */

const atmosphereVertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const atmosphereFragmentShader = /* glsl */ `
uniform vec3 uWarmColor;
uniform vec3 uBgColor;
uniform float uOpacity;
varying vec2 vUv;
void main() {
  vec2 c = vUv - 0.5;
  float d = length(c * vec2(1.25, 1.43));  // ellipse 80% x 70%
  float t = smoothstep(0.0, 0.7, d);
  vec3 col = mix(uWarmColor, uBgColor, t);
  gl_FragColor = vec4(col, uOpacity * (1.0 - t * 0.3));
}
`;

/* ─────── Wash/vignette shader ─────── */

const washVertexShader = atmosphereVertexShader;

const washFragmentShader = /* glsl */ `
uniform vec3 uBgColor;
varying vec2 vUv;
void main() {
  vec2 c = vUv - 0.5;
  float d = length(c * vec2(1.47, 1.59));  // ellipse 68% x 63%
  float alpha = smoothstep(0.58, 0.92, d);
  gl_FragColor = vec4(uBgColor, alpha);
}
`;

/* ─────── Grain shader ─────── */

const grainVertexShader = atmosphereVertexShader;

const grainFragmentShader = /* glsl */ `
uniform float uTime;
uniform float uOpacity;
varying vec2 vUv;

float rand(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  float n = rand(vUv * 800.0 + uTime * 3.0);
  gl_FragColor = vec4(vec3(n), uOpacity);
}
`;

/* ─────── Scene internals ─────── */

function SceneContent({ progress, phase, localProgress, frames, loaded }: StageProps) {
  const { pointerLerpX, pointerLerpY } = useExperience();
  const { camera } = useThree();

  // Refs for smooth lerp
  const currentScene = useRef<PhaseSceneState>({ ...PHASE_SCENE.closed });
  const bookMeshRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.ShaderMaterial>(null);
  const washRef = useRef<THREE.ShaderMaterial>(null);
  const grainRef = useRef<THREE.ShaderMaterial>(null);

  // Offscreen canvas + texture for book frames
  const { offCanvas, texture } = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 1;
    c.height = 1;
    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    return { offCanvas: c, texture: tex };
  }, []);

  const drawnFrame = useRef(-1);

  // Read CSS colors once on mount and on theme change
  const colors = useRef({ warm: new THREE.Color(), bg: new THREE.Color() });
  useEffect(() => {
    const update = () => {
      colors.current.warm = getCSSColorHSL('dossier-warm');
      colors.current.bg = getCSSColorHSL('background');
    };
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  // Book plane aspect ratio (set once frames load)
  const bookAspect = useRef(1.0);
  useEffect(() => {
    if (loaded && frames.length > 0) {
      const img = frames[0];
      bookAspect.current = img.naturalWidth / img.naturalHeight;
    }
  }, [loaded, frames]);

  useFrame((_state, delta) => {
    if (!loaded || frames.length === 0) return;

    // 1. Target scene state from phase + localProgress
    const phaseKeys = Object.keys(PHASE_SCENE) as DossierPhaseId[];
    const phaseIdx = phaseKeys.indexOf(phase);
    const nextIdx = Math.min(phaseIdx + 1, phaseKeys.length - 1);
    const target = lerpSceneState(
      PHASE_SCENE[phase],
      PHASE_SCENE[phaseKeys[nextIdx]],
      localProgress
    );

    // 2. Smooth lerp current toward target
    const s = currentScene.current;
    const lerpAmt = 1 - Math.pow(1 - SCENE_LERP, delta * 60);
    s.cameraZ = THREE.MathUtils.lerp(s.cameraZ, target.cameraZ, lerpAmt);
    s.bookScale = THREE.MathUtils.lerp(s.bookScale, target.bookScale, lerpAmt);
    s.bookY = THREE.MathUtils.lerp(s.bookY, target.bookY, lerpAmt);
    s.bookRotZ = THREE.MathUtils.lerp(s.bookRotZ, target.bookRotZ, lerpAmt);
    s.atmosphereOpacity = THREE.MathUtils.lerp(s.atmosphereOpacity, target.atmosphereOpacity, lerpAmt);
    s.grainOpacity = THREE.MathUtils.lerp(s.grainOpacity, target.grainOpacity, lerpAmt);

    // 3. Camera — position + pointer parallax
    const px = (pointerLerpX - 0.5) * POINTER_PARALLAX;
    const py = (pointerLerpY - 0.5) * -POINTER_PARALLAX;
    (camera as THREE.PerspectiveCamera).position.set(px, py, s.cameraZ);
    camera.lookAt(0, 0, 0);

    // 4. Book frame texture update
    const totalFrames = frames.length;
    const frameIdx = Math.min(Math.floor(progress * (totalFrames - 1)), totalFrames - 1);
    if (frameIdx !== drawnFrame.current) {
      const img = frames[frameIdx];
      if (img) {
        if (offCanvas.width !== img.naturalWidth || offCanvas.height !== img.naturalHeight) {
          offCanvas.width = img.naturalWidth;
          offCanvas.height = img.naturalHeight;
          bookAspect.current = img.naturalWidth / img.naturalHeight;
        }
        const ctx = offCanvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, offCanvas.width, offCanvas.height);
          ctx.drawImage(img, 0, 0);
          texture.needsUpdate = true;
        }
        drawnFrame.current = frameIdx;
      }
    }

    // 5. Book mesh transform
    const book = bookMeshRef.current;
    if (book) {
      const sc = s.bookScale;
      book.scale.set(sc * bookAspect.current * 3, sc * 3, 1);
      book.position.y = s.bookY;
      book.rotation.z = s.bookRotZ;
    }

    // 6. Shader uniforms
    if (atmosphereRef.current) {
      atmosphereRef.current.uniforms.uWarmColor.value.copy(colors.current.warm);
      atmosphereRef.current.uniforms.uBgColor.value.copy(colors.current.bg);
      atmosphereRef.current.uniforms.uOpacity.value = s.atmosphereOpacity;
    }
    if (washRef.current) {
      washRef.current.uniforms.uBgColor.value.copy(colors.current.bg);
    }
    if (grainRef.current) {
      grainRef.current.uniforms.uTime.value = _state.clock.elapsedTime;
      grainRef.current.uniforms.uOpacity.value = s.grainOpacity;
    }
  });

  // Shader materials (memoised)
  const atmosphereMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: atmosphereVertexShader,
    fragmentShader: atmosphereFragmentShader,
    uniforms: {
      uWarmColor: { value: new THREE.Color() },
      uBgColor: { value: new THREE.Color() },
      uOpacity: { value: 0.6 },
    },
    transparent: true,
    depthWrite: false,
  }), []);

  const washMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: washVertexShader,
    fragmentShader: washFragmentShader,
    uniforms: {
      uBgColor: { value: new THREE.Color() },
    },
    transparent: true,
    depthWrite: false,
  }), []);

  const grainMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: grainVertexShader,
    fragmentShader: grainFragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0.025 },
    },
    transparent: true,
    depthWrite: false,
  }), []);

  // Dispose WebGL resources on unmount
  useEffect(() => {
    return () => {
      atmosphereMat.dispose();
      washMat.dispose();
      grainMat.dispose();
      texture.dispose();
      offCanvas.width = 0;
      offCanvas.height = 0;
    };
  }, [atmosphereMat, washMat, grainMat, texture, offCanvas]);

  return (
    <>
      {/* Atmosphere plane — behind book */}
      <mesh position={[0, 0, -2]} renderOrder={0}>
        <planeGeometry args={[14, 10]} />
        <primitive object={atmosphereMat} ref={atmosphereRef} attach="material" />
      </mesh>

      {/* Book plane */}
      <mesh ref={bookMeshRef} position={[0, 0, 0]} renderOrder={1}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={texture} transparent toneMapped={false} />
      </mesh>

      {/* Wash/vignette plane — in front of book */}
      <mesh position={[0, 0, 1]} renderOrder={2}>
        <planeGeometry args={[14, 10]} />
        <primitive object={washMat} ref={washRef} attach="material" />
      </mesh>

      {/* Grain overlay — closest to camera */}
      <mesh position={[0, 0, 2]} renderOrder={3}>
        <planeGeometry args={[14, 10]} />
        <primitive object={grainMat} ref={grainRef} attach="material" />
      </mesh>
    </>
  );
}

/* ─────── Exported Canvas wrapper ─────── */

export function HeroStageWebGL(props: StageProps) {
  return (
    <div className="absolute inset-0">
      <Canvas
        gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
        camera={{ fov: 50, near: 0.1, far: 20, position: [0, 0, 5] }}
        style={{ position: 'absolute', inset: 0 }}
        dpr={[1, 1.5]}
        frameloop="always"
      >
        <SceneContent {...props} />
      </Canvas>
    </div>
  );
}
