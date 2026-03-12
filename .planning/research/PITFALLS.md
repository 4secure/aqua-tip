# Domain Pitfalls

**Domain:** Laravel + React SPA Authentication (Sanctum, Socialite, OAuth)
**Project:** AQUA TIP - Threat Intelligence Platform
**Researched:** 2026-03-12

## Critical Pitfalls

Mistakes that cause days of debugging, security vulnerabilities, or architectural rewrites.

### Pitfall 1: Sanctum Cookie Domain / Stateful Domain Misconfiguration

**What goes wrong:** The SPA sends requests to Laravel but always gets 401 Unauthenticated or 419 CSRF Token Mismatch. Everything looks correct in code, but authentication silently fails.

**Why it happens:** Sanctum SPA authentication uses HttpOnly, SameSite=Lax cookies. Three separate config values must be perfectly formatted -- and each has a different format requirement:

| Config | Correct Format | Wrong Format |
|--------|---------------|--------------|
| `SANCTUM_STATEFUL_DOMAINS` | `localhost:5173` (hostname:port, no scheme) | `http://localhost:5173` |
| `SESSION_DOMAIN` | `localhost` (domain only, no port, no scheme) | `localhost:8000` |
| `CORS allowed_origins` | `http://localhost:5173` (full origin, no trailing slash) | `http://localhost:5173/` |

If `SESSION_DOMAIN` is not explicitly set, Laravel creates cookies scoped to the backend's hostname. The SPA then creates its own cookies on its hostname, resulting in two sets of cookies -- and you will not see this in DevTools unless you look carefully.

**Consequences:** Auth appears broken with no clear error. Developers waste hours because the 401/419 errors give no hint about the actual misconfiguration. This is the single most common cause of "Sanctum doesn't work" reports.

**Warning signs:**
- 401 from `/api/user` immediately after successful login
- 419 CSRF Token Mismatch on POST requests
- Two `XSRF-TOKEN` cookies visible in browser DevTools (different domains)
- Auth works in Postman but not from the SPA

**Prevention:**
1. Create a `.env` checklist with exact format requirements for all three values
2. Use same top-level domain for SPA and API (e.g., `localhost` with different ports for dev, subdomains for production)
3. Explicitly set `SESSION_DOMAIN=localhost` in `.env` from day one
4. Add a smoke test that hits `/sanctum/csrf-cookie` then `/api/user` and asserts 200

**Detection:** Automated test on app boot that verifies Sanctum config consistency.

**Phase:** Backend setup (Phase 1). Must be correct before any auth feature works.

**Confidence:** HIGH -- documented extensively in official docs and community reports.

---

### Pitfall 2: Missing CSRF Cookie Request Before Authentication

**What goes wrong:** Login POST returns 419 CSRF Token Mismatch even though CORS is configured correctly.

**Why it happens:** Sanctum SPA auth requires the frontend to first make a GET request to `/sanctum/csrf-cookie` to receive the XSRF-TOKEN cookie. Only then can the SPA make authenticated POST requests. Many developers skip this step or call it once at app boot instead of before each auth action.

**Consequences:** Login/register forms fail silently. The 419 error is misleading -- developers chase CORS issues when the real problem is a missing preflight cookie request.

**Warning signs:**
- 419 errors only on POST/PUT/DELETE, GET requests work fine
- Login works after a page refresh but not on first visit
- Intermittent auth failures

**Prevention:**
1. Create an `api.js` (or axios instance) that always calls `/sanctum/csrf-cookie` before login/register
2. Configure axios globally with `withCredentials: true` and `withXSRFToken: true`
3. Never use `fetch()` raw -- always go through the configured axios instance

```javascript
// Example: auth API helper
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  withXSRFToken: true,
});

async function login(credentials) {
  await apiClient.get('/sanctum/csrf-cookie');
  return apiClient.post('/login', credentials);
}
```

