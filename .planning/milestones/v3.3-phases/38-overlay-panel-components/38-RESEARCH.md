# Phase 38: Overlay Panel Components - Research

**Researched:** 2026-04-05
**Domain:** React UI overlay panels, glassmorphism styling, Framer Motion animations, Leaflet event propagation
**Confidence:** HIGH

## Summary

This phase builds two glassmorphism overlay panels floating on top of the Leaflet threat map at `/dashboard`. The left panel combines new stat cards (7 compact rows showing threat database counts) with existing map widgets (ThreatMapCounters, ThreatMapCountries, ThreatMapDonut). The right panel combines a simplified indicators table with the existing ThreatMapFeed. A single toggle button at bottom-center collapses/expands both panels simultaneously.

All required data sources already exist: `/api/dashboard/counts` for stat card numbers, `/api/dashboard/indicators` for the indicators table, and `useThreatStream` hook for existing map widget data. The primary technical challenges are (1) preventing event propagation from panels to the Leaflet map underneath, (2) managing scroll within panels without triggering map zoom, and (3) animating panel collapse/expand with Framer Motion.

**Primary recommendation:** Build two new container components (`LeftOverlayPanel`, `RightOverlayPanel`) and a `PanelToggle` button component, all rendered inside ThreatMapPage. Use `onPointerDown`, `onWheel`, `onClick` with `stopPropagation()` on each panel container to isolate map interactions. Use Framer Motion `AnimatePresence` + `motion.div` for collapse/expand animation, consistent with existing project patterns.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Left panel contains 7 stat cards stacked on top, with existing map widgets (ThreatMapCounters, ThreatMapCountries, ThreatMapDonut) below them in the same panel. Not replacing existing widgets -- combining into one scrollable left overlay.
- **D-02:** Left panel is scrollable with max-height matching viewport, independent scroll from the map.
- **D-03:** Right panel combines the indicators table and the existing ThreatMapFeed into one unified overlay panel. Both collapse together via the toggle.
- **D-04:** Compact row style for stat cards -- each card is a single row with color dot + label on left, count on right. Approximately 40px per card height. Not reusing the tall DashboardPage StatCard component.
- **D-05:** "Threat Database" heading at the top of the stat cards section, consistent with the old dashboard naming.
- **D-06:** Simplified 2-column layout for the overlay context -- type badge + value on left, relative time on right. Labels column dropped to fit narrower overlay width.
- **D-07:** All available indicators shown in a scrollable list, no fixed row cap. Panel scrolls to accommodate.
- **D-08:** Single toggle button placed at bottom-center of the map. Collapses/expands both left and right panels simultaneously.
- **D-09:** Icon-only glassmorphism pill style -- small, minimal footprint. Chevron or sidebar icon that reflects current state (expanded/collapsed).

### Claude's Discretion
- Panel widths (left and right) -- pick appropriate widths based on content
- Glassmorphism styling specifics -- use existing `glass-card` / `bg-surface/60 backdrop-blur-sm border-border` patterns
- Animation approach for collapse/expand -- Framer Motion is available
- Event propagation blocking technique (stopPropagation on panel containers)
- Whether stat cards and indicators fetch data independently or share a parent fetch

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PANEL-01 | User sees 7 threat database stat cards stacked vertically in a left overlay panel | Reuse `STAT_CARD_CONFIG` and `STAT_COLOR_MAP` from DashboardPage; new compact `StatRow` component; fetch from `/api/dashboard/counts` |
| PANEL-02 | User sees recent indicators in a scrollable table in a right overlay panel | Reuse `TYPE_BADGE_COLORS` and `formatRelativeTime` from DashboardPage; new simplified 2-column `OverlayIndicatorsTable` component; fetch from `/api/dashboard/indicators` |
| PANEL-03 | User sees overlay panels styled with glassmorphism (semi-transparent, backdrop blur, border) | Use existing `glass-card-static` class or inline `bg-surface/60 backdrop-blur-sm border border-border` pattern from glassmorphism.css |
| TOGGLE-01 | User can click a single toggle button to collapse/expand both overlay panels | Single `useState` boolean in ThreatMapPage; Framer Motion `AnimatePresence` wraps both panels; toggle button with `PanelLeftClose`/`PanelLeftOpen` Lucide icon |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **No TypeScript** -- all files must be `.jsx`/`.js`
- **No tests exist** -- no test infrastructure to maintain
- **No linter/formatter** -- no lint step to worry about
- **React 19 + Vite 7** -- ESM modules, functional components with hooks
- **Tailwind CSS 3** -- use design system tokens (primary, surface, surface-2, violet, cyan, red, green, amber, border)
- **Framer Motion** (^12.35.2) -- for animations
- **Lucide React** (^0.577.0) -- for icons
- **Dark theme only** -- all styling uses dark palette
- **Glassmorphism pattern:** `bg-surface/60 border border-border backdrop-blur-sm`
- **Fonts:** Outfit (font-sans) for UI, JetBrains Mono (font-mono) for data
- **CSS split across 4 files** in `styles/` -- check all when debugging
- **All data is mocked** in `data/mock-data.js` -- however, DashboardPage uses real API calls via `apiClient`
- **Immutability** -- always create new objects, never mutate

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19 | UI framework | Project standard |
| Framer Motion | ^12.35.2 | Collapse/expand animation | Already used in 5+ pages for AnimatePresence patterns |
| Lucide React | ^0.577.0 | Toggle button icon | Project icon library |
| Tailwind CSS | 3 | Styling | Project standard, dark theme tokens |

