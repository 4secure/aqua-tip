---
phase: 35
slug: functional-settings-page
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 35 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Pest PHP (via phpunit.xml) |
| **Config file** | `backend/phpunit.xml` |
| **Quick run command** | `cd backend && php artisan test --filter=UpdateProfileTest` |
| **Full suite command** | `cd backend && php artisan test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && php artisan test --filter=UpdateProfileTest`
- **After every plan wave:** Run `cd backend && php artisan test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 35-01-01 | 01 | 1 | SETTINGS-02 | integration | `cd backend && php artisan test --filter=UpdateProfileTest` | ❌ W0 | ⬜ pending |
| 35-01-02 | 01 | 1 | SETTINGS-02 | integration | `cd backend && php artisan test --filter=UpdateProfileTest` | ❌ W0 | ⬜ pending |
| 35-01-03 | 01 | 1 | SETTINGS-02 | integration | `cd backend && php artisan test --filter=UpdateProfileTest` | ❌ W0 | ⬜ pending |
| 35-02-01 | 02 | 2 | SETTINGS-01 | manual | Visual verification on settings page | N/A | ⬜ pending |
| 35-02-02 | 02 | 2 | SETTINGS-02 | manual | Visual verification of edit + save flow | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/tests/Feature/Profile/UpdateProfileTest.php` — stubs for SETTINGS-02 (profile update endpoint tests: success, validation errors, unauthenticated 401)

*Existing Pest infrastructure covers test framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| User sees real profile data on settings page | SETTINGS-01 | Visual UI verification | Navigate to /settings, verify name/email/phone/timezone/org/role/plan match AuthContext user data |
| Profile edit reflects immediately after save | SETTINGS-02 | Full-stack UI interaction | Edit a field, click Save, verify sidebar/topbar update without page refresh |
| Toast notification appears on save | SETTINGS-02 | Visual feedback | Save profile, verify green toast appears with "Profile updated" message |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
