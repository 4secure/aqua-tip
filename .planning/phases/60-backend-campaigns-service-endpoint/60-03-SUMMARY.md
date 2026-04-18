---
phase: 60-backend-campaigns-service-endpoint
plan: 03
subsystem: backend-service

tags: [laravel, service, opencti, graphql, cache, pest, tdd]

requires:
  - plan: 60-01
    provides: "Pest test scaffold with fakeCampaignsResponse / mockOpenCtiForCampaigns / createPlan helpers, Cache::flush beforeEach hook"
  - plan: 60-02
    provides: "D-12 GraphiQL live verification (CampaignsOrdering enum, campaigns root args, Campaign->IntrusionSet attributed-to direction via edge.node.to)"

provides:
  - "backend/app/Services/ThreatCampaignService.php — standalone Campaigns service (no inheritance, no cross-imports from the IntrusionSet analog)"
  - "5 Wave 1 service-level Pest tests (SC1 shape, SC2 cache, SC4 dual enforcement, D-10/D-20 attribution normalization) appended to IndexTest.php"
  - "Stable cache-key convention pinned to resolved default tuple (fixes func_get_args() caller-shape drift)"

affects:
  - "60-04-PLAN — HTTP controller will inject ThreatCampaignService via app(ThreatCampaignService::class)->list(24, $after, $search, $sort, $order)"

tech-stack:
  added: []
  patterns:
    - "Standalone service pattern (mirror-not-inherit) — PITFALL-09 satisfied; zero references to the IntrusionSet analog in-file"
    - "Stable cache-key tuple: md5(json_encode([$first, $after, $search, $orderBy, $orderMode])) — survives caller-shape drift that func_get_args() does not"
    - "SC4 dual enforcement: positive heredoc assertion (withArgs) + negative response-shape assertion (not->toHaveKey)"
    - "D-10 inverse-direction attribution: edge.node.to with ... on IntrusionSet UNION fragment (Campaign side) contrasts with the IntrusionSet side's edge.node.from"

key-files:
  created:
    - "backend/app/Services/ThreatCampaignService.php"
  modified:
    - "backend/tests/Feature/ThreatCampaign/IndexTest.php"

key-decisions:
  - "Auto-fix (Rule 1): swap func_get_args() for resolved-default tuple in cache-key construction. Prevents list() vs list(24, null, null, 'modified', 'desc') from writing to different cache slots — a real correctness bug. Plan D-14's explicit Cache::has() assertion surfaces the drift."
  - "Auto-fix (Rule 1, Plan 01 precedent): scrub forbidden-IntrusionSet identifiers from docstrings and the D-12 verified-schema comment. The SC4 acceptance grep counts any textual occurrence; live field references in the heredoc remain correct."
  - "Omit confidence field from the heredoc (Discretion + 60-02 notes) — not in SC1, not required by Phase 65 CAMP-05 UI."

requirements-completed: [CAMP-07, CAMP-08]

duration: ~5 minutes
completed: 2026-04-18
---

# Phase 60 Plan 03: ThreatCampaignService Summary

**Standalone `ThreatCampaignService` + 5 Wave 1 service-level tests (SC1 shape, SC2 cache, SC4 dual enforcement, attribution dedup) — no inheritance from the IntrusionSet analog, all IntrusionSet-only fields absent by construction, cache-key stable across call shapes.**

## Performance

- **Duration:** ~5 minutes
- **Started:** 2026-04-18T08:08:43Z
- **Completed:** 2026-04-18T08:13:55Z
- **Tasks:** 2 / 2
- **Files created:** 1
- **Files modified:** 1
- **New test assertions:** 40 across 5 tests

## Accomplishments

- Created `backend/app/Services/ThreatCampaignService.php` as a **standalone** class — no `extends`, no `use App\Services\ThreatActorService`. Zero textual references to the IntrusionSet analog's class name anywhere in the file (PITFALL-09 / D-01 satisfied).
- Public `list()` signature drops the IntrusionSet `motivation` parameter (D-02). 5 positional args, defaults `first=24, after=null, search=null, orderBy='modified', orderMode='desc'`.
- 15-minute cache under the `threat_campaigns:` namespace — isolated from the `threat_actors:` namespace; test explicitly asserts non-collision (Pitfall 4).
- GraphQL nowdoc heredoc uses `$orderBy: CampaignsOrdering`, `campaigns(...)` root, `stixCoreRelationships(relationship_type: "attributed-to", toTypes: ["Intrusion-Set"], first: 10)`, and `... on IntrusionSet { id name }` UNION fragment on `edge.node.to` (D-10 inverse direction). Never mentions `IntrusionSetsOrdering`, `intrusionSets(`, or any IntrusionSet-only scalar (SC4 positive + negative).
- Normalizer emits exactly 12 Campaign keys per item (D-19: id, name, description, objective, aliases, first_seen, last_seen, modified, created, labels, external_references, attributed_to) and exactly 5 pagination keys (has_next, has_previous, start_cursor, end_cursor, total).
- `flattenAttributedTo()` reads `edge.node.to` (D-10), dedupes by `to.id` (D-20), returns `[]` on empty (D-11).
- 5 new Pest tests appended to `IndexTest.php` — all green, covering the full SC1/SC2/SC4 service-level contract.

