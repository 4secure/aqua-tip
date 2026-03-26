---
phase: 13
slug: threat-news-ui-refresh
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None (no tests exist per CLAUDE.md) |
| **Config file** | none |
| **Quick run command** | `npm run dev` (visual check) |
| **Full suite command** | `npm run build` (build verification) |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run dev` and visually verify change
- **After every plan wave:** Full page walkthrough (search, tag click, pagination, modal)
- **Before `/gsd:verify-work`:** Full suite must be green (`npm run build`)
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 13-01-01 | 01 | 1 | TN-03 | manual | `grep -c "confidence" frontend/src/pages/ThreatNewsPage.jsx` (expect 0) | N/A | ⬜ pending |
| 13-01-02 | 01 | 1 | TN-01 | manual | Visual: rows render instead of card grid | N/A | ⬜ pending |
| 13-01-03 | 01 | 1 | TN-02 | manual | Visual: 3 tags + overflow in rows, all tags in modal | N/A | ⬜ pending |
| 13-01-04 | 01 | 1 | TN-04 | manual | Visual: toolbar with search + pagination count + arrows at top | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No test framework setup needed — this is a UI layout refactor best verified visually.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Rows render instead of card grid | TN-01 | Visual layout change | Open /threat-news, verify horizontal rows with dividers instead of card grid |
| 3 tags + overflow in rows | TN-02 | Visual element count | Open /threat-news, verify rows show max 3 tags + "+N more" badge |
| All tags in modal | TN-02 | Visual element count | Click a row, verify modal shows all entity tags without overflow cap |
| No confidence anywhere | TN-03 | Absence verification | Search page source for "confidence" — zero matches in rendered UI |
| Pagination at top | TN-04 | Visual layout position | Open /threat-news, verify "1–21 of 84" + arrows appear in top toolbar |
| Sort toggle removed | TN-04 | Absence verification | Verify no sort/order toggle in toolbar |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
