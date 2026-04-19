---
phase: 60-backend-campaigns-service-endpoint
verified: 2026-04-18T12:00:00Z
status: human_needed
score: 4/4 success-criteria verified
overrides_applied: 0
human_verification:
  - test: "Hit live endpoint in running Laravel server with a real Sanctum token"
    expected: "GET /api/threat-campaigns returns 200 with {data: {items: [...], pagination: {...}}}, second request within 15 min is visibly faster (cache hit)"
    why_human: "Requires running `php artisan serve` + a real Sanctum-authenticated session; automated Pest suite already proves the contract at the HTTP + service layer, but a live smoke test against the deployed OpenCTI endpoint is a human task"
  - test: "Smoke-check against production OpenCTI data via the backend-configured endpoint"
    expected: "Endpoint returns at least one Campaign with a non-empty attributed_to array (when dataset is non-empty); payload carries all 7 required SC1 fields (id, name, description, first_seen, last_seen, objective, attributed_to)"
    why_human: "Dataset content depends on the live OpenCTI instance; Pest fixture proves shape but not real-data shape; a one-off manual curl against staging/prod confirms the cross-endpoint query execution parity recorded in 60-02-GRAPHIQL-NOTES.md"
---

# Phase 60: Backend Campaigns Service & Endpoint Verification Report

**Phase Goal:** The backend exposes a paginated Campaigns endpoint backed by a standalone OpenCTI service.
**Verified:** 2026-04-18T12:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Success Criteria)

| #   | Truth                                                                                                                                                                                                                                                                                              | Status      | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| SC1 | `GET /api/threat-campaigns` returns a paginated list of Campaign entities with fields `id`, `name`, `description`, `first_seen`, `last_seen`, `objective`, `attributed_to` (linked Intrusion Set name)                                                                                            | ✓ VERIFIED  | Service `normalizeResponse()` emits all 7 fields plus 5 more (aliases, modified, created, labels, external_references) — [ThreatCampaignService.php:204-221](backend/app/Services/ThreatCampaignService.php). Heredoc selects `id, name, description, first_seen, last_seen, objective, aliases, modified, created, objectLabel, externalReferences, attributed_to` ([ThreatCampaignService.php:117-160](backend/app/Services/ThreatCampaignService.php)). Pest test `list returns normalized campaigns with all fields` asserts all 12 item keys + 5 pagination keys + `attributed_to[0] == {id: "intrusion-set-apt1", name: "APT1"}` ([IndexTest.php:154-169](backend/tests/Feature/ThreatCampaign/IndexTest.php)) — PASS. |
| SC2 | Calling the endpoint twice within 15 minutes returns the second response from cache (verified via response time drop and `Cache::has()` in tests)                                                                                                                                                  | ✓ VERIFIED  | Service uses `Cache::remember($cacheKey, now()->addMinutes(15), $closure)` ([ThreatCampaignService.php:64-72](backend/app/Services/ThreatCampaignService.php)). Cache key prefixed with `threat_campaigns:`. Pest test `list caches results for 15 minutes` rebinds mock between calls, asserts second call returns the first call's 2-item payload from cache, and asserts `Cache::has('threat_campaigns:' . md5(...))` is true, plus negative assertion that `threat_actors:` namespace is NOT populated (Pitfall 4 isolation) ([IndexTest.php:204-228](backend/tests/Feature/ThreatCampaign/IndexTest.php)) — PASS.                                                                                                       |
| SC3 | A free-plan user receives 403 (feature-gated) — confirmed via `php artisan route:list \| grep threat-campaigns` showing the `feature-gate` middleware                                                                                                                                              | ✓ VERIFIED  | `php artisan route:list --path=threat-campaigns -v` output shows middleware stack `api → Illuminate\Auth\Middleware\Authenticate:sanctum → App\Http\Middleware\FeatureGate` on `GET api/threat-campaigns → ThreatCampaign\IndexController`. Pest test `GET /api/threat-campaigns returns 403 for free-plan user` asserts 403 + `error: upgrade_required` + `message: Upgrade your plan to access this feature` with free-plan user whose `trial_ends_at = now()->subDay()` (Pitfall 3 killswitch) ([IndexTest.php:307-322](backend/tests/Feature/ThreatCampaign/IndexTest.php)) — PASS. 401 unauth, 200 basic, 200 trial all pass as complementary gate tests.                                                               |
| SC4 | Campaign fields never bleed IntrusionSet-only fields (no `primary_motivation`, no `resource_level`) — GraphQL query uses `CampaignsOrdering` enum, not `IntrusionSetsOrdering`                                                                                                                     | ✓ VERIFIED  | `grep CampaignsOrdering ThreatCampaignService.php` → 4 matches (heredoc type decl + docblock + 2 comments). `grep 'IntrusionSetsOrdering\|intrusionSets(\|primary_motivation\|resource_level'` → 0 matches. `grep 'motivation\|goals\|targetedCountries\|targetedSectors'` → 0 matches. Positive Pest test `list uses CampaignsOrdering enum` asserts heredoc contains `$orderBy: CampaignsOrdering` + `campaigns(` + `toTypes: ["Intrusion-Set"]` and does NOT contain `IntrusionSetsOrdering` / `intrusionSets(` ([IndexTest.php:183-202](backend/tests/Feature/ThreatCampaign/IndexTest.php)). Negative test `list never emits IntrusionSet-only fields` asserts response items lack all forbidden keys — PASS.              |

