---
phase: 39
slug: peek-on-hover-behavior
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-05
---

# Phase 39 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — no test infrastructure exists (per CLAUDE.md) |
| **Config file** | none |
| **Quick run command** | N/A |
| **Full suite command** | N/A |
| **Estimated runtime** | N/A — manual verification only |

---

## Sampling Rate

- **After every task commit:** Manual browser verification (visual + interaction check)
- **After every plan wave:** Full manual walkthrough of all 3 requirements
- **Before `/gsd:verify-work`:** All 3 success criteria verified visually in browser
- **Max feedback latency:** ~30 seconds (browser refresh + manual check)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 39-01-01 | 01 | 1 | TOGGLE-04 | manual | Toggle panels, refresh browser, verify state | N/A | ⬜ pending |
| 39-01-02 | 01 | 1 | TOGGLE-02 | manual | Collapse panels, verify thin sliver at each edge | N/A | ⬜ pending |
| 39-01-03 | 01 | 1 | TOGGLE-03 | manual | Hover sliver, verify panel reveals independently | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No test framework installation needed — project uses manual browser verification as the established pattern.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Thin peek sliver visible at edges when collapsed | TOGGLE-02 | Visual/layout verification — no test framework | 1. Click toggle to collapse panels 2. Verify ~10px glassmorphism sliver at left and right edges 3. Verify sliver spans panel height (not full viewport) |
| Hover sliver reveals panel independently | TOGGLE-03 | Interactive hover behavior — requires pointer events | 1. Collapse panels 2. Hover left sliver — verify only left panel reveals 3. Move mouse away — verify panel collapses after delay 4. Repeat for right sliver |
| Toggle state persists across refresh | TOGGLE-04 | localStorage persistence — requires page reload | 1. Collapse panels 2. Refresh browser 3. Verify panels remain collapsed 4. Expand panels, refresh, verify expanded |

---

## Validation Sign-Off

- [ ] All tasks have manual verification instructions
- [ ] Sampling continuity: every task includes browser verification step
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
