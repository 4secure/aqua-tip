# Phase 2: OAuth + Email Verification - Research

**Researched:** 2026-03-13
**Domain:** Laravel 12 OAuth (Socialite), Email Verification, Password Reset for SPA
**Confidence:** HIGH

## Summary

Phase 2 builds on the existing Phase 1 foundation (Sanctum SPA auth, SocialAuthController, User model with MustVerifyEmail) to complete OAuth sign-in flows, email verification enforcement, and password reset. The codebase is already well-prepared: SocialAuthController has full redirect/callback logic, the User model implements MustVerifyEmail, the `password_reset_tokens` table exists, and OAuth columns are migrated.

The primary work involves: (1) dispatching the `Registered` event from RegisterController so verification emails fire automatically, (2) adding `verified` middleware enforcement to protected API routes, (3) creating forgot-password/reset-password API endpoints using Laravel's Password broker, (4) customizing email notification URLs to point to the SPA frontend, and (5) comprehensive Pest tests with mocked Socialite.

**Primary recommendation:** Use Laravel's built-in Password broker, VerifyEmail notification, and Registered event -- do not hand-roll any token generation, email sending, or verification logic. Customize only the URL generation to point to the SPA frontend.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Password reset: SPA-friendly flow (POST /api/forgot-password sends email with link pointing to frontend /reset-password?token=xxx&email=yyy, frontend POSTs to /api/reset-password)
- After reset: redirect to login page with success message (not auto-login) -- security-first
- Rate limit: 1 forgot-password request per minute per email (Laravel built-in password broker throttle)
- Reset token validity: 60 minutes (Laravel default, already configured in auth.php)
- Branded email: "AQUA TIP" name, logo reference, dark theme styling
- OAuth callback in routes/web.php (already done)
- Auto-link: OAuth email matching existing email/password account merges automatically (already implemented in SocialAuthController)
- Always redirect to /dashboard after OAuth success (already implemented)
- OAuth errors: redirect to /login?error=encoded_message (already implemented)
- OAuth users who try "Forgot Password": show "Use [provider] to sign in" message
- OAuth users cannot set a password in v1
- RegisterController must send verification email after creating user
- Protected API routes enforce `verified` middleware -- unverified users get 403
- OAuth users auto-verified (email_verified_at => now()) -- already implemented
- Mock Socialite in tests (Socialite::shouldReceive())
- Pest test framework

### Claude's Discretion
- Exact email template HTML/design within the branded constraint
- Verification email resend endpoint design
- Test structure and assertion granularity

### Deferred Ideas (OUT OF SCOPE)
- 30-day free trial + paid plans (separate phase)
- OAuth users setting a password (future settings feature)
- Intended URL preservation after OAuth (Phase 4)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-03 | User can sign in with Google OAuth via Socialite | SocialAuthController already implemented with redirect/callback. Needs Pest tests with mocked Socialite. |
| AUTH-04 | User can sign in with GitHub OAuth via Socialite | Same controller handles both providers. Needs Pest tests with mocked Socialite. |
| AUTH-05 | User receives email verification link after signup and must verify before accessing protected routes | Add `event(new Registered($user))` to RegisterController, add `verified` middleware to protected routes, customize VerifyEmail URL for SPA, add resend endpoint. |
| AUTH-09 | User can reset password via email link | Create ForgotPasswordController and ResetPasswordController using Password facade, customize ResetPassword URL for SPA frontend. |
</phase_requirements>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| laravel/framework | ^12.0 | Password broker, email verification, notifications | Built-in auth features, no extra packages needed |
| laravel/sanctum | ^4.0 | SPA cookie-based auth | Already configured and working |
| laravel/socialite | ^5.25 | Google/GitHub OAuth | Already installed and SocialAuthController built |
| pestphp/pest | ^3.8 | Testing framework | Already established in Phase 1 |
| mockery/mockery | ^1.6 | Mock Socialite in tests | Already in dev dependencies |

### Supporting (No New Dependencies)
No new packages required. Laravel 12's built-in features cover everything:
- `Illuminate\Auth\Events\Registered` -- triggers verification email
- `Illuminate\Support\Facades\Password` -- password reset broker
- `Illuminate\Auth\Notifications\VerifyEmail` -- verification email notification
- `Illuminate\Auth\Notifications\ResetPassword` -- password reset notification
- `Illuminate\Foundation\Auth\EmailVerificationRequest` -- signed URL verification
- `Illuminate\Auth\Middleware\EnsureEmailIsVerified` -- `verified` middleware alias

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual Password broker | Laravel Fortify | Fortify adds routes/controllers automatically but reduces control; manual approach matches existing invokable controller pattern |
| Manual email templates | Laravel starter kits (Breeze) | Starter kits scaffold entire auth UI; this project already has custom controllers |

