# Domain Pitfalls

**Domain:** Adding glassmorphism overlay panels on a full-viewport Leaflet map, merging dashboard data into map page, removing DashboardPage, with toggle/peek-on-hover behavior using Framer Motion
**Project:** AQUA TIP v3.3 -- Threat Map Dashboard
**Researched:** 2026-04-05
**Confidence:** HIGH (direct codebase analysis of ThreatMapPage.jsx, DashboardPage.jsx, useLeaflet.js, useThreatStream.js, App.jsx, Sidebar nav config, CSS files, and verified Leaflet event propagation behavior)

---

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: Click and Drag Events Propagate Through Overlay Panels to Leaflet Map

**What goes wrong:**
Clicking, dragging, or scrolling inside glassmorphism overlay panels (stat cards, indicators table) triggers map interactions underneath -- panning, zooming, or marker selection. The map "grabs" through the panel, making the overlay unusable.

**Why it happens:**
Leaflet attaches pointer/mouse/touch event listeners directly on the map container DOM element. Browser events bubble up from child elements. When an overlay `<div>` is positioned absolutely over the Leaflet container (the current pattern on ThreatMapPage.jsx lines 79-88 using `z-[1000]`), clicks inside the overlay still propagate to the Leaflet map container beneath. The existing map widgets (ThreatMapCounters, ThreatMapCountries, ThreatMapDonut, ThreatMapFeed) already use `z-[1000]` and work because they are small and mostly non-scrollable. But the new overlay panels will be large, scrollable, and draggable (Framer Motion slide animations), creating far more interaction surface area for event leakage.

**Consequences:**
- User drags to scroll the indicators table, map pans instead
- User clicks a stat card, map registers a click at that coordinate
- Double-click on overlay text triggers map zoom
- Mouse wheel scroll on the scrollable indicators table zooms the map

**Prevention:**
Apply both `L.DomEvent.disableClickPropagation()` and `L.DomEvent.disableScrollPropagation()` to each overlay panel's root DOM element via a `useEffect` + `useRef` pattern:

```jsx
const panelRef = useRef(null);

useEffect(() => {
  if (!panelRef.current) return;
  L.DomEvent.disableClickPropagation(panelRef.current);
  L.DomEvent.disableScrollPropagation(panelRef.current);
}, []);
```

This must be applied to EVERY interactive overlay element, including the toggle button and the peek sliver. Create a reusable `useMapOverlay(ref)` hook that encapsulates both calls, so every overlay component gets it consistently.

**Detection:**
- Click on overlay, watch if map pans or shows popup
- Scroll inside indicators table, watch if map zooms
- Drag inside overlay panel, watch if map pans

**Phase to address:**
Very first overlay panel implementation phase. Must be in place before any overlay is functional.

---

### Pitfall 2: Leaflet Z-Index War with Overlay Panels

**What goes wrong:**
Leaflet internally manages z-index values for its tile panes, marker panes, popup panes, and shadow panes. Overlay panels positioned with CSS `z-index` values can conflict with Leaflet's internal layering, causing: (a) map popups appearing above overlay panels, (b) tile layers rendering over the overlay during zoom transitions, or (c) the Leaflet attribution control overlapping panel edges.

**Why it happens:**
Leaflet's internal pane z-index hierarchy (from leaflet source):
- Tile pane: `z-index: 200`
- Shadow pane: `z-index: 500`
- Marker pane: `z-index: 600`
- Tooltip pane: `z-index: 650`
- Popup pane: `z-index: 700`

The existing code uses `z-[1000]` (Tailwind for `z-index: 1000`), which sits above all default Leaflet panes. However, Leaflet popups created by the current `useLeaflet.js` hook (lines 63-66, bound via `.bindPopup()`) render in the popup pane at z-index 700, which is correctly below 1000. The problem arises when:
1. Custom Leaflet controls or plugins inject elements with higher z-index
2. Framer Motion `animate` creates a new stacking context with `transform` that resets z-index behavior relative to ancestors
3. The Leaflet map container itself creates a stacking context that isolates its children

**Consequences:**
- Map popups bleed through panels during tile zoom animations
- Pulse markers (from `addPulseMarker` function, ThreatMapPage.jsx lines 11-23) visually appear above overlay panels during their scale animation
- Toggle button unreachable behind a Leaflet control

