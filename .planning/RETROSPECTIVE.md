# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — Authentication System

**Shipped:** 2026-03-14
**Phases:** 6 | **Plans:** 13

### What Was Built
- Laravel 12 backend with Sanctum SPA cookie-based auth (register, login, logout, OAuth)
- Google + GitHub OAuth, email verification (6-digit code + signed link), password reset
- Credit-based rate limiting (1/day guests, 10/day auth) with lazy midnight UTC reset
- Frontend auth flow: AuthContext, 3-step route guards, login/signup/verify/onboard pages
- Collapsible glassmorphism sidebar with auth-aware nav, mobile responsive drawer
- Dark Web breach search with Laravel proxy, credit gating, BreachCard + CreditBadge

### What Worked
- Phase-by-phase execution kept each delivery small and testable
- Backend-first approach (Phases 1-3) allowed curl/Postman verification before frontend work
- Pest test suite built alongside each backend phase caught regressions early
- Inserting Phase 4.1 (layout redesign) as a decimal phase kept roadmap numbering clean
- Single-action invokable controllers kept backend code organized and focused

### What Was Inefficient
- ROADMAP.md plan checkboxes got out of sync with actual disk state (several plans marked `[ ]` despite being complete)
- IOC search page frontend integration was never planned — the search button has no onClick handler (FEND-05, RATE-04, RATE-05 left as gaps)
- Some SUMMARY.md files lack `one_liner` field, making automated extraction fail
- Phase 2 ROADMAP entry shows "1/2 In progress" despite both plans being complete on disk

### Patterns Established
- Cookie-based Sanctum SPA auth pattern (SESSION_DOMAIN=localhost, Origin header for tests)
- Dual email verification: 6-digit code in cache + signed URL link
- Lazy credit reset on access (not cron) for rate limiting
- Glassmorphism sidebar via inline rgba+backdrop-blur for precise opacity
- `components/shared/` directory for cross-page reusable components

### Key Lessons
1. Cross-phase integration gaps are the biggest risk — individual phases can pass verification while E2E flows remain broken
2. Frontend pages that exist but have no API integration create false confidence — always wire up the API call in the same milestone
3. Keep ROADMAP.md plan checkboxes in sync with disk state to avoid confusion during audits

---

## Milestone: v1.1 — PostgreSQL Migration & Railway Deployment

**Shipped:** 2026-03-14
**Phases:** 2 | **Plans:** 4

### What Was Built
- Switched Laravel from MySQL to PostgreSQL — config, 6 migration fixes for cross-database compatibility
- All 92 Pest tests (309 assertions) verified on both SQLite and PostgreSQL
- Dockerfile fixed for PostgreSQL (pdo_pgsql), startup script with auto-migration + config caching
- Backend deployed to Railway with PostgreSQL addon, auto-migrations on deploy
- Frontend SPA deployed to Railway with Express static server
- Both services live at public `.up.railway.app` domains

### What Worked
- Minimal code changes needed — only 6 `->after()` calls removed from 3 migration files
- PostgreSQL ran all migrations cleanly after Plan 01 fixes, zero issues in Plan 02
- Tests proved fully database-agnostic without modification (pass on SQLite and PostgreSQL)
- Deployment artifacts (Dockerfile, startup script, env template) prepared in Plan 07-01 made Railway setup smooth
- User-driven Railway dashboard configuration kept deployment context in human hands

### What Was Inefficient
- ROADMAP.md had 07-02 marked `[ ]` despite being complete (checkbox sync issue persisted from v1.0)
- Progress table row for Phase 7 had misaligned columns
- No automated smoke test after Railway deploy — relied on manual URL checks

### Patterns Established
- Cross-database migration pattern: avoid MySQL-only `->after()` calls in all future migrations
- Deploy pattern: `start.sh` runs `migrate --force` + `config:cache` before supervisord
- Railway deployment: push to GitHub triggers auto-deploy, root directory separation for monorepo

### Key Lessons
1. Database migrations should be written database-agnostic from the start — fixing retroactively is easy but avoidable
2. SESSION_DOMAIN must be omitted for `.up.railway.app` (public suffix list) — document this for future Railway deploys
3. Operational plans (no code changes) are fast but still need commits for docs/summaries to maintain traceability

### Cost Observations
- Sessions: 2
- Notable: Very efficient milestone — only 10 source files changed across 4 plans

---

## Milestone: v2.0 — OpenCTI Integration

**Shipped:** 2026-03-16
**Phases:** 4 | **Plans:** 9

### What Was Built
- OpenCTI service layer with GraphQL proxy, Bearer token auth, caching
- IP Search with real threat data from OpenCTI observables + geo enrichment
- Threat Actors page with paginated intrusion sets, detail modals, search/sort
- Threat News page with paginated reports, entity chip filtering, confidence levels
- Live Threat Map with SSE streaming, pulse markers, real-time counters, click-to-pan feed

