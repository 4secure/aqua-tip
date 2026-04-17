# Stack Research: v4.0 Plan Overhaul & UX Polish

**Domain:** Threat Intelligence Platform -- incremental feature additions
**Researched:** 2026-04-10
**Confidence:** HIGH

## Verdict: Zero New Dependencies

Every v4.0 feature is achievable with the existing stack. This continues the project pattern: v2.1, v3.0, v3.1, v3.2, and v3.3 all shipped with zero new deps. The stack was well-chosen and covers all requirements without additions.

---

## Feature-by-Feature Stack Analysis

### 1. Laravel Mail for Enterprise Contact Form

**Verdict:** Use existing Laravel Mail infrastructure. No new packages.

| Component | Already Present | Version | Notes |
|-----------|----------------|---------|-------|
| `illuminate/mail` | Yes | Ships with `laravel/framework ^12.0` | Part of core framework |
| SMTP transport | Yes | Configured in `config/mail.php` | Already sending verification emails via `VerifyEmailWithCode` notification |
| `MailMessage` builder | Yes | Used in `VerifyEmailWithCode` | Same API pattern applies |

**Implementation approach:** Create a `Mailable` class (not a Notification) because this is a standalone email not tied to a user entity. Use `Mail::to(config('mail.contact_address'))` to send to a configured admin inbox.

```bash
php artisan make:mail EnterpriseContactInquiry
```

**Why Mailable over Notification:** The contact form sends TO the business (admin inbox), not to a notifiable user. Notifications are user-scoped (`$user->notify()`). A Mailable with `Mail::to()` is the correct pattern for "external visitor contacts us."

**Why NOT a third-party form service (Formspree, Basin):** The backend already has SMTP mail configured and working (verification emails send via Contabo SMTP). Adding an external service creates a dependency for something Laravel handles natively in ~20 lines.

**Environment:** `.env` already has `MAIL_MAILER=smtp` with a working Contabo SMTP host. The same transport that sends verification emails will send contact form emails. Only one new env var needed: `CONTACT_EMAIL` for the recipient address.

**Rate limiting:** The contact form endpoint should be throttled (e.g., `throttle:3,60` -- 3 per hour per IP) to prevent abuse. Use Laravel's built-in `throttle` middleware.

### 2. D3 Zoom Behavior for Relationship Graph

**Verdict:** Use `d3.zoom()` from the existing `d3@^7.9.0` package. No new packages.

| Component | Already Present | Version | Notes |
|-----------|----------------|---------|-------|
| `d3` (full bundle) | Yes | `^7.9.0` | Includes `d3-zoom` module |
| `d3.zoom()` | Yes (unused) | Part of d3@7 | Available via existing `import('d3')` |
| `d3.drag()` | Yes (in use) | Part of d3@7 | Already used on relationship graph nodes in `ThreatSearchPage.jsx` |

**Implementation approach:** The relationship graph in `ThreatSearchPage.jsx` (line 45+) already dynamically imports d3 and uses `d3.drag()`. Adding zoom requires:

1. Wrap all SVG content (links, labels, nodes) in a `<g>` group element
2. Apply `d3.zoom().on('zoom', (event) => g.attr('transform', event.transform))` to the SVG
3. Set `scaleExtent([0.3, 3])` to prevent extreme zoom levels
4. Add zoom in/out/reset buttons that call `svg.transition().call(zoom.scaleBy, 1.3)` etc.

**Zoom + drag coexistence:** D3 handles this correctly when zoom is on the SVG parent and drag is on child nodes. The existing drag handlers on nodes will continue working without modification. D3's event propagation stops drag events from bubbling up to the zoom behavior.

**Why NOT `react-zoom-pan-pinch` or `panzoom`:** D3's built-in `d3.zoom()` is purpose-built for SVG transforms and integrates with the force simulation coordinate system. A DOM-level zoom library would fight with D3's internal coordinate math. The existing d3 import already includes zoom at zero additional cost.

### 3. Chart.js Bar Chart Alongside Existing Donut

**Verdict:** Use existing `chart.js@^4.5.1` with `type: 'bar'`. No new packages.

| Component | Already Present | Version | Notes |
|-----------|----------------|---------|-------|
| `chart.js` | Yes | `^4.5.1` | Already imported via `chart.js/auto` |
| Bar chart type | Yes | Included in `chart.js/auto` | Auto-registers all chart types including bar |
| `useChartJs` hook | Yes | Custom hook in `hooks/useChartJs.js` | Generic -- works with any Chart.js config |
| Donut pattern | Yes | `ThreatMapDonut.jsx` | Existing component to follow as template |

**For the category bar chart in the right panel:** Create `ThreatMapBarChart.jsx` following the same pattern as `ThreatMapDonut.jsx`. Use horizontal bar (`indexAxis: 'y'`) for readable category names. Reuse the `TYPE_COLORS` map from `ThreatMapDonut.jsx` for consistency.

