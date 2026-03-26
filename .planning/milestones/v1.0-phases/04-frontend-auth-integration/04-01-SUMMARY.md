---
phase: 04-frontend-auth-integration
plan: 01
subsystem: auth
tags: [sanctum, email-verification, onboarding, oauth, laravel, pest]

# Dependency graph
requires:
  - phase: 01-laravel-foundation-core-auth
    provides: "Sanctum session auth, User model, registration/login endpoints"
  - phase: 02-oauth-email-verification
    provides: "OAuth social login, email verification flow, signed URL verification"
provides:
  - "GET /api/user accessible to unverified users (no 403)"
  - "UserResource with email_verified and onboarding_completed booleans"
  - "Registration with email+password only (no name, no password_confirmation)"
  - "POST /api/email/verify-code for 6-digit code email verification"
  - "POST /api/onboarding for name + phone onboarding completion"
  - "OAuth callback redirect to /get-started for non-onboarded users"
  - "phone and onboarding_completed_at columns on users table"
affects: [04-frontend-auth-integration]

# Tech tracking
tech-stack:
  added: []
  patterns: [cache-based-verification-code, onboarding-gated-oauth-redirect]

key-files:
  created:
    - backend/app/Http/Controllers/Auth/VerifyEmailCodeController.php
    - backend/app/Http/Controllers/Auth/OnboardingController.php
    - backend/app/Notifications/VerifyEmailWithCode.php
    - backend/database/migrations/2026_03_13_105454_add_phone_and_onboarding_to_users_table.php
    - backend/tests/Feature/Auth/VerifyEmailCodeTest.php
    - backend/tests/Feature/Auth/OnboardingTest.php
  modified:
    - backend/routes/api.php
    - backend/app/Http/Resources/UserResource.php
    - backend/app/Http/Requests/Auth/RegisterRequest.php
    - backend/app/Http/Controllers/Auth/RegisterController.php
    - backend/app/Http/Controllers/Auth/SocialAuthController.php
    - backend/app/Models/User.php
    - backend/tests/Feature/Auth/OAuthTest.php
    - backend/tests/Feature/Auth/EmailVerificationTest.php
    - backend/tests/Feature/Auth/RegistrationTest.php

key-decisions:
  - "6-digit verification code stored in Laravel Cache with 15-min TTL, keyed by user ID"
  - "Verification email includes both 6-digit code and signed clickable link"
  - "User model overrides sendEmailVerificationNotification to use VerifyEmailWithCode"
  - "Onboarding_completed determined by name not being email local-part AND phone not null"

patterns-established:
  - "Cache-based verification code: Cache::put('email_verify_code:{user_id}', code, 15min)"
  - "Onboarding gate: OAuth callback checks phone + onboarding_completed_at before redirect target"

requirements-completed: [FEND-01, FEND-02, FEND-06, FEND-08]

# Metrics
duration: 7min
completed: 2026-03-13
---

# Phase 4 Plan 1: Backend Auth Adjustments Summary

**Unblock frontend auth by removing verified middleware from /api/user, adding 6-digit code verification + onboarding endpoints, and gating OAuth redirect on onboarding completion**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-13T10:53:45Z
- **Completed:** 2026-03-13T11:00:25Z
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments
- Unverified users can now fetch their profile via GET /api/user without 403
- Registration succeeds with only email + password (name defaults to email local-part)
- 6-digit cached code verification endpoint at POST /api/email/verify-code
- Onboarding endpoint at POST /api/onboarding accepts name + phone
- OAuth callback redirects new/non-onboarded users to /get-started
- All 81 tests pass (10 new + 71 existing, some updated)

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix blocking backend issues and add phone/onboarding migration** - `71924d4` (feat)
2. **Task 2: Add verification code endpoint, onboarding endpoint, and update OAuth callback** - `2fb17eb` (feat)

