# Phase 35: Functional Settings Page - Research

**Researched:** 2026-04-01
**Domain:** React profile form + Laravel profile update endpoint
**Confidence:** HIGH

## Summary

This phase replaces the current mock SettingsPage with a functional profile page that reads real user data from AuthContext and enables editing via a new backend endpoint. The existing codebase provides nearly all building blocks: AuthContext with `refreshUser()`, reusable form components (SearchableDropdown, PhoneNumberInput, SimpleDropdown), established validation patterns from GetStartedPage, and a proven apiClient. The new work is: (1) rewrite SettingsPage.jsx, (2) add `PUT /api/profile` backend endpoint, (3) expose `oauth_provider` and `created_at` in UserResource, (4) add `put` method to apiClient, (5) build a lightweight toast notification component.

**Primary recommendation:** Mirror the GetStartedPage form patterns exactly (same components, same error handling, same validation rules) but pre-populate fields from `useAuth().user` instead of empty state. The backend endpoint is a near-clone of OnboardingController minus the `onboarding_completed_at` timestamp.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Remove all 3 out-of-scope tabs (API Keys, Webhooks, Usage) entirely. No tab bar.
- **D-02:** Settings page becomes a single profile/account page -- no tabs, just one glassmorphism card layout.
- **D-03:** Remove all mock data imports (API_KEYS, UsageChart, etc.) from the page.
- **D-04:** All 5 onboarding fields are editable: name, phone, timezone, organization, role.
- **D-05:** Reuse existing onboarding components: SearchableDropdown (timezone with IANA list), PhoneNumberInput (phone with country flags), SimpleDropdown (role with ROLE_OPTIONS).
- **D-06:** Email is visible but read-only (with lock icon or read-only indicator). Email changes require verification flow -- out of scope.
- **D-07:** Single "Save Changes" button at the bottom of the form. Button disabled until a field changes from its initial value.
- **D-08:** Button shows loading state during API call (spinner or "Saving..." text).
- **D-09:** Toast notification for save feedback -- green toast for success ("Profile updated"), red toast for errors. This requires a new lightweight toast component (none exists in codebase).
- **D-10:** Validation errors display inline per-field (reuse same pattern as onboarding form).
- **D-11:** After successful save, call `refreshUser()` from AuthContext to sync updated data across sidebar, topbar, and all consumers.
- **D-12:** Show avatar (from `user.avatar_url` for OAuth users) with initials circle fallback (reuse `getInitials()` from AuthContext).
- **D-13:** Show current plan name and trial days remaining (read-only). Data already available from AuthContext user object.
- **D-14:** Show OAuth provider badge indicating signup method (Google, GitHub, or email icon).
- **D-15:** Show account creation date. Requires adding `created_at` to `UserResource.php` (currently not exposed).
- **D-16:** New `PUT /api/profile` or `PATCH /api/profile` endpoint for updating user profile fields. Validation rules should mirror onboarding.
- **D-17:** New `ProfileController` or extend existing `UserController` -- Claude's discretion on organization.

### Claude's Discretion
- Toast component implementation approach (inline component vs extracted reusable component)
- Backend controller organization (new ProfileController vs extending UserController)
- Avatar sizing and positioning within the profile header area
- Exact read-only styling for email field (lock icon, greyed-out, or "read-only" text)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SETTINGS-01 | User sees their real profile data on the settings page (not dummy data) | AuthContext provides all user fields (name, email, phone, timezone, organization, role, plan, trial_days_left, avatar_url). Need to expose `created_at` and `oauth_provider` via UserResource. |
| SETTINGS-02 | User can update their profile information and see changes reflected immediately | New PUT /api/profile endpoint mirrors OnboardingController validation. Frontend form with dirty-checking and `refreshUser()` call on success. |
</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19 | UI framework | Project standard |
| Vite | 7 | Build tool | Project standard |
| Tailwind CSS | 3 | Styling | Project standard |
| Lucide React | latest | Icons (Lock, Mail, Github, Chrome, User, etc.) | Project standard |
| Laravel | 11 | Backend framework | Project standard |

### Supporting (already in project)
| Library | Purpose | When to Use |
|---------|---------|-------------|
| SearchableDropdown | Timezone picker with IANA list | Timezone field |
| PhoneNumberInput | Phone with country flags | Phone field |
| SimpleDropdown | Role picker | Role field |
| GradientButton | Styled button | Save Changes button |

