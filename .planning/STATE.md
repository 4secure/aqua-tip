---
gsd_state_version: 1.0
milestone: v5.1
milestone_name: Threat Map Enhancements
status: completed
stopped_at: All milestones shipped
last_updated: "2026-04-13T18:00:00.000Z"
last_activity: 2026-04-13
progress:
  total_phases: 53
  completed_phases: 53
  total_plans: 76
  completed_plans: 76
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-13)

**Core value:** Real threat intelligence from OpenCTI -- searchable across all observable types through a secure, credit-gated platform with subscription plan tiers.
**Current focus:** All milestones shipped. Ready for next milestone.

## Current Position

Phase: None (between milestones)
Plan: N/A
Status: All milestones complete
Last activity: 2026-04-13

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**

- Total plans completed: 76 (v1.0: 13, v1.1: 4, v2.0: 9, v2.1: 8, v2.2: 6, v3.0: 10, v3.1: 3, v3.2: 12, v3.3: 5, v4.0: 4, v5.0: 10, v5.1: 2)
- Total milestones: 12 shipped in 31 days

**By Milestone:**

| Milestone | Phases | Plans | Timeline |
|-----------|--------|-------|----------|
| v1.0 Authentication | 6 | 13 | 2 days |
| v1.1 PostgreSQL + Railway | 2 | 4 | 1 day |
| v2.0 OpenCTI Integration | 4 | 9 | 3 days |
| v2.1 Threat Search & UI Refresh | 6 | 8 | 2 days |
| v2.2 Live Dashboard & Search History | 4 | 6 | 2 days |
| v3.0 Onboarding, Trial & Plans | 5 | 10 | 4 days |
| v3.1 Font & UI Polish | 3 | 3 | 3 days |
| v3.2 App Layout Page Tweaks | 7 | 12 | 8 days |
| v3.3 Threat Map Dashboard | 4 | 5 | 2 days |
| v4.0 Plan Overhaul & UX Polish | 2 | 4 | 2 days |
| v5.0 Security Hardening | 5 | 10 | 3 days |
| v5.1 Threat Map Enhancements | 2 | 2 | 1 day |

## Accumulated Context

### Decisions

All decisions logged in PROJECT.md Key Decisions table.

- Do NOT create a `trial` plan slug. Trial remains `plan_id = null` + `trial_ends_at`.
- Zero new dependencies -- all v4.0 features use existing stack.
- Feature gating enforced on both frontend (UX) and backend (security) simultaneously.
- [Phase 41]: Enterprise price_cents = null signals Contact Us (not 0)
- [Phase 41]: Credit sync is full reset - all users get fresh start at new cap
- [Phase 41]: Made migration SQL driver-aware (pgsql vs sqlite) to unblock test suite
- [Phase 50]: GTM injected dynamically via createElement after cookie consent, noscript tag removed for GDPR safety
- [Phase 53]: barThickness 22px for 380px panel; chart placed between indicators and database widgets
- [Phase 51]: SPF/DKIM/DMARC records target aquasecure.io sending domain, not aquasecure.ai web domain

### Deferred Work (not started, carried forward from v4.0)

These items were planned in v4.0 phases 43-46 but never executed. Pick up in next milestone:

- **Feature gating**: Free plan restricted to threat search only (backend middleware + frontend route guards)
- **Pricing page update**: New tiers, enterprise contact form, auth-aware routing
- **UI polish**: Settings center alignment, breadcrumb capitalization, landing page globe animations
- **IOC display**: Email/URL/crypto observable type rendering
- **D3 zoom controls**: Relationship graph zoom in/out buttons
- **Trial credits**: 10 credits/day configuration (may already be done via Phase 41)

### Blockers/Concerns

- Nginx config changes require Railway deployment (cannot test locally without Docker)
- DKIM/SPF/DMARC records require DNS provider access for tip.aquasecure.ai

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260324-plb | Refactor sidebar to group pages by categories | 2026-03-24 | 8e14bec | [260324-plb-refactor-sidebar-to-group-pages-by-categ](./quick/260324-plb-refactor-sidebar-to-group-pages-by-categ/) |
| 260326-seq | Decrease Recent Indicators table height to match Top Attack Categories | 2026-03-26 | e3d270c | [260326-seq-decrease-the-height-of-the-recent-indica](./quick/260326-seq-decrease-the-height-of-the-recent-indica/) |

## Session Continuity

Last activity: 2026-04-13
Last session: 2026-04-13T18:00:00.000Z
Stopped at: All milestones shipped — ready for new milestone
