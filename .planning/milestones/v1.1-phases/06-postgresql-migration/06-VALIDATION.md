---
phase: 6
slug: postgresql-migration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Pest 3.8 (PHPUnit 11.5) |
| **Config file** | `backend/phpunit.xml` |
| **Quick run command** | `cd backend && php artisan test` |
| **Full suite command** | `cd backend && php artisan test --parallel` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && php artisan test`
- **After every plan wave:** Run `cd backend && php artisan test && php artisan migrate:fresh --force`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 6-01-01 | 01 | 1 | DB-02 | smoke | `cd backend && php artisan db:show` | N/A (artisan) | ⬜ pending |
| 6-01-02 | 01 | 1 | DB-01 | smoke | `cd backend && php artisan migrate:fresh --force` | N/A (artisan) | ⬜ pending |
| 6-01-03 | 01 | 1 | DB-03 | integration | `cd backend && php artisan test` | ✅ existing 44+ tests | ⬜ pending |
| 6-01-04 | 01 | 1 | DB-04 | manual-only | Start Laragon PG, run artisan serve, test | Manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test files needed. The 44+ existing Pest tests validate DB-03 directly.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Local dev works end-to-end with PostgreSQL | DB-04 | Requires Laragon running with PostgreSQL enabled | 1. Enable PG in Laragon 2. Run `php artisan serve` 3. Hit an endpoint 4. Confirm response |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
