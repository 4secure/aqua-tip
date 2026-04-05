# Project Research Summary

**Project:** Aqua TIP v3.3 -- Threat Map Dashboard Overlay Panels
**Domain:** SOC Threat Intelligence Platform -- Map-centric dashboard with overlay widgets
**Researched:** 2026-04-05
**Confidence:** HIGH

## Executive Summary

Aqua TIP v3.3 merges the existing DashboardPage and ThreatMapPage into a single full-viewport map dashboard at `/dashboard`. The approach is well-established in SOC tooling (Check Point ThreatCloud, Radware, Kaspersky Cybermap): a Leaflet map fills the viewport while glassmorphism overlay panels float on top with stat cards (left) and an indicators table (right). Panels collapse via a toggle button and reveal on hover through a peek-on-sliver interaction. This is purely a frontend refactor -- zero new dependencies, zero new backend endpoints, zero database migrations. Every technology needed (React 19, Framer Motion 12, Leaflet 1.9, Tailwind 3, Lucide React) is already installed and actively used.

The recommended approach is component extraction and recomposition: pull inline sub-components out of DashboardPage (StatCard, IndicatorsTable, config constants), extract data-fetching logic into a `useDashboardData` hook, build two overlay panel shells with Framer Motion slide animations, then wire everything into a new `ThreatMapDashboard` page that composes the map and both panels. The existing threat-map components (Counters, Countries, Donut, Feed, Status) import directly into the left overlay panel with zero modifications.

The primary risks are Leaflet event propagation through overlay panels (clicks/scrolls leaking to the map), CSS stacking context conflicts from Framer Motion transforms breaking z-index layering, and dead route references after removing DashboardPage. All three have proven prevention patterns: `L.DomEvent.disableClickPropagation`, wrapper-div z-index isolation, and grep-based auditing. The build order is designed so each risk is addressed in the phase where it first appears, not retroactively.

## Key Findings

### Recommended Stack

Zero new dependencies. The existing stack covers every requirement. This continues the project pattern where v2.1, v3.0, v3.1, and v3.2 all shipped without adding packages. See [STACK.md](./STACK.md) for full analysis.

**Core technologies (all already installed):**
- **React 19** (^19.2.4): `useState` for 3 panel booleans, `useCallback` for hover handlers, `useRef` for Leaflet DOM event blocking
- **Framer Motion** (^12.35.2): `motion.div` with `animate={{ x }}` for panel slide, `onHoverStart`/`onHoverEnd` for peek, `AnimatePresence` for mount/unmount -- already used in 5+ components
- **Leaflet** (^1.9.4): Existing full-viewport map unchanged; overlays are DOM siblings, not Leaflet layers or plugins
- **Tailwind CSS 3** (^3.4.19): Glassmorphism panel styling (`glass-card-static`), absolute positioning, `z-[1000]`, `pointer-events-none`/`auto` pattern
- **Lucide React** (^0.577.0): Toggle button icons (`PanelLeftClose`/`PanelLeftOpen`)

**Backend:** No changes. Existing endpoints `GET /api/dashboard/counts`, `GET /api/dashboard/indicators`, SSE `/api/threat-map/stream`, and `GET /api/threat-map/snapshot` provide all required data.

### Expected Features

See [FEATURES.md](./FEATURES.md) for complete feature landscape, dependency graph, interaction state machine, and component extraction plan.

**Must have (table stakes):**
- Full-viewport Leaflet map at `/dashboard` replacing the old scrollable dashboard
- Left overlay panel with 7 stat cards (entity type counts)
- Right overlay panel with recent indicators table
- Toggle button to collapse/expand both panels simultaneously
- Smooth Framer Motion slide animation on toggle
- All existing map features preserved (SSE feed, pulse markers, counters, countries, donut, connection status)
- Independent widget loading states (no blank panels, no map render blocking)
- DashboardPage deletion with `/threat-map` redirect to `/dashboard`

**Should have (differentiators):**
- Peek-on-hover with edge sliver (collapsed panels temporarily reveal on hover)
- Independent left/right hover reveal (hover left edge reveals only left panel)
- Auth-aware panel content (guests see CTA, authenticated users see full data)

