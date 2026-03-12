# Phase 1: Laravel Foundation + Core Auth - Research

**Researched:** 2026-03-12
**Domain:** Laravel 12 scaffolding, Sanctum cookie-based SPA auth, MySQL, CORS
**Confidence:** HIGH

## Summary

Phase 1 establishes the Laravel 12 backend from scratch in the empty `backend/` directory. The core deliverable is a working API that handles email/password registration, login, logout, and session persistence using Sanctum's cookie-based SPA authentication mode. The frontend (React on Vite, port 5173) must be able to make credentialed cross-origin requests to the Laravel API (port 8000) without CORS errors.

The key architectural choice -- already decided by the user -- is **cookie-based Sanctum auth** (not token-based). This uses Laravel's built-in session driver with HttpOnly cookies, which is more secure for SPAs since JavaScript never touches auth credentials. Despite the SPA and API running on different ports during development, cookie-based auth works because both share the `localhost` top-level domain when `SESSION_DOMAIN=localhost` is explicitly set.

Password validation uses Laravel's built-in `Password` rule object: `Password::min(8)->mixedCase()->numbers()` satisfies the AUTH-08 requirement (min 8 chars, mixed case + number) without custom validation logic.

**Primary recommendation:** Use `composer create-project laravel/laravel backend`, then `php artisan install:api` for Sanctum scaffolding, configure `statefulApi()` middleware for cookie-based SPA mode, set `SESSION_DRIVER=database` with MySQL, and implement auth controllers manually (no Breeze/Jetstream since we have an existing React SPA).

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-01 | Laravel 12 backend scaffolded in `backend/` with Sanctum and Socialite installed | `composer create-project` + `php artisan install:api` + `composer require laravel/socialite`; Socialite installed now but not configured until Phase 2 |
| INFRA-02 | MySQL database with users table migration (name, email, password, OAuth provider fields) | Default users migration + custom migration adding `oauth_provider`, `oauth_id`, `avatar_url` columns; `SESSION_DRIVER=database` requires sessions table (included in default migration) |
| INFRA-03 | CORS configured for Vite dev server (localhost:5173) | `config/cors.php` with `allowed_origins => ['http://localhost:5173']`, `supports_credentials => true`, paths include `api/*`, `sanctum/csrf-cookie`, `login`, `logout`, `register` |
| INFRA-04 | Sanctum SPA cookie auth configured (session driver, CSRF cookie, stateful domains) | `statefulApi()` in bootstrap/app.php, `SANCTUM_STATEFUL_DOMAINS=localhost:5173`, `SESSION_DOMAIN=localhost`, `SESSION_DRIVER=database` |
| AUTH-01 | User can sign up with email and password (bcrypt hashed) | RegisterController with `Hash::make()` (bcrypt is Laravel's default hasher); returns user JSON + sets session cookie |
| AUTH-02 | User can log in with email and password | LoginController using `Auth::attempt()` + `$request->session()->regenerate()`; cookie-based session persists |
| AUTH-06 | Session persists across browser refresh (7-day cookie expiry) | `SESSION_LIFETIME=10080` (7 days in minutes) in `.env`; session stored in database |
| AUTH-07 | User can log out, session destroyed server-side | `Auth::guard('web')->logout()` + `$request->session()->invalidate()` + `$request->session()->regenerateToken()` |
| AUTH-08 | Password strength: min 8 chars, mixed case + number | `Password::min(8)->mixedCase()->numbers()` in registration validation rules |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Laravel | 12.x | Backend framework | Current release (Feb 2025), PHP 8.3 compatible, first-party Sanctum integration |
| Laravel Sanctum | 4.x | SPA cookie authentication | First-party, purpose-built for SPA auth, installed via `php artisan install:api` |
| Laravel Socialite | 5.x | OAuth (Phase 2 prep) | First-party OAuth package; install now to satisfy INFRA-01, configure later |
| PHP | 8.3.16 | Runtime | Already in Laragon, meets Laravel 12's >= 8.2 requirement |
| MySQL | (Laragon default) | Database | User preference, Laragon default, zero additional setup |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Pest | (bundled) | Testing | Laravel 12 ships with Pest + PHPUnit; use for auth endpoint tests |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Cookie-based Sanctum | Token-based Sanctum | Tokens in localStorage are XSS-vulnerable; cookies are HttpOnly. User decided cookie-based. |
| Manual auth controllers | Laravel Breeze | Breeze generates Blade/Inertia views we don't need; we have a React SPA |
| MySQL | PostgreSQL | STACK.md suggested PostgreSQL but STATE.md records MySQL as user preference |

**Installation:**
```bash
# Create Laravel project
composer create-project laravel/laravel backend

# Install Sanctum + API scaffolding
cd backend
php artisan install:api

# Install Socialite (for Phase 2, but INFRA-01 requires it installed now)
composer require laravel/socialite
```

## Architecture Patterns

### Recommended Project Structure
```
backend/
  app/
    Http/
      Controllers/
        Auth/
          RegisterController.php       # POST /api/register
          LoginController.php          # POST /api/login
          LogoutController.php         # POST /api/logout
      Requests/
        Auth/
          RegisterRequest.php          # Validation: name, email, password rules
          LoginRequest.php             # Validation: email, password required
    Models/
      User.php                         # HasApiTokens trait (from Sanctum)
  bootstrap/
    app.php                            # statefulApi() middleware
  config/
    cors.php                           # SPA origin, credentials
    sanctum.php                        # Stateful domains
    session.php                        # Database driver, lifetime, domain
  database/
    migrations/
      0001_01_01_000000_create_users_table.php  # Default (includes sessions)
      xxxx_add_oauth_columns_to_users_table.php # oauth_provider, oauth_id, avatar_url
  routes/
    api.php                            # Auth + protected API routes
    web.php                            # CSRF cookie route (auto), OAuth routes (Phase 2)
  .env                                 # All config values
```

### Pattern 1: Sanctum Cookie-Based SPA Auth Flow

**What:** Browser manages HttpOnly session cookies automatically. No tokens in JavaScript.

**When to use:** Always for this project. The SPA and API share `localhost` domain.

**Configuration (bootstrap/app.php):**
```php
// Source: https://laravel.com/docs/12.x/sanctum
->withMiddleware(function (Middleware $middleware) {
    $middleware->statefulApi();
})
```

**Environment (.env):**
```env
# Sanctum - hostname:port, NO scheme
SANCTUM_STATEFUL_DOMAINS=localhost:5173

# Session - domain only, NO port, NO scheme
SESSION_DRIVER=database
SESSION_LIFETIME=10080
SESSION_DOMAIN=localhost

# CORS
FRONTEND_URL=http://localhost:5173

# App
APP_URL=http://localhost:8000

# Database
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=aqua_tip
DB_USERNAME=root
DB_PASSWORD=
```

### Pattern 2: Auth Controller Structure (No Breeze)

**What:** Manual auth controllers that return JSON responses, not Blade views.

**When to use:** When you have a standalone SPA frontend and only need API endpoints.

**Register example:**
```php
// Source: Laravel 12 authentication docs
// app/Http/Controllers/Auth/RegisterController.php
public function __invoke(RegisterRequest $request)
{
    $user = User::create([
        'name' => $request->name,
        'email' => $request->email,
        'password' => Hash::make($request->password),
    ]);

    Auth::login($user);

    return response()->json($user, 201);
}
```

**Login example:**
```php
// app/Http/Controllers/Auth/LoginController.php
public function __invoke(LoginRequest $request)
{
    if (! Auth::attempt($request->only('email', 'password'))) {
        throw ValidationException::withMessages([
            'email' => ['The provided credentials are incorrect.'],
        ]);
    }

    $request->session()->regenerate();

    return response()->json(Auth::user());
}
```

**Logout example:**
```php
// app/Http/Controllers/Auth/LogoutController.php
public function __invoke(Request $request)
{
    Auth::guard('web')->logout();

    $request->session()->invalidate();
    $request->session()->regenerateToken();

    return response()->json(['message' => 'Logged out']);
}
```

### Pattern 3: Password Validation with Built-in Rules

**What:** Use Laravel's `Password` rule object for declarative password strength requirements.

**When to use:** Registration and any password-setting endpoint.

```php
// Source: https://laravel.com/docs/12.x/validation
// app/Http/Requests/Auth/RegisterRequest.php
use Illuminate\Validation\Rules\Password;

public function rules(): array
{
    return [
        'name' => ['required', 'string', 'max:255'],
        'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
        'password' => ['required', 'confirmed', Password::min(8)->mixedCase()->numbers()],
    ];
}
```

### Pattern 4: CORS Configuration for Credentialed Requests

**What:** Explicit origin (not wildcard) with credentials support.

**Why:** `withCredentials: true` on Axios requires the server to respond with the exact origin, not `*`.

```php
// config/cors.php
return [
    'paths' => ['api/*', 'sanctum/csrf-cookie', 'login', 'logout', 'register'],
    'allowed_methods' => ['*'],
    'allowed_origins' => [env('FRONTEND_URL', 'http://localhost:5173')],
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
```

### Pattern 5: API Routes with Sanctum Guard

**What:** Protect API routes using `auth:sanctum` middleware.

```php
// routes/api.php
use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\LogoutController;

// Public auth routes
Route::post('/register', RegisterController::class);
Route::post('/login', LoginController::class);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', function (Request $request) {
        return $request->user();
    });
    Route::post('/logout', LogoutController::class);
});
```

### Anti-Patterns to Avoid

- **Wildcard CORS origin with credentials:** `allowed_origins => ['*']` breaks credentialed requests. Always use the explicit SPA origin.
- **Storing tokens in localStorage:** Cookie-based auth means no tokens in JS. Never use `createToken()` for the SPA flow.
- **Using Breeze/Jetstream:** These generate UI scaffolding we don't need. Manual controllers give full control.
- **Testing with Postman only:** Postman ignores CORS. Always verify auth flow in a real browser.
- **Forgetting CSRF cookie preflight:** Every state-changing request from the SPA must be preceded by `GET /sanctum/csrf-cookie` (at least once per session).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password hashing | Custom bcrypt wrapper | `Hash::make()` / `Hash::check()` | Laravel's hasher auto-upgrades algorithm rounds |
| Password validation | Regex patterns | `Password::min(8)->mixedCase()->numbers()` | Built-in, testable, gives clear error messages |
| CSRF protection | Manual token generation | Sanctum's `/sanctum/csrf-cookie` endpoint | Handles cookie setting, rotation, and validation |
| Session management | Custom session table/logic | `SESSION_DRIVER=database` | Laravel manages session lifecycle, garbage collection |
| CORS handling | Manual headers in middleware | `config/cors.php` | Handles preflight OPTIONS, credential headers, origin matching |
| Request validation | Manual if/else in controllers | Form Request classes | Automatic 422 response with structured errors |

**Key insight:** Laravel 12 ships with every piece needed for this phase. The implementation is configuration + thin controller layer, not custom infrastructure.

## Common Pitfalls

### Pitfall 1: Sanctum Config Format Mismatch (CRITICAL)

**What goes wrong:** 401 Unauthenticated or 419 CSRF Token Mismatch despite correct code.

**Why it happens:** Three config values require different formats:

| Config | Correct | Wrong |
|--------|---------|-------|
| `SANCTUM_STATEFUL_DOMAINS` | `localhost:5173` | `http://localhost:5173` |
| `SESSION_DOMAIN` | `localhost` | `localhost:8000` |
| `CORS allowed_origins` | `http://localhost:5173` | `http://localhost:5173/` |

**How to avoid:** Create `.env` with exact values from this research. Add a smoke test that verifies CSRF cookie + authenticated request works end-to-end.

**Warning signs:** Auth works in Postman but not from browser. Two XSRF-TOKEN cookies in DevTools.

### Pitfall 2: Missing CSRF Cookie Request

**What goes wrong:** Login POST returns 419 CSRF Token Mismatch.

**Why it happens:** Sanctum requires `GET /sanctum/csrf-cookie` before any state-changing request from the SPA.

**How to avoid:** The frontend Axios instance must call `/sanctum/csrf-cookie` before login/register. For Phase 1 testing with curl, include the cookie jar flag.

**Warning signs:** 419 on POST but GET works fine. Login works after page refresh but not on first try.

### Pitfall 3: CORS Wildcard with Credentials

**What goes wrong:** Browser blocks requests with "CORS does not allow credentials with wildcard origin."

**Why it happens:** `allowed_origins => ['*']` is incompatible with `supports_credentials => true`.

**How to avoid:** Always set `allowed_origins` to the exact SPA origin. Use `env('FRONTEND_URL')` for flexibility.

### Pitfall 4: Session Cookie Not Sent Cross-Port

**What goes wrong:** Login succeeds (200) but subsequent `GET /api/user` returns 401.

**Why it happens:** Without `SESSION_DOMAIN=localhost`, Laravel scopes the cookie to `localhost:8000` and the browser won't send it to `localhost:5173` requests directed at port 8000.

**How to avoid:** Explicitly set `SESSION_DOMAIN=localhost` in `.env`. This allows the cookie to be shared across all ports on localhost.

### Pitfall 5: `php artisan install:api` Creates Token Migration Only

**What goes wrong:** Developer assumes `install:api` sets up cookie-based SPA auth, but it only creates the `personal_access_tokens` migration and `api.php` route file.

**Why it happens:** `install:api` scaffolds token-based API auth. Cookie-based SPA auth requires additional configuration: `statefulApi()` middleware, session driver, CORS, and stateful domains.

**How to avoid:** After `install:api`, manually configure: (1) `statefulApi()` in bootstrap/app.php, (2) `SESSION_DRIVER=database`, (3) `SANCTUM_STATEFUL_DOMAINS`, (4) `SESSION_DOMAIN`, (5) `config/cors.php`. The `personal_access_tokens` migration can be kept (needed for Phase 2 OAuth flow) or ignored.

## Code Examples

### Complete .env Configuration for Phase 1

```env
APP_NAME="AQUA TIP"
APP_ENV=local
APP_KEY=  # generated by composer create-project
APP_DEBUG=true
APP_URL=http://localhost:8000

# Frontend
FRONTEND_URL=http://localhost:5173

# Database
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=aqua_tip
DB_USERNAME=root
DB_PASSWORD=

# Sanctum - hostname:port, NO scheme
SANCTUM_STATEFUL_DOMAINS=localhost:5173

# Session
SESSION_DRIVER=database
SESSION_LIFETIME=10080
SESSION_DOMAIN=localhost

# Cache (for future rate limiting)
CACHE_STORE=database

# Mail (dev - emails go to storage/logs)
MAIL_MAILER=log
```

### Complete bootstrap/app.php Middleware Setup

```php
// Source: https://laravel.com/docs/12.x/sanctum
<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->statefulApi();
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
```

### User Model Configuration

```php
// app/Models/User.php
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Contracts\Auth\MustVerifyEmail;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'oauth_provider',
        'oauth_id',
        'avatar_url',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'oauth_provider',
        'oauth_id',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
}
```

### Migration for OAuth Columns

```php
// database/migrations/xxxx_add_oauth_columns_to_users_table.php
public function up(): void
{
    Schema::table('users', function (Blueprint $table) {
        $table->string('oauth_provider', 50)->nullable()->after('remember_token');
        $table->string('oauth_id', 255)->nullable()->after('oauth_provider');
        $table->string('avatar_url', 500)->nullable()->after('oauth_id');

        $table->index(['oauth_provider', 'oauth_id']);
    });
}
```

### Testing Auth Endpoints with curl

```bash
# 1. Get CSRF cookie
curl -v -c cookies.txt http://localhost:8000/sanctum/csrf-cookie

# 2. Register
curl -v -b cookies.txt -c cookies.txt \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: <token-from-cookie>" \
  -d '{"name":"Test User","email":"test@example.com","password":"Password1","password_confirmation":"Password1"}' \
  http://localhost:8000/api/register

# 3. Get authenticated user
curl -v -b cookies.txt \
  -H "Accept: application/json" \
  http://localhost:8000/api/user

# 4. Logout
curl -v -b cookies.txt -c cookies.txt \
  -H "Accept: application/json" \
  -H "X-XSRF-TOKEN: <token-from-cookie>" \
  -X POST http://localhost:8000/api/logout

# 5. Verify logged out (should return 401)
curl -v -b cookies.txt \
  -H "Accept: application/json" \
  http://localhost:8000/api/user
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `app/Http/Kernel.php` middleware | `bootstrap/app.php` `withMiddleware()` | Laravel 11 (2024) | No Kernel class; all middleware in bootstrap |
| `composer require laravel/sanctum` + publish | `php artisan install:api` | Laravel 11 (2024) | Single command installs Sanctum + creates api.php routes |
| `config/auth.php` guards for Sanctum | `$middleware->statefulApi()` | Laravel 11 (2024) | Simpler configuration for SPA mode |
| Manual session table migration | Included in default `create_users_table` migration | Laravel 11 (2024) | Sessions table ships by default |
| `Password::defaults()` in service provider | Same, but `secureValidate()` added | Laravel 12 (2025) | Optional convenience; `Password::min()` still standard |

**Deprecated/outdated:**
- `app/Http/Kernel.php`: Does not exist in Laravel 12. Use `bootstrap/app.php`.
- `vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"`: Replaced by `php artisan install:api`.
- `EnsureFrontendRequestsAreStateful` middleware manual registration: Replaced by `$middleware->statefulApi()`.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Pest (bundled with Laravel 12) + PHPUnit |
| Config file | `phpunit.xml` (auto-generated by `composer create-project`) |
| Quick run command | `cd backend && php artisan test --filter=Auth` |
| Full suite command | `cd backend && php artisan test` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFRA-01 | Laravel scaffolded with Sanctum | smoke | `cd backend && php artisan --version` | N/A |
| INFRA-02 | Users table with migrations | integration | `cd backend && php artisan test --filter=UserMigration` | Wave 0 |
| INFRA-03 | CORS allows localhost:5173 | feature | `cd backend && php artisan test --filter=Cors` | Wave 0 |
| INFRA-04 | Sanctum SPA cookie auth works | feature | `cd backend && php artisan test --filter=SanctumConfig` | Wave 0 |
| AUTH-01 | Register with email/password | feature | `cd backend && php artisan test --filter=Registration` | Wave 0 |
| AUTH-02 | Login with email/password | feature | `cd backend && php artisan test --filter=Login` | Wave 0 |
| AUTH-06 | Session persists (cookie-based) | feature | `cd backend && php artisan test --filter=SessionPersistence` | Wave 0 |
| AUTH-07 | Logout destroys session | feature | `cd backend && php artisan test --filter=Logout` | Wave 0 |
| AUTH-08 | Password strength validation | unit | `cd backend && php artisan test --filter=PasswordValidation` | Wave 0 |

### Sampling Rate

- **Per task commit:** `cd backend && php artisan test --filter=Auth`
- **Per wave merge:** `cd backend && php artisan test`
- **Phase gate:** Full suite green before verification

### Wave 0 Gaps

- [ ] `tests/Feature/Auth/RegistrationTest.php` -- covers AUTH-01, AUTH-08
- [ ] `tests/Feature/Auth/LoginTest.php` -- covers AUTH-02, AUTH-06
- [ ] `tests/Feature/Auth/LogoutTest.php` -- covers AUTH-07
- [ ] `tests/Feature/Auth/CorsTest.php` -- covers INFRA-03
- [ ] `tests/Feature/Auth/SanctumConfigTest.php` -- covers INFRA-04
- [ ] Framework config: auto-generated by `composer create-project` (phpunit.xml, Pest config)

## Open Questions

1. **`php artisan install:api` and existing routes**
   - What we know: The command creates `routes/api.php` and the `personal_access_tokens` migration
   - What's unclear: Whether it overwrites any existing api.php if run after manual route setup
   - Recommendation: Run `install:api` first, then customize. Order matters.

2. **Login/register route registration: web.php vs api.php**
   - What we know: Sanctum SPA auth requires `login`, `register`, `logout` routes to be accessible with session/CSRF middleware. In Laravel 12 with `statefulApi()`, the `api` middleware group includes session and CSRF handling for stateful requests.
   - What's unclear: Whether putting login/logout in `api.php` (as `/api/login`) works with Sanctum SPA mode or if they must be in `web.php` (as `/login`)
   - Recommendation: Put auth routes in `api.php` under the `/api` prefix. The `statefulApi()` middleware ensures session handling is applied. Include `api/*` in CORS paths. The ROADMAP success criteria uses `/api/register`, `/api/login`, `/api/logout` paths.

3. **MySQL database creation in Laragon**
   - What we know: Laragon comes with MySQL, accessible via HeidiSQL or command line
   - What's unclear: Whether the database needs manual creation or if `php artisan migrate` handles it
   - Recommendation: Manually create `aqua_tip` database before running migrations. Use Laragon's HeidiSQL or `mysql -u root -e "CREATE DATABASE aqua_tip;"`

## Sources

### Primary (HIGH confidence)
- [Laravel Sanctum 12.x Official Docs](https://laravel.com/docs/12.x/sanctum) - SPA authentication flow, statefulApi middleware, CSRF cookie endpoint, stateful domain configuration
- [Laravel 12.x Installation](https://laravel.com/docs/12.x/installation) - composer create-project, php artisan install:api
- [Laravel 12.x Validation](https://laravel.com/docs/12.x/validation) - Password rule object (min, mixedCase, numbers)
- [Laravel 12.x Session](https://laravel.com/docs/12.x/session) - Database driver, session table migration
- [Laravel 12.x Authentication](https://laravel.com/docs/12.x/authentication) - Auth::attempt, session regeneration, logout

### Secondary (MEDIUM confidence)
- [Cookie-based Authentication with Laravel Sanctum (madewithlove)](https://madewithlove.com/blog/cookie-based-authentication-with-laravel-sanctum/) - Detailed SPA cookie flow walkthrough
- [Laravel 12 Sanctum + React CSRF Token Mismatch (Medium)](https://medium.com/@junaidwaqas509/laravel-12-sanctum-api-and-react-js-solve-csrf-token-mismatch-easily-25048b605e79) - Common CSRF issues and solutions
- [Artisan Commands Reference](https://artisan.page/12.x/installapi) - install:api command details

### Tertiary (LOW confidence)
- None required -- Laravel's official docs cover this phase completely

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Laravel 12 + Sanctum 4.x are stable, well-documented, official packages
- Architecture: HIGH - Cookie-based SPA auth is Sanctum's documented primary use case
- Pitfalls: HIGH - Config format mismatches are the #1 reported issue; well-documented in official docs and community

**Research date:** 2026-03-12
**Valid until:** 2026-04-12 (stable Laravel release cycle, no breaking changes expected)
