# Phase 4: Frontend Auth Integration - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Auth-aware React frontend: login/signup pages, route protection, auth context, email verification (code + link), Get Started onboarding page, password reset pages, and sidebar user avatar dropdown. The auth context, login/register pages, ProtectedRoute, GuestRoute, SocialAuthButtons, and API client already exist — this phase fills the remaining gaps.

</domain>

<decisions>
## Implementation Decisions

### Signup Page Simplification
- Remove name field from signup — only email + password required
- Remove confirm password field — single password input only
- Add single combined legal checkbox: "I agree to the EULA and acknowledge the Privacy Policy"
- EULA and Privacy Policy are clickable links pointing to /eula and /privacy-policy (placeholder content pages for now)
- Checkbox must be checked to enable the Create Account button
- Keep existing social auth buttons (Google, GitHub) above the form

### Email Verification (Dual Method)
- Verification email contains BOTH a clickable link AND a 6-digit numeric code
- Full-page standalone verify screen at /verify-email with ParticleBackground
- Shows envelope icon, "Verify your email" heading, user's email address
- 6-digit code input with individual digit boxes and auto-advance
- "Or click the link in your email" helper text
- Resend Code button + "Check spam" hint
- Back to Login link
- After signup: redirect to /verify-email immediately
- If unverified user logs in: redirect to /verify-email (code entry path)
- Both methods (link click and code entry) verify the user

### Get Started Onboarding Page
- New page at /get-started — standalone with ParticleBackground (same style as auth pages)
- Shown after email verification (first-time login) for both email and OAuth users
- Two required fields: Name and Phone Number
- Phone input: country code picker dropdown (flag + code) + formatted phone number input
- For OAuth users: name field pre-filled from provider data, phone still required
- Submit button: "Get Started" — redirects to /dashboard after completion
- Users who haven't completed onboarding are redirected to /get-started from ProtectedRoute
- Backend needs `phone` column on users table and `onboarding_completed_at` timestamp (or check if name + phone are set)

### Password Reset Pages
- Forgot Password page at /forgot-password — standalone with ParticleBackground
- Email input + "Send Reset Link" button + "Back to Login" link
- Reset Password page at /reset-password — standalone with ParticleBackground
- Receives token and email from URL query params (?token=xxx&email=yyy)
- New password + confirm password fields + "Reset Password" button
- After successful reset: redirect to /login with "Password reset successfully!" success banner (no auto-login, per Phase 2 decision)

### Forgot Password Link
- "Forgot password?" text link on LoginPage
- Positioned below the password field, right-aligned, above the Sign In button
- Links to /forgot-password

### OAuth Callback Flow
- OAuth callback redirects through existing backend flow
- After OAuth: check if user has completed onboarding (name + phone set)
- If not onboarded: redirect to /get-started (name pre-filled from OAuth provider)
- If onboarded: redirect to /dashboard
- OAuth users are auto-verified (no verify-email step)

### Sidebar User Avatar
- Show avatar image (OAuth users) or initials circle (email users) in sidebar
- Clicking avatar opens a dropdown menu with:
  - "Account Settings" — links to /settings
  - "Logout" — calls logout and redirects to /login
- Replace current logout button with this dropdown pattern

### Session Expiry
- No frontend enforcement — server-side 7-day session (SESSION_LIFETIME=10080) handles expiry
- When session expires, API returns 401, AuthContext clears user, ProtectedRoute redirects to /login
- No toast or special message — silent redirect (existing behavior)

### Auth Loading States
- Keep existing violet spinner in ProtectedRoute/GuestRoute
- Add similar spinner for OAuth callback page handling

### Claude's Discretion
- Exact code input component implementation (digit boxes, auto-advance behavior)
- Country code picker library or custom implementation
- Placeholder content for EULA and Privacy Policy pages
- Loading/disabled states for form submissions
- Error message wording for validation failures
- Exact dropdown menu styling for sidebar avatar

</decisions>

<specifics>
## Specific Ideas

- All auth-related pages (login, register, verify-email, get-started, forgot-password, reset-password) share the same standalone dark theme layout: ParticleBackground + centered glassmorphism card
- Signup is intentionally minimal (email + password + legal checkbox) — profile completion happens on /get-started after verification
- The onboarding flow is: Register → Verify Email (code or link) → Get Started (name + phone) → Dashboard
- OAuth flow is: OAuth → Get Started (name pre-filled, phone required) → Dashboard

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AuthContext` (contexts/AuthContext.jsx): Full auth state management with login/register/logout/fetchCurrentUser — needs minor updates for onboarding check
- `ProtectedRoute` (components/auth/ProtectedRoute.jsx): Route guard — needs update to check email verification AND onboarding completion
- `GuestRoute` (components/auth/GuestRoute.jsx): Redirects authenticated users away from auth pages
- `LoginPage` (pages/LoginPage.jsx): Complete login page — needs forgot password link added
- `RegisterPage` (pages/RegisterPage.jsx): Complete register page — needs simplification (remove name, confirm password, add legal checkbox)
- `SocialAuthButtons` (components/auth/SocialAuthButtons.jsx): Google + GitHub OAuth buttons with loading states
- `ParticleBackground` (components/ui/ParticleBackground.jsx): Animated particle canvas used on all auth pages
- `GradientButton` (components/ui/GradientButton.jsx): Styled submit button used across auth pages
- `apiClient` (api/client.js): Fetch-based HTTP client with CSRF cookie handling
- `auth.js` (api/auth.js): Auth API functions (login, register, logout, fetchCurrentUser, getSocialRedirectUrl)

### Established Patterns
- Standalone full-page auth layouts (no sidebar) with ParticleBackground + glassmorphism card
- Form state management with useState + field-level error display
- API error handling: field errors (422) vs general errors vs network errors
- Lucide React icons for form field icons (Mail, Lock, User, Eye, EyeOff)
- input-field CSS class for styled inputs

### Integration Points
- `App.jsx`: Add routes for /verify-email, /get-started, /forgot-password, /reset-password, /eula, /privacy-policy
- `api/auth.js`: Add functions for verify-code, resend-verification, forgot-password, reset-password, complete-onboarding
- `AuthContext`: Add email_verified and onboarding_completed flags to user state
- `ProtectedRoute`: Add checks for verification + onboarding status
- `Sidebar`: Replace logout button with avatar dropdown
- Backend: Add phone column to users table, verification code storage, code verification endpoint, onboarding endpoint

</code_context>

<deferred>
## Deferred Ideas

- **Sidebar menu redesign**: User wants to change the sidebar menu structure/items/layout. This is a new capability beyond auth integration — should be its own phase.
- **30-day trial + paid subscription system**: Carried from Phase 2/3 — needs subscription models, payment integration, billing UI.
- **OAuth users setting a password**: Allow OAuth-only users to add email/password login. Future settings feature.

</deferred>

---

*Phase: 04-frontend-auth-integration*
*Context gathered: 2026-03-13*