**Defer (not v3.3 scope):**
- Draggable/resizable panels
- Customizable widget order / drag-and-drop
- Attack bar chart in overlay (ThreatMapDonut covers same use case compactly)
- Quick Actions in overlay (sidebar covers this)
- Mobile-responsive bottom-sheet panels
- Panel docking/undocking (pop-out windows)
- Mini-map or map-in-map inset

### Architecture Approach

The architecture promotes the existing Leaflet map to full-viewport background and layers dashboard widgets as collapsible overlay panels using absolute positioning (the same pattern already proven in ThreatMapPage lines 79-88). Data flows through three hooks: `useThreatStream` (existing, SSE map events), `useDashboardData` (new, extracted REST calls), and `useOverlayPanels` (new, collapse/peek state). The page component `ThreatMapDashboard` is purely compositional (80-120 lines), delegating all logic to hooks and all rendering to child components. See [ARCHITECTURE.md](./ARCHITECTURE.md) for full component specs, data flow diagram, and build order.

**Major components:**
1. **ThreatMapDashboard** (page) -- Composes map + overlays + hooks, replaces both DashboardPage and ThreatMapPage
2. **OverlayPanelLeft** -- 7 compact stat cards + existing ThreatMapCounters/Countries/Donut, collapsible with Framer Motion
3. **OverlayPanelRight** -- Compact indicators table, collapsible independently
4. **OverlayToggle** -- Floating glassmorphism button controlling both panels
5. **useDashboardData** (hook) -- Extracted from DashboardPage, fetches counts + indicators with 5-min auto-refresh
6. **useOverlayPanels** (hook) -- Manages collapsed boolean + per-panel peek state

**Files impact:** 8 new files, 2 modified (App.jsx, mock-data.js), 2 deleted (DashboardPage.jsx, ThreatMapPage.jsx). Zero backend changes.

### Critical Pitfalls

See [PITFALLS.md](./PITFALLS.md) for the full list with detection strategies, phase warnings, recovery costs, and a "looks done but isn't" checklist.

1. **Event propagation through overlay panels to Leaflet** -- Clicks, drags, and scrolls inside panels leak to the map underneath. Apply `L.DomEvent.disableClickPropagation()` and `L.DomEvent.disableScrollPropagation()` on every overlay panel ref. Create a reusable `useMapOverlay(ref)` hook.

2. **Framer Motion transform creates new stacking context** -- `animate={{ x }}` applies CSS `transform`, creating a stacking context that can cause panels to render behind the map mid-animation. Fix: wrap `motion.div` inside a positioned div that holds the z-index, so stacking context is established before the transform.

3. **Dead route references after DashboardPage removal** -- `/threat-map` and `/dashboard` are referenced in App.jsx, mock-data.js nav config, Topbar page titles, and DashboardPage Quick Actions links. Grep-audit after every route change. Add `<Navigate to="/dashboard" replace />` for `/threat-map`.

4. **Leaflet z-index war with overlay panels** -- Leaflet manages internal z-index (tiles: 200, markers: 600, popups: 700). Panels at `z-[1000]` work if they remain DOM siblings of the map container, not children. Preserve the existing sibling pattern.

5. **Backdrop-filter blur performance over dynamic map** -- `glass-card` uses `backdrop-filter: blur(20px)` which is expensive over continuously-updating map tiles. Use near-opaque background (`rgba(15,17,23,0.92)`) with minimal blur (`blur(4px)`) for overlay panels.

## Implications for Roadmap

Based on research, suggested phase structure (6 phases following architecture dependency chains):

### Phase 1: Hook Extraction
**Rationale:** Zero-risk extraction that unblocks all subsequent phases. Both hooks are independent and can be built in parallel.
**Delivers:** `useDashboardData` hook (extracted REST calls) + `useOverlayPanels` hook (collapse/peek state management)
**Addresses:** Data fetching reuse (table stakes), panel state management
**Avoids:** Dual SSE connection pitfall (Pitfall 4) by keeping REST and SSE separate from the start

