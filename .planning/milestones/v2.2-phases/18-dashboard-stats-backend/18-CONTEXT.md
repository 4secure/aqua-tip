# Phase 18: Dashboard Stats Backend - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

DashboardService aggregating OpenCTI stats into separate cached endpoints. Users get live threat statistics from the dashboard API instead of hardcoded numbers. Three public endpoints return observable counts, recent indicators, and attack category distribution — all cached with 5-minute TTL and stale-cache fallback. The threat map widget uses the existing snapshot endpoint (no new work). Frontend rewrite is Phase 20.

</domain>

<decisions>
## Implementation Decisions

### Stat card definitions
- 4 stat cards showing total observable counts by entity type: IPv4-Addr, Domain-Name, Url, Email-Addr
- Raw count only — no deltas, sparklines, or historical comparisons (deferred to future milestone when snapshot history exists)
- Each card returns: entity type label + total count from OpenCTI

### Recent indicators table
- 10 most recent observables across all observable types (not limited to STIX Indicator entities)
- Fields per row: observable value, entity_type, OpenCTI score, created date
- Sorted by created date descending (most recent first)

### Attack categories source
- Category distribution from OpenCTI objectLabel counts (same approach as Threat News category chips — consistent pattern)
- Return top 6 labels by count — keeps the bar chart readable
- Each entry: label name + observable count

### Endpoint design
- Separate endpoints per widget (3 routes):
  - `GET /api/dashboard/counts` — 4 observable type counts
  - `GET /api/dashboard/indicators` — 10 recent observables
  - `GET /api/dashboard/categories` — top 6 label distribution
- All public (no auth required) — aggregate data, no credit cost, consistent with threat map snapshot
- 5-minute cache TTL for all three endpoints (matches DASH-06 auto-refresh interval)
- Stale-cache fallback when OpenCTI is unreachable (return last cached response)

### Threat map widget
- No new endpoint needed — existing `GET /api/threat-map/snapshot` already provides map data (DASH-04)

### Claude's Discretion
- Exact GraphQL queries for observable counts and label aggregation
- Stale-cache implementation strategy (Cache::remember vs manual get/put)
- Error handling granularity for individual endpoint failures
- DashboardService internal method organization
- Response envelope structure (consistent with existing patterns)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing backend patterns (replicate from these)
- `backend/app/Services/OpenCtiService.php` — Generic GraphQL proxy with retry, fully reusable
- `backend/app/Services/ThreatActorService.php` — Cache::remember pattern with 15min TTL, service injection
- `backend/app/Services/ThreatNewsService.php` — Label-based filtering pattern (objectLabel queries)
- `backend/app/Services/ThreatMapService.php` — Snapshot endpoint pattern, stale-cache approach
- `backend/app/Http/Controllers/ThreatMap/SnapshotController.php` — Public endpoint pattern (no auth middleware)

### Search service (recent pattern)
- `backend/app/Services/ThreatSearchService.php` — Latest service implementation, cache key pattern
- `backend/app/Services/IpSearchService.php` — Observable GraphQL query structure to adapt

### Route registration
- `backend/routes/api.php` — Route registration pattern for new endpoints

### Requirements
- `.planning/REQUIREMENTS.md` — DASH-01 (stat cards), DASH-02 (recent indicators), DASH-03 (attack categories), DASH-04 (map widget), DASH-06 (auto-refresh)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `OpenCtiService`: Generic GraphQL proxy (85 lines) — inject into DashboardService
- `ThreatMapService::getSnapshot()`: Already returns map widget data — no new work for DASH-04
- Cache::remember pattern: Used across all existing services with prefixed keys + md5 hash
- Invokable controller pattern: Used for SnapshotController, SearchController

### Established Patterns
- Service injection: `private readonly OpenCtiService $openCti` in constructor
- Cache keys: `dashboard_counts:`, `dashboard_indicators:`, `dashboard_categories:` (prefix + context hash)
- GraphQL queries as heredoc strings with FilterGroup variables
- Label queries: ThreatNewsService already queries objectLabel — same approach for category distribution

### Integration Points
- `routes/api.php` — 3 new public routes under `/api/dashboard/` prefix
- No auth middleware needed (public endpoints)
- No credit middleware needed (aggregate data, not user searches)
- Frontend integration deferred to Phase 20

</code_context>

<specifics>
## Specific Ideas

- Label-based categories consistent with Threat News approach (objectLabel is purpose-built for categorization in OpenCTI)
- Separate endpoints allow independent caching and parallel frontend fetches
- 5-min TTL aligns with frontend polling interval from DASH-06

</specifics>

<deferred>
## Deferred Ideas

- Delta percentages ("vs last week") on stat cards — requires historical snapshot infrastructure (DASH-F01, DASH-F02)
- Sparkline trend charts — requires historical data storage (DASH-F01)
- Quick search input on dashboard (DASH-F03)

</deferred>

---

*Phase: 18-dashboard-stats-backend*
*Context gathered: 2026-03-19*
