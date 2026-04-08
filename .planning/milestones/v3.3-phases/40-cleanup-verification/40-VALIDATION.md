---
phase: 40
slug: cleanup-verification
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-06
---

# Phase 40 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None (no tests exist per CLAUDE.md) |
| **Config file** | None |
| **Quick run command** | `cd frontend && npm run build` |
| **Full suite command** | `cd frontend && npm run build` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npm run build`
- **After every plan wave:** Run `cd frontend && npm run build` + grep audit
- **Before `/gsd:verify-work`:** Build must succeed + grep audit returns zero matches
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 40-01-01 | 01 | 1 | CLEAN-01 | grep audit | `grep -r "DashboardPage" frontend/src/` returns empty | N/A | ⬜ pending |
| 40-01-02 | 01 | 1 | CLEAN-01 | grep audit | `grep -r "ComponentsPage\|CtiSearchPage\|CtiReportPage\|CveDetailPage\|DomainReportPage\|FeedsPage\|VulnScannerPage" frontend/src/` returns empty | N/A | ⬜ pending |
| 40-01-03 | 01 | 1 | CLEAN-01 | grep audit | `grep -r "useKeyboardShortcut\|BreachCard" frontend/src/` returns empty | N/A | ⬜ pending |
| 40-01-04 | 01 | 1 | CLEAN-01 | build | `cd frontend && npm run build` exits 0 | N/A | ⬜ pending |
| 40-01-05 | 01 | 1 | CLEAN-02 | grep audit | `grep "Threat Map" frontend/src/data/mock-data.js` returns empty | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. Verification is grep-based + Vite build. No test framework needed.

---

## Manual-Only Verifications

All phase behaviors have automated verification (grep + build).

---

## Validation Sign-Off

- [x] All tasks have automated verify commands
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
