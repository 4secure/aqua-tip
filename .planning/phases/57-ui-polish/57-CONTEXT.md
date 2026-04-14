# Phase 57: UI Polish - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix visual/UX issues across the app: Settings page centering, globe render timing, landing scroll jank, custom scrollbar styling, favicon, and threat map sidebar z-index. All are CSS/animation/asset fixes — no new features.

</domain>

<decisions>
## Implementation Decisions

### Settings Page Centering
- **D-01:** Center the profile form card using `mx-auto` with the existing `max-w-2xl` — match the pattern used on other content pages for consistency

### Globe Render Timing
- **D-02:** Bundle the GeoJSON land data locally as a static import instead of fetching from GitHub at runtime. The 110m land file (~24KB gzipped) eliminates the empty purple circle on first render — land dots appear on first paint
- **D-03:** The issue is NOT about opacity — the globe shell (purple circle) renders immediately but land features only appear after the async fetch completes. Bundling removes this delay entirely

### Landing Page Animation Smoothness
- **D-04:** Globe stutters during scroll. Likely caused by heavy D3 canvas re-rendering (dots, pings, rotation timer) competing with Framer Motion spring transforms on the same frame. Fix should reduce the rendering conflict — e.g., pause the rotation timer during active scroll, reduce dot count, or throttle canvas renders when scroll is active

### Custom Scrollbar
- **D-05:** Thin minimal scrollbar: ~4px wide thumb, rounded, using theme colors (violet or border color). Transparent track background — no visible track. No up/down arrow buttons. Apply globally via CSS `::-webkit-scrollbar` and `scrollbar-width`/`scrollbar-color` for Firefox

### Favicon
- **D-06:** Generate favicon from existing `frontend/public/logo.png`. Create standard sizes (16x16, 32x32, apple-touch-icon 180x180). Reference in `index.html`

### Threat Map Sidebar Z-Index
- **D-07:** Desktop sidebar goes behind the Leaflet map and overlay widgets when opened on the Threat Map page. Leaflet creates its own stacking context with high z-index values. Fix by ensuring the sidebar z-index stacks above the map container — likely needs `z-[1001]` or higher, or constraining the map's z-index

### Claude's Discretion
- Spring config tuning values (stiffness/damping) for scroll smoothness
- Exact scrollbar color choice (violet vs border-light)
- Favicon generation approach (manual resize vs build tool)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs — requirements fully captured in decisions above

### Key Source Files
- `frontend/src/pages/SettingsPage.jsx` — Settings form centering target
- `frontend/src/components/ui/Globe.jsx` — D3 globe with async GeoJSON fetch
- `frontend/src/components/landing/LandingScroll.jsx` — Framer Motion scroll animations
- `frontend/src/components/layout/Sidebar.jsx` — Sidebar z-index definitions
- `frontend/src/styles/main.css` — Global CSS (scrollbar styles go here)
- `frontend/index.html` — Favicon link tags

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Globe component (`Globe.jsx`) is already `memo`-wrapped with DPR capping at 1.5
- `IntersectionObserver` already pauses rotation when globe is off-screen
- Sidebar already uses `z-40` (desktop) and `z-50` (mobile/hover) — Topbar uses `z-30`

### Established Patterns
- Glassmorphism cards: `bg-surface/60 border border-border backdrop-blur-sm`
- Theme colors defined in `tailwind.config.js`: violet, cyan, red, green, amber
- CSS split across 4 files in `styles/` — scrollbar styles belong in `main.css`

### Integration Points
- GeoJSON currently fetched from `https://raw.githubusercontent.com/martynafford/natural-earth-geojson/.../ne_110m_land.json`
- Leaflet map in ThreatMapPage creates its own stacking context conflicting with sidebar z-40
- LandingScroll uses `useSpring` with stiffness: 80, damping: 20 — may need tuning

</code_context>

<specifics>
## Specific Ideas

- User reported globe shows empty purple circle on first load — confirmed: `loadWorldData()` async fetch causes visible delay before land dots render
- User reported globe stutters specifically during scroll — not general sluggishness
- User wants scrollbar with NO track background and NO arrow buttons — minimal/invisible track

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 57-ui-polish*
*Context gathered: 2026-04-14*
