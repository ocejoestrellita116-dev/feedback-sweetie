

# Step 2: Refactor Hero Runtime Around Scene Graph Groups

## What exists now
`HeroStageWebGL.tsx` renders the GLB as a single `<group>` containing the whole scene, with a flat `useFrame` loop that manually positions every node. All motion logic (camera, tilt, per-node float/shift) lives in one monolithic function with interleaved concerns. The scene has no structural grouping -- every node is addressed individually from a flat map.

## What changes

### A. Extend `hero-scene.config.ts` with group assignments and per-group phase motion

Add a `GROUP_ASSIGNMENT` map that assigns each semantic node to one of four groups:
- `heroArtifact` -- dossier, dossierCover, pedestalBase, pedestalMid, pedestalTop
- `support` -- orb, ticketA, ticketB, ticketC, railRight, railUpper
- `atmosphere` -- portal (and the grain mesh)
- ungrouped nodes stay on the scene root

Add a `PhaseGroupMotion` interface and `PHASE_GROUP_MOTION` record to define per-phase transforms for each group (Y offset, scale, rotation emphasis). This replaces the flat `PhaseSceneState` which only has camera + tilt multiplier. The new state shape:

```text
PhaseSceneState (extended):
  cameraZ, cameraY              -- camera rig
  sceneTiltMultiplier            -- sceneGroup pointer response
  heroArtifactY, heroArtifactScale -- heroArtifact group
  supportY, supportSpread        -- support group spread/lift
  atmosphereOpacity              -- atmosphere group
  orbGlow                        -- orb emissive intensity
```

### B. Restructure `SceneContent` JSX with explicit groups

Replace the single `<group ref={sceneRootRef}>` containing `<primitive object={glbScene}>` with a structured tree:

```text
<group>  (sceneGroup -- pointer tilt applied here)
  <group>  (heroArtifactGroup -- phase-driven Y/scale)
    {dossier, dossierCover, pedestal nodes as <primitive>}
  </group>
  <group>  (supportGroup -- phase-driven spread/Y)
    {orb, tickets, rails as <primitive>}
  </group>
  <group>  (atmosphereGroup -- opacity control)
    {portal, grain mesh}
  </group>
</group>
```

This means `use-glb-loader.ts` must **detach** extracted nodes from the GLB scene graph (remove from parent) so they can be re-parented into R3F groups. The hook will call `node.removeFromParent()` for each mapped node and return them individually rather than returning the whole `glbScene`.

### C. Split `useFrame` into focused motion functions

Extract from the monolithic `useFrame`:
1. `applyPhaseMotion(state, target, delta)` -- lerps `currentState` toward target, applies camera position, group transforms (heroArtifact Y/scale, support Y/spread)
2. `applyPointerMotion(sceneGroup, nodes, pointerX, pointerY, tiltMul)` -- scene root tilt + per-node pointer shift/tilt
3. `applySecondaryMotion(nodes, elapsed, originals)` -- orb float, idle animations

The `useFrame` callback becomes a 5-line orchestrator calling these three functions.

### D. Update `use-glb-loader.ts`

- After traversal, call `node.removeFromParent()` on each extracted node so R3F can re-parent them
- Return `nodes` record (no longer returning `scene` since nodes are detached)
- Add `loaded` flag based on whether any nodes were found

## Files changed

| File | Change |
|------|--------|
| `hero-scene.config.ts` | Add `GROUP_ASSIGNMENT`, extend `PhaseSceneState` with group motion fields, add values to `PHASE_SCENE` |
| `use-glb-loader.ts` | Detach nodes from GLB parent, drop `scene` from return |
| `HeroStageWebGL.tsx` | Restructure JSX into 3 nested groups, extract `applyPhaseMotion` / `applyPointerMotion` / `applySecondaryMotion`, simplify `useFrame` |

`DossierHero.tsx` and other files unchanged.

## Risks
- Detaching nodes from GLB scene graph may lose inherited transforms if parent nodes have non-identity transforms. Mitigation: apply `node.updateWorldMatrix(true, false)` and bake world transform before detach.
- If the GLB has no matching node names (draft asset), the scene will be empty but won't crash -- same as current behavior.

