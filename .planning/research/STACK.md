# Technology Stack

**Project:** Aqua TIP v3.3 -- Threat Map Dashboard Overlay Panels
**Researched:** 2026-04-05
**Overall confidence:** HIGH

## Verdict: Zero New Dependencies

The existing stack handles every requirement for map overlay panels with toggle + peek-on-hover. No npm installs needed. This continues the project pattern: v2.1, v3.0, v3.1, and v3.2 all shipped with zero new deps.

## Existing Stack Used for This Milestone

### Core -- Direct Usage

| Technology | Installed Version | Role in v3.3 | Confidence |
|------------|-------------------|---------------|------------|
| React 19 | ^19.2.4 | `useState` for panel visibility (2 booleans), `useCallback` for hover handlers, `useRef` for debounce timers | HIGH |
| Framer Motion | ^12.35.2 | `motion.div` with `animate` for panel slide, `onHoverStart`/`onHoverEnd` for peek behavior | HIGH |
| Leaflet | ^1.9.4 | Existing threat map -- overlays are DOM siblings positioned over it, not Leaflet layers | HIGH |
| Tailwind CSS 3 | ^3.4.19 | Glassmorphism panel styling, absolute positioning, z-index layering, pointer-events control | HIGH |
| Lucide React | ^0.577.0 | Toggle button icons (`PanelLeftClose`/`PanelLeftOpen` or `ChevronLeft`/`ChevronRight`) | HIGH |

### Backend -- Existing Endpoints (No Changes Needed)

| Endpoint | Data | Used By |
|----------|------|---------|
| `GET /api/dashboard/counts` | 7 entity type counts | Left overlay stat cards |
| `GET /api/dashboard/indicators` | Recent indicators with type badges and labels | Right overlay table |
| SSE `/api/threat-map/stream` | Live threat events | Existing map pulse markers (unchanged) |
| `GET /api/threat-map/snapshot` | Map snapshot for initial load | Existing map markers (unchanged) |

## Framer Motion Integration Plan

### Why Framer Motion (not CSS transitions)

1. **Already in bundle** -- framer-motion ^12.35.2 is installed, used in 5+ components
2. **AnimatePresence** -- handles mount/unmount animation for panel content when toggling
3. **Gesture props** -- `onHoverStart`/`onHoverEnd` are built into every `motion` element, eliminating manual `onMouseEnter`/`onMouseLeave` wiring
4. **Spring physics** -- `type: "spring"` gives natural slide feel; existing codebase uses this pattern

### Specific APIs Needed

| API | Purpose | Already Used in Codebase? |
|-----|---------|--------------------------|
| `motion.div` | Animated panel containers with `animate` prop | Yes -- modals, page transitions |
| `AnimatePresence` | Mount/unmount transitions for panel content | Yes -- `PlanConfirmModal`, page lists |
| `animate` prop | Drive panel x-position (`x: 0` expanded vs `x: -panelWidth + sliverWidth` collapsed) | Yes -- various components |
| `onHoverStart` / `onHoverEnd` | Peek-on-hover for collapsed panel slivers | New usage -- standard Framer Motion gesture API |
| `transition` prop | Spring config: `{ type: "spring", stiffness: 300, damping: 30 }` | Yes -- established pattern |

### Recommended Animation Config

```jsx
// Shared spring transition for both panels
const panelTransition = { type: "spring", stiffness: 300, damping: 30 };

// Left panel: slides off-screen to the left when collapsed
<motion.div
  className="absolute top-4 left-0 z-[1000]"
  animate={{ x: isLeftVisible ? 0 : -(panelWidth - sliverWidth) }}
  transition={panelTransition}
  onHoverStart={() => !panelsExpanded && setPeekLeft(true)}
  onHoverEnd={() => !panelsExpanded && setPeekLeft(false)}
>
  {/* Panel content + sliver handle */}
</motion.div>

// Right panel: slides off-screen to the right when collapsed
<motion.div
  className="absolute top-4 right-0 z-[1000]"
  animate={{ x: isRightVisible ? 0 : (panelWidth - sliverWidth) }}
  transition={panelTransition}
  onHoverStart={() => !panelsExpanded && setPeekRight(true)}
  onHoverEnd={() => !panelsExpanded && setPeekRight(false)}
>
  {/* Panel content + sliver handle */}
</motion.div>
```

## Overlay Positioning Architecture

### Established Pattern in ThreatMapPage.jsx

The existing threat map already uses absolute-positioned React components over Leaflet:

```jsx
// Current ThreatMapPage.jsx (lines 79-88)
<div className="absolute top-4 left-4 z-[1000] w-[340px]">
  <ThreatMapCounters />
  <ThreatMapCountries />
  <ThreatMapDonut />
</div>
<div className="absolute bottom-4 right-4 z-[1000] w-[380px]">
  <ThreatMapFeed />
</div>
```

The new overlay panels follow the same approach -- DOM siblings of the map `div`, not Leaflet plugins or layers. This means:
- No Leaflet plugin dependencies
- No z-index conflicts (use `z-[1000]` consistently)
- Map interaction (pan/zoom) passes through gaps between panels
- `pointer-events-none` on outer wrapper + `pointer-events-auto` on panel content prevents blocking

### Component Extraction from DashboardPage

These components currently live inside `DashboardPage.jsx` and need extraction to shared components:

