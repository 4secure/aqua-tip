---
phase: 05-dark-web-search-backend-frontend
verified: 2026-03-13T19:00:00Z
status: human_needed
score: 14/14 must-haves verified
re_verification: false
requirements_note: >
  DARKWEB-01 through DARKWEB-06 are referenced in plan frontmatter but NOT defined
  in REQUIREMENTS.md. REQUIREMENTS.md traceability maps RATE-04, RATE-05, FEND-05
  to Phase 5, but no plan in this phase claims them -- they are ORPHANED.
human_verification:
  - test: "Navigate to /dark-web while logged in. Verify centered layout with heading, tagline, toggle, search bar, and credit badge."
    expected: "Centered vertical layout with 'Dark Web Search' heading, incognito icon, email/domain toggle, search input, and CreditBadge pill."
    why_human: "Visual layout and animation cannot be verified programmatically."
  - test: "Search an email address and observe the layout transition and results."
    expected: "Search bar moves to top (sticky), results appear below as glassmorphism cards with email, masked password, source, breach date. If no API key set, 502 error card with Retry button appears."
    why_human: "Framer Motion layout animation and visual card rendering need visual inspection."
  - test: "Navigate to /ip-search and verify CreditBadge is visible near the search bar."
    expected: "CreditBadge pill showing remaining/total credits appears next to the IOC search button."
    why_human: "Visual placement verification."
  - test: "Test recent queries: search twice, then focus the input to see dropdown."
    expected: "Dropdown appears below input showing last queries with type chips, clickable to re-search."
    why_human: "Focus/blur interaction and dropdown behavior need manual testing."
---

# Phase 5: Dark Web Search Backend + Frontend Verification Report

**Phase Goal:** Authenticated users can search for breached data (by email or domain) on the Dark Web page, powered by a Laravel proxy to the dark web data provider API, with credit-based rate limiting and a persistent credit badge
**Verified:** 2026-03-13T19:00:00Z
**Status:** human_needed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

#### Plan 01 (Backend)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | POST /api/dark-web/search with valid auth + email query returns breach results and deducts a credit | VERIFIED | Test passes: "dark web search with auth and valid email returns 200 with breach data". Controller calls DarkWebProviderService, returns data + credits payload. |
| 2 | POST /api/dark-web/search without auth returns 401 | VERIFIED | Test passes: "dark web search without auth returns 401". Route inside auth:sanctum group (api.php line 44). |
| 3 | POST /api/dark-web/search with zero credits returns 429 with resets_at | VERIFIED | Test passes: "dark web search with zero credits returns 429 with resets_at". Handled by deduct-credit middleware. |
| 4 | When dark web provider API fails, credit is refunded and 502 returned with 'No credit was deducted' | VERIFIED | Test passes: "dark web search provider failure returns 502 and refunds credit". SearchController.php lines 23-35 implement try/catch with DB::increment refund. |
| 5 | Provider API key is never exposed in any response | VERIFIED | API key only used in DarkWebProviderService.php for HTTP header. Config reads from env('DARK_WEB_API_KEY'). No response serializes the key. |

#### Plan 02 (Frontend)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 6 | Dark Web page shows centered search with heading, tagline, email/domain toggle, search bar, and credit badge on initial load | VERIFIED | DarkWebPage.jsx lines 147-263: min-h-[60vh] centered layout with heading, tagline, toggle buttons, input, CreditBadge component. |
| 7 | After searching, search bar transitions to top and results appear below as glassmorphism cards | VERIFIED | DarkWebPage.jsx: motion.div with layout prop switches className from centered to sticky top. BreachCard renders bg-surface/60 glassmorphism cards. |
| 8 | Each breach card shows email, masked password, source name, breach date -- with collapsible More section for extra fields | VERIFIED | BreachCard.jsx: FieldRow renders Mail/KeyRound/Database/Calendar rows. Collapsible section (lines 52-81) shows username, name, phone when present. |
| 9 | Credit badge shows remaining/total with color coding: cyan >50%, amber <50%, red at 0 | VERIFIED | CreditBadge.jsx: ratio calculation, chip-red/chip-amber/chip-cyan class selection. |
| 10 | When credits are 0, search bar is disabled with 'Daily limit reached' message and reset time | VERIFIED | DarkWebPage.jsx lines 142-143: isExhausted check disables input/button. Lines 259-263: amber message "Daily limit reached. Your credits reset at 00:00 UTC." |
| 11 | Provider failure shows red error card with 'No credit was deducted' and Retry button | VERIFIED | DarkWebPage.jsx lines 92-96: 502 sets error with refunded=true. Lines 289-320: red card with AlertTriangle icon and RotateCcw Retry button. |
| 12 | Zero results shows green success card with 'appears safe' message | VERIFIED | DarkWebPage.jsx lines 323-344: green card with ShieldCheck icon, "No breaches found" + "appears safe" text. |
| 13 | Credit badge appears on both Dark Web page and IP Search page | VERIFIED | DarkWebPage.jsx line 255: CreditBadge rendered. IocSearchPage.jsx line 117: CreditBadge rendered. Both import from shared/CreditBadge and fetch credits on mount. |
| 14 | Recent queries (last 5) stored in localStorage and shown as dropdown on input focus | VERIFIED | DarkWebPage.jsx: STORAGE_KEY='darkweb_recent_queries', MAX_RECENT=5, saveRecentQuery with dedup. Dropdown rendered lines 218-236 with onFocus/onBlur handlers. |

