# Phase 19: Search History Backend - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Authenticated users can retrieve their recent search history through a dedicated API endpoint. The `search_logs` table and logging already exist — this phase adds a read endpoint only. No new tables, no write changes, no frontend work.

</domain>

<decisions>
## Implementation Decisions

### Response shape
- Minimal fields per entry: `id`, `query`, `type`, `module`, `created_at`
- Do NOT expose `ip_address` or `user_id` in the response
- Wrapped in envelope: `{ data: [...], meta: { total, limit } }`
- Consistent with existing paginated endpoints (threat-actors, threat-news)

### Result limit & filtering
- Default limit: 20 results
- Ordered by most recent first (`created_at DESC`)
- Optional `?module=` query parameter to filter by module (e.g., `?module=threat_search`)
- Valid modules: `threat_search`, `ip_search`, `dark_web`
- No pagination needed — fixed limit of 20 is sufficient for downstream consumers (dashboard widget + Threat Search history)

### Duplicate handling
- Show all entries as-is — no deduplication
- Every search is logged and returned individually with its own timestamp
- Simple, accurate audit trail

### Auth requirement
- Endpoint requires `auth:sanctum` middleware — guests receive 401
- Only returns searches for the authenticated user (WHERE user_id = auth user)

### Claude's Discretion
- Controller structure (single controller vs resource controller)
- Whether to use Eloquent query or raw query builder
- Validation approach for the optional module filter
- Test structure and coverage strategy

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing search infrastructure
- `backend/app/Models/SearchLog.php` — Model with fillable fields and User relationship
- `backend/database/migrations/2026_03_13_000002_create_search_logs_table.php` — Table schema with indexes on [user_id, created_at]
- `backend/database/migrations/2026_03_18_000001_add_type_to_search_logs_table.php` — Added type column

### How searches are logged (pattern reference)
- `backend/app/Http/Controllers/ThreatSearch/SearchController.php` — Logs with module='threat_search', type=detected_type
- `backend/app/Http/Controllers/IpSearch/SearchController.php` — Logs with module='ip_search'
- `backend/app/Http/Controllers/DarkWeb/SearchController.php` — Logs with module='dark_web'

### Route structure
- `backend/routes/api.php` — Auth group uses `auth:sanctum` middleware; new endpoint goes here

### User model
- `backend/app/Models/User.php` — Already has `searchLogs()` HasMany relationship

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SearchLog` model: Already has all fields, fillable config, and User relationship
- `User::searchLogs()`: HasMany relationship ready to query
- `[user_id, created_at]` index: Optimized for this exact query pattern (user's recent searches)

### Established Patterns
- Invokable controllers: All search controllers use `__invoke` pattern
- Route grouping: Auth routes in `middleware('auth:sanctum')` group
- Envelope response: `{ data: [...], meta: {...} }` pattern used by paginated endpoints

### Integration Points
- Route registration: `backend/routes/api.php` inside the `auth:sanctum` group
- Phase 20 consumes: Dashboard widget calls this endpoint for recent searches
- Phase 21 consumes: Threat Search page calls with `?module=threat_search` filter

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 19-search-history-backend*
*Context gathered: 2026-03-19*
