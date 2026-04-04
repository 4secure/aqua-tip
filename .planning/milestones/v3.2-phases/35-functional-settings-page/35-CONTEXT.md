# Phase 35: Functional Settings Page - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the current dummy/mock Settings page with a functional profile page displaying real user data from AuthContext and enabling profile editing with backend sync. Covers SETTINGS-01 (real data display) and SETTINGS-02 (editable profile with immediate reflection).

</domain>

<decisions>
## Implementation Decisions

### Page Structure
- **D-01:** Remove all 3 out-of-scope tabs (API Keys, Webhooks, Usage) entirely. No tab bar.
- **D-02:** Settings page becomes a single profile/account page — no tabs, just one glassmorphism card layout.
- **D-03:** Remove all mock data imports (API_KEYS, UsageChart, etc.) from the page.

### Editable Fields
- **D-04:** All 5 onboarding fields are editable: name, phone, timezone, organization, role.
- **D-05:** Reuse existing onboarding components: `SearchableDropdown` (timezone with IANA list), `PhoneNumberInput` (phone with country flags), `SimpleDropdown` (role with ROLE_OPTIONS).
- **D-06:** Email is visible but read-only (with lock icon or read-only indicator). Email changes require verification flow — out of scope.

### Save Behavior
- **D-07:** Single "Save Changes" button at the bottom of the form. Button disabled until a field changes from its initial value.
- **D-08:** Button shows loading state during API call (spinner or "Saving..." text).
- **D-09:** Toast notification for save feedback — green toast for success ("Profile updated"), red toast for errors. This requires a new lightweight toast component (none exists in codebase).
- **D-10:** Validation errors display inline per-field (reuse same pattern as onboarding form).
- **D-11:** After successful save, call `refreshUser()` from AuthContext to sync updated data across sidebar, topbar, and all consumers.

### Profile Display
- **D-12:** Show avatar (from `user.avatar_url` for OAuth users) with initials circle fallback (reuse `getInitials()` from AuthContext).
- **D-13:** Show current plan name and trial days remaining (read-only). Data already available from AuthContext user object.
- **D-14:** Show OAuth provider badge indicating signup method (Google, GitHub, or email icon).
- **D-15:** Show account creation date. Requires adding `created_at` to `UserResource.php` (currently not exposed).

### Backend
- **D-16:** New `PUT /api/profile` or `PATCH /api/profile` endpoint for updating user profile fields. Validation rules should mirror onboarding (name required min:2, phone required min:5, timezone required timezone:all, organization nullable, role nullable).
- **D-17:** New `ProfileController` or extend existing `UserController` — Claude's discretion on organization.

### Claude's Discretion
- Toast component implementation approach (inline component vs extracted reusable component)
- Backend controller organization (new ProfileController vs extending UserController)
- Avatar sizing and positioning within the profile header area
- Exact read-only styling for email field (lock icon, greyed-out, or "read-only" text)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Auth & User Data
- `frontend/src/contexts/AuthContext.jsx` -- AuthProvider, useAuth, refreshUser(), getInitials(), user shape
- `frontend/src/api/auth.js` -- All auth API functions including completeOnboarding()
- `backend/app/Http/Resources/UserResource.php` -- User data shape returned by API (needs created_at addition)
- `backend/app/Models/User.php` -- Fillable fields, relationships, casts
- `backend/app/Http/Controllers/Auth/UserController.php` -- GET /api/user endpoint
- `backend/app/Http/Controllers/Auth/OnboardingController.php` -- Validation rules to mirror for profile update

### Reusable Components
- `frontend/src/pages/GetStartedPage.jsx` -- Onboarding form with all 5 fields, ROLE_OPTIONS, timezone detection, component usage patterns
- `frontend/src/components/ui/SearchableDropdown.jsx` -- Timezone dropdown component
- `frontend/src/components/ui/PhoneNumberInput.jsx` -- Phone input with country flags
- `frontend/src/components/ui/SimpleDropdown.jsx` -- Role dropdown component

### Current Page (to be replaced)
- `frontend/src/pages/SettingsPage.jsx` -- Current mock settings page (full rewrite)

### Routes
- `backend/routes/api.php` -- API route definitions (new profile update endpoint needed)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SearchableDropdown` — timezone picker with IANA timezone list, already used in onboarding
- `PhoneNumberInput` — phone input with SVG country flags and auto-detection, already used in onboarding
- `SimpleDropdown` — role picker with predefined options, already used in onboarding
- `getInitials()` in AuthContext — generates initials from user name
- `refreshUser()` in AuthContext — re-fetches /api/user and updates state
- `GradientButton` — existing styled button component (potential for Save button)
- `useChartJs` hook — currently imported by SettingsPage but will be removed

### Established Patterns
- Glassmorphism cards: `bg-surface/60 border border-border backdrop-blur-sm rounded-xl`
- Form fields: `input-field` CSS class for text inputs, `text-xs text-text-muted mb-1 block` for labels
- API client: `apiClient` from `api/client.js` with CSRF cookie handling
- Onboarding validation: inline error display with `errors` state object keyed by field name
- Auth-aware components: `useAuth()` hook for accessing user data

### Integration Points
- AuthContext `refreshUser()` must be called after successful profile save
- Sidebar shows user name/initials — will auto-update via AuthContext
- Topbar shows plan chip — will auto-update via AuthContext
- Route already exists: `/settings` in App.jsx router
- No new route needed, just page content replacement

</code_context>

<specifics>
## Specific Ideas

- Profile header area with avatar/initials prominently displayed alongside name and email
- Layout follows the preview mockup: avatar + identity at top, editable fields below, save button at bottom
- Toast notification system is new infrastructure — keep it lightweight and reusable for future pages

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 35-functional-settings-page*
*Context gathered: 2026-03-31*
