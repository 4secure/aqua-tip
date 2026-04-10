# Feature Landscape

**Domain:** Threat Intelligence Platform - v4.0 Plan Overhaul & UX Polish
**Researched:** 2026-04-10
**Overall confidence:** HIGH

## Table Stakes

Features users expect. Missing = product feels incomplete or broken.

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| Auth FOUC fix (loading screen until auth resolves) | Users see flash of login/unauthenticated UI before auth state loads; every SPA with cookie-based auth must handle this | Low | `AuthContext.jsx`, `App.jsx`, `ProtectedRoute.jsx` | AuthContext already has `loading` state -- the gap is that `AppLayout` and public-with-auth-awareness routes (pricing, threat-search) do not gate on it. A single `AuthGate` wrapper around `<Routes>` that shows a full-screen spinner while `loading === true` solves this globally |
| Plan seeder with new pricing/credits | Pricing page shows stale plans; credit system uses old limits | Low | `PlanSeeder.php`, `CreditResolver.php` | updateOrCreate pattern already in place. Change slug values, daily_credit_limit, price_cents, features arrays. CreditResolver constants (TRIAL_DAILY_LIMIT) need updating to match new Trial=10/day |
| "Fetching data" loading states replacing connection errors | Showing "Connection lost" when data is simply loading confuses users and signals instability | Low | All pages that fetch from API | Pattern: check `loading` before `error` in render logic; show skeleton/spinner during fetch, only show error after fetch failure |
| Dashboard renamed to Threat Map | URL is `/dashboard` but feature is a threat map; naming mismatch confuses navigation | Low | `Sidebar.jsx`, `Topbar.jsx`, breadcrumbs, page titles | Text-only changes across ~5 files. Keep `/dashboard` URL for backward compat, update display labels only |
| Breadcrumb capitalization | Inconsistent casing in breadcrumbs looks unprofessional | Low | Breadcrumb rendering in layout components | Single utility: capitalize first letter of each segment |
| Settings profile middle alignment | Visual alignment issue on settings page | Low | `SettingsPage.jsx` | CSS adjustment -- likely `max-w-2xl mx-auto` or equivalent centering |

## Differentiators

Features that set the product apart. Not expected by default, but valued by target users.

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| Free plan feature gating (threat search only) | Converts free users to paid by restricting access to Threat Map, Actors, News, Dark Web -- standard SaaS conversion lever | Medium | `AuthContext`, `ProtectedRoute.jsx`, `Sidebar.jsx`, backend plan data | **Implementation pattern:** Server returns `user.plan.allowed_features` array (or use slug-based check). Frontend `FeatureGate` component wraps routes/UI, shows upgrade prompt when feature is blocked. Do NOT use feature flag service (overkill for 4 tiers with static features). Simple slug-based check: `plan.slug === 'free' ? block : allow`. Gate at both route level (redirect to /pricing with message) and sidebar level (lock icons on restricted nav items). Backend should also enforce -- reject API calls from free-tier users to gated endpoints |
| Enterprise contact form sending email | Enterprise buyers expect "Contact Sales" to actually reach someone; broken CTA = lost enterprise leads | Medium | Laravel Mail, SMTP config, `PricingPage.jsx` | Build a `ContactUsForm` component with name/email/company/message fields. Backend endpoint `POST /api/contact` validates input, dispatches a Mailable to a configured `CONTACT_EMAIL` env var. Use Laravel's built-in Mail facade with SMTP. Rate-limit to 3/hour per IP to prevent abuse |
| Category bar chart in dashboard right panel | Donut chart alone is hard to read with 5+ categories; bar chart gives precise comparison at a glance | Medium | `RightOverlayPanel.jsx`, `useChartJs.js`, existing `ThreatMapDonut.jsx` | Add a horizontal bar chart below the donut. Chart.js `type: 'bar'` with `indexAxis: 'y'` for horizontal layout. Use same `TYPE_COLORS` mapping. Both charts coexist -- donut for proportion overview, bar for exact counts |
| Threat News category-only chart with side labels | Current stacked area chart is information-dense; a simpler category-only view with side labels improves scannability | Medium | `CategoryDistributionChart.jsx`, `ThreatNewsPage.jsx` | Replace stacked area chart with horizontal bar chart showing total counts per category. "Side labels" means category names on the y-axis (left side) with bars extending right. Chart.js horizontal bar with `indexAxis: 'y'`. Remove hourly bucketing -- aggregate total counts per category |
| D3 relationship tab zoom in/out | Graphs with many nodes become unreadable without zoom; users expect interactive graph exploration | Medium | `D3Graph` component in `ThreatSearchPage.jsx`, d3-zoom module | D3's `d3.zoom()` behavior attaches to the SVG, applies transform to a `<g>` container. Current code appends elements directly to SVG -- need to wrap in a `<g>` group and apply zoom transform there. Add +/- button controls and scroll-wheel zoom |
| Pricing page auth-aware routing | Pricing should show with sidebar when logged in, standalone when logged out -- consistent navigation context | Low-Med | `App.jsx` router config, `PricingPage.jsx` | Currently pricing is a standalone route outside AppLayout. Render inside AppLayout when authenticated, standalone when not. Create an `AuthAwareLayout` or use conditional route rendering |
| Top icon navigation (Threat Map for auth, Landing for unauth) | Logo/icon should navigate to contextually correct home page | Low | `Sidebar.jsx`, `Topbar.jsx` | Conditional `to` prop: `isAuthenticated ? '/dashboard' : '/'` |
| Landing page smooth animations and immediate globe render | First impression matters; delayed or janky globe degrades perceived quality | Low-Med | `Globe.jsx`, `LandingPage.jsx`, Framer Motion | Globe already uses `memo` and DPR capping. Focus on removing any initial delay -- ensure globe canvas renders before scroll animations trigger |

