---
phase: 17
slug: threat-news-ux-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual verification (no test framework configured) |
| **Config file** | none |
| **Quick run command** | `npm run build --prefix frontend` |
| **Full suite command** | `npm run build --prefix frontend` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run build --prefix frontend`
- **After every plan wave:** Run `npm run build --prefix frontend`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 17-01-01 | 01 | 1 | SC-1 | build + manual | `npm run build --prefix frontend` | ✅ | ⬜ pending |
| 17-01-02 | 01 | 1 | SC-1 | build + manual | `npm run build --prefix frontend` | ✅ | ⬜ pending |
| 17-02-01 | 02 | 1 | SC-2 | build + manual | `npm run build --prefix frontend` | ✅ | ⬜ pending |
| 17-03-01 | 03 | 1 | SC-3 | build + manual | `npm run build --prefix frontend` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Category chips display correct labels | SC-1 | Visual verification needed | Open Threat News, verify chips show OpenCTI labels not entity types |
| Category filter dropdown populated | SC-2 | Interactive UI behavior | Open dropdown, verify all labels from data appear |
| Date column is first column | SC-3 | Visual layout verification | Open Threat News, verify Date | Title | Categories column order |
| Chip click syncs with dropdown | SC-1/SC-2 | Interactive state sync | Click a chip, verify dropdown selects same category |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