### No New Dependencies
This phase requires zero new npm or composer packages. Everything is built from existing components and patterns.

## Architecture Patterns

### Recommended Project Structure (changes only)
```
frontend/src/
  pages/
    SettingsPage.jsx          # Full rewrite -- profile page
  components/
    ui/
      Toast.jsx               # NEW -- lightweight toast notification
  api/
    auth.js                   # Add updateProfile() function
    client.js                 # Add put() method to apiClient

backend/
  app/Http/Controllers/
    Profile/
      UpdateController.php    # NEW -- profile update endpoint
  app/Http/Resources/
    UserResource.php          # Add created_at and oauth_provider fields
  routes/
    api.php                   # Add PUT /api/profile route
  tests/Feature/
    Profile/
      UpdateProfileTest.php   # NEW -- profile update tests
```

### Pattern 1: Pre-populated Form with Dirty Checking
**What:** Initialize form state from AuthContext user data, track whether any field differs from the initial snapshot to enable/disable the Save button.
**When to use:** Settings/profile pages where you want to prevent no-op saves.
**Example:**
```jsx
// Store initial values as a ref to avoid re-render issues
const initialValues = useRef({
  name: user.name || '',
  phone: user.phone || '',
  timezone: user.timezone || 'UTC',
  organization: user.organization || '',
  role: user.role || '',
});

const [form, setForm] = useState({ ...initialValues.current });

const isDirty = useMemo(() => {
  return Object.keys(initialValues.current).some(
    key => form[key] !== initialValues.current[key]
  );
}, [form]);

// After successful save, update the initial values snapshot
function handleSaveSuccess(updatedUser) {
  const newInitial = {
    name: updatedUser.name || '',
    phone: updatedUser.phone || '',
    timezone: updatedUser.timezone || 'UTC',
    organization: updatedUser.organization || '',
    role: updatedUser.role || '',
  };
  initialValues.current = newInitial;
  setForm({ ...newInitial });
}
```

