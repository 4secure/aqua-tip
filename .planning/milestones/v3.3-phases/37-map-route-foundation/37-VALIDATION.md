---
phase: 37
slug: map-route-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-05
---

# Phase 37 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — no test infrastructure exists (per CLAUDE.md) |
| **Config file** | None |
| **Quick run command** | `cd frontend && npm run build` |
| **Full suite command** | `cd frontend && npm run build` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npm run build`
- **After every plan wave:** Run `cd frontend && npm run build` + manual browser verification
- **Before `/gsd:verify-work`:** Build must succeed + manual route verification
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 37-01-01 | 01 | 1 | LAYOUT-01 | build | `cd frontend && npm run build` | N/A | ⬜ pending |
| 37-01-02 | 01 | 1 | LAYOUT-02 | build | `cd frontend && npm run build` | N/A | ⬜ pending |
| 37-01-03 | 01 | 1 | LAYOUT-03 | manual | Open `/dashboard`, verify 5 widgets | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No test framework installation needed — this phase uses build verification and manual browser testing only (project has no test infrastructure per CLAUDE.md).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `/dashboard` renders threat map with all 5 widgets | LAYOUT-01, LAYOUT-03 | No test framework; visual verification needed | Navigate to `/dashboard`, verify map renders full-viewport with counters, countries, donut, feed, status widgets |
| `/threat-map` redirects to `/dashboard` | LAYOUT-02 | Browser redirect behavior | Navigate to `/threat-map`, verify URL changes to `/dashboard` and map renders |
| Sidebar shows Dashboard, no separate Threat Map link | LAYOUT-01 | Visual/navigation verification | Check sidebar nav has "Dashboard" entry pointing to `/dashboard`, no "Threat Map" entry |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
