# Architecture Patterns

**Domain:** Laravel + React SPA Authentication System
**Researched:** 2026-03-12

## Recommended Architecture

### Overview

A cookie-based SPA authentication system where the React frontend (Vite dev server on port 5173) communicates with a Laravel API backend (port 8000) using Sanctum's stateful session cookies for authentication. OAuth flows are server-initiated but frontend-completed. Rate limiting uses Laravel's built-in RateLimiter with database-backed cache for persistence across restarts.

**Key architectural decision:** Use Sanctum's **cookie/session mode** (not API tokens) for the SPA. This means HTTP-only cookies handle auth state automatically -- no tokens in localStorage, no XSS vulnerability from token theft. The OAuth flow is the one exception: Socialite redirects happen through the Laravel backend, but the session cookie is set on callback completion, keeping the same cookie-based pattern.

```
+------------------+          +-------------------+          +----------+
|   React SPA      |  HTTP    |   Laravel API     |          | MySQL    |
|   (Vite :5173)   | -------> |   (:8000)         | -------> |          |
|                   | <------- |                   | <------- |          |
|  - Auth Context   | cookies  |  - Sanctum        |  queries |  - users |
|  - Route Guards   | + CSRF   |  - Socialite      |          |  - rate  |
|  - Auth Pages     |          |  - RateLimiter    |          |    limits|
|  - IOC Search     |          |  - Mail           |          |  - PATs  |
+------------------+          +-------------------+          +----------+
                                      |
                                      | OAuth redirect
                                      v
                              +-------------------+
                              | Google / GitHub    |
                              | OAuth Servers      |
                              +-------------------+
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **React Auth Context** | Stores user state, exposes login/logout/register functions, checks auth on mount | Laravel API (`/api/user`, `/login`, `/logout`, `/register`) |
| **React Route Guards** | Wraps protected routes, redirects unauthenticated users to `/login` | Auth Context (reads user state) |
| **React Auth Pages** | Login, Register, Email Verification -- standalone full-screen pages | Laravel API (form submissions), OAuth redirect endpoints |
| **React IOC Search** | Submits IOC queries, handles rate limit responses | Laravel API (`/api/ioc-search`), displays rate limit CTA |
| **Laravel Sanctum** | Issues session cookies, validates CSRF tokens, authenticates requests | MySQL (sessions table), React SPA (via cookies) |
| **Laravel Socialite** | Redirects to OAuth providers, handles callbacks, creates/links users | Google/GitHub OAuth servers, MySQL (users table) |
| **Laravel Auth Controllers** | Login, register, email verify, logout, OAuth redirect/callback | Sanctum, Socialite, Mail, MySQL |
| **Laravel Rate Limiter** | Tracks IOC search usage per IP (guests) and per user ID (auth users) | Cache/database, applied as middleware on IOC endpoint |
| **Laravel Mail** | Sends email verification links | SMTP/Mailgun/etc., triggered on registration |
| **MySQL Database** | Stores users, OAuth provider links, sessions, rate limit counters | Laravel models via Eloquent |

### Data Flow

#### Flow 1: Email/Password Login

```
1. SPA loads login page
2. SPA calls GET /sanctum/csrf-cookie
   -> Laravel sets XSRF-TOKEN cookie (HttpOnly=false so JS can read it)
   -> Laravel sets laravel_session cookie (HttpOnly=true)
3. User fills form, SPA sends POST /login with credentials
   -> Axios auto-includes X-XSRF-TOKEN header from cookie
   -> Laravel validates CSRF, authenticates credentials
   -> Laravel regenerates session, returns 200
4. SPA calls GET /api/user to fetch authenticated user profile
   -> Session cookie auto-included by browser
   -> Laravel returns user JSON
5. Auth Context stores user, React Router allows protected routes
```

#### Flow 2: OAuth Login (Google/GitHub)

```
1. User clicks "Sign in with Google" on login page
2. SPA navigates browser to: GET /auth/google/redirect (full page navigation, NOT fetch)
   -> Laravel Socialite redirects to Google's consent screen
