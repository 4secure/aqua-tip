# Phase 49: Auth & Session Hardening - Research

**Researched:** 2026-04-11
**Domain:** Laravel 12 authentication, session management, Sanctum token security
**Confidence:** HIGH

## Summary

This phase hardens authentication and session management across five discrete changes in the Laravel 12 backend: (1) set session cookie Secure flag, (2) rename the session cookie to a non-descriptive value, (3) shorten Sanctum token expiry from 7 days to 24 hours, (4) invalidate all tokens and sessions on password reset, and (5) eliminate user/provider enumeration from the forgot-password endpoint by returning a uniform response.

All changes are configuration edits or small controller modifications in well-understood Laravel patterns. No new dependencies are required. The existing test suite (Pest) has tests that must be updated to match the new uniform response behavior.

**Primary recommendation:** Implement as config changes first (session.php, sanctum.php), then controller logic (ForgotPasswordController, ResetPasswordController), then update existing tests to match new behavior.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Forgot-password endpoint returns HTTP 200 with a generic message ("If an account exists with that email, a password reset link has been sent.") for ALL cases -- email found (password user), email not found, and OAuth account. No differentiation.
- **D-02:** Password users receive the actual reset email. OAuth users and non-existent emails silently receive nothing. The HTTP response is identical for all three cases.
- **D-03:** On successful password reset, ALL personal_access_tokens AND ALL database sessions for that user are deleted. Nuclear wipe -- forces re-login everywhere.
- **D-04:** After password reset + token wipe, the user is redirected to the login page. No auto-login -- user must authenticate with their new credentials.
- **D-05:** `SESSION_SECURE_COOKIE` defaults to `true` in `config/session.php` (currently null/unset).
- **D-06:** Session cookie name changed from `aqua-tip-session` to `__session` via `SESSION_COOKIE` env var or config default.
- **D-07:** Sanctum token expiration shortened from 7 days (`60 * 24 * 7`) to 24 hours (`60 * 24`) in `config/sanctum.php`.

### Claude's Discretion
- Exact implementation of session flush (DB query vs Laravel session methods)
- Where to hook the token/session wipe in the password reset flow (controller vs event listener)
- Whether to log the invalidation event for audit purposes

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | SESSION_SECURE_COOKIE defaults to true in config/session.php | Config change at line 172; change `env('SESSION_SECURE_COOKIE')` to `env('SESSION_SECURE_COOKIE', true)` |
| AUTH-02 | Sanctum token expiration shortened from 7 days to 24 hours | Config change at sanctum.php line 49; change `60 * 24 * 7` to `60 * 24` |
| AUTH-03 | All existing tokens invalidated on password reset | Add `$user->tokens()->delete()` + DB session delete in ResetPasswordController callback |
| AUTH-04 | Forgot-password returns uniform response regardless of email/provider status | Rewrite ForgotPasswordController to always return 200 with generic message |
| AUTH-05 | Session cookie name changed to non-descriptive value | Config change at session.php line 130-133; replace dynamic name with `env('SESSION_COOKIE', '__session')` |
</phase_requirements>

## Standard Stack

### Core (already installed -- no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Laravel Framework | 12.54.1 | Backend framework | Already in use |
| Laravel Sanctum | ^4.0 | API token management | Already in use, provides `HasApiTokens` trait |
| Pest | (installed) | Test framework | Already configured in phpunit.xml |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Illuminate\Support\Facades\DB | (bundled) | Direct session table queries | Deleting sessions by user_id |
| Illuminate\Support\Facades\Log | (bundled) | Audit logging | Optional: log token/session invalidation |

**Installation:** No new packages needed. All changes use existing Laravel framework features.

## Architecture Patterns

### Affected Files

```
backend/
  config/
    session.php          # AUTH-01 (secure flag), AUTH-05 (cookie name)
    sanctum.php          # AUTH-02 (token expiry)
  app/Http/Controllers/Auth/
    ForgotPasswordController.php   # AUTH-04 (uniform response)
    ResetPasswordController.php    # AUTH-03 (token/session wipe)
  tests/Feature/Auth/
    PasswordResetTest.php          # Update tests for new behavior
    SanctumConfigTest.php          # Add secure cookie + cookie name tests
```

### Pattern 1: Uniform Error Response (Anti-Enumeration)

**What:** Return identical HTTP status and message body regardless of whether the email exists, belongs to an OAuth user, or is unknown.
**When to use:** Any endpoint where differing responses reveal account existence.

