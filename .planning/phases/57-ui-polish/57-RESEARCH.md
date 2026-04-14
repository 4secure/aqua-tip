# Phase 57: UI Polish - Research

**Researched:** 2026-04-14
**Domain:** CSS layout, D3 canvas performance, Framer Motion scroll animations, Leaflet z-index stacking
**Confidence:** HIGH

## Summary

Phase 57 addresses seven visual/UX issues: Settings page centering, globe first-paint delay, landing scroll jank, custom scrollbar styling, favicon generation, and threat map sidebar z-index. All are CSS/animation/asset fixes with no new features or dependencies.

The globe first-paint delay is the most technically involved fix -- the GeoJSON land data must be bundled locally as a static import to eliminate the async fetch that causes the empty purple circle. The scroll jank fix requires reducing the rendering conflict between D3's canvas animation timer and Framer Motion's spring transforms. The remaining items are straightforward CSS and asset changes.

**Primary recommendation:** Bundle the 110m GeoJSON locally, pause globe rotation during active scroll, bump sidebar z-index above Leaflet's stacking context, and apply the remaining CSS fixes in a single plan.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Center the profile form card using `mx-auto` with the existing `max-w-2xl` -- match the pattern used on other content pages for consistency
- **D-02:** Bundle the GeoJSON land data locally as a static import instead of fetching from GitHub at runtime. The 110m land file (~24KB gzipped) eliminates the empty purple circle on first render -- land dots appear on first paint
- **D-03:** The issue is NOT about opacity -- the globe shell (purple circle) renders immediately but land features only appear after the async fetch completes. Bundling removes this delay entirely
- **D-04:** Globe stutters during scroll. Likely caused by heavy D3 canvas re-rendering (dots, pings, rotation timer) competing with Framer Motion spring transforms on the same frame. Fix should reduce the rendering conflict -- e.g., pause the rotation timer during active scroll, reduce dot count, or throttle canvas renders when scroll is active
- **D-05:** Thin minimal scrollbar: ~4px wide thumb, rounded, using theme colors (violet or border color). Transparent track background -- no visible track. No up/down arrow buttons. Apply globally via CSS `::-webkit-scrollbar` and `scrollbar-width`/`scrollbar-color` for Firefox
- **D-06:** Generate favicon from existing `frontend/public/logo.png`. Create standard sizes (16x16, 32x32, apple-touch-icon 180x180). Reference in `index.html`
- **D-07:** Desktop sidebar goes behind the Leaflet map and overlay widgets when opened on the Threat Map page. Fix by ensuring the sidebar z-index stacks above the map container

### Claude's Discretion
- Spring config tuning values (stiffness/damping) for scroll smoothness
- Exact scrollbar color choice (violet vs border-light)
- Favicon generation approach (manual resize vs build tool)

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UI-01 | Settings page profile form is horizontally centered on the page | D-01: add `mx-auto` to the card's existing `max-w-2xl` class |
| UI-02 | Landing page globe renders immediately on first mount (no scroll trigger delay) | D-02/D-03: bundle GeoJSON as local static import, synchronous dot generation |
| UI-03 | Landing page animations are smooth with no jank or delayed renders | D-04: pause D3 rotation timer during active scroll to eliminate frame contention |
</phase_requirements>

## Architecture Patterns

### Current Globe Architecture (Globe.jsx)
The globe uses D3 `geoOrthographic` projection rendered to a canvas. The key performance-relevant code path:

1. `useEffect` mounts canvas, creates projection, starts `d3.timer` for rotation at 60fps
2. `loadWorldData()` fetches GeoJSON from GitHub CDN (async), generates halftone dots, stores in typed arrays
3. `render()` is called every frame by `d3.timer` -- draws ocean, graticule, land outlines, ~thousands of dots with back-face culling, and animated threat pings
4. `IntersectionObserver` pauses rotation when globe is off-screen

**Problem (UI-02):** Between mount and fetch completion, the globe renders only the purple circle (ocean + stroke) -- no land dots. This is a visible 200-500ms gap on first load.

**Problem (UI-03):** The `d3.timer` fires every ~16ms. During scroll, Framer Motion's `useSpring` with `stiffness: 80, damping: 20` also schedules animation frames for transform/opacity updates on the globe container. Both compete for the same frame budget, causing jank.

