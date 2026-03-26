---
phase: 11-threat-map
plan: 01
subsystem: api
tags: [sse, stix, geocoding, threat-map, openCTI, ip-api, laravel-streaming]

requires:
  - phase: 08-opencti-integration
    provides: "OpenCtiService for GraphQL queries with auth, retry, and error handling"
  - phase: 09-ip-search
    provides: "ip-api.com geocoding pattern and IpSearchService reference"
provides:
  - "ThreatMapService: STIX event parsing, IP extraction, attack classification, geo resolution"
  - "CountryCentroids: fallback lat/lng lookup for 68 countries"
  - "GET /api/threat-map/snapshot: cached recent events with counters"
  - "GET /api/threat-map/stream: SSE relay from OpenCTI with STIX enrichment"
affects: [11-02-threat-map-frontend]

tech-stack:
  added: []
  patterns: [SSE streaming relay, STIX event parsing, country centroid fallback geocoding]

key-files:
  created:
    - backend/app/Data/CountryCentroids.php
    - backend/app/Services/ThreatMapService.php
    - backend/app/Http/Controllers/ThreatMap/SnapshotController.php
    - backend/app/Http/Controllers/ThreatMap/StreamController.php
    - backend/tests/Unit/Services/ThreatMapServiceTest.php
    - backend/tests/Feature/ThreatMap/SnapshotTest.php
    - backend/tests/Feature/ThreatMap/StreamTest.php
  modified:
    - backend/routes/api.php

key-decisions:
  - "ThreatMapService does not inject OpenCtiService for SSE relay; stream controller handles HTTP streaming directly"
  - "resolveGeo accepts optional countryCode hint parameter for centroid fallback when ip-api fails"
  - "Attack type color mapping: red (C2/DDoS/malware), amber (scanning/BEC), violet (phishing/APT), cyan (recon/default)"

patterns-established:
  - "SSE relay pattern: StreamController connects to OpenCTI /stream, parses STIX data lines, enriches with geo, re-emits"
  - "Country centroid fallback: static data class with ISO alpha-2 to lat/lng mapping"

requirements-completed: [TMAP-01]

duration: 6min
completed: 2026-03-15
---

# Phase 11 Plan 01: Threat Map Backend Summary

**ThreatMapService with STIX parsing, geo resolution (ip-api + centroid fallback), SSE stream relay, and snapshot endpoints under Sanctum auth**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-15T02:33:30Z
- **Completed:** 2026-03-15T02:39:40Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- ThreatMapService parses STIX events, extracts IPs from ipv4-addr/ipv6-addr/indicator patterns, classifies attack types with color mapping
- CountryCentroids provides fallback geocoding for 68 countries when ip-api.com fails
- Snapshot endpoint returns cached events with computed counters (threats, countries, types)
- Stream endpoint relays OpenCTI SSE with heartbeat (30s), reconnect interval (10s), and connection abort detection
- 26 tests total: 20 unit tests + 6 feature tests all passing

## Task Commits

Each task was committed atomically:

1. **Task 1: CountryCentroids data class and ThreatMapService** - `a676e89` (feat) [TDD: RED-GREEN]
2. **Task 2: Snapshot and Stream controllers with routes and feature tests** - `8f2c3b8` (feat)

## Files Created/Modified
- `backend/app/Data/CountryCentroids.php` - Static lookup of lat/lng by ISO 3166-1 alpha-2 code (68 countries)
- `backend/app/Services/ThreatMapService.php` - STIX parsing, IP extraction, attack classification, geo resolution, snapshot
- `backend/app/Http/Controllers/ThreatMap/SnapshotController.php` - GET /api/threat-map/snapshot with counters
- `backend/app/Http/Controllers/ThreatMap/StreamController.php` - GET /api/threat-map/stream SSE relay
- `backend/routes/api.php` - Added threat-map routes under auth:sanctum
- `backend/tests/Unit/Services/ThreatMapServiceTest.php` - 20 unit tests for parsing, geo, colors
- `backend/tests/Feature/ThreatMap/SnapshotTest.php` - 4 feature tests for snapshot endpoint
- `backend/tests/Feature/ThreatMap/StreamTest.php` - 2 feature tests for stream endpoint

## Decisions Made
- ThreatMapService gets OpenCtiService injected for snapshot queries but stream controller handles SSE HTTP connection directly (streaming requires different HTTP client configuration than GraphQL)
- resolveGeo accepts an optional countryCode hint for centroid fallback when ip-api.com returns failure but caller has country context
- Attack type classification checks labels first (priority), then falls back to entity_type mapping

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. Uses existing OpenCTI and ip-api.com integrations.

## Next Phase Readiness
- Backend API layer complete for threat map consumption
- Frontend can consume GET /api/threat-map/snapshot for initial load and GET /api/threat-map/stream for real-time SSE events
- Ready for Phase 11 Plan 02 (frontend threat map integration)

---
*Phase: 11-threat-map*
*Completed: 2026-03-15*