**Current code (VULNERABLE -- reveals information):**
```php
// ForgotPasswordController.php -- lines 18-38
// 1. OAuth user: 422 + "This account uses Google to sign in"  (leaks provider)
// 2. Valid email: 200 + "We have emailed your password reset link"
// 3. Unknown email: 422 + "We can't find a user with that email address"
```

**Fixed pattern:**
```php
public function __invoke(ForgotPasswordRequest $request): JsonResponse
{
    $user = User::where('email', $request->email)->first();

    // Only send reset link to password-based users
    if ($user && !$user->oauth_provider) {
        Password::sendResetLink($request->only('email'));
    }

    // Always return identical response
    return response()->json([
        'message' => 'If an account exists with that email, a password reset link has been sent.',
    ]);
}
```

Key points:
- Always HTTP 200 (not 422 for missing/OAuth users)
- Suppress `Password::sendResetLink()` return value -- do not branch on it
- OAuth users and non-existent emails get the same response but no email is sent

### Pattern 2: Token and Session Nuclear Wipe on Password Reset

**What:** Delete all Sanctum tokens and database sessions for a user after successful password reset.
**When to use:** Password reset flow -- forces re-authentication everywhere.

**Implementation in ResetPasswordController callback:**
```php
function ($user) use ($request) {
    $user->forceFill([
        'password' => Hash::make($request->password),
        'remember_token' => Str::random(60),
    ])->save();

    // Nuclear wipe: invalidate all tokens and sessions
    $user->tokens()->delete();
    DB::table('sessions')->where('user_id', $user->id)->delete();

    event(new PasswordReset($user));
}
```

**Why inline in controller (not event listener):**
- The wipe MUST happen before the response is sent
- Event listeners can be async/queued, creating a race condition
- Keeping it in the controller callback makes the behavior explicit and testable
- Only 2 lines of code -- not enough to justify the indirection of an event listener

### Pattern 3: Config Default Changes

**What:** Change default values in config files while preserving env var overrides.
**Why it matters:** Config files must allow env var override for different environments (local dev may need `secure=false`).

```php
// session.php -- secure flag (AUTH-01)
'secure' => env('SESSION_SECURE_COOKIE', true),  // was: env('SESSION_SECURE_COOKIE')

// session.php -- cookie name (AUTH-05)
'cookie' => env('SESSION_COOKIE', '__session'),  // was: dynamic Str::slug

// sanctum.php -- token expiry (AUTH-02)
'expiration' => env('SANCTUM_TOKEN_EXPIRATION', 60 * 24),  // was: 60 * 24 * 7
```

### Anti-Patterns to Avoid

- **Conditional responses in forgot-password:** Never return different HTTP status codes or messages based on email lookup results. This is user enumeration.
- **Async token wipe:** Do not use event listeners or queued jobs for token/session deletion on password reset. The wipe must complete synchronously before the response.
- **Hardcoding cookie name without env override:** Always preserve `env('SESSION_COOKIE', ...)` to allow environment-specific overrides.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Token deletion | Custom DB query on personal_access_tokens | `$user->tokens()->delete()` | Sanctum's HasApiTokens provides this relationship |
| Session deletion | Custom session invalidation logic | `DB::table('sessions')->where('user_id', $id)->delete()` | Direct DB query on the sessions table is the cleanest approach for database driver |
| Password reset flow | Custom reset token handling | `Password::reset()` and `Password::sendResetLink()` | Laravel's built-in broker handles token generation, validation, and throttling |

## Common Pitfalls

### Pitfall 1: Test Suite Breaks on Uniform Response
**What goes wrong:** Existing tests assert 422 status for OAuth and non-existent emails. After the fix, these will fail.
**Why it happens:** Tests were written for the old (insecure) behavior.
**How to avoid:** Update tests simultaneously with the controller change. Three tests need updating:
- `forgot password returns 422 for oauth-only user with provider message` -- change to assert 200 with generic message
- `forgot password returns 422 for non-existent email` -- change to assert 200 with generic message
- `forgot password sends reset link for email/password user` -- message text changes
**Warning signs:** Test failures in CI after controller change.

