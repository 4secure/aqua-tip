# Phase 5: Dark Web Search Backend + Frontend - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Authenticated users can search for breached credentials (by email or domain) on the Dark Web page, powered by a Laravel backend proxy to an external dark web data provider API. The page is auth-only (guests redirected to /login). Searches deduct from the shared credit pool (Phase 3). Credit badge displayed on both Dark Web and IP Search pages. Does NOT include subscription/payment features or new nav items — only builds out the existing Dark Web placeholder page.

</domain>

<decisions>
## Implementation Decisions

### Search Results Display
- Card-based layout, one card per breach result — glassmorphism styled to match existing design system
- Key fields shown on each card: email, password (partially masked — first 2-3 chars + dots), source name, breach date
- Extra fields (name, phone, etc.) in a collapsible "More" section per card
- Results summary header above cards: "X breaches found for [query]" with credit badge

### Credit Badge
- Pill-style badge next to search bar, always visible (fetched on page load via GET /api/credits)
- Color shifts based on remaining: cyan (>50%), amber (<50%), red (0) — uses existing .chip CSS classes
- Updates in real-time after each search from the response credit data
- Badge appears on BOTH Dark Web page AND IP Search page (shared credit pool)

### Search Input & Flow
- Explicit Email/Domain toggle switch (not auto-detect) — user picks type before searching
- Centered layout on initial load: icon, "Dark Web Search" heading, tagline, toggle + search bar + credit badge
- After search: search bar transitions to top of page, results fill below (Google-style pattern)
- Recent queries dropdown (last 5) stored in localStorage, shown on input focus

### Error & Limit States
- Credits at 0: search bar disabled/grayed out, inline message "Daily limit reached. Your credits reset at 00:00 UTC." Credit badge shows 0/X in red
- API provider failure: red-tinted inline error card in results area with "Something went wrong" + Retry button. Message: "No credit was deducted."
- No results (valid query, zero breaches): green success card — "No breaches found for [query]. [query] appears safe in known data breaches." Credit IS deducted for successful zero-result searches
- Invalid query: client-side validation before submission (valid email format or domain format based on toggle)

### Backend Proxy
- POST /api/dark-web/search endpoint — accepts { query, type } where type is "email" or "domain"
- Applies deduct-credit middleware (same as IOC search)
- Proxies to external dark web data provider API server-side — API key in .env, never exposed to frontend
- If provider returns error: refund the deducted credit before returning error response to frontend
- Response includes breach data + credit info (remaining, limit, resets_at)

### Authentication
- Dark Web page requires authentication — unauthenticated users redirected to /login
- No guest access at all (unlike IP Search which is public)

### Claude's Discretion
- Exact card styling, spacing, and responsive grid layout
- Search bar transition animation (centered to top)
- Loading skeleton/spinner during search
- Toggle switch component design
- Recent queries dropdown styling
- Credit refund implementation approach (try/catch around provider call)
- Retry button behavior (re-submit same query)
- Backend validation and error response format

</decisions>

<specifics>
## Specific Ideas

- Centered-to-top search transition mirrors Google's search UX — familiar pattern for search-heavy pages
- Partially masked passwords (e.g., "pa******") let users recognize their own passwords without full exposure to shoulder-surfing
- Green "safe" card for zero results reinforces AQUA TIP's security-focused branding — positive reassurance
- Credit badge on both Dark Web and IP Search creates a consistent "credits are shared" mental model

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DarkWebPage.jsx`: Placeholder page ready to replace with full implementation
- `apiClient` (api/client.js): HTTP client with CSRF handling — add dark-web API functions
- `DeductCredit` middleware: Already built, just apply to new route
- `CreditStatusController`: GET /api/credits endpoint already exists
- `.chip-cyan`, `.chip-amber`, `.chip-red` CSS classes: Ready-made pill styles for credit badge
- `IocDetectorService`: Pattern for input type detection (reference, though this phase uses explicit toggle)
- `SearchController` + `MockThreatDataService`: Reference pattern for search endpoint structure

### Established Patterns
- Invokable single-action controllers for endpoints
- Form request validation classes
- Credit info included in search response: `{ data, credits: { remaining, limit, resets_at } }`
- 429 response format: `{ message, remaining, limit, resets_at, is_guest }`
- Glassmorphism cards: `bg-surface/60 border border-border backdrop-blur-sm rounded-xl`
- Centered auth page layouts with ParticleBackground (reference for centered initial state)

### Integration Points
- `routes/api.php`: Add POST /api/dark-web/search route with auth + deduct-credit middleware
- `DarkWebPage.jsx`: Replace placeholder with full search page
- `IocSearchPage.jsx`: Add credit badge component (shared with Dark Web page)
- `api/`: New dark-web.js API functions file
- `backend/.env`: Add dark web provider API key
- `backend/config/services.php`: Register provider API config

</code_context>

<deferred>
## Deferred Ideas

- **IP Search backend wiring**: IP Search page still uses mock data — connecting it to a real API is a separate phase
- **Per-module credit costs**: Dark web search could cost more credits than IP search — defer until pricing model is decided
- **Export/download results**: Allow users to export breach results as CSV/PDF — future feature
- **Saved searches / monitoring**: Alert users when new breaches appear for a saved query — separate phase

</deferred>

---

*Phase: 05-dark-web-search-backend-frontend*
*Context gathered: 2026-03-13*
