# Phase 7: Railway Production Deployment - Research

**Researched:** 2026-03-14
**Domain:** Railway PaaS deployment (Laravel backend + React SPA frontend)
**Confidence:** HIGH

## Summary

This phase deploys a Laravel 12 backend (PHP 8.3, PostgreSQL) and a React 19 Vite SPA frontend to Railway as two separate services. The backend already has a Dockerfile with PHP-FPM + Nginx + Supervisor, but it needs a critical fix: it installs `pdo_mysql` instead of `pdo_pgsql`. The frontend already has a `server.js` static file server with SPA fallback routing, which can be deployed directly via Nixpacks/Railpack.

A major architectural concern is Sanctum cookie-based SPA authentication across separate Railway domains. Railway's `.up.railway.app` domain is on the public suffix list, meaning cookies cannot be shared between `backend-xxx.up.railway.app` and `frontend-yyy.up.railway.app`. For v1.1, the frontend uses mock data only (no API calls), so this is not a blocker now -- but the environment variables should be configured correctly for when API integration happens in v2.

**Primary recommendation:** Fix the Dockerfile to install `pdo_pgsql`, add a startup script for migrations and caching, deploy the frontend via Nixpacks with its existing `server.js`, and configure all production environment variables. Defer Sanctum cookie auth testing until the frontend-backend integration phase (v2).

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DEPLOY-01 | Backend Dockerfile builds and runs Laravel with PHP-FPM + Nginx | Existing Dockerfile needs pdo_pgsql fix; nginx.conf and supervisord.conf already exist |
| DEPLOY-02 | Backend connects to Railway PostgreSQL addon via environment variables | Use `DB_URL=${{Postgres.DATABASE_URL}}` reference variable; Laravel supports DB_URL natively |
| DEPLOY-03 | Migrations run successfully on Railway PostgreSQL | Add startup/pre-deploy script: `php artisan migrate --force` |
| DEPLOY-04 | Frontend static server deploys and serves SPA on Railway | `server.js` already exists with SPA fallback; deploy via Nixpacks with `node server.js` start command |
| DEPLOY-05 | Both services accessible via Railway-generated public URLs | Each service gets a `.up.railway.app` domain; enable public networking in Railway dashboard |
| DEPLOY-06 | Environment variables configured for production (APP_KEY, CORS, session domain, Sanctum stateful domains) | Full env var list documented below; note public suffix limitation for cookies |
</phase_requirements>

## Standard Stack

### Core (Already in Project)

| Component | Version | Purpose | Notes |
|-----------|---------|---------|-------|
| Laravel | 12.x | Backend framework | Already configured for pgsql |
| PHP | 8.3 | Runtime | Dockerfile uses `php:8.3-fpm-alpine` |
| Nginx | alpine | Reverse proxy | Config at `docker/nginx.conf`, port 8080 |
| Supervisor | alpine | Process manager | Runs PHP-FPM + Nginx |
| Node.js | LTS | Frontend server | `server.js` serves `dist/` with SPA fallback |
| Vite | 7.x | Frontend build | `npm run build` produces `dist/` |

### Railway Platform

| Component | Purpose | How Used |
|-----------|---------|----------|
| Railway PostgreSQL | Managed database | Addon service, provides `DATABASE_URL` |
| Railway Dockerfile builder | Backend build | Detects Dockerfile in repo, uses it over Nixpacks |
| Railway Railpack/Nixpacks | Frontend build | Auto-detects Node.js from `package.json` |
| Railway networking | Public URLs | `.up.railway.app` domains, automatic HTTPS |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom Dockerfile | Railpack auto-detection | Railpack uses FrankenPHP+Caddy; our Dockerfile gives us explicit control with PHP-FPM+Nginx which matches our existing config |
| Node.js `server.js` | Caddy static server | Caddy is more performant but `server.js` already works and avoids adding a Dockerfile for frontend |
| Separate Railway services | Single service (backend serves frontend) | Separate services allow independent deploys and scaling; this is the standard Railway multi-service pattern |

## Architecture Patterns

### Railway Project Structure

```
Railway Project: aqua-tip
  |
  +-- Backend Service (Dockerfile)
  |     Source: /backend directory
  |     Port: 8080
  |     Domain: auto-generated .up.railway.app
  |     Env: APP_KEY, DB_URL, CORS, session, etc.
  |
  +-- Frontend Service (Nixpacks)
  |     Source: /frontend directory
  |     Port: 3000 (from server.js)
  |     Domain: auto-generated .up.railway.app
  |
  +-- PostgreSQL (Addon)
        Provides: DATABASE_URL, PGHOST, PGPORT, etc.
        Connected to: Backend Service via reference variables
```

