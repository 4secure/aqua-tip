---
phase: 59-backend-snapshot-resize-victimology-endpoint
verified: 2026-04-17T00:00:00Z
status: human_needed
score: 17/18 must-haves verified (automated); SC5 awaits on-network GraphiQL verification
overrides_applied: 0
re_verification: null
human_verification:
  - test: "OpenCTI GraphiQL Verification A — Identity sub-type discrimination"
    expected: "entity_type literals for identities are exactly 'Organization', 'Individual', 'System'; PHP `match` arms in normalizeVictimology use these exact strings"
    why_human: "Requires live network access to http://192.168.251.20:8080/graphql; executor worktree was off-network per 59-02-GRAPHIQL-NOTES.md resume signal"
  - test: "OpenCTI GraphiQL Verification B — toTypes: [\"Identity\"] filter behavior"
    expected: "Running stixCoreRelationships(relationship_type: \"targets\", toTypes: [\"Identity\"]) on APT28 returns mix of Organization/Individual/System entities; PHP filter retains only Organization"
    why_human: "Requires live OpenCTI instance to inspect real Identity edges"
  - test: "OpenCTI GraphiQL Verification C — Country ISO-2 source field"
    expected: "Country.x_opencti_aliases actually carries ISO-2 codes (e.g. 'US') for representative countries; OR a direct scalar (code/country_code) exists on Country and should be used instead"
    why_human: "Requires introspection + real-data probe against live OpenCTI schema; if direct scalar exists, heredoc + extractIsoCode helper need follow-up swap"
  - test: "OpenCTI GraphiQL Verification D — consolidated toTypes multi-type query"
    expected: "victimology: stixCoreRelationships(toTypes: [\"Country\", \"Region\", \"Sector\", \"Identity\"], first: 200) runs without validation errors and returns non-empty buckets on representative actor (e.g., APT28) within 5s"
    why_human: "Requires live OpenCTI instance; validates PITFALL-13 mitigation under real load"
  - test: "End-to-end enrichment against live OpenCTI"
    expected: "`php artisan tinker` → `app(\\App\\Services\\ThreatActorService::class)->enrichment('<real-apt28-id>')` returns array with `victimology` key populated with at least one non-empty sub-array"
    why_human: "Validates SC5 and confirms Plan 02 output against actual OpenCTI data; off-network worktree could only verify against mocks"
---

# Phase 59: Backend Snapshot Resize + Victimology Endpoint Verification Report

**Phase Goal:** The backend serves configurable-size snapshots and enriches threat actors with victimology data.
**Verified:** 2026-04-17
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

#### Plan 59-01 (MAPBUF-06) — Snapshot Resize

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | GET /api/threat-map/snapshot?limit=500 returns up to 500 events | ✓ VERIFIED | Test `passes 500 to service` + `uses separate caches for each whitelisted limit` (returns 5-element array for limit=500). Controller passes `$limit` to `getSnapshot($limit)` at `SnapshotController.php:40`; service caches under `threat_map:snapshot:500` (`ThreatMapService.php:221`). |
| 2 | GET /api/threat-map/snapshot?limit=100 returns up to 100 events cached separately from limit=500 | ✓ VERIFIED | Test `uses separate caches for each whitelisted limit` (1-element for 100 vs 5-element for 500). Semantic cache key `threat_map:snapshot:{$limit}` interpolates `$limit`; each value produces a distinct Redis key. |
| 3 | GET /api/threat-map/snapshot?limit=99 silently defaults to 100 (no 422, no error) | ✓ VERIFIED | Test `?limit=99 defaults to 100 (non-whitelisted numeric)` — Mock expects `->with(100)`, assertion returns 200. Controller: `in_array($requested, self::ALLOWED_LIMITS, true)` falls to `DEFAULT_LIMIT`. |
| 4 | GET /api/threat-map/snapshot?limit=abc silently defaults to 100 | ✓ VERIFIED | Test `?limit=abc defaults to 100 (non-numeric)`. `$request->integer('limit')` returns 0 on non-numeric → fails whitelist → fallback. |
| 5 | GET /api/threat-map/snapshot with no limit param returns up to 100 events | ✓ VERIFIED | Test `with no limit param defaults to 100`. |
| 6 | Country counter aggregation (countries/types/countryCounts) reflects the full resized event array | ✓ VERIFIED | Test `aggregates counters over full resized event array` — 7 events → threats=7, countries=3, countryCounts has 3 entries. Aggregation uses `collect($events)` over whole mocked payload. |
| 7 | Snapshot route remains public (no auth:sanctum middleware) | ✓ VERIFIED | `routes/api.php:106` — route defined OUTSIDE `auth:sanctum` group; test `is publicly accessible and returns 200 (no auth required)` asserts 200 with no `actingAs()` call. |

