

# Dossier Hero Scene Rebuild

## Current State
- Hero uses a ZIP of WebP frames rendered to a canvas texture on a flat plane in a raw Three.js scene (`HeroStageWebGL.tsx`)
- Scroll-driven progress system (`useDossierProgress`) drives 5 phases: closed, open, flight, close, handoff
- DOM overlay (`HeroOverlay`, `SpatialLayer`) renders text/CTAs on top
- R3F (`@react-three/fiber@^8.18`, `@react-three/drei@^9.122`) and `three@0.170` already installed
- Pointer parallax via `ExperienceProvider` (lerped 0-1 values)

## What Changes

### 1. Copy GLB asset and create scene config
- Copy `support_hero_session3_draft.glb` to `public/hero/support-hero.glb`
- Create `src/components/dossier-hero/hero-scene.config.ts` with:
  - GLB path, camera defaults, pointer parallax ranges
  - Node name lookup map (DossierCore, DossierCover, SupportOrb, PedestalBase, etc. from projection report mapped to semantic names: dossier, pedestal, orb, ticketA/B/C, portal, rails, floor)
  - Per-node flags: castShadow, receiveShadow, pointerTilt, float animation
  - Desktop tilt/parallax values: sceneTiltY=0.096, sceneTiltX=0.042, artifactTiltY=0.05, artifactTiltX=0.028
  - Orb float: amp=0.06, speed=0.35; ticket shift: 0.04-0.08; rail shift: 0.02-0.04
  - Phase-to-camera/scene-state mapping (replacing current `hero-stage.config.ts`)

### 2. Create GLB loader hook
- New `src/components/dossier-hero/use-glb-loader.ts`
- Uses drei's `useGLTF` (or raw `GLTFLoader` since we're in a Canvas) to load the GLB
- Extracts named nodes from the scene graph using the config lookup map
- Returns `{ scene, nodes, loaded, progress }` where nodes is a typed record
- Reports load progress for the preloader (replacing the ZIP frame loader's progress)

### 3. Rewrite HeroStageWebGL to render GLB scene
- Replace the flat-plane + frame-texture approach with the loaded GLB scene
- **Lighting**: Author runtime lights (not from GLB) -- key directional, fill, ambient matching the warm cream reference renders
- **Shadows**: Soft shadows on pedestal/floor from directional light
- **Pointer interaction**: Apply tilt to scene root and individual artifact nodes based on `pointerLerpX/Y` from ExperienceProvider, using the config ranges
- **Phase transitions**: Lerp camera position, scene tilt, and per-node transforms based on scroll phase + localProgress (same lerp pattern as current `PHASE_SCENE` but with richer per-node motion)
- **Secondary motion**: Orb float (sin-based Y oscillation), ticket slab subtle drift, rail parallax offset
- Keep atmosphere/wash/grain shader planes for visual continuity (or replace with post-processing if cleaner)

### 4. Update DossierHero to use GLB loader
- Replace `useFrameLoader(ZIP_URL)` with the new GLB loader hook
- Pass `loaded` / `progress` to `EnterScreen` for preloader
- Keep ZIP sequence as fallback path when `!webglAvailable` (the existing `BookSequenceCanvas` branch)
- Pass GLB nodes/scene to `HeroStageWebGL` instead of frames array

### 5. Keep DOM overlay intact
- `HeroOverlay` and `SpatialLayer` remain as-is -- they sit above the canvas via z-index
- Pointer parallax on overlays continues to work from ExperienceProvider

## Files Modified
| File | Action |
|------|--------|
| `public/hero/support-hero.glb` | New -- copied from upload |
| `src/components/dossier-hero/hero-scene.config.ts` | New -- scene config, node map, motion constants |
| `src/components/dossier-hero/use-glb-loader.ts` | New -- GLB loading hook |
| `src/components/dossier-hero/HeroStageWebGL.tsx` | Rewrite -- GLB scene rendering with lights, shadows, pointer tilt |
| `src/components/dossier-hero/DossierHero.tsx` | Edit -- swap frame loader for GLB loader |
| `src/components/dossier-hero/dossier-hero.types.ts` | Edit -- add GLB node types |
| `src/components/dossier-hero/hero-stage.config.ts` | Remove or merge into new config |

## Risks and Notes
- The GLB is a draft; node names must be verified at load time. The config map approach lets us remap without touching scene code.
- Frame sequence ZIP stays as non-WebGL fallback -- no regression for low-end devices.
- drei's `useGLTF` requires being inside an R3F `Canvas`. Since `HeroStageWebGL` already wraps a `Canvas`, the hook goes inside `SceneContent`.
- Performance: GLB scene with shadows is heavier than a texture flip. Will use `dpr={[1, 1.5]}`, `shadowMap` size capped at 1024, and `frameloop="demand"` where possible.

