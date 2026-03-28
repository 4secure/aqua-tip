# Technology Stack

**Project:** Aqua TIP v3.2 — App Layout Page Tweaks
**Researched:** 2026-03-28
**Scope:** Stack additions for date filtering, auto-refresh, time-series charts, enriched modals, and functional settings

## Recommendation: Zero New Dependencies

The v3.2 features do NOT require any new npm packages or Composer packages. Every capability maps to existing stack or browser-native APIs. This continues the project's established pattern of minimizing dependencies (v2.1, v3.0, v3.1 all shipped with zero new deps).

## Feature-to-Stack Mapping

### 1. Date-Based Filtering (Threat News)

| Need | Solution | Why |
|------|----------|-----|
| Date selector UI | Native `<input type="date">` | Zero bundle cost, works in all modern browsers. Simple from/to range, not a complex calendar widget. |
| Dark mode styling | `[color-scheme:dark]` CSS property on input | Makes native date picker render dark in Chromium and Firefox. Combine with existing `input-field` class. |
| Date formatting for API | `Date` constructor + `toISOString()` | Already used throughout codebase. |
| Date display | Existing `useFormatDate` hook | Already timezone-aware via `Intl.DateTimeFormat`. |

**Why NOT react-datepicker (v9.1.0, 40KB+):** A full calendar widget is overkill for a simple date range filter. The native HTML date input styled with `[color-scheme:dark]` matches the dark theme. If a custom calendar is later needed, revisit then.

### 2. Auto-Refresh (Threat News + Threat Actors)

| Need | Solution | Why |
|------|----------|-----|
| 5-minute polling | `setInterval` + `useEffect` cleanup | Standard React pattern. Both pages already use `useCallback` for `loadData`. |
| Tab visibility pause | `document.visibilityState` check inside interval | Prevents wasted API calls when tab is hidden. Native browser API. |
| Refresh indicator | Existing `RotateCcw` icon from lucide-react | Already imported in both pages. Add `animate-spin` class during refresh. |
| Countdown timer | `useState` counter, decrement with 1-second interval | Simple state, no library needed. |

**Pattern:**
```jsx
useEffect(() => {
  const id = setInterval(() => {
    if (document.visibilityState === 'visible') loadData();
  }, 5 * 60 * 1000);
  return () => clearInterval(id);
}, [loadData]);
```

**Why NOT TanStack Query / react-query:** Would require refactoring ALL data fetching across the app. Overkill when only 2 pages need polling. The existing fetch-in-useEffect pattern is consistent across the codebase.

### 3. Time-Series Category Chart (Threat News)

| Need | Solution | Why |
|------|----------|-----|
| Line chart over time | Chart.js 4.5.1 (already installed) | `useChartJs` hook already exists and is used on DashboardPage and SettingsPage. |
| X-axis with dates | **Category axis with string labels** | Backend returns pre-aggregated daily buckets (`{ date: "Mar 25", malware: 12, phishing: 8 }`). No date adapter needed. |
| Multiple category lines | Multi-dataset Chart.js config | Each category is a dataset with its own color. Standard Chart.js pattern. |
| Chart rendering | Existing `useChartJs` hook | Same pattern as other pages. |

**Why NOT chartjs-adapter-date-fns (v3.0.0) + date-fns (v4.1.0):** The time scale adapter is needed when Chart.js must auto-compute axis tick intervals from raw timestamps. Here, the backend pre-buckets data by day, so a category x-axis with formatted date strings works identically. Avoids adding ~130KB of dependencies.

**If time scale is later needed:** `npm install date-fns@^4.1.0 chartjs-adapter-date-fns@^3.0.0` and `import 'chartjs-adapter-date-fns'` in the chart hook. But defer until a concrete need arises.

### 4. Enriched Threat Actor Modals

| Need | Solution | Why |
|------|----------|-----|
| TTPs, tools, sectors, campaigns | New Laravel endpoint expanding OpenCTI GraphQL query | Existing `Http::withToken()` + caching pattern. No new PHP packages. |
| Tabbed modal UI | Existing glassmorphism modal + tab state | ThreatActorsPage already has a detail modal. Add tabs with `useState`. |
| MITRE ATT&CK TTP display | Structured list with IDs | Format: `T1566 - Phishing`. Data from OpenCTI `attack-pattern` relationships. |

