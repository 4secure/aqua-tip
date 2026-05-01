# Phase 65: Frontend Campaigns Toggle — Discussion Log

> **Audit trail only.** Decisions are captured in CONTEXT.md.

**Date:** 2026-05-01
**Phase:** 65-frontend-campaigns-toggle
**Areas discussed:** File organization, Toggle UX (position + style), Search + view interaction, Detail modal scope (description gap + no-attribution handling)

---

## File Organization

| Option | Description | Selected |
|--------|-------------|----------|
| Extract + parent swaps views (Recommended) | New CampaignCard.jsx + CampaignDetailModal.jsx + api/threat-campaigns.js; ThreatActorsPage stays as parent that swaps views by URL param | ✓ |
| Separate page + layout wrapper | New ThreatCampaignsPage.jsx route with layout wrapper for the toggle | |
| Keep inline | Everything in ThreatActorsPage.jsx (~1500+ lines) | |

**User's choice:** Extract + parent swaps views.
**Notes:** ThreatActorsPage already at 986 lines post-Phase 64; extraction earns its keep here.

---

## Toggle Position

| Option | Description | Selected |
|--------|-------------|----------|
| Inline-left of search bar (Recommended) | Toggle on left, search on right of same toolbar row | ✓ |
| Toolbar-top full-width row | Toggle gets its own row above search/pagination | |
| Toolbar-left, search disappears in Campaigns view | Search hidden when view=campaigns | |

**User's choice:** Inline-left of search bar.

---

## Toggle Style

| Option | Description | Selected |
|--------|-------------|----------|
| Match modal tab-bar style (Recommended) | Reuse existing .tab-bar / .tab-item classes from modal | ✓ |
| Rounded pill with violet fill | Custom rounded-full pill with violet active state | |

**User's choice:** Match modal tab-bar style.
**Notes:** Visual consistency across the app, zero new CSS.

---

## Campaigns Search Box

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — same input, scoped per-view (Recommended) | Search visible in both views; toggling clears ?search= and ?after= per SC5 | ✓ |
| No — hide search in Campaigns view | Search renders only when view=actors | |
| Yes — search persists across toggle | Search term carries across toggle (violates SC5) | |

**User's choice:** Yes — same input, scoped per-view.

---

## URL Reset on Toggle

| Option | Description | Selected |
|--------|-------------|----------|
| Reset search + after; keep view (Recommended) | Toggle sets ?view=newview, deletes ?search= + ?after= | ✓ |
| Reset everything | Toggle goes to clean URL with only the new view param | |
| Reset only after, keep search | Search persists across toggle (violates SC5) | |

**User's choice:** Reset search + after.

---

## Detail Modal — "description" Gap

| Option | Description | Selected |
|--------|-------------|----------|
| Drop description — 5 fields modal (Recommended) | Render: name, objective, dates, attribution, labels. Skip description. | ✓ |
| Treat objective AS description — rename label | Use objective under "Description" heading | |
| Backend follow-up — extend Phase 60 to return description | Add description scalar to ThreatCampaignService GraphQL | |

**User's choice:** Drop description — 5 fields.
**Notes:** Backend doesn't return description; CAMP-06 prose is imprecise. Plan should clean up CAMP-06 wording.

---

## No-Attribution Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Hide attribution chip (Recommended) | Empty attributed_to → omit chip row on card and section in modal | ✓ |
| Show 'Unknown' placeholder chip | Render muted "Unknown attribution" chip for layout consistency | |

**User's choice:** Hide attribution chip.
**Notes:** Matches Phase 64 per-section empty-state pattern.

---

## Claude's Discretion

- Whether to extract `<CampaignChip>` helper if attribution + labels chip rendering duplicates across CampaignCard and CampaignDetailModal.
- Exact Tailwind tokens for the date range pill.
- Subtle hover affordance variations on cards.
- Whether `key={view}` re-mount on search input is sufficient or needs controlled-input refactor.
- Plan structure: 1 plan vs 2 plans (planner's call based on task density).

## Deferred Ideas

- Sort dropdown for Campaigns (v6.2)
- Clickable attributed_to chips deep-linking to Actors (v6.2)
- Campaign-IntrusionSet enrichment (out of v6.1 scope)
- Heatmap of campaign geography (already deferred via MAP-INTERACT)
- Per-view skeleton variants (v6.2 polish)
- Campaign filtering by label / time-range (future capability)
- REQUIREMENTS.md CAMP-06 description prose cleanup (plan task)
