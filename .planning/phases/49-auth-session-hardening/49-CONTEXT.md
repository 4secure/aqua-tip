# Phase 49: Auth & Session Hardening - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Harden authentication and session management: set session cookie Secure flag and rename to non-descriptive value, shorten Sanctum token expiry from 7 days to 24 hours, invalidate all sessions and tokens on password reset, and eliminate user/provider enumeration in the forgot-password endpoint.

</domain>

<decisions>
## Implementation Decisions

### Forgot-Password Uniformity
- **D-01:** Forgot-password endpoint returns HTTP 200 with a generic message ("If an account exists with that email, a password reset link has been sent.") for ALL cases — email found (password user), email not found, and OAuth account. No differentiation.
- **D-02:** Password users receive the actual reset email. OAuth users and non-existent emails silently receive nothing. The HTTP response is identical for all three cases.

### Token Invalidation on Password Reset
- **D-03:** On successful password reset, ALL personal_access_tokens AND ALL database sessions for that user are deleted. Nuclear wipe — forces re-login everywhere.
- **D-04:** After password reset + token wipe, the user is redirected to the login page. No auto-login — user must authenticate with their new credentials.

### Session Cookie Hardening
- **D-05:** `SESSION_SECURE_COOKIE` defaults to `true` in `config/session.php` (currently null/unset).
- **D-06:** Session cookie name changed from `aqua-tip-session` to `__session` via `SESSION_COOKIE` env var or config default.

### Sanctum Token Expiry
- **D-07:** Sanctum token expiration shortened from 7 days (`60 * 24 * 7`) to 24 hours (`60 * 24`) in `config/sanctum.php`.

### Claude's Discretion
- Exact implementation of session flush (DB query vs Laravel session methods)
- Where to hook the token/session wipe in the password reset flow (controller vs event listener)
- Whether to log the invalidation event for audit purposes

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Auth Configuration
- `backend/config/session.php` — Session driver (database), cookie name (line 130-133), secure flag (line 172), lifetime (120 min)
- `backend/config/sanctum.php` — Token expiration (line 49: 7 days), stateful domains, middleware config

### Password Reset Flow
- `backend/app/Http/Controllers/Auth/ForgotPasswordController.php` — Current forgot-password with user enumeration (lines 18-26 reveal OAuth provider, lines 28-38 return different responses)
- `backend/app/Http/Controllers/Auth/ResetPasswordController.php` — Password reset execution (token wipe hooks here)
- `backend/app/Http/Requests/Auth/ForgotPasswordRequest.php` — Validation for forgot-password
- `backend/app/Http/Requests/Auth/ResetPasswordRequest.php` — Validation for reset

### Routes
- `backend/routes/api.php` — Auth route definitions

### Tests
- `backend/tests/Feature/Auth/PasswordResetTest.php` — Existing password reset tests (must be updated for uniform response)
- `backend/tests/Feature/Auth/SanctumConfigTest.php` — Sanctum config tests

### Requirements
- `.planning/REQUIREMENTS.md` §v5.0 Authentication & Session (AUTH) — AUTH-01 through AUTH-05

### Prior Phase Context
- `.planning/phases/47-infrastructure-hardening/47-CONTEXT.md` — HSTS handled at Nginx (no session.php changes needed for transport security)
- `.planning/phases/48-api-security/48-CONTEXT.md` — Rate limiting patterns established in AppServiceProvider

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Password::sendResetLink()` — Laravel's built-in reset link sender, already in use
- Database session driver — sessions stored in `sessions` table, can be queried/deleted per user
- `personal_access_tokens` table — Sanctum tokens, deletable via `$user->tokens()->delete()`

### Established Patterns
- Auth controllers in `App\Http\Controllers\Auth\` namespace
- Form requests for validation (`ForgotPasswordRequest`, `ResetPasswordRequest`)
- Sanctum config via env vars with fallback defaults
- Session config via env vars with fallback defaults

### Integration Points
- `ForgotPasswordController::__invoke()` — rewrite to return uniform response
- `ResetPasswordController` — add token/session wipe after successful reset
- `config/session.php` line 172 — change secure default from null to true
- `config/session.php` line 130-133 — change cookie name default
- `config/sanctum.php` line 49 — change expiration value

</code_context>

<specifics>
## Specific Ideas

No specific requirements — user chose recommended (standard) approaches for all decisions.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 49-auth-session-hardening*
*Context gathered: 2026-04-11*