**Phase:** Backend setup + Frontend auth integration (Phase 1-2).

**Confidence:** HIGH -- official Sanctum docs explicitly require this step.

---

### Pitfall 3: OAuth Redirect Flow Breaks in SPA Architecture

**What goes wrong:** Google/GitHub OAuth redirects the user to the Laravel backend callback URL, but the user never returns to the React SPA. Or the user returns but has no session/token.

**Why it happens:** Traditional Socialite flow assumes a monolith: Laravel handles both the redirect and callback, then sets a session. In an SPA architecture, the callback must somehow bridge back to the React app with an auth token. This requires a fundamentally different flow than Socialite's default.

**Consequences:** OAuth login appears to work (user sees Google/GitHub consent screen) but either lands on a blank Laravel route or loses authentication state when returning to the SPA.

**Warning signs:**
- User completes OAuth consent but sees a white page or Laravel JSON response
- OAuth works in monolith test but breaks when SPA is involved
- Token/session is created server-side but SPA has no access to it

**Prevention:**
The correct SPA OAuth flow:
1. SPA opens `/auth/{provider}/redirect` (Laravel route) -- this can be a new window/popup or a full redirect
2. Laravel returns `Socialite::driver($provider)->stateless()->redirect()`
3. Provider redirects to `/auth/{provider}/callback` (Laravel route)
4. Laravel exchanges code for user data, creates/finds user, generates Sanctum token
5. Laravel redirects to SPA URL with token as query parameter: `http://localhost:5173/auth/callback?token=xxx`
6. SPA reads token from URL, stores it, clears URL

Key decisions:
- Use `->stateless()` on Socialite calls (SPA has no server session)
- Never expose `CLIENT_SECRET` to frontend
- Redirect back to SPA URL (not Laravel URL) after callback
- URL-encode any parameters passed back to the SPA

**Phase:** OAuth implementation (Phase 2). Design the flow before writing code.

**Confidence:** HIGH -- well-documented pattern with multiple working examples.

---

### Pitfall 4: Choosing Token Auth vs Cookie Auth (or Mixing Both)

**What goes wrong:** Project starts with token-based auth (storing JWTs in localStorage), then later realizes cookie-based is more secure for SPAs, requiring a rewrite. Or the project mixes both approaches inconsistently.

**Why it happens:** The PROJECT.md mentions "JWT/Sanctum token-based sessions" which suggests token auth. But Sanctum's official recommendation for SPAs is cookie-based session auth, not tokens. These are two fundamentally different mechanisms.

**Consequences:** localStorage tokens are vulnerable to XSS (any script can read them). Cookie-based auth provides HttpOnly cookie protection. Mixing both creates confusing auth state and double the attack surface.

**Warning signs:**
- Storing tokens in localStorage or sessionStorage
- Using `Authorization: Bearer` headers from SPA instead of cookies
- Auth state inconsistency between tabs

**Prevention:**
1. Use Sanctum **cookie-based SPA authentication** for the React SPA (the recommended approach)
2. Use Sanctum **token authentication** only for the OAuth callback flow (to bridge the redirect)
3. After OAuth callback, exchange the token for a cookie session immediately
4. Document the auth strategy in architecture docs before implementation

**Phase:** Architecture decision (before Phase 1). Must be decided upfront.

**Confidence:** HIGH -- Sanctum docs explicitly state cookie auth is preferred for SPAs.

---

### Pitfall 5: IP-Based Rate Limiting is Trivially Bypassable

**What goes wrong:** Rate limiting based on IP address is bypassed by spoofing the `X-Forwarded-For` header, or all users behind a NAT/VPN share the same IP and hit each other's rate limits.

**Why it happens:** The `X-Forwarded-For` header is user-controllable. If Laravel trusts it without validation, attackers can rotate through arbitrary IPs to bypass rate limits. Conversely, corporate networks and mobile carriers route many users through a single IP.

