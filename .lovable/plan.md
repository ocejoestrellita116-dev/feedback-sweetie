

# Step 11.2: Theme-Aware Scene Background

## Current state

Scene background is hardcoded to `#f5f0e8` (warm cream). Works perfectly for light mode but clashes if the user toggles dark mode — the 3D canvas stays cream while everything else goes dark.

## Changes

### `HeroStageWebGL.tsx` — SceneContent

Replace the static `useEffect` with a theme-reactive one:

1. Read the current theme from `document.documentElement.classList.contains('dark')`
2. Set `scene.background` to cream (`#f5f0e8`) or dark (`#121826` — maps to `220 25% 7%`) accordingly
3. Observe theme changes via `MutationObserver` on `<html>` class attribute
4. Clean up observer on unmount

```ts
useEffect(() => {
  const root = document.documentElement;
  const update = () => {
    const isDark = root.classList.contains('dark');
    scene.background = new THREE.Color(isDark ? '#121826' : ENVIRONMENT.sceneBackground);
  };
  update();
  const observer = new MutationObserver(update);
  observer.observe(root, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
}, [scene]);
```

### `hero-scene.config.ts`

Add dark background color to `ENVIRONMENT`:

```ts
export const ENVIRONMENT = {
  ...existing,
  sceneBackgroundDark: '#121826',
};
```

## Files

| File | Change |
|------|--------|
| `HeroStageWebGL.tsx` | Theme-reactive scene background via MutationObserver |
| `hero-scene.config.ts` | Add `sceneBackgroundDark` value |

Two files, ~10 lines changed total.

