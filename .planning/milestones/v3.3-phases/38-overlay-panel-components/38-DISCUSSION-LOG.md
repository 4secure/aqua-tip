# Phase 38: Overlay Panel Components - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-05
**Phase:** 38-overlay-panel-components
**Areas discussed:** Panel positioning & coexistence, Stat card visual style, Indicators table format, Toggle button placement

---

## Panel Positioning & Coexistence

### Q1: How should the new left stat panel coexist with the 3 existing left-side map widgets?

| Option | Description | Selected |
|--------|-------------|----------|
| Replace existing widgets | 7 stat cards replace Counters, Countries, Donut. Richer data. | |
| Keep existing below stat cards | Stack stat cards on top, existing widgets below in same scrollable panel. | ✓ |
| Move existing to different position | Stat cards take left, existing widgets relocate elsewhere. | |

**User's choice:** Keep existing below stat cards
**Notes:** All widgets in one left panel — stat cards first, then existing map widgets.

### Q2: Should the left panel scroll independently?

| Option | Description | Selected |
|--------|-------------|----------|
| Scrollable panel | Max-height matching viewport, vertical scroll for overflow. | ✓ |
| Fixed visible area, no scroll | Show what fits, bottom widgets may be cut off. | |

**User's choice:** Scrollable panel
**Notes:** None

### Q3: Should the right indicators panel sit above or below the existing Live Feed widget?

| Option | Description | Selected |
|--------|-------------|----------|
| Indicators on top, Feed below | Two separate right-side elements at different positions. | |
| Combined right panel | Indicators and Feed merge into one scrollable right overlay. Toggle collapses both. | ✓ |
| Indicators replaces Feed | Live Feed removed, indicators take the right side. | |

**User's choice:** Combined right panel
**Notes:** One unified right panel with indicators table + live feed.

---

## Stat Card Visual Style

### Q1: How should the 7 stat cards look in the overlay panel?

| Option | Description | Selected |
|--------|-------------|----------|
| Compact row style | Single row per card: color dot + label left, count right. ~40px height each. | ✓ |
| Reuse existing StatCard | DashboardPage style with glass-card, stacked label/count. Taller. | |
| Mini badge style | Very compact: count only, label on hover. Minimal but less readable. | |

**User's choice:** Compact row style
**Notes:** Fits 7 cards without excessive height.

### Q2: Should the stat cards section have a heading?

| Option | Description | Selected |
|--------|-------------|----------|
| With heading | "Threat Database" heading at top, consistent with old dashboard. | ✓ |
| No heading | Jump straight into cards, saves vertical space. | |
| You decide | Claude picks during implementation. | |

**User's choice:** With heading ("Threat Database")
**Notes:** None

---

## Indicators Table Format

### Q1: How should the indicators table look in the right overlay panel?

| Option | Description | Selected |
|--------|-------------|----------|
| Simplified 2-column | Type badge + value left, relative time right. Labels column dropped. | ✓ |
| Reuse full 4-column table | Type, Value, Labels, Date columns as-is. May need wider panel. | |
| Card-per-indicator | Each indicator as a mini card. More visual, more space. | |

**User's choice:** Simplified 2-column
**Notes:** Narrower overlay context benefits from fewer columns.

### Q2: How many indicator rows before scrolling?

| Option | Description | Selected |
|--------|-------------|----------|
| 8 rows (match existing) | Same cap as DashboardPage, then scrollable. | |
| All available, scrollable | Show all indicators from API, scrollable list, no cap. | ✓ |
| You decide | Claude picks reasonable limit. | |

**User's choice:** All available, scrollable
**Notes:** None

---

## Toggle Button Placement

### Q1: Where should the toggle button be placed?

| Option | Description | Selected |
|--------|-------------|----------|
| Top-center of map | Floating at top-center, doesn't overlap panels. | |
| Bottom-center of map | Below map content, above bottom widgets. | ✓ |
| Integrated into topbar | In app topbar near plan chip/search. | |

**User's choice:** Bottom-center of map
**Notes:** None

### Q2: What should the toggle button look like?

| Option | Description | Selected |
|--------|-------------|----------|
| Icon-only pill | Small glassmorphism pill with chevron/sidebar icon. | ✓ |
| Icon + text label | "Hide Panels" / "Show Panels" with icon. | |
| You decide | Claude picks best style. | |

**User's choice:** Icon-only pill
**Notes:** Glassmorphism style consistent with map overlays.

---

## Claude's Discretion

- Panel widths (left/right)
- Glassmorphism styling specifics
- Animation approach for collapse/expand
- Event propagation blocking technique
- Data fetching strategy (independent vs shared parent)

## Deferred Ideas

None — discussion stayed within phase scope
