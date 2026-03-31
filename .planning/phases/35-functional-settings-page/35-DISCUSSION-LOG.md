# Phase 35: Functional Settings Page - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-31
**Phase:** 35-functional-settings-page
**Areas discussed:** Page structure, Editable fields, Save behavior, Profile display

---

## Page Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Remove all 3 tabs | Strip API Keys, Webhooks, and Usage entirely. Single profile page with no tab bar. | :heavy_check_mark: |
| Keep as 2 tabs: Profile + Account | Profile tab for editable fields, Account tab for read-only info. | |
| Keep tabs but show "Coming Soon" | Keep tabs with placeholder/coming-soon state. | |

**User's choice:** Remove all 3 tabs (Recommended)
**Notes:** Clean and honest approach — no fake features. Single page layout.

---

## Editable Fields

| Option | Description | Selected |
|--------|-------------|----------|
| Name | Text input, pre-filled from AuthContext | :heavy_check_mark: |
| Phone | Reuse PhoneNumberInput from onboarding | :heavy_check_mark: |
| Timezone | Reuse SearchableDropdown with IANA timezone list | :heavy_check_mark: |
| Organization + Role | Organization as text input, Role as SimpleDropdown | :heavy_check_mark: |

**User's choice:** All 4 options selected (all 5 fields editable)

### Email Visibility

| Option | Description | Selected |
|--------|-------------|----------|
| Visible, read-only | Show email with lock icon, can't change | :heavy_check_mark: |
| Hidden | Don't show email on settings page | |

**User's choice:** Visible, read-only (Recommended)
**Notes:** Email changes require verification flow — out of scope for this phase.

---

## Save Behavior

### Save Mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Single Save button | One button at bottom, disabled until field changes | :heavy_check_mark: |
| Inline per-field save | Each field has own save icon/button | |
| Auto-save on blur | Fields save when clicking away | |

**User's choice:** Single Save button (Recommended)

### Feedback Style

| Option | Description | Selected |
|--------|-------------|----------|
| Inline success message | Green text below Save button, fades after 3s | |
| Toast notification | Floating toast at top-right | :heavy_check_mark: |
| You decide | Claude picks based on existing patterns | |

**User's choice:** Toast notification
**Notes:** No toast system exists in codebase — will need a new lightweight toast component.

---

## Profile Display

| Option | Description | Selected |
|--------|-------------|----------|
| Avatar + initials fallback | Show OAuth avatar or initials circle at top of profile | :heavy_check_mark: |
| Plan & trial status | Show plan name and trial days remaining (read-only) | :heavy_check_mark: |
| OAuth provider badge | Badge showing signup method (Google, GitHub, email) | :heavy_check_mark: |
| Account creation date | Show when account was created (needs created_at in UserResource) | :heavy_check_mark: |

**User's choice:** All 4 options selected
**Notes:** created_at needs to be added to UserResource.php backend response.

---

## Claude's Discretion

- Toast component implementation approach
- Backend controller organization
- Avatar sizing and positioning
- Read-only email field styling

## Deferred Ideas

None — discussion stayed within phase scope