## Task Commits

1. **Task 1: Create standalone ThreatCampaignService** — `1c0ad8f` (feat)
2. **Task 2: Append Wave 1 service tests + cache-key stability fix** — `43469a1` (test)

## Files Created/Modified

- **Created:** `backend/app/Services/ThreatCampaignService.php` — 306 lines. Public: `list()`. Private: `executeQuery()`, `normalizeResponse()`, `flattenAttributedTo()`, `flattenLabels()`, `flattenExternalReferences()`.
- **Modified:** `backend/tests/Feature/ThreatCampaign/IndexTest.php` — 143 → 273 lines. Added 5 service-level tests below the Wave 0 helpers (helpers untouched).

## Test Filters (for /gsd-verify-work citation)

Each test's canonical Pest filter string — matches the VALIDATION.md Per-Task Verification Map rows 60-03-01..60-03-05 exactly:

| Filter string | VALIDATION row | Status |
|---------------|----------------|--------|
| `list returns normalized campaigns with all fields` | 60-03-01 (SC1) | ✓ green |
| `list never emits IntrusionSet-only fields` | 60-03-04 (SC4 negative) | ✓ green |
| `list uses CampaignsOrdering enum` | 60-03-03 (SC4 positive) | ✓ green |
| `list caches results for 15 minutes` | 60-03-02 (SC2) | ✓ green |
| `attributed_to normalization` | 60-03-05 (D-10/D-20) | ✓ green |

Full run: `cd backend && php artisan test --filter=ThreatCampaign` → **5 passed / 0 failed / 40 assertions / 0.93s**.

Regression: `cd backend && php artisan test tests/Feature/ThreatActor` → **23 passed / 0 failed** (cache-key namespaces cleanly isolated).

## SC4 Enforcement Audit

Grep counts in `backend/app/Services/ThreatCampaignService.php` for forbidden identifiers — all expected 0, all actual 0:

```text
$ rg -c 'IntrusionSetsOrdering|intrusionSets\(|primary_motivation|resource_level|fromTypes: \["Campaign"\]' → 0
$ rg -c "'motivation'|'goals'|'targeted_countries'|'targeted_sectors'" → 0
$ rg -c 'ThreatActor' → 0
$ rg -c 'extends ThreatActorService|use App\\Services\\ThreatActorService' → 0
```

Positive-side grep (live references in the heredoc / class body):

```text
$ rg -c 'CampaignsOrdering|campaigns\(' → 5   (≥ 2 required)
$ rg -c 'toTypes: \["Intrusion-Set"\]'  → 1   (attribution relationship direction)
$ rg -c '\.\.\. on IntrusionSet'        → 1   (UNION fragment, OBJECT type name un-hyphenated)
```

## Cache Namespace Audit

- `threat_campaigns:` appears **1 time** in the service (cache-key construction) and **1 time** in the test file (explicit `Cache::has()` assertion).
- `threat_actors:` appears **0 times** in the service (no collision possible) and **1 time** in the test file — inside a **negative** assertion that proves the IntrusionSet-namespace key is NOT populated when the Campaigns service runs (`expect(Cache::has('threat_actors:...'))->toBeFalse()`).
- Net: Pitfall 4 (namespace collision) is mitigated both at construction time (service hardcodes the prefix) and at test time (explicit non-collision assertion).

## D-12 Provenance

The verified-schema comment block above the `$graphql` nowdoc in `ThreatCampaignService.php` (lines 73–86) transcribes the findings from `.planning/phases/60-backend-campaigns-service-endpoint/60-02-GRAPHIQL-NOTES.md` verbatim (date 2026-04-18, lab + cross-check endpoints, all four D-12 truths). The forbidden-field enumeration that appeared in the notes' "Ready to paste above nowdoc" block was compressed into a reference pointer (`see 60-RESEARCH.md Pitfall 9 + D-08`) to satisfy the SC4 acceptance grep (Plan 01 established this precedent; both this plan and Plan 01 accept the scrub as a Rule 1 auto-fix).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Forbidden-identifier leak in docstrings / D-12 comment block**
- **Found during:** Task 1 acceptance-grep verification.
- **Issue:** The plan's action step 4 instructs pasting the 60-02-GRAPHIQL-NOTES.md comment block verbatim, which includes a "Forbidden (enforced by SC4): primary_motivation, resource_level, goals" line. The plan's own acceptance criterion requires `grep -c 'primary_motivation|resource_level|...' → 0`. Similarly, my initial service-class docstring referenced `ThreatActorService` by name in multiple places for reader clarity, which would have failed `grep -c 'ThreatActor' → 0`. This is the same literal-interpretation conflict Plan 01 documented — the plan wants both "explain the contrast" AND "zero mentions of the contrast identifiers," which are only simultaneously satisfiable by referring to the analog indirectly.
- **Fix:** Scrub all forbidden-identifier mentions from comments/docstrings; refer to the analog as "the IntrusionSet analog" or "60-PATTERNS.md Pattern A4" / "60-RESEARCH.md Pitfall 9 + D-08" where the contrast matters. Live field references in the heredoc (CampaignsOrdering, campaigns, toTypes: ["Intrusion-Set"], ... on IntrusionSet) were untouched — they are correctly required by the query shape.
- **Files modified:** `backend/app/Services/ThreatCampaignService.php`.
- **Verification:** All four forbidden-identifier greps → 0; positive `CampaignsOrdering|campaigns(` grep → 5 (unchanged).
- **Committed in:** `1c0ad8f` (Task 1 commit).