**Backend approach:** New `/api/threat-actors/{id}/details` endpoint fetches:
- `uses` relationships to `Attack-Pattern` (TTPs)
- `uses` relationships to `Tool` and `Malware`
- `targets` relationships to `Identity` (sectors)
- Related `Campaign` entities

Uses existing `Http` client, Bearer token auth, and 15-minute caching pattern.

### 5. Functional Settings/Profile Page

| Need | Solution | Why |
|------|----------|-----|
| Read user data | Existing `useAuth` context | Already exposes user object with name, email, organization, role, timezone, plan. |
| Update profile | New `PUT /api/profile` endpoint | Standard Laravel validation + `$user->update()`. Sanctum auth. |
| Change password | New `POST /api/password` endpoint | `Hash::check()` for old password, `Hash::make()` for new. |
| Form state | `useState` per field | At most 6 editable fields. No form library needed. |
| Success/error feedback | Inline banner with existing chip classes | `chip-green` for success, `chip-red` for error. Existing design system. |

**Why NOT react-hook-form or formik:** 5-6 fields max. Form libraries add value at 10+ fields with complex cross-field validation. `useState` per field is the pattern used everywhere in this codebase.

### 6. Dashboard Stat Card Expansion

| Need | Solution | Why |
|------|----------|-----|
| 3 new stat cards (Email, Crypto Wallet, URL) | Extend `STAT_CARD_CONFIG` array | Add 3 entries. Backend already returns counts for all observable types. |
| "Threat Database" heading | JSX markup | Pure UI change. |
| Remove Live label/dot | Delete JSX | Pure UI change. |

### 7. Threat Map Capping

| Need | Solution | Why |
|------|----------|-----|
| Cap to 100 IPs | Backend GraphQL `first: 100` or `LIMIT 100` | Existing SSE/snapshot endpoint. |
| "100 Latest Attacks" label | JSX text swap | Pure UI change. |

### 8. Threat Search Bug Fixes

| Need | Solution | Why |
|------|----------|-----|
| Graph node positioning | Adjust D3 force simulation params | D3 7.9.0 already installed. Tune `forceCenter`, `forceCollide`. |
| Search loader | Existing loading state pattern | Already in component. |
| Z-index when logged out | Tailwind `z-` class fix | CSS-only. |

## Stack Summary: No Changes Required

| Category | Current | Change | Rationale |
|----------|---------|--------|-----------|
| **Frontend framework** | React 19.2.4 + Vite 7.3.1 | None | Sufficient for all features |
| **Styling** | Tailwind CSS 3.4.19 | None | `[color-scheme:dark]` for native date inputs |
| **Charts** | Chart.js 4.5.1 | None | Category axis with string labels for time-series |
| **Visualization** | D3 7.9.0 | None | Fix force simulation params |
| **Maps** | Leaflet 1.9.4 | None | Backend caps query, no map changes |
| **Animation** | Framer Motion 12.35.2 | None | Existing modal animations |
| **Icons** | Lucide React 0.577.0 | None | All icons available (Calendar, RefreshCw, etc.) |
| **Routing** | React Router DOM 7.13.1 | None | No new routes |
| **Backend** | Laravel 12 + Sanctum 4 | None | New endpoints only |
| **Database** | PostgreSQL | None | No schema changes for these features |
| **Date handling** | Native `Intl.DateTimeFormat` | None | `useFormatDate` hook + `<input type="date">` |

## New Backend Endpoints Needed

| Endpoint | Method | Auth | Purpose | Cache |
|----------|--------|------|---------|-------|
| `PUT /api/profile` | PUT | Sanctum | Update name, organization, role, timezone | None |
| `POST /api/password` | POST | Sanctum | Change password (old + new) | None |
| `GET /api/threat-actors/{id}/details` | GET | Public | Enriched actor: TTPs, tools, sectors, campaigns | 15min |
| `GET /api/threat-news/timeline` | GET | Public | Category distribution by date for chart | 5min |