#### Plan 59-02 (VICTM-09) — Victimology Enrichment

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 8 | OpenCTI GraphiQL confirmed to resolve toTypes: ["Identity"] with Organization concrete-type fragment | ? HUMAN NEEDED | 59-02-GRAPHIQL-NOTES.md records `deferred, using assumed shape from research (x_opencti_aliases + "Organization")` — parallel worktree off-network. Code proceeds on assumed-shape contract; requires on-network engineer to confirm before v6.1 ships. |
| 9 | Country ISO-2 source field confirmed via GraphiQL introspection (x_opencti_aliases vs direct scalar) | ? HUMAN NEEDED | Same deferral reason as #8. `extractIsoCode` helper with regex `/^[A-Z]{2}$/` is the fallback path. |
| 10 | GET /api/threat-actors/{id}/enrichment response contains a top-level 'victimology' key with four sub-arrays | ✓ VERIFIED | Test `enrichment returns all 6 keys including victimology` + `returns victimology with 4 sub-keys`. Response shape: `[ttps, tools, malware, campaigns, victimology, relationships]` with `victimology: {countries, regions, sectors, organizations}`. |
| 11 | An actor with known targets returns at least one non-empty sub-array | ✓ VERIFIED | Test `GET /api/threat-actors/{id}/enrichment returns 200 with victimology for authenticated user` — mocked Country + Organization edges populate their buckets. |
| 12 | An actor with NO targets returns empty victimology with HTTP 200 (no 500) | ✓ VERIFIED | Test `returns empty victimology for actor with no targets (SC3)` — default empty mock returns 200 with all 4 sub-arrays empty. |
| 13 | Parse-level failure inside normalizeVictimology is logged via Log::warning and degrades to empty arrays — rest of enrichment continues | ✓ VERIFIED | `safeNormalizeVictimology` at `ThreatActorService.php:688-700` catches `\Throwable`, calls `Log::warning('Victimology sub-query failed', ...)`, returns empty. Test `skips malformed edges without throwing` verifies no-exception path for multiple malformed inputs. |
| 14 | Identity sub-types Individual and System are filtered OUT of the organizations array | ✓ VERIFIED | Test `enrichment filters Individual and System out of organizations (PITFALL-12)` — asserts `allIds` does NOT contain individual-john or system-srv-01. `match` arm at `ThreatActorService.php:740` uses `default => null`. |
| 15 | Consolidated single stixCoreRelationships block is used — NOT 4 aliased blocks | ✓ VERIFIED | `ThreatActorService.php:350-378` shows a single `victimology: stixCoreRelationships(... toTypes: ["Country", "Region", "Sector", "Identity"] ...)` block. No `targetedCountries:`/`targetedRegions:`/etc. aliases exist in the enrichment query (the `targetedCountries:` alias elsewhere in the file is in the LIST query, not enrichment). |
| 16 | Existing enrichment keys (ttps, tools, malware, campaigns, relationships) continue to return unchanged — victimology is additive | ✓ VERIFIED | `normalizeEnrichmentResponse` at `ThreatActorService.php:473-488` preserves all 5 pre-existing keys, adds `victimology` as a 6th key. Test asserts keys in exact order. `campaigns` block preserved per D-12. |
| 17 | Victimology data is cached alongside the rest of the enrichment payload under threat_actor_enrichment:{id} | ✓ VERIFIED | `enrichment()` at `ThreatActorService.php:248-257` — unchanged cache wrapper; 15-min TTL and `threat_actor_enrichment:` prefix intact. Victimology rides inside the same cached array. |
| 18 | Country items include country_code (ISO-2 string) or null | ✓ VERIFIED | Test `extracts ISO-2 country_code from x_opencti_aliases (first 2-char uppercase match)` — 4 variants (US, DE, no-match, empty) produce correct extractions. `extractIsoCode` at `ThreatActorService.php:769-778` returns first `/^[A-Z]{2}$/` alias or null. |