### Fix Pattern: Bundle GeoJSON (D-02)
```
frontend/src/
  data/
    ne_110m_land.json    # ~90KB raw, ~24KB gzipped by Vite
```

Import synchronously in Globe.jsx:
```javascript
import landData from '../../data/ne_110m_land.json';
```

Replace `loadWorldData()` async fetch with synchronous initialization using the imported `landData`. The dot generation (typed arrays) runs once on mount -- this is already fast (~5-10ms for 110m resolution). [VERIFIED: Globe.jsx source code]

### Fix Pattern: Pause Rotation During Scroll (D-04)
Add a scroll listener that sets a flag to skip `d3.timer` render calls during active scroll. Use a debounce timeout (~150ms) to resume after scroll stops:

```javascript
let isScrolling = false;
let scrollTimer = null;

const handleScroll = () => {
  isScrolling = true;
  clearTimeout(scrollTimer);
  scrollTimer = setTimeout(() => { isScrolling = false; }, 150);
};

window.addEventListener('scroll', handleScroll, { passive: true });

// In d3.timer callback:
const rotationTimer = d3.timer(() => {
  if (!isVisible || isScrolling) return;
  // ... existing rotation logic
});
```

This eliminates the D3 canvas re-renders that compete with Framer Motion's spring transforms during scroll. [ASSUMED]

