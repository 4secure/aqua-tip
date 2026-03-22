# Roadmap: AQUA TIP

## Milestones

- ✅ **v1.0 Authentication System** — Phases 1-5 (shipped 2026-03-14)
- ✅ **v1.1 PostgreSQL Migration & Railway Deployment** — Phases 6-7 (shipped 2026-03-14)
- ✅ **v2.0 OpenCTI Integration** — Phases 8-11 (shipped 2026-03-16)
- ✅ **v2.1 Threat Search & UI Refresh** — Phases 12-17 (shipped 2026-03-18)
- ✅ **v2.2 Live Dashboard & Search History** — Phases 18-21 (shipped 2026-03-20)
- 🚧 **v3.0 Onboarding, Trial & Subscription Plans** — Phases 22-25 (in progress)

## Phases

<details>
<summary>✅ v1.0 Authentication System (Phases 1-5) — SHIPPED 2026-03-14</summary>

- [x] Phase 1: Laravel Foundation + Core Auth (2/2 plans) — completed 2026-03-12
- [x] Phase 2: OAuth + Email Verification (2/2 plans) — completed 2026-03-13
- [x] Phase 3: Rate Limiting Backend (2/2 plans) — completed 2026-03-13
- [x] Phase 4: Frontend Auth Integration (3/3 plans) — completed 2026-03-13
- [x] Phase 4.1: Layout Redesign (2/2 plans) — completed 2026-03-13 (INSERTED)
- [x] Phase 5: Dark Web Search Backend + Frontend (2/2 plans) — completed 2026-03-13

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>✅ v1.1 PostgreSQL Migration & Railway Deployment (Phases 6-7) — SHIPPED 2026-03-14</summary>

- [x] Phase 6: PostgreSQL Migration (2/2 plans) — completed 2026-03-13
- [x] Phase 7: Railway Production Deployment (2/2 plans) — completed 2026-03-14

Full details: `.planning/milestones/v1.1-ROADMAP.md`

</details>

<details>
<summary>✅ v2.0 OpenCTI Integration (Phases 8-11) — SHIPPED 2026-03-16</summary>

- [x] Phase 8: Foundation & OpenCTI Service (2/2 plans) — completed 2026-03-14
- [x] Phase 9: IP Search Integration (3/3 plans) — completed 2026-03-15
- [x] Phase 10: Threat Actors & Threat News (2/2 plans) — completed 2026-03-15
- [x] Phase 11: Threat Map (2/2 plans) — completed 2026-03-15

Full details: `.planning/milestones/v2.0-ROADMAP.md`

</details>

<details>
<summary>✅ v2.1 Threat Search & UI Refresh (Phases 12-17) — SHIPPED 2026-03-18</summary>

- [x] Phase 12: Threat Actors UI Refresh (1/1 plans) — completed 2026-03-17
- [x] Phase 13: Threat News UI Refresh (1/1 plans) — completed 2026-03-17
- [x] Phase 14: Backend Search Generalization (2/2 plans) — completed 2026-03-18
- [x] Phase 15: Frontend Threat Search + Route Migration (1/1 plans) — completed 2026-03-18
- [x] Phase 16: Threat Actors UX Polish (1/1 plans) — completed 2026-03-18
- [x] Phase 17: Threat News UX Polish (2/2 plans) — completed 2026-03-18

Full details: `.planning/milestones/v2.1-ROADMAP.md`

</details>

<details>
<summary>✅ v2.2 Live Dashboard & Search History (Phases 18-21) — SHIPPED 2026-03-20</summary>

- [x] Phase 18: Dashboard Stats Backend (2/2 plans) — completed 2026-03-18
- [x] Phase 19: Search History Backend (1/1 plan) — completed 2026-03-18
- [x] Phase 20: Dashboard Page Rewrite (2/2 plans) — completed 2026-03-19
- [x] Phase 21: Threat Search History (1/1 plan) — completed 2026-03-19

Full details: `.planning/milestones/v2.2-ROADMAP.md`

</details>

