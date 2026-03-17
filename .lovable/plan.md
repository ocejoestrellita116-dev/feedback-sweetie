

# Step 8: Redesign Overlay — Support the Scene, Don't Flatten It

## Problem

The current overlay uses opaque blur panels (`blur(12px)`, `bg-background/0.25`, `rounded-2xl`) that read as card components sitting on top of the 3D scene. The closed-state headline has a rectangular blur shell. Open/handoff panels also carry visible backdrop-blur containers. ProofStrip and FlagshipTeaser have their own `rounded-lg` blur shells. All of this competes with the dossier object for visual weight.

## Changes

### A. `HeroOverlay.tsx` — closed state

**Remove**: Layer 2 blur panel (`rounded-2xl`, `blur(12px)`, `bg-background/0.25`).

**Replace with**: Wider elliptical scrim only (Layer 1), tuned for tonal support:
- `radial-gradient(ellipse 140% 160% at 50% 48%, hsl(var(--background) / 0.7) 0%, hsl(var(--background) / 0.2) 50%, transparent 80%)`
- No `backdropFilter`, no border, no rounded panel
- Keep `textShadow` but reduce to two layers: `0 0 40px hsl(var(--background)), 0 1px 2px hsl(var(--background) / 0.5)`

Text content (eyebrow, h1, role statement, CTA) renders directly on top of the elliptical scrim — no wrapping card.

### B. `HeroOverlay.tsx` — open state

**Remove**: `rounded-xl`, `blur(8px)`, `bg-background/0.2` from the expansion text `<p>`.

**Replace with**: Text-shadow only approach — `textShadow: '0 0 40px hsl(var(--background)), 0 0 80px hsl(var(--background) / 0.5)'`. No backdrop container at all.

### C. `HeroOverlay.tsx` — handoff state

**Lighten CTAs**: Remove `bg-background/30 backdrop-blur-sm`. Replace with `bg-transparent` and thinner border `border-foreground/20`. Hover keeps `hover:bg-foreground hover:text-background`.

The radial scrim behind CTAs stays but reduce opacity: `hsl(var(--background) / 0.25)` (was 0.4).

### D. `ProofStrip.tsx` — remove container shell

**Remove**: The `rounded-lg` scrim container wrapper (`blur(6px)`, `bg-background/0.15`).

**Keep**: The gradient rule lines (top/bottom) and the staggered proof items with their text-shadows. Items render in a bare flex row — no backdrop panel.

### E. `FlagshipTeaser.tsx` — lighten to editorial treatment

**Remove**: `rounded-lg`, `blur(12px)`, `bg-background/0.2`.

**Replace with**: No background, no blur. Keep text-shadows for readability. The bottom gold gradient line stays. The gold eyebrow rule stays. This becomes a floating text group, not a card.

## Files changed

| File | Change |
|------|--------|
| `HeroOverlay.tsx` | Remove blur panel from closed state; elliptical scrim only; strip blur from open text; lighten handoff CTAs |
| `ProofStrip.tsx` | Remove scrim container; bare flex row with text-shadows |
| `FlagshipTeaser.tsx` | Remove blur/bg/rounded; floating editorial text group |