No new migrations needed. Profile uses existing `users` columns. Threat data from OpenCTI GraphQL.

## Alternatives Considered

| Feature | Recommended | Alternative | Why Not Alternative |
|---------|-------------|-------------|---------------------|
| Date picker | Native `<input type="date">` | react-datepicker v9.1.0 | 40KB+ for simple date range. Native with dark scheme is sufficient. |
| Time axis | Category axis + string labels | chartjs-adapter-date-fns v3.0.0 + date-fns v4.1.0 | ~130KB for auto-ticking. Backend pre-aggregates, so strings work. |
| Auto-refresh | `setInterval` + visibility API | TanStack Query v5 | Requires refactoring all data fetching. Overkill for 2 pages. |
| Form handling | `useState` per field | react-hook-form v7 | 5-6 fields. Library adds complexity without benefit at this scale. |
| State management | Existing AuthContext | Zustand/Redux | No new cross-component state needs. |
| Refresh UI | Spinning `RotateCcw` icon | Toast notifications | Already have the icon imported. Toast library would be a new dep. |

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `react-datepicker` | Heavyweight for a date range filter | Native `<input type="date">` with `[color-scheme:dark]` |
| `date-fns` / `dayjs` | No date manipulation beyond what `Date` and `Intl` provide | Native `Date` + `Intl.DateTimeFormat` (existing `useFormatDate`) |
| `chartjs-adapter-date-fns` | Backend pre-aggregates data; category axis is sufficient | String labels on Chart.js category axis |
| `react-query` / `TanStack Query` | Only 2 pages need auto-refresh; refactoring all fetches is disproportionate | `setInterval` + `document.visibilityState` |
| `react-hook-form` / `formik` | Settings page has 5-6 fields max | `useState` per field |
| `@tanstack/react-table` | No complex table needs | Existing HTML tables with Tailwind |
| Any toast library | Inline feedback banners are sufficient for settings | Existing chip/banner CSS classes |

## Installation

```bash
# No new packages to install.
# Backend: create new controller methods and routes
# Frontend: modify existing page components

# Zero npm install commands needed
# Zero composer require commands needed
```

## Confidence Assessment

| Claim | Confidence | Basis |
|-------|------------|-------|
| Native date input with `[color-scheme:dark]` works | HIGH | CSS standard, well-supported in Chromium/Firefox/Safari |
| Chart.js category axis handles date strings | HIGH | Existing working pattern in DashboardPage, official docs |
| `setInterval` + `visibilityState` sufficient for auto-refresh | HIGH | Standard browser APIs, used across industry |
| No new packages needed | HIGH | Each feature maps to existing stack or native APIs |
| chartjs-adapter-date-fns v3.0.0 is latest | MEDIUM | NPM shows v3.0.0, stable but last published ~3 years ago |
| date-fns v4.1.0 is latest | MEDIUM | NPM shows v4.1.0, last published ~2 years ago |
| Lucide has Calendar/RefreshCw icons | HIGH | Already importing from lucide-react across pages |

## Sources

- [Chart.js Time Series Axis](https://www.chartjs.org/docs/latest/axes/cartesian/timeseries.html) — time scale docs (considered and deferred)
- [Chart.js Time Cartesian Axis](https://www.chartjs.org/docs/latest/axes/cartesian/time.html) — date adapter requirements
- [chartjs-adapter-date-fns on npm](https://www.npmjs.com/package/chartjs-adapter-date-fns) — v3.0.0, compatible with Chart.js 4.x
- [date-fns on npm](https://www.npmjs.com/package/date-fns) — v4.1.0
- [react-datepicker on npm](https://www.npmjs.com/package/react-datepicker) — v9.1.0, considered and rejected
- [React DayPicker](https://react-day-picker.js.org/) — alternative date picker, also rejected
- Existing codebase: `useChartJs.js`, `useFormatDate.js`, `DashboardPage.jsx`, `ThreatNewsPage.jsx`, `ThreatActorsPage.jsx`, `SettingsPage.jsx`, `package.json`, `composer.json`

---
*Stack research for: Aqua TIP v3.2 -- App Layout Page Tweaks*
*Researched: 2026-03-28*
