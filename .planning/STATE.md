---
gsd_state_version: 1.0
milestone: v6.1
milestone_name: milestone
status: executing
stopped_at: Phase 61 Plan 01 complete (frontend CSS contract for three-state buffer marker lifecycle — 14 selectors appended to animations.css, Vite build clean in 9.96s)
last_updated: "2026-04-20T10:19:16Z"
last_activity: 2026-04-20 -- Phase 61 Plan 01 complete (.map-buffer-marker* CSS family + prefers-reduced-motion block; zero JS touched, colour parity with .map-event-pulse--{color} byte-for-byte)
progress:
  total_phases: 8
  completed_phases: 2
  total_plans: 9
  completed_plans: 7
  percent: 78
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-17)

**Core value:** Real threat intelligence from OpenCTI -- searchable across all observable types through a secure, credit-gated platform with subscription plan tiers.
**Current focus:** v6.1 Threat Map Buffer & Threat Actor Depth — Phases 59/60 shipped; Phase 61 (frontend buffer refactor) underway, Plan 01 CSS contract landed

## Current Position

Phase: 61 — Frontend Threat Map Buffer Refactor
Plan: 01 complete (CSS contract for three-state buffer marker lifecycle in animations.css)
Status: Ready to spawn Plan 61-02 (useThreatMapBuffer.js hook — pure state machine: arriving → settled → evicting + FIFO eviction + PITFALL-01-safe bufferLimitRef pattern)
Last activity: 2026-04-20 -- Phase 61 Plan 01 complete (.map-buffer-marker* CSS family, 14 new selectors, colour parity with .map-event-pulse--{color} byte-for-byte, Vite build clean in 9.96s)

Last shipped: v6.0 Feature Gating & UX Polish (2026-04-17)

```
Progress: [███████████████████████▌░░░░░░] 7/9 plans (78%)
```

## Performance Metrics

**Velocity:**

