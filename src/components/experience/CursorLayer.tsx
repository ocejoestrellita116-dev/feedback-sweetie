import { useRef, useEffect } from 'react';
import { useExperience } from './ExperienceProvider';

const SIZE = { default: 24, hero: 36, hover: 48, drag: 32, hidden: 0 };
const GLOW_SIZE = 56;
const DOT_SIZE = 4;

export function CursorLayer() {
  const {
    pointerLerpX, pointerLerpY,
    cursorMode, isTouch, reducedMotion,
    heroActive, menuOpen,
  } = useExperience();

  const viewport = useRef({ w: typeof window !== 'undefined' ? window.innerWidth : 1, h: typeof window !== 'undefined' ? window.innerHeight : 1 });

  useEffect(() => {
    const update = () => {
      viewport.current.w = window.innerWidth;
      viewport.current.h = window.innerHeight;
    };
    window.addEventListener('resize', update, { passive: true });
    return () => window.removeEventListener('resize', update);
  }, []);

  // Set data attribute for system cursor hiding
  useEffect(() => {
    if (isTouch || reducedMotion) return;
    document.documentElement.dataset.cursorVisible = 'true';
    return () => { delete document.documentElement.dataset.cursorVisible; };
  }, [isTouch, reducedMotion]);

  if (isTouch || reducedMotion) return null;

  // Derive ring size: hero base when heroActive + default mode
  const ringSize = cursorMode === 'hidden' ? 0
    : cursorMode === 'hover' ? SIZE.hover
    : cursorMode === 'drag' ? SIZE.drag
    : heroActive ? SIZE.hero
    : SIZE.default;

  const x = pointerLerpX * viewport.current.w;
  const y = pointerLerpY * viewport.current.h;
  const isHidden = cursorMode === 'hidden';

  // Colors
  const ringBorder = heroActive
    ? 'hsl(var(--dossier-gold) / 0.5)'
    : menuOpen
      ? 'hsl(var(--background) / 0.7)'
      : 'hsl(var(--foreground) / 0.5)';

  const dotColor = heroActive
    ? 'hsl(var(--dossier-gold))'
    : 'hsl(var(--foreground) / 0.7)';

  const borderWidth = cursorMode === 'hover' ? 2 : 1;

  const transition = 'width 260ms cubic-bezier(.16,1,.3,1), height 260ms cubic-bezier(.16,1,.3,1), border 260ms ease, opacity 260ms ease';

  return (
    <div
      className="fixed top-0 left-0 z-[9999] pointer-events-none"
      style={{
        transform: `translate(${x}px, ${y}px)`,
        willChange: 'transform',
      }}
    >
      {/* Soft glow halo — hero only */}
      <div
        style={{
          position: 'absolute',
          width: GLOW_SIZE,
          height: GLOW_SIZE,
          top: -GLOW_SIZE / 2,
          left: -GLOW_SIZE / 2,
          borderRadius: '50%',
          background: 'radial-gradient(circle, hsl(var(--dossier-gold) / 0.25) 0%, transparent 70%)',
          opacity: heroActive && !isHidden ? 0.15 : 0,
          transition: 'opacity 300ms ease',
        }}
      />

      {/* Outer ring */}
      <div
        style={{
          position: 'absolute',
          width: ringSize,
          height: ringSize,
          top: -ringSize / 2,
          left: -ringSize / 2,
          borderRadius: '50%',
          border: `${borderWidth}px solid ${ringBorder}`,
          mixBlendMode: heroActive ? undefined : 'difference',
          transition,
          transform: `scale(${isHidden ? 0 : 1})`,
        }}
      />

      {/* Center dot */}
      <div
        style={{
          position: 'absolute',
          width: DOT_SIZE,
          height: DOT_SIZE,
          top: -DOT_SIZE / 2,
          left: -DOT_SIZE / 2,
          borderRadius: '50%',
          backgroundColor: dotColor,
          opacity: isHidden ? 0 : 1,
          transition: 'background-color 260ms ease, opacity 260ms ease',
        }}
      />
    </div>
  );
}