### v3.0 Onboarding, Trial & Subscription Plans (In Progress)

**Milestone Goal:** Expand onboarding with profile fields, enforce the 30-day trial with credit tiers, and build a subscription plan system with pricing page.

- [x] **Phase 22: Schema & Data Foundation** - Plans table, user columns, existing user trial migration, onboarding check fix (completed 2026-03-20)
- [x] **Phase 23: CreditResolver & Plan-Aware Backend** - Extract shared credit logic, plan-aware limits, trial enforcement, plan selection and listing APIs (completed 2026-03-22)
- [ ] **Phase 24: Enhanced Onboarding** - Timezone auto-detect, organization, role fields on Get Started page with backend validation
- [ ] **Phase 25: Pricing, Trial Banners & Timezone Display** - Pricing page, trial countdown/expired banners, plan-aware credit badge, timezone-aware timestamps

## Phase Details

### Phase 22: Schema & Data Foundation
**Goal**: Database schema supports plans, enhanced user profiles, and clean trial state for all users
**Depends on**: Phase 21 (v2.2 complete)
**Requirements**: PLAN-01, PLAN-02, TRIAL-04, ONBD-06
**Success Criteria** (what must be TRUE):
  1. Plans table exists with 4 seeded tiers (Free/Basic/Pro/Enterprise) containing slug, daily credit limit, price, and features
  2. Users table has nullable plan_id FK, timezone, organization, and role columns
  3. All existing users have trial_ends_at reset to 30 days from deploy (not backdated)
  4. UserResource uses onboarding_completed_at timestamp (not name/phone heuristic) to determine onboarding status
  5. All existing Pest tests pass without modification (schema is additive only)
**Plans**: 2 plans

Plans:
- [x] 22-01-PLAN.md — Plans table, Plan model, PlanSeeder, user columns migration, User model updates
- [x] 22-02-PLAN.md — Trial reset data migration, credit pre-creation, UserResource onboarding fix

### Phase 23: CreditResolver & Plan-Aware Backend
**Goal**: Credit system derives limits from user plan, trial enforcement works automatically, and plan management APIs are operational
**Depends on**: Phase 22
**Requirements**: PLAN-03, PLAN-04, PLAN-05, PLAN-06, PLAN-07, PLAN-08, TRIAL-01, TRIAL-02, TRIAL-03, ONBD-05
**Success Criteria** (what must be TRUE):
  1. A user on the Pro plan gets 50 credits/day; a user on Free gets 3/day; credit limits are never hardcoded outside CreditResolver
  2. A user whose trial expired with no plan selected is automatically limited to Free tier (3/day) on next credit check
  3. Selecting a plan via POST /api/plan immediately changes the user's credit limit and caps remaining balance on downgrade
  4. GET /api/plans returns all 4 plan tiers without requiring authentication
  5. GET /api/user returns plan object, trial_active boolean, trial_days_left, timezone, organization, and role fields
**Plans**: 2 plans

Plans:
- [x] 23-01-PLAN.md — CreditResolver service extraction, pending plan migration, consumer rewiring
- [x] 23-02-PLAN.md — Plan listing/selection APIs, UserResource expansion with plan/trial fields

### Phase 24: Enhanced Onboarding
**Goal**: Users provide timezone, organization, and role during onboarding with smart defaults
**Depends on**: Phase 22
**Requirements**: ONBD-01, ONBD-02, ONBD-03, ONBD-04, TZ-02
**Success Criteria** (what must be TRUE):
  1. Get Started page shows timezone dropdown pre-filled with browser-detected timezone, plus optional organization and role fields
  2. Submitting the onboarding form stores timezone, organization, and role in the database
  3. AuthContext exposes the user's stored timezone for frontend consumption
  4. Existing onboarded users are not forced back to the onboarding flow (new fields are optional)
**Plans**: 2 plans

Plans:
- [x] 24-01-PLAN.md — OnboardingController validation expansion with tests for timezone, organization, role
- [ ] 24-02-PLAN.md — SearchableDropdown, SimpleDropdown components, GetStartedPage form update, AuthContext timezone

