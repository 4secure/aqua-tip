# Phase 48: API Security - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Protect API endpoints against unauthorized access (IDOR), abuse (rate limiting), and information leakage (error sanitization, response stripping). All changes are backend-only: controllers, middleware, service provider, migrations, and tests.

</domain>

<decisions>
## Implementation Decisions

### IDOR Fix (Dark-Web Task Ownership)
- **D-01:** Create a `dark_web_tasks` table storing `task_id` + `user_id` when a dark-web search starts. The status endpoint checks ownership before proxying to the provider.
- **D-02:** Non-owner access returns 403 Forbidden with a generic message (not 404).

### Rate Limiting
- **D-03:** Single named rate limiter `api-search` (30 requests/min) applied to `/ip-search`, `/threat-search`, and `/credits`. Defined in `AppServiceProvider` following the existing `RateLimiter::for('auth', ...)` pattern.
- **D-04:** Rate limiter identifies requesters by user ID (authenticated) or IP address (guests) — matches existing credit system pattern.
- **D-05:** OAuth redirect endpoint (`/auth/{provider}/redirect`) gets tighter rate limiting: 10/min per IP.
- **D-06:** Email verification resend keeps existing `throttle:6,1` (6/min) but adds a per-day cap of 20/day.

### Error Sanitization
- **D-07:** `EnrichmentController` and `HealthController` return fixed generic messages on OpenCTI failure ("Service temporarily unavailable"). Full exception details logged server-side via `Log::error()` with context.
- **D-08:** No error codes — just generic human-readable messages. Keep it simple.

### Response Stripping
- **D-09:** Controller whitelists only the fields the frontend needs before returning search responses. No API Resource class — explicit field picking in the controller keeps it simple and visible.

### Claude's Discretion
- Exact migration schema for `dark_web_tasks` table (columns, indexes)
- Which fields to whitelist in threat search response (inspect what frontend actually uses)
- Exact `Log::error()` context payload structure
- Whether to define `api-search` and `oauth-redirect` as separate `RateLimiter::for()` calls or combine

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### API Routes & Controllers
- `backend/routes/api.php` — All API route definitions, existing throttle middleware usage
- `backend/app/Http/Controllers/DarkWeb/SearchController.php` — Dark-web search + status endpoint (IDOR target)
- `backend/app/Http/Controllers/ThreatSearch/SearchController.php` — Threat search controller (response stripping target)
- `backend/app/Http/Controllers/ThreatActor/EnrichmentController.php` — Leaks `$e->getMessage()` (error sanitization target)
- `backend/app/Http/Controllers/OpenCti/HealthController.php` — Leaks exception message on 503 (error sanitization target)

### Rate Limiting Pattern
- `backend/app/Providers/AppServiceProvider.php` — Existing `RateLimiter::for('auth', ...)` definition (pattern to follow)

### Services
- `backend/app/Services/DarkWebProviderService.php` — External provider integration (task ID source)
- `backend/app/Services/ThreatSearchService.php` — Returns data array that needs field stripping

### Requirements
- `.planning/REQUIREMENTS.md` §v5.0 API Security (API) — API-01 through API-07
- `.planning/ROADMAP-v5.md` §Phase 48 — Success criteria (5 items)

### Prior Phase Context
- `.planning/phases/47-infrastructure-hardening/47-CONTEXT.md` — Nginx-level security decisions (HSTS, CSP, path traversal handled there)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `RateLimiter::for('auth', ...)` in AppServiceProvider: Established pattern for defining named rate limiters with per-email + per-IP dual limits
- `throttle:` middleware: Already in use on auth routes and email verification — same middleware applies to new endpoints
- `SearchLog` model: Exists for tracking searches, could inform dark_web_tasks table design

### Established Patterns
- Rate limiting defined in `AppServiceProvider::boot()` using `RateLimiter::for()`
- Credit system uses `$request->user()?->id` for auth, `$request->ip()` for guests — same pattern for rate limiter key
- Error handling uses try/catch with `OpenCtiConnectionException` and `OpenCtiQueryException` custom exceptions
- Controllers return `response()->json()` with consistent payload shapes

### Integration Points
- `routes/api.php` line 43: OAuth redirect needs `->middleware('throttle:oauth-redirect')`
- `routes/api.php` lines 86-92: Search and credit routes need `->middleware('throttle:api-search')`
- `DarkWeb\SearchController::__invoke()`: Must store task_id + user_id after successful search start
- `DarkWeb\SearchController::status()`: Must check ownership before proxying

</code_context>

<specifics>
## Specific Ideas

No specific requirements — user chose recommended (standard) approaches for all decisions.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 48-api-security*
*Context gathered: 2026-04-11*
