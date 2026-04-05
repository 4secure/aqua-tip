# Architecture Patterns

**Domain:** Threat Map Dashboard Overlay Integration (v3.3)
**Researched:** 2026-04-05
**Confidence:** HIGH (all recommendations based on direct codebase analysis, no new external dependencies)

## Recommended Architecture

Merge ThreatMapPage into the `/dashboard` route by promoting the threat map to full-viewport background and layering dashboard widgets as collapsible overlay panels. DashboardPage is deleted entirely; its stat card and indicator data move into a new overlay panel system rendered on top of the existing map.

### High-Level Layout

```
+------------------------------------------------------------------+
| AppLayout (Sidebar + Topbar)                                      |
|  +--------------------------------------------------------------+|
|  | ThreatMapDashboard (full viewport, -m-6 offset)              ||
|  |                                                              ||
|  |  +----------+                              +----------+      ||
|  |  | LEFT     |    LEAFLET MAP (full bg)     | RIGHT    |      ||
|  |  | OVERLAY  |    + SSE pulse markers       | OVERLAY  |      ||
|  |  |----------|    + ThreatMapStatus (top)    |----------|      ||
|  |  | 7 stat   |                              | Recent   |      ||
|  |  | cards    |                              | Indic.   |      ||
|  |  |----------|                              | table    |      ||
|  |  | Counters |                              |          |      ||
|  |  | Countries|                              |          |      ||
|  |  | Donut    |                              +----------+      ||
|  |  +----------+                                                ||
|  |                                                              ||
|  |  [toggle btn]              ThreatMapFeed (bottom-right)      ||
|  +--------------------------------------------------------------+|
+------------------------------------------------------------------+
```

## Component Boundaries

| Component | Responsibility | Status | Communicates With |
|-----------|---------------|--------|-------------------|
| `ThreatMapDashboard` | New page at `/dashboard`, replaces DashboardPage + ThreatMapPage | **NEW** | useLeaflet, useThreatStream, useDashboardData, useOverlayPanels |
| `OverlayPanelLeft` | Collapsible left panel: stat cards + existing map widgets | **NEW** | ThreatMapDashboard (visibility state, data props) |
| `OverlayPanelRight` | Collapsible right panel: indicators table | **NEW** | ThreatMapDashboard (visibility state, indicator data) |
| `OverlayToggle` | Single button to collapse/expand both panels | **NEW** | ThreatMapDashboard (toggle callback) |
| `StatCardCompact` | Compact stat card for overlay use (narrower) | **NEW** | OverlayPanelLeft (count data) |
| `IndicatorsTableCompact` | Compact indicators table for overlay | **NEW** | OverlayPanelRight (indicator data) |
| `useDashboardData` | Hook extracting dashboard API calls from DashboardPage | **NEW** | apiClient |
| `useOverlayPanels` | Hook managing panel collapse + peek state | **NEW** | localStorage |
| `ThreatMapCounters` | Existing: global threat counters | **KEEP** (renders inside left panel) | useThreatStream |
| `ThreatMapCountries` | Existing: top source countries | **KEEP** (renders inside left panel) | useThreatStream |
| `ThreatMapDonut` | Existing: attack type distribution | **KEEP** (renders inside left panel) | useThreatStream |
| `ThreatMapFeed` | Existing: live event feed | **KEEP** (stays bottom-right) | useThreatStream |
| `ThreatMapStatus` | Existing: connection status banner | **KEEP** (stays top-center) | useThreatStream |
| `useLeaflet` | Existing: Leaflet map initialization | **KEEP** | Leaflet L |
| `useThreatStream` | Existing: SSE + snapshot data | **KEEP** | EventSource, apiClient |
| `DashboardPage` | Current dashboard page | **DELETE** | -- |
| `ThreatMapPage` | Current standalone threat map | **DELETE** | -- |

## Integration Points (Detailed)

### 1. Route Change in App.jsx

