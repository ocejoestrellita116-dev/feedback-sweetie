import { useRef, useEffect, useState } from 'react';
import { SCROLL_RUNWAY_VH } from './dossier-hero.config';
import { useDossierProgress } from './use-dossier-progress';
import { useFrameLoader } from './use-frame-loader';
import { HeroStageWebGL } from './HeroStageWebGL';
import { BookSequenceCanvas } from './BookSequenceCanvas';
import { HeroOverlay } from './HeroOverlay';
import { SpatialLayer } from './SpatialLayer';
import { ScrollProgressBar } from './ScrollProgressBar';
import { EnterScreen } from '../experience/EnterScreen';
import { useExperience } from '../experience/ExperienceProvider';

const ZIP_URL = '/frames/dossier-sequence.zip';

export function DossierHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { progress, phase, localProgress } = useDossierProgress(containerRef);
  const { webglAvailable, setHeroActive } = useExperience();

  // GLB loads inside R3F Canvas via useGLTF — we track readiness via a simple flag
  // For preloader, we use a quick heuristic: GLB is small, show enter after short delay
  const [glbReady, setGlbReady] = useState(false);
  useEffect(() => {
    if (webglAvailable) {
      // GLB preloaded by use-glb-loader.ts; give it a moment
      const t = setTimeout(() => setGlbReady(true), 600);
      return () => clearTimeout(t);
    }
  }, [webglAvailable]);

  // Fallback: ZIP frame loader for non-WebGL path
  const { frames, loaded: framesLoaded, progress: frameLoadProgress } = useFrameLoader(
    webglAvailable ? '' : ZIP_URL
  );

  const loaded = webglAvailable ? glbReady : framesLoaded;
  const loadProgress = webglAvailable ? (glbReady ? 1 : 0.5) : frameLoadProgress;

  useEffect(() => {
    setHeroActive(progress > 0 && phase !== 'handoff');
  }, [progress, phase, setHeroActive]);

  return (
    <>
      <EnterScreen loadProgress={loadProgress} loaded={loaded} />
      <ScrollProgressBar progress={progress} />
      <div
        ref={containerRef}
        className="relative"
        style={{ height: `${SCROLL_RUNWAY_VH}vh` }}
      >
        {/* Sticky viewport — pinned while scrolling through runway */}
        <div className="sticky top-0 h-screen w-full overflow-hidden" style={{ background: 'hsl(var(--background))' }}>

          {webglAvailable ? (
            <HeroStageWebGL
              progress={progress}
              phase={phase}
              localProgress={localProgress}
            />
          ) : (
            <>
              <div
                className="absolute inset-0"
                style={{
                  background: 'radial-gradient(ellipse 80% 70% at 50% 45%, hsl(var(--dossier-warm)), hsl(var(--background)))',
                }}
              />
              <BookSequenceCanvas progress={progress} phase={phase} frames={frames} loaded={framesLoaded} />
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse 68% 63% at 50% 50%, transparent 58%, hsl(var(--background)) 92%)',
                }}
              />
            </>
          )}

          <SpatialLayer phase={phase} localProgress={localProgress} progress={progress} />
          <HeroOverlay phase={phase} localProgress={localProgress} progress={progress} />
        </div>
      </div>

      {/* Bridge gradient — soft dissolve from hero into first section */}
      <div
        className="relative -mt-px pointer-events-none"
        style={{
          height: '20vh',
          background: 'linear-gradient(to bottom, hsl(var(--background)) 0%, transparent 100%)',
        }}
      />
    </>
  );
}