**Consequences:**
- Attackers bypass the 1 lookup/day guest limit trivially
- Legitimate users behind corporate proxies are blocked after one lookup
- Rate limiting provides false sense of security

**Warning signs:**
- Rate limit tests pass locally but fail in production behind a load balancer
- Users report being rate-limited on first request
- Security audit flags IP-based rate limiting as insufficient

**Prevention:**
1. Configure Laravel's `TrustProxies` middleware correctly for your deployment environment
2. In Laragon local dev, use `request()->ip()` directly (no proxy)
3. For production behind a proxy, set `TrustProxies` to trust only your known proxy IPs
4. Implement dual rate limiting: IP for guests + user ID for authenticated users (as specified in requirements)
5. Consider adding fingerprinting (IP + User-Agent) for guest rate limits as a defense-in-depth measure
6. Accept that guest rate limiting is a speed bump, not a wall -- it deters casual abuse but cannot stop determined attackers

**Phase:** Rate limiting implementation (Phase 2-3). Must be tested with proxy simulation.

**Confidence:** HIGH -- well-known security limitation, extensively documented.

---

### Pitfall 6: Email Verification Links Redirect to Backend Instead of SPA

**What goes wrong:** User clicks the email verification link and lands on a Laravel JSON response or a backend URL, not the React SPA.

**Why it happens:** Laravel's default `VerifyEmail` notification generates a URL pointing to the Laravel backend's `/email/verify/{id}/{hash}` route. In an SPA, the user needs to be redirected to the frontend after verification.

**Consequences:** Users see a broken page or raw JSON after clicking the verification link. This is the worst possible first impression for a security-focused platform.

**Warning signs:**
- Email verification link URL points to API domain, not SPA domain
- Clicking verification link shows JSON `{ "message": "Email verified" }`
- User is verified but not redirected to the app

**Prevention:**
1. Override `VerifyEmail::toMailUsing()` in `AuthServiceProvider` to generate a frontend URL
2. The frontend URL should contain the verification parameters: `/verify-email?id={id}&hash={hash}&expires={expires}&signature={signature}`
3. The SPA's verify-email page makes an API call to the backend with these parameters
4. Backend verifies the signature and marks the email as verified
5. SPA redirects to dashboard on success

```php
// In AppServiceProvider::boot()
VerifyEmail::createUrlUsing(function ($notifiable) {
    $backendUrl = URL::temporarySignedRoute(
        'verification.verify',
        now()->addMinutes(60),
        ['id' => $notifiable->getKey(), 'hash' => sha1($notifiable->getEmailForVerification())]
    );
    return config('app.frontend_url') . '/verify-email?verify_url=' . urlencode($backendUrl);
});
```

**Phase:** Email verification implementation (Phase 2). Design the redirect flow before building.

**Confidence:** HIGH -- documented Laravel issue with well-known workaround.

## Moderate Pitfalls

### Pitfall 7: Auth Context Race Conditions on Page Load

**What goes wrong:** React app loads, AuthContext fires a `/api/user` request to check auth state, but the page renders before the response arrives. Protected routes briefly flash login page, or unprotected routes briefly show authenticated UI.

**Why it happens:** The initial auth check is asynchronous. Without a loading state, components render with `user: null` (unauthenticated) before the check completes.

**Prevention:**
1. AuthContext must have three states: `loading`, `authenticated`, `unauthenticated`
2. Show a loading spinner (or skeleton) while `loading` is true
3. Only render route guards after loading completes
4. Persist a minimal auth flag in localStorage as a hint (not for security, just to avoid flash)

```jsx
function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, loading: true });

  useEffect(() => {
    checkAuth().then(user => setState({ user, loading: false }))
                .catch(() => setState({ user: null, loading: false }));
  }, []);

  if (state.loading) return <LoadingScreen />;
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
```

**Phase:** Frontend auth integration (Phase 2).

**Confidence:** HIGH -- standard React pattern, well-documented.

