---
phase: 03
slug: rate-limiting-backend
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Pest 3.8 |
| **Config file** | `backend/phpunit.xml` |
| **Quick run command** | `cd backend && php artisan test --filter=Credit` |
| **Full suite command** | `cd backend && php artisan test` |
| **Estimated runtime** | ~10 seconds |

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
| 03-01-01 | 01 | 1 | RATE-01, RATE-02, RATE-03 | feature | `php artisan test --filter=Credit` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | RATE-01 | feature | `php artisan test --filter=GuestCreditLimit` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | RATE-02 | feature | `php artisan test --filter=AuthCreditLimit` | ❌ W0 | ⬜ pending |
| 03-01-04 | 01 | 1 | RATE-03 | feature | `php artisan test --filter=CreditReset` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/Feature/Credit/GuestCreditLimitTest.php` — covers RATE-01
- [ ] `tests/Feature/Credit/AuthCreditLimitTest.php` — covers RATE-02
- [ ] `tests/Feature/Credit/CreditResetTest.php` — covers RATE-03
- [ ] `tests/Feature/Ioc/IocSearchTest.php` — covers IOC search endpoint
- [ ] `tests/Feature/Credit/CreditStatusTest.php` — covers GET /api/credits

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| IP detection behind proxy | RATE-01 | Proxy headers vary per environment | Test with X-Forwarded-For header in staging |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
