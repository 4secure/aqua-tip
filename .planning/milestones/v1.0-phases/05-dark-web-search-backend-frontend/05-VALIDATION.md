---
phase: 5
slug: dark-web-search-backend-frontend
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Pest 3.8 |
| **Config file** | `backend/phpunit.xml` |
| **Quick run command** | `cd backend && php artisan test --filter=DarkWeb` |
| **Full suite command** | `cd backend && php artisan test` |
| **Estimated runtime** | ~8 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && php artisan test --filter=DarkWeb`
- **After every plan wave:** Run `cd backend && php artisan test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | DARKWEB-01 | integration | `cd backend && php artisan test --filter=DarkWebSearchTest` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | DARKWEB-02 | integration | `cd backend && php artisan test --filter=DarkWebSearchTest` | ❌ W0 | ⬜ pending |
| 05-01-03 | 01 | 1 | DARKWEB-03 | integration | `cd backend && php artisan test --filter=DarkWebSearchTest` | ❌ W0 | ⬜ pending |
| 05-01-04 | 01 | 1 | DARKWEB-05 | integration | `cd backend && php artisan test --filter=DarkWebSearchTest` | ❌ W0 | ⬜ pending |
| 05-01-05 | 01 | 1 | DARKWEB-06 | integration | `cd backend && php artisan test --filter=DarkWebSearchTest` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 2 | DARKWEB-04 | manual | Browser verification | N/A | ⬜ pending |
| 05-02-02 | 02 | 2 | DARKWEB-03 | manual | Browser verification | N/A | ⬜ pending |
| 05-02-03 | 02 | 2 | DARKWEB-05 | manual | Browser verification | N/A | ⬜ pending |
| 05-02-04 | 02 | 2 | DARKWEB-06 | manual | Browser verification | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/Feature/DarkWeb/DarkWebSearchTest.php` — stubs for DARKWEB-01 through DARKWEB-06
- [ ] `Http::fake()` stubs for provider API responses (success, empty, error)
- [ ] Test factories/seeders for user with credits

*No frontend test infrastructure exists — frontend verification is manual.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Credit badge color shifts (cyan/amber/red) | DARKWEB-03 | Visual/CSS verification | 1. Set credits >50% → badge cyan. 2. Set <50% → amber. 3. Set 0 → red |
| Search bar centered-to-top animation | DARKWEB-04 | Animation/UX verification | 1. Load page → search centered. 2. Search → bar animates to top |
| Breach cards match dark theme | DARKWEB-04 | Visual design match | Compare cards against glassmorphism design system |
| Recent queries dropdown | DARKWEB-04 | localStorage + UI interaction | 1. Search query. 2. Focus input → dropdown shows recent |
| "Daily limit reached" message + disabled search | DARKWEB-05 | UI state verification | Exhaust credits → verify message + disabled state |
| Error card with retry button | DARKWEB-06 | UI interaction | Trigger provider error → verify red card + retry works |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
