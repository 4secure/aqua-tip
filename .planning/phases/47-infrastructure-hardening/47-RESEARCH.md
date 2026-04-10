# Phase 47: Infrastructure Hardening - Research

**Researched:** 2026-04-11
**Domain:** Nginx security hardening, HTTP security headers, Laravel route cleanup
**Confidence:** HIGH

## Summary

Phase 47 targets the Nginx layer of a Laravel 11 API backend running inside a Docker container (`php:8.3-fpm-alpine` with Nginx installed via apk). All eight INFRA requirements are achievable through edits to exactly two files: `backend/docker/nginx.conf` (7 requirements) and `backend/routes/web.php` (1 requirement -- debug route deletion). The SecurityHeaders middleware is left untouched per user decision D-01/D-02.

The most critical finding is the **Nginx `add_header` inheritance trap**: when any `add_header` directive appears in a child `location` block, ALL parent-level `add_header` directives are silently dropped. The current config already uses `add_header` in the CORS preflight `if` block inside `location /`, which means security headers added at the `server` level will NOT appear on OPTIONS responses unless explicitly repeated. This is the single biggest pitfall for this phase.

**Primary recommendation:** Add all security headers (`HSTS`, `CSP`, `server_tokens off`) and all blocking rules (path traversal, method restriction, fastcgi lockdown) in the `server` block of nginx.conf, then repeat headers inside the existing CORS `if` block to prevent inheritance loss.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** HSTS header (`Strict-Transport-Security: max-age=31536000; includeSubDomains`) added in Nginx only -- NOT in SecurityHeaders middleware.
- **D-02:** Strict API-only CSP: `default-src 'none'; frame-ancestors 'none'`. Added via Nginx `add_header` alongside HSTS.
- **D-03:** Block path traversal at Nginx only with a location rule returning 403 for any URI containing `..`. No Laravel middleware.
- **D-04:** Delete `/my-ip` and `/debug-opencti` route definitions from `routes/web.php`. No Nginx-level blocking pattern.
- **D-05:** `server_tokens off` -- single directive in nginx.conf
- **D-06:** `client_max_body_size 2M` -- replace current 20M value
- **D-07:** Restrict HTTP methods to GET, POST, PUT, DELETE, OPTIONS, PATCH -- Nginx `if` block returning 405 for others
- **D-08:** Restrict `fastcgi_script_name` to `/index.php` only -- harden the PHP location block

### Claude's Discretion
- Exact Nginx location block syntax for path traversal rule
- Whether to add CSP and HSTS in a single `add_header` block or spread across location contexts
- Order of Nginx directives

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INFRA-01 | Nginx rejects all requests containing `..` path sequences (returns 403) | Location block with regex match on `\.\.` before other location blocks |
| INFRA-02 | Nginx restricts fastcgi_script_name to /index.php only | Change `~ \.php$` location to `= /index.php` exact match |
| INFRA-03 | Nginx hides server version header (server_tokens off) | Single directive in server block |
| INFRA-04 | Nginx restricts HTTP methods to GET, POST, PUT, DELETE, OPTIONS, PATCH | `if` block in `location /` returning 405 for disallowed methods |
| INFRA-05 | Nginx adds HSTS header (max-age=31536000, includeSubDomains) | `add_header` in server block with `always` flag; must repeat in CORS if block |
| INFRA-06 | Nginx client_max_body_size reduced from 20M to 2M | Change value in server block |
| INFRA-07 | Content-Security-Policy header configured for API backend | `add_header` in server block with `always` flag; must repeat in CORS if block |
| INFRA-08 | Debug routes /my-ip and /debug-opencti removed from routes/web.php | Delete lines 10-42 from web.php |
</phase_requirements>

## Standard Stack

No new libraries or packages are required. All changes use existing Nginx directives and Laravel route definitions.

| Tool | Version | Purpose | Notes |
|------|---------|---------|-------|
| Nginx | 1.26.x-1.28.x (Alpine apk) | Web server / reverse proxy | Already installed in Docker image |
| PHP-FPM | 8.3 | FastCGI process manager | Already installed |
| Laravel | 11 | PHP framework | Routes file only |

## Architecture Patterns

