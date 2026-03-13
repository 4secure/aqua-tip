# Phase 4: Frontend Auth Integration - Research

**Researched:** 2026-03-13
**Domain:** React SPA authentication, route protection, email verification UI, onboarding flow
**Confidence:** HIGH

## Summary

Phase 4 integrates the existing Laravel backend auth system (Phases 1-3) with the React frontend. Significant existing code already covers the core: AuthContext, ProtectedRoute, GuestRoute, LoginPage, RegisterPage, SocialAuthButtons, ParticleBackground, apiClient, and auth API functions are all built and functional. The remaining work falls into three categories: (1) new pages (verify-email, get-started, forgot-password, reset-password, EULA, privacy-policy), (2) modifications to existing code (simplify RegisterPage, update ProtectedRoute/AuthContext/Sidebar, add new API functions), and (3) backend adjustments required to support the frontend changes.

Several critical backend issues must be resolved before the frontend can fully function: the UserResource does not expose `email_verified_at`, the `/api/user` endpoint requires `verified` middleware (blocking unverified users from fetching their own data), the RegisterController requires a `name` field that the simplified signup removes, the `password` validation requires `confirmed` which conflicts with removing the confirm password field, no verification code endpoint exists (only link-based), no onboarding endpoint exists, and the OAuth callback always redirects to `/dashboard` without checking onboarding status.

**Primary recommendation:** Split work into backend adjustments first (UserResource, routes, new endpoints), then frontend pages and modifications, tackling them in dependency order: API functions, AuthContext updates, route guards, new pages, RegisterPage simplification, Sidebar avatar dropdown.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Remove name field from signup -- only email + password required
- Remove confirm password field -- single password input only
- Add single combined legal checkbox: "I agree to the EULA and acknowledge the Privacy Policy"
- EULA and Privacy Policy are clickable links pointing to /eula and /privacy-policy (placeholder content pages for now)
- Checkbox must be checked to enable the Create Account button
- Keep existing social auth buttons (Google, GitHub) above the form
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
- New page at /get-started -- standalone with ParticleBackground (same style as auth pages)
- Shown after email verification (first-time login) for both email and OAuth users
- Two required fields: Name and Phone Number
- Phone input: country code picker dropdown (flag + code) + formatted phone number input
- For OAuth users: name field pre-filled from provider data, phone still required
- Submit button: "Get Started" -- redirects to /dashboard after completion
- Users who haven't completed onboarding are redirected to /get-started from ProtectedRoute
- Backend needs phone column on users table and onboarding_completed_at timestamp (or check if name + phone are set)
- Forgot Password page at /forgot-password -- standalone with ParticleBackground
- Email input + "Send Reset Link" button + "Back to Login" link
- Reset Password page at /reset-password -- standalone with ParticleBackground
- Receives token and email from URL query params (?token=xxx&email=yyy)
- New password + confirm password fields + "Reset Password" button
- After successful reset: redirect to /login with "Password reset successfully!" success banner (no auto-login, per Phase 2 decision)
- "Forgot password?" text link on LoginPage, below the password field, right-aligned, above the Sign In button
- Links to /forgot-password
- OAuth callback: check if user has completed onboarding (name + phone set). If not onboarded: redirect to /get-started. If onboarded: redirect to /dashboard. OAuth users are auto-verified (no verify-email step)
- Show avatar image (OAuth users) or initials circle (email users) in sidebar
- Clicking avatar opens a dropdown menu with: "Account Settings" (links to /settings), "Logout" (calls logout and redirects to /login)
- Replace current logout button with this dropdown pattern
- No frontend session enforcement -- server-side 7-day session handles expiry
- When session expires, API returns 401, AuthContext clears user, ProtectedRoute redirects to /login
- Keep existing violet spinner in ProtectedRoute/GuestRoute
- Add similar spinner for OAuth callback page handling
- All auth-related pages share the same standalone dark theme layout: ParticleBackground + centered glassmorphism card

### Claude's Discretion
- Exact code input component implementation (digit boxes, auto-advance behavior)
- Country code picker library or custom implementation
- Placeholder content for EULA and Privacy Policy pages
- Loading/disabled states for form submissions
- Error message wording for validation failures
- Exact dropdown menu styling for sidebar avatar

