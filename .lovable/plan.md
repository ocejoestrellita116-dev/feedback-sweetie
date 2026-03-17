

# Step 4: Rebuild Pointer Motion as Volumetric Response

## Analysis

The current implementation already has the right structure from Steps 1-3. Reviewing what exists vs what Step 4 requires:

**Already done correctly:**
- `applyPointerMotion` applies `sceneTiltY`/`sceneTiltX` to `sceneRef` (4.1.b/c) -- already scene-driven, not camera-driven
- `applyPointerMotion` applies per-node `pointerShift` for tickets and rails (4.3.b/c)
- `applyPointerMotion` applies `pointerTilt` for dossier/orb (4.2.a/b)
- `applySecondaryMotion` applies sin-based float for orb (4.3.a)
- Camera pointer contribution uses config values `cameraPointerX`/`cameraPointerY` (4.4.a)

**What needs changing:**
1. **Camera drift is too strong** (4.4): `cameraPointerX: 0.08` and `cameraPointerY: 0.05` make the camera the dominant motion actor. Need to reduce these significantly (e.g., 0.02/0.015) so the scene tilt feels primary.
2. **No heroArtifact group tilt** (4.2): `applyPointerMotion` tilts individual nodes with `pointerTilt` flag but does NOT tilt the `heroArtifactGroup` as a whole. The spec wants additive group-level tilt on top of scene tilt.
3. **No pointer lag on orb** (4.3.a): Orb has float but no pointer-following lag/drift separate from its group.
4. **Portal/floor static guarantee** (4.3.d): Portal has `receiveShadow` but no shift -- already correct, just needs to stay that way.

## Changes

### A. `hero-scene.config.ts` -- reduce camera pointer ranges
- `cameraPointerX`: 0.08 → 0.02
- `cameraPointerY`: 0.05 → 0.015

### B. `HeroStageWebGL.tsx` -- add heroArtifact group tilt + orb pointer lag

In `applyPhaseMotion`: add `heroArtifactRef` rotation based on pointer values:
```
heroArtifactRef.rotation.y = (pointerLerpX - 0.5) * POINTER_RANGES.artifactTiltY
heroArtifactRef.rotation.x = (pointerLerpY - 0.5) * -POINTER_RANGES.artifactTiltX
```

This is additive to the scene-level tilt (since heroArtifact is a child of sceneGroup), giving the dossier/pedestal a stronger parallax response than the rest of the scene.

In `applySecondaryMotion`: add orb pointer lag -- a delayed position offset that follows pointer with extra damping. Use a separate lerped value stored in a ref, updated each frame toward the current pointer position at a slower rate than the main lerp.

### C. Remove individual `pointerTilt` from dossier/orb nodes
Since the heroArtifact group now tilts as a whole, the per-node `pointerTilt` on `dossier` and `dossierCover` becomes redundant (double-tilting). Remove `pointerTilt: true` from those nodes in `NODE_BEHAVIOUR`. Keep it on `orb` only if we want extra emphasis beyond the group tilt, but the orb is in the support group so its tilt is independent -- keep it.

## Files changed

| File | Change |
|------|--------|
| `hero-scene.config.ts` | Reduce `cameraPointerX` to 0.02, `cameraPointerY` to 0.015; remove `pointerTilt` from dossier/dossierCover |
| `HeroStageWebGL.tsx` | Add heroArtifact group rotation in `applyPhaseMotion`; add orb pointer-lag ref + apply in `applySecondaryMotion` |

Two files, surgical edits. The volumetric feel comes from: weak camera drift + strong scene tilt + additive artifact group tilt + per-node micro shifts at varying intensities.