### Current Nginx Config Structure
```
server {
    listen 8080;
    server_name _;
    root /var/www/public;
    index index.php;
    client_max_body_size 20M;        # <-- change to 2M

    location / {                      # <-- add method restriction here
        if ($request_method = 'OPTIONS') {  # <-- must repeat headers here
            # CORS headers...
            return 204;
        }
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {              # <-- replace with exact match /index.php
        fastcgi_pass 127.0.0.1:9000;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* { # hidden files block
        deny all;
    }
}
```

### Recommended Final Structure
```
server {
    listen 8080;
    server_name _;
    root /var/www/public;
    index index.php;

    # --- INFRA-03: Hide server version ---
    server_tokens off;

    # --- INFRA-06: Cap request body ---
    client_max_body_size 2M;

    # --- INFRA-05 + INFRA-07: Security headers (server level) ---
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Content-Security-Policy "default-src 'none'; frame-ancestors 'none'" always;

    # --- INFRA-01: Block path traversal ---
    location ~* /\.\. {
        return 403;
    }

    # --- Main location ---
    location / {
        # --- INFRA-04: Restrict HTTP methods ---
        if ($request_method !~ ^(GET|POST|PUT|DELETE|OPTIONS|PATCH)$) {
            return 405;
        }

        # CORS preflight
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' 'https://tip.aquasecure.ai' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'Content-Type, X-Requested-With, X-XSRF-TOKEN, Accept, Authorization' always;
            add_header 'Access-Control-Allow-Credentials' 'true' always;
            add_header 'Access-Control-Max-Age' '3600';
            # MUST repeat security headers -- inheritance is lost
            add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
            add_header Content-Security-Policy "default-src 'none'; frame-ancestors 'none'" always;
            return 204;
        }

        try_files $uri $uri/ /index.php?$query_string;
    }

    # --- INFRA-02: Only allow /index.php through FastCGI ---
    location = /index.php {
        fastcgi_pass 127.0.0.1:9000;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    # Block hidden files
    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

### Anti-Patterns to Avoid
- **Adding headers at server level only and expecting inheritance:** Child `location` or `if` blocks with ANY `add_header` directive will silently drop ALL parent headers. MUST repeat headers in the CORS `if` block.
- **Using `~ \.php$` for FastCGI:** This allows any `.php` file to be executed. Use `= /index.php` exact match to restrict to the single entry point.
- **Placing path traversal block after `location /`:** The `~*` regex location must come before `location /` in processing order. Nginx processes `=` exact matches first, then `^~` prefix, then regex `~`/`~*` in config order, then plain prefix. The `~*` block will match before the prefix `/` block.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Path traversal blocking | Custom PHP middleware checking `..` in path | Nginx `location ~* /\.\. { return 403; }` | Blocks at network edge; request never reaches PHP; zero performance cost |
| HSTS headers | Laravel middleware header injection | Nginx `add_header` with `always` flag | Covers non-PHP responses (static files, error pages, Nginx-generated 4xx/5xx) |
| Method restriction | Laravel middleware checking method | Nginx `if` block with `$request_method` | Rejects before any PHP processing |

## Common Pitfalls

### Pitfall 1: add_header Inheritance Loss (CRITICAL)
**What goes wrong:** Security headers defined at `server` level silently disappear on OPTIONS responses because the CORS `if` block uses its own `add_header` directives.
**Why it happens:** Nginx's `add_header` module does not inherit from parent contexts when the current context defines ANY `add_header` directive. This is documented Nginx behavior, not a bug.
**How to avoid:** Repeat HSTS and CSP headers inside the CORS `if` block alongside the existing CORS headers.
**Warning signs:** HSTS/CSP headers present on GET responses but missing on OPTIONS responses. Test with `curl -I -X OPTIONS`.

### Pitfall 2: Path Traversal Regex Not Matching Encoded Dots
**What goes wrong:** Attacker sends `%2e%2e` (URL-encoded `..`) which bypasses literal `..` matching.
**Why it happens:** Nginx normalizes standard `%2F` (slash) but the `..` sequences are decoded BEFORE location matching in most configurations. However, double-encoding (`%252e%252e`) could bypass.
**How to avoid:** Use `~*` case-insensitive match on `/\.\.\` which catches the decoded form. Laravel's `$realpath_root` in the fastcgi_param also helps -- even if a traversal reaches PHP, `realpath()` resolves symlinks and `..` before building the path. The combination of Nginx blocking + `$realpath_root` provides defense in depth.
**Warning signs:** Test with both `curl 'https://host/../../etc/passwd'` and `curl 'https://host/%2e%2e/%2e%2e/etc/passwd'`.

### Pitfall 3: `location = /index.php` Breaking try_files
**What goes wrong:** After changing from `~ \.php$` to `= /index.php`, the `try_files` fallback to `/index.php?$query_string` must still route to the FastCGI block.
**Why it happens:** `try_files` performs an internal redirect to `/index.php?...` which is then matched against location blocks. The `= /index.php` exact match WILL catch this internal redirect because `=` matches check the URI before the query string.
**How to avoid:** This actually works correctly -- `= /index.php` matches the URI `/index.php` regardless of query string. No special handling needed. Just verify with a test request.
**Warning signs:** 404 errors on any application route after the change.

### Pitfall 4: Route Cache After Deleting Debug Routes
**What goes wrong:** Debug routes remain accessible after deleting them from `web.php` because `start.sh` runs `php artisan route:cache` on deploy.
**Why it happens:** Route cache is built at deploy time. If the old cached routes are somehow retained, deleted routes would still respond.
**How to avoid:** This is a non-issue for this project because `start.sh` runs `route:cache` fresh on every deploy. The new code with deleted routes will be cached correctly. No extra step needed.
**Warning signs:** None expected -- the existing deploy flow handles this.

### Pitfall 5: `always` Flag Omission on add_header
**What goes wrong:** Security headers only appear on 2xx responses, not on 4xx/5xx error pages.
**Why it happens:** Without the `always` flag, `add_header` only applies to responses with status codes 200, 201, 204, 206, 301, 302, 303, 304, 307, 308.
**How to avoid:** Always use `add_header ... always;` for security headers.
**Warning signs:** Headers missing on 404 or 500 responses.

## Code Examples

### INFRA-01: Path Traversal Block
```nginx
# Place BEFORE location / in the server block
# Matches any URI containing ".." (case-insensitive)
location ~* /\.\. {
    return 403;
}
```

### INFRA-02: Restrict FastCGI to index.php Only
```nginx
# Replace: location ~ \.php$ {
# With exact match -- only /index.php is passed to PHP-FPM
location = /index.php {
    fastcgi_pass 127.0.0.1:9000;
    fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
    include fastcgi_params;
}
```

### INFRA-04: HTTP Method Restriction
```nginx
# Inside location / block, before CORS handling
if ($request_method !~ ^(GET|POST|PUT|DELETE|OPTIONS|PATCH)$) {
    return 405;
}
```

### INFRA-08: Debug Route Deletion
```php
// DELETE these blocks from routes/web.php:

