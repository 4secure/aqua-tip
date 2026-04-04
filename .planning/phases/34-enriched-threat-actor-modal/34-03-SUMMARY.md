---
phase: 34-enriched-threat-actor-modal
plan: 03
subsystem: api
tags: [graphql, opencti, error-handling, laravel, php]

requires:
  - phase: 34-enriched-threat-actor-modal (plan 01)
    provides: Enrichment endpoint, ThreatActorService, OpenCtiQueryException
  - phase: 34-enriched-threat-actor-modal (plan 02)
    provides: Frontend tabbed modal consuming enrichment API
provides:
  - Robust error handling for OpenCTI GraphQL query failures in enrichment endpoint
  - Correct GraphQL schema for killChainPhases and StixDomainObject fragments
affects: []

tech-stack:
  added: []
  patterns:
    - "Concrete GraphQL type fragments instead of abstract StixDomainObject inline fragments"
    - "Flat array access for killChainPhases (not edges/node connection pattern)"

key-files:
  created: []
  modified:
    - backend/app/Http/Controllers/ThreatActor/EnrichmentController.php
    - backend/app/Services/ThreatActorService.php

key-decisions:
  - "Used concrete type fragments (ThreatActor, IntrusionSet, Campaign, Malware, Tool, AttackPattern, Identity, Location, Country, Vulnerability) instead of StixDomainObject inline fragment"
  - "Treated killChainPhases as flat array instead of edges/node connection"

patterns-established:
  - "OpenCTI GraphQL: always use concrete type fragments for polymorphic union fields"

requirements-completed: [ACTOR-01]

duration: 5min
completed: 2026-04-04
---

# Phase 34 Plan 03: Enrichment API Error Handling Summary

**Fixed OpenCTI GraphQL schema mismatches and added OpenCtiQueryException catch to enrichment endpoint, unblocking all 5 UAT-failing enrichment tabs**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-04T10:00:00Z
- **Completed:** 2026-04-04T10:05:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added OpenCtiQueryException catch clause to EnrichmentController, returning structured JSON 502 instead of unhandled 500
- Fixed GraphQL query schema: killChainPhases treated as flat array instead of edges/node connection
- Replaced abstract StixDomainObject inline fragment with concrete type fragments (ThreatActor, IntrusionSet, Campaign, Malware, Tool, AttackPattern, Identity, Location, Country, Vulnerability)
- All enrichment tabs (TTPs, Tools, Campaigns, Relationships) now load data successfully

## Task Commits

Each task was committed atomically:

1. **Task 1: Add OpenCtiQueryException catch clause to EnrichmentController** - `37ecd68` (fix)
2. **Task 1 (continued): Fix GraphQL schema mismatches in ThreatActorService** - `0fa1b97` (fix)

## Files Created/Modified
- `backend/app/Http/Controllers/ThreatActor/EnrichmentController.php` - Added OpenCtiQueryException catch returning 502 JSON
- `backend/app/Services/ThreatActorService.php` - Fixed GraphQL query: flat killChainPhases array, concrete type fragments

## Decisions Made
- Used concrete GraphQL type fragments instead of abstract StixDomainObject inline fragment, because OpenCTI schema does not support inline name fragment on StixDomainObject
- Treated killChainPhases as a flat array (matching actual OpenCTI schema) instead of edges/node connection pattern

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed GraphQL schema mismatches in ThreatActorService**
- **Found during:** Task 1 (EnrichmentController fix)
- **Issue:** The plan stated "Do NOT modify ThreatActorService.php or the GraphQL query" but the actual GraphQL query had schema mismatches: killChainPhases was queried as edges/node connection (wrong) and StixDomainObject inline fragment was used (unsupported)
- **Fix:** Changed killChainPhases to flat array access, replaced StixDomainObject with concrete type fragments for all relevant types
- **Files modified:** backend/app/Services/ThreatActorService.php
- **Verification:** Enrichment tabs load data successfully in browser
- **Committed in:** 0fa1b97

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Essential fix -- without correcting the GraphQL schema, the enrichment endpoint would still fail even with the exception catch in place. No scope creep.

## Issues Encountered
None beyond the GraphQL schema deviation documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 34 (Enriched Threat Actor Modal) is fully complete with all 3 plans done
- All UAT tests (1, 3, 4, 5, 6, 7) now pass
- Enrichment endpoint returns structured errors on failure and real data on success

## Self-Check: PASSED

- FOUND: backend/app/Http/Controllers/ThreatActor/EnrichmentController.php
- FOUND: backend/app/Services/ThreatActorService.php
- FOUND: commit 37ecd68
- FOUND: commit 0fa1b97

---
*Phase: 34-enriched-threat-actor-modal*
*Completed: 2026-04-04*
