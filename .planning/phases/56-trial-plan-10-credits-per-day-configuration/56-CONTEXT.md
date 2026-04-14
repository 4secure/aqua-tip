# Phase 56: Observable Display - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

The Threat Database widget on the Threat Map page shows 0 counts for Email-Addr, Url, and Cryptocurrency-Wallet entity types, even though OpenCTI has data for them. The backend `fetchCounts()` method in DashboardService only queries 4 of 7 entity types. This phase adds the 3 missing types so all 7 stats display real counts.

</domain>

<decisions>
## Implementation Decisions

### Backend Data Gap
- **D-01:** Add `Email-Addr`, `Url`, and `Cryptocurrency-Wallet` to the `$entityTypes` array in `DashboardService::fetchCounts()` with labels "Email", "URL", and "Crypto Wallet" respectively
- **D-02:** No changes to the GraphQL query structure — the existing per-type filter query works for all STIX observable types

### Frontend Display
- **D-03:** No frontend changes needed — `STAT_CARD_CONFIG` in `dashboard-config.js` already lists all 7 types with correct colors and labels
- **D-04:** No display format changes for indicator values — all types (including email, URL, crypto) remain as plain monospace text in the Recent Indicators list
- **D-05:** URLs are NOT clickable — this is a threat intel context where malicious URLs should not be followed
- **D-06:** Widget ordering remains static per `STAT_CARD_CONFIG`: IP → Domain → Hostname → Cert → Email → Crypto → URL

### Claude's Discretion
- Whether to update the PHPDoc comment on `fetchCounts()` to reflect 7 types instead of 4
- Cache key remains unchanged (`dashboard_counts`) since the response shape is the same

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Backend (fix location)
- `backend/app/Services/DashboardService.php` — `fetchCounts()` method, lines 103-151. The `$entityTypes` array on lines 105-110 needs 3 new entries.
- `backend/app/Http/Controllers/Dashboard/CountsController.php` — Controller passes through to DashboardService, no changes needed

### Frontend (verify-only)
- `frontend/src/data/dashboard-config.js` — `STAT_CARD_CONFIG` already lists all 7 types (lines 1-9), `TYPE_BADGE_COLORS` has colors for Email-Addr and Url (lines 11-20)
- `frontend/src/components/threat-map/RightOverlayPanel.jsx` — Threat Database widget (lines 201-217) and Recent Indicators (lines 140-173) already handle any entity type generically

### Requirements
- `.planning/REQUIREMENTS.md` — OBS-01, OBS-02, OBS-03

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DashboardService::fetchCounts()` pattern: iterates over `$entityTypes` array, runs one GraphQL query per type with entity_type filter, returns `[entity_type, label, count]` array
- `STAT_CARD_CONFIG` already maps all 7 entity types to labels and colors
- `StatRow` component in RightOverlayPanel renders any entity type generically

### Established Patterns
- Sequential GraphQL queries per entity type (not batched) — acceptable for 7 queries with 5-min cache
- Stale-cache fallback on OpenCTI connection failure
- Frontend renders whatever the API returns, matched against STAT_CARD_CONFIG

### Integration Points
- `GET /api/dashboard/counts` — returns array of `{entity_type, label, count}` objects
- Frontend looks up counts by `config.entity_type` key — missing types show as 0 (current bug behavior)

</code_context>

<specifics>
## Specific Ideas

- The root cause is a backend omission: only 4 of 7 entity types were added to the query list when the dashboard was built
- The frontend was always ready for all 7 types — this is purely a backend data gap
- No visual or interaction changes are needed

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 56-trial-plan-10-credits-per-day-configuration*
*Context gathered: 2026-04-14*
