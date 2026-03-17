

# Step 10: QA, Acceptance and Rollout

This step is about **writing automated tests** that encode the visual, technical, and breakpoint QA checklists as verifiable assertions. No visual design changes.

## What to build

### A. Visual QA test — `src/test/hero-visual-qa.test.tsx`

Component-level render tests using `@testing-library/react` that verify the structural contracts:

1. **Dossier dominates first frame** — `HeroOverlay` renders closed-state headline (h1) with opacity 1 when `phase='closed'` and `entered=true`
2. **Cursor visible on cream** — `CursorLayer` renders three elements (ring, dot, glow) when `heroActive=true`, `isTouch=false`, `reducedMotion=false`; ring border contains `--dossier-gold`
3. **Scene depth structure** — `HeroStageWebGL` not directly testable in jsdom, but we verify `DossierHero` renders the WebGL path (`HeroStageWebGL`) when `webglAvailable=true` and fallback (`BookSequenceCanvas`) when false
4. **Overlay readable** — closed-state text has `textShadow` style; no `backdrop-filter` or `backdrop-blur` classes present in overlay
5. **Orb not brightest** — verify `NODE_BEHAVIOUR.orb` config has no `emissive` override and `orbGlow` in `PHASE_SCENE.closed` is ≤ 0.5

### B. Technical QA test — `src/test/hero-technical-qa.test.ts`

Unit tests on the config and loader logic:

1. **GLB config integrity** — all `NODE_MAP` keys have `GROUP_ASSIGNMENT` entries; `CRITICAL_NODES` are subset of semantic keys
2. **No broken refs for optional nodes** — `useGLBScene` sets `loaded=true` even when non-critical nodes missing; `criticalMissing=true` only for critical ones
3. **Grain material disposal** — verify `grainMat.dispose()` is called (structural: the `useEffect` cleanup exists)
4. **Memory: Canvas unmount** — R3F `<Canvas>` handles GL context disposal; verify `HeroStageWebGL` doesn't hold refs outside Canvas scope

### C. Breakpoint / capability QA test — `src/test/hero-breakpoint-qa.test.ts`

Tests on the capability-gating logic:

1. **Touch → no pointer tilt** — in `useFrame`, when `isTouch=true`, pointer values are `0.5, 0.5` and `applyPointerMotion` is skipped
2. **Reduced motion → no secondary** — `applySecondaryMotion` skipped when `reducedMotion=true`
3. **Cursor hidden on touch** — `CursorLayer` returns `null` for `isTouch=true`
4. **WebGL fallback** — `DossierHero` renders `BookSequenceCanvas` when `webglAvailable=false`
5. **Mobile typography** — headline has responsive classes `text-4xl sm:text-6xl md:text-8xl`
6. **Safe area** — root container has `pb-[env(safe-area-inset-bottom)]`

### D. Acceptance criteria verification — comments in test file

Each test maps to an acceptance criterion:
1. ✓ Hero not 2D poster — WebGL path active, scene has three depth groups
2. ✓ Pointer tilt reads — `applyPointerMotion` wired with `sceneTiltMultiplier`
3. ✓ Cursor visible — three-element cursor with gold palette
4. ✓ Overlay not frosted card — no `backdrop-filter` in overlay
5. ✓ Foreground/mid/background — three group IDs in config
6. ✓ Scroll phases preserved — `PHASE_SCENE` has all phase keys
7. ✓ Depth grammar — lighting config has key/fill/rim three-point setup

## Files

| File | Purpose |
|------|---------|
| `src/test/hero-visual-qa.test.tsx` | Visual QA: overlay structure, cursor elements, no blur panels |
| `src/test/hero-technical-qa.test.ts` | Config integrity, node mapping, critical node detection |
| `src/test/hero-breakpoint-qa.test.ts` | Capability gating, responsive classes, safe areas |

Three new test files, no production code changes.

