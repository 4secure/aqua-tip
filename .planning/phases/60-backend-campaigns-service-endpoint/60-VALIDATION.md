---
phase: 60
slug: backend-campaigns-service-endpoint
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-18
---

# Phase 60 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `60-RESEARCH.md` → `## Validation Architecture`.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Pest 3.8 on PHPUnit 11 (`backend/composer.json`) |
| **Config file** | `backend/phpunit.xml` (Laravel 12 default) + `backend/tests/Pest.php` |
| **Quick run command** | `cd backend && php artisan test --filter=ThreatCampaign` |
| **Full suite command** | `cd backend && composer test` |
| **Estimated runtime** | ~10s targeted / ~60s full suite |

Test environment pins `CACHE_STORE=array` (`backend/phpunit.xml:26`), so `Cache::has()` assertions are deterministic.

---

## Sampling Rate

- **After every task commit:** `cd backend && php artisan test --filter=ThreatCampaign`
- **After every plan wave:** `cd backend && php artisan test tests/Feature/ThreatCampaign tests/Feature/ThreatActor tests/Feature/FeatureGate`
- **Before `/gsd-verify-work`:** `cd backend && composer test` (full suite green) + `php artisan route:list --path=threat-campaigns` output attached to verification log + D-12 GraphiQL findings recorded in `60-XX-GRAPHIQL-NOTES.md`
- **Max feedback latency:** < 10 seconds for the targeted filter

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 60-01-01 | 01 | 0 | CAMP-07 | — | Test directory created | infra | `test -d backend/tests/Feature/ThreatCampaign` | ❌ W0 | ⬜ pending |
| 60-01-02 | 01 | 0 | CAMP-07 | — | Test file scaffold with fakeCampaignsResponse helper | infra | `test -f backend/tests/Feature/ThreatCampaign/IndexTest.php` | ❌ W0 | ⬜ pending |
| 60-02-01 | 02 | 0 | CAMP-07 | — | D-12 GraphiQL verification captured | manual | External: `http://192.168.251.20:8080/graphql` — results logged in `60-XX-GRAPHIQL-NOTES.md` | ❌ W0 | ⬜ pending |
| 60-03-01 | 03 | 1 | CAMP-07 (SC1) | — | `ThreatCampaignService::list()` returns all 12 item keys + pagination shape | feature (service) | `cd backend && php artisan test --filter='list returns normalized campaigns with all fields'` | ✅ (after 60-01-02) | ⬜ pending |
| 60-03-02 | 03 | 1 | CAMP-08 (SC2) | — | Second call in window hits cache, `Cache::has('threat_campaigns:...')` true | feature (service) | `cd backend && php artisan test --filter='list caches results for 15 minutes'` | ✅ | ⬜ pending |
| 60-03-03 | 03 | 1 | CAMP-07 (SC4) | — | Heredoc uses `$orderBy: CampaignsOrdering`, never `IntrusionSetsOrdering` | feature (service) | `cd backend && php artisan test --filter='list uses CampaignsOrdering enum'` | ✅ | ⬜ pending |
| 60-03-04 | 03 | 1 | CAMP-07 (SC4) | — | Response never exposes `primary_motivation`, `resource_level`, `goals`, `motivation` | feature (service) | `cd backend && php artisan test --filter='list never emits IntrusionSet-only fields'` | ✅ | ⬜ pending |
| 60-03-05 | 03 | 1 | CAMP-07 | — | `attributed_to` is array of `{id, name}`, deduped by id | feature (service) | `cd backend && php artisan test --filter='attributed_to normalization'` | ✅ | ⬜ pending |
| 60-04-01 | 04 | 2 | CAMP-07 (SC1) | — | `GET /api/threat-campaigns` returns 200 with `{data: {items, pagination}}` for authenticated trial user | feature (HTTP) | `cd backend && php artisan test --filter='GET /api/threat-campaigns returns 200 for authenticated trial user'` | ✅ | ⬜ pending |
| 60-04-02 | 04 | 2 | CAMP-07 (SC3) | T-AUTH-GATE | Free-plan user with expired trial → 403 `upgrade_required` | feature (HTTP) | `cd backend && php artisan test --filter='403 for free-plan user'` | ✅ | ⬜ pending |
| 60-04-03 | 04 | 2 | CAMP-07 (SC3) | — | Basic-plan paid user → 200 | feature (HTTP) | `cd backend && php artisan test --filter='200 for basic-plan user'` | ✅ | ⬜ pending |
| 60-04-04 | 04 | 2 | CAMP-07 | — | Unauthenticated → 401 | feature (HTTP) | `cd backend && php artisan test --filter='returns 401 for unauthenticated'` | ✅ | ⬜ pending |
| 60-04-05 | 04 | 2 | CAMP-07 | — | `OpenCtiConnectionException` → 502 user-safe message | feature (HTTP) | `cd backend && php artisan test --filter='returns 502 on connection failure'` | ✅ | ⬜ pending |
| 60-05-01 | 05 | 2 | CAMP-07 (SC3) | — | `route:list` shows `auth:sanctum,feature-gate` on `threat-campaigns` | manual (CLI) | `cd backend && php artisan route:list --path=threat-campaigns` | ✅ | ⬜ pending |
| 60-05-02 | 05 | 2 | CAMP-07, CAMP-08 | — | Full Pest suite green + regression of threat-actors + feature-gate | integration | `cd backend && composer test` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

Task IDs above are illustrative — the planner will assign canonical task IDs when it writes the PLAN.md files. The verification map binds to Pest filter names, which are stable across plan revisions.

---

## Wave 0 Requirements

- [ ] `backend/tests/Feature/ThreatCampaign/` — create the new test directory (does not exist)
- [ ] `backend/tests/Feature/ThreatCampaign/IndexTest.php` — scaffold with `fakeCampaignsResponse()` helper + empty describe blocks for each SC, mirroring `backend/tests/Feature/ThreatActor/ThreatActorIndexTest.php` structure
- [ ] D-12 GraphiQL verification session — external, one-time, pre-heredoc-commit. Record in `60-XX-GRAPHIQL-NOTES.md` mirroring `59-02-GRAPHIQL-NOTES.md`. If OpenCTI unreachable: file resume-signal `deferred, using assumed shape from research` and proceed (Pitfall 5 mitigation from RESEARCH.md)
- Framework install: **none needed.** Pest + Mockery + Laravel 12 are already in `composer.json`.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Route registered with `auth:sanctum,feature-gate` middleware stack | CAMP-07 (SC3 defense layer) | Laravel route table inspection; no Pest assertion reaches into the middleware alias list directly | `cd backend && php artisan route:list --path=threat-campaigns` → output must show `auth:sanctum,feature-gate` on the `GET threat-campaigns` row |
| OpenCTI GraphQL schema actually exposes `CampaignsOrdering` enum + `attributed-to` edges with `... on IntrusionSet { id name }` | CAMP-07 (D-12 discipline) | External service introspection — cannot be mocked without defeating the purpose of the check | Open `http://192.168.251.20:8080/graphql`; run the introspection queries listed in RESEARCH.md §Environment Availability; paste findings into `60-XX-GRAPHIQL-NOTES.md` as code-comment above the heredoc |

All other phase behaviors have automated Pest coverage.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (test dir + test file + GraphiQL session)
- [ ] No watch-mode flags (all Pest commands are one-shot)
- [ ] Feedback latency < 30s (filter runs in < 10s)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