#### Cross-Plan Truth (ROADMAP SC5)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 19 | ROADMAP SC5 — OpenCTI Organization toTypes query verified against live GraphiQL at 192.168.251.20 — correct filter documented in code comment | ⚠ PARTIAL | **Code comment present**: `ThreatActorService.php:343-347` documents D-08 verification claim. **Actual verification deferred**: 59-02-GRAPHIQL-NOTES.md records `deferred` resume signal — off-network worktree used research-assumed shape; on-network verification is pending. |

**Score:** 17 / 18 automated truths VERIFIED; 1 partial (SC5 — documented but live-verify deferred to retrospective / on-network engineer). Plus 2 HUMAN NEEDED entries (truths 8 & 9) that overlap with the SC5 follow-up.

### Required Artifacts

#### Plan 59-01

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/app/Services/ThreatMapService.php` | getSnapshot(int $limit = 100) + fetchSnapshot(int $limit) + parameterized GraphQL + semantic cache key `threat_map:snapshot:{limit}` | ✓ VERIFIED | Line 218 `public function getSnapshot(int $limit = 100): array`; Line 221 `"threat_map:snapshot:{$limit}"`; Line 392 `private function fetchSnapshot(int $limit): array`; Line 412 `$this->openCti->query($graphql, ['first' => $limit])`; Line 395 heredoc `query ($first: Int!)`. |
| `backend/app/Http/Controllers/ThreatMap/SnapshotController.php` | `?limit` whitelist validation + pass-through to service; ALLOWED_LIMITS constant | ✓ VERIFIED | Line 18 `private const ALLOWED_LIMITS = [100, 500, 1000, 2000]`; Line 30 `public function __invoke(Request $request): JsonResponse`; Line 35 `in_array($requested, self::ALLOWED_LIMITS, true)`; Line 40 `getSnapshot($limit)`. |
| `backend/tests/Feature/ThreatMap/SnapshotTest.php` | cache isolation + whitelist + default fallback + aggregation coverage; 401 assertion fixed | ✓ VERIFIED | 11 tests green (34 assertions). 401 assertion replaced with 200 assertion at line 59. New tests for limit=500, limit=2000, separate caches, limit=99, limit=abc, no-limit, aggregation. `beforeEach(fn () => Cache::flush())` at line 10. |

#### Plan 59-02

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/app/Services/ThreatActorService.php` | Consolidated victimology GraphQL block + normalizeVictimology + safeNormalizeVictimology + extractIsoCode + GraphiQL verification comment | ✓ VERIFIED | Line 6 `use Illuminate\Support\Facades\Log`; Line 350 `victimology: stixCoreRelationships(`; Line 352 `toTypes: ["Country", "Region", "Sector", "Identity"]`; Line 688 `safeNormalizeVictimology`; Line 712 `normalizeVictimology`; Line 769 `extractIsoCode`; Lines 339-349 D-08 verification code comment. |
| `backend/tests/Feature/ThreatActor/EnrichmentTest.php` | Feature tests for victimology happy path, empty state, graceful degradation, Identity-sub-type filtering, dedup | ✓ VERIFIED | 12 tests green (65 assertions alongside 3 pre-existing ErrorSanitization enrichment tests). Helpers `fakeEnrichmentResponse`, `victimologyEdge`, `mockOpenCtiForEnrichment` present. |

### Key Link Verification

