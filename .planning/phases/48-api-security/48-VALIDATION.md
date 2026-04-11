---
phase: 48
slug: api-security
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-11
---

# Phase 48 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Pest 3.8+ (on PHPUnit 11.5) |
| **Config file** | `backend/phpunit.xml` |
| **Quick run command** | `cd backend && php artisan test --filter=DarkWebOwnership --filter=RateLimit --filter=ErrorSanitization --filter=ResponseStripping` |
| **Full suite command** | `cd backend && php artisan test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && php artisan test --filter=<relevant_test_class> -x`
- **After every plan wave:** Run `cd backend && php artisan test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 48-01-01 | 01 | 1 | API-01 | feature | `php artisan test tests/Feature/DarkWeb/DarkWebOwnershipTest.php -x` | ❌ W0 | ⬜ pending |
| 48-01-02 | 01 | 1 | API-01 | feature | Same file | ❌ W0 | ⬜ pending |
| 48-02-01 | 02 | 1 | API-02 | feature | `php artisan test tests/Feature/RateLimit/ApiSearchRateLimitTest.php -x` | ❌ W0 | ⬜ pending |
| 48-02-02 | 02 | 1 | API-06 | feature | `php artisan test tests/Feature/RateLimit/OAuthRateLimitTest.php -x` | ❌ W0 | ⬜ pending |
| 48-02-03 | 02 | 1 | API-07 | feature | `php artisan test tests/Feature/RateLimit/EmailVerifyRateLimitTest.php -x` | ❌ W0 | ⬜ pending |
| 48-03-01 | 03 | 2 | API-03 | feature | `php artisan test tests/Feature/ErrorSanitization/ErrorSanitizationTest.php -x` | ❌ W0 | ⬜ pending |
| 48-03-02 | 03 | 2 | API-04 | feature | Same file | ❌ W0 | ⬜ pending |
| 48-04-01 | 04 | 2 | API-05 | feature | `php artisan test tests/Feature/ThreatSearch/ResponseStrippingTest.php -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/Feature/DarkWeb/DarkWebOwnershipTest.php` — stubs for API-01 (IDOR ownership check)
- [ ] `tests/Feature/RateLimit/ApiSearchRateLimitTest.php` — stubs for API-02 (30/min on search/credits)
- [ ] `tests/Feature/RateLimit/OAuthRateLimitTest.php` — stubs for API-06 (10/min on OAuth redirect)
- [ ] `tests/Feature/RateLimit/EmailVerifyRateLimitTest.php` — stubs for API-07 (20/day on email verify)
- [ ] `tests/Feature/ErrorSanitization/ErrorSanitizationTest.php` — stubs for API-03, API-04
- [ ] `tests/Feature/ThreatSearch/ResponseStrippingTest.php` — stubs for API-05
- [ ] `app/Models/DarkWebTask.php` — Eloquent model for IDOR migration
- [ ] Migration `create_dark_web_tasks_table` — schema for IDOR fix

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