3. User authorizes at Google
4. Google redirects to: GET /auth/google/callback?code=XXXXX
   -> Laravel Socialite exchanges code for access token (server-to-server)
   -> Laravel fetches Google profile (email, name, avatar)
   -> Laravel finds or creates user in DB, links OAuth provider
   -> Laravel logs user into session (Auth::login($user))
   -> Laravel redirects to SPA URL (e.g., http://localhost:5173/dashboard)
5. SPA loads, Auth Context calls GET /api/user
   -> Session cookie present from step 4 redirect
   -> User is authenticated
```

**Critical detail:** The OAuth callback is a **web route** (not API), so it can set session cookies and redirect. The SPA redirect URL after OAuth must be a known frontend route.

#### Flow 3: Email Registration + Verification

```
1. SPA sends POST /register (name, email, password, password_confirmation)
   -> Laravel creates user with hashed password
   -> Laravel sends verification email (MustVerifyEmail)
   -> Laravel logs user in but marks email unverified
   -> Returns 201
2. Auth Context stores user with email_verified_at = null
3. Route Guard checks email_verified_at before allowing protected routes
   -> If null, shows "Check your email" interstitial page
4. User clicks link in email: GET /verify-email/{id}/{hash}
   -> Laravel verifies hash, sets email_verified_at
   -> Redirects to SPA login or dashboard
5. SPA detects verification, grants full access
```

#### Flow 4: Rate-Limited IOC Search

```
1. SPA sends POST /api/ioc-search with query
   -> Request includes session cookie (if authenticated) or no cookie (guest)
2. Laravel rate limit middleware checks:
   -> If authenticated: RateLimiter::for('ioc-search') keyed by user ID, limit 10/day
   -> If guest: keyed by IP address, limit 1/day
   -> Reset at midnight UTC
3a. If under limit: process search, return results, include X-RateLimit-Remaining header
3b. If over limit: return 429 with Retry-After header
4. SPA reads response:
   -> 429 for guest: shows "Sign in for more lookups" CTA
   -> 429 for auth user: shows "Daily limit reached, resets at midnight UTC"
   -> 200: renders results, shows remaining count from header
```

## Patterns to Follow

### Pattern 1: Sanctum Cookie-Based SPA Auth (not API tokens)

**What:** Use Sanctum's stateful/session authentication mode where the browser manages cookies automatically. No tokens stored in JavaScript.

**When:** Always for this project. The React SPA and Laravel API share a top-level domain in both dev and production.

**Why:** HTTP-only session cookies cannot be read by JavaScript, making XSS attacks unable to steal auth credentials. CSRF protection is built-in.

**Configuration:**
```php
// config/sanctum.php
'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS',
    'localhost,localhost:5173,127.0.0.1,127.0.0.1:8000'
)),

// config/cors.php
'paths' => ['api/*', 'sanctum/csrf-cookie', 'login', 'logout', 'register'],
'supports_credentials' => true,

// bootstrap/app.php
->withMiddleware(function (Middleware $middleware) {
    $middleware->statefulApi();
})
```

**Frontend:**
```javascript
// api/axios.js - configure once
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  withCredentials: true,      // send cookies cross-origin
  withXSRFToken: true,        // auto-read XSRF-TOKEN cookie
  headers: {
    'Accept': 'application/json',
  },
});