### Phase 2: Map Page Foundation
**Rationale:** Must have the map rendering at `/dashboard` before adding any overlays. Validates that existing map features survive the route change.
**Delivers:** `ThreatMapDashboard` page with full-viewport map, SSE events, all existing map widgets. Route swap in App.jsx, `/threat-map` redirect, sidebar nav update.
**Addresses:** Full-viewport map (table stakes), preserved map features (table stakes), DashboardPage removal (table stakes)
**Avoids:** Dead route references (Pitfall 5) -- includes grep audit as verification step

### Phase 3: Overlay Panel Components
**Rationale:** With hooks and map foundation in place, build the visual overlay components. This is the largest phase but has clear component boundaries.
**Delivers:** `OverlayPanelLeft` (stat cards + map widgets), `OverlayPanelRight` (indicators table), `OverlayToggle` button, `StatCardCompact`, `IndicatorsTableCompact`
**Addresses:** Left/right overlay panels (table stakes), toggle button (table stakes), smooth animation (table stakes), independent loading states (table stakes)
**Avoids:** Event propagation (Pitfall 1) -- apply `useMapOverlay` from day one. Z-index war (Pitfall 2) -- panels as siblings with wrapper z-index. Stacking context (Pitfall 3) -- wrapper div pattern. Blur performance (Pitfall 8) -- near-opaque with minimal blur.

### Phase 4: Peek-on-Hover Behavior
**Rationale:** Peek is the trickiest UX interaction and depends on the toggle/collapse system from Phase 3. Isolating it prevents animation tuning from blocking functional delivery.
**Delivers:** Edge sliver visible when collapsed, hover-to-peek with 150ms enter delay and 200ms leave delay, independent left/right peek
**Addresses:** Peek-on-hover (differentiator), independent hover reveal (differentiator)
**Avoids:** Peek-hover conflicts with map markers (Pitfall 6) -- narrow trigger zone + delay

### Phase 5: Polish and Auth Integration
**Rationale:** Auth-aware content and animation polish depend on the full panel system being functional.
**Delivers:** Auth-gated widget rendering in right panel, spring animation tuning, silent auto-refresh for dashboard data, toggle state persistence in localStorage
**Addresses:** Auth-aware panel content (differentiator)
**Avoids:** Auto-refresh layout shift (Pitfall 9), toggle state loss (Pitfall 10)

### Phase 6: Cleanup and Verification
**Rationale:** Delete dead code only after the replacement is fully verified. Reversible if issues are found.
**Delivers:** DashboardPage.jsx deleted, ThreatMapPage.jsx deleted, dead imports removed from App.jsx, final grep audit confirming zero dead references
**Addresses:** Clean codebase, no dead code

### Phase Ordering Rationale

- **Phase 1 before 2-3:** Hooks must exist before the page and components that consume them. `useDashboardData` and `useOverlayPanels` are independent of each other so they can be built as parallel tasks within Phase 1.
- **Phase 2 before 3:** The map page must render correctly at `/dashboard` before overlay panels are layered on top. This validates the route change and map integration in isolation.
- **Phase 3 before 4:** Peek-on-hover requires the collapse/expand toggle system to exist. The sliver is only relevant when panels are collapsed.
- **Phase 5 after 3-4:** Auth integration and polish are additive enhancements that do not change the core layout or interaction model.
- **Phase 6 last:** Deleting old files is irreversible from a git perspective (without revert). Do it only after full verification.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Overlay Panels):** Most complex phase with Leaflet event propagation, z-index management, and Framer Motion stacking context issues. The pitfalls research covers prevention patterns in detail, but implementation will need careful testing of the wrapper-div z-index pattern and `L.DomEvent` integration with React refs.
- **Phase 4 (Peek-on-Hover):** The 3-state interaction model (expanded/collapsed/peeking) with independent per-panel peek and hover delays has nuanced edge cases around rapid mouse movement and animation interruption.