**Prevention:**
1. Place overlay panels as siblings of the map container, not children. The current ThreatMapPage.jsx structure already does this correctly (overlay divs are siblings of the map `ref` div inside the parent `relative` container). Preserve this pattern when refactoring.
2. Use `z-[1000]` for panels (already proven in current code) and ensure no Leaflet pane exceeds this.
3. Disable Leaflet's attribution control (already done: `attributionControl: false` in useLeaflet.js line 19).
4. Test overlay z-index specifically during map zoom transitions and tile loading, when Leaflet temporarily elevates tile pane z-index.

**Detection:**
- Zoom in/out rapidly while overlay is visible -- watch for tile flash-through
- Click a map marker to open popup, check if popup renders above or below the overlay

**Phase to address:**
Initial overlay panel layout phase. Establish z-index contract once, document it, reference it in all subsequent overlay work.

---

### Pitfall 3: Framer Motion Transform Creates New Stacking Context, Breaking Z-Index

**What goes wrong:**
When Framer Motion animates the overlay panel slide-in/slide-out (`animate={{ x: ... }}`), it applies a CSS `transform` to the element. CSS `transform` creates a new stacking context, which means `z-index` values inside the transformed element are relative to its stacking context, not the page root. This can cause the animated panel to render below Leaflet's map container during animation, even with a high z-index value.

**Why it happens:**
CSS specification: any element with `transform` other than `none` establishes a new stacking context. Framer Motion's `animate` applies `transform: translateX(...)` for slide animations. If the Leaflet map container also establishes a stacking context (it does, via its own `transform` and `position: relative`), the two stacking contexts compete based on DOM order, not z-index values.

**Consequences:**
- Panel visually "dips behind" the map mid-animation, then pops back on top when animation completes (if transform is removed after)
- Panel permanently renders behind map tiles if Framer Motion keeps the transform applied
- Flickering during slide animations as stacking contexts fight

**Prevention:**
1. Ensure the overlay panel wrapper has `position: relative` or `position: absolute` AND `z-index` set on the wrapper OUTSIDE the Framer Motion animated element, so the stacking context is established before the transform is applied.
2. Use `will-change: transform` on the panel element to hint the browser to composite it on its own layer.
3. Alternatively, animate `x` with `style={{ zIndex: 1000 }}` directly on the Framer Motion component (not Tailwind class) to ensure z-index is in the same stacking context as the transform.
4. Test with `opacity` animation alongside `x` -- opacity also creates stacking contexts and can compound the problem.

Structure the DOM like this:
```jsx
<div className="absolute top-0 left-0 z-[1000]"> {/* stacking context wrapper */}
  <motion.div animate={{ x: collapsed ? -320 : 0 }}> {/* animated content */}
    {/* panel content */}
  </motion.div>
</div>
```

**Detection:**
- Open browser DevTools, Elements panel, toggle the overlay -- watch for visual z-order flicker
- Slow down animation (set `transition.duration` to 2s) to observe mid-animation rendering

**Phase to address:**
The phase that implements Framer Motion slide animations. Must be tested immediately after first animation is added.

---

### Pitfall 4: Dual SSE Connection When Merging Dashboard Data into Map Page

**What goes wrong:**
The current ThreatMapPage uses `useThreatStream()` which opens an SSE connection to `/api/threat-map/stream`. The current DashboardPage does NOT use SSE -- it fetches dashboard data via REST (`/api/dashboard/counts`, `/api/dashboard/indicators`, etc.) with a 5-minute `setInterval` auto-refresh. When merging these, developers may accidentally:
1. Open TWO SSE connections (one for map events, one imagined for dashboard data)
2. Duplicate the REST polling alongside the existing SSE, wasting connections
3. Break the existing SSE connection by remounting the hook during refactoring

**Why it happens:**
The `useThreatStream` hook (useThreatStream.js) manages EventSource lifecycle including snapshot loading, SSE connection, reconnection with exponential backoff, and visibility-aware disconnect. The dashboard data (stat counts, indicators, categories) comes from separate REST endpoints cached server-side (15min for counts, 5min for categories). These are fundamentally different data streams. Developers may conflate "live data" with "dashboard data" and try to pipe everything through SSE.

**Consequences:**
- Two EventSource connections per user doubles server connection count (SSE connections are long-lived and expensive)
- If `useThreatStream` is accidentally unmounted/remounted during refactor, the EventSource disconnects and snapshot reloads, causing a visible data flash
- If dashboard REST polling is removed in favor of SSE, dashboard stats lose their server-side caching benefit

