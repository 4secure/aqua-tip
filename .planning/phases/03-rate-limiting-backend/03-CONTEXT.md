# Phase 3: Rate Limiting Backend - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Credit-based rate limiting system for the IOC search endpoint (and future modules). Guests get 1 credit/day (by IP), authenticated users get 10 credits/day (by user ID). Credits are a single shared pool across all rate-limited modules. Includes the IOC search backend endpoint returning mock data, a credits check endpoint, and a credit deduction middleware. Database-backed with lazy midnight UTC reset.

</domain>

<decisions>
## Implementation Decisions

### Credit System Model
- Single shared credit pool (not per-module) — 10 credits/day for authenticated, 1/day for guests
- Credits stored in a `credits` database table keyed by user_id (authenticated) or IP address (guests, user_id null)
- Lazy reset on access: check if last reset was before today's midnight UTC, if so reset to full credits — no cron needed
- Guest credit rows auto-purged after 7 days via scheduled artisan command
- Separate `search_logs` table records usage history: user_id/ip, module, query, timestamp

### Credit Deduction
- Implemented as middleware (`deduct-credit`) applied to any rate-limited route
- Middleware works for both guests and authenticated users on the same route
- New modules just add the middleware — no credit logic in controllers

### IOC Search Endpoint
- POST /api/ioc/search with single `query` field — backend auto-detects indicator type (IP, domain, hash, URL) via regex
- Returns mock threat data server-side (moves mock from frontend to backend so rate limit is enforced server-side)
- Every successful response includes credit info: `{ data: {...}, credits: { remaining: 9, limit: 10, resets_at: ... } }`

### Credits Check Endpoint
- GET /api/credits — returns `{ remaining, limit, resets_at }` for proactive frontend display
- Works for both guests (by IP) and authenticated users (by user ID)

### Rate Limit Response (429)
- Rich JSON: `{ message, remaining: 0, limit, resets_at, is_guest: bool }`
- Same structure for guests and authenticated — different message text
- Guest: "Sign in for more lookups" with `is_guest: true`
- Authenticated: "Daily limit reached"

### Guest Identification
- Laravel's `$request->ip()` with trusted proxy support
- Authenticated users always keyed by user ID only (shared across all devices/sessions)

### Trial Period Foundation
- Add `trial_ends_at` column to users table (set to created_at + 30 days on registration)
- Credit middleware checks `trial_ends_at` but does NOT enforce blocking yet — still grants credits if expired
- Full enforcement deferred to subscription phase

### Claude's Discretion
- IOC type detection regex patterns
- Mock data structure and content
- Credit middleware implementation details
- Search logs table schema
- Test structure and assertion granularity

</decisions>

<specifics>
## Specific Ideas

- Credit system designed to be extensible — future dark web search module will use the same credit pool and middleware
- The `is_guest` flag in 429 responses lets Phase 5 frontend show different CTAs without extra logic

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `RateLimiter::for('auth', ...)` pattern in AppServiceProvider — established approach for rate limiting
- Sanctum `auth:sanctum` middleware — determines authenticated vs guest on optional-auth routes
- Pest test framework with Origin header pattern for Sanctum stateful API tests

### Established Patterns
- Invokable single-action controllers (RegisterController, LoginController, etc.)
- Form request validation classes for input validation
- Cookie-based Sanctum SPA auth (not token-based)
- Route grouping by middleware in api.php

### Integration Points
- `routes/api.php`: Add IOC search route, credits route
- `AppServiceProvider`: May register credit-related rate limiter
- `database/migrations/`: New credits and search_logs tables
- `app/Http/Middleware/`: New DeductCredit middleware
- `bootstrap/app.php`: Register middleware alias

</code_context>

<deferred>
## Deferred Ideas

- **30-day trial → paid subscription system**: After trial expires, user must purchase a plan for credits and module access. Needs subscription models, plan tiers, payment integration, billing UI — its own phase after current milestone.
- **Dark web search module**: Will use the same credit pool and deduct-credit middleware. Separate phase for the search functionality itself.
- **OAuth users setting a password**: Carried from Phase 2 — future settings feature.
- **Per-module credit costs**: Weighted credits (e.g., dark web = 3 credits) — defer until multiple modules exist and costs differ.

</deferred>

---

*Phase: 03-rate-limiting-backend*
*Context gathered: 2026-03-13*
