---
phase: 42
slug: auth-loading-data-states
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-11
---

# Phase 42 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — no tests exist per CLAUDE.md |
| **Config file** | None |
| **Quick run command** | `npm run build` (compile check) |
| **Full suite command** | `npm run build && npm run preview` (build + visual check) |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run build` (compile verification)
- **After every plan wave:** Run `npm run build && npm run preview` + manual browser walkthrough
- **Before `/gsd:verify-work`:** Full suite must be green + all routes visually verified
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 42-01-01 | 01 | 1 | AUTH-01 | build | `npm run build` | ✅ | ⬜ pending |
| 42-01-02 | 01 | 1 | AUTH-01 | manual | Visual: no FOUC on page load | N/A | ⬜ pending |
| 42-02-01 | 02 | 1 | AUTH-02 | build | `npm run build` | ✅ | ⬜ pending |
| 42-02-02 | 02 | 1 | AUTH-02 | manual | Visual: no "Connection lost" during load | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No test framework installation needed.

- Build verification via `npm run build` covers compile-time correctness
- Visual verification covers UX requirements (AUTH-01, AUTH-02)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Branded loading screen displays on page load | AUTH-01 | Visual/UX — no E2E test framework exists | 1. Open any authenticated route 2. Observe logo + pulse ring loading screen 3. Verify smooth fade-out when auth resolves |
| No FOUC of login buttons or locked sidebar | AUTH-01 | Visual timing — requires observing first paint | 1. Hard refresh on /dashboard 2. Verify no sidebar/topbar flash before loading screen |
| "Fetching data..." replaces "Connection lost" | AUTH-02 | Visual/UX — requires SSE state observation | 1. Navigate to /threat-map 2. Observe ThreatMapStatus shows loading indicator (not error) during initial connect |
| Skeleton loading states on data-fetching pages | AUTH-02 | Visual layout — requires seeing content shapes | 1. Navigate to each data page 2. Verify skeleton placeholders match content shape 3. Verify no "Failed to load" error messages during initial load |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