**Score:** 4/4 success criteria verified

### Required Artifacts

| Artifact                                                               | Expected                                                                                   | Status     | Details                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `backend/app/Services/ThreatCampaignService.php`                       | Standalone service: list() + executeQuery() + normalizeResponse() + flatten helpers        | ✓ VERIFIED | Exists (306 lines). `class ThreatCampaignService` with constructor-promoted `private readonly OpenCtiService $openCti`. Public `list()` (5 positional args, no motivation param). Private `executeQuery`, `normalizeResponse`, `flattenAttributedTo`, `flattenLabels`, `flattenExternalReferences`. No `extends`, no ThreatActorService import (PITFALL-09). |
| `backend/app/Http/Controllers/ThreatCampaign/IndexController.php`      | Single-action invokable controller: `__invoke(Request) → JsonResponse`                     | ✓ VERIFIED | Exists (45 lines). Reads `after/search/sort/order` query params, hardcodes `first=24` (D-04), catches `OpenCtiConnectionException` → 502, returns `{data: {items, pagination}}`. No motivation, no ThreatActorService reference.                                                                                                                             |
| `backend/routes/api.php` (route registration)                          | `Route::get('/threat-campaigns', ThreatCampaignIndexController::class)` inside feature-gate | ✓ VERIFIED | Line 81 inside `Route::middleware('feature-gate')->group(...)` block (line 71). Import alias at line 21. Route:list confirms middleware chain.                                                                                                                                                                                                               |
| `backend/tests/Feature/ThreatCampaign/IndexTest.php`                   | 10 tests covering SC1-SC4 + error paths + attribution dedup                                 | ✓ VERIFIED | Exists (349 lines). 3 helpers (`fakeCampaignsResponse`, `mockOpenCtiForCampaigns`, `createPlan` guarded with `function_exists`), 5 Wave 1 service tests, 5 Wave 2 HTTP tests. All 10 pass (56 assertions, 1.23s).                                                                                                                                            |
| `.planning/phases/60-backend-campaigns-service-endpoint/60-02-GRAPHIQL-NOTES.md` | D-12 live schema verification artifact                                                     | ✓ VERIFIED | `Status: verified` (not fallback). Captures CampaignsOrdering enum values, campaigns root args, attributed-to direction (edge.node.to with `... on IntrusionSet`), direct `objective` field confirmed. Wave 1 code-comment block transcribed verbatim into ThreatCampaignService.php:85-97.                                                                  |

### Key Link Verification

| From                                          | To                                  | Via                                                                      | Status  | Details                                                                                                                                                                                                              |
| --------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------ | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ThreatCampaignService                         | OpenCtiService                      | `private readonly OpenCtiService $openCti` constructor injection         | WIRED   | Line 22-24. `$this->openCti->query($graphql, $variables)` at line 181. DI pattern parity with ThreatActorService.                                                                                                      |
| ThreatCampaignService                         | `Illuminate\Support\Facades\Cache`  | `Cache::remember($key, now()->addMinutes(15), $closure)`                 | WIRED   | `use Illuminate\Support\Facades\Cache` at line 5. `Cache::remember` at line 68 with 15-min TTL and `threat_campaigns:` key prefix.                                                                                   |
| ThreatCampaign\IndexController                | ThreatCampaignService               | `app(ThreatCampaignService::class)->list(24, $after, $search, $sort, $order)` | WIRED   | Line 27-33. Hardcoded `first=24` per D-04.                                                                                                                                                                          |
| routes/api.php (feature-gate group line 71)   | FeatureGate middleware              | `Route::middleware('feature-gate')->group(...)`                          | WIRED   | Route at line 81 is inside the group. `route:list` confirms `FeatureGate` middleware applied.                                                                                                                        |
| routes/api.php                                | ThreatCampaign\IndexController      | `Route::get('/threat-campaigns', ThreatCampaignIndexController::class)`  | WIRED   | Import alias at line 21, route registration at line 81.                                                                                                                                                              |
| tests/Feature/ThreatCampaign/IndexTest.php    | ThreatCampaignService               | `app(ThreatCampaignService::class)->list()` in 5 service tests          | WIRED   | 5 distinct invocations in service-level tests + 4 HTTP tests exercise it transitively through the controller.                                                                                                         |

