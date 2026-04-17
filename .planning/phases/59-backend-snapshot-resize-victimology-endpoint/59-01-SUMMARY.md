---
phase: 59-backend-snapshot-resize-victimology-endpoint
plan: 01
subsystem: api
tags: [backend, laravel, opencti, cache, threat-map, pest]

# Dependency graph
requires:
  - phase: prior-threat-map-phases
    provides: ThreatMapService + SnapshotController + OpenCtiService GraphQL proxy
provides:
  - "GET /api/threat-map/snapshot?limit={100|500|1000|2000} endpoint"
  - "ThreatMapService::getSnapshot(int $limit = 100) with per-limit semantic cache"
  - "SnapshotController::ALLOWED_LIMITS whitelist constant"
  - "Parameterized GraphQL snapshot query (first: $first) with OpenCtiService variables"
  - "Fixed SnapshotTest 401 assertion to match actually-public route contract"
affects: [phase-61-buffer-refactor, phase-62-buffer-size-dropdown]

# Tech tracking
tech-stack:
  added: []  # zero new dependencies
  patterns:
    - "Whitelist validation with silent fallback for public query params"
    - "Semantic per-param cache key (threat_map:snapshot:{limit}) over md5 hash"
    - "GraphQL variable interpolation via OpenCtiService::query(..., ['first' => $limit])"
    - "beforeEach(fn () => Cache::flush()) to prevent Pest cross-test cache bleed"

key-files:
  created: []
  modified:
    - "backend/app/Services/ThreatMapService.php (getSnapshot + fetchSnapshot signatures)"
    - "backend/app/Http/Controllers/ThreatMap/SnapshotController.php (Request + whitelist)"
    - "backend/tests/Feature/ThreatMap/SnapshotTest.php (+7 tests, -1 broken assertion)"

key-decisions:
  - "Inline whitelist in controller, not FormRequest — overkill for 4 discrete integer values"
  - "Semantic cache key (threat_map:snapshot:{limit}) — enables per-size artisan cache:forget"
  - "Silent default to 100 on invalid ?limit — no 422, public endpoint UX"
  - "Route stays public (outside auth:sanctum group) — dashboard depends on this"
  - "GraphQL first: is a variable, never string-concatenated — injection-safe"

patterns-established:
  - "Public-endpoint query-param whitelist: $request->integer + in_array strict check"
  - "Per-param semantic cache keys for small discrete parameter spaces"
  - "Cache::flush in Pest beforeEach for services that use Cache::remember"

requirements-completed: [MAPBUF-06]

# Metrics
duration: 17m
completed: 2026-04-17
---

# Phase 59 Plan 01: Backend Snapshot Resize Summary

**GET /api/threat-map/snapshot now accepts an optional ?limit query param whitelisted to [100, 500, 1000, 2000] with per-limit 15-min cache isolation — unblocks Phase 61/62 frontend buffer dropdown.**

## Performance

- **Duration:** 17m 6s
- **Started:** 2026-04-17T15:43:04Z
- **Completed:** 2026-04-17T16:00:10Z
- **Tasks:** 3 (all completed)
- **Files modified:** 3

## Accomplishments

- Snapshot endpoint accepts `?limit={100|500|1000|2000}` with semantic per-limit cache key `threat_map:snapshot:{limit}` (max 4 cache entries)
- Invalid/missing `?limit` silently defaults to 100 — no 422, public-endpoint UX preserved
- Country/type/countryCounts aggregation already iterates the full resized event array — MAPBUF-06 satisfied automatically
- Fixed latent `SnapshotTest` assertion that claimed the route returned 401 (it is intentionally public per routes/api.php:106) — replaced with a positive 200 assertion
- Added `beforeEach(Cache::flush())` scaffolding to prevent cross-test cache contamination on the new per-limit cache entries

## Task Commits

Each task was committed atomically (TDD where applicable):

1. **Task 0: Fix latent SnapshotTest 401 assertion + Cache::flush scaffolding** — `2e5fde8` (test)
2. **Task 1: Parameterize ThreatMapService::getSnapshot + fetchSnapshot** — `a82682b` (feat)
3. **Task 2: Wire SnapshotController whitelist + extend SnapshotTest (7 new tests)** — `01114d1` (feat)

## Files Created/Modified

- `backend/app/Services/ThreatMapService.php` — `getSnapshot(int $limit = 100)` with cache key `threat_map:snapshot:{limit}`; `fetchSnapshot(int $limit)` with parameterized GraphQL `query ($first: Int!) { stixCyberObservables(..., first: $first, ...) }`; variable passed via `$this->openCti->query($graphql, ['first' => $limit])`. Removed two dead `// dd()` debug comments.
- `backend/app/Http/Controllers/ThreatMap/SnapshotController.php` — New `private const ALLOWED_LIMITS = [100, 500, 1000, 2000]` and `DEFAULT_LIMIT = 100`. `__invoke(Request $request)` reads `$request->integer('limit')`, whitelist-validates with `in_array(..., self::ALLOWED_LIMITS, true)`, passes accepted integer (or 100 fallback) to service. Aggregation code unchanged (already buffer-size-agnostic).
- `backend/tests/Feature/ThreatMap/SnapshotTest.php` — Added `use Illuminate\Support\Facades\Cache;` + `beforeEach(fn () => Cache::flush())`. Replaced broken 401 assertion with a public-200 assertion. Added 7 new tests: `?limit=500`, `?limit=2000` (upper bound), cache-isolation between 100 and 500, `?limit=99` silent default, `?limit=abc` silent default, no-param silent default, aggregation over 7 events across 3 countries.

## Cache Key Pattern

