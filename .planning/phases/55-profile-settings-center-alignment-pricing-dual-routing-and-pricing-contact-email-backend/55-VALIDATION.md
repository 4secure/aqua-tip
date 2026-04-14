---
phase: 55
slug: profile-settings-center-alignment-pricing-dual-routing-and-pricing-contact-email-backend
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-14
---

# Phase 55 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (frontend) / PHPUnit (backend) |
| **Config file** | none — Wave 0 installs if needed |
| **Quick run command** | `npm run test` |
| **Full suite command** | `npm run test && php artisan test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test`
- **After every plan wave:** Run `npm run test && php artisan test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 55-01-01 | 01 | 1 | PRICE-01 | — | N/A | manual | Visual check: authenticated user sees sidebar on /pricing | ❌ W0 | ⬜ pending |
| 55-01-02 | 01 | 1 | PRICE-02 | — | N/A | manual | Visual check: unauthenticated user sees standalone /pricing | ❌ W0 | ⬜ pending |
| 55-01-03 | 01 | 1 | PRICE-03 | — | CSRF token refresh before POST | integration | `php artisan test --filter=EnterpriseContact` | ❌ W0 | ⬜ pending |
| 55-01-04 | 01 | 1 | PRICE-04 | — | N/A | manual | Visual check: logo links to landing page for guests | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Backend test for enterprise contact email endpoint
- [ ] Existing infrastructure covers frontend routing requirements (manual verification)

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Authenticated user sees sidebar on /pricing | PRICE-01 | Routing/layout visual check | Login, navigate to /pricing, verify sidebar visible |
| Unauthenticated user sees standalone /pricing | PRICE-02 | Routing/layout visual check | Logout, navigate to /pricing, verify no sidebar |
| Logo links to landing for guests | PRICE-04 | Navigation visual check | As guest on /pricing, click logo, verify redirect to / |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