### Pitfall 2: SESSION_SECURE_COOKIE=true Breaks Local Development
**What goes wrong:** Local dev uses HTTP (not HTTPS), so setting `secure=true` as default prevents session cookies from being set.
**Why it happens:** The `secure` flag means the cookie is only sent over HTTPS.
**How to avoid:** Set `SESSION_SECURE_COOKIE=false` in local `.env` file. The config change sets the *default* to true, but env var overrides it. Document this in the `.env.example` if one exists.
**Warning signs:** Cannot maintain sessions on localhost after deployment.

### Pitfall 3: Session Driver in Tests is "array"
**What goes wrong:** Tests use `SESSION_DRIVER=array` (from phpunit.xml), so `DB::table('sessions')->where(...)` returns nothing -- the session wipe cannot be tested via actual DB records.
**Why it happens:** PHPUnit overrides the session driver to `array` for speed.
**How to avoid:** Test the token wipe (uses `personal_access_tokens` table, which IS database-backed in tests). For session wipe, test that the DB query is called or accept that it is covered by the token wipe test plus code review. Alternatively, create a focused integration test that temporarily uses the database session driver.
**Warning signs:** Test passes but session wipe code is never actually exercised.

### Pitfall 4: Password::sendResetLink() Throws on Unknown Email
**What goes wrong:** If you call `Password::sendResetLink()` for a non-existent email, it returns `Password::INVALID_USER` but does NOT throw.
**Why it happens:** Misunderstanding the API -- it returns a status string, not an exception.
**How to avoid:** The recommended pattern checks `$user` existence first and only calls `sendResetLink` for valid password users. This avoids the unnecessary broker lookup entirely.

### Pitfall 5: Existing Sessions Not Cleared for Cookie Name Change
**What goes wrong:** Changing the cookie name from `aqua-tip-session` to `__session` means existing browser cookies with the old name become orphaned -- they are still sent but ignored.
**Why it happens:** Cookie name is set server-side; browsers keep the old cookie until it expires.
**How to avoid:** This is harmless -- the old cookie will be ignored and eventually expire. No migration needed. New sessions will use the new cookie name automatically.

## Code Examples

### Config Changes (verified against actual config files)

**session.php line 130-133 (cookie name -- AUTH-05):**
```php
// BEFORE:
'cookie' => env(
    'SESSION_COOKIE',
    Str::slug((string) env('APP_NAME', 'laravel')).'-session'
),

// AFTER:
'cookie' => env('SESSION_COOKIE', '__session'),
```

**session.php line 172 (secure flag -- AUTH-01):**
```php
// BEFORE:
'secure' => env('SESSION_SECURE_COOKIE'),

// AFTER:
'secure' => env('SESSION_SECURE_COOKIE', true),
```

**sanctum.php line 49 (token expiry -- AUTH-02):**
```php
// BEFORE:
'expiration' => env('SANCTUM_TOKEN_EXPIRATION', 60 * 24 * 7),

// AFTER:
'expiration' => env('SANCTUM_TOKEN_EXPIRATION', 60 * 24),
```

### ForgotPasswordController Rewrite (AUTH-04)

```php
public function __invoke(ForgotPasswordRequest $request): JsonResponse
{
    $user = User::where('email', $request->email)->first();

    if ($user && !$user->oauth_provider) {
        Password::sendResetLink($request->only('email'));
    }

    return response()->json([
        'message' => 'If an account exists with that email, a password reset link has been sent.',
    ]);
}
```

### ResetPasswordController Token/Session Wipe (AUTH-03)

```php
use Illuminate\Support\Facades\DB;

// Inside the Password::reset callback:
function ($user) use ($request) {
    $user->forceFill([
        'password' => Hash::make($request->password),
        'remember_token' => Str::random(60),
    ])->save();

    // Invalidate all tokens and sessions
    $user->tokens()->delete();
    DB::table('sessions')->where('user_id', $user->id)->delete();

    event(new PasswordReset($user));
}
```

### Updated Test Assertions