## Anti-Features

Features to explicitly NOT build for v4.0.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Per-feature flag service (LaunchDarkly, Flagsmith) | Only 4 static tiers with unchanging feature sets -- a flag service adds latency, cost, and complexity for zero benefit | Simple slug-based checks in a `canAccess(planSlug, feature)` utility function |
| Real payment processing (Stripe) | No validated demand yet; premature integration adds PCI scope and maintenance burden | Keep "Contact Sales" for Enterprise, plan selection modal for others. Add Stripe in a future milestone when there are paying users |
| Feature-level granularity (e.g., Dark Web for Pro only) | PROJECT.md explicitly marks this out of scope; credit gating is simpler and already works | Use tier-level gating (free vs paid) not feature-level. All paid tiers get all features, differentiated by credit limits |
| WebSocket for real-time updates | SSE relay already works, browser EventSource handles reconnect | Keep SSE pattern |
| Complex chart library migration (Recharts, Nivo) | Chart.js already handles donut + line + bar. Switching mid-milestone adds risk with no UX improvement | Extend Chart.js usage with `type: 'bar'` and `indexAxis: 'y'` |
| Email drip campaigns for trial expiry | Requires email marketing infrastructure, unsubscribe handling, CAN-SPAM compliance | Keep in-app trial countdown banners (already built) |
| Full zoom/pan with minimap for D3 | Minimap is overkill for relationship graphs with <50 nodes typical | Simple zoom with +/- buttons and scroll-wheel zoom via d3.zoom() |
| Third-party email service SDK (SendGrid, Mailgun) | Laravel's built-in SMTP transport handles contact form emails without adding dependencies | Use `MAIL_*` env vars with SMTP transport |

## Feature Dependencies

```
Plan Seeder Update ─────────────────┐
                                    v
CreditResolver Update ──────> Free Plan Feature Gating ──────> Pricing Auth-Aware Routing
                                    │
                                    v
                              Sidebar Lock Icons
                              (visual indicators of gated features)

Auth FOUC Fix ──────> Pricing Auth-Aware Routing
                      (must know auth state before deciding layout)

Enterprise Contact Form (independent -- needs SMTP config only)

D3 Zoom Controls (independent -- pure frontend, d3-zoom already bundled)

Category Bar Chart - Dashboard (independent -- extends existing Chart.js donut)

Category Bar Chart - Threat News (independent -- modifies existing CategoryDistributionChart)

Dashboard Rename (independent -- text changes only)

Breadcrumb Capitalization (independent)

Settings Alignment (independent)

Loading States Fix (independent -- per-page pattern)

Landing Page Polish (independent -- pure frontend)

Top Icon Navigation (independent -- conditional link target)
```

## Implementation Details for Key Features

### Auth FOUC Fix

The AuthContext already tracks `loading` state (line 18 of AuthContext.jsx). The ProtectedRoute already gates on `loading` (lines 7-13 of ProtectedRoute.jsx). The problem is that routes outside ProtectedRoute (pricing, threat-search, AppLayout itself) render immediately without waiting for auth resolution.

