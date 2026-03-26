---
phase: 15
slug: frontend-threat-search-route-migration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None (no test infrastructure exists per CLAUDE.md) |
| **Config file** | None |
| **Quick run command** | `cd frontend && npm run build` |
| **Full suite command** | `cd frontend && npm run build` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npm run build`
- **After every plan wave:** Run `cd frontend && npm run build` + manual route verification
- **Before `/gsd:verify-work`:** Build must be green + all routes verified manually
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 15-01-01 | 01 | 1 | ROUTE-01 | build | `npm run build` | N/A | ⬜ pending |
| 15-01-02 | 01 | 1 | ROUTE-02 | build+grep | `grep -r "ip-search" frontend/src/` returns 0 | N/A | ⬜ pending |
| 15-01-03 | 01 | 1 | SRCH-04 | manual | Visual badge inspection | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No test framework setup needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Detected type badge renders in result header | SRCH-04 | No test framework; visual UI element | Search for an IP, verify colored pill badge shows `IPv4-Addr` next to query |
| `/threat-search` loads ThreatSearchPage | ROUTE-01 | No test framework; route behavior | Navigate to `/threat-search` in browser |
| `/ip-search` redirects to `/threat-search` | ROUTE-01 | No test framework; redirect behavior | Navigate to `/ip-search`, verify URL changes to `/threat-search` |
| All nav links point to `/threat-search` | ROUTE-02 | No test framework; multi-page verification | Click every CTA on landing page, sidebar, dashboard |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
