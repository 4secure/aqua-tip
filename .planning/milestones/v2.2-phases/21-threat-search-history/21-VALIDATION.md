---
phase: 21
slug: threat-search-history
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-20
---

# Phase 21 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — no test framework exists in this project |
| **Config file** | none |
| **Quick run command** | Manual browser verification |
| **Full suite command** | Manual walkthrough of all 3 states |
| **Estimated runtime** | ~60 seconds (manual) |

---

## Sampling Rate

- **After every task commit:** Manual browser test — navigate to `/threat-search`, verify history loads
- **After every plan wave:** Full manual walkthrough of all 3 states (guest, empty, with data)
- **Before `/gsd:verify-work`:** All 3 requirements verified visually in browser
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 21-01-01 | 01 | 1 | HIST-03 | manual | Navigate to `/threat-search` while authenticated, verify history section visible | N/A | ⬜ pending |
| 21-01-02 | 01 | 1 | HIST-05 | manual | Verify each history entry has colored type badge | N/A | ⬜ pending |
| 21-01-03 | 01 | 1 | HIST-04 | manual | Click a history entry, verify input prefilled + focused | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No test framework to install — all validation is manual per project conventions (no tests exist per CLAUDE.md).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| History section renders when no search active | HIST-03 | No test framework; visual UI state | 1. Login 2. Navigate to `/threat-search` 3. Verify glass card with "Recent Searches" header appears below search bar |
| Type badge colors per entry | HIST-05 | No test framework; visual color verification | 1. Have search history entries 2. Verify each entry shows colored badge (IP=cyan, Domain=green, etc.) |
| Click-to-prefill + focus | HIST-04 | No test framework; interaction behavior | 1. Click any history entry 2. Verify search input is populated with that query 3. Verify input is focused 4. Verify page scrolled to top |
| Guest CTA shown for unauthenticated users | HIST-03 | No test framework; auth-gated UI | 1. Logout 2. Navigate to `/threat-search` 3. Verify sign-in CTA card appears instead of history |
| Empty state shown for zero history | HIST-03 | No test framework; edge case UI | 1. Login as user with no search history 2. Navigate to `/threat-search` 3. Verify encouraging empty state message |

---

## Validation Sign-Off

- [ ] All tasks have manual verification instructions
- [ ] Sampling continuity: manual check after every task commit
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
