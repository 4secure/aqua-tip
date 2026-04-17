# Deferred Items — Phase 59 (Plan 02)

Out-of-scope issues discovered during execution that are NOT caused by this plan's changes.
Per the execute-plan scope boundary: log but do NOT fix.

## Pre-existing Pest Test Failures (17 total)

Confirmed pre-existing on baseline commit `22f47835` by running `php artisan test` with
`ThreatActorService.php` reset to its pre-plan state. Failure count and specific test names
are identical before and after the Plan 02 victimology changes.

### By Subsystem

- **IpSearch (5):**
  - `search includes geo data from OpenCTI observable when fields present`
  - `search falls back to ip-api.com when OpenCTI lacks geo data`
  - `search returns found=false with geo data when OpenCTI has no observable`
  - `it resolves geo from ip-api.com on success`
  - `it caches geo resolution results`

- **DarkWeb (5):**
  - `dark web search with auth and valid email returns 200 with breach data`
  - `dark web search with auth and valid domain returns 200 with breach results`
  - `dark web search with zero results deducts credit and returns found=0`
  - `dark web search creates SearchLog with module dark_web`
  - `dark web search masks passwords in results`

- **Plan (3):**
  - `plan seeder creates correct tiers`
  - `free plan does not have API access`
  - `it upgrades Free user immediately and boosts remaining credits`

- **ThreatMap (1):**
  - `GET /api/threat-map/snapshot returns 401 for unauthenticated user` (also the primary target of
    Plan 59-01, which is being worked concurrently by another agent — expected to be resolved there)

- **ThreatNews (3):**
  - `list returns normalized reports with all fields`
  - `list normalizes related entities from objects field`
  - `list handles empty objects edges gracefully`

### Scope

These failures live entirely in subsystems the victimology plan does NOT touch
(IP search, dark web search, plan seeding, threat-map snapshot, threat-news normalization).
None reference `ThreatActorService`, the enrichment endpoint, victimology, or GraphQL
queries for intrusion sets. Fixing them is out of scope for Plan 59-02.

### Recommendation

Route to a separate maintenance phase or to individual bug tickets. The ThreatMap snapshot
401 test is most likely resolved by Plan 59-01 (Backend Snapshot Resize), executing in
parallel in another worktree.
