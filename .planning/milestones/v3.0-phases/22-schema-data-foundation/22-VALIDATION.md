---
phase: 22
slug: schema-data-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 22 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Pest (on PHPUnit, Laravel 12) |
| **Config file** | `backend/phpunit.xml` |
| **Quick run command** | `cd backend && php artisan test --filter={TestClass}` |
| **Full suite command** | `cd backend && php artisan test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && php artisan test --filter={relevant test}`
- **After every plan wave:** Run `cd backend && php artisan test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 22-01-01 | 01 | 1 | PLAN-01 | unit | `php artisan test --filter=PlanSeederTest` | ❌ W0 | ⬜ pending |
| 22-01-02 | 01 | 1 | PLAN-02 | feature | `php artisan test --filter=UserPlanRelationshipTest` | ❌ W0 | ⬜ pending |
| 22-01-03 | 01 | 1 | TRIAL-04 | feature | `php artisan test --filter=TrialResetTest` | ❌ W0 | ⬜ pending |
| 22-01-04 | 01 | 1 | ONBD-06 | feature | `php artisan test --filter=OnboardingTest` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/Feature/Plan/PlanSeederTest.php` — stubs for PLAN-01 (verifies 4 plans seeded with correct slugs/data)
- [ ] `tests/Feature/Plan/UserPlanRelationshipTest.php` — stubs for PLAN-02 (verifies plan_id FK, belongsTo, nullable)
- [ ] `tests/Feature/Auth/TrialResetTest.php` — stubs for TRIAL-04 (verifies trial_ends_at reset for existing users)

*Existing `tests/Feature/Auth/OnboardingTest.php` covers ONBD-06 — verify it still passes after UserResource fix.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Credit pre-creation for existing users | TRIAL-04 | Data migration on production data | Run migration on staging, verify `SELECT count(*) FROM credits` matches `SELECT count(*) FROM users` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
