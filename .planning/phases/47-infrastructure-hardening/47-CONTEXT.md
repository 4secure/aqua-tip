# Phase 47: Infrastructure Hardening - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Lock down the Nginx layer to block path traversal attacks (confirmed LFI), remove unauthenticated debug endpoints, enforce security headers (HSTS, CSP), restrict HTTP methods, hide server version, and cap request body size. All changes target `backend/docker/nginx.conf`, `backend/app/Http/Middleware/SecurityHeaders.php`, and `backend/routes/web.php`.

</domain>

<decisions>
## Implementation Decisions

### HSTS Placement
- **D-01:** HSTS header (`Strict-Transport-Security: max-age=31536000; includeSubDomains`) added in Nginx only — NOT in SecurityHeaders middleware. Nginx covers all responses including static files, errors, and non-PHP paths.

### Content-Security-Policy
- **D-02:** Strict API-only CSP: `default-src 'none'; frame-ancestors 'none'`. The backend is a pure JSON API — block all resource loading. Add via Nginx `add_header` alongside HSTS.

### Path Traversal Blocking
- **D-03:** Block at Nginx only with a location rule returning 403 for any URI containing `..`. No Laravel middleware defense-in-depth layer. Requests with path traversal never reach PHP.

### Debug Route Removal
- **D-04:** Delete `/my-ip` and `/debug-opencti` route definitions from `routes/web.php`. No additional Nginx-level `/debug-*` blocking pattern. No `.env` gate convention.

### Straightforward Items (no discussion needed)
- **D-05:** `server_tokens off` — single directive in nginx.conf
- **D-06:** `client_max_body_size 2M` — replace current 20M value
- **D-07:** Restrict HTTP methods to GET, POST, PUT, DELETE, OPTIONS, PATCH — Nginx `if` block returning 405 for others
- **D-08:** Restrict `fastcgi_script_name` to `/index.php` only — harden the PHP location block

### Claude's Discretion
- Exact Nginx location block syntax for path traversal rule
- Whether to add CSP and HSTS in a single `add_header` block or spread across location contexts
- Order of Nginx directives

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Infrastructure
- `backend/docker/nginx.conf` — Current Nginx config (no security hardening, client_max_body_size 20M, open PHP location)
- `backend/app/Http/Middleware/SecurityHeaders.php` — Existing middleware with 4 headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy)
- `backend/bootstrap/app.php` — SecurityHeaders middleware registered globally via `$middleware->append()`
- `backend/routes/web.php` — Contains debug routes `/my-ip` and `/debug-opencti` marked "temporary"
- `backend/Dockerfile` — Container build context
- `backend/docker/start.sh` — Container startup script

### Requirements
- `.planning/REQUIREMENTS.md` §v5.0 Infrastructure (INFRA) — INFRA-01 through INFRA-08

### Roadmap
- `.planning/ROADMAP.md` §Phase 47 — Success criteria (5 items)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SecurityHeaders` middleware: Already globally registered, handles 4 security headers. HSTS and CSP will NOT be added here (Nginx handles them per D-01/D-02), but middleware stays as-is for its existing headers.

### Established Patterns
- Nginx config at `backend/docker/nginx.conf` — deployed via Docker on Railway
- Middleware registered globally in `bootstrap/app.php` via `$middleware->append()`
- CORS preflight already handled at Nginx level (OPTIONS check in location /)

### Integration Points
- `nginx.conf` is the sole Nginx config — all changes go here
- `routes/web.php` is where debug routes live — direct deletion
- Railway deployment picks up Docker changes on push to GitHub

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

*Phase: 47-infrastructure-hardening*
*Context gathered: 2026-04-11*