**Current state** (lines 69-70 of App.jsx):
```jsx
<Route path="/dashboard" element={<DashboardPage />} />
<Route path="/threat-map" element={<ThreatMapPage />} />
```

**Target state:**
```jsx
<Route path="/dashboard" element={<ThreatMapDashboard />} />
<Route path="/threat-map" element={<Navigate to="/dashboard" replace />} />
```

Import `ThreatMapDashboard` eagerly (not lazy) since it is the primary authenticated view. The `/threat-map` route becomes a redirect to preserve bookmarks and browser history.

### 2. Sidebar Navigation Update

**Current** in `mock-data.js` NAV_CATEGORIES (lines 135-157):
- Overview category: Dashboard (`/dashboard`)
- Monitoring category: Threat Map (`/threat-map`), Dark Web (`/dark-web`)

**Target:**
- Overview category: Dashboard (`/dashboard`) -- kept, now shows merged view
- Monitoring category: Remove Threat Map entry. Dark Web remains.

### 3. AppLayout Main Padding Override

**Problem:** AppLayout's `<main>` (line 27) applies `p-6` padding. The threat map needs full-bleed rendering.

**Solution:** Use the same `-m-6` negative margin pattern from ThreatMapPage (line 73). The new `ThreatMapDashboard` wraps itself in:
```jsx
<div className="relative -m-6" style={{ height: 'calc(100vh - 60px)' }}>
```
This is a proven pattern already in the codebase, not a new hack.

### 4. Data Sources Merge

The merged component needs TWO data sources currently in separate pages:

| Data Source | Current Owner | Target |
|-------------|---------------|--------|
| SSE events, counters, countries, types | ThreatMapPage via `useThreatStream()` | `ThreatMapDashboard` calls `useThreatStream()` directly |
| Dashboard counts (7 stat cards) | DashboardPage via inline useEffect | Extract to `useDashboardData()` hook |
| Dashboard indicators (recent table) | DashboardPage via inline useEffect | Extract to `useDashboardData()` hook |
| Dashboard categories (attack chart) | DashboardPage via inline useEffect | **NOT NEEDED** -- out of overlay scope |
| Credits, search history, quick actions | DashboardPage via inline useEffect | **NOT NEEDED** -- sidebar already shows credits |

**Key insight:** The overlay panels only need stat counts and recent indicators. The attack chart, credit widget, recent searches, and quick actions from DashboardPage are NOT part of v3.3. This significantly reduces the data surface.

### 5. Overlay Panel Behavior

**State machine for each panel (left/right independently):**

```
EXPANDED (default) ──[toggle click]──> COLLAPSED
COLLAPSED ──[toggle click]──> EXPANDED
COLLAPSED ──[mouse enter sliver]──> PEEKING
PEEKING ──[mouse leave panel]──> COLLAPSED
```

**Implementation with Framer Motion** (already installed as `framer-motion@^12.35.2`):

```jsx
<motion.div
  animate={{
    x: collapsed && !peeking ? -panelWidth + sliverWidth : 0
  }}
  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
  onMouseEnter={() => collapsed && setPeeking(true)}
  onMouseLeave={() => setPeeking(false)}
  className="absolute top-4 left-4 z-[1000] w-[280px]"
>
  {/* panel content */}
</motion.div>
```

**Dimensions:**
- Sliver width: 6px visible edge when collapsed
- Left panel width: 280px (stat cards stacked + map widgets)
- Right panel width: 360px (indicators table)
- Z-index: 1000 (matches existing map overlay z-index)

**Why spring animation:** Spring handles interruptions (hover during collapse animation) gracefully without easing resets. Already used in landing page animations.

### 6. Existing Map Widget Repositioning

**Current ThreatMapPage widget positions:**
- `top-4 left-4`: Counters, Countries, Donut (stacked in 340px column) -- line 79
- `bottom-4 right-4`: Feed (380px wide) -- line 86
- `top-2 center`: Status banner -- line 76

