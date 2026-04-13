# Phase 50: Frontend Security - Research

**Researched:** 2026-04-13
**Domain:** Frontend XSS/redirect/tab-nabbing hardening, CDN elimination, consent gating
**Confidence:** HIGH

## Summary

This phase hardens five specific frontend attack surfaces in the Aqua TIP React application. All five requirements are well-scoped, file-targeted changes with no new dependencies needed (DOMPurify and Leaflet are already installed). The primary complexity is in the DOMPurify hook configuration and the GTM consent gating, both of which have well-documented APIs.

The backend currently sends **arbitrary error message strings** (not error codes) via `urlencode($message)` in `SocialAuthController::redirectWithError()`. The frontend must therefore map these known messages to a safe display, rather than rendering the raw query parameter. The OAuth redirect URL comes from the backend API (`/api/auth/{provider}/redirect`), which returns a Socialite-generated URL. Validation should happen on the URL returned from that API before assigning to `window.location.href`.

**Primary recommendation:** Execute as five independent, small tasks -- one per FRONT requirement. No new npm packages needed. DOMPurify hook should be extracted to a shared utility for reuse.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** OAuth `?error=` query parameter on LoginPage is whitelisted to known error codes (e.g., `auth_failed`, `cancelled`, `provider_error`). Unknown/arbitrary strings are silently ignored -- no message displayed.
- **D-02:** OAuth redirect URLs are validated against an allowlist of known provider domains (google.com, github.com) before any `window.location` navigation. Unrecognized domains are blocked.
- **D-03:** Remove `target` from DOMPurify `ALLOWED_ATTR` in DarkWebPage.jsx -- all sanitized links open in same tab by default.
- **D-04:** Add a DOMPurify `afterSanitizeAttributes` hook that forces `rel="noopener noreferrer"` on every `<a>` element. This ensures no tab-nabbing regardless of input HTML.
- **D-05:** Remove the external `unpkg.com/leaflet@1.9.4/dist/leaflet.css` `<link>` from `index.html`.
- **D-06:** Import `leaflet/dist/leaflet.css` from node_modules (in `useLeaflet.js` or `main.css`). Vite bundles it into the production build. Zero external CDN requests for map styles.
- **D-07:** Google Tag Manager script in `index.html` is removed from static HTML. GTM is injected dynamically via JavaScript only after the user accepts cookies.
- **D-08:** Consent stored in `localStorage`. If consent is `'accepted'`, GTM script is injected on page load. If `'rejected'` or unset, GTM does not load.
- **D-09:** Minimal cookie consent banner: fixed bottom bar with dark glassmorphism styling (matching site theme), short text ("We use cookies for analytics"), Accept and Reject buttons. Disappears permanently after choice.

### Claude's Discretion
- Exact list of whitelisted OAuth error codes (based on what backend actually returns)
- Whether the consent banner is a standalone component or embedded in App.jsx
- DOMPurify hook placement (inline in DarkWebPage or extracted to a shared utility)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FRONT-01 | OAuth error parameter whitelisted to known error codes on LoginPage | Backend sends 2 known messages via `redirectWithError()`: "Unsupported provider." and "Authentication failed. Please try again." -- map these to safe error codes |
| FRONT-02 | OAuth redirect URL validated against allowed provider domains before redirect | `SocialAuthButtons.jsx` line 32 does `window.location.href = url` with no validation. URL comes from backend API. Validate hostname against allowlist before navigation |
| FRONT-03 | DOMPurify config removes target from ALLOWED_ATTR, enforces rel=noopener noreferrer via hook | `DarkWebPage.jsx` line 20 has `ALLOWED_ATTR: ['href', 'target', 'rel']` -- remove `target`, add `afterSanitizeAttributes` hook |
| FRONT-04 | External Leaflet CSS bundled locally (eliminates CDN dependency) | `index.html` line 14 loads from unpkg.com CDN. Leaflet 1.9.4 already in node_modules. Import CSS in `useLeaflet.js` |
| FRONT-05 | Google Tag Manager gated behind consent check (GDPR compliance) | GTM script at `index.html` lines 4-10 and noscript at lines 17-19. Remove both, inject dynamically after consent |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **No TypeScript** -- all files are `.jsx`/`.js`
- **No tests exist** -- no test infrastructure to maintain
- **No linter/formatter** -- no pre-commit checks to worry about
- **All data is mocked** -- no API integration testing needed
- **Dark theme only** -- consent banner must match dark glassmorphism pattern
- **Design tokens** defined in `tailwind.config.js` (violet, cyan, surface, border, etc.)
- **Fonts:** Outfit (UI) and JetBrains Mono (mono/data)
- **Glassmorphism pattern:** `bg-surface/60 border border-border backdrop-blur-sm`

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| DOMPurify | 3.3.3 | HTML sanitization | Already used in DarkWebPage.jsx, industry standard for XSS prevention |
| Leaflet | 1.9.4 | Map rendering + CSS | Already installed, CSS ships in `node_modules/leaflet/dist/leaflet.css` |
| React Router DOM | 7.13.1 | URL params, navigation | Already used for `useSearchParams` in LoginPage |

