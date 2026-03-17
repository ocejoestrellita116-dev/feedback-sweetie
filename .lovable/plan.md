

# Step 11.1: Environment Lighting Setup

## Changes

### A. `HeroStageWebGL.tsx`

1. Import `Environment` from `@react-three/drei`
2. Inside `SceneContent`, add `<Environment>` component after lighting:
   - `preset="studio"` — neutral warm studio that works well with cream/beige PBR materials
   - `environmentIntensity={0.4}` — subtle fill, not overpowering directional lights
   - `backgroundBlurriness={1}` — prevents raw HDRI from showing as background
   - `background={false}` — don't use HDRI as visible background (we'll set a custom background color separately)
3. Set scene background to warm cream matching Blender renders:
   ```ts
   const { scene } = useThree();
   useEffect(() => {
     scene.background = new THREE.Color('#f5f0e8');
   }, [scene]);
   ```
4. Disable `alpha: true` on Canvas GL config (switch to `alpha: false`) since we now have an explicit scene background
5. Increase `toneMappingExposure` from `1.0` to `1.5`

### B. `hero-scene.config.ts`

1. Increase `ambient.intensity` from `0.25` to `0.55` — approximates Blender's bounce lighting from cream walls
2. Increase `key.intensity` from `1.8` to `2.4` — matches the strong warm key in renders
3. Keep fill and rim as-is (they provide subtle cool contrast)

### C. Add environment config to `hero-scene.config.ts`

```ts
export const ENVIRONMENT = {
  preset: 'studio' as const,
  intensity: 0.4,
  backgroundBlurriness: 1,
  background: false,
  sceneBackground: '#f5f0e8',
};
```

## Files changed

| File | Change |
|------|--------|
| `HeroStageWebGL.tsx` | Add `<Environment>`, set scene background, bump exposure, disable alpha |
| `hero-scene.config.ts` | Add `ENVIRONMENT` config, bump ambient to 0.55 and key to 2.4 |