### Deferred Ideas (OUT OF SCOPE)
- Sidebar menu redesign: User wants to change the sidebar menu structure/items/layout. This is a new capability beyond auth integration -- should be its own phase.
- 30-day trial + paid subscription system: Carried from Phase 2/3 -- needs subscription models, payment integration, billing UI.
- OAuth users setting a password: Allow OAuth-only users to add email/password login. Future settings feature.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FEND-01 | Auth context/provider wrapping the React app with login state, user data, loading state | AuthContext already exists with login/register/logout/fetchCurrentUser. Needs updates: add email_verified and onboarding_completed flags, add refreshUser method for post-verification refresh |
| FEND-02 | Standalone sign-up page with Google, GitHub, and email/password form options | RegisterPage exists. Needs simplification: remove name + confirm password fields, add legal checkbox. Backend RegisterController needs `name` made optional and `confirmed` rule removed |
| FEND-03 | Standalone login page with Google, GitHub, and email/password form options | LoginPage exists and is functional. Needs only: add "Forgot password?" link below password field |
| FEND-04 | Landing page (/) is always publicly accessible | Already works -- LandingPage route is outside ProtectedRoute in App.jsx |
| FEND-06 | All other routes require authentication, redirect to login if unauthenticated | ProtectedRoute already handles basic auth redirect. Needs updates: check email_verified (redirect to /verify-email) and onboarding_completed (redirect to /get-started) |
| FEND-07 | Auth pages match existing dark theme (glassmorphism cards, violet/cyan accents, Syne + JetBrains Mono fonts) | Existing LoginPage and RegisterPage already use the design system correctly. New pages should copy the same layout pattern |
| FEND-08 | Email verification pending state shown to users who haven't verified yet | Requires new VerifyEmailPage with 6-digit code input, new backend verify-code endpoint, and ProtectedRoute redirect logic for unverified users |
</phase_requirements>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | ^19.2.4 | UI framework | Project standard |
| react-router-dom | ^7.13.1 | Client-side routing (BrowserRouter) | Already configured in App.jsx |
| lucide-react | ^0.577.0 | Icons (Mail, Lock, Eye, Phone, etc.) | Project standard icon library |
| tailwindcss | ^3.4.19 | Utility-first CSS | Project standard with custom dark theme |

### Supporting (Need to Install)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-phone-number-input | latest | Phone input with country code picker | Get Started onboarding page phone field |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-phone-number-input | Custom select + input | Library handles 200+ country codes, formatting, validation; custom would be hundreds of lines |
| OTP input library | Custom digit boxes | Simple enough to hand-roll with 6 refs or a single state string; avoids dependency for 50 lines of code |

**Installation:**
```bash
cd frontend && npm install react-phone-number-input
```

## Architecture Patterns

### New Pages and Routes to Add
```
frontend/src/
  pages/
    VerifyEmailPage.jsx      # NEW: 6-digit code verification
    GetStartedPage.jsx       # NEW: Onboarding (name + phone)
    ForgotPasswordPage.jsx   # NEW: Request password reset
    ResetPasswordPage.jsx    # NEW: Set new password
    EulaPage.jsx             # NEW: Placeholder EULA
    PrivacyPolicyPage.jsx    # NEW: Placeholder privacy policy
  api/
    auth.js                  # UPDATE: Add verification, reset, onboarding API functions
  contexts/
    AuthContext.jsx           # UPDATE: Add verification/onboarding state
  components/
    auth/
      ProtectedRoute.jsx     # UPDATE: Multi-step auth guard
      GuestRoute.jsx         # UPDATE: Allow unverified users to reach verify page
      CodeInput.jsx          # NEW: 6-digit verification code input
    layout/
      Sidebar.jsx            # UPDATE: Avatar dropdown instead of logout button
```

### Route Structure Update
```jsx
// App.jsx route structure
<Routes>
  <Route index element={<LandingPage />} />

  {/* Guest-only routes */}
  <Route element={<GuestRoute />}>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
    <Route path="/reset-password" element={<ResetPasswordPage />} />
  </Route>

  {/* Auth required but NOT verified/onboarded */}
  <Route path="/verify-email" element={<VerifyEmailPage />} />
  <Route path="/get-started" element={<GetStartedPage />} />

  {/* Public placeholder pages */}
  <Route path="/eula" element={<EulaPage />} />
  <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />

  {/* Protected: auth + verified + onboarded */}
  <Route element={<ProtectedRoute />}>
    <Route element={<AppLayout />}>
      {/* ...existing protected routes... */}
    </Route>
  </Route>
</Routes>
```

