---
phase: 23
slug: creditresolver-plan-aware-backend
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 23 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Pest 3.x (PHP) |
| **Config file** | backend/phpunit.xml |
| **Quick run command** | `cd backend && php artisan test --filter=Credit` |
| **Full suite command** | `cd backend && php artisan test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && php artisan test --filter=Credit`
- **After every plan wave:** Run `cd backend && php artisan test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 23-01-01 | 01 | 1 | PLAN-03 | unit | `php artisan test --filter=CreditResolver` | ❌ W0 | ⬜ pending |
| 23-01-02 | 01 | 1 | TRIAL-01, TRIAL-02 | unit | `php artisan test --filter=CreditResolver` | ❌ W0 | ⬜ pending |
| 23-02-01 | 02 | 1 | PLAN-04, PLAN-05 | feature | `php artisan test --filter=PlanApi` | ❌ W0 | ⬜ pending |
| 23-02-02 | 02 | 1 | PLAN-06 | feature | `php artisan test --filter=PlanSelection` | ❌ W0 | ⬜ pending |
| 23-03-01 | 03 | 1 | PLAN-07, PLAN-08 | feature | `php artisan test --filter=UserResource` | ❌ W0 | ⬜ pending |
| 23-03-02 | 03 | 1 | ONBD-05, TRIAL-03 | feature | `php artisan test --filter=UserResource` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/Feature/CreditResolverTest.php` — stubs for PLAN-03, TRIAL-01, TRIAL-02
- [ ] `tests/Feature/PlanApiTest.php` — stubs for PLAN-04, PLAN-05, PLAN-06
- [ ] `tests/Feature/UserResourcePlanTest.php` — stubs for PLAN-07, PLAN-08, ONBD-05, TRIAL-03

*Existing Pest infrastructure covers framework needs. Only test file stubs required.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Credit badge updates in sidebar | PLAN-08 | Frontend visual check | Log in as Pro user, verify sidebar shows "Pro: X/50" |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