**2. [Rule 1 - Bug] `func_get_args()` causes cache-key drift between equivalent calls**
- **Found during:** Task 2 — first full test run; `list caches results for 15 minutes` failed on `expect(Cache::has($expectedKey))->toBeTrue()`.
- **Issue:** PHP's `func_get_args()` returns only the arguments the caller actually supplied, NOT the parameter defaults. So `$service->list()` computes `md5(json_encode([]))` while `$service->list(24, null, null, 'modified', 'desc')` computes `md5(json_encode([24, null, null, 'modified', 'desc']))` — different keys, same semantics. Plan D-14's explicit `Cache::has()` assertion recomputes the key using the 5-arg default tuple, so it correctly surfaces the drift. This is a real caching-correctness bug inherited from the IntrusionSet analog (which uses the same idiom but doesn't have a `Cache::has()` assertion to catch it).
- **Fix:** Replace `md5(json_encode(func_get_args()))` with `md5(json_encode([$first, $after, $search, $orderBy, $orderMode]))` in `ThreatCampaignService::list()`. The key now derives from resolved parameter values, which are identical whether the caller passed them explicitly or relied on defaults. An inline comment documents the rationale.
- **Files modified:** `backend/app/Services/ThreatCampaignService.php`.
- **Verification:** All 5 Wave 1 tests green (40 assertions). ThreatActor regression suite untouched (23 passing).
- **Committed in:** `43469a1` (Task 2 commit — grouped with the test additions since they are co-dependent).

---

**Total deviations:** 2 auto-fixed (both Rule 1 — correctness bugs that would have blocked verification). No scope creep, no architectural changes, no user-action required.

## Issues Encountered

None beyond the two Rule 1 fixes documented above. No blockers, no checkpoint triggers, no architectural decisions required.

## Out-of-Scope Notes

- `.planning/phases/60-backend-campaigns-service-endpoint/60-PATTERNS.md` — untracked file created during planning; consumed by this plan's Task 1 `<read_first>` block. Not part of Task 1/2 deliverables. Leaving for the next planning-docs commit.
- `package-lock.json` — pre-existing untracked root-level file; unrelated to Phase 60 backend work.

## Next Plan Readiness

- **60-04-PLAN** can land the HTTP controller (`ThreatCampaign/IndexController`) + HTTP feature tests with confidence:
  - Service contract is stable: `app(ThreatCampaignService::class)->list(24, $after, $search, $sort, $order)` returns the envelope Phase 65 expects.
  - SC4 enforcement proven at the service layer — HTTP tests only need to assert the envelope + auth/feature-gate behavior; no need to re-verify field absence.
  - Cache behavior proven — HTTP tests can rely on Cache::flush in beforeEach (already wired in Wave 0 scaffold).
  - All Wave 1 helpers (mockOpenCtiForCampaigns, createPlan) already in file and reused cleanly.

## Self-Check: PASSED

- FOUND: `backend/app/Services/ThreatCampaignService.php`
- FOUND: `backend/tests/Feature/ThreatCampaign/IndexTest.php` (modified)
- FOUND: commit `1c0ad8f` (`feat(60-03): create standalone ThreatCampaignService`)
- FOUND: commit `43469a1` (`test(60-03): add Wave 1 service tests + fix cache-key stability`)
- FOUND: 5 passed / 0 failed on `php artisan test --filter=ThreatCampaign` (40 assertions)
- FOUND: 23 passed / 0 failed on ThreatActor regression suite

## TDD Gate Compliance

Plan frontmatter declares `type: execute` (not `type: tdd`), so plan-level RED/GREEN/REFACTOR gate enforcement does not apply. Both tasks were marked `tdd="true"` at the task level, and the plan's own ordering prescribed service-first (Task 1), tests-appended-second (Task 2). The combined `feat(...)` + `test(...)` commits satisfy the spirit of the TDD cycle at task granularity — tests were authored against the just-built service and surfaced a real correctness bug (cache-key drift) that was fixed inside the same test-commit.

---

*Phase: 60-backend-campaigns-service-endpoint*
*Completed: 2026-04-18*
