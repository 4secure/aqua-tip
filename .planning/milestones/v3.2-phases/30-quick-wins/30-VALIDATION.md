---
phase: 30
slug: quick-wins
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-28
---

# Phase 30 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | none — no test framework configured (CLAUDE.md: "No tests exist") |
| **Config file** | none — Wave 0 installs |
| **Quick run command** | `cd frontend && npx vite build --mode development 2>&1 | tail -5` |
| **Full suite command** | `cd frontend && npm run build` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npx vite build --mode development 2>&1 | tail -5`
- **After every plan wave:** Run `cd frontend && npm run build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 30-01-01 | 01 | 1 | DASH-01 | manual | grep "Threat Database" frontend/src/pages/DashboardPage.jsx | ✅ | ⬜ pending |
| 30-01-02 | 01 | 1 | DASH-02 | manual | grep -c "entity_type" frontend/src/pages/DashboardPage.jsx (expect 7 configs) | ✅ | ⬜ pending |
| 30-01-03 | 01 | 1 | DASH-03 | manual | grep -c "Live\|animate-pulse.*green" frontend/src/pages/DashboardPage.jsx (expect 0 in StatCard) | ✅ | ⬜ pending |
| 30-02-01 | 02 | 1 | MAP-01 | manual | grep "100" frontend/src/pages/DashboardPage.jsx | ✅ | ⬜ pending |
| 30-02-02 | 02 | 1 | MAP-02 | manual | grep "100 Latest Attacks" frontend/src/components/threat-map/ThreatMapCounters.jsx | ✅ | ⬜ pending |
| 30-03-01 | 03 | 1 | SEARCH-01 | manual | visual verification of D3 graph node positions | ✅ | ⬜ pending |
| 30-03-02 | 03 | 1 | SEARCH-02 | manual | grep "animate-pulse\|skeleton" frontend/src/pages/ThreatSearchPage.jsx | ✅ | ⬜ pending |
| 30-03-03 | 03 | 1 | SEARCH-03 | manual | grep "top-\[60px\]" frontend/src/pages/ThreatSearchPage.jsx | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements — no test framework needed for this phase (all changes are visual/UI, verified by build + manual inspection).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Stat cards centered layout | DASH-02 | Visual layout centering | Open dashboard, verify 4+3 layout with second row centered |
| D3 graph node positions | SEARCH-01 | Visual graph rendering | Search an IP, check Relations tab, verify nodes spread correctly |
| Search skeleton loading | SEARCH-02 | Visual loading state | Search an IP, observe skeleton cards during load |
| Search bar topbar overlap | SEARCH-03 | Visual z-index/position | Log out, navigate to /threat-search, verify search bar below topbar |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