**Conflict:** The new left overlay panel occupies `top-4 left-4` where existing map widgets live.

**Solution:** Move existing map widgets INSIDE the left overlay panel, below the stat cards. This creates a single cohesive left column:

```
Left Overlay Panel (280px, scrollable)
+----------------------------------+
| StatCardCompact x 7 (stacked)   |  <-- from DashboardPage
|----------------------------------|
| ThreatMapCounters                |  <-- from ThreatMapPage
| ThreatMapCountries               |  <-- from ThreatMapPage
| ThreatMapDonut                   |  <-- from ThreatMapPage
+----------------------------------+
```

This eliminates z-index conflicts entirely. The existing components render inside the overlay panel div instead of as separate absolute-positioned elements. They already use `glass-card-static` styling which works inside any container.

**ThreatMapFeed** stays at `bottom-4 right-4` -- no conflict with the right overlay panel at `top-4 right-4`.

**ThreatMapStatus** stays at `top-2 center` -- no conflict.

### 7. Right Overlay Panel Content

The right panel contains the indicators table from DashboardPage, adapted for narrower width:
- Remove Labels column (too wide for 360px panel)
- Keep columns: Type badge, Value (truncated), Date (relative)
- Show 10 rows max (vs 8 currently)
- Auto-refresh every 5 minutes (carried over from DashboardPage)
- No category filter interaction (attack chart is removed)

## Data Flow Diagram

```
                    +---------------------------+
                    |   ThreatMapDashboard      |
                    |   (page component)        |
                    +-----+-------+-------+-----+
                          |       |       |
            +-------------+       |       +--------------+
            v                     v                      v
   useThreatStream()    useDashboardData()    useOverlayPanels()
            |                     |                      |
   +--------+---------+    +-----+------+          collapsed
   | events  counters |    | counts     |          leftPeeking
   | countries types  |    | indicators |          rightPeeking
   | connected        |    |            |
   +--------+---------+    +-----+------+
            |                     |
   +--------+----------+    +----+----+
   |    |    |    |     |    |         |
   v    v    v    v     v    v         v
 Map  Cnt  Ctry Dnt  Feed  Left      Right
      |    |    |          Panel     Panel
      +----+----+          (stats    (indicators
      (inside left          + map     table)
       panel)               widgets)
```

## New Component Specifications

### ThreatMapDashboard (pages/ThreatMapDashboard.jsx)

```
Responsibilities:
- Full-viewport Leaflet map (via useLeaflet with onReady callback)
- SSE stream connection (via useThreatStream)
- Dashboard data fetching (via useDashboardData)
- Overlay panel state management (via useOverlayPanels)
- Compose all sub-components
- Pulse marker rendering on new SSE events (same logic as ThreatMapPage lines 55-63)
- Event click -> map flyTo behavior (same logic as ThreatMapPage lines 65-69)

Props: none (page component)
State: managed entirely by hooks
Estimated lines: 80-120 (composition only, all logic in hooks)
```

### useDashboardData (hooks/useDashboardData.js)

```
Extracted from DashboardPage useEffect blocks (lines 360-444).

Returns:
  { counts, countsLoading, countsError,
    indicators, indicatorsLoading, indicatorsError }

Fetches:
  GET /api/dashboard/counts
  GET /api/dashboard/indicators
  Auto-refreshes every 5 minutes (reuse useAutoRefresh hook from v3.2)

Does NOT fetch: categories, credits, search history (not needed in overlay)
Estimated lines: 40-60
```

### useOverlayPanels (hooks/useOverlayPanels.js)

```
Returns:
  { collapsed, togglePanels,
    leftPeeking, rightPeeking,
    onLeftEnter, onLeftLeave,
    onRightEnter, onRightLeave }

- collapsed: boolean, persisted to localStorage key 'overlay-panels-collapsed'
- togglePanels: flips collapsed state
- leftPeeking/rightPeeking: ephemeral mouse-driven state
- onLeftEnter/onLeftLeave: handlers for left panel hover
- onRightEnter/onRightLeave: handlers for right panel hover
- Peek only activates when collapsed === true

Estimated lines: 30-40
```

