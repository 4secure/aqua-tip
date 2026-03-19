---
phase: 20
slug: dashboard-page-rewrite
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 20 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | PHPUnit 11 (backend), none (frontend) |
| **Config file** | `backend/phpunit.xml` |
| **Quick run command** | `cd backend && php artisan test --filter=Dashboard` |
| **Full suite command** | `cd backend && php artisan test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && php artisan test --filter=Dashboard`
- **After every plan wave:** Run `cd backend && php artisan test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 20-01-01 | 01 | 1 | BACKEND | unit | `cd backend && php artisan test --filter=DashboardService` | ✅ | ⬜ pending |
| 20-01-02 | 01 | 1 | BACKEND | feature | `cd backend && php artisan test --filter=DashboardIndicators` | ✅ | ⬜ pending |
| 20-02-01 | 02 | 2 | CLEAN-01 | grep | `grep -c "mock-data" frontend/src/pages/DashboardPage.jsx` (expect 0) | N/A | ⬜ pending |
| 20-02-02 | 02 | 2 | CLEAN-02 | grep | `grep -c "THREAT_STATS\|RECENT_IPS\|ATTACK_CATEGORIES\|THREAT_MAP_POINTS" frontend/src/data/mock-data.js` (expect 0) | N/A | ⬜ pending |
| 20-02-03 | 02 | 2 | DASH-05 | manual | Visual: click category bar → table filters | N/A | ⬜ pending |
| 20-02-04 | 02 | 2 | WIDG-01 | manual | Visual: auth user sees credit balance widget | N/A | ⬜ pending |
| 20-02-05 | 02 | 2 | WIDG-02 | manual | Visual: auth user sees recent searches widget | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Backend test for updated entity types (Hostname, X509-Certificate) in DashboardService — update existing `DashboardServiceTest`
- [ ] Backend test for labels field in indicators response — update existing `DashboardIndicatorsTest`

*No frontend test infrastructure exists (documented in CLAUDE.md: "No tests exist").*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Category click filters indicators table | DASH-05 | No frontend test framework | 1. Load /dashboard 2. Click a bar in attack categories chart 3. Verify indicators table shows only matching labels 4. Verify filter chip appears 5. Click X to clear filter 6. Verify table shows all indicators |
| Credit balance widget for auth users | WIDG-01 | No frontend test framework | 1. Login 2. Navigate to /dashboard 3. Verify credit balance widget shows remaining/limit with progress bar |
| Recent searches widget for auth users | WIDG-02 | No frontend test framework | 1. Login 2. Perform a search 3. Navigate to /dashboard 4. Verify recent searches widget shows query + type badge |
| Guest users see sign-in CTAs | WIDG-01, WIDG-02 | No frontend test framework | 1. Visit /dashboard as guest 2. Verify credit and search widgets show sign-in CTA cards |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
