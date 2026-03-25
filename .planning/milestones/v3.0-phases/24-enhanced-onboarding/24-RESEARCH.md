# Phase 24: Enhanced Onboarding - Research

**Researched:** 2026-03-22
**Domain:** React form enhancement + Laravel validation (onboarding flow)
**Confidence:** HIGH

## Summary

Phase 24 extends the existing Get Started onboarding page with three new fields: timezone (required, auto-detected), organization (optional), and role (optional with "Other" custom input). The backend OnboardingController gains expanded validation rules. AuthContext exposes the user's timezone for downstream consumption.

The infrastructure is already in place from Phases 22-23: the database columns (timezone VARCHAR(100), organization VARCHAR(255), role VARCHAR(255)) exist and are nullable; the User model's `$fillable` array includes all three fields; and UserResource already returns them. This phase is purely additive -- modifying frontend form UI, updating the API payload, and expanding backend validation.

**Primary recommendation:** Build two reusable custom dropdown components (SearchableDropdown for timezone, SimpleDropdown for role), update the form layout with all five fields, expand the OnboardingController validation, and add timezone to AuthContext's value object.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Single section layout -- all fields in one card, no section splitting or two-column layout
- **D-02:** Field order: Name -> Phone -> Organization -> Role -> Timezone
- **D-03:** No visual separator between required/optional fields. Optional field labels use muted text color (text-text-muted) to visually de-emphasize them
- **D-04:** Heading stays "Complete your profile", subtitle changes to "Tell us about yourself and your work"
- **D-05:** Required fields: Name, Phone, Timezone. Optional fields: Organization, Role
- **D-06:** Custom-built searchable dropdown (no new dependency). Text input filters ~400 IANA timezones as user types
- **D-07:** Pre-filled with browser-detected timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone`
- **D-08:** Each option shows timezone name + current UTC offset (e.g., "Asia/Manila (UTC+8)")
- **D-09:** Falls back to 'UTC' if browser detection fails
- **D-10:** Timezone is required -- auto-detection handles most cases, user can adjust if needed
- **D-11:** Custom styled dropdown matching timezone picker look (dark theme, consistent styling). No search needed -- only 9 options
- **D-12:** Role options ordered by likely frequency: Security Analyst, SOC Analyst, Threat Hunter, Incident Responder, CISO/Manager, Researcher, Student, Other
- **D-13:** Selecting "Other" reveals a text input below the dropdown for custom role text. Custom text stored in the role column
- **D-14:** Role field is optional -- user can skip it entirely
- **D-15:** Phone remains required, unchanged from current behavior. Keeps react-phone-number-input dependency
- **D-16:** AuthContext value object gains a `timezone` property from the user object (already returned by UserResource since Phase 23)
- **D-17:** OnboardingController updated to accept and validate timezone (required, valid IANA), organization (optional, max 255), role (optional, max 255)
- **D-18:** Timezone validated against PHP's `DateTimeZone::listIdentifiers()` on the backend

### Claude's Discretion
- Custom dropdown component internal implementation details
- Exact spacing/padding between form fields
- Keyboard navigation behavior in the custom dropdowns
- Error message wording for timezone validation

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ONBD-01 | User sees timezone field on Get Started page, auto-detected from browser, editable via dropdown | Browser timezone detection API, IANA timezone list generation, searchable dropdown pattern |
| ONBD-02 | User can optionally enter their organization name during onboarding | Simple text input field, optional validation on backend |
| ONBD-03 | User can optionally select their role from a dropdown | Simple dropdown with "Other" reveal pattern, role options list |
| ONBD-04 | Backend validates and stores timezone, organization, and role fields on onboarding submission | Laravel validation rules, DateTimeZone::listIdentifiers(), controller update pattern |
| TZ-02 | AuthContext exposes user timezone for frontend consumption | AuthContext value object extension, user.timezone access |
</phase_requirements>

## Standard Stack

### Core (already installed -- no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19 | UI framework | Already in use |
| Vite | 7 | Build tool | Already in use |
| Tailwind CSS | 3 | Styling | Already in use |
| Laravel | 11 | Backend framework | Already in use |

### No New Dependencies Required

Per D-06, the searchable timezone dropdown is custom-built. No new npm packages or composer packages are needed for this phase.

## Architecture Patterns

### Component Structure

```
frontend/src/
  pages/
    GetStartedPage.jsx           # Modified: add 3 new fields, update subtitle
  components/
    ui/
      SearchableDropdown.jsx     # NEW: reusable searchable dropdown (timezone)
      SimpleDropdown.jsx         # NEW: styled dropdown without search (role)
  contexts/
    AuthContext.jsx              # Modified: add timezone to value object
  api/
    auth.js                     # Modified: expand completeOnboarding payload