### Pattern 1: Auth Page Layout Template
**What:** All auth pages share identical layout: full-screen dark bg with radial gradient, ParticleBackground, centered max-w-md card.
**When to use:** Every new auth page (verify-email, get-started, forgot-password, reset-password).
**Example:**
```jsx
// Existing pattern from LoginPage.jsx -- copy this exactly
<div className="min-h-screen bg-primary flex items-center justify-center px-4 relative"
  style={{ background: 'radial-gradient(ellipse at 30% 20%, rgba(122, 68, 228, 0.12) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(90, 45, 184, 0.08) 0%, transparent 50%), #0A0B10' }}>
  <ParticleBackground />
  <div className="w-full max-w-md relative z-10">
    <div className="bg-surface border border-border rounded-xl p-8">
      {/* Header with logo link */}
      <div className="text-center mb-8">
        <Link to="/" className="inline-flex items-center gap-2 mb-4">
          <img src="/logo.png" alt="Aqua Tip" className="w-6 h-6" />
          <span className="font-display text-xl font-bold text-text-primary tracking-tight">AQUA TIP</span>
        </Link>
        <h1 className="font-display text-2xl font-bold text-text-primary">{title}</h1>
        <p className="font-mono text-sm text-text-secondary mt-1">{subtitle}</p>
      </div>
      {/* Page content */}
    </div>
  </div>
</div>
```

### Pattern 2: Form Error Handling
**What:** Field-level errors from 422 responses, general errors for auth failures.
**When to use:** All forms.
**Example:**
```jsx
// Existing pattern from LoginPage.jsx
const [errors, setErrors] = useState({});       // Field-level: { email: ['msg'], password: ['msg'] }
const [generalError, setGeneralError] = useState('');  // General message

// In catch block:
if (err.errors) {
  setErrors(err.errors);
} else if (err.status === 422 || err.status === 401) {
  setGeneralError(err.message);
} else {
  setGeneralError('Unable to connect to server. Please try again.');
}

// Field error display:
{errors.email && <p className="mt-1 text-xs text-red font-mono">{errors.email[0]}</p>}

// General error display:
{generalError && (
  <div className="mb-4 px-4 py-3 bg-red/10 border border-red/20 rounded-lg text-red text-sm font-mono">
    {generalError}
  </div>
)}
```

### Pattern 3: Multi-Step Auth Guard in ProtectedRoute
**What:** ProtectedRoute checks authentication, then email verification, then onboarding completion.
**When to use:** All protected routes.
**Example:**
```jsx
export default function ProtectedRoute() {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) { /* violet spinner */ }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user.email_verified) return <Navigate to="/verify-email" replace />;
  if (!user.onboarding_completed) return <Navigate to="/get-started" replace />;

  return <Outlet />;
}
```

### Pattern 4: Sidebar Avatar Dropdown
**What:** Clickable avatar in sidebar footer opens a small dropdown menu.
**When to use:** Sidebar footer area, replacing current inline logout button.
**Example:**
```jsx
// Use useState for dropdown visibility, useRef + useEffect for click-outside close
const [dropdownOpen, setDropdownOpen] = useState(false);
const dropdownRef = useRef(null);

// Click outside to close
useEffect(() => {
  function handleClickOutside(e) {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
      setDropdownOpen(false);
    }
  }
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, []);
```

### Anti-Patterns to Avoid
- **Storing auth state in localStorage:** Never store tokens or user data in localStorage. Sanctum uses httpOnly cookies managed by the browser. AuthContext state comes from `/api/user` API call on mount.
- **Checking auth client-side only:** Always let the server be the source of truth. The frontend merely reflects what `/api/user` returns.
- **Redirecting in AuthContext directly:** Keep navigation logic in route guards (ProtectedRoute, GuestRoute), not in the context provider.
- **Fetching user after registration then navigating to /dashboard:** After registration with the simplified flow, the user is unverified. Must redirect to /verify-email, not /dashboard.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Phone number input with country codes | Custom country code dropdown | `react-phone-number-input` | 200+ countries, formatting rules, flag images, validation -- massive effort to build correctly |
| CSRF token management | Manual cookie parsing | Existing `apiClient` in `api/client.js` | Already handles XSRF-TOKEN cookie extraction and header injection |
| Route protection logic | Per-page auth checks | ProtectedRoute wrapper component | Centralized guard prevents missed checks |

**Key insight:** The 6-digit code input is simple enough to hand-roll (6 controlled inputs with auto-focus-next logic). A library would be overkill for a single-use component.

## Common Pitfalls

