import { useCallback, useEffect, useRef, useState } from 'react';
import type { CursorMode, ExperienceContextValue, ExperienceState } from './experience.types';
import { useSmoothScroll } from '@/hooks/use-smooth-scroll';

/* ── Capability detection (runs once) ── */

function detectWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    const ok = !!gl;
    if (gl && 'getExtension' in gl) {
      (gl as WebGLRenderingContext).getExtension('WEBGL_lose_context')?.loseContext();
    }
    c.width = 0;
    c.height = 0;
    return ok;
  } catch {
    return false;
  }
}

function detectTouch(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

function detectReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* ── Hook ── */

const LERP_FACTOR = 0.08;
const POINTER_THRESHOLD = 0.0005;

const initialState: ExperienceState = {
  entered: false,
  menuOpen: false,
  cursorMode: 'default',
  pointerX: 0.5,
  pointerY: 0.5,
  pointerLerpX: 0.5,
  pointerLerpY: 0.5,
  isTouch: false,
  reducedMotion: false,
  webglAvailable: false,
  heroActive: false,
};

export function useExperienceRuntime(): ExperienceContextValue {
  const [state, setState] = useState<ExperienceState>(initialState);

  const rawPtr = useRef({ x: 0.5, y: 0.5 });
  const lerpPtr = useRef({ x: 0.5, y: 0.5 });
  const rafId = useRef<number>(0);
  const reducedRef = useRef(false);
  const capsDetected = useRef(false);

  // Smooth scroll — always called, enabled flag controls behavior
  const smoothEnabled = !state.isTouch && !state.reducedMotion;
  const { tick: lenisTick, scrollTo } = useSmoothScroll(smoothEnabled);

  /* ── Capability detection (once) ── */
  useEffect(() => {
    if (capsDetected.current) return;
    capsDetected.current = true;

    const isTouch = detectTouch();
    const reducedMotion = detectReducedMotion();
    const webglAvailable = detectWebGL();
    reducedRef.current = reducedMotion;

    setState((s) => ({ ...s, isTouch, reducedMotion, webglAvailable }));

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e: MediaQueryListEvent) => {
      reducedRef.current = e.matches;
      setState((s) => ({ ...s, reducedMotion: e.matches }));
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  /* ── Pointer tracking (raw values) ── */
  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      rawPtr.current.x = e.clientX / window.innerWidth;
      rawPtr.current.y = e.clientY / window.innerHeight;
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', onPointerMove);
  }, []);

  /* ── Unified rAF tick ── */
  useEffect(() => {
    let prevLX = lerpPtr.current.x;
    let prevLY = lerpPtr.current.y;

    const tick = (time: number) => {
      // 1. Drive Lenis smooth scroll
      lenisTick(time);

      // 2. Pointer lerp
      if (!reducedRef.current) {
        lerpPtr.current.x += (rawPtr.current.x - lerpPtr.current.x) * LERP_FACTOR;
        lerpPtr.current.y += (rawPtr.current.y - lerpPtr.current.y) * LERP_FACTOR;
      } else {
        lerpPtr.current.x = rawPtr.current.x;
        lerpPtr.current.y = rawPtr.current.y;
      }

      // 3. Only setState when lerp values change meaningfully
      const dx = Math.abs(lerpPtr.current.x - prevLX);
      const dy = Math.abs(lerpPtr.current.y - prevLY);
      if (dx > POINTER_THRESHOLD || dy > POINTER_THRESHOLD) {
        prevLX = lerpPtr.current.x;
        prevLY = lerpPtr.current.y;
        const lx = lerpPtr.current.x;
        const ly = lerpPtr.current.y;
        const rx = rawPtr.current.x;
        const ry = rawPtr.current.y;
        setState((s) => ({
          ...s,
          pointerX: rx,
          pointerY: ry,
          pointerLerpX: lx,
          pointerLerpY: ly,
        }));
      }

      rafId.current = requestAnimationFrame(tick);
    };

    rafId.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId.current);
  }, [lenisTick]);

  /* ── Actions ── */
  const setEntered = useCallback((v: boolean) => setState((s) => ({ ...s, entered: v })), []);
  const setMenuOpen = useCallback((v: boolean) => setState((s) => ({ ...s, menuOpen: v })), []);
  const setCursorMode = useCallback((v: CursorMode) => setState((s) => ({ ...s, cursorMode: v })), []);
  const setHeroActive = useCallback((v: boolean) => setState((s) => ({ ...s, heroActive: v })), []);

  return {
    ...state,
    setEntered,
    setMenuOpen,
    setCursorMode,
    setHeroActive,
    scrollTo,
  };
}
