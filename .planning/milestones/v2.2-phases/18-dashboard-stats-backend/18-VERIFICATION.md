---
phase: 18-dashboard-stats-backend
verified: 2026-03-19T12:00:00Z
status: passed
score: 6/6 must-haves verified
re_verification: false
---

# Phase 18: Dashboard Stats Backend Verification Report

**Phase Goal:** Users get live threat statistics from the dashboard API instead of hardcoded numbers
**Verified:** 2026-03-19T12:00:00Z
**Status:** passed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | GET /api/dashboard/counts returns 4 observable type counts (IPv4-Addr, Domain-Name, Url, Email-Addr) from OpenCTI | VERIFIED | DashboardService.php lines 105-110 define all 4 entity types; fetchCounts queries pageInfo.globalCount per type; CountsController returns `{'data': [...]}` |
| 2 | GET /api/dashboard/indicators returns 10 most recent observables with value, entity_type, score, created_at | VERIFIED | DashboardService.php fetchIndicators queries `first: 10, orderBy: created_at, orderMode: desc` with correct field mapping (observable_value->value, x_opencti_score->score) |
| 3 | GET /api/dashboard/categories returns top 6 label distribution from OpenCTI observables | VERIFIED | DashboardService.php fetchCategories queries 500 observables with objectLabel, aggregates with arsort, slices top 6 |
| 4 | All 3 endpoints are public (no auth middleware) and return 502 with message on OpenCTI failure | VERIFIED | Routes on api.php lines 79-81 are outside auth:sanctum group (which closes line 67). All 3 controllers catch OpenCtiConnectionException and return 502 with message string |
| 5 | All 3 endpoints use 5-min cache with stale-cache fallback when OpenCTI is unreachable | VERIFIED | All 3 public methods use manual Cache::get before try, Cache::put with addMinutes(5) on success, return cached on OpenCtiConnectionException catch. No Cache::remember used. |
| 6 | Threat map widget data is already served by existing GET /api/threat-map/snapshot (no new endpoint) | VERIFIED | api.php line 65 has existing ThreatMapSnapshotController route (inside auth group from prior phase) |

