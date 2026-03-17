

# Step 3: Integrate GLB as Main Spatial Layer

## Current State

The GLB integration from Steps 1-2 is already solid:
- `use-glb-loader.ts` loads the GLB, extracts named nodes, bakes world transforms, detaches them, and groups them into `heroArtifact`/`support`/`atmosphere`
- `HeroStageWebGL.tsx` renders these groups with runtime lighting, shadows, pointer tilt, and phase-driven motion
- `DossierHero.tsx` branches: WebGL path uses `HeroStageWebGL`, non-WebGL falls back to `BookSequenceCanvas` with ZIP frames

## What's Missing (per Step 3 spec)

### A. Graceful failure path (3.1.c)
`use-glb-loader.ts` currently sets `loaded = Object.keys(nodes).length > 0` but there's no validation of critical nodes. If `dossier` or `pedestalBase` are missing, the scene renders empty with no warning. Need to:
- Add a `console.warn` when critical nodes are absent
- Expose a `criticalMissing` flag so `DossierHero.tsx` can fall back to `BookSequenceCanvas` instead of showing an empty 3D scene

### B. Book sequence disposition (3.2) -- Mode B confirmed
Already implemented: `DossierHero.tsx` only loads ZIP when `!webglAvailable`. The frame loader hook skips fetching when URL is empty. No changes needed here.

### C. Reduce old fake-depth DOM layers (3.3)
`SpatialLayer.tsx` applies `PARALLAX_PX = 8` for pointer-driven translate on whisper/label text. With real 3D depth now handling spatial perception, this should be reduced to ~4px so the DOM layers act as atmosphere/glue rather than simulating depth. The grain overlay in the 3D scene (`uOpacity: 0.02`) is already subtle. No other fake-depth layers exist in the WebGL path (the radial gradients only render in the non-WebGL fallback branch).

## Files Changed

| File | Change |
|------|--------|
| `use-glb-loader.ts` | Add critical node validation (`dossier`, `pedestalBase`); log warnings; expose `criticalMissing` flag |
| `DossierHero.tsx` | Consume `criticalMissing` from a new callback/state to force fallback to `BookSequenceCanvas` when GLB nodes are absent |
| `SpatialLayer.tsx` | Reduce `PARALLAX_PX` from 8 to 4; reduce whisper max opacity from 0.5 to 0.35 |

Three small, focused edits. No structural changes needed -- the architecture from Steps 1-2 already satisfies the bulk of Step 3.