backend/
  app/Http/Controllers/Auth/
    OnboardingController.php     # Modified: add validation for 3 new fields
  tests/Feature/Auth/
    OnboardingTest.php           # Modified: add tests for new fields
```

### Pattern 1: Browser Timezone Detection

**What:** Use the Intl API to detect the user's IANA timezone at component mount.
**When to use:** When initializing the timezone field default value.

```javascript
// Detect browser timezone with UTC fallback
function detectTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
```

**Confidence:** HIGH -- `Intl.DateTimeFormat().resolvedOptions().timeZone` is supported in all modern browsers (Chrome 24+, Firefox 29+, Safari 10+, Edge 12+). Returns IANA timezone strings like "America/New_York".

### Pattern 2: IANA Timezone List with UTC Offsets

**What:** Generate the full list of IANA timezones with their current UTC offsets for display.
**When to use:** Populating the searchable timezone dropdown options.

```javascript
// Generate timezone options with current UTC offsets
function getTimezoneOptions() {
  return Intl.supportedValuesOf('timeZone').map((tz) => {
    const offset = getUtcOffset(tz);
    return { value: tz, label: `${tz} (${offset})` };
  });
}

function getUtcOffset(timeZone) {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'shortOffset',
  });
  const parts = formatter.formatToParts(now);
  const offsetPart = parts.find((p) => p.type === 'timeZoneName');
  return offsetPart?.value || 'UTC';
}
```

**Confidence:** HIGH -- `Intl.supportedValuesOf('timeZone')` returns ~400 IANA timezone identifiers. Supported in Chrome 93+, Firefox 93+, Safari 15.4+, Edge 93+. The `timeZoneName: 'shortOffset'` format produces strings like "UTC+8", "UTC-5", etc.

### Pattern 3: Searchable Dropdown Component

**What:** A custom dropdown with text filtering for large option sets.
**When to use:** Timezone picker (D-06).

Key implementation details:
- Text input that filters the options list as user types
- Dropdown panel appears below input on focus, hides on blur/select
- Options rendered in a scrollable container (max-height with overflow-y)
- Click outside closes dropdown (useEffect with document click listener)
- Keyboard: arrow keys navigate, Enter selects, Escape closes
- Matches `input-field` CSS class for consistent dark theme styling

```javascript
// SearchableDropdown skeleton
function SearchableDropdown({ options, value, onChange, placeholder }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  const filtered = options.filter((opt) =>
    opt.label.toLowerCase().includes(query.toLowerCase())
  );

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Display selected label or search query
  const displayValue = isOpen ? query : (value ? options.find(o => o.value === value)?.label : '');

  return (
    <div ref={ref} className="relative">
      <input
        className="input-field"
        value={displayValue}
        onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
        onFocus={() => { setIsOpen(true); setQuery(''); }}
        placeholder={placeholder}
      />
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto bg-surface-2 border border-border rounded-lg shadow-lg">
          {filtered.map((opt) => (
            <button
              key={opt.value}
              className="w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-violet/10 font-mono"
              onMouseDown={() => { onChange(opt.value); setIsOpen(false); }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Pattern 4: Simple Dropdown with "Other" Reveal

**What:** A styled dropdown for small option sets with conditional text input reveal.
**When to use:** Role picker (D-11, D-13).

```javascript
// Role dropdown with "Other" text input reveal
const ROLE_OPTIONS = [
  'Security Analyst',
  'SOC Analyst',
  'Threat Hunter',
  'Incident Responder',
  'CISO/Manager',
  'Researcher',
  'Student',
  'Other',
];

// When role === 'Other', show a text input for custom role
// Submit the customRole text (not "Other") to the backend
```

### Pattern 5: Laravel IANA Timezone Validation

**What:** Validate timezone against PHP's built-in timezone list.
**When to use:** OnboardingController validation (D-18).

```php
// Laravel validation using timezone_identifiers_list()
$validated = $request->validate([
    'name' => ['required', 'string', 'min:2', 'max:255'],
    'phone' => ['required', 'string', 'min:5', 'max:20'],
    'timezone' => ['required', 'string', 'timezone:all'],
    'organization' => ['nullable', 'string', 'max:255'],
    'role' => ['nullable', 'string', 'max:255'],
]);
```

**Confidence:** HIGH -- Laravel's `timezone:all` validation rule uses `DateTimeZone::listIdentifiers(DateTimeZone::ALL)` internally. This validates against the full IANA timezone database including ~400 identifiers.

### Anti-Patterns to Avoid

- **Mutating form state directly:** Always use immutable state updates (spread operator for errors object)
- **Fetching timezone list from backend:** The browser already has the full IANA list via `Intl.supportedValuesOf('timeZone')` -- no API call needed
- **Using native `<select>` for timezone:** 400+ options are unusable without search filtering
- **Storing "Other" as the role value:** When user selects "Other" and types custom text, store the custom text, not the literal string "Other"

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Timezone detection | Manual offset calculation | `Intl.DateTimeFormat().resolvedOptions().timeZone` | Browser API handles DST, locale, and edge cases correctly |
| Timezone list | Hardcoded array of timezones | `Intl.supportedValuesOf('timeZone')` | Always current, matches IANA database, ~400 entries maintained by the browser |
| UTC offset display | Manual GMT offset math | `Intl.DateTimeFormat` with `timeZoneName: 'shortOffset'` | Correctly handles DST transitions and half-hour offsets |
| Backend timezone validation | Custom validation with hardcoded list | Laravel's `timezone:all` rule | Uses PHP's `DateTimeZone::listIdentifiers()` -- always current |

## Common Pitfalls

### Pitfall 1: Timezone Dropdown Performance
**What goes wrong:** Rendering ~400 dropdown options causes jank on open.
**Why it happens:** React re-renders all option elements on every filter keystroke.
**How to avoid:** Filter first, then render only matching results. Limit visible options to first 50 matches. The search typically narrows to <20 items after 2-3 characters.
**Warning signs:** Noticeable lag when opening dropdown or typing in search.

### Pitfall 2: Click-Outside vs onBlur Race Condition
**What goes wrong:** Clicking a dropdown option triggers the input's onBlur before the option's onClick fires, closing the dropdown without selecting.
**Why it happens:** onBlur fires before onClick in the DOM event order.
**How to avoid:** Use `onMouseDown` (not onClick) for option selection -- mouseDown fires before blur. Alternatively, use a small timeout on blur handler.
**Warning signs:** User clicks an option but nothing gets selected and dropdown closes.

### Pitfall 3: Existing Users Re-onboarding
**What goes wrong:** Adding "required" timezone field breaks existing onboarded users if they revisit.
**Why it happens:** Existing users have null timezone but `onboarding_completed_at` is set.
**How to avoid:** The `onboardingCompleted` guard in GetStartedPage already redirects completed users to dashboard. Existing users are NOT forced back. The new fields are stored only during initial onboarding. This is already handled by the auth guard pattern.
**Warning signs:** Existing test users getting stuck in onboarding loop.

### Pitfall 4: "Other" Role Value Confusion
**What goes wrong:** Storing "Other" literally in the database instead of the user's custom text.
**Why it happens:** Forgetting to swap "Other" with the custom text before submission.
**How to avoid:** In the submit handler, if role dropdown value is "Other", use the custom text input value instead. If custom text is empty and "Other" is selected, send null (field is optional).
**Warning signs:** Database has entries with role = "Other" instead of actual role text.

### Pitfall 5: Timezone Offset Display Staleness
**What goes wrong:** UTC offsets shown are wrong for some timezones.
**Why it happens:** Computing offsets once at mount time but DST can change them (e.g., "America/New_York" is UTC-5 in winter, UTC-4 in summer).
**How to avoid:** Compute offsets when generating the list (which happens at component mount). Since users complete onboarding once, stale offsets from DST transitions mid-session are extremely unlikely. No caching needed.

## Code Examples

### Current GetStartedPage Form State Pattern
```javascript
// Existing pattern from GetStartedPage.jsx -- extend this
const [name, setName] = useState(getDefaultName(user));
const [phone, setPhone] = useState('');
const [errors, setErrors] = useState({});

// Add new fields following same pattern:
const [organization, setOrganization] = useState('');
const [role, setRole] = useState('');
const [customRole, setCustomRole] = useState('');
const [timezone, setTimezone] = useState(detectTimezone());
```

### Updated completeOnboarding Payload
```javascript
// api/auth.js
export async function completeOnboarding({ name, phone, timezone, organization, role }) {
  await csrfCookie();
  return apiClient.post('/api/onboarding', { name, phone, timezone, organization, role });
}
```

### Updated OnboardingController
```php
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
        'onboarding_completed_at' => now(),
    ]);

    return new UserResource($user->fresh());
}
```

### AuthContext Timezone Exposure
```javascript
// Add timezone to the useMemo value object
const value = useMemo(() => ({
  user,
  loading,
  error,
  isAuthenticated: user !== null,
  emailVerified: user?.email_verified ?? false,
  onboardingCompleted: user?.onboarding_completed ?? false,
  userInitials: getInitials(user?.name),
  timezone: user?.timezone ?? 'UTC',  // NEW -- TZ-02
  login,
  register,
  logout,
  refreshUser: checkAuth,
}), [user, loading, error, login, register, logout, checkAuth]);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `moment-timezone` for timezone lists | `Intl.supportedValuesOf('timeZone')` | 2022 (browser support) | Zero dependency for timezone list |
| Manual GMT offset strings | `Intl.DateTimeFormat` with `shortOffset` | Safari 15.4+ (2022) | Browser-native offset formatting |
| `in` validation rule with hardcoded list | Laravel `timezone:all` rule | Laravel 9+ | Always-current IANA validation |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Pest PHP (on PHPUnit) |
| Config file | `backend/phpunit.xml` |
| Quick run command | `cd backend && php artisan test --filter=OnboardingTest` |
| Full suite command | `cd backend && php artisan test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ONBD-01 | Timezone field stored on onboarding | unit (feature) | `cd backend && php artisan test --filter=OnboardingTest -x` | Exists but needs new test cases |
| ONBD-02 | Organization stored on onboarding | unit (feature) | `cd backend && php artisan test --filter=OnboardingTest -x` | Exists but needs new test cases |
| ONBD-03 | Role stored on onboarding | unit (feature) | `cd backend && php artisan test --filter=OnboardingTest -x` | Exists but needs new test cases |
| ONBD-04 | Backend validates timezone (required, valid IANA), org/role (optional, max 255) | unit (feature) | `cd backend && php artisan test --filter=OnboardingTest -x` | Exists but needs new test cases |
| TZ-02 | AuthContext exposes timezone | manual-only | N/A -- React context, no backend test | N/A (frontend, no test infra) |

### Sampling Rate
- **Per task commit:** `cd backend && php artisan test --filter=OnboardingTest`
- **Per wave merge:** `cd backend && php artisan test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] New test cases in `backend/tests/Feature/Auth/OnboardingTest.php` -- covers ONBD-01 through ONBD-04:
  - Valid onboarding with timezone, organization, role
  - Missing timezone returns 422
  - Invalid timezone returns 422
  - Optional organization/role accepted as null
  - Organization exceeding 255 chars returns 422
  - Existing tests still pass with updated payload (backward compat)

## Open Questions

1. **`Intl.supportedValuesOf('timeZone')` browser coverage**
   - What we know: Supported in Chrome 93+, Firefox 93+, Safari 15.4+, Edge 93+ (all 2021-2022)
   - What's unclear: Whether to provide a hardcoded fallback for very old browsers
   - Recommendation: No fallback needed. The project targets modern browsers (React 19, Vite 7). If somehow unavailable, the user still has the text input and can type their timezone manually.

## Sources

### Primary (HIGH confidence)
- Project source code: `GetStartedPage.jsx`, `AuthContext.jsx`, `OnboardingController.php`, `UserResource.php`, `User.php` model -- directly read
- MDN Web Docs: `Intl.DateTimeFormat`, `Intl.supportedValuesOf` -- standard browser APIs
- Laravel documentation: `timezone:all` validation rule -- uses `DateTimeZone::listIdentifiers()`

### Secondary (MEDIUM confidence)
- Browser compatibility data for Intl APIs -- based on training data (2022+ support), cross-verified with MDN baseline status

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all existing
- Architecture: HIGH -- straightforward form extension with well-understood patterns
- Pitfalls: HIGH -- common React dropdown patterns, well-documented edge cases

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (stable domain, no fast-moving dependencies)
