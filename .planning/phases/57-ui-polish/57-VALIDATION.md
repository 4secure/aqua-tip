---
phase: 57
slug: ui-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-14
---

# Phase 57 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual visual verification (no test framework configured) |
| **Config file** | none |
| **Quick run command** | `cd frontend && npm run build` |
| **Full suite command** | `cd frontend && npm run build && npm run preview` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npm run build`
- **After every plan wave:** Run `cd frontend && npm run build && npm run preview`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 57-01-01 | 01 | 1 | UI-01 | — | N/A | build | `cd frontend && npm run build` | ✅ | ⬜ pending |
| 57-01-02 | 01 | 1 | UI-02 | — | N/A | build | `cd frontend && npm run build` | ✅ | ⬜ pending |
| 57-01-03 | 01 | 1 | UI-03 | — | N/A | build | `cd frontend && npm run build` | ✅ | ⬜ pending |
| 57-01-04 | 01 | 1 | — | — | N/A | build | `cd frontend && npm run build` | ✅ | ⬜ pending |
| 57-01-05 | 01 | 1 | — | — | N/A | build | `cd frontend && npm run build` | ✅ | ⬜ pending |
| 57-01-06 | 01 | 1 | — | — | N/A | build | `cd frontend && npm run build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No test framework needed — this phase is CSS/animation/asset fixes verified by build success and visual inspection.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Settings form visually centered | UI-01 | CSS layout — requires visual check | Open /settings, verify form card is horizontally centered |
| Globe renders land dots on first paint | UI-02 | Runtime rendering — requires browser | Open /, verify globe shows land dots immediately without delay |
| Scroll animations smooth | UI-03 | Animation performance — requires interaction | Scroll landing page, verify no jank or stutter |
| Sidebar above map | D-07 | Z-index stacking — requires visual check | Open /threat-map, toggle sidebar, verify it appears above map |
| Custom scrollbar visible | D-05 | CSS scrollbar — requires visual check | Scroll any page, verify thin rounded scrollbar |
| Favicon loads | D-06 | Browser asset — requires tab check | Open any page, verify favicon in browser tab |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