### Fix Pattern: Sidebar Z-Index (D-07)
Current state:
- Sidebar: `z-40` (desktop), `z-50` (hovered/mobile) [VERIFIED: Sidebar.jsx line 48-50]
- Topbar: `z-30` [VERIFIED: Topbar.jsx line 49]
- Leaflet map overlay panels: `z-[1000]`, `z-[1001]` [VERIFIED: LeftOverlayPanel.jsx, RightOverlayPanel.jsx]
- Leaflet internal panes: z-index 200-800 range [CITED: leafletjs.com/reference#map-pane]

The sidebar at `z-40` sits below Leaflet's internal `.leaflet-pane` elements (z-index 200+). Fix: bump sidebar to `z-[1001]` or higher, and ensure topbar is also above Leaflet (`z-[1002]` or similar). The threat map overlay panels already use `z-[1000]`, so sidebar must be at least `z-[1001]`.

**Recommended z-index stack:**
| Element | Current | Proposed |
|---------|---------|----------|
| Topbar | `z-30` | `z-[1002]` |
| Sidebar (default) | `z-40` | `z-[1001]` |
| Sidebar (hovered) | `z-50` | `z-[1001]` (same -- already above map) |
| Mobile sidebar | `z-50` | `z-[1001]` |
| Mobile backdrop | `z-40` | `z-[1000]` |
| Map overlay panels | `z-[1000]` | `z-[1000]` (unchanged) |
| Map status | `z-[1001]` | `z-[999]` (drop below sidebar) |

Note: This raises ALL layout z-indexes project-wide. Alternative: constrain the Leaflet map container with `style={{ position: 'relative', zIndex: 0 }}` to create an isolated stacking context, keeping all Leaflet z-indexes contained. This is cleaner -- sidebar stays at `z-40`/`z-50` and naturally stacks above the map.

**Recommended approach:** Add `style={{ position: 'relative', zIndex: 0 }}` to the map container div in ThreatMapPage.jsx. This creates a stacking context that traps Leaflet's internal z-indexes. The sidebar at `z-40` will then correctly stack above the map. [ASSUMED]

### Settings Page Centering (D-01)
Current: `<div className="bg-surface/60 border border-border backdrop-blur-sm rounded-xl p-6 max-w-2xl">` [VERIFIED: SettingsPage.jsx line 194]

Fix: Add `mx-auto` to center the card. The parent `div.space-y-6` is a block element that fills the content area, so `mx-auto` on the `max-w-2xl` child centers it horizontally.

### Custom Scrollbar (D-05)
Current scrollbar styles exist in `main.css` lines 8-29 [VERIFIED]. They use:
- 6px width, `#0A0B10` track background, `#2A2D3E` thumb

User wants: 4px width, transparent track, rounded thumb, no arrows. Update the existing `@layer base` block:

```css
* {
  scrollbar-width: thin;
  scrollbar-color: #1E2030 transparent;
}
*::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}
*::-webkit-scrollbar-track {
  background: transparent;
}
*::-webkit-scrollbar-thumb {
  background: #1E2030;
  border-radius: 2px;
}
*::-webkit-scrollbar-thumb:hover {
  background: #2A2D3E;
}
*::-webkit-scrollbar-button {
  display: none;
}
```

Using `#1E2030` (border color from theme) for the thumb keeps it subtle and consistent. [ASSUMED -- Claude's discretion on color choice]

### Favicon (D-06)
The existing `logo.png` is already 32x32 PNG [VERIFIED: file command output]. The `index.html` has no favicon link tags [VERIFIED: index.html].

Since the logo is already 32x32, it can be used directly for the 32x32 and 16x16 (browser downscales). For apple-touch-icon (180x180), we need an upscaled version or the original source. Given the logo is only 32x32, generating a 180x180 from it will look pixelated.

**Practical approach:** Use the 32x32 PNG as `favicon.png` (covers 16x16 and 32x32 via browser scaling). For apple-touch-icon, use the same 32x32 with a solid background color pad. Add to index.html:

```html
<link rel="icon" type="image/png" sizes="32x32" href="/logo.png">
<link rel="icon" type="image/png" sizes="16x16" href="/logo.png">
<link rel="apple-touch-icon" sizes="180x180" href="/logo.png">
```

This avoids introducing build tools for favicon generation when the logo is already the right size. [ASSUMED]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| GeoJSON data | Runtime fetcher with caching | Static JSON import (Vite handles bundling) | Eliminates async delay, Vite tree-shakes and gzips automatically |
| Scroll detection | Complex scroll position tracker | Simple `scroll` event + debounce timeout | Only need a boolean flag, no position tracking needed |
| Favicon generation | Build-time image resizer | Browser's built-in favicon scaling from 32x32 source | Logo is already 32x32, browsers handle downscaling |

## Common Pitfalls

### Pitfall 1: JSON Import Bloats Bundle
**What goes wrong:** Importing a large JSON file increases the JavaScript bundle size.
**Why it happens:** Vite includes JSON imports in the JS bundle by default.
**How to avoid:** The 110m land file is ~90KB raw. Vite gzips this to ~24KB in production. This is acceptable -- it's a one-time cost that eliminates a network round-trip and visible rendering delay.
**Warning signs:** If the file were 500KB+, consider using `?url` import suffix to load as a separate asset.

### Pitfall 2: Scroll Listener Not Passive
**What goes wrong:** Adding a scroll listener without `{ passive: true }` can block scrolling on some browsers.
**Why it happens:** Non-passive scroll listeners can call `preventDefault()`, so the browser waits for the handler.
**How to avoid:** Always pass `{ passive: true }` for scroll event listeners that don't need to prevent default.
**Warning signs:** Scroll feels sluggish even after pausing D3 timer.

### Pitfall 3: Stacking Context Isolation Side Effects
**What goes wrong:** Adding `position: relative; z-index: 0` to the map container might affect the map's overlay panels (which use `position: absolute` relative to the map container).
**Why it happens:** Creating a new stacking context changes which elements can stack above others.
**How to avoid:** The overlay panels in ThreatMapPage already use `position: absolute` within the map's parent div. The stacking context should be on the same parent div, so overlays stay within it and above the map tiles. Verify that PanelToggle, LeftOverlayPanel, RightOverlayPanel still render above the map after the change.
**Warning signs:** Overlay panels disappear behind the map tiles.

### Pitfall 4: Spring Config Too Stiff
**What goes wrong:** Increasing `stiffness` makes scroll animations feel snappy but jittery; too low `damping` causes oscillation.
**Why it happens:** Framer Motion's spring physics simulation is sensitive to these values.
**How to avoid:** Current values are `stiffness: 80, damping: 20`. After fixing the D3 timer pause, test whether the current spring config is acceptable before changing it. The jank may be entirely caused by frame contention, not spring config.
**Warning signs:** Animations overshoot or feel floaty after config changes.

## Code Examples

### GeoJSON Static Import Pattern
```javascript
// Source: Vite documentation on JSON imports
import landData from '../../data/ne_110m_land.json';

// In useEffect, replace loadWorldData() with synchronous init:
landFeatures = landData;
const tempDots = [];
for (const feature of landFeatures.features) {
  const dots = generateDotsInPolygon(feature, 18);
  for (const [lng, lat] of dots) {
    tempDots.push(lng, lat);
  }
}
dotCount = tempDots.length / 2;
dotLngs = new Float64Array(dotCount);
dotLats = new Float64Array(dotCount);
for (let i = 0; i < dotCount; i++) {
  dotLngs[i] = tempDots[i * 2];
  dotLats[i] = tempDots[i * 2 + 1];
}
render();
```

### Stacking Context Isolation for Leaflet
```jsx
// In ThreatMapPage.jsx, add zIndex: 0 to the map container's parent
<div className="relative -m-6" style={{ height: 'calc(100vh - 60px)', position: 'relative', zIndex: 0 }}>
```

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Pausing d3.timer during scroll eliminates jank | Architecture Patterns (D-04) | Medium -- may need additional optimizations like reducing dot count |
| A2 | `zIndex: 0` on map container parent isolates Leaflet z-indexes without breaking overlay panels | Architecture Patterns (D-07) | Medium -- overlay panels might need z-index adjustment if stacking context changes their behavior |
| A3 | Using `#1E2030` (border color) for scrollbar thumb is the right aesthetic choice | Architecture Patterns (D-05) | Low -- trivial to change the color |
| A4 | Browser-scaled 32x32 favicon is sufficient quality for apple-touch-icon | Architecture Patterns (D-06) | Low -- user can provide higher-res source later |
| A5 | Spring config change is not needed after fixing D3 timer pause | Common Pitfalls | Low -- can tune later if needed |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None -- no test infrastructure exists |
| Config file | None |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-01 | Settings form card is centered | manual-only | Visual inspection | N/A |
| UI-02 | Globe land dots visible on first paint | manual-only | Visual inspection (no empty purple circle) | N/A |
| UI-03 | Scroll animations smooth (no jank) | manual-only | Visual inspection during scroll | N/A |

**Justification for manual-only:** All three requirements are visual/perceptual behaviors. No test framework exists in this project, and these CSS/animation fixes cannot be meaningfully validated with unit tests. Visual inspection in the browser is the only reliable validation method.

### Wave 0 Gaps
None -- all validation is manual visual inspection. No test infrastructure to create.

## Open Questions

1. **Apple-touch-icon quality**
   - What we know: Logo is 32x32 PNG, upscaling to 180x180 will be pixelated
   - What's unclear: Whether the user has a higher-resolution source image
   - Recommendation: Use 32x32 for now; note in plan that a higher-res source would improve mobile bookmarks

2. **Scroll jank root cause certainty**
   - What we know: D3 timer runs at 60fps, Framer Motion springs also schedule frames
   - What's unclear: Whether pausing the timer alone fully eliminates jank, or if spring config also needs tuning
   - Recommendation: Fix timer pause first, evaluate spring config only if jank persists

## Sources

### Primary (HIGH confidence)
- Globe.jsx source code -- verified async fetch pattern, d3.timer usage, IntersectionObserver
- LandingScroll.jsx source code -- verified useSpring config (stiffness: 80, damping: 20), scroll-driven transforms
- SettingsPage.jsx source code -- verified missing mx-auto on max-w-2xl card
- Sidebar.jsx source code -- verified z-40/z-50 z-index values
- ThreatMapPage.jsx source code -- verified map container structure
- Overlay panel source code -- verified z-[1000] and z-[1001] values
- main.css source code -- verified existing scrollbar styles
- index.html source code -- verified no favicon link tags
- logo.png -- verified 32x32 PNG via file command

### Secondary (MEDIUM confidence)
- Leaflet z-index documentation -- pane z-indexes in 200-800 range

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all changes use existing libraries, no new dependencies
- Architecture: HIGH - all source files read and analyzed, patterns well-understood
- Pitfalls: MEDIUM - scroll jank fix is based on reasonable inference but not yet tested

**Research date:** 2026-04-14
**Valid until:** 2026-05-14 (stable -- CSS and animation fixes, no fast-moving dependencies)