**For the Threat News category-only chart with side labels:** Replace or supplement `CategoryDistributionChart.jsx` (currently a stacked area chart) with a horizontal bar chart. Use `indexAxis: 'y'` with legend disabled and category labels as y-axis ticks.

**Dark theme integration:** Set per-chart options to match design system:
- Grid color: `#1E2030` (border token)
- Text color: `#9AA0AD` (text-muted)
- Background fills: category color + `'40'` alpha suffix (established pattern in `ThreatMapDonut.jsx`)

**Why NOT Recharts, Nivo, or Victory:** Chart.js is already in the bundle with working patterns. Adding a second charting library for a bar chart would be irrational.

### 4. Auth Loading State to Prevent FOUC

**Verdict:** Use existing React state (`loading` in AuthContext). No new packages.

| Component | Already Present | Version | Notes |
|-----------|----------------|---------|-------|
| `AuthContext.loading` | Yes | -- | Starts `true`, set to `false` after `fetchCurrentUser()` resolves |
| `useState(true)` initial | Yes | -- | Line 19 of `AuthContext.jsx`: `const [loading, setLoading] = useState(true)` |
| Framer Motion | Yes | `^12.35.2` | Available for fade-out transition on load screen |

**Why the FOUC happens now:** `App.jsx` renders routes immediately while `loading` is `true`. Components check `isAuthenticated` which is `false` during the initial fetch, causing a flash of unauthenticated UI (no sidebar, wrong nav state) before auth resolves and re-renders.

**Implementation approach:**

1. In `App.jsx` (or the component wrapping the router), check `loading` from `useAuth()`
2. While `loading === true`, render a full-screen loading indicator (logo centered on `bg-primary`)
3. When `loading === false`, render the actual routes
4. Optionally use Framer Motion `AnimatePresence` for a smooth fade-out of the loading screen

