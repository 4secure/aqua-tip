# Phase 50: Frontend Security - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Harden the React frontend against XSS, open redirect, and tab-nabbing attacks. Whitelist OAuth error codes on the login page, validate OAuth redirect URLs against an allowlist, fix DOMPurify config to prevent tab-nabbing, bundle Leaflet CSS locally to eliminate CDN dependency, and gate Google Tag Manager behind cookie consent.

</domain>

<decisions>
## Implementation Decisions

### OAuth Error Handling
- **D-01:** OAuth `?error=` query parameter on LoginPage is whitelisted to known error codes (e.g., `auth_failed`, `cancelled`, `provider_error`). Unknown/arbitrary strings are silently ignored — no message displayed.
- **D-02:** OAuth redirect URLs are validated against an allowlist of known provider domains (google.com, github.com) before any `window.location` navigation. Unrecognized domains are blocked.

### DOMPurify Tab-Nabbing Fix
- **D-03:** Remove `target` from DOMPurify `ALLOWED_ATTR` in DarkWebPage.jsx — all sanitized links open in same tab by default.
- **D-04:** Add a DOMPurify `afterSanitizeAttributes` hook that forces `rel="noopener noreferrer"` on every `<a>` element. This ensures no tab-nabbing regardless of input HTML.

### Leaflet CSS Bundling
- **D-05:** Remove the external `unpkg.com/leaflet@1.9.4/dist/leaflet.css` `<link>` from `index.html`.
- **D-06:** Import `leaflet/dist/leaflet.css` from node_modules (in `useLeaflet.js` or `main.css`). Vite bundles it into the production build. Zero external CDN requests for map styles.

### GTM Consent Gating
- **D-07:** Google Tag Manager script in `index.html` is removed from static HTML. GTM is injected dynamically via JavaScript only after the user accepts cookies.
- **D-08:** Consent stored in `localStorage`. If consent is `'accepted'`, GTM script is injected on page load. If `'rejected'` or unset, GTM does not load.
- **D-09:** Minimal cookie consent banner: fixed bottom bar with dark glassmorphism styling (matching site theme), short text ("We use cookies for analytics"), Accept and Reject buttons. Disappears permanently after choice.

### Claude's Discretion
- Exact list of whitelisted OAuth error codes (based on what backend actually returns)
- Whether the consent banner is a standalone component or embedded in App.jsx
- DOMPurify hook placement (inline in DarkWebPage or extracted to a shared utility)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Frontend Security Targets
- `frontend/src/pages/LoginPage.jsx` — OAuth error param handling (line 23: `searchParams.get('error')` rendered without whitelist)
- `frontend/src/pages/DarkWebPage.jsx` — DOMPurify config (line 20: `ALLOWED_ATTR: ['href', 'target', 'rel']` allows target)
- `frontend/index.html` — Leaflet CDN link (line 14) and GTM script (lines 4-10, 17-19)
- `frontend/src/hooks/useLeaflet.js` — Leaflet usage (imports L from 'leaflet', no CSS import)

### Related Configuration
- `frontend/src/styles/main.css` — Tailwind imports and base styles (candidate for Leaflet CSS import)
- `frontend/package.json` — Leaflet already installed as dependency

### Prior Phase Context
- `.planning/phases/47-infrastructure-hardening/47-CONTEXT.md` — CSP header configured at Nginx level; frontend changes must be compatible
- `.planning/phases/48-api-security/48-CONTEXT.md` — Error sanitization pattern on backend
- `.planning/phases/49-auth-session-hardening/49-CONTEXT.md` — Session hardening patterns

### Requirements
- `.planning/REQUIREMENTS.md` §v5.0 Frontend Security (FRONT) — FRONT-01 through FRONT-05

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DOMPurify` — already installed and used in DarkWebPage.jsx
- `useLeaflet.js` — custom hook managing Leaflet lifecycle, natural place for CSS import
- Dark glassmorphism pattern (`bg-surface/60 border border-border backdrop-blur-sm`) — reuse for consent banner

### Established Patterns
- Query param handling via `useSearchParams` (React Router) in LoginPage
- CSS imports in `main.css` using `@import` syntax
- No existing consent/cookie management — this is greenfield

### Integration Points
- `index.html` — remove Leaflet CDN link and static GTM script
- `LoginPage.jsx` — add error code whitelist and redirect URL validation
- `DarkWebPage.jsx` — modify DOMPurify config and add hook
- `useLeaflet.js` or `main.css` — add Leaflet CSS import
- `App.jsx` or new component — cookie consent banner

</code_context>

<specifics>
## Specific Ideas

No specific requirements — user chose recommended (standard) approaches for all decisions.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 50-frontend-security*
*Context gathered: 2026-04-12*
