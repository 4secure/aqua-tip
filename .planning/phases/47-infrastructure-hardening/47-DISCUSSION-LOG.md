# Phase 47: Infrastructure Hardening - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-11
**Phase:** 47-infrastructure-hardening
**Areas discussed:** HSTS placement, CSP policy scope, Path traversal strategy, Debug route handling

---

## HSTS Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Nginx only (Recommended) | add_header in nginx.conf — covers all responses including static files, PHP errors, and 404s. Industry standard placement for HSTS. | ✓ |
| Both Nginx + middleware | Belt-and-suspenders: Nginx sets it on every response, middleware also sets it on PHP responses. Redundant but maximally safe. | |
| Middleware only | Add to existing SecurityHeaders.php — simpler to manage in code, but misses non-PHP responses (Nginx-served errors, static files). | |

**User's choice:** Nginx only (Recommended)
**Notes:** None

---

## CSP Policy Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Strict API-only (Recommended) | default-src 'none'; frame-ancestors 'none' — API returns JSON only, so block everything. Most secure for a pure API backend. | ✓ |
| Moderate with self | default-src 'self'; script-src 'none'; frame-ancestors 'none' — allows same-origin resources in case any HTML error pages are served. | |
| Skip CSP on backend | Only add CSP to the frontend Express server later. API responses are JSON — CSP is less meaningful here. | |

**User's choice:** Strict API-only (Recommended)
**Notes:** None

---

## Path Traversal Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Nginx only (Recommended) | Block at Nginx with a location rule returning 403 for any URI containing '..'. Requests never reach PHP. Simple, effective, standard approach. | ✓ |
| Nginx + Laravel middleware | Block at Nginx AND add a Laravel middleware that rejects path traversal. Defense-in-depth: if Nginx config is ever misconfigured, Laravel still blocks it. | |
| Nginx + Laravel + test | Both layers plus a Pest test that confirms path traversal returns 403. Maximum assurance with automated regression protection. | |

**User's choice:** Nginx only (Recommended)
**Notes:** None

---

## Debug Route Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Delete routes only (Recommended) | Remove the two route definitions from web.php. Simple, direct. Future debug routes would be caught by code review. | ✓ |
| Delete + Nginx block /debug-* | Remove routes AND add an Nginx location rule blocking any /debug-* path with 403. Prevents future accidental exposure even if a developer adds a debug route. | |
| Delete + .env gate pattern | Remove routes AND add a convention: any debug route must check APP_DEBUG=true. Document this pattern for future developers. | |

**User's choice:** Delete routes only (Recommended)
**Notes:** None

---

## Claude's Discretion

- Exact Nginx location block syntax for path traversal rule
- Whether to add CSP and HSTS in a single add_header block or spread across location contexts
- Order of Nginx directives

## Deferred Ideas

None — discussion stayed within phase scope
