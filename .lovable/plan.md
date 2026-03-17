

# Step 7: Rebuild Cursor as Visible Hero-Language Layer

## Current State

- `CursorLayer.tsx`: Single `div` ring, uses `mix-blend-mode: difference`, sizes 24/48/32/0px, border-only styling
- `index.css`: `.cursor-none` class exists but nothing sets `data-cursor-visible` or `data-capability-mode` attributes
- No system cursor hiding is currently wired to the experience runtime
- `CursorMode` type: `'default' | 'hover' | 'drag' | 'hidden'`

## Changes

### A. `CursorLayer.tsx` — full rewrite with three-element cursor

Replace single ring with three concentric elements:

1. **Outer ring** — 36px in hero mode (was 24), gold border `hsl(var(--dossier-gold) / 0.5)`, no `mix-blend-mode: difference`
2. **Center dot** — 4px solid gold circle, always visible
3. **Soft glow halo** — 56px radial gradient from gold at 0% to transparent, `opacity: 0.15`, only when `heroActive`

Size map update: `{ default: 24, hero: 36, hover: 48, drag: 32, hidden: 0 }` — but the "active" size is derived: when `heroActive && cursorMode === 'default'`, use hero preset (36px).

Behavior:
- When `heroActive`: gold palette, no blend mode, glow visible
- When not `heroActive`: foreground color, subtle blend, no glow
- `hover`/`drag` override ring size on top of hero base
- `hidden` scales to 0

Set `document.documentElement.dataset.cursorVisible = 'true'` on mount, remove on unmount.

### B. `index.css` — system cursor hiding for full-mode desktop only

Replace `.cursor-none` rule with:

```css
html[data-cursor-visible='true'] body,
html[data-cursor-visible='true'] a,
html[data-cursor-visible='true'] button,
html[data-cursor-visible='true'] [role="button"],
html[data-cursor-visible='true'] input,
html[data-cursor-visible='true'] textarea,
html[data-cursor-visible='true'] select {
  cursor: none !important;
}
```

The `data-cursor-visible` attribute is only set by `CursorLayer` which already guards with `if (isTouch || reducedMotion) return null` — so touch/reduced/fallback users never get the attribute and keep native cursor.

### C. `experience.types.ts` — no changes needed

`CursorMode` stays the same. The "hero" visual is driven by the `heroActive` flag, not a new cursor mode. `hover`/`drag` remain overrides on top.

## Files changed

| File | Change |
|------|--------|
| `CursorLayer.tsx` | Full rewrite: 3-element cursor (ring + dot + glow), hero gold palette, remove mix-blend-mode in hero, set `data-cursor-visible` on mount |
| `index.css` | Replace `.cursor-none` with `html[data-cursor-visible]` selector targeting body + interactive elements |

