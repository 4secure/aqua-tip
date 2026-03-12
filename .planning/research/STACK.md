# Technology Stack

**Project:** AQUA TIP - Authentication System (Laravel Backend + React SPA)
**Researched:** 2026-03-12
**Mode:** Ecosystem
**Overall Confidence:** HIGH

## Recommended Stack

### Backend Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Laravel | 12.x | Backend framework | Current LTS-track release (Feb 2025), bug fixes until Aug 2026, security fixes until Feb 2027. PHP 8.3 compatible. The project explicitly requires Laravel. | HIGH |
| PHP | 8.3.16 | Runtime | Already installed in Laragon. Laravel 12 requires PHP >= 8.2. PHP 8.3 is stable and in security-fix mode -- no reason to upgrade to 8.4/8.5 mid-project. | HIGH |
| Composer | 2.8.x | Dependency management | Already installed (2.8.10). Current stable. | HIGH |

### Authentication

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Laravel Sanctum | 4.x | SPA authentication | First-party Laravel package built specifically for SPA auth. Two modes: cookie-based (stateful) for same-domain SPAs, token-based (stateless) for cross-domain. Use **token-based mode** because Vite dev server (localhost:5173) and Laravel (localhost:8000) are different origins -- cookie-based SPA mode requires same top-level domain which fails with different ports in development. | HIGH |
| Laravel Socialite | 5.x | OAuth (Google, GitHub) | First-party Laravel package for OAuth. Supports Google and GitHub out of the box. Fluent API, well-maintained, no alternatives worth considering. | HIGH |

### Database

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| PostgreSQL | 15+ | Primary database | User preference. Superior JSON support, better data integrity with CHECK constraints, and native UUID type which is useful for API tokens. Laravel 12 supports PostgreSQL natively via `DB_CONNECTION=pgsql`. Requires adding PostgreSQL to Laragon (Quick Add or manual install) and enabling `pdo_pgsql` PHP extension. | HIGH |

### Frontend Auth Libraries

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Axios | 1.x | HTTP client | Automatic XSRF-TOKEN cookie handling -- reads XSRF-TOKEN cookie and sets X-XSRF-TOKEN header without manual code. This is critical for Sanctum CSRF protection. The native Fetch API does NOT do this automatically and requires manual URL-decoding of the cookie value, which is a common source of 419 CSRF mismatch errors. | HIGH |
| React Context API | (built-in) | Auth state management | No external library needed. A simple AuthContext/AuthProvider wrapping the app is the standard pattern for React SPA auth. Avoids adding Redux/Zustand overhead for what is fundamentally a single piece of global state. | HIGH |
| React Router DOM | 7.x | Route protection | Already installed. Use route guards (wrapper components) to redirect unauthenticated users to login. No additional library needed. | HIGH |

### Rate Limiting

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Laravel Rate Limiter (built-in) | n/a | IP and user-based rate limiting | Laravel's `RateLimiter::for()` facade with `throttle` middleware is the standard approach. Supports dynamic limits based on user state (guest vs authenticated). Database-backed via cache driver. No external package needed. | HIGH |
| Database cache driver | n/a | Rate limit persistence | Store rate limit counters in PostgreSQL via Laravel's database cache driver. Survives server restarts, allows midnight UTC reset via scheduled command. Redis is overkill for this scale. | MEDIUM |

### Infrastructure / Tooling

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Laragon | (local) | Local development environment | Already the project's environment. PHP 8.3, Composer 2.8 confirmed available. PostgreSQL must be added (see setup notes). | HIGH |
| Laravel CORS (built-in) | n/a | Cross-origin requests | Laravel 12 includes CORS middleware out of the box via `config/cors.php`. Set `supports_credentials => true` and whitelist the Vite dev server origin (`http://localhost:5173`). | HIGH |
| Laravel Mail (built-in) | n/a | Email verification | Built-in email verification scaffolding via `MustVerifyEmail` interface. Use Mailtrap or `log` driver for development. | HIGH |

## Critical Architecture Decision: Sanctum Token-Based vs Cookie-Based

This is the single most important technical decision for this project.

### Decision: Use Token-Based (Stateless) Authentication

**Reason:** During development, the React SPA runs on `localhost:5173` (Vite) and Laravel runs on `localhost:8000`. These are different origins. Sanctum's cookie-based (stateful) SPA mode requires the SPA and API to share the same top-level domain. Different ports on localhost are treated as different origins by browsers for cookie purposes.

**How it works:**
1. User logs in (email/password or OAuth callback) -- Laravel returns a Bearer token
2. Frontend stores token in memory (AuthContext state) with localStorage fallback for persistence
3. Every API request includes `Authorization: Bearer {token}` header via Axios interceptor
4. Sanctum validates token on each request
5. Token expires after 7 days (`'expiration' => 10080` in `config/sanctum.php`)