**Installation:**
```bash
# No new packages needed -- all dependencies already installed
```

## Architecture Patterns

### Recommended Project Structure
```
backend/
  app/Http/Controllers/Auth/
    RegisterController.php           # MODIFY: add Registered event dispatch
    SocialAuthController.php         # EXISTS: no changes needed
    ForgotPasswordController.php     # NEW: POST /api/forgot-password
    ResetPasswordController.php      # NEW: POST /api/reset-password
    VerifyEmailController.php        # NEW: GET /api/email/verify/{id}/{hash}
    ResendVerificationController.php # NEW: POST /api/email/verification-notification
  app/Http/Requests/Auth/
    ForgotPasswordRequest.php        # NEW: validates email
    ResetPasswordRequest.php         # NEW: validates token, email, password
  app/Providers/
    AppServiceProvider.php           # MODIFY: customize VerifyEmail + ResetPassword URLs
  routes/
    api.php                          # MODIFY: add password reset + verification routes
  tests/Feature/Auth/
    EmailVerificationTest.php        # NEW
    PasswordResetTest.php            # NEW
    OAuthTest.php                    # NEW
```

### Pattern 1: Invokable Single-Action Controllers
**What:** Each auth action gets its own controller with `__invoke()` method
**When to use:** Matches the established Phase 1 pattern (RegisterController, LoginController, LogoutController)
**Example:**
```php
// Source: Existing project pattern from Phase 1
class ForgotPasswordController extends Controller
{
    public function __invoke(ForgotPasswordRequest $request): JsonResponse
    {
        $status = Password::sendResetLink($request->only('email'));

        return $status === Password::ResetLinkSent
            ? response()->json(['message' => __($status)])
            : response()->json(['message' => __($status)], 422);
    }
}
```

### Pattern 2: SPA-Friendly URL Customization
**What:** Override notification URL generation to point to frontend routes
**When to use:** Email verification and password reset links must open the SPA, not Laravel backend
**Example:**
```php
// Source: Laravel 12 official docs (verification + passwords)
// In AppServiceProvider::boot()

use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Auth\Notifications\ResetPassword;

// Verification email points to frontend
VerifyEmail::createUrlUsing(function (object $notifiable, string $url) {
    $frontendUrl = config('services.frontend_url');
    return $frontendUrl . '/verify-email?verify_url=' . urlencode($url);
});

// Password reset email points to frontend
ResetPassword::createUrlUsing(function (User $user, string $token) {
    $frontendUrl = config('services.frontend_url');
    return $frontendUrl . '/reset-password?token=' . $token . '&email=' . urlencode($user->email);
});
```

### Pattern 3: Registered Event for Automatic Verification Email
**What:** Dispatch `Registered` event after user creation to trigger verification email
**When to use:** RegisterController creates user but currently skips verification
**Example:**
```php
// Source: Laravel 12 official docs (verification)
use Illuminate\Auth\Events\Registered;

// In RegisterController::__invoke()
$user = User::create([...]);
event(new Registered($user));
Auth::login($user);
```

### Pattern 4: OAuth-Aware Forgot Password
**What:** Check if user is OAuth-only before sending password reset
**When to use:** Prevent OAuth users from requesting password resets they cannot use
**Example:**
```php
// In ForgotPasswordController
$user = User::where('email', $request->email)->first();

if ($user && $user->oauth_provider && is_null($user->password)) {
    // Actually OAuth users DO have a random password set, so check oauth_provider
    return response()->json([
        'message' => "This account uses {$user->oauth_provider} sign-in. Please use {$user->oauth_provider} to log in."
    ], 422);
}
```

Note: OAuth users in this system have `oauth_provider` set and a random bcrypt password. The check should be on `oauth_provider` being non-null, not on password being null.

