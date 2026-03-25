# Phase 24: Enhanced Onboarding - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Users provide timezone, organization, and role during onboarding with smart defaults. The Get Started page gains three new fields (timezone auto-detected, organization optional, role optional) alongside existing Name and Phone fields. AuthContext exposes the user's stored timezone for frontend consumption. Existing onboarded users are not forced back to onboarding.

</domain>

<decisions>
## Implementation Decisions

### Form layout & fields
- **D-01:** Single section layout — all fields in one card, no section splitting or two-column layout
- **D-02:** Field order: Name → Phone → Organization → Role → Timezone
- **D-03:** No visual separator between required/optional fields. Optional field labels use muted text color (text-text-muted) to visually de-emphasize them
- **D-04:** Heading stays "Complete your profile", subtitle changes to "Tell us about yourself and your work"
- **D-05:** Required fields: Name, Phone, Timezone. Optional fields: Organization, Role

### Timezone picker UX
- **D-06:** Custom-built searchable dropdown (no new dependency). Text input filters ~400 IANA timezones as user types
- **D-07:** Pre-filled with browser-detected timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone`
- **D-08:** Each option shows timezone name + current UTC offset (e.g., "Asia/Manila (UTC+8)")
- **D-09:** Falls back to 'UTC' if browser detection fails
- **D-10:** Timezone is required — auto-detection handles most cases, user can adjust if needed

### Role dropdown design
- **D-11:** Custom styled dropdown matching timezone picker look (dark theme, consistent styling). No search needed — only 9 options
- **D-12:** Role options ordered by likely frequency: Security Analyst, SOC Analyst, Threat Hunter, Incident Responder, CISO/Manager, Researcher, Student, Other
- **D-13:** Selecting "Other" reveals a text input below the dropdown for custom role text. Custom text stored in the role column
- **D-14:** Role field is optional — user can skip it entirely

### Phone field
- **D-15:** Phone remains required, unchanged from current behavior. Keeps react-phone-number-input dependency

### AuthContext timezone exposure
- **D-16:** AuthContext value object gains a `timezone` property from the user object (already returned by UserResource since Phase 23)

### Backend validation
- **D-17:** OnboardingController updated to accept and validate timezone (required, valid IANA), organization (optional, max 255), role (optional, max 255)
- **D-18:** Timezone validated against PHP's `DateTimeZone::listIdentifiers()` on the backend

### Claude's Discretion
- Custom dropdown component internal implementation details
- Exact spacing/padding between form fields
- Keyboard navigation behavior in the custom dropdowns
- Error message wording for timezone validation

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — Full v3.0 requirements; Phase 24 maps to ONBD-01, ONBD-02, ONBD-03, ONBD-04, TZ-02

### Prior phase context
- `.planning/phases/22-schema-data-foundation/22-CONTEXT.md` — Schema decisions: timezone VARCHAR(100), organization VARCHAR(255), role VARCHAR(255), all nullable in DB
- `.planning/phases/23-creditresolver-plan-aware-backend/23-CONTEXT.md` — UserResource already returns timezone, organization, role fields

### Frontend (modify)
- `frontend/src/pages/GetStartedPage.jsx` — Current onboarding form with Name + Phone fields
- `frontend/src/contexts/AuthContext.jsx` — Add timezone to exposed context value
- `frontend/src/api/auth.js` — completeOnboarding API call (may need payload update)

### Backend (modify)
- `backend/app/Http/Controllers/Auth/OnboardingController.php` — Add timezone, organization, role validation and storage
- `backend/app/Http/Resources/UserResource.php` — Already returns new fields (Phase 23)

### Existing patterns
- `frontend/src/components/ui/` — UI components for consistent styling reference

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `GradientButton` component — used for form submit button
- `ParticleBackground` component — used for page background effect
- `react-phone-number-input` — Phone field with country code picker (keeping as-is)
- `useAuth` hook — exposes user data from AuthContext
- `input-field` CSS class — existing dark-theme input styling

### Established Patterns
- Glassmorphism card: `bg-surface border border-border rounded-xl p-8`
- Error display: inline red text below fields with `text-xs text-red font-mono`
- Form state: useState per field with errors object from 422 responses
- Auth guards at top of component: redirect if not auth/verified/already onboarded
- Font classes: `font-display` for headings, `font-mono` for body text, `font-body` for general text

### Integration Points
- `completeOnboarding` API function in `frontend/src/api/auth.js` — needs timezone, organization, role in payload
- `OnboardingController::__invoke()` — needs expanded validation rules
- `AuthContext` value object — needs timezone property for TZ-02
- `ProtectedRoute` component — onboarding guard already works, no changes needed

</code_context>

<specifics>
## Specific Ideas

- Subtitle "Tell us about yourself and your work" signals the professional context without over-promising
- Optional fields use muted label color rather than dividers — keeps the form clean and compact
- Custom dropdowns match the dark glassmorphism theme natively — no library theming needed
- "Other" role option reveals inline text input — captures real role data instead of losing it
- Timezone pre-filled from browser means most users just confirm and move on — minimal friction

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 24-enhanced-onboarding*
*Context gathered: 2026-03-22*
