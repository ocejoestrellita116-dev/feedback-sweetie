

# Step 6: Fix Hero Activation and Runtime State

## Problem

Line 41 in `DossierHero.tsx`:
```ts
setHeroActive(progress > 0 && phase !== 'handoff');
```

This means `heroActive` is `false` when `progress === 0` — i.e., the entire first sticky frame before the user scrolls at all. The hero is visible and pinned but the experience runtime thinks it's inactive, so cursor behavior and RAF-dependent features don't engage until the first scroll pixel.

## Fix

**`DossierHero.tsx` line 40-42** — replace with intersection-based visibility:

Use a simple `sceneVisible` state driven by IntersectionObserver on the container. The hero is active when the container is in viewport and the phase hasn't handed off:

```ts
const [sceneVisible, setSceneVisible] = useState(false);

useEffect(() => {
  const el = containerRef.current;
  if (!el) return;
  const obs = new IntersectionObserver(
    ([entry]) => setSceneVisible(entry.isIntersecting),
    { threshold: 0 }
  );
  obs.observe(el);
  return () => obs.disconnect();
}, []);

useEffect(() => {
  setHeroActive(sceneVisible && phase !== 'handoff');
}, [sceneVisible, phase, setHeroActive]);
```

This activates on the first sticky frame (container enters viewport) without waiting for `progress > 0`.

## Scope

| File | Change |
|------|--------|
| `DossierHero.tsx` | Replace `progress > 0` check with IntersectionObserver-based `sceneVisible` state |

One file, one logic change. No API changes to provider, no changes to capability branching in `ExperienceProvider` or `use-experience-runtime` — those already work correctly with the `heroActive` flag.

