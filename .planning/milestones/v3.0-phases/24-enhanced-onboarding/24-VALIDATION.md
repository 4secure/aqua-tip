---
phase: 24
slug: enhanced-onboarding
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 24 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Pest (PHP) + Vitest (frontend, if added) |
| **Config file** | `backend/phpunit.xml` |
| **Quick run command** | `cd backend && php artisan test --filter=Onboarding` |
| **Full suite command** | `cd backend && php artisan test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && php artisan test --filter=Onboarding`
- **After every plan wave:** Run `cd backend && php artisan test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 24-01-01 | 01 | 1 | ONBD-01 | unit | `php artisan test --filter=Onboarding` | ✅ | ⬜ pending |
| 24-01-02 | 01 | 1 | ONBD-02 | unit | `php artisan test --filter=Onboarding` | ✅ | ⬜ pending |
| 24-01-03 | 01 | 1 | ONBD-03 | integration | `php artisan test --filter=Onboarding` | ❌ W0 | ⬜ pending |
| 24-01-04 | 01 | 1 | TZ-02 | integration | `php artisan test --filter=Onboarding` | ❌ W0 | ⬜ pending |
| 24-02-01 | 02 | 1 | ONBD-04 | manual | N/A | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/tests/Feature/OnboardingEnhancedTest.php` — test cases for timezone, organization, role fields
- [ ] Extend existing `OnboardingTest.php` fixtures if needed

*Existing test infrastructure (Pest + RefreshDatabase) covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Timezone dropdown pre-fills with browser-detected timezone | ONBD-01 | Browser Intl API requires real browser | Open Get Started page, verify timezone dropdown shows correct local timezone |
| Existing onboarded users not forced back to onboarding | ONBD-04 | Requires existing user session state | Log in as existing user, verify no redirect to onboarding |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