#### Plan 59-01

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| SnapshotController::__invoke | ThreatMapService::getSnapshot(int $limit) | whitelisted integer argument | ✓ WIRED | `SnapshotController.php:40` — `app(ThreatMapService::class)->getSnapshot($limit)`. |
| ThreatMapService::fetchSnapshot | OpenCtiService::query | parameterized GraphQL variable $first | ✓ WIRED | `ThreatMapService.php:412` — `$this->openCti->query($graphql, ['first' => $limit])`. Heredoc at line 395 uses `query ($first: Int!)`. |
| ThreatMapService::getSnapshot | Cache::remember | semantic per-limit cache key | ✓ WIRED | `ThreatMapService.php:220-224` — `Cache::remember("threat_map:snapshot:{$limit}", now()->addMinutes(15), fn () => $this->fetchSnapshot($limit))`. |

#### Plan 59-02

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| ThreatActorService::executeEnrichmentQuery | OpenCTI GraphQL | single consolidated stixCoreRelationships block with toTypes: [Country, Region, Sector, Identity] | ✓ WIRED | `ThreatActorService.php:350-378` — exactly one consolidated block with all 4 toTypes values. `$this->openCti->query($graphql, ['id' => $id])` at line 463. |
| ThreatActorService::normalizeEnrichmentResponse | ThreatActorService::safeNormalizeVictimology | per-section try/catch wrapper | ✓ WIRED | Line 482 — `'victimology' => $this->safeNormalizeVictimology($intrusionSet['victimology']['edges'] ?? [], $actorId)`. |
| ThreatActorService::normalizeVictimology | ThreatActorService::extractIsoCode | country_code extraction from x_opencti_aliases | ✓ WIRED | Line 735 — `'country_code' => $this->extractIsoCode($node['x_opencti_aliases'] ?? [])`. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| SnapshotController | `$events` → `data.events` | `app(ThreatMapService::class)->getSnapshot($limit)` → `Cache::remember` → `fetchSnapshot` → `OpenCtiService::query` (real GraphQL call) | Yes (in production); mocks return controlled data in tests | ✓ FLOWING |
| ThreatActorService::enrichment | `$intrusionSet['victimology']['edges']` → buckets | `$this->openCti->query($graphql, ['id' => $id])` with consolidated victimology block | Yes (in production, provided Task 0 GraphiQL verification holds); SC5 unresolved but code paths are wired end-to-end | ⚠ FLOWING-PENDING-LIVE-VERIFY |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| SnapshotTest suite green | `cd backend && php artisan test --filter=Snapshot` | 11 passed (34 assertions), 8.11s | ✓ PASS |
| EnrichmentTest suite green | `cd backend && php artisan test --filter=Enrichment` | 15 passed (12 new + 3 pre-existing ErrorSanitization) | ✓ PASS |
| ThreatActor + ThreatMap feature suites together | `cd backend && php artisan test tests/Feature/ThreatActor tests/Feature/ThreatMap` | 36 passed (132 assertions), 4.40s | ✓ PASS |
| Snapshot route registered | `php artisan route:list \| grep threat-map/snapshot` | `GET\|HEAD api/threat-map/snapshot → ThreatMap\SnapshotController` | ✓ PASS |
| Enrichment route registered inside feature-gated group | `php artisan route:list \| grep threat-actors/{id}/enrichment` | `GET\|HEAD api/threat-actors/{id}/enrichment → ThreatActor\EnrichmentController` | ✓ PASS |
| Live OpenCTI enrichment call returns non-empty victimology | `php artisan tinker` → `app(...)->enrichment('<real-id>')` | N/A — requires on-network | ? SKIP |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| MAPBUF-06 | 59-01 | Country-counter aggregation respects the active buffer size | ✓ SATISFIED | Test `aggregates counters over full resized event array` — 7 events aggregate to threats=7, countries=3; `countryCounts` reflects full buffer. Aggregation in `SnapshotController.php:47-72` iterates `collect($events)`. |
| VICTM-09 | 59-02 | Backend extends the existing actor enrichment GraphQL query with 4 new stixCoreRelationships blocks (consolidated), normalized into a victimology response key | ✓ SATISFIED | `ThreatActorService.php:350-378` consolidated block (single stixCoreRelationships with toTypes: [Country, Region, Sector, Identity]) + normalizeVictimology bucketing. Live-verification portion (SC5) deferred — see human_verification. |