### Phase 25: Pricing, Trial Banners & Timezone Display
**Goal**: Users can see plan options, understand their trial status, select a plan, and see all timestamps in their timezone
**Depends on**: Phase 23, Phase 24
**Requirements**: PRICE-01, PRICE-02, PRICE-03, PRICE-04, PRICE-05, PRICE-06, PRICE-07, PRICE-08, TRIAL-05, TRIAL-06, TZ-01, TZ-03
**Success Criteria** (what must be TRUE):
  1. Pricing page displays 4 plan cards with name, daily credit limit, feature list, and selection button (Pro highlighted as "Most Popular", Enterprise shows "Contact Us")
  2. User's current plan is visually indicated on pricing page; selecting a different plan updates it immediately
  3. Trial users see a countdown banner showing days remaining; expired-trial users see an upgrade prompt banner
  4. CreditBadge in the sidebar shows plan name alongside remaining/limit (e.g., "Pro: 42/50")
  5. All timestamps across the app render in the authenticated user's stored timezone; unauthenticated users see UTC
**Plans**: TBD

Plans:
- [ ] 25-01: TBD
- [ ] 25-02: TBD
- [ ] 25-03: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 22 → 23 → 24 → 25
(Note: Phase 24 depends on Phase 22 only, so it could run in parallel with Phase 23 if needed.)

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Laravel Foundation + Core Auth | v1.0 | 2/2 | Complete | 2026-03-12 |
| 2. OAuth + Email Verification | v1.0 | 2/2 | Complete | 2026-03-13 |
| 3. Rate Limiting Backend | v1.0 | 2/2 | Complete | 2026-03-13 |
| 4. Frontend Auth Integration | v1.0 | 3/3 | Complete | 2026-03-13 |
| 4.1. Layout Redesign | v1.0 | 2/2 | Complete | 2026-03-13 |
| 5. Dark Web Search | v1.0 | 2/2 | Complete | 2026-03-13 |
| 6. PostgreSQL Migration | v1.1 | 2/2 | Complete | 2026-03-13 |
| 7. Railway Production Deployment | v1.1 | 2/2 | Complete | 2026-03-14 |
| 8. Foundation & OpenCTI Service | v2.0 | 2/2 | Complete | 2026-03-14 |
| 9. IP Search Integration | v2.0 | 3/3 | Complete | 2026-03-15 |
| 10. Threat Actors & Threat News | v2.0 | 2/2 | Complete | 2026-03-15 |
| 11. Threat Map | v2.0 | 2/2 | Complete | 2026-03-15 |
| 12. Threat Actors UI Refresh | v2.1 | 1/1 | Complete | 2026-03-17 |
| 13. Threat News UI Refresh | v2.1 | 1/1 | Complete | 2026-03-17 |
| 14. Backend Search Generalization | v2.1 | 2/2 | Complete | 2026-03-18 |
| 15. Frontend Threat Search + Route Migration | v2.1 | 1/1 | Complete | 2026-03-18 |
| 16. Threat Actors UX Polish | v2.1 | 1/1 | Complete | 2026-03-18 |
| 17. Threat News UX Polish | v2.1 | 2/2 | Complete | 2026-03-18 |
| 18. Dashboard Stats Backend | v2.2 | 2/2 | Complete | 2026-03-18 |
| 19. Search History Backend | v2.2 | 1/1 | Complete | 2026-03-18 |
| 20. Dashboard Page Rewrite | v2.2 | 2/2 | Complete | 2026-03-19 |
| 21. Threat Search History | v2.2 | 1/1 | Complete | 2026-03-19 |
| 22. Schema & Data Foundation | v3.0 | 2/2 | Complete | 2026-03-20 |
| 23. CreditResolver & Plan-Aware Backend | v3.0 | 2/2 | Complete    | 2026-03-22 |
| 24. Enhanced Onboarding | v3.0 | 1/2 | In Progress|  |
| 25. Pricing, Trial Banners & Timezone Display | v3.0 | 0/3 | Not started | - |