### What Worked
- OpenCTI proxy pattern (Laravel holds Bearer token, frontend never talks to OpenCTI) kept security clean
- Server-side caching (15min actors, 5min news, 15min map snapshot) reduced OpenCTI load
- Detail modals over inline expand provided better UX for dense grids
- SSE relay with 5-min max lifetime and auto-reconnect proved stable

### What Was Inefficient
- Entity chip filtering on Threat News was later replaced by label-based categories in v2.1
- Confidence levels added then removed in v2.1 — wasted effort
- IP Search naming had to be migrated to Threat Search in v2.1

### Key Lessons
1. Name services generically from the start — IpSearch → ThreatSearch migration was avoidable
2. Ship browse pages with minimal filtering first, add filters based on real usage
3. SSE is sufficient for real-time feeds — WebSocket complexity wasn't needed

---

## Milestone: v2.1 — Threat Search & UI Refresh

**Shipped:** 2026-03-18
**Phases:** 6 | **Plans:** 8

### What Was Built
- Universal Threat Search supporting all 9 observable types with auto-detection
- Route migration from /ip-search to /threat-search with backward-compatible redirect
- Threat Actors UI refresh — 4-col dense card grid, no descriptions, clean subheading
- Threat News UI refresh — row-based layout, inline pagination, no confidence
- Threat Actors UX polish — removed motivation filter/sort, inline pagination toolbar
- Threat News UX polish — label-based category chips, dynamic filter dropdown, date-first column

### What Worked
- Clean-break strategy for ThreatSearch (new service, not modify IpSearch) kept both working during transition
- UI refreshes first (phases 12-13) before search migration (14-15) avoided visual regressions during backend changes
- Inline pagination toolbar pattern established in Threat News and replicated to Threat Actors — consistent UX
- Hash-based categoryColor for deterministic chip colors without backend color dependency
- Zero new dependencies — existing stack handled all requirements

### What Was Inefficient
- Phase 17 executor generated objectLabel queries with edges/node connection format, but OpenCTI's objectLabel returns flat arrays — required manual fix
- Labels endpoint initially used wrong GraphQL format (flat vs connection) — needed iteration to get right
- ROADMAP.md phase entries for 13-15 had malformed progress table rows (missing milestone column)

### Patterns Established
- Inline pagination toolbar pattern: search + filter + pagination in one toolbar row
- Label-based category filtering via OpenCTI objectLabel
- Single URL param syncing both dropdown and chip click filters
- Clean-break service pattern for major renames (keep old, build new, migrate routes)

### Key Lessons
1. OpenCTI GraphQL schema is inconsistent — `objectLabel` on entities returns flat arrays, `labels` root query returns connections. Always verify schema before writing queries
2. UI polish phases are best done after the main feature is stable — phases 16-17 polished what 12-13 built
3. Page size constants must match between frontend and backend — mismatches cause confusing "missing items"

---

## Milestone: v2.2 — Live Dashboard & Search History

**Shipped:** 2026-03-20
**Phases:** 4 | **Plans:** 6

### What Was Built
- DashboardService aggregating live OpenCTI stats (counts, indicators, categories) with stale-cache fallback
- 19 Pest PHP tests covering all dashboard endpoints and cache behavior
- Auth-only search history endpoint exposing recent queries with module filtering
- Full DashboardPage rewrite with 6 live API integrations, auth-gated widgets, zero mock data
- Search history section on ThreatSearchPage with type badges and click-to-prefill
- Category-click filtering on indicators table with server-side label queries

### What Worked
- Backend-first phases (18-19) let frontend phases (20-21) consume stable endpoints
- Independent widget loading states kept dashboard responsive even when one API is slow
- Stale-cache fallback pattern (manual Cache::get/put) kept dashboard usable during OpenCTI downtime
- TDD approach in Phase 19 caught edge cases (user isolation, field exclusion) before frontend wiring
- Phase 20 discovered and fixed OpenCTI empty-variables bug that would have affected other endpoints

### What Was Inefficient
- Category filtering initially implemented client-side (Phase 20 Plan 02) then changed to server-side mid-plan — could have been caught in planning
- Dashboard map had to be made public mid-execution (snapshot route was inside auth group) — should have been caught by Phase 18 planning
- Phase 20 had 4 fixup commits during visual verification — plan underestimated UI integration complexity

### Patterns Established
- Auth-gated widget pattern: `isAuthenticated ? <Widget /> : <GuestCta />`
- Independent useEffect data fetching with cancelled flag for cleanup
- Public vs private endpoint separation for dashboard (stats public, credit/history auth-gated)
- Stale-cache fallback: Cache::get before try, Cache::put on success, return stale on catch