**Production note:** In production, if both SPA and API are served from the same domain (e.g., `api.aquatip.com` and `app.aquatip.com`), you could switch to cookie-based mode for stronger security (HttpOnly cookies, no token in JS memory). But token-based works for both dev and prod without configuration changes.

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Auth system | Sanctum | Laravel Passport | Passport is a full OAuth2 server -- massive overkill for first-party SPA auth. Sanctum is lighter, simpler, purpose-built for this use case. |
| Auth system | Sanctum | JWT (tymon/jwt-auth) | Third-party package, less maintained, Sanctum is first-party and covers the same use case with better Laravel integration. |
| OAuth | Socialite | Manual OAuth2 | Socialite handles the entire OAuth flow (redirect, callback, user hydration) in ~10 lines. Manual implementation is error-prone and pointless. |
| HTTP client | Axios | Fetch API | Fetch requires manual XSRF-TOKEN cookie reading and URL-decoding for Sanctum CSRF. Axios handles it automatically. The CSRF mismatch bug from using Fetch is one of the most common Laravel+React issues. |
| Database | PostgreSQL | MySQL | User preference for PostgreSQL. Both work equally well with Laravel. PostgreSQL has slightly better JSON support and native UUID type. |
| Database | PostgreSQL | SQLite | SQLite lacks concurrent write support needed for rate limiting counters under load. Fine for dev, wrong for a multi-user auth system. |
| Rate limit storage | Database | Redis | Redis is faster but adds infrastructure complexity. For rate limits resetting daily with <100 concurrent users, database cache is sufficient. Migrate to Redis later if needed. |
| State management | React Context | Redux/Zustand | Auth state is a single boolean + user object. A Context provider with `useState` + `useEffect` is the right tool. Adding a state management library for this is over-engineering. |
| State management | localStorage (fallback) | Cookies (js-cookie) | Storing tokens in localStorage is simpler. HttpOnly cookies would be more secure but require cookie-based Sanctum mode (not viable for different-origin dev setup). |

## What NOT to Use

| Technology | Why Not |
|------------|---------|
| Laravel Breeze/Jetstream | These are full auth scaffolding kits that generate Blade views or Inertia pages. We already have a React frontend -- we only need the API endpoints, not the UI scaffolding. |
| Laravel Passport | Full OAuth2 server. We are building a first-party SPA, not an OAuth provider. Sanctum is the correct choice. |
| Inertia.js | Inertia replaces the API layer with server-driven page rendering. We have a standalone React SPA that communicates via REST API. Inertia is architecturally incompatible. |
| tymon/jwt-auth | Third-party JWT package that was the standard before Sanctum existed. Now superseded by Sanctum for first-party apps. Less maintained. |
| NextAuth / Auth.js | These are for Next.js. Our frontend is plain React + Vite. |
| Firebase Auth | Adds external dependency, vendor lock-in, and doesn't integrate with Laravel's middleware/gate system. |

## Installation Commands

### Backend Setup

```bash
# Create Laravel project in backend directory
composer create-project laravel/laravel backend

# Install auth packages
cd backend
composer require laravel/sanctum
composer require laravel/socialite

# Publish Sanctum config and run migrations
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
php artisan migrate
```

### Frontend Addition

```bash
# In frontend directory
cd frontend
npm install axios
```

### PostgreSQL Setup (Laragon)

```
1. Laragon menu > Tools > Quick Add > postgresql
   (or manually download from enterprisedb.com and extract to C:\laragon\bin\postgresql\)
2. Restart Laragon
3. Enable pdo_pgsql in php.ini (Laragon menu > PHP > Extensions > pdo_pgsql)
4. Create database: CREATE DATABASE aqua_tip;
```

### Environment Configuration (.env)

```env
# Database
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=aqua_tip
DB_USERNAME=postgres
DB_PASSWORD=

# Sanctum
SANCTUM_STATEFUL_DOMAINS=localhost:5173

# Socialite - Google
GOOGLE_CLIENT_ID=placeholder
GOOGLE_CLIENT_SECRET=placeholder
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback

# Socialite - GitHub
GITHUB_CLIENT_ID=placeholder
GITHUB_CLIENT_SECRET=placeholder
GITHUB_REDIRECT_URI=http://localhost:8000/auth/github/callback

# CORS
FRONTEND_URL=http://localhost:5173

# Mail (dev)
MAIL_MAILER=log
```

## Version Compatibility Matrix

| Component | Version | Requires | Status |
|-----------|---------|----------|--------|
| Laravel 12 | 12.x | PHP >= 8.2 | Current (Feb 2025) |
| PHP | 8.3.16 | - | Installed in Laragon |
| Sanctum | 4.x | Laravel ^11/^12/^13 | Current |
| Socialite | 5.x | Laravel ^11/^12 | Current |
| PostgreSQL | 15+ | pdo_pgsql extension | Needs install in Laragon |
| Composer | 2.8.10 | PHP >= 7.2 | Installed |
| Axios | 1.x | - | NPM install needed |
| React | 19 | - | Already installed |
| React Router DOM | 7 | - | Already installed |

## Sources

- [Laravel 12 Release Notes](https://laravel.com/docs/12.x/releases) -- official release info, PHP requirements
- [Laravel Sanctum 12.x Docs](https://laravel.com/docs/12.x/sanctum) -- SPA auth modes, token expiration, CSRF handling
- [Laravel Socialite 12.x Docs](https://laravel.com/docs/12.x/socialite) -- OAuth setup for Google/GitHub
- [Laravel Rate Limiting 12.x Docs](https://laravel.com/docs/12.x/rate-limiting) -- RateLimiter facade, throttle middleware
- [Sanctum on Packagist](https://packagist.org/packages/laravel/sanctum) -- v4.3.1, compatibility info
- [Socialite on Packagist](https://packagist.org/packages/laravel/socialite) -- v5.24.2
- [Axios XSRF handling](https://cdruc.com/axios-laravel) -- why Axios over Fetch for Sanctum
- [Adding PostgreSQL to Laragon](https://dev.to/dendihandian/adding-postgresql-to-laragon-2kde) -- setup guide
- [Laravel 12 with PostgreSQL Guide](https://kritimyantra.com/blogs/laravel-12-with-postgresql-a-complete-setup-guide-2025) -- configuration details
- [PHP Versions](https://php.watch/versions) -- PHP 8.3 status and support timeline
