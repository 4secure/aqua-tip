---
phase: 02-oauth-email-verification
plan: 01
subsystem: auth
tags: [laravel, email-verification, password-reset, sanctum, spa]

# Dependency graph
requires:
  - phase: 01-laravel-foundation-core-auth
    provides: User model with MustVerifyEmail, RegisterController, routes, Sanctum session auth
provides:
  - Email verification enforcement on protected routes
  - Password reset flow (forgot + reset)
  - SPA-friendly verification and reset URLs via AppServiceProvider
  - Verified middleware separation for auth-only vs auth+verified routes
affects: [02-oauth-email-verification, frontend-auth-pages]

# Tech tracking
tech-stack:
  added: []
  patterns: [invokable controllers for auth, SPA URL customization via createUrlUsing, signed route middleware]

key-files:
  created:
    - backend/app/Http/Controllers/Auth/ForgotPasswordController.php
    - backend/app/Http/Controllers/Auth/ResetPasswordController.php
    - backend/app/Http/Controllers/Auth/VerifyEmailController.php
    - backend/app/Http/Controllers/Auth/ResendVerificationController.php
    - backend/app/Http/Requests/Auth/ForgotPasswordRequest.php
    - backend/app/Http/Requests/Auth/ResetPasswordRequest.php
  modified:
    - backend/app/Http/Controllers/Auth/RegisterController.php
    - backend/app/Providers/AppServiceProvider.php
    - backend/routes/api.php

key-decisions:
  - "Generate signed verification URL manually in createUrlUsing callback (Laravel 12 passes only notifiable, not pre-built URL)"
  - "No auto-login after password reset per user decision"
  - "OAuth users blocked from password reset with provider-specific error message"

patterns-established:
  - "SPA URL wrapping: backend generates signed URL, wraps in frontend URL as query param"
  - "Route group separation: auth-only (verification) vs auth+verified (protected features)"

requirements-completed: [AUTH-05, AUTH-09]

# Metrics
duration: 3min
completed: 2026-03-12
---

# Phase 2 Plan 1: Email Verification & Password Reset Summary

**Email verification enforcement with SPA URL wrapping, password reset flow with OAuth guard, and verified middleware on protected routes**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-12T22:07:24Z
- **Completed:** 2026-03-12T22:10:11Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- RegisterController now dispatches Registered event triggering automatic verification email
- ForgotPasswordController blocks OAuth-only users with provider-specific message, sends reset link for email/password users
- ResetPasswordController handles token-based password reset without auto-login
- VerifyEmailController and ResendVerificationController for email verification flow
- AppServiceProvider customizes verification and reset email URLs to point to SPA frontend
- Protected routes (/user, /logout) now enforce verified middleware; verification routes accessible to unverified authenticated users
- All 19 existing Phase 1 auth tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Create email verification and password reset controllers with form requests** - `9424950` (feat)
2. **Task 2: Wire routes with verified middleware enforcement** - `04e7af8` (feat)

## Files Created/Modified
- `backend/app/Http/Controllers/Auth/ForgotPasswordController.php` - Password reset link request with OAuth guard
- `backend/app/Http/Controllers/Auth/ResetPasswordController.php` - Password reset execution via Password broker
- `backend/app/Http/Controllers/Auth/VerifyEmailController.php` - Email verification endpoint using EmailVerificationRequest
- `backend/app/Http/Controllers/Auth/ResendVerificationController.php` - Resend verification email notification
- `backend/app/Http/Requests/Auth/ForgotPasswordRequest.php` - Validates email for forgot password
- `backend/app/Http/Requests/Auth/ResetPasswordRequest.php` - Validates token, email, password with confirmation
- `backend/app/Http/Controllers/Auth/RegisterController.php` - Added Registered event dispatch
- `backend/app/Providers/AppServiceProvider.php` - Added VerifyEmail and ResetPassword URL customization
- `backend/routes/api.php` - Added verification/reset routes, verified middleware on protected routes

## Decisions Made
- Generated signed verification URL manually in `VerifyEmail::createUrlUsing` callback because Laravel 12 passes only the notifiable to the callback (not a pre-built URL)
- No auto-login after password reset per user decision from planning phase
- OAuth users blocked from password reset with provider-specific error message (e.g., "This account uses GitHub to sign in")

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed VerifyEmail::createUrlUsing callback signature**
- **Found during:** Task 1 (AppServiceProvider URL customization)
- **Issue:** Plan assumed createUrlUsing callback receives (notifiable, url) but Laravel 12 only passes (notifiable). Caused ArgumentCountError during registration.
- **Fix:** Changed callback to accept only $notifiable and manually generate the signed URL using URL::temporarySignedRoute()
- **Files modified:** backend/app/Providers/AppServiceProvider.php
- **Verification:** Registration test passes, verification URL generated correctly
- **Committed in:** 9424950 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Essential fix for correctness. No scope creep.

## Issues Encountered
- Task 1 and Task 2 are interdependent: the RegisterController dispatches Registered event which triggers email sending, which needs the verification.verify named route from Task 2. Both tasks had to be completed before tests could pass.

## User Setup Required
None - no external service configuration required. Email delivery uses MAIL_MAILER=log in development.

## Next Phase Readiness
- Email verification and password reset backend complete
- Ready for Phase 2 Plan 2 (OAuth callback handling, frontend integration)
- Frontend pages for /verify-email and /reset-password will need to handle the SPA URL format

## Self-Check: PASSED

- All 7 created files verified present on disk
- Commit 9424950 (Task 1) verified in git log
- Commit 04e7af8 (Task 2) verified in git log
- All 19 auth tests pass
- All 10 API routes visible in route:list

---
*Phase: 02-oauth-email-verification*
*Completed: 2026-03-12*