**Score:** 14/14 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/app/Services/DarkWebProviderService.php` | External API proxy with timeout, retry, normalization, password masking | VERIFIED | 72 lines. Http::withHeaders, timeout(10), retry(2, 500), normalizeResults(), maskPassword(). |
| `backend/app/Http/Controllers/DarkWeb/SearchController.php` | Invokable controller with try/catch credit refund | VERIFIED | 61 lines. __invoke method, try/catch with DB::increment refund, SearchLog::create. |
| `backend/app/Http/Requests/DarkWebSearchRequest.php` | Form request with conditional email/domain validation | VERIFIED | 48 lines. Rules for query+type, withValidator after-hook with filter_var and regex. |
| `backend/tests/Feature/DarkWeb/DarkWebSearchTest.php` | Pest tests covering auth, success, empty, provider error, 429, masking | VERIFIED | 253 lines. 11 tests, all passing (43 assertions). |
| `frontend/src/api/dark-web.js` | API functions for searchDarkWeb and fetchCredits | VERIFIED | 9 lines. Both functions export correctly using apiClient. |
| `frontend/src/components/shared/CreditBadge.jsx` | Reusable pill badge with color-coded remaining/total | VERIFIED | 11 lines. Named export, chip classes, ratio-based color selection. |
| `frontend/src/components/shared/BreachCard.jsx` | Glassmorphism card with collapsible More section | VERIFIED | 85 lines. FieldRow helper, extraFields computation, useState toggle, chevron icons. |
| `frontend/src/pages/DarkWebPage.jsx` | Full search page with centered-to-top transition | VERIFIED | 377 lines. All states implemented: initial, loading (skeleton), results, error, empty, exhausted. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| backend/routes/api.php | DarkWeb\SearchController | Route::post with auth:sanctum + deduct-credit | WIRED | Line 44: `Route::post('/dark-web/search', DarkWebSearchController::class)->middleware('deduct-credit');` inside auth:sanctum group. |
| SearchController | DarkWebProviderService | app(DarkWebProviderService::class)->search() | WIRED | Line 19: `app(DarkWebProviderService::class)->search(...)` |
| SearchController | credits table | DB::table('credits')->increment on failure | WIRED | Lines 25-27: `DB::table('credits')->where('id', $credit->id)->increment('remaining')` |
| DarkWebPage.jsx | /api/dark-web/search | searchDarkWeb() from api/dark-web.js | WIRED | Line 77: `await searchDarkWeb({ query: q, type: t })` |
| DarkWebPage.jsx | CreditBadge | import and render with remaining/limit props | WIRED | Line 6: import, line 255: `<CreditBadge remaining={credits.remaining} limit={credits.limit} />` |
| IocSearchPage.jsx | CreditBadge | import and render with credit data | WIRED | Line 4: import CreditBadge, line 5: import fetchCredits, line 88: useEffect fetches, line 117: renders. |
| App.jsx | DarkWebPage | lazy import + ProtectedRoute | WIRED | Line 21: lazy import, line 66: Route inside ProtectedRoute wrapper. |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| DARKWEB-01 | 05-01 | Backend proxy endpoint | VERIFIED | POST /api/dark-web/search endpoint implemented and tested. Note: NOT defined in REQUIREMENTS.md. |
| DARKWEB-02 | 05-01 | Credit deduction and refund | VERIFIED | deduct-credit middleware + try/catch refund. Note: NOT defined in REQUIREMENTS.md. |
| DARKWEB-03 | 05-02 | Frontend search page | VERIFIED | DarkWebPage.jsx fully implemented. Note: NOT defined in REQUIREMENTS.md. |
| DARKWEB-04 | 05-02 | Breach result cards | VERIFIED | BreachCard.jsx with glassmorphism styling. Note: NOT defined in REQUIREMENTS.md. |
| DARKWEB-05 | 05-01, 05-02 | Credit badge | VERIFIED | CreditBadge on both pages. Note: NOT defined in REQUIREMENTS.md. |
| DARKWEB-06 | 05-01, 05-02 | Error states | VERIFIED | 401, 422, 429, 502 all handled backend and frontend. Note: NOT defined in REQUIREMENTS.md. |
| RATE-04 | ORPHANED | Guest rate limit "Sign in for more lookups" CTA | NOT CLAIMED | REQUIREMENTS.md maps to Phase 5 but no plan claims it. |
| RATE-05 | ORPHANED | Signed-in "Daily limit reached" message | PARTIAL | DarkWebPage shows this for dark web search, but RATE-05 likely intended for IOC search page. No plan claims it. |
| FEND-05 | ORPHANED | /ioc-search publicly accessible but rate-limited | NOT CLAIMED | Route is public (App.jsx line 60), but credit badge was added without a plan claiming this requirement. No plan claims it. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | - | - | - | No anti-patterns detected. No TODOs, FIXMEs, placeholders, or empty implementations found in any phase files. |

### Human Verification Required

### 1. Visual Layout and Animation

**Test:** Navigate to /dark-web while logged in. Observe the initial centered layout, then search to see the transition animation.
**Expected:** Centered layout with heading/icon animates smoothly to sticky top bar. Framer Motion layout prop drives the transition.
**Why human:** CSS layout, animation smoothness, and visual design cannot be verified programmatically.

### 2. Breach Card Rendering

**Test:** Search with an email that has breach results (requires DARK_WEB_API_KEY in .env). Inspect card layout.
**Expected:** Glassmorphism cards in 1-col mobile / 2-col desktop grid. Each card shows email, masked password, source, date. Extra fields toggle works.
**Why human:** Visual card rendering, glassmorphism effect, responsive grid need visual inspection.

### 3. CreditBadge on IP Search Page

**Test:** Navigate to /ip-search and verify CreditBadge placement.
**Expected:** Credit badge pill visible near the search bar area with correct remaining/total.
**Why human:** Visual placement relative to existing UI elements.

### 4. Recent Queries Dropdown

**Test:** Perform 2+ searches on /dark-web, then focus the input field.
**Expected:** Dropdown appears showing recent queries with type chips. Clicking a query re-submits it.
**Why human:** Focus/blur interaction timing and dropdown click registration depend on browser behavior.

### 5. Error State Without API Key

**Test:** With no DARK_WEB_API_KEY set, search on /dark-web.
**Expected:** Red error card showing "Something went wrong. No credit was deducted." with Retry button. Credit badge should NOT decrease.
**Why human:** End-to-end flow across frontend and backend with real HTTP requests.

### Gaps Summary

All 14 observable truths are verified. All 8 artifacts exist, are substantive, and are properly wired. All key links are connected. No anti-patterns found. 11/11 backend tests pass. Frontend builds cleanly.

**Requirements documentation gap (non-blocking):** The DARKWEB-01 through DARKWEB-06 requirement IDs used in plan frontmatter are not defined in REQUIREMENTS.md. Additionally, REQUIREMENTS.md maps RATE-04, RATE-05, and FEND-05 to Phase 5 but no plan in this phase claims them. This is a documentation/traceability issue, not a code issue. The actual success criteria from the roadmap are all met.

**Status: human_needed** because visual layout, Framer Motion animations, and end-to-end browser interaction cannot be verified programmatically. All automated checks pass.

---

_Verified: 2026-03-13T19:00:00Z_
_Verifier: Claude (gsd-verifier)_