### Anti-Patterns to Avoid
- **Hand-rolling token generation for password reset:** Laravel's Password broker handles token creation, hashing, storage, expiry, and throttling. Never build custom token logic.
- **Skipping signed URLs for email verification:** The `EmailVerificationRequest` validates signed URLs automatically. Don't build custom hash verification.
- **Using `stateless()` for OAuth callback when session is needed:** The callback route is in web.php specifically because `Auth::login()` and `$request->session()->regenerate()` need the session middleware. The redirect route can use `stateless()` since it only returns a URL.
- **Auto-login after password reset:** The user decision explicitly requires redirect to login with success message, not auto-login. This is a security-first choice for a threat intel platform.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password reset tokens | Custom token table/generation | `Password::sendResetLink()` + `Password::reset()` | Handles hashing, expiry (60min), throttle (60s), cleanup |
| Email verification | Custom verification tokens | `event(new Registered($user))` + `EmailVerificationRequest` | Signed URLs with expiry, auto-dispatches via Registered event listener |
| Verification URL signing | Manual HMAC generation | `VerifyEmail::createUrlUsing()` | Laravel's signed routes handle tamper-proof URLs |
| Reset URL customization | String manipulation on defaults | `ResetPassword::createUrlUsing()` | Clean API, works with all notification channels |
| Throttling forgot-password | Custom rate limit middleware | `config/auth.php` `throttle => 60` | Password broker has built-in throttle |
| Socialite user mocking | Real OAuth credentials in tests | `Socialite::shouldReceive('driver')` chain | No external dependencies, fast, deterministic |

**Key insight:** Laravel 12 provides a complete, security-audited auth pipeline. Every component (token generation, URL signing, throttling, email dispatch) is built-in. The only customization needed is URL generation to point to the SPA frontend.

## Common Pitfalls

### Pitfall 1: Missing Registered Event Dispatch
**What goes wrong:** User registers but never receives verification email
**Why it happens:** RegisterController creates user and logs them in but never fires `event(new Registered($user))`. The `SendEmailVerificationNotification` listener only fires on this event.
**How to avoid:** Add `event(new Registered($user))` immediately after `User::create()` in RegisterController
**Warning signs:** Registration works but email_verified_at stays null and no email appears in log

### Pitfall 2: Verification Route Not Using Signed Middleware
**What goes wrong:** Anyone can verify any email by guessing the user ID
**Why it happens:** Forgetting to add `signed` middleware to the verification route
**How to avoid:** Use `->middleware(['auth:sanctum', 'signed'])` on the verify route, or use `EmailVerificationRequest` which validates the signature automatically
**Warning signs:** Verification works without the hash parameter matching

### Pitfall 3: OAuth Callback Session Issues
**What goes wrong:** `Auth::login()` fails silently or session is not created
**Why it happens:** Callback route placed in api.php instead of web.php, so session middleware is not applied
**How to avoid:** Keep callback route in web.php (already done correctly in this project)
**Warning signs:** OAuth redirects work but user is not authenticated after callback

### Pitfall 4: SPA Verification Link Points to Backend
**What goes wrong:** User clicks verification link and sees raw JSON or Laravel welcome page
**Why it happens:** Default VerifyEmail notification generates a URL pointing to the Laravel backend route, not the SPA frontend
**How to avoid:** Use `VerifyEmail::createUrlUsing()` in AppServiceProvider to generate frontend URLs
**Warning signs:** Verification email contains http://localhost:8000/... instead of http://localhost:5173/...

### Pitfall 5: Forgot Password for OAuth-Only Users
**What goes wrong:** OAuth user requests password reset, receives email, but reset is meaningless (they have a random password)
**Why it happens:** No check for oauth_provider before sending reset link
**How to avoid:** Check `$user->oauth_provider` before calling `Password::sendResetLink()` and return helpful error message
**Warning signs:** OAuth users can request password resets without error

### Pitfall 6: MAIL_MAILER=log in Development
**What goes wrong:** Developer thinks emails are not being sent
**Why it happens:** .env has `MAIL_MAILER=log` -- emails go to `storage/logs/laravel.log` not an inbox
**How to avoid:** Document that verification/reset emails appear in `storage/logs/laravel.log` during development. For visual testing, switch to Mailpit or Mailtrap.
**Warning signs:** "I registered but didn't get an email"

### Pitfall 7: Existing Registration Tests Break
**What goes wrong:** RegistrationTest expectations fail after adding email verification
**Why it happens:** If `verified` middleware is added broadly, the authenticated user in registration tests may be blocked. Also, the test currently asserts 201 status which should still work since login happens before verification is enforced.
**How to avoid:** Ensure registration endpoint itself does NOT require `verified` middleware. Only protected feature routes require it. Update tests if response format changes.
**Warning signs:** Existing RegistrationTest.php tests fail after changes

## Code Examples

