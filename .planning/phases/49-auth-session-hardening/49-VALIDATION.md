---
phase: 49
slug: auth-session-hardening
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-11
---

# Phase 49 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Pest (via PHPUnit, bundled with Laravel 12) |
| **Config file** | `backend/phpunit.xml` |
| **Quick run command** | `cd backend && php artisan test --filter=PasswordReset --filter=SanctumConfig` |
| **Full suite command** | `cd backend && php artisan test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && php artisan test --filter=PasswordReset --filter=SanctumConfig`
- **After every plan wave:** Run `cd backend && php artisan test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 49-01-01 | 01 | 1 | AUTH-01 | unit | `php artisan test --filter=SanctumConfigTest` | ❌ W0 | ⬜ pending |
| 49-01-02 | 01 | 1 | AUTH-05 | unit | `php artisan test --filter=SanctumConfigTest` | ❌ W0 | ⬜ pending |
| 49-01-03 | 01 | 1 | AUTH-02 | unit | `php artisan test --filter=SanctumConfigTest` | ❌ W0 | ⬜ pending |
| 49-02-01 | 02 | 1 | AUTH-04 | feature | `php artisan test --filter=PasswordResetTest` | ✅ (update) | ⬜ pending |
| 49-02-02 | 02 | 1 | AUTH-03 | feature | `php artisan test --filter=PasswordResetTest` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/Feature/Auth/SanctumConfigTest.php` — add tests for secure flag default (AUTH-01), cookie name default (AUTH-05), token expiry value (AUTH-02)
- [ ] `tests/Feature/Auth/PasswordResetTest.php` — update 3 existing tests for uniform response (AUTH-04), add 2 new tests for token wipe (AUTH-03) and OAuth no-send verification

*Existing infrastructure covers test framework needs — no new packages required.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Old session cookies are ignored after cookie name change | AUTH-05 | Browser cookie behavior cannot be tested server-side | 1. Log in before change, 2. Deploy cookie name change, 3. Verify old session is not recognized, 4. Verify new session uses `__session` cookie name |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
