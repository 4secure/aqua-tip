# Phase 64: Frontend Victimology Tab — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-01
**Phase:** 64-frontend-victimology-tab
**Areas discussed:** Fetch strategy, Section layout, Country flag rendering, Item rendering & overflow

---

## Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Fetch strategy | Resolve SC4 vs VICTM-07 conflict — eager (existing pattern) vs lazy on tab click | ✓ |
| Section layout | Stacked vs 2×2 grid vs accordion for the 4 sections | ✓ |
| Country flag rendering | Emoji vs flag-icons CSS lib vs name-only | ✓ |
| Item rendering & overflow | Chips vs rows vs mixed; show-all vs truncate | ✓ |

**User's choice:** All four areas.

---

## Fetch Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Eager + single payload (Recommended) | Reuse existing fetchThreatActorEnrichment — backend already returns victimology in payload. SC4 wins over VICTM-07. | ✓ |
| Lazy split fetch | Drop victimology from main query, add separate fetchThreatActorVictimology(actor.id) on tab click | |
| Lazy gate, single payload | Keep one backend query but defer reading enrichment.victimology until activeTab='victimology' | |

**User's choice:** Eager + single payload.
**Notes:** Backend payload already contains victimology from Phase 59 — no benefit to a second round-trip. VICTM-07 superseded by SC4 (codified in D-01).

---

## Section Layout

| Option | Description | Selected |
|--------|-------------|----------|
| 2×2 grid (Recommended) | Two columns desktop, single column mobile, all four sections visible above the fold | ✓ |
| Vertically stacked | Full-width sections one after another, scroll to see all four | |
| Accordion (collapsed) | All four collapsed by default, click to expand | |

**User's choice:** 2×2 grid.
**Notes:** "All four sections visible above the fold for major actors at 4xl modal width" was the deciding factor.

---

## Country Flag Rendering

| Option | Description | Selected |
|--------|-------------|----------|
| Emoji from ISO-2 (Recommended) | Convert country_code to regional indicator emoji, ~5 lines, zero deps | ✓ |
| flag-icons CSS lib | ~50KB SVG lib, pixel-perfect, new runtime dep (contradicts CLAUDE.md zero-dep) | |
| Name only (no flag) | Skip flags entirely, name as text | |

**User's choice:** Emoji from ISO-2.
**Notes:** Honors CLAUDE.md zero-dep philosophy and Phase 63's roadmap-lock posture (only essential new deps).

---

## Item Rendering

| Option | Description | Selected |
|--------|-------------|----------|
| Compact chips (Recommended) | Rounded pills, wrap within section, dense and visual | ✓ |
| List rows | One item per row, easier to read long org names but visually heavier | |
| Mixed: chips for short, rows for orgs | Best fit-to-content but more code paths | |

**User's choice:** Compact chips.

---

## Overflow

| Option | Description | Selected |
|--------|-------------|----------|
| Show all (Recommended) | Render every backend item; modal already scrolls | ✓ |
| Show top 10 + 'Show all' | Truncate to 10, expand link inline | |
| Show top 10 + count badge | Truncate to 10, show '+15 more' badge (no expand action) | |

**User's choice:** Show all.

---

## Claude's Discretion

- Whether to extract `<VictimologyChip>` or `<VictimologySection>` sub-components if inline JSX grows past a comfortable line count (planner's call during implementation).
- Exact Lucide icon picks if the suggested ones aren't already imported.
- Section card padding/gap exact values within the Tailwind scale.
- Subtle hover affordance on chips.

## Deferred Ideas

- Per-sector iconography (revisit post-v6.1 if visual scan benefit becomes clear)
- External OpenCTI deep-link from chip click (v6.2 candidate)
- Top-N + collapse (revisit only if real data shows degraded UX)
- Per-tab analytics (telemetry, no infra yet)