## Files Created/Modified
- `backend/app/Http/Controllers/Auth/VerifyEmailCodeController.php` - 6-digit code verification endpoint
- `backend/app/Http/Controllers/Auth/OnboardingController.php` - Name + phone onboarding endpoint
- `backend/app/Notifications/VerifyEmailWithCode.php` - Custom notification with code + signed link
- `backend/database/migrations/2026_03_13_105454_add_phone_and_onboarding_to_users_table.php` - phone and onboarding_completed_at columns
- `backend/tests/Feature/Auth/VerifyEmailCodeTest.php` - 5 tests for code verification
- `backend/tests/Feature/Auth/OnboardingTest.php` - 5 tests for onboarding
- `backend/routes/api.php` - Moved /user and /logout to auth:sanctum group, added new routes
- `backend/app/Http/Resources/UserResource.php` - Added email_verified, onboarding_completed, phone
- `backend/app/Http/Requests/Auth/RegisterRequest.php` - Name nullable, removed password_confirmation
- `backend/app/Http/Controllers/Auth/RegisterController.php` - Default name to email local-part
- `backend/app/Http/Controllers/Auth/SocialAuthController.php` - Onboarding-gated redirect
- `backend/app/Models/User.php` - Added phone, onboarding_completed_at, override sendEmailVerificationNotification
- `backend/tests/Feature/Auth/OAuthTest.php` - Updated for new redirect behavior
- `backend/tests/Feature/Auth/EmailVerificationTest.php` - Updated for new notification class and 200 response
- `backend/tests/Feature/Auth/RegistrationTest.php` - Updated for nullable name, added email-only registration test

## Decisions Made
- 6-digit verification code stored in Laravel Cache with 15-min TTL, keyed by user ID
- Verification email includes both 6-digit code and signed clickable link (dual verification paths)
- User model overrides sendEmailVerificationNotification() to use custom VerifyEmailWithCode notification
- Onboarding completion determined by name not equal to email local-part AND phone not null

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated existing tests for new behavior**
- **Found during:** Task 1
- **Issue:** Existing tests expected 403 for unverified /api/user access (now 200) and required `name` in registration (now nullable)
- **Fix:** Updated EmailVerificationTest to expect 200 with email_verified=false, updated RegistrationTest to not expect name validation error, added email-only registration test
- **Files modified:** backend/tests/Feature/Auth/EmailVerificationTest.php, backend/tests/Feature/Auth/RegistrationTest.php
- **Verification:** All 14 registration + email verification tests pass
- **Committed in:** 71924d4 (Task 1 commit)

**2. [Rule 1 - Bug] Updated OAuth tests for onboarding-gated redirect**
- **Found during:** Task 2
- **Issue:** OAuth tests expected all callbacks to redirect to /dashboard; new users without onboarding now go to /get-started
- **Fix:** Updated new user OAuth tests to expect /get-started redirect; existing user tests now include phone+onboarding_completed_at to expect /dashboard
- **Files modified:** backend/tests/Feature/Auth/OAuthTest.php
- **Verification:** All 81 tests pass
- **Committed in:** 2fb17eb (Task 2 commit)

**3. [Rule 1 - Bug] Updated verification notification class reference in tests**
- **Found during:** Task 2
- **Issue:** EmailVerificationTest imported Illuminate\Auth\Notifications\VerifyEmail but User model now sends VerifyEmailWithCode
- **Fix:** Updated import and assertion to use App\Notifications\VerifyEmailWithCode
- **Files modified:** backend/tests/Feature/Auth/EmailVerificationTest.php
- **Verification:** Resend verification test passes with new notification class
- **Committed in:** 2fb17eb (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (3 bug fixes in tests)
**Impact on plan:** All auto-fixes necessary for test correctness after intentional behavior changes. No scope creep.

## Issues Encountered
None - all changes applied cleanly.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Backend now fully supports frontend auth integration flow
- Frontend can register with email+password only, verify via 6-digit code, complete onboarding with name+phone
- UserResource provides email_verified and onboarding_completed flags for frontend routing logic
- OAuth redirects to /get-started for new users, enabling frontend onboarding flow

## Self-Check: PASSED

All 6 created files verified on disk. Both task commits (71924d4, 2fb17eb) verified in git log.

---
*Phase: 04-frontend-auth-integration*
*Completed: 2026-03-13*
