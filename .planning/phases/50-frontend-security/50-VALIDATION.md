---
phase: 50
slug: frontend-security
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-13
---

# Phase 50 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — no test infrastructure exists per CLAUDE.md |
| **Config file** | none |
| **Quick run command** | Manual browser verification |
| **Full suite command** | Manual walkthrough of all 5 scenarios |
| **Estimated runtime** | ~5 minutes (manual) |

---

## Sampling Rate

- **After every task commit:** Manual browser verification of affected behavior
- **After every plan wave:** Full manual walkthrough of all 5 scenarios
- **Before `/gsd:verify-work`:** All 5 success criteria verified manually
- **Max feedback latency:** ~60 seconds (page reload + DevTools check)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 50-01-01 | 01 | 1 | FRONT-01 | manual | Visit `/login?error=<script>alert(1)</script>` — no error shown | N/A | ⬜ pending |
| 50-01-02 | 01 | 1 | FRONT-02 | manual | Mock API to return evil URL — verify navigation blocked | N/A | ⬜ pending |
| 50-02-01 | 02 | 1 | FRONT-03 | manual | Inspect DarkWeb breach card HTML in DevTools — no target attr, has rel=noopener | N/A | ⬜ pending |
| 50-03-01 | 03 | 1 | FRONT-04 | manual | Network tab on ThreatMap — verify no unpkg.com request | N/A | ⬜ pending |
| 50-04-01 | 04 | 1 | FRONT-05 | manual | Network tab — verify no gtm.js request until Accept clicked | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No test framework needed — all verifications are manual browser checks per CLAUDE.md ("No tests exist").

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| OAuth error whitelist | FRONT-01 | No test framework, requires browser URL manipulation | Navigate to `/login?error=<script>alert(1)</script>`, verify no error text rendered. Navigate to `/login?error=Authentication+failed.+Please+try+again.`, verify safe message shown |
| OAuth redirect validation | FRONT-02 | Requires mocked API response to return evil URL | In DevTools, intercept `/api/auth/google/redirect` to return `https://evil.com/phish`, verify navigation blocked |
| DOMPurify tab-nabbing fix | FRONT-03 | Requires inspecting rendered HTML attributes | Navigate to DarkWeb page, inspect breach card `<a>` elements in DevTools, verify no `target` attribute and `rel="noopener noreferrer"` present |
| Leaflet CSS local bundle | FRONT-04 | Requires checking Network tab for CDN requests | Navigate to ThreatMap, open Network tab, filter by `unpkg.com` — verify zero requests. Verify map renders correctly |
| GTM consent gating | FRONT-05 | Requires checking Network tab before/after consent | Fresh page load (clear localStorage), verify no `gtm.js` in Network tab. Click Accept, verify `gtm.js` loads. Reload — verify `gtm.js` loads immediately (consent remembered) |

---

## Validation Sign-Off

- [ ] All tasks have manual verification instructions
- [ ] Sampling continuity: every task has a browser-verifiable check
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