### Pitfall 1: Unverified Users Cannot Fetch /api/user
**What goes wrong:** The backend `/api/user` route has `verified` middleware. After registration, the user is logged in but NOT verified. Calling `fetchCurrentUser()` returns 403, which makes AuthContext think the user is unauthenticated.
**Why it happens:** The `verified` middleware was added in Phase 2 to protect feature routes, but `/api/user` is behind it too.
**How to avoid:** Backend must either: (a) move `/api/user` to the `auth:sanctum` group (without `verified`), or (b) create a separate `/api/auth/status` endpoint that returns verification/onboarding status without requiring verification. Option (a) is simpler and the UserResource should return `email_verified_at` and `onboarding_completed` fields.
**Warning signs:** 403 errors immediately after registration; user appears logged out right after signup.

### Pitfall 2: RegisterController Requires Name + Password Confirmation
**What goes wrong:** The simplified signup form sends only `email` and `password`. The backend RegisterRequest requires `name` (required), and `password` must be `confirmed` (requires `password_confirmation` field).
**Why it happens:** The backend was built before the signup simplification decision.
**How to avoid:** Update RegisterRequest: make `name` optional (or remove it), remove `confirmed` from password rule. RegisterController: set a placeholder name (e.g., email prefix) if name is null.
**Warning signs:** 422 validation errors on signup saying "name is required" or "password confirmation does not match."

### Pitfall 3: OAuth Callback Always Redirects to /dashboard
**What goes wrong:** The SocialAuthController callback redirects to `{frontendUrl}/dashboard` regardless of onboarding status. If the OAuth user hasn't completed onboarding, they'll hit ProtectedRoute which redirects to /get-started, causing a flash/redirect chain.
**Why it happens:** The callback was written before the onboarding flow existed.
**How to avoid:** Update SocialAuthController to check if user has phone set (onboarding completed). If not, redirect to `/get-started`. This is more efficient than relying on the frontend redirect chain.
**Warning signs:** Brief flash of dashboard loading spinner before redirect to get-started for new OAuth users.

### Pitfall 4: GuestRoute Blocks Verify-Email and Get-Started
**What goes wrong:** `/verify-email` and `/get-started` pages need the user to be authenticated (to know WHO is verifying/onboarding), but GuestRoute redirects authenticated users to /dashboard.
**Why it happens:** These pages exist in a gray zone: user is logged in but not fully verified/onboarded.
**How to avoid:** These routes should NOT be inside GuestRoute or ProtectedRoute. They should be standalone routes with their own guards: verify-email requires auth but not verification, get-started requires auth + verification but not onboarding.
**Warning signs:** Infinite redirect loops between /verify-email and /dashboard.

### Pitfall 5: AuthContext Register Function Navigates Wrong
**What goes wrong:** The current `register` function in AuthContext calls `registerUser()` then `fetchCurrentUser()`. But after Pitfall 1 is fixed and the user is unverified, `fetchCurrentUser()` will return a user with `email_verified: false`. The calling page (RegisterPage) then navigates to `/dashboard` which ProtectedRoute redirects to `/verify-email`. This works but adds an unnecessary redirect.
**Why it happens:** RegisterPage was written before the verification flow.
**How to avoid:** After register, navigate to `/verify-email` directly instead of `/dashboard`.
**Warning signs:** Brief flash of dashboard redirect before landing on verify-email page.

### Pitfall 6: Click-Outside Dropdown Closing
**What goes wrong:** The sidebar avatar dropdown doesn't close when clicking outside.
**Why it happens:** Missing click-outside handler or event listener cleanup.
**How to avoid:** Use `useRef` + `mousedown` event listener with proper cleanup in useEffect. Must check `dropdownRef.current.contains(e.target)`.
**Warning signs:** Dropdown stays open permanently after opening.

### Pitfall 7: Verification Code Input UX
**What goes wrong:** 6-digit code input with auto-advance has many edge cases: pasting full code, backspace navigation, handling non-numeric input, mobile keyboard type.
**Why it happens:** Individual digit inputs need coordinated focus management.
**How to avoid:** Use a single hidden input that captures the full code, with 6 visual display boxes showing each character. On change, update all boxes. This sidesteps focus management entirely. Alternatively, use 6 refs with `onKeyDown` for backspace handling and `onInput` for auto-advance.
**Warning signs:** Can't paste codes from email, backspace doesn't work intuitively, non-numeric characters accepted.

## Code Examples

