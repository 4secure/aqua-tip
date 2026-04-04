# Phase 34: Enriched Threat Actor Modal - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-03-31
**Phase:** 34-enriched-threat-actor-modal
**Areas discussed:** Modal layout, TTP display, Loading & empty states, Data freshness, Relationships

---

## Modal Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Scrollable sections | All sections stacked vertically in scrollable modal, consistent with current pattern | |
| Tabbed sections | Tabs at top: Overview, TTPs, Tools, Campaigns, Relationships. Each tab shows one section. | ✓ |
| Accordion | Collapsible sections that expand/collapse on click | |

**User's choice:** Tabbed sections
**Notes:** User preferred the compact tabbed approach over continuous scrolling.

---

## TTP Display

| Option | Description | Selected |
|--------|-------------|----------|
| Grouped by tactic | Techniques grouped under tactic headers (Initial Access, Execution, etc.) with ATT&CK IDs | ✓ |
| Flat chip list | All techniques as chips/badges with ATT&CK IDs, no tactic grouping | |
| Matrix-style grid | Mini ATT&CK matrix with tactics as columns, techniques as cells | |

**User's choice:** Grouped by tactic
**Notes:** None

---

## Loading State

| Option | Description | Selected |
|--------|-------------|----------|
| Skeleton per tab | Tab bar shown immediately, active tab shows pulsing skeleton lines | ✓ |
| Full modal spinner | Single centered spinner covering entire modal content area | |
| Overview first, lazy tabs | Overview shows existing data immediately, other tabs skeleton on click | |

**User's choice:** Skeleton per tab
**Notes:** None

---

## Empty State

| Option | Description | Selected |
|--------|-------------|----------|
| Per-tab empty message | Each tab shows its own empty message with muted icon, tabs not hidden | ✓ |
| Hide empty tabs | Tabs with no data hidden from tab bar entirely | |
| Badge counts on tabs | Tabs show count badges (e.g. "TTPs (5)"), tabs with 0 still clickable | |

**User's choice:** Per-tab empty message
**Notes:** None

---

## Data Freshness

| Option | Description | Selected |
|--------|-------------|----------|
| Server cache only | 15-min server-side cache matching existing pattern, every modal open hits API | ✓ |
| Client + server cache | React state cache keyed by actor ID plus 15-min server cache | |
| No cache | Always fetch fresh enrichment data | |

**User's choice:** Server cache only
**Notes:** None

---

## Relationships

| Option | Description | Selected |
|--------|-------------|----------|
| Related actors | Other threat actors linked via OpenCTI relationships, shown as clickable chips | |
| All STIX relationships | Full list of all STIX relationships across all entity types | |
| Visual graph | D3 force-directed relationship graph with actor at center | ✓ |

**User's choice:** Visual graph (D3 force-directed, same as ThreatSearchPage)
**Notes:** User specifically referenced the ThreatSearchPage relationship tab graph as the model to follow.

---

## Claude's Discretion

- Tab bar styling (underline, pill, or segment)
- Whether to extract D3 graph into shared component or duplicate
- Graph height inside modal tab
- ATT&CK tactic grouping extraction from kill_chain_phases
- Skeleton shapes per tab
- Enrichment endpoint response structure

## Deferred Ideas

None