### Pattern 2: Toast Notification Component
**What:** Lightweight auto-dismissing notification that appears at top-right of the viewport.
**When to use:** D-09 requires toast feedback for save success/error.
**Recommendation:** Extract as a reusable `Toast.jsx` component in `components/ui/`. Use `useState` with `setTimeout` for auto-dismiss (3-4 seconds). Use `createPortal` to render at document body level so it's always visible above other content.
**Example:**
```jsx
// components/ui/Toast.jsx
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, X } from 'lucide-react';

export default function Toast({ message, type = 'success', onClose, duration = 4000 }) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const colors = {
    success: 'border-green/30 bg-green/10 text-green',
    error: 'border-red/30 bg-red/10 text-red',
  };
  const Icon = type === 'success' ? CheckCircle : XCircle;

  return createPortal(
    <div className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm ${colors[type]} animate-slide-in-up`}>
      <Icon className="w-5 h-5 shrink-0" />
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose}><X className="w-4 h-4 opacity-60 hover:opacity-100" /></button>
    </div>,
    document.body
  );
}
```

### Pattern 3: apiClient PUT Method
**What:** The existing `apiClient` only has `get` and `post`. Need to add `put` for the profile update endpoint.
**Critical finding:** `api/client.js` uses a generic `request(method, url, data)` function internally, so adding `put` is a one-liner.
**Example:**
```js
// In api/client.js -- add to the apiClient object:
export const apiClient = {
  get: (url) => request('GET', url),
  post: (url, data) => request('POST', url, data),
  put: (url, data) => request('PUT', url, data),   // ADD THIS
};
```

### Pattern 4: Profile API Function
**What:** New function in `api/auth.js` for the profile update call.
**Example:**
```js
// In api/auth.js
export async function updateProfile({ name, phone, timezone, organization, role }) {
  await csrfCookie();
  return apiClient.put('/api/profile', { name, phone, timezone, organization, role });
}
```

### Anti-Patterns to Avoid
- **Mutating AuthContext user directly:** Never set fields on the user object. Always call `refreshUser()` after a successful save to get fresh data from the server.
- **Using form libraries (Formik, react-hook-form):** The project uses plain `useState` for forms everywhere. Adding a form library would be inconsistent and unnecessary for 5 fields.
- **Creating a separate context for toast:** Overkill. A simple `useState` in SettingsPage that renders the Toast component is sufficient. If toast is needed elsewhere later, it can be extracted to context then.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Timezone picker | Custom timezone input | `SearchableDropdown` + `Intl.supportedValuesOf('timeZone')` | Already built and tested in GetStartedPage |
| Phone input with flags | Country code selector | `PhoneNumberInput` component | SVG flags, auto-detection already implemented |
| Role dropdown | Custom select | `SimpleDropdown` with `ROLE_OPTIONS` | Already built, includes "Other" with custom input |
| Form validation (backend) | Custom validator | Laravel `$request->validate()` | Mirror OnboardingController rules exactly |
| CSRF handling | Manual token management | `csrfCookie()` + `apiClient` | Already handles XSRF-TOKEN cookie |

## Common Pitfalls

### Pitfall 1: oauth_provider Not Exposed in API
**What goes wrong:** D-14 requires showing the OAuth provider badge (Google, GitHub, email), but `oauth_provider` is in the User model's `$hidden` array and is NOT included in `UserResource.php`.
**Why it happens:** OAuth provider was intentionally hidden for security, but the settings page needs it for display.
**How to avoid:** Add `oauth_provider` to UserResource output (read-only display only). It's safe to expose the provider name (not the oauth_id). Alternatively, add a computed `auth_method` field that returns 'google', 'github', or 'email'.
**Warning signs:** Provider badge always shows "email" or is empty.

### Pitfall 2: created_at Not in UserResource
**What goes wrong:** D-15 requires showing account creation date, but `created_at` is not in the current `UserResource.php` toArray output.
**How to avoid:** Add `'created_at' => $this->created_at->toIso8601String()` to UserResource. The field exists on the model (Eloquent timestamps), just not exposed.

### Pitfall 3: apiClient Missing PUT Method
**What goes wrong:** Trying to call `apiClient.put()` fails because only `get` and `post` exist.
**How to avoid:** Add `put: (url, data) => request('PUT', url, data)` to the apiClient object before using it.

### Pitfall 4: Form State Not Syncing After Save
**What goes wrong:** After saving, the "Save Changes" button stays disabled but shows stale initial values if the user object changes.
**Why it happens:** The initial values ref is set once from the user object at mount time, not updated after save.
**How to avoid:** After `refreshUser()` resolves, update `initialValues.current` with the new user data and reset form state to match.

### Pitfall 5: Role "Other" Custom Value Handling
**What goes wrong:** If user's role is a custom value (not in ROLE_OPTIONS), the SimpleDropdown won't display it correctly.
**Why it happens:** GetStartedPage sends the custom text as the role value (e.g., "Pentester"), not "Other". On the settings page, if the stored role doesn't match any option in ROLE_OPTIONS, the dropdown should show "Other" with the custom value pre-filled.
**How to avoid:** On mount, check if `user.role` is in ROLE_OPTIONS. If not, set dropdown to "Other" and set customRole to `user.role`.

### Pitfall 6: Phone Number Pre-population
**What goes wrong:** PhoneNumberInput may not correctly parse and display a stored international phone number.
**Why it happens:** The component expects a specific format for the `value` prop.
**How to avoid:** Test with stored phone values like "+1234567890" to ensure the component correctly identifies the country code and displays the flag. The existing component already handles international format -- just pass the stored value directly.

## Code Examples

### Backend: ProfileController (new)
```php
// app/Http/Controllers/Profile/UpdateController.php
<?php

namespace App\Http\Controllers\Profile;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use Illuminate\Http\Request;

