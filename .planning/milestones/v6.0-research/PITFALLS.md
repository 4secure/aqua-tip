# Pitfalls Research

**Domain:** Adding plan restructuring, feature gating, auth FOUC fix, D3 zoom, contact form, chart changes, and UI polish to a live Laravel+React SPA
**Project:** AQUA TIP v4.0 -- Plan Overhaul & UX Polish
**Researched:** 2026-04-10
**Confidence:** HIGH (direct codebase analysis of PlanSeeder.php, CreditResolver.php, AuthContext.jsx, App.jsx, ProtectedRoute.jsx, ThreatSearchPage.jsx D3Graph, api.php routes, Plan model)

---

## Critical Pitfalls

### Pitfall 1: Plan Seeder Overwrites Create Credit Limit Desync for Active Users

**What goes wrong:**
The current `PlanSeeder` uses `updateOrCreate` keyed on `slug`. Changing `daily_credit_limit` for existing slugs (e.g., `free` from 1 to 5, `basic` from 15 to 30) updates the `plans` table immediately. But the `credits` table stores a denormalized `limit` column set at last lazy reset. Mid-day users retain the old `limit` in their credit row until their next midnight UTC reset via `CreditResolver::lazyReset()`. The credit badge shows "1/1" while the pricing page advertises "5/day".

**Why it happens:**
Credit limits are denormalized into the `credits` table at reset time (`lazyReset` reads `resolveLimit()` which reads `plan.daily_credit_limit`). The seeder changes the source of truth, but the cached `credits.limit` is stale until next reset.

**How to avoid:**
1. After running the seeder, execute a data migration that recalculates every active credit row:
   ```sql
   UPDATE credits SET limit = plans.daily_credit_limit, remaining = LEAST(remaining, plans.daily_credit_limit)
   FROM users JOIN plans ON users.plan_id = plans.id
   WHERE credits.user_id = users.id AND credits.user_id IS NOT NULL;
   ```
2. The `LEAST(remaining, plans.daily_credit_limit)` prevents users from retaining more credits than the new lower limit allows (e.g., user had 10 remaining on old 15-limit plan, new limit is 5 -- cap to 5).
3. For users whose limit INCREASED (free 1 -> 5), add the difference to remaining: `remaining = remaining + (new_limit - old_limit)`.
4. Wrap seeder + credit sync in an artisan command so they always run atomically.

**Warning signs:**
- Credit badge shows old limit after deploy
- Users report limits changed "the next day" instead of immediately
- `credits.limit` != `plans.daily_credit_limit` for users on that plan

**Phase to address:**
Phase 1 (Plan seeder + CreditResolver update) -- credit sync migration MUST ship alongside the seeder, not as a follow-up.

---

### Pitfall 2: "Trial" Plan Slug Conflicts with Existing Trial-as-User-State Logic

**What goes wrong:**
The v4.0 spec introduces a "Trial" tier (30d, 10/day). The current system handles trial as a user state: `trial_ends_at` timestamp + `plan_id = null`. `CreditResolver::resolveLimit()` checks `plan_id !== null` first (returns plan limit), then checks trial state. If a `trial` plan slug is created and assigned to users via `plan_id`, the trial expiry check in `checkTrialExpiry()` never fires because it requires `plan_id === null`. Trial users never auto-downgrade to Free.

**Why it happens:**
Trial is implemented as "no plan with a timer" (lines 91-97 of CreditResolver.php). Making it a plan row changes the invariant that trial = no plan.

**How to avoid:**
Keep trial as a user state, not a plan row. Specifically:
1. Do NOT create a `trial` slug in the PlanSeeder.
2. Keep `CreditResolver::TRIAL_DAILY_LIMIT = 10` (already matches the v4.0 spec).
3. The pricing page displays "Trial" as a virtual card (not from the database), only for users currently in trial.
4. New users continue to get `plan_id = null` + `trial_ends_at = now + 30 days`.
5. On trial expiry, `checkTrialExpiry()` assigns the free plan (already implemented correctly).

**Warning signs:**
- `Plan::where('slug', 'trial')` exists in the database
- Trial users have a non-null `plan_id`
- Trial countdown banner disappears because user "has a plan"
- Trial users never downgrade after 30 days

**Phase to address:**
Phase 1 (Plan restructure) -- this is a design decision that must be made BEFORE any code is written. Document in the phase plan.

---

### Pitfall 3: Feature Gating Breaks Guest Search or Free Users Access Everything

