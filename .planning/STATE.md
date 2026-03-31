---
gsd_state_version: 1.0
milestone: v3.2
milestone_name: App Layout Page Tweaks
status: Ready to plan
stopped_at: Completed 34-02-PLAN.md (Task 2 checkpoint pending)
last_updated: "2026-03-31T11:28:24.033Z"
last_activity: 2026-03-31
progress:
  total_phases: 6
  completed_phases: 5
  total_plans: 8
  completed_plans: 8
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-28)

**Core value:** Real threat intelligence from OpenCTI -- searchable across all observable types through a secure, credit-gated platform with subscription plan tiers.
**Current focus:** Phase 34 — enriched-threat-actor-modal

## Current Position

Phase: 35
Plan: Not started

## Performance Metrics

**Velocity:**

- Total plans completed: 53 (v1.0: 13, v1.1: 4, v2.0: 9, v2.1: 8, v2.2: 6, v3.0: 10, v3.1: 3)
- Total milestones: 7 shipped in 15 days

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
| Phase 32 P01 | 1min | 2 tasks | 3 files |
| Phase 33-category-distribution-chart P01 | 2m28s | 2 tasks | 2 files |
| Phase 34 P01 | 2min | 1 tasks | 3 files |
| Phase 34 P02 | 4min | 1 tasks | 2 files |

## Accumulated Context

### Decisions

All decisions logged in PROJECT.md Key Decisions table (42 entries across 7 milestones).
Recent for v3.2: Zero new dependencies validated against 6 alternatives.

- [Phase 30]: Used flexbox justify-center for 4+3 stat card layout instead of CSS grid
- [Phase 31]: Separate silentRefresh callbacks per page to avoid setLoading flicker; ref-based fetchFn in useAutoRefresh to prevent interval restarts
- [Phase 32]: within operator on published field for date range filtering (OpenCTI native)
- [Phase 33]: Client-side hourly bucketing with 6-color hex chart palette for stacked area category distribution
- [Phase 34]: Hardcoded MITRE ATT&CK kill chain order array with other fallback for TTP tactic grouping
- [Phase 34]: D3 graph dimensions reduced for modal context (320px, radius 18/12, strength -300) vs full-page graph

### Pending Todos

None.

### Blockers/Concerns

- OpenCTI on private network (192.168.251.20) -- works locally but needs tunneling for Railway
- OpenCTI aggregation query support for category chart needs validation during Phase 33 planning
- DashboardService expanding from 4 to 7 sequential GraphQL queries -- consider aliased batching in Phase 30
- TRIAL-06 race condition: TrialBanner expired state may be pre-empted by lazy Free plan assignment (tech debt from v3.0)

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260324-plb | Refactor sidebar to group pages by categories | 2026-03-24 | 8e14bec | [260324-plb-refactor-sidebar-to-group-pages-by-categ](./quick/260324-plb-refactor-sidebar-to-group-pages-by-categ/) |
| 260326-seq | Decrease Recent Indicators table height to match Top Attack Categories | 2026-03-26 | e3d270c | [260326-seq-decrease-the-height-of-the-recent-indica](./quick/260326-seq-decrease-the-height-of-the-recent-indica/) |

## Session Continuity

Last activity: 2026-03-31
Last session: 2026-03-30T21:27:09.735Z
Stopped at: Completed 34-02-PLAN.md (Task 2 checkpoint pending)
Resume file: None