- Total plans completed: 83 (v1.0: 13, v1.1: 4, v2.0: 9, v2.1: 8, v2.2: 6, v3.0: 10, v3.1: 3, v3.2: 12, v3.3: 5, v4.0: 4, v5.0: 10, v5.1: 2, v6.0: 5)
- Total milestones: 13 shipped in 33 days

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
| v6.0 Feature Gating & UX Polish | 5 | 5 | 2 days |
| v6.1 Threat Map Buffer & Threat Actor Depth | 8 | TBD | TBD |

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
- [v6.0]: Pro plan confirmed at 50 credits/day (not 100)
- [Phase 54]: Free plan features reduced from 6 to 2 items to match actual gating restrictions
- [Phase 54]: Enterprise price_cents set to 0 (not null) to satisfy NOT NULL constraint in seeder
- [Phase 55]: Synchronous mail send (not queued) for enterprise contact endpoint
- [Phase 55]: ConditionalAppLayout pattern for dual-routing pages (auth=AppLayout, guest=standalone)
- [v6.1 Roadmap]: ThreatCampaignService MUST be standalone -- not subclass of ThreatActorService (Campaign STIX fields differ: first_seen/last_seen/objective vs aliases/primary_motivation)
- [v6.1 Roadmap]: OpenCTI Organization uses toTypes: ["Identity"] + entity_type filter (not toTypes: ["Organization"]) -- verify in GraphiQL at 192.168.251.20 before Phase 59 implementation
- [v6.1 Roadmap]: Buffer size propagates to SSE closure via useRef + separate effect -- never add bufferSize to SSE effect deps
- [v6.1 Roadmap]: markerInstancesRef diff-reconciliation pattern required -- React state eviction does not auto-remove Leaflet layers
- [v6.1 Roadmap]: leaflet.markercluster@1.5.3 is the only new dep; installed in Phase 63; import MarkerCluster.css only (skip MarkerCluster.Default.css)
- [v6.1 Roadmap]: Victimology consolidates 4 sub-queries into 1 (toTypes: ["Country","Region","Sector","Identity"]) to avoid enrichment timeout
- [Phase 60-01]: Guard shared Pest helper `createPlan()` with `function_exists()` — PHPUnit autoloads every Feature test file into the same process, so copy-verbatim across files triggers "Cannot redeclare" fatals. Preserves D-22 verbatim body without regressing FeatureGateMiddlewareTest.
- [Phase 60-01]: Keep forbidden IntrusionSet-only identifiers out of scaffold file (even in docstrings) — the acceptance grep counts any occurrence, not just live field references.
- [Phase 60-02]: D-12 GraphiQL verified via live introspection at 192.168.251.20:8080 — CampaignsOrdering enum, campaigns root args, direct `objective` scalar, and attributed-to direction (Campaign->IntrusionSet via edge.node.to UNION fragment) all confirmed; RESEARCH.md Assumptions A1/A2/A3 now VERIFIED.
- [Phase 60-02]: When a lab GraphQL endpoint is reachable but auth-gated for data queries, introspect schema on the target (no auth needed) and cross-execute the query string against a separately authenticated OpenCTI to prove validity — avoids resorting to the resume-signal fallback.
- [Phase 60-02]: Omit `confidence` field from Wave 1 Campaign heredoc despite its presence on the type — not in SC1; not required by Phase 65 CAMP-05 UI; avoids payload bloat.
- [Phase 60-03]: Cache key must derive from RESOLVED defaults, not `func_get_args()`. PHP's `func_get_args()` returns only caller-supplied args, so `$svc->list()` and `$svc->list(24, null, null, 'modified', 'desc')` hit different cache slots — a real correctness bug. Use `md5(json_encode([$first, $after, $search, $orderBy, $orderMode]))` instead. Inherited defect in ThreatActorService is latent (no test surfaces it there).
- [Phase 60-03]: SC4 grep-based enforcement counts any textual occurrence — the verified-schema comment block above the heredoc must omit IntrusionSet-only identifier names, referencing 60-RESEARCH.md Pitfall 9 + D-08 instead. Same precedent as Phase 60-01 scaffold scrub.
- [Phase 61-01]: Settled violet/cyan buffer-marker outer ring uses same-hue rgba at 0.2 alpha (not white-alpha) — cool colours against #262626 already carry edge contrast; a white anchor reads as chromatic aberration halo on OLED. Warm red/amber keep the white ring per UI-SPEC §Color discretion point.
- [Phase 61-01]: Chained selector `.map-buffer-marker--arriving.map-buffer-marker--{color}` (both classes on same element, not descendant) overrides the settled 1px outer ring during the 1.5s pulse animation while preserving severity glow. A double-ring during expansion would read as a target reticle and break parity with the existing `.map-event-pulse--{color}` feel.
- [Phase 61-01]: prefers-reduced-motion `--arriving` fallback uses `opacity: 0` (not iconSize flatten) because L.divIcon iconSize is motion-agnostic Leaflet geometry — CSS cannot shrink the container mid-state. Letting opacity go to 0 for the 1800ms arriving window is simplest; the hook transitions to `settled` with its own `iconSize: [6,6]` L.divIcon, producing an instant dot appearance with no mid-state layout ambiguity.
- [Phase 61-01]: Deferred marking MAPBUF-01/02/03 as requirements-completed — the plan frontmatter lists them but user-visible persistent-marker behaviour requires Plans 61-02 (hook) and 61-03 (page wiring). CSS alone does not make markers persist; REQUIREMENTS.md will be updated when Plan 61-03 lands.
- [Phase 61-01]: Verification grep in Windows requires CRLF normalisation (`.replace(/\r\n/g, '\n')` before `.includes()`) — the plan's inline `\n`-literal grep patterns assume LF line endings. CSS block is written correctly either way; the grep tooling just needs CRLF tolerance. Affects future cross-platform GSD verification commands on this codebase.

### Blockers/Concerns

- OpenCTI Region data availability unknown -- may return empty (acceptable, show N/A in UI)
- OpenCTI Organization STIX type resolution (toTypes: ["Identity"] vs ["Organization"]) must be verified in Phase 59 via live GraphiQL

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260324-plb | Refactor sidebar to group pages by categories | 2026-03-24 | 8e14bec | [260324-plb-refactor-sidebar-to-group-pages-by-categ](./quick/260324-plb-refactor-sidebar-to-group-pages-by-categ/) |
| 260326-seq | Decrease Recent Indicators table height to match Top Attack Categories | 2026-03-26 | e3d270c | [260326-seq-decrease-the-height-of-the-recent-indica](./quick/260326-seq-decrease-the-height-of-the-recent-indica/) |

## Session Continuity

Last activity: 2026-04-20
Last session: 2026-04-20T10:19:16Z
Stopped at: Completed 61-01-PLAN.md (.map-buffer-marker* CSS family appended to animations.css; 14 selectors, 76 insertions, 0 deletions, Vite production build clean in 9.96s)
Next action: `/gsd-execute-plan 61-02` (Wave 1 useThreatMapBuffer.js hook — pure state machine: arriving → settled → evicting + FIFO eviction + PITFALL-01-safe bufferLimitRef pattern)