**What goes wrong:**
Two failure modes:
1. Threat search (`/threat-search`) is accidentally made auth-required, breaking guest access (guests currently get 1 search/day via IP-based credits).
2. Feature gating is only implemented in the frontend (hiding sidebar links), so Free users can still call `/api/threat-actors`, `/api/threat-news`, etc. directly.

**Why it happens:**
The spec says "Free plan = threat search only." This is ambiguous: does it mean "Free users can ONLY access threat search" (restricting other features) or "threat search is available to Free users" (others need higher plans)? The correct reading is the former: Free users lose access to Threat Actors, Threat News, Dark Web, and the Dashboard/Threat Map. But the implementation must gate on the backend, not just the frontend.

**How to avoid:**
1. Create a `PlanGate` middleware that checks `$user->plan->slug` against a route's required plan level.
2. Apply it to backend routes: `threat-actors`, `threat-news`, `dark-web`, `threat-map/stream`, `search-history` should require plan level >= basic.
3. Keep `/api/threat-search` and `/api/credits` ungated (they use credit-based rate limiting already).
4. Frontend: show the page with a blurred overlay + upgrade CTA for Free users, not a blank 403. This is better UX than hiding the sidebar link entirely.
5. Keep sidebar links visible but visually dimmed with a lock icon for gated features.

**Warning signs:**
- Guest users see "login required" on `/threat-search`
- Free users can still fetch `/api/threat-actors` (returns 200 instead of 403)
- Backend returns 403 but frontend shows a broken white page

**Phase to address:**
Phase 2 (Feature gating) -- backend middleware + frontend upgrade CTA must ship together. Test both the API response AND the UI for Free users.

---

### Pitfall 4: Auth FOUC Fix Only Covers Guarded Routes, Not Public Pages

**What goes wrong:**
The FOUC fix targets auth loading state. `ProtectedRoute` and `GuestRoute` already show spinners during `loading`. But Landing (`/`), Pricing (`/pricing`), Threat Search (`/threat-search`), and Contact (`/contact`) are outside both guards. They call `useAuth()` and immediately render with `user = null`, then re-render 200-500ms later when auth resolves. The pricing page navbar flickers from "Log In / Sign Up" to "Threat Lookup" button. The threat search page flickers the guest CTA.

**Why it happens:**
Only route guards consume the `loading` state. Pages outside guards render immediately with stale auth context (user = null while the `/api/user` request is in flight).

**How to avoid:**
Add a single global auth gate in `App.jsx` that blocks ALL route rendering until auth resolves:
```jsx
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AuthGate>  {/* renders children only when loading=false */}
          <Suspense fallback={<LazyFallback />}>
            <Routes>...</Routes>
          </Suspense>
        </AuthGate>
      </AuthProvider>
    </BrowserRouter>
  );
}
```
The `AuthGate` component is 5 lines: if `loading`, show spinner; else render `children`. This is a single-point fix -- do NOT add loading checks to individual pages.

**Warning signs:**
- Pricing navbar flickers between auth states on hard refresh
- Threat search shows "Sign in for more lookups" CTA then hides it
- Landing page buttons change text after 200ms

**Phase to address:**
Phase 3 (Auth FOUC fix) -- a single `AuthGate` wrapper component in App.jsx. Test on ALL page types: guarded, public, guest-only, and lazy-loaded.

---

### Pitfall 5: D3 Zoom Captures Node Drag Events, Breaking Graph Interaction

**What goes wrong:**
The current `D3Graph` component uses `d3.drag()` on node `<g>` elements (ThreatSearchPage.jsx lines 102-106). Adding `d3.zoom()` on the SVG creates an event conflict: both behaviors listen for pointer/mouse events. Dragging a node triggers both node repositioning AND canvas panning simultaneously. The node flies off-screen while the viewport shifts.

**Why it happens:**
D3 zoom captures all pointer events on its target element (the SVG). Node drag events bubble up from `<g>` to `<svg>`, where zoom intercepts them as pan gestures.

**How to avoid:**
1. Create a zoom layer: `const g = svg.append('g')` -- put all content (links, nodes) inside this `<g>`.
2. Apply zoom to the SVG: `svg.call(zoom.on('zoom', (e) => g.attr('transform', e.transform)))`.
3. Apply drag to nodes as before, but add `event.sourceEvent.stopPropagation()` in the drag start handler to prevent zoom from seeing node drags.
4. Disable double-click zoom: `svg.on('dblclick.zoom', null)`.
5. Add visible +/- buttons that call `zoom.scaleBy(svg.transition(), 1.3)` and `zoom.scaleBy(svg.transition(), 0.7)`.
6. Add a reset button: `svg.transition().call(zoom.transform, d3.zoomIdentity)`.