### No New Dependencies Needed
This phase requires zero new npm packages. All functionality is achievable with existing dependencies and vanilla JS.

## Architecture Patterns

### Pattern 1: OAuth Error Whitelist (FRONT-01)

**What:** Map known backend error messages to safe display strings. Reject unknown values silently.

**Current backend behavior** (from `SocialAuthController.php`):
- Line 43: `"Authentication failed. Please try again."` -- Socialite exception
- Line 37: `"Unsupported provider."` -- invalid provider string

The backend URL-encodes the full message string and puts it in `?error=`. The frontend currently renders `searchParams.get('error')` directly (XSS vector via crafted URL).

**Recommended approach:**
```javascript
// Known error codes mapped from backend messages
const OAUTH_ERROR_MAP = {
  'Authentication failed. Please try again.': 'Authentication failed. Please try again.',
  'Unsupported provider.': 'Authentication provider is not supported.',
};

// In useEffect:
const errorParam = searchParams.get('error');
if (errorParam) {
  const safeMessage = OAUTH_ERROR_MAP[errorParam] || null;
  if (safeMessage) {
    setGeneralError(safeMessage);
  }
  // Always clear the param regardless
  setSearchParams({}, { replace: true });
}
```

**Key insight:** The backend sends full human-readable messages, not codes. The whitelist must match the exact decoded message strings the backend produces. Unknown strings are silently dropped -- no error displayed. `searchParams.get()` auto-decodes URL encoding.

### Pattern 2: OAuth Redirect URL Validation (FRONT-02)

**What:** Validate the URL returned from `/api/auth/{provider}/redirect` before navigating.

**Current code** (`SocialAuthButtons.jsx` line 31-32):
```javascript
const url = await getSocialRedirectUrl(provider);
window.location.href = url;  // No validation!
```

**Recommended approach:**
```javascript
const ALLOWED_OAUTH_HOSTS = [
  'accounts.google.com',
  'github.com',
];

function isAllowedOAuthRedirect(url) {
  try {
    const parsed = new URL(url);
    return ALLOWED_OAUTH_HOSTS.some(
      (host) => parsed.hostname === host || parsed.hostname.endsWith('.' + host)
    );
  } catch {
    return false;
  }
}

// In handleSocialLogin:
const url = await getSocialRedirectUrl(provider);
if (isAllowedOAuthRedirect(url)) {
  window.location.href = url;
} else {
  setGeneralError('Invalid authentication redirect. Please try again.');
  setLoadingProvider(null);
}
```

**Key insight:** Google OAuth uses `accounts.google.com`, GitHub uses `github.com`. The subdomain check (`.endsWith`) handles potential variations but still blocks attacker-controlled domains.

### Pattern 3: DOMPurify Tab-Nabbing Fix (FRONT-03)

**What:** Remove `target` from allowed attributes and add an `afterSanitizeAttributes` hook to enforce `rel="noopener noreferrer"` on all anchors.

**Current code** (`DarkWebPage.jsx` line 20):
```javascript
DOMPurify.sanitize(breach.context, {
  ALLOWED_TAGS: ['b', 'br', 'code', 'a'],
  ALLOWED_ATTR: ['href', 'target', 'rel']
});
```

**Recommended approach -- extract to shared utility:**
```javascript
// src/utils/sanitize.js
import DOMPurify from 'dompurify';

// Register hook once at module scope (NOT inside a component)
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('rel', 'noopener noreferrer');
    node.removeAttribute('target');
  }
});

export function sanitizeHtml(dirty, options = {}) {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'br', 'code', 'a'],
    ALLOWED_ATTR: ['href', 'rel'],
    ...options,
  });
}
```

Then in DarkWebPage.jsx:
```javascript
import { sanitizeHtml } from '../utils/sanitize';
// Replace DOMPurify.sanitize(...) with sanitizeHtml(breach.context)
```

**Key insight:** DOMPurify hooks are global and persist for the DOMPurify instance. Registering at module scope ensures exactly one registration. Extracting to a utility prevents duplication if more pages need sanitization later.

### Pattern 4: Leaflet CSS Local Bundle (FRONT-04)

**What:** Remove CDN `<link>` from `index.html`, import CSS from node_modules.

**Changes:**
1. Delete line 14 from `index.html`: `<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">`
2. Add import in `useLeaflet.js` at top: `import 'leaflet/dist/leaflet.css';`