### OverlayPanelLeft (components/dashboard/OverlayPanelLeft.jsx)

```
Props:
  { collapsed, peeking, onMouseEnter, onMouseLeave,
    counts, countsLoading, countsError,
    counters, connected, countryCounts, typeCounts }

Renders:
  - motion.div wrapper with horizontal slide animation
  - Scrollable inner column (max-height: calc(100vh - 120px))
  - 7 StatCardCompact components
  - Divider
  - ThreatMapCounters (existing component, imported directly)
  - ThreatMapCountries (existing component, imported directly)
  - ThreatMapDonut (existing component, imported directly)

Position: absolute top-4 left-4 z-[1000] w-[280px]
Estimated lines: 60-80
```

### OverlayPanelRight (components/dashboard/OverlayPanelRight.jsx)

```
Props:
  { collapsed, peeking, onMouseEnter, onMouseLeave,
    indicators, indicatorsLoading, indicatorsError }

Renders:
  - motion.div wrapper with horizontal slide animation (slides RIGHT when collapsed)
  - IndicatorsTableCompact

Position: absolute top-4 right-4 z-[1000] w-[360px]
Estimated lines: 40-60
```

### OverlayToggle (components/dashboard/OverlayToggle.jsx)

```
Props: { collapsed, onToggle }

Renders:
  - Floating glassmorphism button
  - Icon: PanelLeftClose / PanelLeftOpen from Lucide (or ChevronLeft/Right)
  - Tooltip: "Hide panels" / "Show panels"

Position: absolute top-4, horizontally centered z-[1001]
Estimated lines: 20-30
```

### StatCardCompact (components/dashboard/StatCardCompact.jsx)

```
Props: { label, count, color, loading, error }

Narrower version of existing StatCard from DashboardPage.
- Single row: icon-dot + label + count (vs stacked layout)
- Fits within 280px panel width
- Uses same STAT_COLOR_MAP

Estimated lines: 20-30
```

### IndicatorsTableCompact (components/dashboard/IndicatorsTableCompact.jsx)

```
Props: { indicators, loading, error }

Simplified version of IndicatorsTable from DashboardPage.
- 3 columns: Type badge, Value, Date
- No Labels column (space constraint)
- No category filter (attack chart removed)
- 10 rows max
- glass-card-static styling

Estimated lines: 40-60
```

## Patterns to Follow

### Pattern 1: Hook Extraction for Data Fetching

**What:** Extract DashboardPage's 6 inline useEffect blocks into a single `useDashboardData` hook.
**When:** Page component has 3+ data-fetching effects.
**Why:** ThreatMapDashboard already uses `useThreatStream` (same pattern). Keeps page component focused on composition.

### Pattern 2: Framer Motion Slide with Peek

**What:** Use `motion.div` with `animate.x` for horizontal slide, separate hover zone for peek.
**When:** Collapsible overlay panel with peek-on-hover.

```jsx
<motion.div
  animate={{ x: collapsed && !peeking ? offscreenX : 0 }}
  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
  onMouseEnter={onMouseEnter}
  onMouseLeave={onMouseLeave}
>
  {children}
</motion.div>
```

### Pattern 3: Sliver Hit Target

**What:** When panel is collapsed, an invisible 24px-wide div extends from the visible 6px sliver to provide a wider hover target.
**Why:** 6px is hard to hover precisely. 24px invisible hit zone makes peek feel responsive.

### Pattern 4: Full-Bleed Map Inside AppLayout

**What:** Use `-m-6` negative margin plus explicit height `calc(100vh - 60px)` to break out of AppLayout padding.
**When:** Any page needing edge-to-edge rendering inside AppLayout.
**Existing usage:** ThreatMapPage line 73.

### Pattern 5: Existing Components as Panel Children