### Pattern 1: Railway Reference Variables for Database

**What:** Railway allows services to reference variables from other services using `${{ServiceName.VARIABLE}}` syntax.
**When to use:** Connecting the backend to the PostgreSQL addon.
**Configuration:**
```
# In Backend Service environment variables on Railway:
DB_URL=${{Postgres.DATABASE_URL}}
DB_CONNECTION=pgsql
```

Laravel's `config/database.php` already supports `DB_URL` (via `'url' => env('DB_URL')`). When `DB_URL` is set, Laravel parses it to extract host, port, database, username, and password, overriding individual `DB_HOST`, `DB_PORT`, etc. values.

### Pattern 2: Startup Script for Migrations and Caching

**What:** A shell script that runs on container start before the main process.
**When to use:** Running migrations and caching config on each deploy.
**Example:**
```bash
#!/bin/sh
# docker/start.sh

# Run migrations
php artisan migrate --force

# Cache configuration for production
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# Start supervisor (PHP-FPM + Nginx)
exec /usr/bin/supervisord -c /etc/supervisord.conf
```

### Pattern 3: Railway Root Directory Configuration

**What:** Railway supports deploying from a subdirectory of a monorepo.
**When to use:** This project has `/backend` and `/frontend` as separate directories.
**Configuration:** In Railway service settings, set "Root Directory" to `backend` or `frontend` respectively.

### Anti-Patterns to Avoid

- **Using `DB_HOST`/`DB_PORT` individually instead of `DB_URL`:** Railway provides `DATABASE_URL` as a single connection string. Use `DB_URL` to consume it directly rather than parsing it into parts.
- **Running `php artisan key:generate` on every deploy:** Generate the APP_KEY once and store it as an environment variable. Running it on every deploy would invalidate all sessions.
- **Using `APP_DEBUG=true` in production:** Security risk -- exposes stack traces, environment variables, and database queries to users.
- **Setting `SESSION_DOMAIN` to a `.up.railway.app` value:** This is a public suffix; browsers will reject cookies scoped to it. Leave `SESSION_DOMAIN` as `null` (auto-detect) or use a custom domain.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTPS/SSL | Manual cert management | Railway automatic HTTPS | Railway handles TLS termination |
| Database backups | Custom backup scripts | Railway PostgreSQL backup features | Built-in point-in-time recovery |
| Process management | Custom init scripts | Supervisor (already configured) | Handles PHP-FPM + Nginx lifecycle |
| SPA routing fallback | Custom nginx rewrite rules | Existing `server.js` SPA fallback | Already implemented and working |
| CI/CD pipeline | GitHub Actions/Jenkins | Railway auto-deploy from GitHub | Auto-detects pushes, builds, deploys |

## Common Pitfalls

### Pitfall 1: Dockerfile Installs pdo_mysql Instead of pdo_pgsql (CRITICAL)

**What goes wrong:** The existing Dockerfile at line 12 runs `docker-php-ext-install pdo_mysql`. Since the project migrated to PostgreSQL in Phase 6, the backend needs `pdo_pgsql` instead.
**Why it happens:** The Dockerfile was created before the PostgreSQL migration.
**How to avoid:** Replace `pdo_mysql` with `pdo_pgsql` in the Dockerfile. Also add `libpq-dev` to the Alpine package list (required to compile pdo_pgsql).
**Warning signs:** Build succeeds but app crashes with "could not find driver" errors.

### Pitfall 2: Public Suffix List Blocks Cookie Sharing on .up.railway.app

**What goes wrong:** Sanctum cookie-based SPA auth requires cookies to be shared between frontend and backend. The `.up.railway.app` domain is on the public suffix list, so browsers treat each subdomain as a separate site and refuse to share cookies.
**Why it happens:** Railway generates unique subdomains for each service under `.up.railway.app`.
**How to avoid:** For v1.1 this is not a blocker since the frontend uses mock data (no API calls). For v2 (API integration), either: (a) use a custom domain with subdomains (e.g., `api.aquatip.com` + `app.aquatip.com`), or (b) switch to token-based auth instead of cookie-based.
**Warning signs:** Login works but subsequent API calls return 401 Unauthorized.