### New API Functions (api/auth.js additions)
```jsx
// Source: Derived from existing backend routes (routes/api.php)

export async function verifyEmailCode(code) {
  await csrfCookie();
  return apiClient.post('/api/email/verify-code', { code });
}

export async function resendVerification() {
  return apiClient.post('/api/email/verification-notification');
}

export async function forgotPassword(email) {
  await csrfCookie();
  return apiClient.post('/api/forgot-password', { email });
}

export async function resetPassword({ token, email, password, password_confirmation }) {
  await csrfCookie();
  return apiClient.post('/api/reset-password', { token, email, password, password_confirmation });
}

export async function completeOnboarding({ name, phone }) {
  return apiClient.post('/api/onboarding', { name, phone });
}
```

### AuthContext Updates
```jsx
// Add to user-derived state:
const value = useMemo(() => ({
  user,
  loading,
  error,
  isAuthenticated: user !== null,
  emailVerified: user?.email_verified ?? false,
  onboardingCompleted: user?.onboarding_completed ?? false,
  userInitials: getInitials(user?.name),
  login,
  register,
  logout,
  refreshUser: checkAuth,  // Expose for post-verification/onboarding refresh
}), [user, loading, error, login, register, logout, checkAuth]);
```

### 6-Digit Code Input Component
```jsx
// components/auth/CodeInput.jsx
import { useState, useRef, useCallback } from 'react';

export default function CodeInput({ length = 6, onComplete }) {
  const [values, setValues] = useState(Array(length).fill(''));
  const inputRefs = useRef([]);

  const handleChange = useCallback((index, value) => {
    if (!/^\d*$/.test(value)) return; // digits only

    const newValues = [...values];
    newValues[index] = value.slice(-1); // take last char
    setValues(newValues);

    // Auto-advance
    if (value && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Complete callback
    const code = newValues.join('');
    if (code.length === length && newValues.every(v => v)) {
      onComplete(code);
    }
  }, [values, length, onComplete]);

  const handleKeyDown = useCallback((index, e) => {
    if (e.key === 'Backspace' && !values[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }, [values]);

  const handlePaste = useCallback((e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    const newValues = Array(length).fill('');
    pasted.split('').forEach((char, i) => { newValues[i] = char; });
    setValues(newValues);
    if (pasted.length === length) {
      onComplete(pasted);
    } else {
      inputRefs.current[pasted.length]?.focus();
    }
  }, [length, onComplete]);

  return (
    <div className="flex gap-3 justify-center" onPaste={handlePaste}>
      {values.map((val, i) => (
        <input
          key={i}
          ref={el => inputRefs.current[i] = el}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={val}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          className="w-12 h-14 text-center text-xl font-mono bg-surface-2 border border-border rounded-lg text-text-primary focus:border-violet focus:outline-none transition-colors"
        />
      ))}
    </div>
  );
}
```

### Success Banner Pattern (for reset password redirect)
```jsx
// LoginPage: read success message from navigation state
const location = useLocation();
const [successMessage, setSuccessMessage] = useState(location.state?.success || '');

// Display above form:
{successMessage && (
  <div className="mb-4 px-4 py-3 bg-green/10 border border-green/20 rounded-lg text-green text-sm font-mono">
    {successMessage}
  </div>
)}
```

## Backend Changes Required

This is critical context for the planner. The frontend cannot function without these backend modifications.

### Must Change (Blocking)
| Change | File | Why |
|--------|------|-----|
| Move `/api/user` out of `verified` middleware group | `routes/api.php` | Unverified users need to fetch their own data to see verification/onboarding status |
| Add `email_verified_at` and `onboarding_completed` to UserResource | `UserResource.php` | Frontend needs these flags for route guards |
| Make `name` optional in RegisterRequest | `RegisterRequest.php` | Signup form no longer collects name |
| Remove `confirmed` from password rule in RegisterRequest | `RegisterRequest.php` | Signup form no longer has confirm password field |
| Handle null name in RegisterController | `RegisterController.php` | Set placeholder or allow null |

### Must Add (New Features)
| Feature | Endpoint | Purpose |
|---------|----------|---------|
| Verify by code | `POST /api/email/verify-code` | Accept 6-digit code, verify user's email |
| Complete onboarding | `POST /api/onboarding` | Accept name + phone, mark onboarding complete |
| Phone column on users table | Migration | Store phone number |
| Onboarding tracking | Migration or logic | `onboarding_completed_at` timestamp or check name+phone not null |
| Verification code storage | Migration or cache | Store 6-digit code with expiry, associate with user |
| Include code in verification email | Notification | Modify verification notification to include both link and code |