### Data-Flow Trace (Level 4)

| Artifact                       | Data Variable | Source                                                                          | Produces Real Data                                                                                  | Status     |
| ------------------------------ | ------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------- |
| ThreatCampaignService::list()  | `$data`       | `$this->openCti->query($graphql, $variables)` inside Cache::remember closure    | Yes — the OpenCtiService is the existing proxy already used by ThreatActorService in production. Phase 60 doesn't stub it. | ✓ FLOWING  |
| IndexController::__invoke()    | `$data`       | `app(ThreatCampaignService::class)->list(...)`                                  | Yes — calls the cached service which calls the live OpenCTI proxy. Controller-level Pest test exercises the full path with a Mockery double; the real-world path is the same shape. | ✓ FLOWING  |
| Campaign item `attributed_to`  | `$to` (each)  | `$edge['node']['to']` from `stixCoreRelationships(toTypes: ["Intrusion-Set"])` GraphQL edge | Yes — D-12 GraphiQL verification confirmed the schema and cross-endpoint execution returned well-formed pageInfo. Dedup logic returns `[]` for empty relationships (D-11). | ✓ FLOWING  |

### Behavioral Spot-Checks

| Behavior                                                             | Command                                                                  | Result                                                  | Status  |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------- | ------- |
| ThreatCampaignService parses without syntax errors                   | `php -l backend/app/Services/ThreatCampaignService.php`                  | No syntax errors detected (via artisan test run)        | ✓ PASS  |
| IndexController parses without syntax errors                         | `php -l backend/app/Http/Controllers/ThreatCampaign/IndexController.php` | No syntax errors detected (via artisan test run)        | ✓ PASS  |
| Pest filter for Phase 60 returns 10 green tests                      | `php artisan test --filter=ThreatCampaign`                               | 10 passed (56 assertions), 1.23s                        | ✓ PASS  |
| Route is registered with correct middleware chain                    | `php artisan route:list --path=threat-campaigns -v`                      | `GET api/threat-campaigns → ThreatCampaign\IndexController`, middleware = `api → Authenticate:sanctum → FeatureGate` | ✓ PASS  |
| ThreatActor regression suite still green (cache namespace isolation) | `php artisan test tests/Feature/ThreatActor`                             | 23 passed (92 assertions)                               | ✓ PASS  |
| FeatureGate regression suite still green                             | `php artisan test --filter=FeatureGate`                                  | 6 passed (9 assertions)                                 | ✓ PASS  |

### Requirements Coverage

| Requirement | Source Plan            | Description                                                                                                                              | Status       | Evidence                                                                                                                                                                                                                                    |
| ----------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| CAMP-07     | 60-01, 60-03, 60-04    | Backend exposes a paginated `GET /api/threat-campaigns` endpoint backed by a standalone `ThreatCampaignService` (NOT a refactor)        | ✓ SATISFIED  | Standalone service (no `extends`, no ThreatActorService import, zero textual ThreatActor references in service). Controller at `/api/threat-campaigns`. Route registered. 10 tests green. REQUIREMENTS.md lines 55, 115 mark SATISFIED. |
| CAMP-08     | 60-03, 60-04           | Campaigns endpoint uses the same 15-min server-side cache pattern as Threat Actors                                                       | ✓ SATISFIED  | `Cache::remember($key, now()->addMinutes(15), $closure)` with `threat_campaigns:` prefix. Test `list caches results for 15 minutes` asserts cache hit + `Cache::has()` + namespace isolation. REQUIREMENTS.md lines 56, 116 mark SATISFIED. |

No orphaned requirements — REQUIREMENTS.md table shows only CAMP-07 and CAMP-08 mapped to Phase 60, both covered by Plans 60-03 and 60-04.

### Anti-Patterns Found

| File                                                              | Line | Pattern                                                                                             | Severity | Impact                                                                                                                                                                                                                                                                                                                                                                                       |
| ----------------------------------------------------------------- | ---- | --------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| backend/app/Services/ThreatCampaignService.php                    | —    | No TODOs, no placeholders, no empty returns, no `return null` as sole logic, no empty handlers      | —        | Clean.                                                                                                                                                                                                                                                                                                                                                                                       |
| backend/app/Http/Controllers/ThreatCampaign/IndexController.php   | —    | No TODOs, no console.log, no empty handlers                                                         | —        | Clean.                                                                                                                                                                                                                                                                                                                                                                                       |
| backend/tests/Feature/ThreatCampaign/IndexTest.php                | —    | No skipped tests, no hardcoded production secrets, no tests marked as expected failure              | —        | Clean. All 10 tests have real assertions.                                                                                                                                                                                                                                                                                                                                                    |

