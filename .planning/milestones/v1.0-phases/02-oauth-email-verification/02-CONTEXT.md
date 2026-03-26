# Phase 2: OAuth + Email Verification - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Google and GitHub OAuth sign-in via Socialite, email verification flow after email/password signup, and password reset via email. All backend-only — no frontend pages (those are Phase 4). SocialAuthController already exists from Phase 1 scaffolding with full redirect/callback logic.

</domain>

<decisions>
## Implementation Decisions

### Password Reset Flow
- SPA-friendly flow: POST /api/forgot-password → sends email with link → link points to frontend route (e.g., /reset-password?token=xxx&email=yyy) → frontend POSTs to /api/reset-password
- After successful reset: redirect to login page with success message (not auto-login) — security-first for a threat intel platform
- Rate limit: 1 forgot-password request per minute per email (Laravel's built-in password broker throttle)
- Reset token validity: 60 minutes (Laravel default)
- Branded email: "AQUA TIP" name, logo reference, dark theme styling in notification template

### OAuth Callback Routing
- Callback route registered in routes/web.php (not api.php) — standard Laravel practice for browser redirects
- Auto-link behavior: if OAuth email matches existing email/password account, merge accounts automatically (keep current SocialAuthController logic)
- Always redirect to /dashboard after OAuth success (no intended-URL preservation — Phase 4 can add that)
- OAuth errors: keep current redirect to /login?error=encoded_message pattern
- OAuth users who try "Forgot Password": show "Use [provider] to sign in" message — don't allow password reset for OAuth-only accounts
- OAuth users cannot set a password in v1 — defer to future phase

### Email Verification
- RegisterController must send verification email after creating user (currently skips this)
- Protected API routes enforce `verified` middleware — unverified users get 403 with clear message
- OAuth users auto-verified on creation (email_verified_at => now()) — keep current behavior

### Testing
- Mock Socialite in tests (Socialite::shouldReceive()) — no real OAuth credentials needed
- Pest test framework (established in Phase 1)

### Claude's Discretion
- Exact email template HTML/design within the branded constraint
- Verification email resend endpoint design
- Test structure and assertion granularity

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard Laravel approaches within the decisions above.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SocialAuthController` (backend/app/Http/Controllers/Auth/SocialAuthController.php): Full OAuth redirect + callback with Google/GitHub support, account linking, auto-verification for OAuth users
- `User` model: Already implements `MustVerifyEmail`, has `HasApiTokens` trait, OAuth columns (oauth_provider, oauth_id, avatar_url)
- `UserResource`: Already hides sensitive fields (password, oauth_provider, oauth_id)
- OAuth migration: `add_oauth_columns_to_users_table` already ran

### Established Patterns
- Invokable single-action controllers (RegisterController, LoginController, LogoutController)
- Form request validation classes (RegisterRequest, LoginRequest)
- Pest test framework with Origin header for Sanctum stateful API tests
- Cookie-based Sanctum SPA auth (not token-based)

### Integration Points
- `routes/api.php`: Add forgot-password, reset-password, email verification endpoints
- `routes/web.php`: Add OAuth callback route (GET /auth/{provider}/callback)
- `RegisterController`: Add verification email dispatch after user creation
- `bootstrap/app.php`: May need `verified` middleware alias for route protection

</code_context>

<deferred>
## Deferred Ideas

- **30-day free trial + paid plans**: User wants a credit system where signed-in users get 10 credits/day for 30 days, then must buy a plan. This is a new capability requiring subscription/plan models, credit tracking, payment integration, and billing UI. Should be its own phase after the current milestone.
- **OAuth users setting a password**: Allow OAuth-only users to add email/password login. Future settings feature.
- **Intended URL preservation after OAuth**: Remember where user was going before OAuth redirect. Can be added in Phase 4 (Frontend Auth Integration).

</deferred>

---

*Phase: 02-oauth-email-verification*
*Context gathered: 2026-03-13*
