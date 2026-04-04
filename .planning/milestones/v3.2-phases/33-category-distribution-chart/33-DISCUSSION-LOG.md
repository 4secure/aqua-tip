# Phase 33: Category Distribution Chart - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-29
**Phase:** 33-category-distribution-chart
**Areas discussed:** Chart type & style, Placement & layout, Chart interactions, Empty & edge states

---

## Chart Type & Style

### Timeline Clarification

**User clarification:** The roadmap says "time-series category chart" — user confirmed this means hourly breakdown within the selected date (not multi-day trend or simple distribution snapshot).

### Chart Type

| Option | Description | Selected |
|--------|-------------|----------|
| Stacked area chart | Smooth filled areas stacked, shows individual + total volume per hour | ✓ |
| Multi-line chart | One line per category, better for comparing but can get cluttered | |
| Stacked bar chart | Vertical bars per hour with stacked segments, more blocky | |

**User's choice:** Stacked area chart
**Notes:** User liked the preview showing smooth areas with hourly x-axis

### Colors

| Option | Description | Selected |
|--------|-------------|----------|
| CATEGORY_COLORS hash | Reuse existing categoryColor() function, consistent with chips | ✓ |
| OpenCTI label colors | Use hex color from API, more variety but may clash with dark theme | |
| You decide | Claude picks | |

**User's choice:** CATEGORY_COLORS hash
**Notes:** None

---

## Placement & Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Above report list | Glassmorphism card between toolbar and report list, always visible ~180px | ✓ |
| Collapsible panel | Same position but with expand/collapse toggle | |
| You decide | Claude picks | |

**User's choice:** Above report list, always visible
**Notes:** None

---

## Chart Interactions

### Click to Filter

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, click to filter | Clicking category area sets ?label= param, same as chip click | ✓ |
| No, view-only chart | Purely visual, users use dropdown/chips to filter | |
| You decide | Claude picks | |

**User's choice:** Yes, click to filter
**Notes:** None

### Animation

| Option | Description | Selected |
|--------|-------------|----------|
| Smooth transition | Chart.js built-in transitions, areas morph smoothly | ✓ |
| Fade out/in | Brief opacity fade on date change | |
| You decide | Claude picks | |

**User's choice:** Smooth transition (Chart.js built-in)
**Notes:** None

---

## Empty & Edge States

| Option | Description | Selected |
|--------|-------------|----------|
| Hide chart when no data | Chart doesn't render when no reports or no categories. Existing empty state handles messaging. | ✓ |
| Show empty chart with message | Always show card, display "No category data" message inside | |
| You decide | Claude picks | |

**User's choice:** Hide chart when no data
**Notes:** None

---

## Claude's Discretion

- Chart.js config details (tension, fill, opacity, grid, tooltips)
- Hourly bucket extraction approach
- Legend implementation (native vs custom HTML)
- Tailwind class → Chart.js color value mapping
- Component extraction decision

## Deferred Ideas

None — discussion stayed within phase scope
