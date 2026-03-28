---
phase: 31
slug: auto-refresh-infrastructure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
---

# Phase 31 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual browser verification (no test framework configured per CLAUDE.md) |
| **Config file** | none |
| **Quick run command** | `cd frontend && npm run build` |
| **Full suite command** | `cd frontend && npm run build` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npm run build`
- **After every plan wave:** Run `cd frontend && npm run build`
- **Before `/gsd:verify-work`:** Build must succeed
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 31-01-01 | 01 | 1 | NEWS-01, ACTOR-02 | build | `cd frontend && npm run build` | ✅ | ⬜ pending |
| 31-01-02 | 01 | 1 | NEWS-01 | manual | Browser: verify ThreatNews refreshes silently | N/A | ⬜ pending |
| 31-01-03 | 01 | 1 | ACTOR-02 | manual | Browser: verify ThreatActors refreshes silently | N/A | ⬜ pending |
| 31-01-04 | 01 | 1 | NEWS-01, ACTOR-02 | manual | Browser: verify tab visibility pause/resume | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Silent data refresh without flicker | NEWS-01, ACTOR-02 | Requires visual verification of no loading flash | Open page, wait 5 min, confirm data updates without scroll reset or loader |
| Tab visibility pause/resume | NEWS-01, ACTOR-02 | Requires browser tab switching | Switch tabs, wait, return — verify immediate fetch fires |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