**Score:** 6/6 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/app/Services/DashboardService.php` | DashboardService with getCounts, getIndicators, getCategories methods | VERIFIED | 233 lines, class DashboardService, constructor injects OpenCtiService, 3 public + 3 private methods, stale-cache pattern |
| `backend/app/Http/Controllers/Dashboard/CountsController.php` | Invokable controller for /api/dashboard/counts | VERIFIED | 29 lines, __invoke returns JsonResponse, resolves DashboardService via app(), catches OpenCtiConnectionException -> 502 |
| `backend/app/Http/Controllers/Dashboard/IndicatorsController.php` | Invokable controller for /api/dashboard/indicators | VERIFIED | 29 lines, same pattern as CountsController, calls getIndicators() |
| `backend/app/Http/Controllers/Dashboard/CategoriesController.php` | Invokable controller for /api/dashboard/categories | VERIFIED | 29 lines, same pattern as CountsController, calls getCategories() |
| `backend/routes/api.php` | 3 public dashboard routes | VERIFIED | Lines 24-26 import controllers with aliases, lines 79-81 register 3 GET routes outside auth middleware |
| `backend/tests/Feature/Dashboard/CountsTest.php` | Feature tests for GET /api/dashboard/counts | VERIFIED | 4 tests: structure, public access, 502 fallback, entity type validation |
| `backend/tests/Feature/Dashboard/IndicatorsTest.php` | Feature tests for GET /api/dashboard/indicators | VERIFIED | 4 tests: structure, public access, 502 fallback, count validation |
| `backend/tests/Feature/Dashboard/CategoriesTest.php` | Feature tests for GET /api/dashboard/categories | VERIFIED | 4 tests: structure, public access, 502 fallback, count validation |
| `backend/tests/Unit/Services/DashboardServiceTest.php` | Unit tests for DashboardService cache and aggregation | VERIFIED | 7 tests: counts shape, stale-cache fallback, exception propagation, indicator normalization, top-6 aggregation, empty labels, cache write |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| DashboardService.php | OpenCtiService.php | constructor injection | WIRED | Line 11: `private readonly OpenCtiService $openCti` with type hint |
| CountsController.php | DashboardService.php | app() resolve in __invoke | WIRED | Line 20: `app(DashboardService::class)->getCounts()` |
| IndicatorsController.php | DashboardService.php | app() resolve in __invoke | WIRED | Line 20: `app(DashboardService::class)->getIndicators()` |
| CategoriesController.php | DashboardService.php | app() resolve in __invoke | WIRED | Line 20: `app(DashboardService::class)->getCategories()` |
| api.php | CountsController.php | Route::get registration | WIRED | Line 79: `Route::get('/dashboard/counts', DashboardCountsController::class)` |
| api.php | IndicatorsController.php | Route::get registration | WIRED | Line 80: `Route::get('/dashboard/indicators', DashboardIndicatorsController::class)` |
| api.php | CategoriesController.php | Route::get registration | WIRED | Line 81: `Route::get('/dashboard/categories', DashboardCategoriesController::class)` |
| CountsTest.php | DashboardService.php | service mock binding | WIRED | `app()->bind(DashboardService::class, ...)` with Mockery mock |
| DashboardServiceTest.php | OpenCtiService.php | OpenCtiService mock | WIRED | `Mockery::mock(OpenCtiService::class)` passed to constructor |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-----------|-------------|--------|----------|
| DASH-01 | 18-01, 18-02 | User sees live observable count stat cards from OpenCTI | SATISFIED | GET /api/dashboard/counts returns 4 entity type counts via OpenCTI GraphQL; feature + unit tests verify structure |
| DASH-02 | 18-01, 18-02 | User sees recent indicators table with real observables from OpenCTI | SATISFIED | GET /api/dashboard/indicators returns 10 recent observables with value, entity_type, score, created_at; tests verify |
| DASH-03 | 18-01, 18-02 | User sees attack categories bar chart from OpenCTI label distribution | SATISFIED | GET /api/dashboard/categories returns top 6 labels by count from objectLabel aggregation; unit test verifies sort + exclusion |
| DASH-04 | 18-01 | User sees threat map widget using existing snapshot endpoint | SATISFIED | Existing GET /api/threat-map/snapshot route confirmed in api.php line 65; no new endpoint needed |
| DASH-06 | 18-01, 18-02 | Dashboard auto-refreshes stats every 5 minutes | SATISFIED | All 3 endpoints use 5-min cache TTL (addMinutes(5)); frontend polling support enabled. Unit test verifies cache write. |

No orphaned requirements found -- REQUIREMENTS.md maps DASH-01 through DASH-04 and DASH-06 to Phase 18, and all 5 are claimed in plan frontmatter.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | - | - | - | - |

No TODO/FIXME/placeholder comments, no empty implementations, no stub returns found in any phase artifacts.

### Human Verification Required

### 1. OpenCTI GraphQL Query Validation

**Test:** With a live OpenCTI instance, call GET /api/dashboard/counts, GET /api/dashboard/indicators, GET /api/dashboard/categories
**Expected:** Each returns 200 with populated data arrays matching expected shapes
**Why human:** GraphQL query syntax and field names (stixCyberObservables, pageInfo, globalCount, objectLabel) can only be validated against a live OpenCTI instance

### 2. Stale-Cache Fallback Under Real Failure

**Test:** Call an endpoint successfully (populates cache), then stop OpenCTI, call endpoint again
**Expected:** Returns stale cached data instead of 502
**Why human:** Requires intentional service disruption that cannot be simulated in automated checks

### Gaps Summary

No gaps found. All 6 observable truths verified. All 9 artifacts exist, are substantive, and are fully wired. All 5 requirement IDs (DASH-01 through DASH-04, DASH-06) are satisfied by the implementation. All 4 commits (da77247, ebbeb34, 6bdd67c, f231cc8) verified in git history. No anti-patterns detected.

---

_Verified: 2026-03-19T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
