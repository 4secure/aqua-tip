---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: OpenCTI Integration
status: completed
stopped_at: Completed 11-02-PLAN.md (checkpoint pending)
last_updated: "2026-03-15T02:46:55.719Z"
last_activity: 2026-03-15 -- Completed Phase 11 Plan 02 (Threat Map Frontend)
progress:
  total_phases: 4
  completed_phases: 4
  total_plans: 9
  completed_plans: 9
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-14)

**Core value:** Users can securely sign up, log in, and access the platform -- with rate-limited IP search for guests (1/day) and authenticated users (10/day).
**Current focus:** Phase 11 - Threat Map

## Current Position

Phase: 11 of 11 (Threat Map)
Plan: 2 of 2 complete
Status: Phase 11 complete (checkpoint pending human verification)
Last activity: 2026-03-15 -- Completed Phase 11 Plan 02 (Threat Map Frontend)

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**
- Total plans completed: 17 (v1.0: 13, v1.1: 4)
- Average duration: ~15 min (estimated from 2-day delivery of 17 plans)
- Total execution time: ~4.5 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| v1.0 Phases 1-5 | 13 | ~3h | ~14 min |
| v1.1 Phases 6-7 | 4 | ~1.5h | ~22 min |
| v2.0 Phase 8 | 2 | 12min | 6 min |
| v2.0 Phase 9-01 | 1 | 5min | 5 min |
| v2.0 Phase 9-02 | 1 | ~30min | ~30 min |
| Phase 09 P03 | 1min | 2 tasks | 2 files |
| v2.0 Phase 10-01 | 5min | 2 tasks | 7 files |
| v2.0 Phase 11-01 | 6min | 2 tasks | 8 files |
| Phase 11 P02 | 8min | 2 tasks | 8 files |

## Accumulated Context

### Decisions

All v1.0 and v1.1 decisions logged in PROJECT.md Key Decisions table.

- OpenCTI proxy pattern: Laravel holds Bearer token, frontend never talks to OpenCTI directly
- Zero new dependencies: Laravel HTTP client + raw GraphQL queries
- Server-side caching for browse pages (threat actors 15 min, news 5 min, map 15 min)
- Replaced IocDetectorService with Laravel's built-in ip validation rule
- Controller returns real OpenCTI data with credit refund on failure
- Geo data always from ip-api.com (OpenCTI IPv4-Addr has no geo fields)
- All credit tests mock IpSearchService to avoid real OpenCTI dependency
- Mirrored DarkWebProviderService pattern for OpenCtiService consistency
- 15s timeout with 2x retry on ConnectionException only for OpenCTI queries
- Dynamic tabs built from response data presence (Summary+Raw always shown)
- Indicators extracted from relationships (based-on) when direct query returns empty
- Field normalization in IpSearchService: geo.as/asname, score, labels, abstract, count
- [Phase 09]: OpenCtiConnectionException propagates for refund; OpenCtiQueryException degrades to geo-only
- [Phase 10]: Search as $search GraphQL variable, not filter; FilterGroup only when filters present
- [Phase 10]: Report related entities from objects connection with inline fragments for 5 entity types
- [Phase 10]: globalCount nullable -- frontend should handle missing total gracefully
- [Phase 10-02]: Detail modal instead of inline expand for dense card grids
- [Phase 10-02]: 21 cards per page for visual grid balance (7 rows of 3)
- [Phase 10-02]: Sophistication field removed -- not in OpenCTI IntrusionSet schema
- [Phase 10-02]: relationship_type must be string not array in OpenCTI GraphQL filters
- [Phase 11-01]: ThreatMapService does not inject OpenCtiService for SSE relay; stream controller handles HTTP streaming directly
- [Phase 11-01]: resolveGeo accepts optional countryCode hint for centroid fallback when ip-api fails
- [Phase 11-01]: Attack type color mapping: red (C2/DDoS/malware), amber (scanning/BEC), violet (phishing/APT), cyan (recon/default)
- [Phase 11]: Used apiClient (fetch-based) instead of axios for snapshot loading -- project convention
- [Phase 11]: Ref-based chart update for donut to avoid destroy/recreate on each SSE event

### Blockers/Concerns

- OpenCTI instance data availability not yet verified -- may need connectors configured
- Private network address (192.168.251.20) works locally but not from cloud hosting
- Credit cost for empty results -- product decision needed before Phase 9

## Session Continuity

Last session: 2026-03-15T02:46:55.714Z
Stopped at: Completed 11-02-PLAN.md (checkpoint pending)
Resume: Phase 11 Plan 02 complete. All v2.0 phases complete. Checkpoint pending for threat map human verification.
