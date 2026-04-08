---
phase: 38
slug: overlay-panel-components
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-05
---

# Phase 38 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | No test framework configured (CLAUDE.md: "No tests exist") |
| **Config file** | none |
| **Quick run command** | `cd frontend && npx vite build 2>&1 | tail -5` |
| **Full suite command** | `cd frontend && npm run build` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npx vite build 2>&1 | tail -5`
- **After every plan wave:** Run `cd frontend && npm run build`
- **Before `/gsd:verify-work`:** Full build must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 38-01-01 | 01 | 1 | PANEL-01 | build | `npm run build` | N/A | ⬜ pending |
| 38-01-02 | 01 | 1 | PANEL-02 | build | `npm run build` | N/A | ⬜ pending |
| 38-01-03 | 01 | 1 | PANEL-03 | build | `npm run build` | N/A | ⬜ pending |
| 38-01-04 | 01 | 1 | TOGGLE-01 | build | `npm run build` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements — this is a frontend-only phase with no test framework. Build verification serves as the automated gate.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 7 stat cards visible in left panel | PANEL-01 | Visual rendering | Open /dashboard, verify 7 stat cards with labels and counts in left overlay |
| Indicators table in right panel | PANEL-02 | Visual rendering | Open /dashboard, verify scrollable indicators table with type badges |
| Glassmorphism styling on panels | PANEL-03 | Visual styling | Inspect panels have semi-transparent bg, backdrop blur, border |
| Toggle collapses both panels | TOGGLE-01 | Interaction | Click toggle button, verify both panels collapse; click again to expand |
| Panel clicks don't affect map | SC-5 | Interaction | Click inside panels, scroll inside panels — map should not pan/zoom |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