Vite handles CSS imports from node_modules natively -- it will bundle the CSS into the production build. No configuration needed.

**Why `useLeaflet.js` over `main.css`:** The CSS import is co-located with the Leaflet JS usage. If Leaflet is tree-shaken or the hook is removed, the CSS goes with it. Importing in `main.css` would load Leaflet CSS on every page regardless.

### Pattern 5: GTM Consent Gating (FRONT-05)

**What:** Remove static GTM from `index.html`, create a consent banner component, inject GTM only after user accepts.

**Consent storage:**
```javascript
// localStorage key
const CONSENT_KEY = 'cookie_consent';
// Values: 'accepted' | 'rejected' | null (not yet chosen)
```

**GTM injection function:**
```javascript
function injectGTM() {
  if (document.getElementById('gtm-script')) return; // Idempotent guard

  // Create and inject the GTM script element
  const script = document.createElement('script');
  script.id = 'gtm-script';
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtm.js?id=GTM-WN949DRD';

  // Initialize dataLayer
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });

  document.head.appendChild(script);
}
```

**Consent banner component** (standalone file recommended):
- `src/components/ui/CookieConsent.jsx`
- Fixed position bottom bar with glassmorphism styling
- Two buttons: Accept (violet primary) and Reject (ghost/secondary)
- On Accept: save to localStorage, inject GTM, hide banner
- On Reject: save to localStorage, hide banner (no GTM)
- On page load: if consent is `'accepted'`, inject GTM immediately (in component useEffect)
- Renders in `App.jsx` outside of Routes, visible on all pages

**Recommended placement in App.jsx:**
```jsx
// After </Routes>, before closing </Suspense>:
<CookieConsent />
```

**index.html cleanup:** Remove lines 4-10 (GTM script), lines 17-19 (noscript iframe), and line 14 (Leaflet CDN). The noscript tag is removed entirely because without JS, consent cannot be obtained, so GTM should not load (GDPR-safe default).

### Recommended File Changes Summary

```
frontend/
  index.html                              # Remove GTM (lines 4-10, 17-19) + Leaflet CDN (line 14)
  src/
    utils/sanitize.js                      # NEW: Shared DOMPurify config with hook
    components/ui/CookieConsent.jsx        # NEW: Consent banner + GTM injector
    pages/LoginPage.jsx                    # MODIFY: Add error whitelist (lines 22-27)
    pages/DarkWebPage.jsx                  # MODIFY: Use shared sanitize utility (line 20)
    components/auth/SocialAuthButtons.jsx  # MODIFY: Add redirect URL validation (line 32)
    hooks/useLeaflet.js                    # MODIFY: Add leaflet CSS import (line 1)
    App.jsx                                # MODIFY: Add CookieConsent component
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTML sanitization | Custom regex-based HTML stripping | DOMPurify (already installed) | Regex cannot parse HTML safely; DOMPurify handles edge cases |
| URL parsing/validation | Manual string matching on URLs | `new URL()` browser API | Handles edge cases like protocol-relative URLs, encoded characters |
| Cookie consent framework | Full CMP (Consent Management Platform) | Simple localStorage + dynamic script injection | Only one tracking script (GTM); a full CMP is overkill |

## Common Pitfalls

### Pitfall 1: DOMPurify Hook Registration Timing
**What goes wrong:** Registering `addHook` inside a React component causes duplicate hooks on re-render.
**Why it happens:** Each render calls `addHook` again, stacking duplicate callbacks.
**How to avoid:** Register the hook at module scope (outside any component/function), not inside `useEffect`.
**Warning signs:** Sanitized output has duplicate `rel` attributes or runs slowly.

### Pitfall 2: URL Validation Bypass via Subdomain
**What goes wrong:** An attacker registers `accounts.google.com.evil.com` and bypasses validation.
**Why it happens:** Using `hostname.includes('google.com')` instead of exact match or `.endsWith('.google.com')`.
**How to avoid:** Use exact hostname match OR ensure the `.endsWith` check includes the leading dot: `.endsWith('.google.com')`. Check `parsed.hostname === host || parsed.hostname.endsWith('.' + host)`.
**Warning signs:** Redirect validation passes for domains that are not the real OAuth provider.

### Pitfall 3: GTM Script Double Injection
**What goes wrong:** GTM loads twice, causing duplicate analytics events and performance issues.
**Why it happens:** No idempotency check before creating the script element.
**How to avoid:** Check for existing script element by ID before injection. The `injectGTM()` function must be idempotent.
**Warning signs:** Duplicate page view events in Google Analytics.

### Pitfall 4: Leaflet CSS Import Order
**What goes wrong:** Leaflet CSS overrides are lost because the import order changes.
**Why it happens:** Vite processes CSS imports in dependency order. If custom styles load before Leaflet CSS, Leaflet wins.
**How to avoid:** Import `leaflet/dist/leaflet.css` before any custom Leaflet overrides. In `useLeaflet.js`, the import at the top of the file ensures correct order.
**Warning signs:** Custom popup styles or marker styles are not applied.

### Pitfall 5: OAuth Error Message Encoding Mismatch
**What goes wrong:** The whitelist doesn't match because of URL encoding differences.
**Why it happens:** Backend uses `urlencode()`, browser `searchParams.get()` auto-decodes. But edge cases with special characters can differ.
**How to avoid:** The backend currently sends simple ASCII messages with no special characters. `searchParams.get()` handles the URL decoding automatically. Match against the decoded message string.
**Warning signs:** Valid OAuth errors show no message (silently dropped by whitelist).

## Code Examples

### DOMPurify afterSanitizeAttributes Hook
```javascript
// DOMPurify v3.x addHook API (stable since v2.x)
DOMPurify.addHook('afterSanitizeAttributes', function (node) {
  if (node.tagName === 'A') {
    node.setAttribute('rel', 'noopener noreferrer');
    node.removeAttribute('target');
  }
});
```

### Vite CSS Import from node_modules
```javascript
// Vite handles bare specifier CSS imports natively
// No config needed -- just import the path
import 'leaflet/dist/leaflet.css';
```

### URL Validation with new URL()
```javascript
function isAllowedHost(urlString, allowedHosts) {
  try {
    const { hostname } = new URL(urlString);
    return allowedHosts.some(
      (h) => hostname === h || hostname.endsWith('.' + h)
    );
  } catch {
    return false;
  }
}
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None -- no test infrastructure exists per CLAUDE.md |
| Config file | none |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FRONT-01 | Unknown OAuth error params are silently ignored | manual | Visit `/login?error=<script>alert(1)</script>` -- no error shown | N/A |
| FRONT-02 | Redirect to non-allowed domain is blocked | manual | Mock API to return evil URL -- verify blocked | N/A |
| FRONT-03 | Sanitized HTML has no target, has rel=noopener | manual | Inspect DarkWeb breach card HTML in DevTools | N/A |
| FRONT-04 | No external Leaflet CDN request | manual | Network tab on ThreatMap, verify no unpkg.com request | N/A |
| FRONT-05 | GTM only loads after consent acceptance | manual | Network tab, verify no gtm.js request until Accept clicked | N/A |

