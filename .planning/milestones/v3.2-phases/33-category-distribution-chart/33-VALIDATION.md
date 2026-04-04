---
phase: 33
slug: category-distribution-chart
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 33 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None (no tests exist per CLAUDE.md) |
| **Config file** | none |
| **Quick run command** | `npm run build` (build check only) |
| **Full suite command** | `npm run build` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run build` + visual inspection in dev server
- **After every plan wave:** Full page interaction walkthrough
- **Before `/gsd:verify-work`:** Full build must be green + manual verification of both success criteria
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 33-01-01 | 01 | 1 | NEWS-04 | manual | Visual inspection | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No test framework to install per project convention (CLAUDE.md: "No tests exist").

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Chart renders with category data | NEWS-04 | No test infra; visual chart rendering requires browser | Load Threat News page, verify stacked area chart appears between toolbar and report list with category-colored areas |
| Chart filters by selected date | NEWS-04 | Date-dependent visual output | Change date via calendar dropdown, verify chart data updates to show categories for new date |
| Chart updates without flicker | NEWS-04 | Animation smoothness is perceptual | Change date, observe chart transition — no blank/flash state between renders |
| Click category area filters list | NEWS-04 | Click-to-filter interaction chain | Click a category area in chart, verify ?label= param set and report list filters to that category |
| Chart hides when no data | NEWS-04 | Empty state is visual | Select a date with no reports, verify chart card is not rendered |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
