# Phase 53: Threat News Bar Chart with Categories and Side Labels - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-13
**Phase:** 53-threat-news-bar-chart-with-categories-and-side-labels
**Areas discussed:** Chart type & layout, Data grouping, Category labels style, Filter interaction

---

## Chart Type & Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Horizontal bars | Category names on Y-axis, bar length shows count | ✓ |
| Vertical bars | Category names on X-axis, bar height shows count | |

**User's choice:** Horizontal bars
**Notes:** None

### Follow-up: Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Left panel (below donut) | Add in LeftOverlayPanel below existing donut chart | |
| Right panel (new section) | Add in RightOverlayPanel alongside indicators and threat database | ✓ |
| Replace the donut chart | Swap out ThreatMapDonut | |
| You decide | Claude picks | |

**User's choice:** Right panel (new section)
**Notes:** User clarified the chart belongs on the Threat Map page, not the Threat News page (initial assumption was corrected).

### Follow-up: Replace vs alongside (Threat News page)

**User's choice:** N/A — User clarified the bar chart goes on the Threat Map page, not the Threat News page. The existing CategoryDistributionChart on Threat News page is unrelated to this phase.

---

## Data Grouping

| Option | Description | Selected |
|--------|-------------|----------|
| Threat news categories | Report categories from Threat News API | |
| SSE type counts | Observable types from live SSE stream | |
| SSE country counts | Country counts from SSE stream | |
| Old dashboard data | Same attack categories data from old Dashboard page | ✓ |

**User's choice:** "the same data which was in the previous dashboard before removing the dashboard"
**Notes:** User wants the same `GET /api/dashboard/categories` data that powered the old `AttackChart` component in DashboardPage.jsx (deleted in commit fa36fc4).

---

## Category Labels Style

| Option | Description | Selected |
|--------|-------------|----------|
| Plain text, full names | Full category names, truncate with ellipsis if long | ✓ |
| Colored text matching bars | Label color matches bar color | |
| Labels with count suffix | "Phishing (42)" format | |

**User's choice:** Plain text, full names
**Notes:** None

---

## Filter Interaction

| Option | Description | Selected |
|--------|-------------|----------|
| No click interaction | Pure display only | ✓ |
| Click filters indicators list | Filter Recent Indicators by clicked category | |
| You decide | Claude picks | |

**User's choice:** No click interaction
**Notes:** Unlike the old dashboard which had click-to-filter on the indicators table, the Threat Map version is display-only.

### Follow-up: Chart Title

| Option | Description | Selected |
|--------|-------------|----------|
| Top Attack Categories | Same as old dashboard | ✓ |
| Attack Categories | Shorter variant | |
| You decide | Claude picks | |

**User's choice:** Top Attack Categories
**Notes:** None

---

## Claude's Discretion

- Bar colors, thickness, border radius
- Chart height for 380px panel
- Loading/error states
- Position within right panel widgets

## Deferred Ideas

None