**Solution:** Wrap the entire `<Routes>` block in App.jsx with an auth gate:

```jsx
// In App.jsx, inside AuthProvider but before Routes
function AuthGate({ children }) {
  const { loading } = useAuth();
  if (loading) return <FullScreenSpinner />;
  return children;
}
```

This is a ~10-line change. No new dependencies. Every route gets auth state before first render. The existing `LazyFallback` spinner component can be reused.

**Confidence:** HIGH -- this is the standard React SPA pattern for cookie-based auth. Auth0, Clerk, and Firebase Auth docs all recommend gating on auth loading state before rendering routes.

### Free Plan Feature Gating

**Server-side:** Add middleware that checks the user's plan slug before allowing access to gated endpoints (dashboard, threat-actors, threat-news, dark-web). Return 403 with a JSON body containing an upgrade message for free-tier users. The existing CreditResolver already loads the plan relationship, so the middleware can reuse that.

**Client-side:** Create a `canAccessFeature(planSlug, featureKey)` utility that maps plan slugs to feature access:

```
Free:       threat-search only
Trial:      all features (time-limited)
Basic:      all features
Pro:        all features
Enterprise: all features + API access (future)
```

Sidebar shows lock icons on restricted items for free-tier users. Route-level `FeatureGate` component redirects to /pricing with `?upgrade=true` query param.

**Confidence:** HIGH -- slug-based gating is the standard approach for small SaaS products. No external service needed.

### D3 Zoom Controls

Current D3Graph component (ThreatSearchPage.jsx lines 36-139) renders directly to SVG without zoom. The fix:

1. Create a `<g>` wrapper inside the SVG for all graph content
2. Apply `d3.zoom()` to the SVG element, transforming the `<g>` group
3. Add UI buttons (+/-/reset) positioned absolutely over the graph container
4. Set `scaleExtent([0.3, 3])` to limit zoom range

```javascript
const g = svg.append('g');
const zoom = d3.zoom()
  .scaleExtent([0.3, 3])
  .on('zoom', (event) => g.attr('transform', event.transform));
svg.call(zoom);
// Move all node/link/label appends from svg to g
```

Button controls call `svg.transition().call(zoom.scaleBy, 1.3)` for zoom in, `zoom.scaleBy, 0.7` for zoom out. Reset calls `zoom.transform, d3.zoomIdentity`.

**Confidence:** HIGH -- d3-zoom is the canonical approach, well-documented, and already bundled with the d3 package the project dynamically imports.

### Category Bar Chart (Dashboard Right Panel)

Add a horizontal bar chart component below the existing `ThreatMapDonut` in the right overlay panel. Uses the same `typeCounts` data prop.

```javascript
{
  type: 'bar',
  data: { labels, datasets: [{ data, backgroundColor: colors }] },
  options: {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: 'rgba(30,32,48,0.125)' }, ticks: { color: '#5A6173' } },
      y: { grid: { display: false }, ticks: { color: '#E8EAED', font: { family: 'Outfit', size: 11 } } },
    },
  },
}
```

New file: `components/threat-map/ThreatMapBarChart.jsx`. Follows the same pattern as `ThreatMapDonut.jsx` (direct Chart.js import, useRef for canvas, useEffect for updates).

**Confidence:** HIGH -- Chart.js horizontal bar is a well-documented standard feature. Same lazy-loading pattern already used in the codebase.

### Threat News Category Chart Redesign

Replace the stacked area chart (`CategoryDistributionChart.jsx`) with a horizontal bar chart showing total report counts per category. Remove hourly bucketing logic (`bucketByHourAndCategory`). Aggregate total counts per category name.

Side labels = category names on the y-axis with bars extending right. Maintains click-to-filter behavior (clicking a bar filters the news list by that category).

**Confidence:** HIGH -- simplification of existing component, not new functionality.

### Enterprise Contact Form

Simple form: name, email, company name, message (all required). Renders in a modal triggered from the Enterprise plan card's "Contact Sales" button on the pricing page.

Backend `POST /api/contact` endpoint:
- Validates input (name, email, company, message -- all required, email must be valid)
- Dispatches a `ContactInquiry` Mailable to `CONTACT_EMAIL` env var
- Rate-limited to 3 requests per hour per IP
- Returns 200 with success message