**Prevention:**
Keep the two data sources separate and explicit:
1. `useThreatStream()` -- unchanged, provides map events, pulse markers, counters, country/type aggregations
2. Dashboard REST endpoints -- keep existing `useEffect` pattern from DashboardPage.jsx lines 360-428, but extract into a custom `useDashboardData()` hook for cleanliness
3. Do NOT create a second SSE connection
4. The 5-minute auto-refresh for dashboard data can use the existing `useAutoRefresh` hook (already built in v3.2)

**Detection:**
- Open browser DevTools Network tab, filter by `EventSource` -- should see exactly ONE SSE connection
- Check for duplicate REST polling in the Network timeline

**Phase to address:**
The data integration phase when dashboard data is wired into the map page. Plan the data architecture before writing any code.

---

### Pitfall 5: Route Removal Leaves Dead References and Broken Navigation

**What goes wrong:**
Removing DashboardPage and the `/threat-map` route (since the map now lives at `/dashboard`) leaves dead references scattered across the codebase: sidebar nav items, topbar page title mapping, internal `<Link>` components, quick action buttons, and the existing `<Navigate>` redirect pattern for `/ip-search`.

**Why it happens:**
The codebase has references to `/dashboard` and `/threat-map` in multiple files:
- `App.jsx` line 69: `<Route path="/dashboard" element={<DashboardPage />}>`
- `App.jsx` line 70: `<Route path="/threat-map" element={<ThreatMapPage />}>`
- `frontend/src/data/mock-data.js` line 139: nav item `{ label: 'Dashboard', href: '/dashboard' }`
- `frontend/src/data/mock-data.js` line 153: nav item `{ label: 'Threat Map', href: '/threat-map' }`
- `frontend/src/components/layout/Topbar.jsx` line 8: page title `'/dashboard': 'Dashboard'`
- `frontend/src/components/layout/Topbar.jsx` line 10: page title `'/threat-map': 'Threat Map'`
- `DashboardPage.jsx` lines 572-577: Quick Actions with `<Link to="/threat-map">`

Missing even one reference causes: 404 pages, sidebar highlighting the wrong item, topbar showing "undefined" as page title, or users bookmarking the old `/threat-map` URL getting a blank page.

**Consequences:**
- Users with bookmarked `/threat-map` URLs get 404
- Sidebar shows two separate nav items for what is now one page
- Quick Actions in the old dashboard code (if partially carried over) link to non-existent routes

**Prevention:**
1. Add a redirect: `<Route path="/threat-map" element={<Navigate to="/dashboard" replace />} />`
2. Create a checklist of every file referencing `/dashboard` or `/threat-map` BEFORE starting the route change
3. Run a project-wide grep for both strings after the change to verify zero remaining dead references
4. Update the sidebar nav to show a single "Dashboard" item pointing to `/dashboard`
5. Update Topbar page title mapping
6. Remove the DashboardPage.jsx file entirely (do not leave it as dead code)

**Detection:**
Run `grep -rn "threat-map\|/dashboard" frontend/src/` after route changes. Every hit must be intentional.

**Phase to address:**
Route restructuring phase. Should be a dedicated phase (not mixed with overlay panel work) to keep the diff clean and reviewable.

---

## Moderate Pitfalls

### Pitfall 6: Peek-on-Hover Conflicts with Map Marker Hover

**What goes wrong:**
The "peek sliver" design requires `mouseenter` on a thin edge strip to reveal the collapsed panel. But if map markers are positioned near the left or right edge of the viewport, their hover tooltips conflict with the peek trigger zone. The user hovers near the edge intending to inspect a marker, and the overlay panel slides out, covering the marker.

**Prevention:**
1. Make the peek sliver narrow (8-12px) and visually distinct (subtle border glow) so it reads as a UI control, not empty space
2. Add a small delay (150-200ms) before peek-on-hover triggers, using the same `setTimeout` + `clearTimeout` pattern already used in `Sidebar.jsx` lines 15-26 (hover timer with 150ms delay)
3. When a peek panel is revealed via hover, do NOT expand it to full width -- show a condensed preview (maybe just the section titles or summary numbers) that requires an explicit click to fully expand
4. Consider making peek only work when panels are collapsed via the toggle button, not when they slide off due to a map interaction

**Detection:**
Place a test marker at the left edge of the map. Hover near the left edge. Panel should not interfere with marker tooltip.

**Phase to address:**
Peek-on-hover implementation phase.

---

### Pitfall 7: Framer Motion Slide Animation Triggers Leaflet Map Resize