**Warning signs:**
- Dragging a node pans the entire canvas
- Scroll wheel does nothing (zoom not attached to SVG)
- Zoom works but node positions don't update (transform on wrong element)

**Phase to address:**
Phase 5 (D3 zoom controls) -- the D3Graph component is self-contained, changes are isolated. But the entire component needs restructuring (zoom layer pattern), not just adding zoom.

---

### Pitfall 6: Contact Form Email Spam Abuse Within Hours of Deploy

**What goes wrong:**
A public contact form endpoint that sends email is an immediate bot target. Without rate limiting AND bot detection, the SMTP provider flags the account for spam, and the inbox fills with garbage within the first day.

**Why it happens:**
Contact forms are the #1 exploited endpoint on public websites. Bots submit hundreds of requests per hour.

**How to avoid:**
1. **Rate limit:** `throttle:3,60` middleware (3 submissions per IP per hour).
2. **Honeypot field:** Hidden `website` input. Reject (silently return 200) if filled.
3. **Time check:** Embed a `_rendered_at` timestamp. Reject submissions under 3 seconds.
4. **Queue email:** `Mail::to(...)->queue(new EnterpriseContactMail(...))` -- never block HTTP response on SMTP.
5. **Input validation:** Name max 100 chars, email validated, message max 2000 chars, strip HTML.
6. **Do NOT use CAPTCHA** -- honeypot + rate limit + time check catches 99% of bots without UX friction.

**Warning signs:**
- 50+ identical submissions in the first day
- SMTP provider (Resend/Postmark/Mailgun) sends abuse warning
- Contact endpoint response time is 2-5 seconds (blocking SMTP send)

**Phase to address:**
Phase 6 (Enterprise contact form) -- all three protections (rate limit, honeypot, time check) must ship together. Email must be queued.

---

### Pitfall 7: Pricing Page Dual-Layout Causes Flash or Route Conflicts

**What goes wrong:**
v4.0 wants auth-aware pricing: authenticated users see pricing within AppLayout (with sidebar), guests see standalone pricing (own navbar). If implemented as conditional rendering based on auth state, the auth FOUC problem resurfaces on just this page. If implemented as two separate routes, React Router precedence issues arise.

**Why it happens:**
Pricing is currently a standalone public route (App.jsx line 58) with its own navbar that already handles auth-awareness (shows different buttons for auth vs guest). Moving it inside AppLayout for auth users requires either route duplication or layout-level conditional logic.

**How to avoid:**
The current approach is already sufficient and simpler:
1. **Keep pricing as a single standalone route** at `/pricing` (outside AppLayout).
2. The existing `PricingPage` navbar already shows "Threat Lookup" for auth users and "Log In / Sign Up" for guests.
3. If sidebar presence is truly needed for auth users, add a "Back to Threat Map" link in the pricing page navbar for auth users -- this gives navigation context without duplicating layouts.
4. If you MUST have sidebar: create two `<Route>` entries (`/pricing` inside AppLayout wrapped in a soft auth check, and `/pricing` standalone as fallback). But this adds complexity for minimal UX gain.

**Warning signs:**
- Pricing page shows sidebar then hides it (or vice versa) on load
- Browser back button from pricing goes to wrong page depending on auth state
- Auth FOUC returns on pricing page despite the global fix