**Orphaned requirements check:** `REQUIREMENTS.md` maps only MAPBUF-06 and VICTM-09 to Phase 59. Both are claimed by the plans — no orphans.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | No TODO/FIXME/dd()/dump()/placeholder patterns found in phase-modified files | — | — |

Clean — no anti-patterns in `ThreatMapService.php`, `SnapshotController.php`, `ThreatActorService.php`, or the two test files. Dead `// dd(...)` comments from prior code were removed per Plan 01 Task 1.

### Code Review Cross-Reference

The 59-REVIEW.md ran a standard-depth review and surfaced 2 warnings (WR-01 service-layer defense-in-depth whitelist, WR-02 `$group[0]` fragility) and 6 info items. These are **quality improvements**, not gaps blocking the phase goal — all phase success criteria can be met without addressing them. They should flow into a follow-up refactor or be accepted as technical debt.

### Human Verification Required

1. **OpenCTI GraphiQL Verification A — Identity sub-type discrimination**
   - **Test:** Open `http://192.168.251.20:8080/graphql`, run the identities query from 59-02-PLAN.md Task 0 step 2. Confirm `entity_type` literals are exactly `"Organization"`, `"Individual"`, `"System"`.
   - **Expected:** Values match; PHP `match` arms in `normalizeVictimology` use these exact strings.
   - **Why human:** Requires on-network access; worktree executor was off-network.

2. **OpenCTI GraphiQL Verification B — toTypes: ["Identity"] filter behavior**
   - **Test:** Run `stixCoreRelationships(relationship_type: "targets", toTypes: ["Identity"], first: 10)` against APT28 (or equivalent) per 59-02-PLAN.md Task 0 step 3.
   - **Expected:** Response includes Organization-typed entities; may also include Individual/System (filtered out in PHP).
   - **Why human:** Requires live OpenCTI.

3. **OpenCTI GraphiQL Verification C — Country ISO-2 source field**
   - **Test:** Run `__type(name: "Country")` introspection + `countries(search: "United States")` probe.
   - **Expected:** `x_opencti_aliases` contains ISO-2 strings like `"US"`; OR a direct `code`/`country_code` scalar exists (swap heredoc + remove `extractIsoCode` if so).
   - **Why human:** Requires live schema introspection.

4. **OpenCTI GraphiQL Verification D — consolidated toTypes multi-type query**
   - **Test:** Run the exact `victimology: stixCoreRelationships(toTypes: ["Country", "Region", "Sector", "Identity"], first: 200)` block from `ThreatActorService.php:350-378` against APT28.
   - **Expected:** No GraphQL validation errors; response time < 5s; at least one non-empty bucket.
   - **Why human:** Validates PITFALL-13 mitigation under real OpenCTI load.

5. **End-to-end enrichment against live OpenCTI**
   - **Test:** `cd backend && php artisan tinker` → `app(\App\Services\ThreatActorService::class)->enrichment('<real-apt28-id>')`.
   - **Expected:** Returns array with `victimology` key containing at least one non-empty sub-array (countries/regions/sectors/organizations).
   - **Why human:** Validates ROADMAP SC5 + SC2 end-to-end; off-network worktree could not run this.

All 5 items correspond to `59-02-GRAPHIQL-NOTES.md` follow-up — must complete before v6.1 ships.

### Gaps Summary

No goal-blocking gaps identified. All automated must-haves pass (17/18), the single partial item (truth 19 / SC5) is the live-GraphiQL verification that was explicitly deferred per the plan's off-network fallback contract. The deferred verification is logged in `59-02-GRAPHIQL-NOTES.md` as a retrospective follow-up, with PITFALL-12 defense-in-depth (match + `default => null`) and D-10 graceful degradation (`safeNormalizeVictimology` + `Log::warning`) in place to make any shape mismatch degrade safely rather than fail catastrophically.

Note on Plan 01 Task 0 latent bug: the pre-existing broken `returns 401 for unauthenticated user` assertion was fixed forward to match the actually-public route contract — not a regression, and listed in `deferred-items.md` (parallel agent) was resolved by Plan 59-01 itself.

---

_Verified: 2026-04-17_
_Verifier: Claude (gsd-verifier)_