**What goes wrong:**
When overlay panels slide in or out, the visible map area effectively changes. Leaflet does NOT automatically detect container size changes. Map tiles may not load for newly exposed areas, or the map center shifts unexpectedly.

**Prevention:**
1. The overlay panels sit ON TOP of the map (position: absolute), not beside it. The map container size does NOT change -- this is the correct architectural choice and must be preserved. Do NOT use flexbox to split space between panels and map.
2. If for any reason the map container does resize, call `map.invalidateSize()` after the animation completes. The `leafletMapRef.current` from ThreatMapPage.jsx (line 41) provides direct access.
3. Framer Motion's `onAnimationComplete` callback is the correct place to call `invalidateSize()` if needed.

**Detection:**
Toggle panels in and out. Check for gray/blank tile areas at map edges. Verify map center does not shift on toggle.

**Phase to address:**
Overlay panel layout phase. Verify map tiles load correctly after first slide animation is implemented.

---

### Pitfall 8: Glassmorphism `backdrop-filter: blur()` Performance Over Map Tiles

**What goes wrong:**
The `glass-card` and `glass-panel` CSS classes use `backdrop-filter: blur(20px)` and `blur(24px)`. When these panels overlay a continuously-updating Leaflet map with tile transitions, zoom animations, and pulse markers, the browser must re-composite the blur effect on every frame. This causes dropped frames, janky scroll inside the panel, and high GPU memory usage.

**Prevention:**
1. Use a solid or near-solid background for overlay panels instead of heavy blur. The `glass-card-static` class (glassmorphism.css line 17) with `background: rgba(15, 17, 23, 0.7)` is better than `glass-card` because it avoids the hover transition. But even 0.7 opacity with blur is expensive over a dynamic map.
2. Recommended approach: Use `background: rgba(15, 17, 23, 0.92)` (nearly opaque) with a thin `backdrop-filter: blur(4px)` (minimal blur). The dark theme makes near-opaque backgrounds look intentional. Save heavy blur for static pages.
3. Avoid `backdrop-filter` entirely on the scrollable indicators table container -- blur re-composites on every scroll frame.
4. Use CSS `will-change: transform` on the overlay panel to force GPU layer promotion, keeping blur compositing isolated from the map layer.

**Detection:**
Open Chrome DevTools Performance tab. Toggle panels, scroll indicators table, zoom map simultaneously. Look for long "Composite Layers" tasks and frame drops below 60fps.

**Phase to address:**
Overlay panel styling phase. Decide on blur strategy before building all panel variants.

---

### Pitfall 9: Dashboard Auto-Refresh Conflicts with Map SSE Updates

**What goes wrong:**
The merged page will have two concurrent data update mechanisms: SSE for map events (real-time, sub-second) and REST polling for dashboard stats (every 5 minutes). When the 5-minute auto-refresh fires and updates stat card counts, it can cause a visible re-render that interrupts the user's interaction with the map or causes the overlay panels to "jump" (layout shift from number changes).

**Prevention:**
1. Use `silentRefresh` pattern already established in v3.2 -- update state without setting `loading: true`, so no skeleton flash
2. Animate number changes with a subtle count-up transition (CSS `countUp` animation from animations.css) instead of instant replacement
3. Ensure stat card re-renders do NOT trigger overlay panel re-render. Keep stat data in its own state, separate from panel visibility state. React will batch updates, but verify.
4. Consider increasing the auto-refresh interval to 10 minutes for dashboard stats (they are server-cached at 15min anyway, so 5min polling mostly returns identical data)

**Detection:**
Wait for auto-refresh to fire while interacting with the map. Verify no layout shift, no scroll position reset in indicators table, no panel animation restart.

**Phase to address:**
Data integration phase when dashboard REST endpoints are wired in.

---

### Pitfall 10: Toggle State Lost on Route Navigation

**What goes wrong:**
User collapses overlay panels via toggle button, navigates to another page, then returns to `/dashboard`. Panels are expanded again because component remounted with default state (`collapsed: false`).

**Prevention:**
Store panel toggle state in `localStorage` or `sessionStorage`, similar to the existing pattern for trial banner dismiss (`sessionStorage` usage noted in Key Decisions). Use `useState` with lazy initializer:
```jsx
const [collapsed, setCollapsed] = useState(() => {
  return localStorage.getItem('mapPanelsCollapsed') === 'true';
});
useEffect(() => {
  localStorage.setItem('mapPanelsCollapsed', String(collapsed));
}, [collapsed]);
```

**Detection:**
Toggle panels, navigate away, navigate back. Panels should retain collapsed/expanded state.

