---
phase: 4
slug: frontend-auth-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None (no frontend test framework exists per CLAUDE.md) |
| **Config file** | none — Wave 0 installs if needed |
| **Quick run command** | Manual browser verification |
| **Full suite command** | Full manual auth flow walkthrough |
| **Estimated runtime** | ~120 seconds (manual) |

---

## Sampling Rate

- **After every task commit:** Manual browser verification of changed component
- **After every plan wave:** Full manual flow test: register -> verify -> onboard -> dashboard
- **Before `/gsd:verify-work`:** Complete auth flow walkthrough must pass
- **Max feedback latency:** ~120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-XX | 01 | 1 | FEND-01 | unit | manual: check AuthContext state | No | ⬜ pending |
| 04-02-XX | 02 | 1 | FEND-02 | manual-only | manual: test signup form | No | ⬜ pending |
| 04-02-XX | 02 | 1 | FEND-03 | manual-only | manual: test login + forgot password | No | ⬜ pending |
| 04-XX-XX | XX | 1 | FEND-04 | smoke | manual: visit / while logged out | No | ⬜ pending |
| 04-XX-XX | XX | 1 | FEND-06 | integration | manual: test route guards | No | ⬜ pending |
| 04-XX-XX | XX | 1 | FEND-07 | manual-only | visual: inspect theme/fonts | No | ⬜ pending |
| 04-XX-XX | XX | 2 | FEND-08 | integration | manual: test verify-email page | No | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- No frontend test framework exists (no Jest, Vitest, or Testing Library)
- Setting up frontend testing is out of scope for this phase
- All validation will be manual browser testing

*Existing infrastructure covers none of the phase requirements — manual verification required.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Auth pages use dark theme, glassmorphism, violet/cyan accents | FEND-07 | Visual/design verification | Open each auth page, compare against design system tokens |
| Signup form has simplified fields + legal checkbox | FEND-02 | Form interaction | Fill out signup, verify checkbox enables submit |
| Login page has forgot password link | FEND-03 | UI element presence | Visit /login, verify link present and navigates correctly |
| Landing page loads without auth | FEND-04 | Full page behavior | Visit / while logged out, verify all sections render |
| Route guards redirect correctly per auth state | FEND-06 | Multi-state flow | Test unauthenticated, unverified, non-onboarded, and fully-auth'd users |
| Verify-email page with code input + link | FEND-08 | Interactive flow | Register, verify via code, verify via link separately |

---

## Validation Sign-Off

- [ ] All tasks have manual verify instructions
- [ ] Sampling continuity: manual check after every task commit
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
