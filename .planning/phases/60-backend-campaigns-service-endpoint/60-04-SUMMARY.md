---
phase: 60-backend-campaigns-service-endpoint
plan: 04
subsystem: backend-http

tags: [laravel, controller, route, pest, feature-gate, http]

requires:
  - plan: 60-03
    provides: "Standalone ThreatCampaignService with list(int, ?string, ?string, string, string): {items, pagination} contract and 15-min cache"

provides:
  - "backend/app/Http/Controllers/ThreatCampaign/IndexController.php — single-action invokable controller that maps query params (after, search, sort, order) to ThreatCampaignService::list() and returns {data: {items, pagination}}"
  - "GET /api/threat-campaigns registered inside the existing feature-gate middleware group in backend/routes/api.php (no new group introduced)"
  - "5 Wave 2 HTTP-level Pest tests appended to IndexTest.php (200 trial, 401 unauth, 403 free-expired, 200 basic, 502 conn-fail) — 28 new assertions"

affects:
  - "Phase 65 (Frontend Campaigns Toggle) — CAMP-07/CAMP-08 endpoint is now live and contract-locked; the frontend can bind to /api/threat-campaigns with after/search/sort/order parameters"

tech-stack:
  added: []
  patterns:
    - "Invokable controller pattern (mirror of ThreatActor/IndexController): single __invoke(Request): JsonResponse method, constructor-injected service"
    - "Feature-gate group placement: new route inserted inside the pre-existing Route::middleware('feature-gate')->group(...) block at routes/api.php:77 (shared auth:sanctum + feature-gate chain)"
    - "OpenCtiConnectionException → 502 mapping with user-safe message (no stack trace, no internal IPs leaked) — parity with ThreatActor controller error handling"
    - "HTTP-level SC3 enforcement proven at the edge: the feature-gate middleware gates 401 (no token) / 403 (expired trial on free plan) / 200 (trial or paid) before the controller sees the request"

key-files:
  created:
    - "backend/app/Http/Controllers/ThreatCampaign/IndexController.php"
  modified:
    - "backend/routes/api.php"
    - "backend/tests/Feature/ThreatCampaign/IndexTest.php"
    - "backend/tests/Feature/FeatureGate/FeatureGateMiddlewareTest.php"

key-decisions:
  - "Auto-fix (Rule 1, symmetric to Plan 01/03 pattern): guard createPlan() in FeatureGateMiddlewareTest.php with function_exists(). Both this file and ThreatCampaign/IndexTest.php declare createPlan() with the same D-22 body; PHPUnit loads both into the same process and whichever loads second would fatal without the guard. Plan 60-01 already guarded one side; this closes the latent ordering dependency symmetrically."
  - "Default pagination size (first=24) and defaults sort='modified', order='desc' are applied at the controller layer (not defaulted in Request::query calls) so the service receives explicit values and the stable cache-key tuple (Plan 60-03) stays stable."

requirements-completed: [CAMP-07, CAMP-08]

duration: "~90 min wall clock (including a mid-run auth interruption; work was resumable from git state because Task 1 had already committed)"
completed: 2026-04-19
---

# Phase 60 Plan 04: HTTP Controller + Feature-Gated Route Summary

**`ThreatCampaign\IndexController` (single-action invokable) wired at `GET /api/threat-campaigns` inside the existing feature-gate middleware group, plus 5 HTTP-level Pest tests proving SC3 auth + feature-gate enforcement and SC1 envelope shape. All 10 ThreatCampaign tests (5 service + 5 HTTP) green with 56 assertions. Route middleware chain verified: `api → auth:sanctum → FeatureGate`.**

## Acceptance Outcomes

| Success Criterion | Check | Result |
|---|---|---|
| SC1 envelope shape | 200-trial test asserts `data.items`, `data.pagination.{has_next, has_previous, start_cursor, end_cursor, total}` | PASS |
| SC3 unauthenticated → 401 | `getJson('/api/threat-campaigns')` with no token | PASS (401) |
| SC3 free-plan expired trial → 403 | User with free plan + `trial_ends_at = now()->subDay()` | PASS (403 + `error: upgrade_required` + `message: Upgrade your plan to access this feature`) |
| SC3 active trial → 200 | User with factory defaults (`trial_ends_at = now()->addDays(30)`) | PASS (200 + full envelope) |
| SC3 basic-plan → 200 | User with `plan_id = basic.id` | PASS (200) |
| OpenCti conn fail → 502 | Mockery rebinds `OpenCtiService` to throw `OpenCtiConnectionException` | PASS (502 + `message: Unable to load campaigns. Please try again.`) |
| Route middleware chain | `php artisan route:list --path=threat-campaigns -v` | PASS — shows `api`, `Illuminate\Auth\Middleware\Authenticate:sanctum`, `App\Http\Middleware\FeatureGate` |
| ThreatCampaign suite | `php artisan test --filter=ThreatCampaign` | PASS — 10 tests, 56 assertions, 3.27s |
| FeatureGate regression | `php artisan test --filter=FeatureGate` | PASS — 6/6, no regressions |

## Commits

| Commit | Message |
|---|---|
| `8cf85e0` | feat(60-04): create ThreatCampaign IndexController and register feature-gated route |
| `dd1de2f` | test(60-04): add Wave 2 HTTP tests and symmetric createPlan guard |

## Deviations

Two Rule 1 auto-fixes, both correctness-motivated and following precedent set by earlier plans in this phase:

1. **Symmetric `function_exists()` guard on `FeatureGateMiddlewareTest.php::createPlan()`.** Plan 60-01 guarded the ThreatCampaign side; the FeatureGate side remained unguarded, so the full-suite load order (which file PHPUnit reads second) determined whether tests ran or fataled. Mirroring the guard closes the latent dependency.

2. **Commit cadence under mid-run interruption.** The initial agent run hit an authentication error mid-task-2 (after Task 1 committed `8cf85e0`). Resumption completed the HTTP tests inline, verified all 10 tests green + route middleware chain, and committed the remaining work as one atomic Task 2 commit rather than two. No intent changed; the tests, the controller, and the route match the plan byte-for-byte.

## Full-Suite Regression Note

`composer test` reports 16 pre-existing failures in suites unrelated to Phase 60: `IpSearchServiceTest`, `ThreatMapServiceTest`, `DarkWebSearchTest`, `PlanSeederTest`, `PlanSelectionTest`, `ThreatNewsIndexTest`. No commits in the last 24 hours touched any of those subsystems. These are not regressions introduced by Phase 60 and are out of scope for this phase. The ThreatCampaign, FeatureGate, and ThreatActor suites all pass green.

## Next

Phase 60 verification (`gsd-verifier`). No more plans in this phase. Downstream consumer is Phase 65 (Frontend Campaigns Toggle).