**Phase to address:**
Toggle button implementation phase.

---

## Minor Pitfalls

### Pitfall 11: Existing Map Widgets Overlap New Overlay Panels

**What goes wrong:**
The current ThreatMapPage has left-side widgets (ThreatMapCounters, ThreatMapCountries, ThreatMapDonut at `left-4 top-4`) and a bottom-right feed (ThreatMapFeed at `bottom-4 right-4`). The new left and right overlay panels will occupy the same screen real estate, causing visual overlap.

**Prevention:**
The existing widgets must be incorporated into or replaced by the new overlay panels. The left overlay panel should absorb the counter/country/donut widgets. The right overlay panel replaces the feed position. Do not try to keep both the old widgets AND the new panels -- that is a layout collision.

**Phase to address:**
First overlay panel phase. Map out which existing widgets go where before coding.

---

### Pitfall 12: DashboardPage Public Route Becomes Protected

**What goes wrong:**
The current `/dashboard` route is inside `<ProtectedRoute />` (App.jsx line 69), requiring auth + verified + onboarded. But the current DashboardPage data endpoints are documented as "Public dashboard routes (no auth)" in Key Decisions. The ThreatMapPage at `/threat-map` is also behind `<ProtectedRoute />`. If the merged page stays protected, unauthenticated users lose access to the dashboard entirely.

**Prevention:**
Decide auth policy upfront:
- Option A: Keep `/dashboard` protected (current behavior for both routes) -- simplest, no backend changes needed. SSE requires auth anyway for the stream connection.
- Option B: Make the merged page publicly accessible with degraded state -- show map with snapshot data only (no SSE), hide auth-only widgets (credit balance, recent searches). This requires moving the route outside `<ProtectedRoute />` and adding conditional rendering.

Recommendation: Option A (keep protected). The threat map with SSE streaming is the core feature and requires auth. The public landing page already serves as the unauthenticated entry point.

**Phase to address:**
Route restructuring phase. Decide before any route changes.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Route restructuring | Dead references to `/threat-map` and old `/dashboard` | Grep-based audit after every route change (Pitfall 5) |
| Overlay panel layout | Z-index war with Leaflet panes | Use `z-[1000]`, panels as siblings not children of map container (Pitfall 2) |
| Overlay panel layout | Event propagation through panels | `L.DomEvent.disableClickPropagation` + `disableScrollPropagation` on every panel (Pitfall 1) |
| Framer Motion animation | Transform stacking context breaks z-index | Wrapper div holds z-index, motion div handles transform (Pitfall 3) |
| Framer Motion animation | Map resize on panel toggle | Panels overlay map (position: absolute), do not resize it (Pitfall 7) |
| Glassmorphism styling | `backdrop-filter: blur` performance over dynamic map | Near-opaque background with minimal blur (Pitfall 8) |
| Peek-on-hover | Conflicts with map marker hover | 150ms delay, narrow trigger zone, condensed preview (Pitfall 6) |
| Dashboard data merge | Dual SSE connections | Keep one SSE for map, REST for dashboard stats, extract into hooks (Pitfall 4) |
| Dashboard data merge | Auto-refresh layout shift | Silent refresh, animated number transitions (Pitfall 9) |
| Toggle button | State lost on navigation | localStorage persistence (Pitfall 10) |
| Existing widget merge | Old and new widgets overlap | Old widgets absorbed into new panels, not coexisting (Pitfall 11) |
| Auth/route decision | Public vs protected access change | Decide upfront, keep protected (Pitfall 12) |

## "Looks Done But Isn't" Checklist

