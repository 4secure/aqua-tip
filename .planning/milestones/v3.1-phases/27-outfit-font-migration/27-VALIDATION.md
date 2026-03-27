---
phase: 27
slug: outfit-font-migration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 27 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual verification (no test framework — project has no tests) |
| **Config file** | none |
| **Quick run command** | `npm run build` |
| **Full suite command** | `npm run build && grep -r "font-display\|font-heading\|font-body" frontend/src/ --include="*.jsx" --include="*.css" \| grep -v node_modules` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run build`
- **After every plan wave:** Run full suite command (build + grep for stale font classes)
- **Before `/gsd:verify-work`:** Full suite must be green + visual spot-check
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 27-01-01 | 01 | 1 | TYPO-01 | grep | `grep "Outfit" frontend/src/styles/main.css` | ✅ | ⬜ pending |
| 27-01-02 | 01 | 1 | TYPO-02 | grep | `grep "font-display\|font-heading\|font-body" frontend/tailwind.config.js` (expect empty) | ✅ | ⬜ pending |
| 27-01-03 | 01 | 1 | TYPO-03 | grep | `grep "JetBrains Mono" frontend/src/styles/main.css` | ✅ | ⬜ pending |
| 27-01-04 | 01 | 1 | TYPO-04 | grep | `grep -r "font-display\|font-heading\|font-body" frontend/src/ --include="*.jsx" --include="*.css"` (expect empty) | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No test framework needed — all verifications are grep-based or visual.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual hierarchy preserved | TYPO-01 | Font rendering requires visual check | Open each page, verify headings are visually distinct from body text |
| JetBrains Mono in code blocks | TYPO-03 | Monospace rendering requires visual check | Check code blocks on IOC Search, Dashboard, and CTI pages |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
