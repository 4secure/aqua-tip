---
phase: 25
slug: pricing-trial-banners-timezone-display
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-24
---

# Phase 25 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None (no tests exist per CLAUDE.md) |
| **Config file** | none |
| **Quick run command** | `npm run build` (compilation check) |
| **Full suite command** | Manual browser testing |
| **Estimated runtime** | ~5 seconds (build), ~10 min (manual) |

---

## Sampling Rate

- **After every task commit:** Run `npm run build` + visual inspection in dev server
- **After every plan wave:** Full manual walkthrough of pricing, trial banner, credits, and dates
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds (build check)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 25-01-01 | 01 | 1 | PRICE-01 | manual | Visual: 4 cards render on /pricing | N/A | ⬜ pending |
| 25-01-02 | 01 | 1 | PRICE-02 | manual | Visual: each card shows name, limit, features, button | N/A | ⬜ pending |
| 25-01-03 | 01 | 1 | PRICE-03 | manual | Visual: Pro card has violet glow + "Most Popular" | N/A | ⬜ pending |
| 25-01-04 | 01 | 1 | PRICE-04 | manual | Visual: Enterprise shows "Contact Us" | N/A | ⬜ pending |
| 25-01-05 | 01 | 1 | PRICE-05 | manual | Visual: current plan badge shown | N/A | ⬜ pending |
| 25-01-06 | 01 | 1 | PRICE-08 | manual | Visual: /pricing in sidebar nav | N/A | ⬜ pending |
| 25-02-01 | 02 | 1 | TRIAL-05 | manual | Visual: trial countdown banner visible | N/A | ⬜ pending |
| 25-02-02 | 02 | 1 | TRIAL-06 | manual | Visual: expired trial upgrade banner | N/A | ⬜ pending |
| 25-02-03 | 02 | 1 | PRICE-06 | manual | Visual: sidebar CreditBadge shows plan name | N/A | ⬜ pending |
| 25-02-04 | 02 | 1 | PRICE-07 | manual | Visual: plan-aware exhaustion message | N/A | ⬜ pending |
| 25-03-01 | 03 | 2 | TZ-01 | manual | Visual: dates in user timezone | N/A | ⬜ pending |
| 25-03-02 | 03 | 2 | TZ-03 | manual | Visual: guest sees UTC | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. No test framework setup needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 4 plan cards render correctly | PRICE-01 | Visual layout, no test infra | Navigate to /pricing, verify 4 cards display |
| Pro card highlighted | PRICE-03 | Visual styling | Verify violet glow and "Most Popular" badge on Pro card |
| Enterprise "Contact Us" | PRICE-04 | UI behavior | Click Enterprise card, verify mailto or contact action |
| Current plan indicated | PRICE-05 | Requires auth state | Login, navigate to /pricing, verify current plan badge |
| Plan selection flow | PRICE-05 | Multi-step interaction | Select different plan, confirm modal, verify update |
| Trial countdown banner | TRIAL-05 | Requires trial user state | Login as trial user, verify banner with days remaining |
| Expired trial banner | TRIAL-06 | Requires expired trial state | Login as expired trial user, verify upgrade banner |
| CreditBadge with plan name | PRICE-06 | Visual in sidebar | Login, check sidebar footer shows "Pro: 42/50" format |
| Plan-aware exhaustion | PRICE-07 | Requires exhausted credits | Exhaust credits, verify tier-specific upgrade message |
| Timezone rendering | TZ-01 | Requires non-UTC user | Login with non-UTC timezone, verify dates |
| UTC for guests | TZ-03 | Requires unauthenticated state | View pages as guest, verify UTC timestamps |

---

## Validation Sign-Off

- [ ] All tasks have manual verification instructions
- [ ] Sampling continuity: visual inspection after every commit
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s (build check)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