### Supporting (already available)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| apiClient | custom | Fetch stat counts + indicators | For `/api/dashboard/counts` and `/api/dashboard/indicators` |
| useThreatStream | custom hook | SSE events, counters, countryCounts, typeCounts | Already used in ThreatMapPage for existing widgets |

### No New Dependencies Required
This phase uses only existing project dependencies. No `npm install` needed.

## Architecture Patterns

### Recommended Component Structure
```
frontend/src/
  components/
    threat-map/
      LeftOverlayPanel.jsx      # NEW: Container for stat cards + existing widgets
      RightOverlayPanel.jsx     # NEW: Container for indicators table + feed
      PanelToggle.jsx           # NEW: Bottom-center collapse/expand button
      ThreatMapCounters.jsx     # EXISTING: Embedded in left panel
      ThreatMapCountries.jsx    # EXISTING: Embedded in left panel
      ThreatMapDonut.jsx        # EXISTING: Embedded in left panel
      ThreatMapFeed.jsx         # EXISTING: Embedded in right panel
  pages/
    ThreatMapPage.jsx           # MODIFIED: Orchestrate panels + toggle state
```

### Pattern 1: Overlay Panel Container
**What:** A panel component that floats over the map with absolute positioning, glassmorphism styling, scrollable content, and event isolation.
**When to use:** Both left and right panels follow this pattern.
**Example:**
```jsx
// Panel container with event isolation
function LeftOverlayPanel({ collapsed, counters, connected, countryCounts, typeCounts, counts, countsLoading, countsError }) {
  return (
    <AnimatePresence>
      {!collapsed && (
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -20, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="absolute top-4 left-4 z-[1000] w-[340px] max-h-[calc(100vh-120px)] overflow-y-auto space-y-4"
          onPointerDown={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          {/* Stat cards section */}
          {/* Existing widgets */}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

### Pattern 2: Compact Stat Row
**What:** A single-row stat card with color dot, label, and count -- ~40px height per D-04.
**When to use:** For the 7 threat database stat cards.
**Example:**
```jsx
function StatRow({ label, count, color, loading }) {
  const dotColor = {
    red: 'bg-red', violet: 'bg-violet', cyan: 'bg-cyan',
    amber: 'bg-amber', green: 'bg-green',
  }[color] || 'bg-violet';

  return (
    <div className="flex items-center justify-between py-2 px-3 border-b border-border/30 last:border-0">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${dotColor}`} />
        <span className="text-xs text-text-secondary">{label}</span>
      </div>
      {loading ? (
        <div className="h-4 w-12 bg-surface-2 rounded animate-pulse" />
      ) : (
        <span className="text-sm font-mono font-semibold text-text-primary">
          {(count || 0).toLocaleString()}
        </span>
      )}
    </div>
  );
}
```

### Pattern 3: Simplified Indicators Table
**What:** 2-column layout per D-06: type badge + value on left, relative time on right.
**When to use:** Right panel indicators list.
**Example:**
```jsx
function OverlayIndicatorsTable({ indicators, loading, error }) {
  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState />;

  return (
    <div className="space-y-1.5">
      {indicators.map((ind) => {
        const badge = TYPE_BADGE_COLORS[ind.entity_type] || { bg: '#7A44E425', text: '#7A44E4' };
        return (
          <div key={ind.id} className="flex items-center justify-between gap-2 py-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold shrink-0"
                style={{ backgroundColor: badge.bg, color: badge.text }}
              >
                {ind.entity_type}
              </span>
              <span className="font-mono text-xs text-text-primary truncate">{ind.value}</span>
            </div>
            <span className="text-[10px] text-text-muted whitespace-nowrap shrink-0">
              {formatRelativeTime(ind.created_at)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
```

### Pattern 4: Event Propagation Isolation
**What:** Prevent clicks, scrolls, and touch events from reaching the Leaflet map under overlay panels.
**When to use:** Every overlay panel container must block these events.
**Implementation:**
```jsx
const stopMapEvents = {
  onPointerDown: (e) => e.stopPropagation(),
  onWheel: (e) => e.stopPropagation(),
  onClick: (e) => e.stopPropagation(),
  onDoubleClick: (e) => e.stopPropagation(),
  onTouchStart: (e) => e.stopPropagation(),
};

// Apply to panel containers:
<div {...stopMapEvents} className="...">
```

**Leaflet-specific note:** Leaflet listens on the map container DOM element. React `stopPropagation` on React synthetic events stops the event from reaching Leaflet's listeners because React events bubble through the real DOM. For scroll/wheel events, `stopPropagation()` on the React `onWheel` handler prevents Leaflet's zoom handler from receiving the wheel event.

### Anti-Patterns to Avoid
- **Mutating existing widget components:** Do NOT modify ThreatMapCounters, ThreatMapCountries, ThreatMapDonut, or ThreatMapFeed internals. Wrap them in panel containers instead.
- **Using CSS pointer-events:none on map:** This would disable all map interactions. Use `stopPropagation` on panels instead.
- **Fetching data inside each stat row:** Fetch once in the panel or page, pass data down as props.
- **Hardcoding panel heights:** Use `max-h-[calc(100vh-Xpx)]` so panels adapt to viewport.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Collapse/expand animation | Custom CSS transitions with state | Framer Motion `AnimatePresence` + `motion.div` | Already used in project; handles mount/unmount animation cleanly |
| Icons for toggle | SVG paths | Lucide React (`PanelLeftClose`, `PanelLeftOpen`, `ChevronDown`, `ChevronUp`) | Project standard icon library |
| Glassmorphism styling | Custom CSS from scratch | Existing `glass-card-static` class from glassmorphism.css | Already defined with correct blur, opacity, border values |
| Relative time formatting | New date formatter | `formatRelativeTime` from DashboardPage.jsx | Already handles all cases (seconds, minutes, hours, days) |
| Stat card config/colors | New config arrays | `STAT_CARD_CONFIG`, `STAT_COLOR_MAP` from DashboardPage.jsx | Already defines all 7 entity types with labels and colors |
| Indicator badge colors | New color map | `TYPE_BADGE_COLORS` from DashboardPage.jsx | Already covers all indicator types |

**Key insight:** Almost all data configuration and utility functions already exist in DashboardPage.jsx. Extract them to shared modules rather than duplicating.

## Common Pitfalls

### Pitfall 1: Leaflet Capturing Wheel Events Through Panels
**What goes wrong:** User scrolls inside an overlay panel, but the scroll event also zooms the Leaflet map underneath.
**Why it happens:** Leaflet attaches wheel event listeners to the map container DOM element. If panel scroll events propagate to the map container, Leaflet interprets them as zoom gestures.
**How to avoid:** Add `onWheel={(e) => e.stopPropagation()}` to every overlay panel container. This stops the React synthetic event from propagating to the Leaflet DOM handler.
**Warning signs:** Map zooms when scrolling inside panels.

### Pitfall 2: Panel Overflowing Viewport
**What goes wrong:** Left panel with stat cards + 3 widgets exceeds viewport height, causing content to be cut off or pushing beyond the map edge.
**Why it happens:** 7 stat cards (~280px) + heading (~32px) + ThreatMapCounters (~100px) + ThreatMapCountries (~180px) + ThreatMapDonut (~240px) + spacing = ~900px total, which can exceed small viewports.
**How to avoid:** Use `max-h-[calc(100vh-120px)]` and `overflow-y-auto` on the left panel container. The 120px accounts for top-4 (16px) margin + bottom padding + toggle button space.
**Warning signs:** Content cut off at the bottom, no scrollbar visible.

### Pitfall 3: Duplicating Data Config Instead of Extracting
**What goes wrong:** Copy-pasting `STAT_CARD_CONFIG`, `STAT_COLOR_MAP`, `TYPE_BADGE_COLORS`, and `formatRelativeTime` from DashboardPage into new components.
**Why it happens:** Quick shortcut instead of proper extraction.
**How to avoid:** Extract shared constants and utilities to a shared module (e.g., `data/dashboard-config.js` or `utils/format.js`) and import from both DashboardPage and new overlay components.
**Warning signs:** Same constant defined in two places.

### Pitfall 4: Forgetting Double-Click Propagation
**What goes wrong:** Double-clicking text in a panel zooms the map to that location.
**Why it happens:** Leaflet binds `dblclick` for zoom-in. If only `onClick` is blocked but not `onDoubleClick`, double-clicks still reach the map.
**How to avoid:** Include `onDoubleClick={(e) => e.stopPropagation()}` in the event isolation pattern.
**Warning signs:** Map zooms when user selects text or double-clicks inside panels.

### Pitfall 5: Toggle State Not Lifting Properly
**What goes wrong:** Left and right panels collapse independently instead of together.
**Why it happens:** State managed inside individual panel components instead of at the ThreatMapPage level.
**How to avoid:** Single `const [panelsCollapsed, setPanelsCollapsed] = useState(false)` in ThreatMapPage, passed as prop to both panels and the toggle button.
**Warning signs:** Only one panel collapses when toggle is clicked.

## Code Examples

### Reusable Data (extract from DashboardPage.jsx)

These constants and functions should be extracted to a shared module so both DashboardPage and the new overlay components can import them:

```jsx
// Source: DashboardPage.jsx lines 12-57
// Extract to: frontend/src/data/dashboard-config.js

export const STAT_CARD_CONFIG = [
  { entity_type: 'IPv4-Addr', label: 'IP Addresses', color: 'red' },
  { entity_type: 'Domain-Name', label: 'Domains', color: 'violet' },
  { entity_type: 'Hostname', label: 'Hostnames', color: 'cyan' },
  { entity_type: 'X509-Certificate', label: 'Certificates', color: 'amber' },
  { entity_type: 'Email-Addr', label: 'Email', color: 'amber' },
  { entity_type: 'Cryptocurrency-Wallet', label: 'Crypto Wallet', color: 'green' },
  { entity_type: 'Url', label: 'URL', color: 'violet' },
];

export const STAT_COLOR_MAP = {
  red: { bg: 'bg-red/10', text: 'text-red', border: 'border-red/20' },
  violet: { bg: 'bg-violet/10', text: 'text-violet', border: 'border-violet/20' },
  cyan: { bg: 'bg-cyan/10', text: 'text-cyan', border: 'border-cyan/20' },
  amber: { bg: 'bg-amber/10', text: 'text-amber', border: 'border-amber/20' },
  green: { bg: 'bg-green/10', text: 'text-green', border: 'border-green/20' },
};

export const TYPE_BADGE_COLORS = {
  'IPv4-Addr':        { bg: '#FF3B5C25', text: '#FF3B5C' },
  'IPv6-Addr':        { bg: '#FF3B5C25', text: '#FF3B5C' },
  'Domain-Name':      { bg: '#00E5FF25', text: '#00E5FF' },
  'Url':              { bg: '#7A44E425', text: '#7A44E4' },
  'Email-Addr':       { bg: '#FFB02025', text: '#FFB020' },
  'StixFile':         { bg: '#00C48C25', text: '#00C48C' },
  'Hostname':         { bg: '#9B6BF725', text: '#9B6BF7' },
  'X509-Certificate': { bg: '#FFB02025', text: '#FFB020' },
};

export function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}
```

### Toggle Button Component
```jsx
// Source: Project patterns (Lucide icons, glassmorphism styling)
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

function PanelToggle({ collapsed, onToggle }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000]
        glass-card-static px-3 py-2 rounded-full cursor-pointer
        hover:border-violet/30 transition-colors"
    >
      {collapsed ? (
        <PanelLeftOpen className="w-4 h-4 text-text-secondary" />
      ) : (
        <PanelLeftClose className="w-4 h-4 text-text-secondary" />
      )}
    </button>
  );
}
```

### ThreatMapPage Integration Sketch
```jsx
// Source: Existing ThreatMapPage.jsx (lines 72-91) restructured
export default function ThreatMapPage() {
  const { events, counters, countryCounts, typeCounts, connected } = useThreatStream();
  const [panelsCollapsed, setPanelsCollapsed] = useState(false);
  // ... existing map setup ...

  return (
    <div className="relative -m-6" style={{ height: 'calc(100vh - 60px)' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', background: '#262626' }} />
      <ThreatMapStatus connected={connected} />

      <LeftOverlayPanel
        collapsed={panelsCollapsed}
        counters={counters}
        connected={connected}
        countryCounts={countryCounts}
        typeCounts={typeCounts}
      />

      <RightOverlayPanel
        collapsed={panelsCollapsed}
        events={events}
        onEventClick={handleEventClick}
      />

      <PanelToggle
        collapsed={panelsCollapsed}
        onToggle={() => setPanelsCollapsed((prev) => !prev)}
      />
    </div>
  );
}
```

## Recommended Panel Widths

Based on content analysis:

| Panel | Width | Rationale |
|-------|-------|-----------|
| Left | `w-[340px]` | Matches current left widget width; accommodates stat row label + count comfortably |
| Right | `w-[380px]` | Matches current feed width; fits 2-column indicator layout (badge + value + time) |

These widths are already established in the current ThreatMapPage layout (line 79: `w-[340px]`, line 86: `w-[380px]`).

## Data Fetching Strategy

**Recommendation:** Stat cards and indicators should fetch independently within their respective panels.

| Data | Source | Fetch Location | Refresh Strategy |
|------|--------|----------------|------------------|
| Stat counts (7 types) | `/api/dashboard/counts` | `LeftOverlayPanel` via `useEffect` | Fetch on mount, auto-refresh every 5 min |
| Recent indicators | `/api/dashboard/indicators` | `RightOverlayPanel` via `useEffect` | Fetch on mount, auto-refresh every 5 min |
| Live events, counters, countries, types | `useThreatStream` (SSE) | `ThreatMapPage` (already exists) | Real-time SSE stream |

**Rationale:** Independent fetching per panel follows the existing pattern in ThreatMapPage where each widget manages its own loading/error state. The SSE data for existing widgets already flows through `useThreatStream` at the page level.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None -- no test infrastructure exists |
| Config file | none |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PANEL-01 | 7 stat cards visible in left panel | manual-only | Visual verification in browser | N/A |
| PANEL-02 | Indicators table in scrollable right panel | manual-only | Visual verification in browser | N/A |
| PANEL-03 | Glassmorphism styling on both panels | manual-only | Visual verification in browser | N/A |
| TOGGLE-01 | Toggle button collapses/expands both panels | manual-only | Click test in browser | N/A |

**Justification for manual-only:** Project has zero test infrastructure (no test framework, no test files, no test config). CLAUDE.md explicitly notes "No tests exist." Setting up a test framework is out of scope for this UI overlay phase.

### Sampling Rate
- **Per task commit:** `npm run build` (verify no build errors)
- **Per wave merge:** `npm run build` + manual visual verification
- **Phase gate:** Build succeeds + all 4 requirements visually verified

### Wave 0 Gaps
None applicable -- no test infrastructure to gap-fill for a manual-only verification phase.

## Sources

### Primary (HIGH confidence)
- **ThreatMapPage.jsx** (92 lines) -- current overlay layout with absolute positioning and z-[1000]
- **DashboardPage.jsx** (581 lines) -- source of reusable configs (STAT_CARD_CONFIG, STAT_COLOR_MAP, TYPE_BADGE_COLORS, formatRelativeTime), API fetch patterns
- **glassmorphism.css** -- glass-card, glass-card-static, glass-panel CSS classes
- **ThreatMapFeed.jsx** (87 lines) -- existing right-side widget, uses glass-card-static
- **ThreatMapCounters/Countries/Donut** -- existing left-side widgets, all use glass-card-static
- **Framer Motion usage** -- verified AnimatePresence + motion.div pattern in ThreatSearchPage, DarkWebPage, ThreatActorsPage, ThreatNewsPage, PlanConfirmModal

### Secondary (MEDIUM confidence)
- **Framer Motion v12 AnimatePresence** -- `initial`/`animate`/`exit` pattern confirmed from project usage
- **Leaflet event propagation** -- stopPropagation on React synthetic events prevents Leaflet from receiving events (standard React/DOM behavior)

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all dependencies already installed and used in project
- Architecture: HIGH -- extends existing overlay pattern from ThreatMapPage with well-understood React/Framer Motion patterns
- Pitfalls: HIGH -- identified from direct code analysis of Leaflet integration and panel sizing math

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (stable -- no external dependency changes expected)
