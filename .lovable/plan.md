

# Step 9: Responsive and Fallback Polish

## Current State

The capability flags (`isTouch`, `reducedMotion`, `webglAvailable`) are already detected in `use-experience-runtime.ts` and consumed across the app. However, several gaps remain:

1. **HeroStageWebGL** — always applies pointer tilt and orb float regardless of `isTouch`/`reducedMotion`
2. **HeroOverlay** — text parallax is gated correctly, but mobile layout isn't adapted for safe areas or smaller viewports
3. **CursorLayer** — returns `null` for touch/reduced (correct), but transition durations aren't simplified for reduced motion
4. **Smooth scroll** — Lenis is disabled for touch/reduced (correct)

## Changes

### A. `HeroStageWebGL.tsx` — gate motion by capability

`SceneContent` currently reads `pointerLerpX/Y` from the experience context but doesn't check `isTouch` or `reducedMotion`.

- Read `isTouch` and `reducedMotion` from `useExperience()`
- **Touch**: Zero out pointer values passed to `applyPointerMotion` and `applyPhaseMotion` (pass `0.5, 0.5` instead of actual pointer). Camera still moves per phase, but no pointer-driven tilt/shift.
- **Reduced motion**: Additionally skip `applySecondaryMotion` entirely (no orb float, no pointer lag). Scene still transitions between phases on scroll, but no per-frame ambient animation.

This is ~5 lines of conditional logic in the `useFrame` callback — no structural changes.

### B. `HeroOverlay.tsx` — mobile layout polish

- Add `pb-[env(safe-area-inset-bottom)]` to the root container for iOS safe area
- Scale headline from `text-6xl md:text-8xl` to `text-4xl sm:text-6xl md:text-8xl` for small screens
- Proof strip and flagship teaser: shift `bottom-[15%]` / `bottom-[12%]` to `bottom-[8%] sm:bottom-[15%]` / `bottom-[6%] sm:bottom-[12%]` so they don't overlap on short viewports
- CTA buttons: ensure adequate touch targets (already `py-3` — good)

### C. `CursorLayer.tsx` — simplified transitions for reduced motion

Currently returns `null` for reduced motion, which is correct. No changes needed here — the system cursor stays native.

### D. `SpatialLayer.tsx` — already correct

Parallax is zeroed for touch/reduced. No changes needed.

### E. `use-experience-runtime.ts` — already correct

Lenis disabled for touch/reduced, pointer lerp snaps to raw values for reduced motion. No changes needed.

## Files changed

| File | Change |
|------|--------|
| `HeroStageWebGL.tsx` | Gate pointer tilt (touch) and secondary motion (reduced) in `useFrame` |
| `HeroOverlay.tsx` | Mobile-safe headline sizing, safe-area padding, repositioned bottom elements |

Two files, surgical changes. No API or type changes.