---

### Pitfall 8: Concurrent Request Token Refresh Race Condition

**What goes wrong:** Multiple API requests fire simultaneously when the session is expired. Each detects the 401 and tries to refresh the session independently, causing duplicate refresh attempts or logout.

**Why it happens:** Axios interceptors that catch 401s and retry are not mutex-aware. If three requests all get 401 at the same time, three refresh attempts fire.

**Prevention:**
1. Use a request queue pattern: the first 401 triggers a refresh, subsequent requests wait for it
2. Implement a mutex/lock around the refresh logic
3. With Sanctum cookie auth, this is less severe than with JWT tokens (cookies refresh via `/sanctum/csrf-cookie`), but still needs handling for session expiry

**Phase:** Frontend auth integration (Phase 2).

**Confidence:** MEDIUM -- less critical with cookie auth than with token auth, but still a real issue.

---

### Pitfall 9: CORS Preflight Caching and Credential Misconfiguration

**What goes wrong:** CORS works for simple GET requests but fails for POST/PUT/DELETE. Or CORS works locally but breaks in production.

**Why it happens:** Credentialed requests (`withCredentials: true`) have stricter CORS rules: `Access-Control-Allow-Origin` cannot be `*`, it must be the exact origin. Preflight OPTIONS requests must also return correct headers. Many developers set `allowed_origins` to `['*']` which breaks credentialed requests.

**Prevention:**
1. Set `config/cors.php` `allowed_origins` to the exact SPA origin (not `*`)
2. Set `supports_credentials` to `true`
3. Verify preflight OPTIONS responses include `Access-Control-Allow-Credentials: true`
4. Test with actual browser requests, not Postman (Postman ignores CORS)
5. Different CORS config for dev (localhost:5173) vs production

**Phase:** Backend setup (Phase 1).

**Confidence:** HIGH -- extremely common issue with every CORS + cookie setup.

---

### Pitfall 10: Laragon URL Rewriting and API Route Conflicts

**What goes wrong:** API routes return 404 in Laragon even though `routes/api.php` is correctly defined. Or the SPA's client-side routing conflicts with Laravel's routes.

**Why it happens:** Laragon uses Apache/Nginx with virtual hosts. If URL rewriting is not configured correctly, requests to `/api/*` may not reach Laravel's router. Additionally, if the SPA and API run on the same domain, client-side routes can shadow API routes.

**Prevention:**
1. Run SPA and API on separate ports: `localhost:5173` (Vite) and `localhost:8000` (Laravel)
2. Ensure Laragon's Apache/Nginx has proper `.htaccess` / rewrite rules
3. Prefix all API routes with `/api/` and all auth routes with `/auth/`
4. Verify with `php artisan route:list` that routes are registered
5. Test API routes with curl before connecting the SPA

**Phase:** Backend setup (Phase 1).

**Confidence:** MEDIUM -- specific to Laragon environment.

## Minor Pitfalls

### Pitfall 11: Forgetting to Hash OAuth Tokens Before Storage

**What goes wrong:** OAuth access tokens are stored in plaintext in the database. If the database is compromised, attackers have valid OAuth tokens for all users.

