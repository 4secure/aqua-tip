---
phase: 14
slug: backend-search-generalization
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | PHPUnit 11.x (Laravel's default) |
| **Config file** | `backend/phpunit.xml` |
| **Quick run command** | `cd backend && php artisan test --filter=ThreatSearch` |
| **Full suite command** | `cd backend && php artisan test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && php artisan test --filter=ThreatSearch`
- **After every plan wave:** Run `cd backend && php artisan test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 14-01-01 | 01 | 1 | SRCH-01 | unit | `php artisan test --filter=ThreatSearchService` | ❌ W0 | ⬜ pending |
| 14-01-02 | 01 | 1 | SRCH-02 | unit | `php artisan test --filter=ThreatSearchAutoDetect` | ❌ W0 | ⬜ pending |
| 14-01-03 | 01 | 1 | SRCH-06 | unit | `php artisan test --filter=ThreatSearchGeo` | ❌ W0 | ⬜ pending |
| 14-02-01 | 02 | 1 | ROUTE-03 | feature | `php artisan test --filter=ThreatSearchEndpoint` | ❌ W0 | ⬜ pending |
| 14-02-02 | 02 | 1 | SRCH-07 | feature | `php artisan test --filter=ThreatSearchResponse` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/tests/Feature/ThreatSearch/SearchEndpointTest.php` — stubs for ROUTE-03, SRCH-07, SRCH-08
- [ ] `backend/tests/Unit/Services/ThreatSearchServiceTest.php` — stubs for SRCH-01, SRCH-02, SRCH-05, SRCH-06
- [ ] Verify PHPUnit is already installed — if not, `composer require --dev phpunit/phpunit`

*Existing PHPUnit infrastructure likely covers framework needs; test files are phase-specific.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Hash filter keys work against live OpenCTI | SRCH-05 | Requires live OpenCTI instance | POST `/api/threat-search` with known MD5/SHA-1/SHA-256 hash, verify `found: true` and correct `detected_type` |
| Credit deduction on search | SRCH-08 | Requires auth session + credit balance | Login, note credits, search, verify credits decremented by 1 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