class UpdateController extends Controller
{
    public function __invoke(Request $request): UserResource
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:255'],
            'phone' => ['required', 'string', 'min:5', 'max:20'],
            'timezone' => ['required', 'string', 'timezone:all'],
            'organization' => ['nullable', 'string', 'max:255'],
            'role' => ['nullable', 'string', 'max:255'],
        ]);

        $user = $request->user();

        $user->update([
            'name' => $validated['name'],
            'phone' => $validated['phone'],
            'timezone' => $validated['timezone'],
            'organization' => $validated['organization'] ?? null,
            'role' => $validated['role'] ?? null,
        ]);

        return new UserResource($user->fresh()->load(['plan', 'pendingPlan']));
    }
}
```

### Backend: UserResource Updates
```php
// Add to UserResource::toArray() -- two new fields
'oauth_provider' => $this->oauth_provider,  // 'google', 'github', or null
'created_at' => $this->created_at?->toIso8601String(),
```

### Backend: Route Registration
```php
// In routes/api.php, inside the auth:sanctum middleware group
Route::put('/profile', \App\Http\Controllers\Profile\UpdateController::class);
```

### Frontend: SettingsPage Layout Skeleton
```jsx
// Profile header area
<div className="flex items-center gap-4 mb-6">
  {user.avatar_url ? (
    <img src={user.avatar_url} alt={user.name} className="w-16 h-16 rounded-full" />
  ) : (
    <div className="w-16 h-16 rounded-full bg-violet/20 border border-violet/30 flex items-center justify-center text-violet text-lg font-bold">
      {userInitials}
    </div>
  )}
  <div>
    <h2 className="font-sans text-lg font-bold">{user.name}</h2>
    <p className="text-sm text-text-muted">{user.email}</p>
    {/* OAuth badge */}
    {user.oauth_provider && (
      <span className="inline-flex items-center gap-1 mt-1 text-xs text-text-muted">
        {/* provider icon */} Signed in with {user.oauth_provider}
      </span>
    )}
  </div>
</div>
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Pest PHP (via phpunit.xml) |
| Config file | `backend/phpunit.xml` |
| Quick run command | `cd backend && php artisan test --filter=UpdateProfileTest` |
| Full suite command | `cd backend && php artisan test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SETTINGS-01 | User sees real profile data | manual | Visual verification on settings page | N/A |
| SETTINGS-02 | Profile update persists and reflects | integration | `cd backend && php artisan test --filter=UpdateProfileTest` | Wave 0 |
| SETTINGS-02 | Validation rejects bad input | integration | `cd backend && php artisan test --filter=UpdateProfileTest` | Wave 0 |
| SETTINGS-02 | Unauthenticated user gets 401 | integration | `cd backend && php artisan test --filter=UpdateProfileTest` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd backend && php artisan test --filter=UpdateProfileTest`
- **Per wave merge:** `cd backend && php artisan test`
- **Phase gate:** Full suite green before verify

### Wave 0 Gaps
- [ ] `backend/tests/Feature/Profile/UpdateProfileTest.php` -- covers SETTINGS-02 (profile update endpoint tests)

## Open Questions

1. **PhoneNumberInput pre-population with stored value**
   - What we know: The component accepts a `value` prop and an `onChange` handler. During onboarding, values start empty.
   - What's unclear: Whether passing a stored international number like "+639123456789" correctly selects the country flag and parses the local number portion.
   - Recommendation: Test during implementation. If parsing fails, may need to store country code separately or handle in the component.

## Sources

### Primary (HIGH confidence)
- `frontend/src/contexts/AuthContext.jsx` -- user shape, refreshUser(), getInitials()
- `frontend/src/pages/GetStartedPage.jsx` -- form patterns, component usage, ROLE_OPTIONS, timezone detection
- `frontend/src/api/client.js` -- apiClient structure (only get/post, needs put)
- `frontend/src/api/auth.js` -- completeOnboarding() pattern to mirror
- `backend/app/Http/Resources/UserResource.php` -- current user data shape (missing created_at, oauth_provider)
- `backend/app/Http/Controllers/Auth/OnboardingController.php` -- exact validation rules to mirror
- `backend/app/Models/User.php` -- fillable fields, $hidden array (oauth_provider hidden)
- `backend/routes/api.php` -- current route structure
- `backend/tests/Feature/Auth/OnboardingTest.php` -- Pest test patterns to mirror

### Secondary (MEDIUM confidence)
- `frontend/src/components/layout/Topbar.jsx` -- avatar display pattern with fallback
- `frontend/src/components/layout/Sidebar.jsx` -- user data consumption from AuthContext

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all components already exist in codebase, zero new deps
- Architecture: HIGH -- mirrors established onboarding patterns exactly
- Pitfalls: HIGH -- identified from direct code inspection of existing files

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (stable -- no external dependency changes expected)