**Loading screen design:** Centered `/logo.png` on `bg-primary` (#0A0B10) with a subtle CSS pulse or opacity animation. This screen typically shows for 100-500ms. Keep it minimal.

**Why NOT React Suspense:** Suspense is for code-splitting boundaries (`React.lazy()`), not imperative async data fetching. The auth check is `fetchCurrentUser()` in a `useEffect`. A simple `if (loading) return <LoadingScreen />` is the correct and idiomatic pattern.

**Why NOT `react-loading-skeleton` or `react-spinners`:** Over-engineered for a single brief loading screen. A CSS animation on the logo is sufficient and avoids a new dependency.

### 5. Feature Gating by Plan Tier

**Verdict:** Use existing `features` JSON column on the `plans` table. No new packages.

| Component | Already Present | Version | Notes |
|-----------|----------------|---------|-------|
| `plans.features` column | Yes | JSON, nullable | Migration `2026_03_21_000001_create_plans_table.php` |
| `Plan::features` cast | Yes | `'features' => 'array'` | Plan model line 25 |
| `User::plan()` relation | Yes | BelongsTo | User model line 90 |
| `UserResource` | Yes | API resource | Already exposes plan data to frontend |
| `CreditResolver` | Yes | Service class | Already plan-aware, checks `$user->plan->daily_credit_limit` |

**Implementation approach:** The `features` JSON column already exists and is cast to an array. Currently it stores display strings for the pricing page. Evolve it to include a structured gates array:

```php
// In PlanSeeder:
'features' => [
    'display' => ['Threat Search', '5 searches/day'],        // pricing page display
    'gates' => ['threat_search'],                             // Free: search only
]

// Pro plan:
'features' => [
    'display' => ['All features', '50 searches/day', 'API access'],
    'gates' => ['threat_search', 'threat_actors', 'threat_news', 'threat_map', 'dark_web'],
]
```

**Backend gating:** Create a middleware (`EnsureFeatureAccess`) that checks `$user->plan->features['gates']` against a route parameter. Apply to routes:

```php
Route::get('/threat-actors', ...)->middleware('feature:threat_actors');
```

Unauthenticated users and users without a plan get the Free tier gates (threat search only, per PROJECT.md).

**Frontend gating:** `UserResource` already exposes plan data. The frontend reads `user.plan.features.gates` and:
- Conditionally renders sidebar nav links (hide inaccessible pages)
- Shows upgrade CTA on gated page routes (instead of blank 403)
- Dims/locks gated features in the UI

**Why NOT Laravel Pennant:** Pennant is for A/B testing and gradual rollouts with per-user feature resolution. This is deterministic plan-tier gating -- a user on Free always gets the same gates. A middleware checking a JSON column is the right abstraction level. Pennant adds complexity without value here.

**Why NOT `spatie/laravel-permission`:** That package is for role-based access control (admin, editor, viewer). This is subscription-tier gating, which is a different dimension. The plan model already has everything needed.

**Why NOT a `plan_features` pivot table:** The feature list per plan is small (5-8 items), changes only via seeder, and is always read with the plan. A JSON column is simpler than a normalized pivot table. If gating becomes complex later (per-feature usage limits, granular tracking), normalize then.

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `resend` or `postmark` packages | SMTP already configured and working | Existing SMTP transport in `config/mail.php` |
| `d3-zoom` standalone package | Already included in `d3@7` full bundle | `import('d3').then(d3 => d3.zoom())` |
| `react-zoom-pan-pinch` / `panzoom` | Conflicts with D3's SVG coordinate system | D3's native `d3.zoom()` |
| `recharts` / `nivo` / `victory` | Second charting library for a bar chart | Existing `chart.js@4` with `type: 'bar'` |
| `react-loading-skeleton` / `react-spinners` | Over-engineered for a single loading screen | CSS animation + existing Framer Motion |
| `laravel/pennant` | Feature flag service -- overkill for plan-tier gating | Middleware checking `plan.features` JSON |
| `spatie/laravel-permission` | Role-based access -- wrong abstraction | Plan-based feature gating via middleware |
| Formspree / Basin / external form SaaS | External dependency for ~20 lines of Laravel code | `Mail::to()` with a Mailable class |
| `@tanstack/react-query` | Adds caching/fetching layer for one loading gate | Existing `useEffect` + `useState` pattern |

---

## Installation

```bash
# No new packages needed.
# Zero npm install commands.
# Zero composer require commands.

# All work is:
# - Backend: 1 Mailable class, 1 controller endpoint, 1 middleware, seeder updates
# - Frontend: loading gate in App.jsx, bar chart component, D3 zoom additions, feature gate checks
```

---

## Version Compatibility

| Package | Current Version | Feature Used | Compatibility Notes |
|---------|----------------|--------------|---------------------|
| `d3` | `^7.9.0` | `d3.zoom()` | Stable API since d3@4, no version concerns |
| `chart.js` | `^4.5.1` | `type: 'bar'` | Core chart type, included in `chart.js/auto` |
| `laravel/framework` | `^12.0` | `Illuminate\Mail`, Mailable class | Ships with framework, no extra package |
| `react` | `^19.2.4` | `useState` loading gate | Standard pattern, works on any React version |
| `framer-motion` | `^12.35.2` | `AnimatePresence` fade-out | Optional enhancement for loading screen |

---

## Summary

| Feature | New Packages | Approach | Confidence |
|---------|-------------|----------|------------|
| Contact form email | 0 | Laravel `Mailable` + `Mail::to()` | HIGH -- verified working mail infrastructure |
| D3 zoom controls | 0 | `d3.zoom()` from existing d3@7 | HIGH -- standard d3 API, same import path |
| Category bar chart | 0 | `type: 'bar'` in existing chart.js@4 | HIGH -- follows ThreatMapDonut pattern |
| Auth FOUC fix | 0 | Conditional render on `AuthContext.loading` | HIGH -- loading state already exists |
| Feature gating | 0 | Middleware + existing `plans.features` JSON | HIGH -- column and cast already in place |

---

## Sources

- `backend/config/mail.php` -- verified SMTP transport configured with Contabo host
- `backend/.env` -- confirmed `MAIL_MAILER=smtp` with working SMTP credentials
- `backend/app/Notifications/VerifyEmailWithCode.php` -- confirmed working Laravel mail (MailMessage pattern)
- `backend/app/Models/Plan.php` -- confirmed `features` JSON column with `'array'` cast (line 25)
- `backend/database/migrations/2026_03_21_000001_create_plans_table.php` -- confirmed `json('features')->nullable()` column
- `backend/app/Services/CreditResolver.php` -- confirmed plan-aware credit resolution infrastructure
- `frontend/src/contexts/AuthContext.jsx` -- confirmed `loading` state starts `true`, resolved in `finally` block (line 19, 28)
- `frontend/src/pages/ThreatSearchPage.jsx` -- confirmed D3 dynamic import with `d3.drag()` on relationship graph (line 45+)
- `frontend/src/hooks/useChartJs.js` -- confirmed generic Chart.js hook accepting any config
- `frontend/src/components/threat-map/ThreatMapDonut.jsx` -- confirmed Chart.js `chart.js/auto` import and doughnut pattern
- `frontend/package.json` -- confirmed d3@^7.9.0, chart.js@^4.5.1, framer-motion@^12.35.2
- `backend/composer.json` -- confirmed laravel/framework@^12.0 (includes illuminate/mail)
- D3 zoom documentation: https://d3js.org/d3-zoom -- stable API, part of d3 monorepo since v4
- Chart.js bar chart docs: https://www.chartjs.org/docs/latest/charts/bar.html -- core chart type

---
*Stack research for: Aqua TIP v4.0 -- Plan Overhaul & UX Polish*
*Researched: 2026-04-10*