### ForgotPasswordController (Invokable)
```php
// Source: Laravel 12 docs (passwords) + project pattern
<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Password;

class ForgotPasswordController extends Controller
{
    public function __invoke(ForgotPasswordRequest $request): JsonResponse
    {
        // Check if OAuth-only account
        $user = User::where('email', $request->email)->first();

        if ($user?->oauth_provider) {
            return response()->json([
                'message' => "This account uses {$user->oauth_provider} to sign in. Please use {$user->oauth_provider} instead.",
            ], 422);
        }

        $status = Password::sendResetLink($request->only('email'));

        return $status === Password::ResetLinkSent
            ? response()->json(['message' => __($status)])
            : response()->json(['message' => __($status)], 422);
    }
}
```

### ResetPasswordController (Invokable)
```php
// Source: Laravel 12 docs (passwords)
<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ResetPasswordRequest;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

class ResetPasswordController extends Controller
{
    public function __invoke(ResetPasswordRequest $request): JsonResponse
    {
        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user, string $password) {
                $user->forceFill([
                    'password' => Hash::make($password),
                ])->setRememberToken(Str::random(60));

                $user->save();

                event(new PasswordReset($user));
            }
        );

        return $status === Password::PasswordReset
            ? response()->json(['message' => __($status)])
            : response()->json(['message' => __($status)], 422);
    }
}
```

### VerifyEmailController
```php
// Source: Laravel 12 docs (verification)
<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Foundation\Auth\EmailVerificationRequest;
use Illuminate\Http\JsonResponse;

class VerifyEmailController extends Controller
{
    public function __invoke(EmailVerificationRequest $request): JsonResponse
    {
        if ($request->user()->hasVerifiedEmail()) {
            return response()->json(['message' => 'Email already verified.']);
        }

        $request->fulfill();

        return response()->json(['message' => 'Email verified successfully.']);
    }
}
```

### Socialite Mock Test Pattern (Pest)
```php
// Source: nabilhassen.com/how-to-test-laravel-socialite + project patterns
<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Contracts\User as SocialiteUser;
use Laravel\Socialite\Contracts\Provider;
use Mockery\MockInterface;

uses(RefreshDatabase::class);

function mockSocialiteUser(string $provider, array $overrides = []): void
{
    $defaults = [
        'id' => '12345',
        'name' => 'Test User',
        'email' => 'oauth@example.com',
        'avatar' => 'https://example.com/avatar.jpg',
    ];

    $data = array_merge($defaults, $overrides);

    $socialiteUser = Mockery::mock(SocialiteUser::class, function (MockInterface $mock) use ($data) {
        $mock->shouldReceive('getId')->andReturn($data['id']);
        $mock->shouldReceive('getName')->andReturn($data['name']);
        $mock->shouldReceive('getNickname')->andReturn($data['name']);
        $mock->shouldReceive('getEmail')->andReturn($data['email']);
        $mock->shouldReceive('getAvatar')->andReturn($data['avatar']);
    });

    $socialiteProvider = Mockery::mock(Provider::class, function (MockInterface $mock) use ($socialiteUser) {
        $mock->shouldReceive('stateless->user')->andReturn($socialiteUser);
    });

    Socialite::shouldReceive('driver')->with($provider)->andReturn($socialiteProvider);
}

test('google oauth creates new user and redirects to dashboard', function () {
    mockSocialiteUser('google');

    $response = $this->get('/api/auth/google/callback');

    $response->assertRedirect(config('services.frontend_url') . '/dashboard');
    $this->assertDatabaseHas('users', ['email' => 'oauth@example.com', 'oauth_provider' => 'google']);
    $this->assertAuthenticated();
});
```

