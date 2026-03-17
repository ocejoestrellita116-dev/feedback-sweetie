import type { DossierPhaseId } from './dossier-hero.types';
import { DOSSIER_PHASE_CONTENT } from './dossier-hero.content';
import { useExperience } from '@/components/experience/ExperienceProvider';

const PARALLAX_PX = 8;

interface Props {
  phase: DossierPhaseId;
  localProgress: number;
  progress: number;
}

export function SpatialLayer({ phase, localProgress, progress }: Props) {
  const c = DOSSIER_PHASE_CONTENT;
  const { pointerLerpX, pointerLerpY, isTouch, reducedMotion } = useExperience();

  // -1..1 range, zeroed on touch or reduced motion
  const noParallax = isTouch || reducedMotion;
  const px = noParallax ? 0 : (pointerLerpX - 0.5) * 2;
  const py = noParallax ? 0 : (pointerLerpY - 0.5) * 2;
  const tx = px * PARALLAX_PX;
  const ty = py * PARALLAX_PX;

  const showWhispers = phase === 'open' || (phase === 'flight' && localProgress < 0.3);
  const showLabels = phase === 'flight';

  return (
    <div
      className="absolute inset-0 pointer-events-none select-none z-[5]"
      style={{ transform: `translate(${tx}px, ${ty}px)` }}
    >
      {showWhispers && c.open.whispers.map((w, i) => (
        <span
          key={w}
          className="absolute text-xs font-sans text-dossier-whisper transition-opacity duration-200"
          style={{
            opacity: phase === 'open' ? Math.min(localProgress * 1.5, 0.5) : 0.3,
            top: `${35 + i * 30}%`,
            [i % 2 === 0 ? 'left' : 'right']: '5%',
            transitionDelay: `${i * 60}ms`,
          }}
        >
          {w}
        </span>
      ))}

      {showLabels && c.flight.spatialLabels.map((label, i) => (
        <span
          key={label}
          className="absolute text-[11px] tracking-[0.15em] uppercase font-sans text-dossier-whisper transition-opacity duration-200"
          style={{
            opacity: Math.min(localProgress * 1.5, 0.4),
            top: `${25 + i * 22}%`,
            right: '8%',
            transitionDelay: `${i * 60}ms`,
          }}
        >
          {label}
        </span>
      ))}
    </div>
  );
}