### Key Lessons
1. Plan for server-side filtering from the start when aggregation happens on a larger dataset than what's loaded — client-side filtering doesn't work when you load 10 but aggregate from 500
2. Verify route middleware early — moving routes between auth/public groups mid-execution creates unnecessary fixup commits
3. Visual verification tasks are valuable — Phase 20's visual checkpoint caught 4 real bugs

---

## Milestone: v3.0 — Onboarding, Trial & Subscription Plans

**Shipped:** 2026-03-25
**Phases:** 5 | **Plans:** 10

### What Was Built
- Plans table with 4 subscription tiers (Free/Basic/Pro/Enterprise) and schema foundation
- CreditResolver service extracting shared credit logic with plan-aware limits and trial enforcement
- Enhanced onboarding with timezone auto-detect, custom phone input with SVG flags, organization/role fields
- Pricing page with 4-card plan comparison, confirmation modal, and live plan selection
- Trial countdown/expiry banners with 3-tier urgency escalation
- useFormatDate hook replacing 5 inline formatDate functions for timezone-aware rendering
- Plan-aware credit exhaustion messages with tier-specific upgrade CTAs
- Dead code cleanup removing raw JSON debug tab from Threat Search

### What Worked
- CreditResolver extraction before any plan logic prevented the duplication pitfall seen in v2.x credit code
- Backend-first phases (22-23) before frontend phases (24-25) allowed stable API consumption
- Zero new dependencies — existing Laravel + React stack covered all requirements
- updateOrCreate seeder pattern enabled safe re-runs in production
- useFormatDate hook pattern (independent calls per component, not prop drilling) kept timezone logic clean
- Pricing page as public route enabled marketing access without auth complexity

### What Was Inefficient
- 11 requirement checkboxes in REQUIREMENTS.md fell out of sync with actual completion (all 31 satisfied per audit, but tracking lagged)
- Nyquist VALIDATION.md files stayed in draft status across all phases — never enforced during execution
- Phase 24 had 4 human verification items that were never manually checked (visual/interactive items)
- TRIAL-06 race condition between CreditResolver lazy reset and TrialBanner evaluation was only caught at audit time, not during phase execution

### Patterns Established
- CreditResolver service pattern: centralized credit limit derivation from user plan
- Confirmation modal with before/after comparison for plan changes
- sessionStorage for UI dismiss state (banner dismissal resets per browser session)
- Hook-per-component pattern for useFormatDate (each component calls independently)
- IANA timezone validation via Laravel's built-in `timezone:all` rule

### Key Lessons
1. Service extraction should happen before feature code — CreditResolver was the right call before plan selection logic
2. Requirement checkbox tracking drifts when phases are executed rapidly — consider automated status syncing
3. Integration race conditions (like TRIAL-06) are only visible at audit time — budget integration testing between dependent phases
4. Nyquist validation needs enforcement gates or should be disabled — draft-only files add noise without value

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 | 6 | 13 | First milestone — established backend-first, phase-by-phase pattern |
| v1.1 | 2 | 4 | Infrastructure milestone — DB migration + deployment, minimal code changes |
| v2.0 | 4 | 9 | OpenCTI integration — proxy pattern, SSE streaming, browse pages |
| v2.1 | 6 | 8 | Search generalization + UI polish — clean-break rename, inline pagination pattern |
| v2.2 | 4 | 6 | Live dashboard + search history — stale-cache fallback, auth-gated widgets |
| v3.0 | 5 | 10 | Onboarding, trial & plans — CreditResolver extraction, pricing page, timezone formatting |

### Cumulative Quality

| Milestone | Tests | Coverage | Known Gaps |
|-----------|-------|----------|------------|
| v1.0 | 44+ Pest | Backend only | 3 (RATE-04, RATE-05, FEND-05) |
| v1.1 | 92 Pest | Backend only | 3 carried forward |
| v2.0 | 92 Pest | Backend only | 0 new |
| v2.1 | 92 Pest | Backend only | 0 new |
| v2.2 | 111+ Pest | Backend only | 0 new |
| v3.0 | 140+ Pest | Backend only | 1 (TRIAL-06 race condition) |

### Top Lessons (Verified Across Milestones)

1. Wire API calls in the same milestone as the backend endpoint — don't leave frontend pages as static shells
2. Write database-agnostic migrations from the start — avoid engine-specific syntax
3. Keep ROADMAP.md checkboxes in sync with disk state — manual checkbox tracking drifts
4. Name services generically from the start — renames create migration overhead
5. Verify external API schemas before writing queries — don't assume connection vs flat array patterns
6. Plan for server-side filtering when aggregation dataset > loaded dataset — client-side filtering fails silently
7. Visual verification tasks catch real bugs — budget time for them in frontend phases
8. Service extraction before feature code prevents duplication — centralize shared logic first
9. Integration race conditions are only visible at audit time — budget cross-phase integration testing