- [ ] Click inside overlay panel -- map does NOT pan
- [ ] Scroll inside indicators table -- map does NOT zoom
- [ ] Double-click text in overlay -- map does NOT zoom in
- [ ] Drag inside overlay panel -- map does NOT pan
- [ ] Right-click in overlay panel -- no Leaflet context menu
- [ ] Toggle panel slide animation -- no z-index flicker mid-animation
- [ ] Map zoom in/out while panel is visible -- no tile flash-through overlay
- [ ] Open map marker popup near panel edge -- popup renders below panel
- [ ] Hover near panel edge with nearby marker -- peek does not steal marker hover
- [ ] Toggle panels collapsed, navigate away, return -- panels still collapsed
- [ ] Scroll indicators table while map is animating -- no frame drops below 30fps
- [ ] Auto-refresh fires -- no visible layout shift in panels
- [ ] Browser Network tab shows exactly ONE SSE connection on merged page
- [ ] Navigate to bookmarked `/threat-map` -- redirects to `/dashboard`
- [ ] Grep for `/threat-map` across `frontend/src/` -- only the redirect route remains
- [ ] DashboardPage.jsx file is deleted (not just unused)
- [ ] Sidebar shows single "Dashboard" nav item (not separate Dashboard + Threat Map)
- [ ] Topbar shows correct page title for `/dashboard`

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Event propagation through overlay (1) | LOW | Add `useMapOverlay` hook with `L.DomEvent` calls; apply to each panel ref; 15 min |
| Z-index war (2) | LOW | Verify `z-[1000]` on all overlay wrappers; ensure panels are map siblings; 10 min |
| Stacking context from Framer Motion (3) | MEDIUM | Restructure DOM: wrapper div for z-index, inner motion.div for animation; test all panels; 30 min |
| Dual SSE connections (4) | LOW if caught early, HIGH if architecture baked in | Extract to separate hooks before merging; verify with Network tab; 20 min |
| Dead route references (5) | LOW | Grep + fix each reference; add redirect; 30 min |
| Peek-hover conflict with markers (6) | LOW | Add setTimeout delay, narrow trigger zone; 20 min |
| Map resize on toggle (7) | LOW | Ensure panels use position:absolute overlay (not flexbox layout); 10 min |
| Blur performance over map (8) | MEDIUM | Replace `backdrop-filter: blur(20px)` with `blur(4px)` + near-opaque bg; test all panel variants; 30 min |
| Auto-refresh layout shift (9) | LOW | Apply silentRefresh pattern from v3.2; 15 min |
| Toggle state lost (10) | LOW | Add localStorage read/write; 10 min |

## Sources

- Direct codebase analysis: `frontend/src/pages/ThreatMapPage.jsx` (full-viewport map with z-[1000] overlays, useThreatStream, pulse markers)
- Direct codebase analysis: `frontend/src/pages/DashboardPage.jsx` (REST endpoints, auto-refresh interval, auth-gated widgets)
- Direct codebase analysis: `frontend/src/hooks/useLeaflet.js` (map initialization, attributionControl: false, marker layer management)
- Direct codebase analysis: `frontend/src/hooks/useThreatStream.js` (SSE EventSource with reconnection, visibility-aware disconnect, snapshot loading)
- Direct codebase analysis: `frontend/src/App.jsx` (route structure, ProtectedRoute wrapping)
- Direct codebase analysis: `frontend/src/data/mock-data.js` lines 139, 153 (NAV_CATEGORIES with /dashboard and /threat-map items)
- Direct codebase analysis: `frontend/src/components/layout/Topbar.jsx` lines 8, 10 (page title mappings)
- Direct codebase analysis: `frontend/src/components/layout/Sidebar.jsx` (hover timer pattern at 150ms delay)
- Direct codebase analysis: `frontend/src/styles/glassmorphism.css` (glass-card with backdrop-filter: blur(20px))
- Direct codebase analysis: `frontend/src/styles/animations.css` (mapEventPulse, countUp animations)
- [Leaflet overlay event propagation](https://copyprogramming.com/howto/make-overlaying-div-on-leaflet-not-click-through) -- L.DomEvent.disableClickPropagation pattern
- [Leaflet DomEvent.stopPropagation in React](https://github.com/PaulLeCam/react-leaflet/issues/765) -- useRef + useEffect integration
- [Leaflet internal z-index pane hierarchy](https://github.com/Leaflet/Leaflet/issues/8958) -- tile 200, marker 600, popup 700
- [Framer Motion GPU acceleration and compositing](https://motion.dev/docs/performance) -- transform creates new stacking context, prefer transform+opacity
- [Framer Motion performance tier list](https://motion.dev/magazine/web-animation-performance-tier-list) -- compositor-only properties for 60fps
- [Leaflet disableScrollPropagation](https://github.com/Leaflet/Leaflet/issues/5594) -- scroll event blocking on overlay elements
- [Leaflet map z-index DOM events interference](https://community.openstreetmap.org/t/leaflet-map-is-unaffected-by-z-index-interferes-with-overlayed-dom-events/114778)
- CSS Specification: `transform` property establishes new stacking context (confirmed behavior)
- All findings HIGH confidence based on direct code inspection and verified Leaflet behavior

---
*Pitfalls research for: AQUA TIP v3.3 -- Threat Map Dashboard*
*Researched: 2026-04-05*