Phases with standard patterns (skip `/gsd:research-phase`):
- **Phase 1 (Hook Extraction):** Straightforward extraction of existing inline code into custom hooks. Well-documented React pattern.
- **Phase 2 (Map Page Foundation):** Route swapping and component composition. The existing ThreatMapPage is the direct template.
- **Phase 5 (Polish):** Auth checks already exist in codebase. localStorage persistence is trivial. Silent refresh pattern established in v3.2.
- **Phase 6 (Cleanup):** File deletion and grep audit. Mechanical work.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero new dependencies. Every technology verified as already installed and actively used in the codebase. Continues 4-milestone pattern of zero-dep milestones. |
| Features | HIGH | Features grounded in existing codebase analysis (components identified with exact line numbers) and SOC/TIP UX research from multiple authoritative sources. Anti-features well-justified. |
| Architecture | HIGH | All recommendations build on verified patterns already in the codebase (ThreatMapPage overlay positioning, hook extraction, Framer Motion usage). Component specs include estimated line counts and prop interfaces. |
| Pitfalls | HIGH | 12 pitfalls identified via direct codebase analysis with verified Leaflet event propagation behavior, CSS stacking context specs, and Framer Motion documentation. Recovery strategies and costs included for each. |

**Overall confidence:** HIGH

### Gaps to Address

- **Spring animation tuning:** The recommended `{ stiffness: 300, damping: 30 }` transition config is a common starting point but may need iteration. Plan for tuning time in Phase 3.
- **Compact stat card layout:** StatCardCompact needs a single-row design (icon-dot + label + count) to fit 7 cards in a 280px panel without excessive scrolling. The exact layout has not been prototyped -- validate during Phase 3 implementation.
- **Peek hover timing:** The 150ms enter / 200ms leave delay values come from the existing Sidebar hover pattern. They may feel different on a full-viewport map with edge slivers. Plan for tuning in Phase 4.
- **Blur performance threshold:** The recommendation to use `blur(4px)` instead of `blur(20px)` over the map is based on general performance knowledge, not benchmarked on this specific codebase. Verify with Chrome DevTools Performance tab during Phase 3.
- **Existing map widget fit inside left panel:** ThreatMapCounters, Countries, and Donut were designed for a 340px column. They need to render correctly at 280px inside the overlay panel. May require minor width adjustments.

## Sources

### Primary (HIGH confidence)
- Direct codebase: `ThreatMapPage.jsx` -- absolute overlay positioning pattern (lines 79-88), pulse markers, SSE integration
- Direct codebase: `DashboardPage.jsx` -- StatCard, IndicatorsTable, config constants, data fetching (581 lines)
- Direct codebase: `App.jsx` -- routing structure (lines 62-76), ProtectedRoute wrapping
- Direct codebase: `useLeaflet.js` -- map init, attributionControl: false, marker layer management
- Direct codebase: `useThreatStream.js` -- SSE EventSource, visibility-aware disconnect, snapshot loading
- Direct codebase: `mock-data.js` NAV_CATEGORIES (lines 135-157)
- Direct codebase: `Topbar.jsx` page title mappings (lines 8, 10)
- Direct codebase: `glassmorphism.css` -- glass-card-static class definition
- Direct codebase: `package.json` -- framer-motion@^12.35.2, react@^19.2.4, leaflet@^1.9.4

### Secondary (MEDIUM confidence)
- Framer Motion gesture docs -- `onHoverStart`/`onHoverEnd` standard props on motion components
- Framer Motion performance docs -- transform creates new stacking context, compositor-only properties
- Leaflet DomEvent propagation -- `L.DomEvent.disableClickPropagation` and `disableScrollPropagation` patterns
- Leaflet internal z-index pane hierarchy -- tile 200, marker 600, popup 700
- CSS specification -- `transform` property establishes new stacking context

### Tertiary (LOW confidence)
- SOC dashboard UX patterns from medium.com, aufaitux.com, pencilandpaper.io -- general design principles, not codebase-specific
- Check Point ThreatCloud, Radware live threat maps -- visual reference for overlay panel patterns

---
*Research completed: 2026-04-05*
*Ready for roadmap: yes*
