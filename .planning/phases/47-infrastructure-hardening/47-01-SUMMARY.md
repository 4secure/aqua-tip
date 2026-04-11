---
phase: 47-infrastructure-hardening
plan: 01
subsystem: infra
tags: [nginx, security-headers, hsts, csp, path-traversal, cors]

requires: []
provides:
  - "Hardened Nginx config blocking path traversal, restricting PHP-FPM, hiding version, restricting methods, adding HSTS/CSP headers"
affects: [deployment, api-security]

tech-stack:
  added: []
  patterns: ["nginx add_header inheritance — repeat headers in if blocks"]

key-files:
  created: []
  modified: ["backend/docker/nginx.conf"]

key-decisions:
  - "Complete rewrite of nginx.conf rather than incremental edits to avoid partial-config risk"
  - "CSP set to default-src 'none' since backend is API-only (no resource loading needed)"
  - "Security headers repeated in OPTIONS block due to nginx add_header inheritance trap"

patterns-established:
  - "Nginx security headers: always repeat in child if/location blocks that have any add_header"

requirements-completed: [INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, INFRA-06, INFRA-07]

duration: 3min
completed: 2026-04-11
---

# Plan 47-01: Nginx Hardening Summary

**Hardened nginx.conf with path traversal block, single-entrypoint PHP-FPM, version hiding, method restriction, HSTS, and CSP headers**

## Performance

- **Duration:** 3 min
- **Tasks:** 2 (rewrite + validation)
- **Files modified:** 1

## Accomplishments
- Blocked path traversal attacks — any URI containing `..` returns 403
- Restricted PHP-FPM to `/index.php` only — no arbitrary `.php` execution
- Hidden server version header
- Restricted HTTP methods to GET/POST/PUT/DELETE/OPTIONS/PATCH
- Added HSTS with max-age=31536000 and includeSubDomains
- Added strict CSP (default-src 'none'; frame-ancestors 'none')
- Capped request body at 2M (down from 20M)

## Task Commits

1. **Task 1: Rewrite nginx.conf** - `e49aad0` (fix)
2. **Task 2: Validate structure** - verified inline (no separate commit needed)

## Files Created/Modified
- `backend/docker/nginx.conf` - Complete rewrite with all 7 INFRA requirements

## Decisions Made
- Complete rewrite rather than incremental edits to avoid partial-config deployment risk
- CSP set to `default-src 'none'` since this is an API-only backend
- Security headers repeated inside CORS OPTIONS block to prevent nginx add_header inheritance loss

## Deviations from Plan
None - plan executed exactly as written

## Issues Encountered
None

## User Setup Required
None - no external service configuration required. Changes take effect on next Railway deployment.

## Next Phase Readiness
- Nginx hardened and ready for deployment
- All 7 INFRA requirements (01-07) implemented in a single cohesive config

---
*Phase: 47-infrastructure-hardening*
*Completed: 2026-04-11*