```php
// BEFORE: asserted 422 + provider name
test('forgot password returns uniform response for oauth user', function () {
    User::factory()->create([
        'email' => 'oauthonly@example.com',
        'oauth_provider' => 'google',
        'oauth_id' => '12345',
    ]);

    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->postJson('/api/forgot-password', ['email' => 'oauthonly@example.com']);

    $response->assertOk()
        ->assertJson(['message' => 'If an account exists with that email, a password reset link has been sent.']);
});

// BEFORE: asserted 422
test('forgot password returns uniform response for non-existent email', function () {
    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->postJson('/api/forgot-password', ['email' => 'nobody@example.com']);

    $response->assertOk()
        ->assertJson(['message' => 'If an account exists with that email, a password reset link has been sent.']);
});

// NEW: verify no email sent to OAuth user
test('forgot password does not send reset link to oauth user', function () {
    Notification::fake();

    $user = User::factory()->create([
        'email' => 'oauthonly@example.com',
        'oauth_provider' => 'google',
        'oauth_id' => '12345',
    ]);

    $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->postJson('/api/forgot-password', ['email' => 'oauthonly@example.com']);

    Notification::assertNotSentTo($user, ResetPassword::class);
});

// NEW: verify token wipe on password reset
test('password reset invalidates all user tokens', function () {
    $user = User::factory()->create([
        'email' => 'wipe@example.com',
        'oauth_provider' => null,
    ]);

    // Create a token
    $user->createToken('test-token');
    expect($user->tokens()->count())->toBe(1);

    $token = Password::createToken($user);

    $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->postJson('/api/reset-password', [
            'token' => $token,
            'email' => 'wipe@example.com',
            'password' => 'NewPassword1',
            'password_confirmation' => 'NewPassword1',
        ]);

    expect($user->tokens()->count())->toBe(0);
});
```

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Pest (via PHPUnit, bundled with Laravel 12) |
| Config file | `backend/phpunit.xml` |
| Quick run command | `cd backend && php artisan test --filter=PasswordReset` |
| Full suite command | `cd backend && php artisan test` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Session secure cookie defaults to true | unit | `php artisan test --filter=SanctumConfigTest` | Yes (needs new test) |
| AUTH-02 | Sanctum token expiry is 24h | unit | `php artisan test --filter=SanctumConfigTest` | Yes (needs new test) |
| AUTH-03 | All tokens invalidated on password reset | feature | `php artisan test --filter=PasswordResetTest` | Yes (needs new test) |
| AUTH-04 | Forgot-password uniform response | feature | `php artisan test --filter=PasswordResetTest` | Yes (needs update) |
| AUTH-05 | Cookie name is non-descriptive | unit | `php artisan test --filter=SanctumConfigTest` | Yes (needs new test) |

### Sampling Rate
- **Per task commit:** `cd backend && php artisan test --filter=PasswordReset --filter=SanctumConfig`
- **Per wave merge:** `cd backend && php artisan test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/Feature/Auth/PasswordResetTest.php` -- update 3 existing tests (OAuth 422, non-existent 422, message text), add 2 new tests (no email to OAuth, token wipe)
- [ ] `tests/Feature/Auth/SanctumConfigTest.php` -- add 3 new tests (secure flag default, cookie name default, token expiry value)

## Open Questions

1. **Audit logging for token/session invalidation**
   - What we know: Decision is at Claude's discretion
   - Recommendation: Add a simple `Log::info()` call when tokens/sessions are wiped. Low cost, high value for debugging. Example: `Log::info('Password reset: invalidated tokens and sessions', ['user_id' => $user->id])`

2. **Local dev .env update for SESSION_SECURE_COOKIE**
   - What we know: Changing default to `true` will break local HTTP dev
   - Recommendation: Add `SESSION_SECURE_COOKIE=false` to `.env.example` if it exists. Local `.env` should already override this.

## Sources

### Primary (HIGH confidence)
- `backend/config/session.php` -- verified current config values (lines 130-133, 172)
- `backend/config/sanctum.php` -- verified current expiration value (line 49: `60 * 24 * 7`)
- `backend/app/Http/Controllers/Auth/ForgotPasswordController.php` -- verified enumeration vulnerability (lines 18-38)
- `backend/app/Http/Controllers/Auth/ResetPasswordController.php` -- verified current reset flow (no token wipe)
- `backend/tests/Feature/Auth/PasswordResetTest.php` -- verified tests that need updating
- `backend/tests/Feature/Auth/SanctumConfigTest.php` -- verified existing config tests
- `backend/app/Models/User.php` -- confirmed `HasApiTokens` trait (line 14, 19)
- `backend/database/migrations/0001_01_01_000000_create_users_table.php` -- confirmed sessions table has `user_id` column

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all existing Laravel features
- Architecture: HIGH -- config changes are trivial, controller changes are well-defined patterns
- Pitfalls: HIGH -- verified against actual codebase (test assertions, session driver, cookie behavior)

**Research date:** 2026-04-11
**Valid until:** 2026-05-11 (stable -- Laravel config patterns do not change frequently)
