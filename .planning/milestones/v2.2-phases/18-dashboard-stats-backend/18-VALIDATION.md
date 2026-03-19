---
phase: 18
slug: dashboard-stats-backend
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 18 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Pest PHP 3.8 + PHPUnit 11.5 |
| **Config file** | `backend/phpunit.xml` |
| **Quick run command** | `cd backend && php artisan test --filter Dashboard` |
| **Full suite command** | `cd backend && php artisan test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && php artisan test --filter Dashboard`
- **After every plan wave:** Run `cd backend && php artisan test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 18-01-01 | 01 | 1 | DASH-01 | feature | `php artisan test --filter CountsTest` | ❌ W0 | ⬜ pending |
| 18-01-02 | 01 | 1 | DASH-02 | feature | `php artisan test --filter IndicatorsTest` | ❌ W0 | ⬜ pending |
| 18-01-03 | 01 | 1 | DASH-03 | feature | `php artisan test --filter CategoriesTest` | ❌ W0 | ⬜ pending |
| 18-01-04 | 01 | 1 | DASH-06 | unit | `php artisan test --filter DashboardServiceTest` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/Feature/Dashboard/CountsTest.php` — stubs for DASH-01
- [ ] `tests/Feature/Dashboard/IndicatorsTest.php` — stubs for DASH-02
- [ ] `tests/Feature/Dashboard/CategoriesTest.php` — stubs for DASH-03
- [ ] `tests/Unit/Services/DashboardServiceTest.php` — shared service tests for stale-cache, DASH-06

*(Test infrastructure (Pest, phpunit.xml, RefreshDatabase trait) already exists — no framework setup needed)*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Stale-cache returns last data during OpenCTI outage | DASH-01/02/03 | Requires OpenCTI to be down | 1. Hit endpoint to populate cache 2. Stop OpenCTI 3. Hit endpoint again — should return stale data |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