**Prevention:** Never store raw OAuth tokens. Hash them if you need to store them (you likely don't -- Socialite only needs them for the initial user data fetch). Only store the provider name and provider user ID for linking accounts.

**Phase:** OAuth implementation (Phase 2).

---

### Pitfall 12: Not Handling OAuth Account Linking

**What goes wrong:** A user registers with email, then later tries to sign in with Google using the same email. The system creates a duplicate account, or throws a unique constraint error, or silently fails.

**Prevention:**
1. On OAuth callback, check if a user with that email already exists
2. If yes, link the OAuth provider to the existing account (store provider + provider_id)
3. If no, create a new user with the OAuth data
4. Consider: should OAuth bypass email verification? (Recommendation: yes, the email is already verified by Google/GitHub)

**Phase:** OAuth implementation (Phase 2).

---

### Pitfall 13: Midnight UTC Rate Limit Reset Timezone Bug

**What goes wrong:** Rate limits reset at midnight in the server's local timezone instead of UTC, causing inconsistent behavior across environments.

**Prevention:**
1. Explicitly set `config('app.timezone')` to `UTC` in `config/app.php`
2. Store rate limit timestamps in UTC
3. Use `Carbon::now('UTC')` when checking rate limit windows
4. Test rate limit reset logic with explicit timezone assertions

**Phase:** Rate limiting implementation (Phase 2-3).

---

### Pitfall 14: Auth Pages Not Matching Existing Design System

**What goes wrong:** Login/register pages look visibly different from the existing AQUA TIP dark theme, breaking the visual continuity of the platform.

**Prevention:**
1. Extract shared design tokens (colors, fonts, glass effects) into reusable components before building auth pages
2. Use the existing `glassmorphism.css` utilities and `tailwind.config.js` tokens
3. Auth pages should be standalone (no sidebar) like LandingPage, not using AppLayout
4. Test auth pages side-by-side with existing pages for visual consistency

**Phase:** Frontend auth pages (Phase 2).

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Laravel project setup | Sanctum config format mismatches (Pitfall 1) | Use env checklist, smoke test on boot |
| CORS configuration | Wildcard origin breaks credentials (Pitfall 9) | Explicit origin, test with browser not Postman |
| OAuth integration | Redirect lands on backend not SPA (Pitfall 3) | Design full redirect flow before coding |
| Email verification | Verification link goes to API URL (Pitfall 6) | Override VerifyEmail URL generation |
| React auth context | Loading flash / race conditions (Pitfall 7, 8) | Three-state auth context, request queue |
| Rate limiting | IP spoofing bypass (Pitfall 5) | TrustProxies config, dual limiting |
| Auth UI | Design mismatch with existing theme (Pitfall 14) | Reuse existing design tokens |
| Token strategy | Mixing token + cookie auth (Pitfall 4) | Decide cookie-first upfront |

## Sources

- [Laravel SPA Auth: Setup and Common Mistakes](https://cdruc.com/laravel-spa-auth-extended) -- HIGH confidence, detailed config pitfalls
- [Laravel Sanctum Official Docs (12.x)](https://laravel.com/docs/12.x/sanctum) -- HIGH confidence, authoritative
- [Laravel SPA OAuth with GitHub, Socialite, and Sanctum](https://dev.to/medilies/laravel-spa-oauth-using-github-socialite-and-sanctum-p8e) -- MEDIUM confidence, practical walkthrough
- [Cookie-based Authentication with Laravel Sanctum](https://madewithlove.com/blog/cookie-based-authentication-with-laravel-sanctum/) -- MEDIUM confidence
- [Customize Laravel Email Verification URL with SPA](https://wildangunawan.medium.com/customize-laravel-8-email-verification-url-with-your-spa-url-50010479813) -- MEDIUM confidence
- [Beware of X-Forwarded-For Header](https://www.stackhawk.com/blog/do-you-trust-your-x-forwarded-for-header/) -- HIGH confidence, security reference
- [Common Pitfalls in Authentication Token Renewal](https://brainsandbeards.com/blog/2024-token-renewal-mutex/) -- MEDIUM confidence, race condition patterns
- [Laravel Email Verification Docs (12.x)](https://laravel.com/docs/12.x/verification) -- HIGH confidence, authoritative
- [Secure SPA Authentication with React and Laravel Sanctum](https://kaisalhusrom.com/en/posts/react-laravel-sanctum-csrf-authentication) -- MEDIUM confidence
- [Laravel Sanctum CORS Issue Discussion](https://laracasts.com/discuss/channels/laravel/laravel-sanctum-cors-issue) -- MEDIUM confidence, community reports