**What:** Import ThreatMapCounters, ThreatMapCountries, ThreatMapDonut directly into OverlayPanelLeft. No copying, no rewriting.
**Why:** They already use `glass-card-static` which renders correctly inside any container. One source of truth.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Shared Peek State Between Panels

**What:** Single boolean controlling both panels' peek state.
**Why bad:** Requirement specifies independent hover-to-reveal. If left peeks, right stays collapsed.
**Instead:** Track `collapsed` (global toggle) + `leftPeeking` + `rightPeeking` separately. Toggle affects base state; peek overrides per-panel.

### Anti-Pattern 2: Re-rendering Map on Panel State Change

**What:** Putting overlay panel state in the same subtree that owns the Leaflet map ref.
**Why bad:** Leaflet map re-initialization is expensive. Any re-render of the map container div risks destroying and recreating the map.
**Instead:** Overlay panels are siblings of the map div, not children. Panel hover state changes only trigger re-renders on `motion.div` wrappers. Map div stays in a stable subtree.

### Anti-Pattern 3: Duplicating Existing Map Widgets

**What:** Copying ThreatMapCounters/Countries/Donut code into new overlay components.
**Why bad:** Two copies diverge over time.
**Instead:** Import and render existing components directly inside OverlayPanelLeft.

### Anti-Pattern 4: Removing /threat-map Without Redirect

**What:** Deleting the route entirely.
**Why bad:** Bookmarks, browser history, and external links break silently.
**Instead:** Keep `/threat-map` as `<Navigate to="/dashboard" replace />`.

### Anti-Pattern 5: Fetching Dashboard Data in Overlay Components

**What:** Each overlay panel makes its own API calls.
**Why bad:** Violates single-responsibility. Makes it impossible to coordinate loading states or share data between panels.
**Instead:** `useDashboardData` hook lives in `ThreatMapDashboard` (the page). Data flows down as props to overlay panels.

## Suggested Build Order

Build order follows dependency chains. Each phase produces a testable increment.

### Phase 1: Extract useDashboardData hook
**Creates:** `hooks/useDashboardData.js`
**Changes:** None (hook exists but is not yet consumed)
**Testable:** Import in console, verify API calls fire and data returns.
**Rationale:** Zero-risk extraction. Unblocks Phase 3.

### Phase 2: Create useOverlayPanels hook
**Creates:** `hooks/useOverlayPanels.js`
**Changes:** None
**Testable:** Import in console, verify state toggles and localStorage persistence.
**Rationale:** Pure state management. Unblocks Phase 4.

### Phase 3: Build ThreatMapDashboard page (map only, no overlays)
**Creates:** `pages/ThreatMapDashboard.jsx`
**Changes:** `App.jsx` (swap route), `mock-data.js` (remove Threat Map nav)
**Testable:** Navigate to `/dashboard`, see full-viewport map with SSE events, counters, countries, donut, feed. Old `/threat-map` redirects.
**Rationale:** Validates map works at new route before adding overlay complexity.

### Phase 4: Build overlay panel components
**Creates:** `components/dashboard/OverlayPanelLeft.jsx`, `OverlayPanelRight.jsx`, `OverlayToggle.jsx`, `StatCardCompact.jsx`, `IndicatorsTableCompact.jsx`
**Changes:** `pages/ThreatMapDashboard.jsx` (wire in overlays + hooks)
**Testable:** See stat cards on left, indicators on right, toggle collapses both.
**Rationale:** All new components, no existing code modified beyond the new page.

### Phase 5: Add peek behavior and animation polish
**Changes:** Overlay components (add peek mouse handlers, tune spring params, add sliver hit target)
**Testable:** Collapse panels, hover sliver, panel peeks independently.
**Rationale:** Peek is the trickiest UX. Isolated so animation tuning does not block functional delivery.

### Phase 6: Cleanup dead code
**Deletes:** `pages/DashboardPage.jsx`, `pages/ThreatMapPage.jsx`
**Changes:** `App.jsx` (remove dead imports)
**Testable:** Build succeeds, no unused imports, `/dashboard` still works.
**Rationale:** Cleanup only after new page is verified. Reversible if issues found.

