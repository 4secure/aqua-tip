---
phase: 53
slug: threat-news-bar-chart-with-categories-and-side-labels
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-13
---

# Phase 53 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — no tests exist in this project |
| **Config file** | none |
| **Quick run command** | `npm run build` (compile check) |
| **Full suite command** | `npm run build` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run build`
- **After every plan wave:** Run `npm run build`
- **Before `/gsd:verify-work`:** Build must be green + visual verification
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 53-01-01 | 01 | 1 | DASH-02 | manual | Visual verification in browser | N/A | ⬜ pending |
| 53-01-02 | 01 | 1 | NEWS-01 | manual | Visual verification in browser | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No test framework to set up.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Horizontal bar chart renders in right overlay panel | DASH-02 | Visual UI — Chart.js canvas rendering requires browser | 1. Open /threat-map, 2. Verify "Top Attack Categories" section in right panel, 3. Confirm horizontal bars with category labels on Y-axis |
| Category labels displayed on side of chart | NEWS-01 | Visual UI — Y-axis label positioning is visual | 1. Open /threat-map, 2. Verify Y-axis shows category names, 3. Verify long names are truncated with ellipsis |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