export default api;
```

### Pattern 2: Auth Context Provider

**What:** A React context that holds user state, exposes auth methods, and checks authentication on app mount.

**When:** Wrap the entire app. Every component that needs auth state reads from this context.

**Example:**
```jsx
// contexts/AuthContext.jsx
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if already authenticated on mount
    api.get('/api/user')
      .then(res => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    await api.get('/sanctum/csrf-cookie');
    await api.post('/login', { email, password });
    const { data } = await api.get('/api/user');
    setUser(data);
  };

  const logout = async () => {
    await api.post('/logout');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

### Pattern 3: Route Protection with Layout Nesting

**What:** Use React Router's layout routes to enforce auth at the layout boundary, not per-page.

**When:** All routes inside AppLayout require authentication (except `/ioc-search` which is public but rate-limited).

**Example:**
```jsx
// components/auth/ProtectedRoute.jsx
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.email_verified_at) return <Navigate to="/verify-email" replace />;
  return children;
}

// In App.jsx routing
<Route path="/login" element={<LoginPage />} />
<Route path="/register" element={<RegisterPage />} />
<Route path="/" element={<LandingPage />} />
<Route path="/ioc-search" element={<AppLayout />}>
  <Route index element={<IocSearchPage />} />  {/* public but rate-limited */}
</Route>
<Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
  <Route path="/dashboard" element={<DashboardPage />} />
  {/* ... all other protected routes */}
</Route>
```

### Pattern 4: OAuth via Full Page Navigation (not AJAX)

**What:** OAuth login buttons navigate the browser to a Laravel web route, not an API call. Laravel handles the full redirect chain.

**When:** Always for OAuth. The OAuth authorization code flow requires browser redirects that cannot happen in fetch/AJAX.

**Why:** OAuth providers redirect with query parameters. Socialite needs to handle this server-side. The callback sets a session cookie and redirects back to the SPA.

**Laravel routes:**
```php
// routes/web.php
Route::get('/auth/{provider}/redirect', [OAuthController::class, 'redirect']);
Route::get('/auth/{provider}/callback', [OAuthController::class, 'callback']);
```

**Frontend:**
```jsx
// Just a plain link or window.location -- NOT fetch
<a href={`${API_URL}/auth/google/redirect`}>Sign in with Google</a>
```

### Pattern 5: Dual-Key Rate Limiting

**What:** Rate limit IOC searches by user ID for authenticated users, by IP for guests. Different limits for each.

**When:** Applied as middleware on the IOC search endpoint only.

**Laravel:**
```php
// app/Providers/AppServiceProvider.php (boot method)
RateLimiter::for('ioc-search', function (Request $request) {
    return $request->user()
        ? Limit::perDay(10)->by('user:' . $request->user()->id)
        : Limit::perDay(1)->by('ip:' . $request->ip());
});

// routes/api.php
Route::post('/ioc-search', [IocSearchController::class, 'search'])
    ->middleware('throttle:ioc-search');
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Storing Tokens in localStorage

**What:** Using Sanctum API tokens (`createToken()`) and storing the plaintext token in localStorage or sessionStorage.

**Why bad:** Any XSS vulnerability lets an attacker steal the token and impersonate the user from any device. Cookies with HttpOnly flag are immune to this.

**Instead:** Use Sanctum's cookie/session mode. The browser manages cookies automatically. No JavaScript ever touches the auth credential.

### Anti-Pattern 2: OAuth via AJAX/fetch

**What:** Trying to handle the OAuth redirect flow through JavaScript fetch calls.

**Why bad:** OAuth requires browser-level redirects to the provider's domain. CORS blocks cross-origin redirects from fetch. The authorization code needs to arrive at a server-controlled callback URL.

**Instead:** Use `window.location.href` or `<a>` tags to navigate to the Laravel OAuth redirect route. Let the browser handle the full redirect chain.

### Anti-Pattern 3: CSRF Token in Meta Tag for SPA

**What:** Rendering a CSRF token in a Blade meta tag and reading it from JavaScript, as is common in traditional Laravel apps.

**Why bad:** In an SPA served by Vite (not Laravel), there is no Blade template to render the token. The CSRF cookie approach is designed specifically for this case.

**Instead:** Call `/sanctum/csrf-cookie` before any state-changing request. Axios reads the XSRF-TOKEN cookie automatically.

### Anti-Pattern 4: Checking Auth State Only on Route Change

**What:** Only checking if the user is authenticated when navigating between routes.

**Why bad:** Session can expire mid-use. API calls will fail with 401/419 but the UI still shows authenticated state.

**Instead:** Add an Axios response interceptor that catches 401/419 errors and clears auth state, redirecting to login. This handles session expiry gracefully regardless of when it happens.

### Anti-Pattern 5: Single Rate Limit Table with IP Column

**What:** Building a custom `rate_limits` table to track usage instead of using Laravel's built-in cache-backed RateLimiter.

**Why bad:** Reinvents what Laravel already provides. Custom table needs cleanup jobs, has race conditions without locking, and duplicates framework functionality.

**Instead:** Use `RateLimiter::for()` with Laravel's cache system. For persistence across server restarts, set `CACHE_DRIVER=database` or `CACHE_DRIVER=redis`. The `cache` table migration is a single artisan command.

## Component Architecture: Laravel Backend

```
backend/
  app/
    Http/
      Controllers/
        Auth/
          LoginController.php          # POST /login
          RegisterController.php       # POST /register
          LogoutController.php         # POST /logout
          OAuthController.php          # OAuth redirect + callback
          EmailVerificationController.php  # Verify email + resend
        IocSearchController.php        # POST /api/ioc-search (rate-limited)
      Middleware/
        (Sanctum middleware via statefulApi() -- no custom middleware needed)
    Models/
      User.php                         # MustVerifyEmail, HasApiTokens
    Providers/
      AppServiceProvider.php           # Rate limiter definitions
  config/
    sanctum.php                        # Stateful domains
    cors.php                           # SPA origin, credentials
    session.php                        # Cookie domain, lifetime (7 days)
  database/
    migrations/
      create_users_table.php           # + oauth_provider, oauth_id columns
      create_cache_table.php           # For rate limiting persistence
      create_sessions_table.php        # Database session driver
  routes/
    web.php                            # OAuth redirect/callback routes
    api.php                            # Auth + IOC search API routes
```

## Component Architecture: React Frontend Additions

```
frontend/src/
  api/
    axios.js                           # Configured Axios instance
  contexts/
    AuthContext.jsx                     # Auth state + methods
  hooks/
    useAuth.js                         # Convenience hook for AuthContext
  pages/
    LoginPage.jsx                      # Standalone (no sidebar)
    RegisterPage.jsx                   # Standalone (no sidebar)
    VerifyEmailPage.jsx                # Standalone interstitial
  components/
    auth/
      ProtectedRoute.jsx              # Auth + email verification guard
      OAuthButtons.jsx                # Google + GitHub sign-in buttons
      LoginForm.jsx                   # Email/password form
      RegisterForm.jsx                # Registration form
```

## Database Schema

```
users
  id              BIGINT UNSIGNED PK AUTO_INCREMENT
  name            VARCHAR(255)
  email           VARCHAR(255) UNIQUE
  email_verified_at  TIMESTAMP NULL
  password        VARCHAR(255) NULL       -- NULL for OAuth-only users
  oauth_provider  VARCHAR(50) NULL        -- 'google', 'github', NULL
  oauth_id        VARCHAR(255) NULL       -- provider's user ID
  avatar_url      VARCHAR(500) NULL       -- from OAuth profile
  remember_token  VARCHAR(100) NULL
  created_at      TIMESTAMP
  updated_at      TIMESTAMP

sessions
  id              VARCHAR(255) PK
  user_id         BIGINT UNSIGNED NULL (FK)
  ip_address      VARCHAR(45) NULL
  user_agent      TEXT NULL
  payload         LONGTEXT
  last_activity   INT

cache
  key             VARCHAR(255) PK
  value           MEDIUMTEXT
  expiration      INT

cache_locks
  key             VARCHAR(255) PK
  owner           VARCHAR(255)
  expiration      INT
```

**Note on OAuth user linking:** Using `oauth_provider` + `oauth_id` columns directly on the users table (not a separate `social_accounts` pivot table) because the requirements only support Google and GitHub, and a user won't link multiple providers. If multi-provider linking becomes needed later, extract to a pivot table.

## Suggested Build Order

Based on component dependencies, the backend and frontend have a clear dependency chain:

### Phase 1: Laravel Foundation (backend, no frontend changes)

1. **Laravel project scaffolding** -- `composer create-project`, configure `.env` with MySQL
2. **Database migrations** -- users (with OAuth columns), sessions, cache tables
3. **Sanctum configuration** -- install, configure stateful domains, CORS, session
4. **Email/password auth** -- register, login, logout controllers + routes
5. **Email verification** -- MustVerifyEmail trait, mail config, verify routes

**Rationale:** Everything else depends on the Laravel project existing with working auth.

### Phase 2: OAuth Integration (backend, still no frontend changes)

6. **Socialite setup** -- install, configure Google + GitHub providers
7. **OAuth controller** -- redirect and callback routes, user creation/linking
8. **Test OAuth flow** via browser directly (hitting Laravel routes manually)

**Rationale:** OAuth builds on the auth foundation from Phase 1. Test it independently before the SPA touches it.

### Phase 3: Rate Limiting (backend)

9. **Rate limiter definition** -- `RateLimiter::for('ioc-search')` with dual-key logic
10. **IOC search endpoint** -- POST `/api/ioc-search` with throttle middleware
11. **Midnight UTC reset** -- configure rate limiter decay to align with UTC day boundary

**Rationale:** Rate limiting is independent of auth pages but depends on the auth system being in place to distinguish guests from users.

### Phase 4: Frontend Auth Integration

12. **Axios instance** -- configured with `withCredentials`, `withXSRFToken`, base URL
13. **Auth Context** -- provider with user state, login/logout/register methods
14. **Auth pages** -- LoginPage, RegisterPage, VerifyEmailPage (matching design system)
15. **Route restructuring** -- ProtectedRoute wrapper, public vs protected route split
16. **OAuth buttons** -- links to Laravel OAuth redirect routes
17. **401/419 interceptor** -- Axios response interceptor for session expiry

**Rationale:** Frontend auth cannot be built or tested without the backend running. Auth context must exist before route guards. Auth pages must exist before route restructuring.

### Phase 5: Rate Limit UI

18. **IOC search integration** -- wire IocSearchPage to `/api/ioc-search` endpoint
19. **Rate limit feedback** -- handle 429 responses, show appropriate CTA
20. **Remaining count display** -- read X-RateLimit-Remaining header

**Rationale:** Rate limit UI depends on both the backend rate limiter (Phase 3) and frontend auth context (Phase 4) being in place.

## Scalability Considerations

| Concern | Current (dev) | At 1K users | At 100K users |
|---------|--------------|-------------|---------------|
| Session storage | Database driver | Database is fine | Move to Redis driver |
| Rate limit cache | Database cache | Database is fine | Move to Redis cache |
| OAuth callback load | Synchronous | Fine | Queue email sends, async user creation |
| CORS complexity | Single origin | Single origin | Multiple origins need config array |

## Sources

- [Laravel Sanctum Official Docs (12.x)](https://laravel.com/docs/12.x/sanctum) -- HIGH confidence, primary authority on SPA cookie auth flow
- [Laravel Socialite Official Docs (12.x)](https://laravel.com/docs/12.x/socialite) -- HIGH confidence, OAuth provider integration
- [Laravel Rate Limiting (12.x)](https://laravel.com/docs/12.x/rate-limiting) -- HIGH confidence, built-in rate limiter
- [Laravel SPA OAuth with GitHub, Socialite and Sanctum (DEV Community)](https://dev.to/medilies/laravel-spa-oauth-using-github-socialite-and-sanctum-p8e) -- MEDIUM confidence, community implementation reference
- [Secure SPA Authentication with React and Laravel Sanctum](https://kaisalhusrom.com/en/posts/react-laravel-sanctum-csrf-authentication) -- MEDIUM confidence, CSRF cookie flow detail
- [Building Enterprise-Grade Laravel 12 + React SPA (DEV Community)](https://dev.to/mmurtuzah/building-an-enterprise-grade-laravel-12-react-spa-architecture-auth-and-full-crud-2a23) -- MEDIUM confidence, architecture patterns