### Pitfall 3: Missing APP_KEY

**What goes wrong:** Laravel fails to start entirely without APP_KEY.
**Why it happens:** APP_KEY is not in the Dockerfile and must be set as a Railway environment variable.
**How to avoid:** Generate once locally with `php artisan key:generate --show`, copy the output, paste into Railway environment variables.
**Warning signs:** 500 error on all requests with "No application encryption key has been specified."

### Pitfall 4: Ephemeral Filesystem

**What goes wrong:** Uploaded files, SQLite databases, and file-based caches/sessions are lost on every deploy.
**Why it happens:** Railway containers have ephemeral filesystems that reset on each deployment.
**How to avoid:** Use `database` driver for sessions, cache, and queue (already configured in `.env.example`). Do not use `file` storage for anything persistent.
**Warning signs:** Sessions randomly clear, cache misses after deploy.

### Pitfall 5: Log Channel Configuration

**What goes wrong:** Logs written to disk are lost after each deploy.
**Why it happens:** Ephemeral filesystem; default `stack` channel writes to `storage/logs/laravel.log`.
**How to avoid:** Set `LOG_CHANNEL=stderr` so logs appear in Railway's log viewer.
**Warning signs:** No logs visible in Railway dashboard.

### Pitfall 6: .dockerignore Excludes docker/ Directory

**What goes wrong:** The existing `.dockerignore` excludes the `docker` directory, which contains `nginx.conf` and `supervisord.conf` that the Dockerfile copies.
**Why it happens:** Overly broad `.dockerignore` pattern.
**How to avoid:** Remove `docker` from `.dockerignore`.
**Warning signs:** Docker build fails with "COPY failed: file not found in build context."

### Pitfall 7: Frontend Build Not Committed

**What goes wrong:** The frontend `dist/` directory may not be built before deployment.
**Why it happens:** Nixpacks needs to run `npm run build` during the build phase.
**How to avoid:** Ensure the start command is `node server.js` and the build command is `npm run build`. Nixpacks should auto-detect this from `package.json`.

## Code Examples

### Backend Dockerfile Fix (pdo_pgsql)

```dockerfile
# Replace pdo_mysql with pdo_pgsql
# Add libpq-dev for PostgreSQL client library

FROM php:8.3-fpm-alpine AS base

RUN apk add --no-cache \
    nginx \
    supervisor \
    curl \
    libpng-dev \
    oniguruma-dev \
    libxml2-dev \
    libpq-dev \
    zip \
    unzip

RUN docker-php-ext-install pdo_pgsql mbstring exif pcntl bcmath gd
```

### Startup Script (docker/start.sh)

```bash
#!/bin/sh
set -e

# Run migrations on deploy
php artisan migrate --force

# Cache for production performance
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# Start supervisor
exec /usr/bin/supervisord -c /etc/supervisord.conf
```

### Updated Dockerfile CMD

```dockerfile
# Replace existing CMD with startup script
COPY docker/start.sh /var/www/docker/start.sh
RUN chmod +x /var/www/docker/start.sh

CMD ["/var/www/docker/start.sh"]
```

### Production Environment Variables (Backend)

```env
# === Core ===
APP_NAME="AQUA TIP"
APP_ENV=production
APP_KEY=base64:XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
APP_DEBUG=false
APP_URL=https://BACKEND_DOMAIN.up.railway.app
FRONTEND_URL=https://FRONTEND_DOMAIN.up.railway.app

# === Database ===
DB_CONNECTION=pgsql
DB_URL=${{Postgres.DATABASE_URL}}

# === Session ===
SESSION_DRIVER=database
SESSION_LIFETIME=480
SESSION_ENCRYPT=true
SESSION_SECURE_COOKIE=true
SESSION_DOMAIN=null
SESSION_SAME_SITE=lax

# === Sanctum ===
SANCTUM_STATEFUL_DOMAINS=FRONTEND_DOMAIN.up.railway.app

# === CORS ===
# Already reads from FRONTEND_URL env var in config/cors.php

# === Logging ===
LOG_CHANNEL=stderr
LOG_LEVEL=warning

# === Cache/Queue ===
CACHE_STORE=database
QUEUE_CONNECTION=database

# === Mail ===
MAIL_MAILER=log

# === Security ===
BCRYPT_ROUNDS=12
```

### Railway Service Configuration

