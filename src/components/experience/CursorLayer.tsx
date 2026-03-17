import { useRef, useEffect } from 'react';
import { useExperience } from './ExperienceProvider';

const SIZE = { default: 24, hover: 48, drag: 32, hidden: 0 };

export function CursorLayer() {
  const {
    pointerLerpX, pointerLerpY,
    cursorMode, isTouch, reducedMotion,
    heroActive, menuOpen,
  } = useExperience();

  // Cache viewport dimensions to avoid reading window on every render
  const viewport = useRef({ w: typeof window !== 'undefined' ? window.innerWidth : 1, h: typeof window !== 'undefined' ? window.innerHeight : 1 });
  useEffect(() => {
    const update = () => {
      viewport.current.w = window.innerWidth;
      viewport.current.h = window.innerHeight;
    };
    window.addEventListener('resize', update, { passive: true });
    return () => window.removeEventListener('resize', update);
  }, []);

  if (isTouch || reducedMotion) return null;

  const s = SIZE[cursorMode];
  const x = pointerLerpX * viewport.current.w;
  const y = pointerLerpY * viewport.current.h;

  // Gold tint when hero is active, subtle
  const borderColor = heroActive
    ? 'hsl(var(--accent) / 0.4)'
    : menuOpen
      ? 'hsl(var(--background) / 0.7)'
      : 'hsl(var(--foreground) / 0.5)';

  const borderWidth = cursorMode === 'hover' ? 2 : 1;

  return (
    <div
      className="fixed top-0 left-0 z-[9999] pointer-events-none"
      style={{
        width: s,
        height: s,
        borderRadius: '50%',
        border: `${borderWidth}px solid ${borderColor}`,
        mixBlendMode: 'difference',
        transform: `translate(${x - s / 2}px, ${y - s / 2}px) scale(${cursorMode === 'hidden' ? 0 : 1})`,
        transition: 'width 260ms cubic-bezier(.16,1,.3,1), height 260ms cubic-bezier(.16,1,.3,1), border 260ms ease, opacity 260ms ease',
        willChange: 'transform',
        opacity: heroActive ? 0.8 : 1,
      }}
    />
  );
}
