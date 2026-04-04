---
phase: 34
slug: enriched-threat-actor-modal
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-31
---

# Phase 34 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (frontend) / PHPUnit (backend) |
| **Config file** | `frontend/vitest.config.js` / `backend/phpunit.xml` |
| **Quick run command** | `cd frontend && npx vitest run --reporter=verbose` |
| **Full suite command** | `cd frontend && npx vitest run && cd ../backend && php artisan test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npx vitest run --reporter=verbose`
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 34-01-01 | 01 | 1 | ACTOR-01 | integration | `php artisan test --filter=ThreatActorEnrichment` | ❌ W0 | ⬜ pending |
| 34-02-01 | 02 | 2 | ACTOR-01 | unit | `npx vitest run --reporter=verbose` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test stubs for enrichment endpoint (backend)
- [ ] Test stubs for modal tab rendering (frontend)
- [ ] Vitest setup if not already configured

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| D3 graph renders with correct layout | ACTOR-01 | Visual rendering requires browser | Open modal > Relationships tab, verify center node is actor, edges labeled |
| Skeleton animation displays during load | ACTOR-01 | Animation timing is visual | Open modal, observe pulsing skeleton before data loads |
| Tab bar styling matches dark theme | ACTOR-01 | Visual consistency check | Compare tab styling against existing tab patterns |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