Uses Laravel Mail with SMTP transport. No external SDK needed. Railway supports SMTP environment variables (`MAIL_MAILER=smtp`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`).

**Confidence:** HIGH -- Laravel Mail is well-established. SMTP is the simplest delivery method.

### Pricing Page Auth-Aware Routing

Currently `/pricing` is a standalone route (line 58 of App.jsx) outside AppLayout. When logged in, users lose the sidebar context.

**Solution:** Define pricing route in two places -- once standalone (for guests) and once inside AppLayout (for authenticated users):

```jsx
{/* Guest pricing -- no sidebar */}
<Route path="/pricing" element={
  isAuthenticated ? <Navigate to="/app-pricing" replace /> : <PricingPage />
} />

{/* Auth pricing -- with sidebar */}
<Route element={<AppLayout />}>
  <Route path="/app-pricing" element={<PricingPage />} />
</Route>
```

Alternative (simpler): Make PricingPage detect auth state and conditionally render its own layout wrapper. This avoids duplicate routes but couples layout logic into the page.

Best approach: Use a `ConditionalLayout` wrapper component that renders AppLayout children when authenticated, bare content when not. Single route, clean separation.

**Confidence:** MEDIUM -- multiple valid approaches; the ConditionalLayout pattern is cleanest but requires testing with sidebar collapse state.

## MVP Recommendation (v4.0 Phase Ordering)

**Phase 1 -- Foundational (unblock everything else):**
1. Auth FOUC fix -- fixes broken UX affecting every page load
2. Plan seeder + CreditResolver update -- new tier structure must exist before gating
3. Dashboard rename to Threat Map -- naming consistency

**Phase 2 -- Core conversion feature:**
4. Free plan feature gating (backend middleware + frontend FeatureGate + sidebar lock icons)
5. Pricing page auth-aware routing

**Phase 3 -- Chart and visualization improvements:**
6. Category bar chart in dashboard right panel
7. Threat News category-only chart with side labels
8. D3 zoom controls
9. Fix missing observable counts in Threat Database widget

**Phase 4 -- Contact and communication:**
10. Enterprise contact form with email delivery

**Phase 5 -- UI polish:**
11. "Fetching data" loading states
12. Settings alignment
13. Breadcrumb capitalization
14. Top icon navigation
15. Landing page smooth animations and globe render

**Rationale:** Auth FOUC and plan structure are prerequisites. Feature gating is the milestone's core value prop. Charts and D3 are independent improvements. Contact form needs SMTP setup. Polish is last because it's lowest risk and no dependencies.

## Sources

- [Feature gating without duplicating components - DEV Community](https://dev.to/aniefon_umanah_ac5f21311c/feature-gating-how-we-built-a-freemium-saas-without-duplicating-components-1lo6)
- [What is feature gating - Orb](https://www.withorb.com/blog/feature-gating)
- [Auth FOUC in protected routes - Auth0 Community](https://community.auth0.com/t/content-flash-in-protected-route-with-react-hoc/122741)
- [d3-zoom official documentation](https://d3js.org/d3-zoom)
- [D3 zoom and pan in depth](https://www.d3indepth.com/zoom-and-pan/)
- [Two ways to build zoomable D3 + React - Swizec](https://swizec.com/blog/the-two-ways-to-build-a-zoomable-dataviz-component-with-d3zoom-and-react/)
- [SaaS pricing page best practices 2026 - PipelineRoad](https://pipelineroad.com/agency/blog/saas-pricing-page-best-practices)
- [20 best SaaS pricing page examples - Webstacks](https://www.webstacks.com/blog/saas-pricing-page-design)
- [Chart.js doughnut documentation](https://www.chartjs.org/docs/latest/charts/doughnut.html)
- [D3 network graphs with zoom - AntStack](https://www.antstack.com/blog/leveling-up-your-d3-network-graphs-from-simple-canvas-to-interactive-powerhouse/)
- Codebase: `AuthContext.jsx`, `ProtectedRoute.jsx`, `App.jsx`, `D3Graph` in `ThreatSearchPage.jsx`, `ThreatMapDonut.jsx`, `CategoryDistributionChart.jsx`, `PlanSeeder.php`, `CreditResolver.php`, `PricingPage.jsx`

---
*Feature research for: AQUA TIP v4.0 Plan Overhaul & UX Polish*
*Researched: 2026-04-10*