**Phase to address:**
Phase 7 (Pricing routing) -- evaluate whether dual-layout is truly needed before implementing. The simpler solution (keep current standalone page) may satisfy the requirement.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcoding plan slugs in frontend (`if (plan.slug === 'free')`) | Quick feature gating without API changes | Every plan rename or new plan requires frontend deploy | MVP only -- extract to a `user.permissions` or `user.features` array from the API |
| Frontend-only feature gating (hiding sidebar links) | No backend middleware needed | Users bypass via direct URL or API calls | Never for paid features -- always enforce server-side |
| Skipping credit sync after plan seeder | Faster deploy | Users see wrong limits until next midnight | Never -- always sync credits atomically with plan changes |
| Inline D3 zoom in existing 130-line D3Graph function | Less files to change | Function becomes 200+ lines, untestable | Acceptable if zoom logic is extracted to a `useD3Zoom` hook |
| Contact form without queued email | No queue driver setup needed | Blocks HTTP response 2-5s on SMTP, timeouts on Railway | Never in production |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Plan seeder on Railway | Running `db:seed --class=PlanSeeder` without credit sync | Create an artisan command that runs seeder + credit sync atomically |
| Sanctum auth FOUC | Adding `/api/user` calls to individual pages | Single global auth gate in App.jsx; AuthProvider already makes one call |
| D3 zoom + D3 drag | Both on same SVG element without event isolation | Zoom on SVG, drag on nodes with `stopPropagation`, content in zoom `<g>` layer |
| Laravel Mail on Railway | Using `MAIL_MAILER=smtp` without provider config | Configure Resend/Postmark/Mailgun; add `MAIL_MAILER` + credentials to Railway env vars |
| Chart.js canvas reuse | Creating new Chart instance without destroying old one on re-render | Verify `chart.destroy()` in useEffect cleanup; `useChartJs` hook handles lazy load but check instance lifecycle |
| Feature gate middleware + public routes | Applying plan-check middleware to `/api/threat-search` (which is public) | Only gate browse routes (threat-actors, threat-news, etc.); threat-search and credits remain public with credit-based rate limiting |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Multiple Chart.js canvases on dashboard right panel + Threat News | Janky transitions, high memory | Lazy-load Chart.js per page (existing `useChartJs` pattern); destroy on unmount | 4+ charts on same viewport |
| D3 simulation keeps running after tab switch | 30%+ CPU in background | `simulation.stop()` in useEffect cleanup (current code does this); verify zoom doesn't restart it | Any tab with D3 graph |
| Auth check waterfall: CSRF cookie then `/api/user` | 400-800ms before any page renders | Ensure `fetchCurrentUser` skips CSRF call if cookie already exists; global spinner hides this | Every page load for returning users |
| Contact form without submit debounce | Duplicate emails on double-click | Disable button on submit; re-enable on response/error; backend rate limit catches remainder | Immediately |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Feature gating only in frontend | Free users call gated API endpoints directly | Backend `PlanGate` middleware on all gated routes; frontend gating is UX, backend is security |
| Contact form email header injection | Attacker injects SMTP headers via name/message field | Laravel Mailable handles this, but validate: name max 100, message max 2000, email format validated |
| Trial plan slug selectable via plan API | Users self-assign trial to reset trial period | If trial becomes a plan, exclude from `PlanSelectionController` validation (like enterprise). Better: keep trial as user state, not a plan |
| Plan IDs exposed in API allow self-upgrade | Attacker assigns enterprise plan_id to themselves | `PlanSelectionController` already validates `in:free,basic,pro`; verify enterprise excluded; never trust client-provided plan_id |
| Contact form leaks internal email address | Attacker learns support inbox, uses for social engineering | Return generic "Message sent" response; do not expose recipient email in API response or frontend code |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Feature gate shows blank 403 page | Free users confused and frustrated | Show page with blurred overlay + "Upgrade to Basic to access" CTA |
| Plan upgrade takes effect at midnight | User pays for Basic, still sees Free limits today | On plan change, immediately recalculate and update credit row; call `refreshUser()` in AuthContext |
| Auth FOUC spinner too long (>500ms) | Page feels slow on every visit | No artificial minimum delay; if auth resolves in <100ms, spinner barely flashes |
| Credit badge stale after plan change | User selected Basic but sidebar still shows "Free" | `POST /api/plan` success handler must call `refreshUser()` to re-fetch user with updated plan |
| D3 zoom with no visual controls | Users don't discover scroll-to-zoom | Add visible +/- buttons in graph corner; scroll-zoom alone is not discoverable |
| Contact form "Message sent" with no feedback | User unsure if submission worked | Show success toast/banner; disable re-submit for 60 seconds |

## "Looks Done But Isn't" Checklist

