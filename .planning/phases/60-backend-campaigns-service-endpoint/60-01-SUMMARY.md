---
phase: 60-backend-campaigns-service-endpoint
plan: 01
subsystem: testing

tags: [laravel, pest, mockery, scaffold, test-infra, opencti]

requires:
  - phase: 59-backend-snapshot-resize-victimology-endpoint
    provides: "Pest + Mockery toolchain proven; feature-gate plan-seeding pattern already in use"

provides:
  - "backend/tests/Feature/ThreatCampaign/ directory (new)"
  - "IndexTest.php scaffold with fakeCampaignsResponse(), mockOpenCtiForCampaigns(), createPlan()"
  - "Cache::flush() beforeEach hook wired up (Pitfall 6 mitigation)"
  - "uses(RefreshDatabase::class) enabled for DB-backed Wave 2 HTTP tests"

affects:
  - "60-03-PLAN (service-level Pest tests consume fakeCampaignsResponse + mockOpenCtiForCampaigns)"
  - "60-04-PLAN (HTTP tests consume createPlan + mockOpenCtiForCampaigns)"

tech-stack:
  added: []
  patterns:
    - "Scaffold-first Wave 0 pattern: define test helpers before any Wave 1 logic exists"
    - "Guarded global helper: if (! function_exists('createPlan')) wrapping a verbatim copy to avoid PHPUnit load-time redeclaration"

key-files:
  created:
    - "backend/tests/Feature/ThreatCampaign/IndexTest.php"
  modified: []

key-decisions:
  - "Guard createPlan() with function_exists() to preserve D-22 verbatim body while surviving PHPUnit's whole-Feature-directory autoload"
  - "Omit forbidden-field list from docstrings so the acceptance grep (looking for IntrusionSet-only identifiers) returns zero"

patterns-established:
  - "Wave 0 scaffold contract: helpers defined, no test bodies, filter exits 0 with No tests found"
  - "Attribution edge fixture reads node.to (D-10 inverse direction) to mirror the from-Campaign query shape"

requirements-completed: [CAMP-07]

duration: ~10min
completed: 2026-04-18
---

# Phase 60 Plan 01: ThreatCampaign Test Scaffold Summary

**Wave 0 Pest scaffold for Phase 60 — new test directory, IndexTest.php with fakeCampaignsResponse / mockOpenCtiForCampaigns / createPlan helpers, no test bodies; Wave 1 (service) and Wave 2 (HTTP) bind to these helpers.**

## Performance

- **Duration:** ~10 minutes
- **Started:** 2026-04-18T07:46:00Z
- **Completed:** 2026-04-18T07:56:24Z
- **Tasks:** 1 / 1
- **Files modified:** 1 (created)

## Accomplishments

- Created `backend/tests/Feature/ThreatCampaign/` directory (first file in the tree).
- Scaffolded `IndexTest.php` with the three Wave-0 contract helpers (`fakeCampaignsResponse`, `mockOpenCtiForCampaigns`, `createPlan`) — Wave 1+ will bind to these without further infrastructure work.
- Wired `uses(RefreshDatabase::class)` and `beforeEach(fn () => Cache::flush())` so later waves inherit the correct DB + cache state per test (Pitfall 6 / PITFALL-06).
- Fixture emits only Campaign STIX fields (`first_seen`, `last_seen`, `objective`, `aliases`, `modified`, `created`, `objectLabel`, `externalReferences`, `attributed_to` via `node.to`) — zero IntrusionSet-only keys, so Wave 1 SC4 absence assertions stay structurally honest.

## Task Commits

1. **Task 1: Create ThreatCampaign test directory and scaffold IndexTest.php with helpers** — `d205bf2` (test)

## Files Created/Modified

- `backend/tests/Feature/ThreatCampaign/IndexTest.php` (created) — Pest scaffold: imports, `uses(RefreshDatabase::class)`, `beforeEach(Cache::flush())`, and the three helpers. 143 lines. No test bodies yet (by design).

## Decisions Made