### Route Registration Pattern
```php
// routes/api.php additions
// Guest-only auth routes
Route::middleware(['guest', 'throttle:auth'])->group(function () {
    Route::post('/forgot-password', ForgotPasswordController::class)->name('password.email');
    Route::post('/reset-password', ResetPasswordController::class)->name('password.update');
});

// Authenticated routes
Route::middleware('auth:sanctum')->group(function () {
    // Email verification
    Route::get('/email/verify/{id}/{hash}', VerifyEmailController::class)
        ->middleware('signed')
        ->name('verification.verify');

    Route::post('/email/verification-notification', ResendVerificationController::class)
        ->middleware('throttle:6,1')
        ->name('verification.send');
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom password reset tokens | `Password` facade with broker | Laravel 5+ (stable) | Handles hashing, expiry, throttle automatically |
| Fortify for all SPA auth | Manual controllers + built-in facades | Laravel 11+ trend | More control, less magic, cleaner for custom setups |
| `stateless()` OAuth callback | Session-based callback via web.php | Sanctum SPA pattern | Enables `Auth::login()` with session regeneration |
| `VerifyEmail::toMailUsing()` | `VerifyEmail::createUrlUsing()` | Laravel 8+ | Cleaner API for just changing URL without rewriting full email |

**Deprecated/outdated:**
- Fortify is NOT required for manual SPA auth -- the official docs confirm you can implement everything manually
- Token-based Sanctum auth for SPAs is discouraged in favor of cookie-based stateful auth (already configured)

## Open Questions

1. **EmailVerificationRequest with Sanctum SPA auth**
   - What we know: `EmailVerificationRequest` requires `auth` middleware. In SPA flow, the user clicks a link in email which opens the frontend, then the frontend must call the backend API.
   - What's unclear: Whether `EmailVerificationRequest` works seamlessly with Sanctum cookie auth when the user may not have cookies set on the verification page (e.g., opened in new browser tab).
   - Recommendation: Have the frontend verification page first check auth state. If not authenticated, redirect to login with a return URL. After login, auto-redirect to verification. Alternatively, make the verification endpoint accept unauthenticated requests and validate the signed URL + hash manually (simpler UX).

2. **Branded email template implementation**
   - What we know: User wants "AQUA TIP" branding, logo reference, dark theme
   - What's unclear: Whether to publish Laravel's default notification template and customize it, or use `toMailUsing()` for inline customization
   - Recommendation: Use `VerifyEmail::toMailUsing()` and `ResetPassword::toMailUsing()` for simple customization within AppServiceProvider. Full template publishing is overkill for Phase 2.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Pest 3.8 |
| Config file | backend/phpunit.xml (Pest runs on PHPUnit) |
| Quick run command | `cd backend && php artisan test --filter=Auth` |
| Full suite command | `cd backend && php artisan test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-03 | Google OAuth sign-in creates user + session | integration | `cd backend && php artisan test --filter=OAuthTest` | No - Wave 0 |
| AUTH-04 | GitHub OAuth sign-in creates user + session | integration | `cd backend && php artisan test --filter=OAuthTest` | No - Wave 0 |
| AUTH-05 | Email verification required for protected routes | integration | `cd backend && php artisan test --filter=EmailVerificationTest` | No - Wave 0 |
| AUTH-09 | Password reset via email link | integration | `cd backend && php artisan test --filter=PasswordResetTest` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `cd backend && php artisan test --filter=Auth`
- **Per wave merge:** `cd backend && php artisan test`
- **Phase gate:** Full suite green before /gsd:verify-work

### Wave 0 Gaps
- [ ] `tests/Feature/Auth/OAuthTest.php` -- covers AUTH-03, AUTH-04 (mock Socialite for Google + GitHub)
- [ ] `tests/Feature/Auth/EmailVerificationTest.php` -- covers AUTH-05 (verification enforcement, resend)
- [ ] `tests/Feature/Auth/PasswordResetTest.php` -- covers AUTH-09 (forgot + reset flow, OAuth guard)

## Sources

### Primary (HIGH confidence)
- [Laravel 12.x Password Reset](https://laravel.com/docs/12.x/passwords) - Password broker API, token config, throttling, URL customization
- [Laravel 12.x Email Verification](https://laravel.com/docs/12.x/verification) - MustVerifyEmail, Registered event, verified middleware, createUrlUsing
- [Laravel 12.x Authentication](https://laravel.com/docs/12.x/authentication) - SPA auth patterns, Sanctum integration
- Existing codebase (SocialAuthController, RegisterController, User model, routes, config/auth.php)

### Secondary (MEDIUM confidence)
- [How to Test Laravel Socialite](https://nabilhassen.com/how-to-test-laravel-socialite) - Socialite mock patterns with Mockery
- [Laravel Customize Email Verification Link](https://blog.hassam.dev/laravel-customize-email-verification-link-frontend-based-email-verification/) - SPA verification URL customization

### Tertiary (LOW confidence)
- None -- all findings verified with official docs or codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed, using built-in Laravel features only
- Architecture: HIGH - Follows established Phase 1 patterns (invokable controllers, form requests, Pest tests)
- Pitfalls: HIGH - Based on official docs + real codebase analysis of existing controllers

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (stable Laravel features, no fast-moving dependencies)