### Phase Dependency Graph

```
Phase 1 (useDashboardData) ---+
                               +--> Phase 3 (map page) --> Phase 4 (overlays) --> Phase 5 (peek) --> Phase 6 (cleanup)
Phase 2 (useOverlayPanels) ---+
```

Phases 1 and 2 are independent and can run in parallel. Phases 3-6 are strictly sequential.

## Files Changed Summary

### New Files (8)

| File | Purpose |
|------|---------|
| `src/pages/ThreatMapDashboard.jsx` | Merged page component |
| `src/hooks/useDashboardData.js` | Dashboard API data hook |
| `src/hooks/useOverlayPanels.js` | Panel collapse/peek state hook |
| `src/components/dashboard/OverlayPanelLeft.jsx` | Left overlay (stats + map widgets) |
| `src/components/dashboard/OverlayPanelRight.jsx` | Right overlay (indicators) |
| `src/components/dashboard/OverlayToggle.jsx` | Toggle button |
| `src/components/dashboard/StatCardCompact.jsx` | Compact stat card |
| `src/components/dashboard/IndicatorsTableCompact.jsx` | Compact indicators table |

### Modified Files (2)

| File | Change | Risk |
|------|--------|------|
| `src/App.jsx` | Swap DashboardPage/ThreatMapPage imports and routes | LOW |
| `src/data/mock-data.js` | Remove Threat Map from NAV_CATEGORIES | LOW |

### Deleted Files (2)

| File | Reason |
|------|--------|
| `src/pages/DashboardPage.jsx` | Replaced by ThreatMapDashboard |
| `src/pages/ThreatMapPage.jsx` | Replaced by ThreatMapDashboard |

### Backend Changes

**None.** All existing API endpoints (`/api/dashboard/counts`, `/api/dashboard/indicators`, `/api/threat-map/snapshot`, `/api/threat-map/stream`) remain unchanged. The merge is purely a frontend concern.

## Scalability Considerations

| Concern | Current | After Merge | Notes |
|---------|---------|-------------|-------|
| API calls on mount | Dashboard: 4 endpoints; ThreatMap: 1 snapshot + SSE | Combined: 3 endpoints + SSE | Fewer total calls (categories/credits/history dropped) |
| SSE connections | 1 per ThreatMap visit | 1 per Dashboard visit | Same, but now always active since Dashboard is the landing page |
| Leaflet memory | Only on /threat-map | Always on /dashboard | Acceptable: map was already lazy-loaded per useLeaflet |
| Overlay animation | N/A | Spring animation on hover | Negligible: Framer Motion handles GPU-accelerated transforms |
| Panel re-renders | N/A | Only motion.div on hover | Map div is not affected |

## Sources

- Direct codebase: `App.jsx` (routing structure, lines 62-76)
- Direct codebase: `DashboardPage.jsx` (stat cards, indicators, data fetching, 581 lines)
- Direct codebase: `ThreatMapPage.jsx` (map integration, SSE, widgets, 91 lines)
- Direct codebase: `AppLayout.jsx` (padding, layout structure, 32 lines)
- Direct codebase: `Sidebar.jsx` (nav rendering, 216 lines)
- Direct codebase: `useLeaflet.js` (map init pattern, onReady callback, 72 lines)
- Direct codebase: `useThreatStream.js` (SSE + snapshot, visibility handling, 174 lines)
- Direct codebase: `mock-data.js` NAV_CATEGORIES (lines 135-157)
- Direct codebase: All threat-map components (ThreatMapCounters, Countries, Donut, Feed, Status)
- Direct codebase: `glassmorphism.css` (glass-card-static class definition)
- Direct codebase: `package.json` (framer-motion@^12.35.2 already installed)
- Confidence: HIGH -- all recommendations build on verified patterns in the existing codebase
