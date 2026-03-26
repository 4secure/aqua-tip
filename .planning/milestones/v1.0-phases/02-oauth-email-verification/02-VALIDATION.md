---
phase: 2
slug: oauth-email-verification
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Pest 3.8 (runs on PHPUnit) |
| **Config file** | backend/phpunit.xml |
| **Quick run command** | `cd backend && php artisan test --filter=Auth` |
| **Full suite command** | `cd backend && php artisan test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && php artisan test --filter=Auth`
- **After every plan wave:** Run `cd backend && php artisan test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 0 | AUTH-03, AUTH-04, AUTH-05, AUTH-09 | unit | `cd backend && php artisan test --filter=Auth` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | AUTH-03, AUTH-04 | integration | `cd backend && php artisan test --filter=OAuthTest` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 1 | AUTH-05 | integration | `cd backend && php artisan test --filter=EmailVerificationTest` | ❌ W0 | ⬜ pending |
| 02-02-03 | 02 | 1 | AUTH-09 | integration | `cd backend && php artisan test --filter=PasswordResetTest` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/Feature/Auth/OAuthTest.php` — stubs for AUTH-03, AUTH-04 (mock Socialite Google + GitHub)
- [ ] `tests/Feature/Auth/EmailVerificationTest.php` — stubs for AUTH-05 (verification enforcement, resend)
- [ ] `tests/Feature/Auth/PasswordResetTest.php` — stubs for AUTH-09 (forgot + reset flow, OAuth guard)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Branded email appearance | AUTH-05, AUTH-09 | Visual email styling | Check storage/logs/laravel.log for email HTML; verify "AQUA TIP" branding, dark theme |
| OAuth redirect flow in browser | AUTH-03, AUTH-04 | Requires real browser + OAuth provider | Navigate to /api/auth/google/redirect, complete OAuth, verify /dashboard arrival |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