```
threat_map:snapshot:100   (new — was threat_map:snapshot)
threat_map:snapshot:500   (new)
threat_map:snapshot:1000  (new)
threat_map:snapshot:2000  (new)
```

TTL: 15 minutes. Flush per-size via `php artisan tinker` → `Cache::forget('threat_map:snapshot:500')`.

## Test Count Delta

| Status | Count |
|--------|-------|
| Original tests (pre-phase)   | 4 |
| Broken 401 assertion removed | -1 |
| New tests added              | +7 |
| **Final total**              | **11** |

All 11 SnapshotTest tests green. Broader `tests/Feature/ThreatMap` suite: 13/13 green (11 SnapshotTest + 2 StreamTest, no regression).

## Note on Task 0 (latent bug fix)

The pre-existing test `'GET /api/threat-map/snapshot returns 401 for unauthenticated user'` was latently red — the snapshot route has always been defined OUTSIDE the `auth:sanctum` group at `routes/api.php:106` with the explicit comment *"used by dashboard map"*. The original assertion likely dates from a prior migration that moved the route public without updating the test, or was copied from an authenticated endpoint (e.g., ThreatActorIndexTest). Baseline run at phase start confirmed: anonymous `getJson('/api/threat-map/snapshot')` returns 200, not 401.

**Rationale for fixing forward (not gating behind auth):** the dashboard map page is explicitly public per `routes/api.php:106` comment and is consumed by unauthenticated marketing/demo users. Gating would be a UX regression. The test now asserts 200 with a mocked service, aligning with the real route contract.

## Decisions Made

- **Inline whitelist, not `FormRequest`**: Only 4 valid integer values; the controller is a single-method invokable; a dedicated FormRequest would be ceremony without benefit. Matches the existing style in `ThreatActor\IndexController` (`$request->query()` inline).
- **`$request->integer('limit')` over `$request->query()`**: Returns a strict int (Laravel 12 signature `: int`), so `?limit=abc` becomes `0` (fails whitelist → falls to 100). No manual `is_numeric` ceremony needed.
- **Semantic cache key `threat_map:snapshot:{limit}` over md5 hash**: `ThreatActorService::list` uses md5 because its param space is continuous (cursors, search strings); here the param space is 4 discrete values, so a human-readable key wins for ops/debugging.
- **Route stays public**: Did not move route behind `auth:sanctum`. Public access is the current, intended contract per the inline route comment.
- **`beforeEach(Cache::flush())`**: Added in Task 0 (not Task 2) so Task 1/Task 2 cache-isolation tests do not encounter stale entries from earlier tests.

## Deviations from Plan

None - plan executed exactly as written.

The plan correctly predicted (in `<interfaces>` and Pitfall 5 of the RESEARCH addendum) that the pre-existing 401 assertion was broken, and prescribed the exact fix — which was executed in Task 0 without modification.

## Issues Encountered

**1. Worktree missing `vendor/` and `.env`** (infrastructure, not a plan bug)
- Found: Running `php artisan test` in the worktree failed with `Failed to open stream: vendor/autoload.php`.
- Fix: Ran `composer install --no-interaction --prefer-dist --no-progress` in the worktree backend, then copied `.env` from the main repo.
- Impact: None on scope; tests then ran normally.

**2. Edit tool initially applied changes to main repo path instead of worktree path**
- Found: After first Edit to `backend/tests/Feature/ThreatMap/SnapshotTest.php`, `grep` in worktree bash showed unchanged file.
- Root cause: The Edit tool resolved the relative-looking absolute path to `C:\laragon\www\aqua-tip\backend\...` (main repo) instead of `C:\laragon\www\aqua-tip\.claude\worktrees\agent-a12a49eb\backend\...` (worktree).
- Fix: Reverted the accidental main-repo edit (`git checkout -- backend/tests/Feature/ThreatMap/SnapshotTest.php` in main), then re-applied all subsequent edits using the full worktree path.
- Impact: None on deliverables. Main repo is clean; worktree holds all committed work.

## User Setup Required

None - no external service configuration required. New query param is a safe, additive, backwards-compatible change to an existing public endpoint.

## Downstream Consumers

- **Phase 61 (frontend buffer refactor):** can now call `/api/threat-map/snapshot?limit=500` for the persistent buffer and trust the 15-min cache to absorb repeat requests.
- **Phase 62 (buffer-size dropdown):** the four whitelisted values `[100, 500, 1000, 2000]` exactly match the planned MAPCFG-01 dropdown presets — no frontend-side coercion needed.

## Next Phase Readiness

Plan 59-02 (victimology enrichment endpoint) is independent of 59-01 (different file: `ThreatActorService.php` not `ThreatMapService.php`) and can proceed in parallel. No shared state, no shared cache keys.

## Self-Check: PASSED

Verification performed:
- `backend/app/Services/ThreatMapService.php` — FOUND, contains `getSnapshot(int $limit = 100): array` and `"threat_map:snapshot:{$limit}"`
- `backend/app/Http/Controllers/ThreatMap/SnapshotController.php` — FOUND, contains `ALLOWED_LIMITS = [100, 500, 1000, 2000]`
- `backend/tests/Feature/ThreatMap/SnapshotTest.php` — FOUND, 11 tests green (`php artisan test --filter=Snapshot`)
- Commit `2e5fde8` (Task 0) — FOUND in git log
- Commit `a82682b` (Task 1) — FOUND in git log
- Commit `01114d1` (Task 2) — FOUND in git log
- Broader `tests/Feature/ThreatMap` suite — 13/13 green, no regression
- Route `api/threat-map/snapshot` — still registered via `php artisan route:list`, still public

---
*Phase: 59-backend-snapshot-resize-victimology-endpoint*
*Completed: 2026-04-17*
