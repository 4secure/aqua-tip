---
phase: 34-enriched-threat-actor-modal
plan: 01
subsystem: api
tags: [opencti, graphql, mitre-attack, threat-actors, laravel, caching]

requires:
  - phase: 10-threat-actors
    provides: ThreatActorService with OpenCTI GraphQL query pattern and stixCoreRelationships aliases
provides:
  - GET /api/threat-actors/{id}/enrichment endpoint returning TTPs, tools, malware, campaigns, relationships
  - ThreatActorService::enrichment() with 15-min cache and MITRE ATT&CK tactic grouping
affects: [34-02-enriched-threat-actor-modal, frontend modal tabs consuming enrichment data]

tech-stack:
  added: []
  patterns: [tactic-grouped TTPs normalization, fromTypes campaign direction, kill chain order sorting]

key-files:
  created:
    - backend/app/Http/Controllers/ThreatActor/EnrichmentController.php
  modified:
    - backend/app/Services/ThreatActorService.php
    - backend/routes/api.php

key-decisions:
  - "Tactic grouping uses hardcoded MITRE ATT&CK kill chain order array with 'other' fallback for unclassified techniques"
  - "Campaign relationships extracted from 'from' node (Campaign --attributed-to--> IntrusionSet direction)"

patterns-established:
  - "Enrichment endpoint pattern: single-entity deep query with relationship normalization"
  - "TTP normalization: group by phase_name, filter kill_chain_name=mitre-attack, sort by kill chain order"

requirements-completed: [ACTOR-01]

duration: 2min
completed: 2026-03-30
---

# Phase 34 Plan 01: Backend Enrichment Endpoint Summary

**Threat actor enrichment API endpoint querying OpenCTI for TTPs grouped by MITRE ATT&CK tactic, tools, malware, campaigns, and relationships with 15-min server-side cache**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-30T21:16:32Z
- **Completed:** 2026-03-30T21:18:46Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments
- Created EnrichmentController following existing invokable controller pattern with OpenCtiConnectionException handling
- Added ThreatActorService::enrichment() with GraphQL query fetching attack patterns (with killChainPhases and x_mitre_id), tools, malware, campaigns (fromTypes direction), and general relationships
- TTPs normalized and grouped by MITRE ATT&CK tactic in kill chain order (14 tactics + 'other' fallback)
- Route registered at GET /api/threat-actors/{id}/enrichment inside auth:sanctum group

## Task Commits

Each task was committed atomically:

1. **Task 1: Backend enrichment endpoint (controller + service + route)** - `1ba6bfb` (feat)

## Files Created/Modified
- `backend/app/Http/Controllers/ThreatActor/EnrichmentController.php` - Invokable controller for single threat actor enrichment
- `backend/app/Services/ThreatActorService.php` - Added enrichment(), executeEnrichmentQuery(), normalizeEnrichmentResponse(), normalizeTtps(), normalizeTools(), normalizeMalware(), normalizeCampaigns(), normalizeRelationships(), normalizeRelationshipEntity() methods
- `backend/routes/api.php` - Registered enrichment route with import alias

## Decisions Made
- Used hardcoded tactic order array matching MITRE ATT&CK kill chain (14 phases) rather than fetching order from OpenCTI, since kill chain order is stable
- Campaign extraction uses `from` node (not `to`) because Campaign --attributed-to--> IntrusionSet places the campaign as the source entity
- Relationship entity name falls back through name -> observable_value -> entity_type for broad coverage

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Enrichment endpoint ready for frontend consumption in Plan 02 (modal tabs)
- Response structure (ttps, tools, malware, campaigns, relationships) matches planned frontend tab data needs

---
*Phase: 34-enriched-threat-actor-modal*
*Completed: 2026-03-30*
