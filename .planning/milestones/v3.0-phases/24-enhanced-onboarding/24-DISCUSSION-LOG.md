# Phase 24: Enhanced Onboarding - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-22
**Phase:** 24-enhanced-onboarding
**Areas discussed:** Form layout & fields, Timezone picker UX, Role dropdown design, Phone field fate

---

## Form Layout & Fields

### Question 1: How should the new fields be grouped?

| Option | Description | Selected |
|--------|-------------|----------|
| Single section | All fields in one card — Name, Phone, Timezone, Organization, Role. Simple, matches current design. | ✓ |
| Two sections | Split into 'Personal' and 'Professional' with section headers inside the same card. | |
| Two-column layout | Name/Phone on left, Timezone/Org/Role on right. Wider card, uses horizontal space on desktop. | |

**User's choice:** Single section
**Notes:** None

### Question 2: Visual separator between required and optional fields?

| Option | Description | Selected |
|--------|-------------|----------|
| Subtle divider | Thin border-border line or extra spacing with an 'Optional' label above optional section. | |
| No separator | All fields flow continuously. Optional fields have '(optional)' next to labels. | |
| Muted optional labels | No divider, optional field labels use text-text-muted color to de-emphasize them. | ✓ |

**User's choice:** Muted optional labels
**Notes:** None

### Question 3: Field order?

| Option | Description | Selected |
|--------|-------------|----------|
| Name → Phone → TZ → Org → Role | Personal first, then professional. Timezone bridges the two groups. | |
| Name → TZ → Org → Role → Phone | Group professional fields together. Phone at the bottom. | |
| Name → Org → Role → TZ → Phone | Professional context first, then settings. | |

**User's choice:** Custom order — Name → Phone → Org → Role → Timezone
**Notes:** User provided custom field order via free text.

### Question 4: Form heading?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep current | "Complete your profile" + "Just a few more details to get started" | |
| Update subtitle | Keep heading, change subtitle to "Tell us about yourself and your work" | ✓ |
| New heading entirely | "Set up your workspace" with new subtitle | |

**User's choice:** Update subtitle
**Notes:** None

---

## Timezone Picker UX

### Question 1: How should the timezone dropdown work?

| Option | Description | Selected |
|--------|-------------|----------|
| Searchable dropdown | Custom text input that filters IANA timezones. Pre-filled with browser detection. Shows UTC offset. | ✓ |
| Grouped by region | Dropdown grouped under region headers. No search, just scroll. | |
| Simple native select | Standard HTML <select> with all IANA timezones. Minimal effort. | |

**User's choice:** Searchable dropdown
**Notes:** None

### Question 2: Library or custom?

| Option | Description | Selected |
|--------|-------------|----------|
| Custom built | Build searchable dropdown using Intl API. No new dep. ~100 lines. | ✓ |
| react-select | Well-known library, adds ~30KB, needs dark theme customization. | |
| You decide | Claude picks based on codebase patterns. | |

**User's choice:** Custom built
**Notes:** None

### Question 3: Detection failure fallback?

| Option | Description | Selected |
|--------|-------------|----------|
| UTC default | Fall back to 'UTC'. Safe, user can change. | ✓ |
| Empty — force selection | Leave empty, require manual pick. Ensures accuracy but adds friction. | |
| You decide | Claude picks the fallback behavior. | |

**User's choice:** UTC default
**Notes:** None

---

## Role Dropdown Design

### Question 1: How should 'Other' work?

| Option | Description | Selected |
|--------|-------------|----------|
| Other shows text input | Reveals text input below dropdown for custom role text. Stores in role column. | ✓ |
| Other stores literal 'Other' | Just stores "Other" in DB. Simple but loses actual role info. | |
| No Other option | Only 8 predefined roles. Leave blank if none fit. | |

**User's choice:** Other shows text input
**Notes:** None

### Question 2: Native or custom styled dropdown?

| Option | Description | Selected |
|--------|-------------|----------|
| Custom styled | Matches timezone picker style — dark theme, consistent look. | ✓ |
| Native select | Standard HTML <select> with dark CSS overrides. | |
| You decide | Claude picks based on consistency. | |

**User's choice:** Custom styled
**Notes:** None

### Question 3: Role option order?

| Option | Description | Selected |
|--------|-------------|----------|
| By likely frequency | Security Analyst, SOC Analyst, Threat Hunter, Incident Responder, CISO/Manager, Researcher, Student, Other | ✓ |
| Alphabetical | CISO/Manager, Incident Responder, Researcher, Security Analyst, SOC Analyst, Student, Threat Hunter, Other | |
| You decide | Claude orders based on TIP industry norms. | |

**User's choice:** By likely frequency
**Notes:** None

---

## Phone Field Fate

### Question 1: What should happen to the phone field?

| Option | Description | Selected |
|--------|-------------|----------|
| Make optional | Keep field, remove required validation. Least disruptive. | |
| Remove entirely | Remove from form. Not in requirements, not used anywhere. Can remove dep too. | |
| Keep required | Keep as-is. May be useful for future features (2FA, notifications). | ✓ |

**User's choice:** Keep required
**Notes:** None

---

## Claude's Discretion

- Custom dropdown component internal implementation details
- Exact spacing/padding between form fields
- Keyboard navigation behavior in the custom dropdowns
- Error message wording for timezone validation

## Deferred Ideas

None — discussion stayed within phase scope
