# Phase 54: Feature Gating - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Free plan users can only access threat search; all other features require a paid plan. The PlanSeeder features list must reflect "threat search only" (not "all features"). Backend middleware and frontend guards already exist from Phase 43 — verify they work correctly and fix only if broken.

</domain>

<decisions>
## Implementation Decisions

### Free Plan Features Text (PlanSeeder)
- **D-01:** Free plan features list in PlanSeeder must be reduced to exactly 2 items: "5 searches per day" and "Threat search"
- **D-02:** Remove all misleading items from the free plan: "All threat lookups", "Full indicator data", "Search history", "Priority data access", "Dark web monitoring"
- **D-03:** Paid plans (Basic, Pro, Enterprise) keep their existing longer feature lists unchanged

### Verify Existing Gating
- **D-04:** Quick spot-check that FeatureGate middleware returns 403 for free users on all 4 gated route groups (dashboard, threat-actors, threat-news, dark-web)
- **D-05:** Quick spot-check that FeatureGatedRoute shows UpgradeCTA on frontend for free users navigating to gated pages (threat-map, dark-web, threat-actors, threat-news)
- **D-06:** Fix only if broken — do not refactor or rewrite existing Phase 43 implementation

### Pricing Page Impact
- **D-07:** Free plan card on pricing page naturally shows shorter 2-item features list (from D-01), creating visual contrast with paid plans' longer lists
- **D-08:** No explicit restriction text or strikethrough needed — the shorter list naturally encourages upgrades

### Claude's Discretion
- Free plan description text update (if current description is misleading)
- Whether to update the migration or just the seeder for features list change

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Plan System (Backend)
- `backend/database/seeders/PlanSeeder.php` — Free plan features list to update (lines 21-28)
- `backend/app/Http/Middleware/FeatureGate.php` — Existing middleware to verify
- `backend/routes/api.php` — Gated route groups (lines 68-88)

### Frontend Gating
- `frontend/src/hooks/useFeatureAccess.js` — Plan check hook to verify
- `frontend/src/components/auth/FeatureGatedRoute.jsx` — Route guard to verify
- `frontend/src/components/ui/UpgradeCTA.jsx` — Upgrade CTA component to verify
- `frontend/src/components/layout/Sidebar.jsx` — Lock icons on gated items to verify
- `frontend/src/App.jsx` — Router with FeatureGatedRoute wrapper (line 70)

### Prior Context
- `.planning/phases/43-feature-gating/43-CONTEXT.md` — Original feature gating decisions (D-01 through D-18)

### Requirements
- `.planning/REQUIREMENTS.md` — GATE-01, GATE-02, GATE-03

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- FeatureGate middleware already implemented and registered
- FeatureGatedRoute, UpgradeCTA, useFeatureAccess hook all exist
- Sidebar already shows lock icons for gated items with opacity-40 pattern

### Established Patterns
- Phase 43 built the full gating infrastructure: backend middleware, frontend guards, sidebar locks, upgrade CTA
- PlanSeeder uses JSON `features` array that renders on pricing page

### Integration Points
- PlanSeeder features array drives both the `plans` DB table and the pricing page display
- Running `php artisan db:seed --class=PlanSeeder` updates the features in production

</code_context>

<specifics>
## Specific Ideas

- Free plan should show only "5 searches per day" and "Threat search" — nothing else
- The visual contrast between free (2 items) and paid (6 items) is the upsell mechanism
- Existing gating from Phase 43 should be trusted unless verification finds issues

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 54-feature-gating*
*Context gathered: 2026-04-14*