### PITFALL-09 Discipline (Standalone Service Audit)

| Check                                                                              | Result      |
| ---------------------------------------------------------------------------------- | ----------- |
| `ThreatCampaignService.php` contains `extends` anywhere                            | 0 matches ✓ |
| `ThreatCampaignService.php` imports `App\Services\ThreatActorService`              | 0 matches ✓ |
| `ThreatCampaignService.php` textually references `ThreatActorService` in any form  | 0 matches ✓ |
| `IndexController.php` references `ThreatActorService`                              | 0 matches ✓ |
| `IndexController.php` references `motivation` (D-03 — no motivation on Campaigns) | 0 matches ✓ |

Service is fully standalone. PITFALL-09 non-negotiable rule observed.

### Human Verification Required

Two items require a human to exercise against a running server to close the feedback loop between the Pest mock-based proof and real-world behavior:

#### 1. Live endpoint smoke test

**Test:** Start the backend (`php artisan serve`), obtain a Sanctum token for a paid-plan user, then run:

```bash
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/threat-campaigns
```

Run it twice within 15 minutes.

**Expected:** First call returns 200 with `{data: {items: [...], pagination: {has_next, has_previous, start_cursor, end_cursor, total}}}` and all items carry the 7 required fields from SC1. Second call returns the same payload noticeably faster (cache hit).

**Why human:** Automated Pest suite exercises the full request lifecycle with a Mockery double of OpenCtiService; a live curl against the deployed OpenCTI instance is the one step the CI cannot run without a dataset and network access.

#### 2. Real-data attribution shape

**Test:** Against the backend-configured OpenCTI (`http://14.192.146.4:9731/graphql` per 60-02-GRAPHIQL-NOTES.md), confirm the live endpoint response includes Campaign items with `attributed_to` arrays populated when the dataset has real attribution edges. If the dataset is empty, confirm `attributed_to` returns `[]` (not `null`).

**Expected:** Response payload shape exactly matches the Pest fixture shape — `attributed_to: [{id, name}, ...]` for campaigns with attribution, `attributed_to: []` otherwise.

**Why human:** Depends on live OpenCTI dataset content; Pest fixture proves the normalization logic but not the real-world data shape. 60-02-GRAPHIQL-NOTES.md recorded a cross-endpoint query execution against the production OpenCTI that returned `edges: []` — a non-empty dataset check is outstanding.

### Regression Note

`composer test` reports 16 pre-existing failures in unrelated subsystems (ThreatNews, DarkWeb, Plan seeder/selection, IpSearch, ThreatMap). Git history audit (`git log 42cc60f..HEAD --name-only`) confirms that Phase 60 commits (since the phase context commit `42cc60f`) only modified:

- `backend/app/Services/ThreatCampaignService.php` (created)
- `backend/app/Http/Controllers/ThreatCampaign/IndexController.php` (created)
- `backend/routes/api.php` (one import + one route line added)
- `backend/tests/Feature/ThreatCampaign/IndexTest.php` (created + appended)
- `backend/tests/Feature/FeatureGate/FeatureGateMiddlewareTest.php` (symmetric `function_exists()` guard on `createPlan()` — FeatureGate regression suite still 6/6 green)

None of the failing subsystems (IpSearch, ThreatMap, DarkWeb, PlanSeeder, PlanSelection, ThreatNews) were touched during Phase 60. These failures are **pre-existing**, **out of scope**, and **not regressions**.

### Gaps Summary

No gaps. All four phase success criteria verified:

- SC1: service returns the envelope with all 7 required fields + 5 additional convenience fields.
- SC2: 15-min `Cache::remember` is wired and tested with explicit `Cache::has('threat_campaigns:...')` assertion + namespace-isolation negative assertion.
- SC3: route is inside the `feature-gate` middleware group, `route:list` confirms the middleware chain, three HTTP tests prove 401/403/200 gate behavior.
- SC4: `CampaignsOrdering` appears in the heredoc, `IntrusionSetsOrdering` does not, response items never carry IntrusionSet-only keys, grep audits return 0 for every forbidden identifier.

PITFALL-09 discipline fully observed — service is standalone with zero cross-contamination from the IntrusionSet analog. REQUIREMENTS.md CAMP-07 + CAMP-08 both marked satisfied (Phase 60).

Status is `human_needed` (not `passed`) only because Step 8 identified two human verification items — a live endpoint smoke-test and a real-data attribution shape check — that cannot be automated without a running OpenCTI instance and a real dataset. All automated checks pass cleanly.

---

_Verified: 2026-04-18T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