### Should Update
| Change | File | Why |
|--------|------|-----|
| OAuth callback redirect logic | `SocialAuthController.php` | Check onboarding status, redirect to /get-started or /dashboard |
| Move logout out of `verified` group | `routes/api.php` | Unverified users should be able to log out |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Token-based auth (JWT in localStorage) | Cookie-based Sanctum SPA auth | Project decision Phase 1 | More secure, simpler CSRF handling |
| Single verification method (link only) | Dual verification (link + code) | Phase 4 decision | Better UX, supports mobile email clients that don't open links well |
| Name collected at registration | Name collected at onboarding | Phase 4 decision | Simpler signup, deferred profile completion |

## Open Questions

1. **Verification Code Storage**
   - What we know: Backend needs to generate and store 6-digit codes associated with users
   - What's unclear: Whether to use database table or cache (Redis/file). Cache with 15-min TTL is simpler but may not persist across server restarts.
   - Recommendation: Use `cache` with 15-min TTL keyed by `email_verify_code:{user_id}`. Simple, no migration needed, automatic cleanup.

2. **react-phone-number-input Styling**
   - What we know: The library provides unstyled or default-styled components. Project uses dark theme with custom colors.
   - What's unclear: How much custom CSS will be needed to match the dark theme.
   - Recommendation: Use the library's "headless" or basic mode, apply Tailwind classes directly. The library supports a `className` prop and custom `countrySelectComponent`.

3. **Backend Name Handling After Simplification**
   - What we know: Name is removed from signup, collected during onboarding. But the User model and many places may expect name to be non-null.
   - What's unclear: Whether setting name to null will cause issues elsewhere (e.g., Sidebar displays `user?.name`).
   - Recommendation: Set a temporary placeholder name during registration (email local part or "User") and update it during onboarding. This avoids null-safety issues throughout the app.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None (frontend has no tests -- see CLAUDE.md "No tests exist") |
| Config file | none -- see Wave 0 |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FEND-01 | AuthContext provides auth state, login, logout, refreshUser | unit | manual verification | No |
| FEND-02 | Signup page renders correctly with simplified form, legal checkbox disables/enables submit | manual-only | manual browser test | No |
| FEND-03 | Login page renders with forgot password link, handles login + errors | manual-only | manual browser test | No |
| FEND-04 | Landing page loads without auth | smoke | manual browser test (visit / while logged out) | No |
| FEND-06 | Protected routes redirect unauthenticated users to /login, unverified to /verify-email, non-onboarded to /get-started | integration | manual browser test | No |
| FEND-07 | Auth pages use dark theme, glassmorphism, violet/cyan accents, correct fonts | manual-only | visual inspection | No |
| FEND-08 | Unverified user sees verify-email page with code input, can verify via code or link | integration | manual browser test | No |

### Sampling Rate
- **Per task commit:** Manual browser verification (no test infrastructure)
- **Per wave merge:** Full manual flow test: register -> verify -> onboard -> dashboard
- **Phase gate:** Complete auth flow walkthrough before `/gsd:verify-work`

### Wave 0 Gaps
- No frontend test framework exists (no Jest, Vitest, or Testing Library)
- No test infrastructure at all -- this is a known project limitation per CLAUDE.md
- Setting up frontend testing is out of scope for this phase (would be its own effort)
- All validation will be manual browser testing

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `frontend/src/contexts/AuthContext.jsx`, `frontend/src/components/auth/ProtectedRoute.jsx`, `frontend/src/components/auth/GuestRoute.jsx`, `frontend/src/pages/LoginPage.jsx`, `frontend/src/pages/RegisterPage.jsx`
- Codebase inspection: `backend/routes/api.php`, `backend/app/Http/Controllers/Auth/*`, `backend/app/Models/User.php`, `backend/app/Http/Resources/UserResource.php`
- Codebase inspection: `frontend/tailwind.config.js`, `frontend/src/styles/glassmorphism.css`
- CONTEXT.md decisions from user discussion

### Secondary (MEDIUM confidence)
- React Router v7 route guard patterns (based on existing codebase usage)
- react-phone-number-input library capabilities (based on training data, needs verification during implementation)

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in use in the project, only react-phone-number-input is new
- Architecture: HIGH - patterns derived directly from existing codebase code
- Pitfalls: HIGH - identified by analyzing actual code (route middleware, validation rules, controller logic)
- Backend changes: HIGH - identified by reading actual controller code, route definitions, and validation rules

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (stable -- all patterns are established in the codebase)