// Lines 10-11: /my-ip route
// Route::get('/my-ip', fn () => file_get_contents('https://ifconfig.me'));

// Lines 13-42: /debug-opencti route
// Route::get('/debug-opencti', function () { ... });
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None (no test infrastructure exists per CLAUDE.md) |
| Config file | None |
| Quick run command | Manual curl commands against deployed service |
| Full suite command | Manual curl verification script |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFRA-01 | `..` in URL returns 403 | smoke | `curl -s -o /dev/null -w "%{http_code}" https://api.tip.aquasecure.ai/../../etc/passwd` | N/A - manual |
| INFRA-02 | Arbitrary .php returns 404 | smoke | `curl -s -o /dev/null -w "%{http_code}" https://api.tip.aquasecure.ai/test.php` | N/A - manual |
| INFRA-03 | No Server header in response | smoke | `curl -sI https://api.tip.aquasecure.ai/ \| grep -i "^server:"` (should be empty) | N/A - manual |
| INFRA-04 | TRACE method returns 405 | smoke | `curl -s -o /dev/null -w "%{http_code}" -X TRACE https://api.tip.aquasecure.ai/` | N/A - manual |
| INFRA-05 | HSTS header present | smoke | `curl -sI https://api.tip.aquasecure.ai/ \| grep -i strict-transport` | N/A - manual |
| INFRA-06 | Body > 2M rejected | smoke | `curl -s -o /dev/null -w "%{http_code}" -X POST -d @/dev/zero --max-time 5 https://api.tip.aquasecure.ai/api/test` | N/A - manual |
| INFRA-07 | CSP header present | smoke | `curl -sI https://api.tip.aquasecure.ai/ \| grep -i content-security-policy` | N/A - manual |
| INFRA-08 | Debug routes return 404 | smoke | `curl -s -o /dev/null -w "%{http_code}" https://api.tip.aquasecure.ai/my-ip` | N/A - manual |

