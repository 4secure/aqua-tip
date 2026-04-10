---
phase: 41
slug: plan-data-restructure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-11
---

# Phase 41 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Pest PHP (on PHPUnit) |
| **Config file** | `backend/phpunit.xml` |
| **Quick run command** | `cd backend && php artisan test --filter=Plan` |
| **Full suite command** | `cd backend && php artisan test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && php artisan test --filter=Plan`
- **After every plan wave:** Run `cd backend && php artisan test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 41-01-01 | 01 | 1 | PLAN-01 | unit | `cd backend && php artisan test --filter=PlanSeederTest` | ✅ (update) | ⬜ pending |
| 41-01-02 | 01 | 1 | PLAN-01 | unit | `cd backend && php artisan test --filter=PlanSeederTest` | ✅ (update) | ⬜ pending |
| 41-01-03 | 01 | 1 | PLAN-03 | integration | `cd backend && php artisan test --filter=CreditSync` | ❌ W0 | ⬜ pending |
| 41-01-04 | 01 | 1 | PLAN-02 | unit | `cd backend && php artisan test --filter=CreditResolverTest` | ✅ (verify) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/tests/Feature/Plan/CreditSyncMigrationTest.php` — stubs for PLAN-03 (migration syncs credit records)
- [ ] Update `PlanSeederTest.php` assertions for new values (Free=5, Basic=30/1000, Enterprise price_cents=null)
- [ ] Update `CreditResolverTest.php` assertions for new Free tier limit (5)

*Existing infrastructure covers test framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Enterprise shows "Contact Us" | PLAN-01 | Frontend display (Phase 44) | Verify `price_cents` is null in DB after migration |

*All other phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