### Sampling Rate
- **Per task commit:** Manual browser verification (no automated test suite)
- **Per wave merge:** Full manual walkthrough of all 5 scenarios
- **Phase gate:** All 5 success criteria verified manually before `/gsd:verify-work`

### Wave 0 Gaps
None -- no test infrastructure exists and CLAUDE.md confirms "No tests exist." Manual verification is the validation strategy for this phase.

## Open Questions

1. **Backend error message stability**
   - What we know: Backend sends 2 specific messages: "Authentication failed. Please try again." and "Unsupported provider."
   - What's unclear: Whether these messages might change in future backend deploys without frontend coordination.
   - Recommendation: Use the whitelist approach as decided. If a new backend error message is added, the frontend silently drops it (safe default). Backend team should coordinate error code changes.

2. **GTM noscript tag relevance**
   - What we know: The noscript GTM iframe (lines 17-19 of index.html) provides tracking for users with JS disabled.
   - What's unclear: Whether users with JS disabled can even trigger the consent flow.
   - Recommendation: Remove the noscript tag entirely. If JS is disabled, consent cannot be obtained, so GTM should not load. This is the GDPR-safe default.

## Sources

### Primary (HIGH confidence)
- `frontend/src/pages/LoginPage.jsx` -- current OAuth error handling (lines 22-27)
- `frontend/src/pages/DarkWebPage.jsx` -- current DOMPurify config (line 20)
- `frontend/src/components/auth/SocialAuthButtons.jsx` -- current redirect flow (line 32)
- `frontend/src/hooks/useLeaflet.js` -- current Leaflet usage (no CSS import)
- `frontend/index.html` -- current GTM and CDN references
- `backend/app/Http/Controllers/Auth/SocialAuthController.php` -- backend error messages (lines 37, 43, 95)
- DOMPurify npm registry -- v3.3.3 current, `addHook` API stable since v2.x
- Leaflet npm registry -- v1.9.4 current, CSS at `dist/leaflet.css`

### Secondary (MEDIUM confidence)
- Vite CSS import behavior -- standard documented behavior, verified by project already using CSS imports in main.css

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed, versions verified against npm registry
- Architecture: HIGH -- all target files read, exact line numbers identified, patterns are straightforward
- Pitfalls: HIGH -- common frontend security patterns, well-documented edge cases

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (stable -- no fast-moving dependencies)