- **Guarded `createPlan()` with `function_exists()`** — PHPUnit's Feature test suite autoloads both `FeatureGate/FeatureGateMiddlewareTest.php` and this new file into the same process, triggering a "Cannot redeclare function createPlan()" fatal error when the plan's D-22 "copy verbatim" instruction is followed literally. Guarding the declaration preserves the verbatim body (D-22) while avoiding the process-wide redeclaration collision. Documented in-file as Rule 1 auto-fix.
- **Scrubbed forbidden-field identifiers from docstrings** — the plan's acceptance grep `grep -c 'primary_motivation\|resource_level\|goals\|targetedCountries\|targetedSectors\|motivation'` must return 0. Original docstring spelled out each forbidden key for reader clarity, which would have caused the grep to fail. Replaced with a reference to `60-RESEARCH.md Pitfall 9 + D-08`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] createPlan() redeclaration fatal error**
- **Found during:** Task 1 — first `php artisan test --filter=ThreatCampaign` run.
- **Issue:** Literal verbatim copy of `createPlan()` from `FeatureGateMiddlewareTest.php` caused `Fatal error: Cannot redeclare createPlan() (previously declared in ... FeatureGateMiddlewareTest.php:31)`. Both files are loaded into the same PHPUnit process, so top-level function declarations collide.
- **Fix:** Wrapped the verbatim function body in `if (! function_exists('createPlan')) { ... }`. Body itself is still verbatim (D-22), just defensively guarded at load time. Added in-file comment explaining the Rule 1 rationale.
- **Files modified:** `backend/tests/Feature/ThreatCampaign/IndexTest.php`.
- **Verification:** `php artisan test --filter=ThreatCampaign` → exit 0, "No tests found" (parses cleanly). `php artisan test --filter=FeatureGateMiddleware` → 6/6 passing (regression clean).
- **Committed in:** `d205bf2` (Task 1 commit).

**2. [Rule 1 - Bug] Forbidden-field names appeared in docstring**
- **Found during:** Task 1 acceptance grep verification.
- **Issue:** Initial docstring explicitly listed the IntrusionSet-only field names (`primary_motivation`, `resource_level`, `goals`, …) to explain why they were absent from the fixture. The plan's own acceptance criterion requires `grep -c` of those identifiers to return 0 across the entire file — docstring mentions would fail the check.
- **Fix:** Replaced enumerated forbidden-field list in the docstring with a reference pointer to `60-RESEARCH.md Pitfall 9 + D-08`.
- **Files modified:** `backend/tests/Feature/ThreatCampaign/IndexTest.php`.
- **Verification:** `rg 'primary_motivation|resource_level|goals|targetedCountries|targetedSectors|motivation|intrusionSets'` on the file → no matches.
- **Committed in:** `d205bf2` (Task 1 commit — fix was applied before the commit landed).

---

**Total deviations:** 2 auto-fixed (both Rule 1 — correctness bugs that would have blocked the task's verification).
**Impact on plan:** No scope creep. Both fixes preserve the plan's intent (verbatim `createPlan` body; zero IntrusionSet-only identifiers in-file) while correcting literal-interpretation bugs that would have failed the verification.

## Issues Encountered

None beyond the two auto-fixes documented above.

## Negative-field Audit

```text
$ rg -c 'primary_motivation|resource_level|goals|targetedCountries|targetedSectors|motivation|intrusionSets' backend/tests/Feature/ThreatCampaign/IndexTest.php
0
```

## Pest Smoke Check

```text
$ cd backend && php artisan test --filter=ThreatCampaign
  INFO  No tests found.
EXIT=0
```

Regression: `php artisan test --filter=FeatureGateMiddleware` → 6 passed, 0 failed (guard does not break the existing declaration site).

## Helpers Defined

| Helper | Signature | Binds |
|--------|-----------|-------|
| `fakeCampaignsResponse` | `(int $count = 2): array` | Top-level `campaigns` connection with `edges` + `pageInfo`; per-node fields id, name, description, first_seen, last_seen, objective, aliases, modified, created, objectLabel, externalReferences, attributed_to (via node.to). |
| `mockOpenCtiForCampaigns` | `(?array $response = null): void` | Swaps `OpenCtiService` in the container for a Mockery double whose `query()` returns `$response` (defaults to `fakeCampaignsResponse()`). |
| `createPlan` | `(string $slug): Plan` | Creates a `plans` row with all 10 NOT NULL columns populated; `price_cents = 0` for `free`, else `1000`. Guarded with `function_exists()`. |

## Next Phase Readiness

- Wave 1 Plan 03 can land `ThreatCampaignService` + service-level tests that call `mockOpenCtiForCampaigns()` and `app(ThreatCampaignService::class)` with zero additional fixture work.
- Wave 2 Plan 04 can land the HTTP controller tests that call `createPlan('free')` / `$this->actingAs($user)->getJson('/api/threat-campaigns')`.
- Wave 0 Plan 02 (GraphiQL verification) remains independent — no dependency on this scaffold file.

## Self-Check: PASSED

- FOUND: `backend/tests/Feature/ThreatCampaign/IndexTest.php`
- FOUND: commit `d205bf2` (`test(60-01): scaffold ThreatCampaign Pest infrastructure`)

---
*Phase: 60-backend-campaigns-service-endpoint*
*Completed: 2026-04-18*