### Sampling Rate
- **Per task commit:** Visual diff review of nginx.conf changes
- **Per wave merge:** Full curl verification against production after Railway deploy
- **Phase gate:** All 8 curl checks pass on production URL

### Wave 0 Gaps
None -- no test framework to set up. All verification is manual curl-based smoke testing against the deployed service. This is appropriate because: (1) Nginx config changes cannot be tested locally without Docker, (2) the project has no existing test infrastructure, and (3) these are infrastructure-level checks that require a running server.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `location ~ \.php$` (all PHP files) | `location = /index.php` (single entry point) | Best practice for years | Eliminates arbitrary PHP execution |
| No `always` flag on add_header | `always` flag mandatory for security headers | Nginx 1.7.5+ (2014) | Headers on error responses too |
| Per-location header repetition | `add_header_inherit merge;` directive | Nginx 1.29.3 (2025) | Solves inheritance -- but Alpine may not have this version yet |

**Note on `add_header_inherit`:** Nginx 1.29.3+ introduced `add_header_inherit merge;` which fixes the inheritance problem. However, Alpine's apk Nginx package is likely 1.26.x-1.28.x. Do NOT rely on this feature -- use the manual repetition approach instead.

## Open Questions

1. **Exact Nginx version on Alpine**
   - What we know: Alpine's apk installs Nginx 1.26.x-1.28.x range
   - What's unclear: Exact version in the deployed container
   - Recommendation: Not blocking -- all directives used are available since Nginx 1.7.5+. The `add_header_inherit` feature (1.29.3+) is nice-to-have but NOT needed.

2. **Railway HTTPS termination**
   - What we know: Railway terminates SSL and forwards HTTP to the container on port 8080
   - What's unclear: Whether Railway adds its own `Server` header after Nginx strips it
   - Recommendation: `server_tokens off` removes Nginx's version. If Railway adds its own header, that is outside this phase's scope. Verify after deploy.

## Sources

### Primary (HIGH confidence)
- [Nginx ngx_http_headers_module docs](https://nginx.org/en/docs/http/ngx_http_headers_module.html) - `add_header` directive behavior, `always` flag, inheritance rules
- [Nginx PHP FastCGI Example](https://www.nginx.com/resources/wiki/start/topics/examples/phpfcgi/) - Secure FastCGI configuration patterns
- Existing codebase files: `backend/docker/nginx.conf`, `backend/routes/web.php`, `backend/Dockerfile`

### Secondary (MEDIUM confidence)
- [GetPageSpeed: Pitfalls of add_header](https://www.getpagespeed.com/server-setup/nginx/the-pitfalls-of-add_header-in-nginx-solving-inheritance-issues-with-more_set_headers) - add_header inheritance issue documentation
- [Gixy: NGINX Security & Hardening Guide](https://gixy.getpagespeed.com/nginx-hardening-guide/) - Comprehensive hardening checklist
- [DEV.to: Nginx add_header Inheritance](https://dev.to/gokcedemirdurkut/nginx-addheader-inheritance-the-silent-security-header-killer-p0f) - Inheritance trap explanation
- [Nginx Blog: 1.29.3 release](https://blog.nginx.org/blog/nginx-open-source-1-29-3-and-1-29-4) - `add_header_inherit` feature introduction

### Tertiary (LOW confidence)
- Alpine Nginx package version ranges -- inferred from multiple sources, not verified against specific `php:8.3-fpm-alpine` image

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies, all Nginx directives well-documented
- Architecture: HIGH - single nginx.conf file with well-understood directive behavior
- Pitfalls: HIGH - add_header inheritance trap is extensively documented and verified through multiple sources

**Research date:** 2026-04-11
**Valid until:** 2026-07-11 (stable domain -- Nginx directive behavior changes slowly)

## Project Constraints (from CLAUDE.md)

- No TypeScript -- all `.jsx`/`.js` files (not relevant to this phase)
- No tests exist -- verification must be manual curl-based
- Backend is Laravel 11 (PHP) deployed on Railway with PostgreSQL
- Railway CLI does not work in non-interactive terminals
- Nginx config changes deploy via Docker on push to GitHub
- Nginx config is at `backend/docker/nginx.conf`, copied to `/etc/nginx/http.d/default.conf` in Docker build
