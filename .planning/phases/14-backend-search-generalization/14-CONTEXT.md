# Phase 14: Backend Search Generalization - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Backend accepts and processes searches for any of 9 observable types (IPv4, IPv6, Domain, URL, Email, MD5, SHA-1, SHA-256, Hostname) with auto-detection from OpenCTI response. New `POST /threat-search` endpoint runs alongside existing `/ip-search` (which stays untouched). Old frontend keeps working; Phase 15 migrates it.

</domain>

<decisions>
## Implementation Decisions

### Type detection
- No pre-detection regex — query OpenCTI by value only, read `entity_type` from the response
- Geo enrichment (ip-api.com) runs only when response `entity_type` is `IPv4-Addr` or `IPv6-Addr`
- No match returns `detected_type: null` — frontend shows "No results for [query]" without type context
- Input validation: basic sanity check only (reject empty, whitespace-only, >500 chars). Let OpenCTI handle whether it's a valid observable
- No-match response: 200 with `found: false` (same pattern as current `/ip-search`)

### Observable query mapping
- Same query depth for all 9 types: observable + relationships + indicators + sightings + notes + external references
- GraphQL filter uses `value` key only (drop `entity_type` filter from current IpSearchService pattern)
- File hashes: try the same `value` filter — if OpenCTI indexes hashes in `observable_value`, it just works
- Cache key: `threat_search:` + md5($query), same 15-minute TTL

### Response shape
- Top-level field renamed from `ip` to `query`
- New `detected_type` field from OpenCTI response's `entity_type` (null when not found)
- `geo` field always present — populated for IP types, `null` for everything else
- All other fields unchanged: `found`, `score`, `labels`, `description`, `created_by`, `created_at`, `updated_at`, `relationships`, `indicators`, `sightings`, `notes`, `external_references`, `raw`
- Credits payload unchanged

### Endpoint strategy
- New `POST /threat-search` with `deduct-credit` middleware (guests + auth, same as `/ip-search`)
- Old `/ip-search` stays untouched — runs `IpSearchService` independently until Phase 15 retires it
- ThreatSearch namespace: `ThreatSearch/SearchController`, `ThreatSearchRequest`, `ThreatSearchService`
- SearchLog: `module='threat_search'` + new nullable `type` column storing detected `entity_type`

### Claude's Discretion
- Exact validation rules for the sanity check (string length, character patterns)
- GraphQL query field selection for non-IP observable types
- Error handling granularity for individual sub-queries (relationships, indicators, etc.)
- Migration file details for the SearchLog `type` column

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing backend code (generalize from these)
- `backend/app/Services/IpSearchService.php` — Current IP-only search service with all GraphQL queries to replicate
- `backend/app/Services/OpenCtiService.php` — Generic GraphQL proxy, fully reusable as-is
- `backend/app/Http/Controllers/IpSearch/SearchController.php` — Credit gating + refund pattern to replicate
- `backend/app/Http/Requests/IpSearchRequest.php` — Current validation (ip-only), must be replaced
- `backend/routes/api.php` — Route registration pattern

### Requirements
- `.planning/REQUIREMENTS.md` — SRCH-01, SRCH-02, SRCH-05, SRCH-06, SRCH-07, SRCH-08, ROUTE-03

### Known blockers
- `.planning/STATE.md` §Blockers — File hash GraphQL filter syntax needs live validation against OpenCTI

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `OpenCtiService`: Generic GraphQL proxy with retry, error handling — use directly in ThreatSearchService
- `IpSearchService`: All 5 sub-queries (observable, relationships, indicators, sightings, notes) can be copied and simplified (remove entity_type filter)
- `deduct-credit` middleware: Already handles both guest and authenticated credit gating
- `SearchLog` model: Already tracks module + query, just needs new `type` column

### Established Patterns
- Service injection via constructor (`private readonly OpenCtiService $openCti`)
- Cache::remember with prefixed key + md5 hash
- Invokable controllers (`__invoke` method)
- Form request classes for validation
- Credit refund on provider failure (atomic DB increment)
- GraphQL query as heredoc strings with FilterGroup variables

### Integration Points
- `routes/api.php` — New route alongside existing `/ip-search`
- `SearchLog` migration — Add nullable `type` column
- No frontend changes in this phase

</code_context>

<specifics>
## Specific Ideas

- User explicitly wanted to avoid pre-detection regex — let OpenCTI do the work of matching values to types
- Clean-break approach: new service parallel to old, not modifying IpSearchService in place
- Same depth of data for all observable types — no second-class treatment for hashes or domains

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 14-backend-search-generalization*
*Context gathered: 2026-03-18*
