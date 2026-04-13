---
phase: 54
slug: ioc-display-for-email-url-crypto-types-and-relationship-graph-zoom-controls
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-14
---

# Phase 54 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None (no test framework per CLAUDE.md) |
| **Config file** | none |
| **Quick run command** | `php artisan tinker --execute="echo json_encode(App\Models\Plan::where('slug','free')->first()->features)"` |
| **Full suite command** | Manual: curl gated endpoints + browser check gated pages |
| **Estimated runtime** | ~30 seconds (manual) |

---

## Sampling Rate

- **After every task commit:** Run quick verification via artisan tinker
- **After every plan wave:** Full manual test of all gated routes as free user + positive test as paid user
- **Before `/gsd:verify-work`:** All 3 requirements verified manually
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 54-01-01 | 01 | 1 | GATE-01 | manual | `php artisan tinker --execute="echo json_encode(App\Models\Plan::where('slug','free')->first()->features)"` | N/A | ⬜ pending |
| 54-01-02 | 01 | 1 | GATE-02 | manual | `curl -H 'Authorization: Bearer $TOKEN' localhost:8000/api/threat-actors` | N/A | ⬜ pending |
| 54-01-03 | 01 | 1 | GATE-03 | manual | Browser: navigate to /threat-map as free user | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No test framework to install — all verification is manual for this phase.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Free plan features list shows exactly 2 items | GATE-01 | No test framework | Run PlanSeeder, query DB via tinker, confirm 2-item array |
| Backend 403 on gated routes for free users | GATE-02 | No test framework | curl all 5 gated endpoints with free plan auth token |
| Frontend UpgradeCTA on gated pages | GATE-03 | Browser-only UI behavior | Navigate to /threat-map, /dark-web, /threat-actors, /threat-news as free user |
| Paid users access all features | GATE-03 | Browser-only UI behavior | Navigate to same pages as paid user, confirm full access |

---

## Validation Sign-Off

- [ ] All tasks have manual verify instructions
- [ ] Sampling continuity: verification after each task
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