```
Backend Service:
  Root Directory: backend
  Builder: Dockerfile
  Port: 8080 (from nginx.conf)
  Health Check: GET / (returns Laravel response)

Frontend Service:
  Root Directory: frontend
  Builder: Nixpacks (auto-detect Node.js)
  Build Command: npm run build
  Start Command: node server.js
  Port: 3000 (from server.js PORT env)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Nixpacks builder | Railpack builder | 2025 | Better image sizes; but Dockerfile takes priority when present |
| Manual Caddy config | Railpack auto-detect | 2025 | For non-Dockerfile deploys, Railpack auto-configures server |
| `DATABASE_URL` only | Private + Public URL split | 2024 | Internal services should use private URL (no egress cost) |

## Open Questions

1. **OAuth callback URLs in production**
   - What we know: Google and GitHub OAuth are configured in the backend, callback URLs need to point to Railway domain
   - What's unclear: Whether the user has custom domains planned or will use Railway-generated domains
   - Recommendation: Configure OAuth callbacks after deployment with actual Railway URLs; note this in the plan as a manual post-deploy step

2. **Sanctum cross-domain auth for v2**
   - What we know: Cookie auth won't work across separate `.up.railway.app` domains due to public suffix list
   - What's unclear: Whether the user plans to use custom domains
   - Recommendation: Document this limitation; for v1.1 it's not a blocker (frontend uses mock data). Plan for either custom domains or token-based auth in v2.

3. **Railway plan limits**
   - What we know: Railway's free tier has usage limits
   - What's unclear: Which Railway plan the user is on
   - Recommendation: Document that PostgreSQL addon and two services require at least a Hobby plan ($5/month)

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Manual validation (smoke tests via curl/browser) |
| Config file | None -- deployment validation is manual |
| Quick run command | `curl -s https://BACKEND_URL/api/health` |
| Full suite command | Check both service URLs respond with 200 |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEPLOY-01 | Backend Dockerfile builds on Railway | smoke | Railway build log shows success | N/A |
| DEPLOY-02 | Backend connects to PostgreSQL | smoke | `curl https://BACKEND_URL` returns non-500 | N/A |
| DEPLOY-03 | Migrations run on Railway PostgreSQL | smoke | Railway deploy log shows migration output | N/A |
| DEPLOY-04 | Frontend serves SPA | smoke | `curl https://FRONTEND_URL` returns HTML | N/A |
| DEPLOY-05 | Both services have public URLs | smoke | Both URLs respond with 200 | N/A |
| DEPLOY-06 | Env vars correctly configured | smoke | No 500 errors, APP_KEY present | N/A |

### Sampling Rate
- **Per task:** Verify Railway build logs after each deploy
- **Phase gate:** Both services respond on public URLs, no 500 errors

### Wave 0 Gaps
- None -- deployment validation is inherently manual/smoke-test based

## Sources

### Primary (HIGH confidence)
- [Railway Laravel Guide](https://docs.railway.com/guides/laravel) - Deployment methods, env vars, pre-deploy scripts
- [Railway React Guide](https://docs.railway.com/guides/react) - Caddy/static file serving, SPA configuration
- [Railway PostgreSQL Docs](https://docs.railway.com/databases/postgresql) - Reference variables, DATABASE_URL format
- [Railpack PHP Docs](https://railpack.com/languages/php/) - Auto-detection, extension installation, Laravel support
- Existing project files: Dockerfile, docker/nginx.conf, docker/supervisord.conf, .env.example, config/database.php, config/cors.php, config/sanctum.php, config/session.php

### Secondary (MEDIUM confidence)
- [Railway Blog: Introducing Railpack](https://blog.railway.com/p/introducing-railpack) - Railpack vs Nixpacks migration
- [Railway Help Station: Cross-domain cookies](https://station.railway.com/questions/cross-domain-cookies-on-preview-65c2b01e) - Public suffix list limitation
- [Laravel Sanctum SPA Auth](https://prateeksha.com/blog/laravel-sanctum-spa-cookie-auth-csrf-cors-production-safe-defaults) - Cookie domain requirements

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Existing Dockerfile, configs, and server.js are all in the repo; Railway docs are clear
- Architecture: HIGH - Standard Railway multi-service pattern, well-documented
- Pitfalls: HIGH - Critical Dockerfile bug (pdo_mysql) verified in source; public suffix issue verified via Railway Help Station
- Environment config: HIGH - All config files read and cross-referenced with Railway docs

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (Railway platform is stable; 30-day validity)
