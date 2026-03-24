---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: Onboarding, Trial & Subscription Plans
status: unknown
stopped_at: Completed 26-01-PLAN.md
last_updated: "2026-03-24T15:32:10.584Z"
progress:
  total_phases: 5
  completed_phases: 5
  total_plans: 10
  completed_plans: 10
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-20)

**Core value:** Real threat intelligence from OpenCTI -- searchable across all observable types through a secure, credit-gated platform.
**Current focus:** Phase 26 — remove-raw-tab-from-threat-search-frontend

## Current Position

Phase: 26 (remove-raw-tab-from-threat-search-frontend) — EXECUTING
Plan: 1 of 1

## Performance Metrics

**Velocity:**

- Total plans completed: 40 (v1.0: 13, v1.1: 4, v2.0: 9, v2.1: 8, v2.2: 6)
- Total milestones: 5 shipped in 8 days

**By Milestone:**

| Milestone | Phases | Plans | Timeline |
|-----------|--------|-------|----------|
| v1.0 Authentication | 6 | 13 | 2 days |
| v1.1 PostgreSQL + Railway | 2 | 4 | 1 day |
| v2.0 OpenCTI Integration | 4 | 9 | 3 days |
| v2.1 Threat Search & UI Refresh | 6 | 8 | 2 days |
| v2.2 Live Dashboard & Search History | 4 | 6 | 2 days |
| Phase 22 P02 | 3min | 2 tasks | 3 files |
| Phase 23 P02 | 11min | 2 tasks | 8 files |
| Phase 24-01 P01 | 7min | 2 tasks | 2 files |
| Phase 25 P02 | 2min | 2 tasks | 5 files |
| Phase 25 P01 | 2min | 2 tasks | 6 files |
| Phase 25 P03 | 4min | 2 tasks | 5 files |
| Phase 26 P01 | 1min | 2 tasks | 1 files |

## Accumulated Context

### Decisions

Decisions logged in PROJECT.md Key Decisions table. Recent for v3.0:

- Zero new dependencies -- existing stack covers all v3.0 requirements
- CreditResolver extraction before any plan logic (prevent duplication pitfall)
- Existing users get fresh 30-day trial via migration (prevent instant downgrade)
- Guest credit limit stays at 1/day (differentiation from Free tier)
- nullOnDelete FK so deleting a plan nullifies user association instead of cascading
- updateOrCreate seeder pattern for safe re-runs in production
- [Phase 22]: Query builder over raw SQL for cross-DB compatibility in data migrations
- [Phase 22]: One-way data migration with no-op down() for trial reset (values unrecoverable)
- [Phase 23]: Enterprise plan excluded via validation rule (in:free,basic,pro) for simplicity
- [Phase 23]: Credit boost on upgrade capped with min(remaining+diff, newLimit)
- [Phase 24-01]: Used Laravel built-in timezone:all validation rule for IANA timezone validation
- [Phase 25]: Native Intl.DateTimeFormat for zero-dependency timezone formatting
- [Phase 25]: sessionStorage for banner dismiss (resets per browser session)
- [Phase 25]: Pricing page as public route (accessible without auth)
- [Phase 25]: Each sub-component calls useFormatDate() independently (hook per component, not prop drilling)
- [Phase 26]: No decisions needed - straightforward dead code removal

### Roadmap Evolution

- Phase 26 added: Remove raw tab from threat search frontend

### Pending Todos

None.

### Blockers/Concerns

- OpenCTI on private network (192.168.251.20) -- works locally but needs tunneling for Railway
- Pricing amounts (dollar values) TBD -- does not block implementation but must be decided before production
- Trial credit level (10/day vs 50/day reverse trial) -- product decision needed

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260324-plb | Refactor sidebar to group pages by categories | 2026-03-24 | 8e14bec | [260324-plb-refactor-sidebar-to-group-pages-by-categ](./quick/260324-plb-refactor-sidebar-to-group-pages-by-categ/) |

## Session Continuity

Last session: 2026-03-24T15:32:10.579Z
Stopped at: Completed 26-01-PLAN.md
Resume file: None
