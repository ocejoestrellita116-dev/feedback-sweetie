

# Step 5: Build Runtime Lighting for Premium Depth

## Current State

- **Lighting**: 3 lights — ambient (0.4), key directional (1.6, shadow-casting), fill directional (0.5). No rim light. Key light color defaults to white.
- **Shadows**: `shadows` prop on Canvas (default shadow map type). Shadow flags set per-node in `NODE_BEHAVIOUR` config — already correct (cast on dossier/cover/orb/tickets/pedestalTop, receive on pedestal/portal).
- **Renderer**: `dpr={[1, 1.5]}`, no tone mapping set, no explicit shadow map type. Canvas `gl` config has antialias + alpha + high-performance.

## Changes

### A. `hero-scene.config.ts` — expand lighting config

Add rim light definition and warm color for key light:

```
LIGHTING = {
  ambient: { intensity: 0.25 },  // reduced from 0.4
  key: {
    intensity: 1.8,
    color: '#fff4e0',  // warm
    position: [3, 5, 4],
    shadowMapSize: 1024,
    shadowBias: -0.0005,
  },
  fill: {
    intensity: 0.35,   // reduced from 0.5
    color: '#e8eeff',  // cool neutral
    position: [-3, 2, 2],
  },
  rim: {
    intensity: 0.6,
    color: '#c8d8ff',  // cool edge
    position: [-2, 3, -3],
  },
}
```

### B. `HeroStageWebGL.tsx` — renderer + lights + rim

**Canvas props** — add tone mapping and soft shadow map:
```jsx
<Canvas
  gl={{
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
    toneMapping: THREE.ACESFilmicToneMapping,
    toneMappingExposure: 1.0,
  }}
  shadows="soft"   // PCFSoftShadowMap
  dpr={[1, 1.5]}
  ...
>
```

**Add rim light** in JSX after fill light:
```jsx
<directionalLight
  position={LIGHTING.rim.position}
  intensity={LIGHTING.rim.intensity}
  color={LIGHTING.rim.color}
/>
```

**Apply colors** to existing key and fill lights via `color` prop.

**Update shadow bias** from config instead of hardcoded `-0.001`.

## Files changed

| File | Change |
|------|--------|
| `hero-scene.config.ts` | Add rim light config; add color fields to key/fill; reduce ambient to 0.25; reduce fill to 0.35 |
| `HeroStageWebGL.tsx` | Add `toneMapping`/`toneMappingExposure` to gl config; change `shadows` to `"soft"`; add rim light JSX; apply color props to key/fill lights |

Shadow flags on nodes are already correct from Step 2 (`NODE_BEHAVIOUR` config). No postprocessing added — spec says no heavy chain, bloom off for now.