- [ ] **Plan seeder:** Verify `credits.limit` matches `plans.daily_credit_limit` for ALL users after seeder runs (query: `SELECT count(*) FROM credits c JOIN users u ON c.user_id = u.id JOIN plans p ON u.plan_id = p.id WHERE c.limit != p.daily_credit_limit` returns 0)
- [ ] **Feature gating backend:** `curl` with free-plan session cookie to `/api/threat-actors` returns 403, not 200
- [ ] **Feature gating frontend:** Free user sees upgrade CTA on gated pages, not blank white page
- [ ] **Auth FOUC:** Hard-refresh `/pricing` -- navbar does NOT flicker between guest/auth states
- [ ] **Auth FOUC:** Hard-refresh `/threat-search` -- guest CTA does NOT appear then disappear
- [ ] **D3 zoom:** Drag a node -- canvas does NOT pan simultaneously
- [ ] **D3 zoom:** New search results load -- zoom transform resets to default (no lingering zoom from previous search)
- [ ] **Contact form:** Submit with honeypot field filled -- 200 response, no email sent
- [ ] **Contact form:** Check email is queued (not blocking response) -- response time < 500ms
- [ ] **Dashboard rename:** Grep for "Dashboard" in all sidebar labels, page titles, breadcrumbs -- all say "Threat Map"
- [ ] **Chart cleanup:** Navigate between Threat News and Threat Map repeatedly -- no "Canvas is already in use" console errors
- [ ] **Plan change:** User selects Basic on pricing page -- credit badge and plan chip in topbar update immediately without page refresh
- [ ] **Trial user:** Verify trial user with `plan_id = null` sees correct 10/day limit and trial banner

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Plan seeder credit desync | LOW | Run artisan command to recalculate all credit rows from current plan data |
| Trial plan slug conflict | MEDIUM | Remove trial plan row; set affected users back to `plan_id = null`; verify `trial_ends_at` still correct |
| Feature gating frontend-only | HIGH | Retrofit `PlanGate` middleware on all gated API routes; audit logs for free-plan users accessing gated data |
| Auth FOUC on public pages | LOW | Add `AuthGate` wrapper in App.jsx (5 lines); revert is equally easy (remove wrapper) |
| D3 zoom + drag conflict | LOW | Add `event.sourceEvent.stopPropagation()` in drag start; wrap content in zoom `<g>` layer |
| Contact form spammed | MEDIUM | Add rate limit + honeypot immediately; rotate SMTP credentials if provider flagged |
| Credit badge stale after upgrade | LOW | Add `refreshUser()` call in plan selection success handler |
| Chart canvas not destroyed | LOW | Add `chart.destroy()` in useEffect cleanup return |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Plan seeder credit desync | Phase 1: Plan restructure | `SELECT count(*) FROM credits c JOIN users u ON ... WHERE c.limit != p.daily_credit_limit` returns 0 |
| Trial plan slug conflict | Phase 1: Plan restructure | No `plans` row with `slug = 'trial'`; trial users have `plan_id IS NULL` |
| Feature gating frontend-only | Phase 2: Feature gating | `GET /api/threat-actors` with free-plan auth returns 403 |
| Auth FOUC on public pages | Phase 3: Auth FOUC fix | Hard-refresh `/pricing` -- zero navbar flicker |
| Chart cleanup on navigation | Phase 4: Chart changes | Navigate between chart pages 5x -- zero console errors |
| D3 zoom + drag conflict | Phase 5: D3 zoom | Drag node -- canvas stays still; scroll wheel -- canvas zooms |
| Contact form spam | Phase 6: Contact form | Honeypot-filled submission silently rejected; response < 500ms |
| Pricing dual-layout flash | Phase 7: Pricing routing | Auth user navigates to `/pricing` -- consistent layout, no flash |
| Plan change credit badge stale | Phase 1: Plan restructure | Select new plan on pricing page -- topbar plan chip updates instantly |

## Sources

- Direct codebase analysis: `backend/database/seeders/PlanSeeder.php` (updateOrCreate on slug, plan data structure)
- Direct codebase analysis: `backend/app/Services/CreditResolver.php` (resolveLimit, lazyReset, checkTrialExpiry, TRIAL_DAILY_LIMIT)
- Direct codebase analysis: `frontend/src/contexts/AuthContext.jsx` (loading state, refreshUser callback, user state)
- Direct codebase analysis: `frontend/src/App.jsx` (route structure, guarded vs public routes, lazy loading)
- Direct codebase analysis: `frontend/src/components/auth/ProtectedRoute.jsx` (loading spinner pattern)
- Direct codebase analysis: `frontend/src/components/auth/GuestRoute.jsx` (loading spinner pattern)
- Direct codebase analysis: `frontend/src/pages/ThreatSearchPage.jsx` lines 36-138 (D3Graph with drag behavior, SVG direct append)
- Direct codebase analysis: `frontend/src/pages/PricingPage.jsx` (auth-aware navbar, plan fetching)
- Direct codebase analysis: `backend/routes/api.php` (public vs auth routes, deduct-credit middleware)
- Direct codebase analysis: `backend/app/Models/Plan.php` (fillable fields, casts)
- D3 zoom + drag event isolation: D3 documentation zoom.filter and event.sourceEvent pattern (training data, MEDIUM confidence -- well-established pattern)
- Laravel Mail queue: Laravel 11 queue documentation (training data, HIGH confidence)
- Contact form spam prevention: established web security patterns (training data, HIGH confidence)

---
*Pitfalls research for: AQUA TIP v4.0 -- Plan Overhaul & UX Polish*
*Researched: 2026-04-10*