| Component | Current Location | Extract To | Modifications for Overlay |
|-----------|-----------------|------------|---------------------------|
| `StatCard` | DashboardPage.jsx L61-77 | `components/shared/StatCard.jsx` | Compact padding (`p-3` vs `p-5`), smaller text for overlay context |
| `IndicatorsTable` | DashboardPage.jsx L139-189 | `components/shared/IndicatorsTable.jsx` | Compact row height, fewer visible rows (5 vs 8) |
| `STAT_CARD_CONFIG` | DashboardPage.jsx L12-20 | `data/dashboard-config.js` | No changes -- same 7 entity types |
| `STAT_COLOR_MAP` | DashboardPage.jsx L22-28 | `data/dashboard-config.js` | No changes |
| `TYPE_BADGE_COLORS` | DashboardPage.jsx L30-39 | `data/dashboard-config.js` | No changes |
| `formatRelativeTime` | DashboardPage.jsx L45-57 | `utils/format.js` | No changes |

### Data Fetching Strategy

**Recommended: Custom `useDashboardData` hook** extracted from DashboardPage's existing fetch logic.

```jsx
// hooks/useDashboardData.js
// Encapsulates: GET /api/dashboard/counts + GET /api/dashboard/indicators
// Returns: { counts, indicators, countsLoading, indicatorsLoading, countsError, indicatorsError }
// Includes: 5-minute auto-refresh with visibility check (same pattern as useAutoRefresh)
```

Why a hook over inline fetching: the DashboardPage already has this exact fetch logic. Extracting it prevents duplication and keeps the overlay components presentation-only.

## State Management

Panel state is minimal -- React `useState` is sufficient:

| State | Type | Scope | Persistence |
|-------|------|-------|-------------|
| `panelsExpanded` | `boolean` | ThreatMapPage (or new DashboardMapPage) | None -- resets on mount |
| `peekLeft` | `boolean` | ThreatMapPage | None -- resets on mouse leave |
| `peekRight` | `boolean` | ThreatMapPage | None -- resets on mouse leave |

No global state management (Zustand, Redux, Jotai) needed. Three booleans in a single component.

## What NOT to Add

| Temptation | Why Not | Use Instead |
|------------|---------|-------------|
| `react-resizable-panels` | Panels have fixed width, not user-resizable | Absolute positioning + Framer Motion `animate` |
| `@floating-ui/react` | Panels are not tooltips/popovers; they are fixed overlays | CSS absolute positioning (established pattern) |
| `zustand` / `jotai` | 3 boolean states in 1 component | React `useState` |
| `react-use-gesture` / `@use-gesture/react` | No drag/swipe gestures needed | Framer Motion built-in `onHoverStart`/`onHoverEnd` |
| CSS-only transitions | Framer Motion already in bundle; CSS would create inconsistency | Framer Motion `motion.div` |
| Leaflet custom controls | Overlays are React components, not map controls | DOM siblings with absolute positioning |
| `localStorage` for panel state | Expanded/collapsed should reset per session; no user preference | `useState` with default `true` |
| Any Leaflet plugins | Overlays sit outside Leaflet's rendering pipeline | Standard React + Tailwind |

## Tailwind Patterns

### Glassmorphism Overlay Panels

Already established in codebase via `.glass-card` class:
```css
bg-surface/60 border border-border backdrop-blur-sm rounded-xl
```

### Sliver (Peek Handle) When Collapsed

```
// Thin visible edge strip -- 12px wide, full panel height
w-3 h-full bg-surface/40 backdrop-blur-sm border border-border/30
rounded-r-lg  /* left panel's sliver */
rounded-l-lg  /* right panel's sliver */
cursor-pointer
```

### Pointer Events for Map Pass-Through

```jsx
// Outer wrapper: let clicks pass to map
<div className="pointer-events-none absolute inset-0 z-[1000]">
  {/* Panel: re-enable pointer events */}
  <motion.div className="pointer-events-auto">
    ...panel content...
  </motion.div>
</div>
```

## Installation

```bash
# No new packages needed.
# Zero npm install commands.
# Zero composer require commands.
# Zero new backend endpoints.
# Zero new database migrations.

# All work is frontend component creation + extraction + route change.
```

## Confidence Assessment

| Claim | Confidence | Basis |
|-------|------------|-------|
| Framer Motion `onHoverStart`/`onHoverEnd` works for peek | HIGH | Standard gesture API, documented in official docs, consistent with motion.div usage pattern |
| Absolute positioning over Leaflet works | HIGH | Already working in production (ThreatMapPage.jsx lines 79-88) |
| `pointer-events-none` + `pointer-events-auto` pattern | HIGH | Standard CSS, used widely for overlay-over-map scenarios |
| Spring transition `{ stiffness: 300, damping: 30 }` feels natural | MEDIUM | Common values, may need tuning during implementation |
| StatCard/IndicatorsTable extraction is straightforward | HIGH | Components are self-contained with clear prop interfaces |
| No new backend work needed | HIGH | `/api/dashboard/counts` and `/api/dashboard/indicators` already return required data |

## Sources

- Existing codebase: `ThreatMapPage.jsx` -- absolute overlay positioning pattern (lines 79-88)
- Existing codebase: `DashboardPage.jsx` -- StatCard, IndicatorsTable, config constants to extract
- Existing codebase: `package.json` -- framer-motion ^12.35.2, react ^19.2.4, leaflet ^1.9.4
- Existing codebase: 5 files importing `{ motion, AnimatePresence } from 'framer-motion'`
- Framer Motion gesture docs -- `onHoverStart`/`onHoverEnd` are standard props on all `motion` components
- Project pattern: v2.1, v3.0, v3.1, v3.2 all shipped with zero new dependencies

---
*Stack research for: Aqua TIP v3.3 -- Threat Map Dashboard Overlay Panels*
*Researched: 2026-04-05*
