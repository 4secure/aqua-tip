# Phase 50: Frontend Security - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-12
**Phase:** 50-frontend-security
**Areas discussed:** OAuth error handling, DOMPurify tab-nabbing fix, Leaflet CSS bundling, GTM consent gating

---

## OAuth Error Handling

### Q1: How should unknown OAuth error codes be handled?

| Option | Description | Selected |
|--------|-------------|----------|
| Silent ignore | Unknown error codes silently dropped, only whitelisted codes display a message | ✓ |
| Generic fallback message | Unknown codes show generic 'Authentication failed' message | |
| You decide | Claude picks best approach | |

**User's choice:** Silent ignore (Recommended)
**Notes:** Safest approach — no reflected XSS possible

### Q2: Should OAuth redirect URLs be validated before navigating?

| Option | Description | Selected |
|--------|-------------|----------|
| Allowlist check | Validate against known OAuth provider domains before redirect | ✓ |
| Same-origin only | Only allow same-origin redirects | |
| You decide | Claude picks best approach | |

**User's choice:** Allowlist check (Recommended)
**Notes:** OAuth callbacks are external by nature, so same-origin is too restrictive

---

## DOMPurify Tab-Nabbing Fix

### Q1: How should DOMPurify handle link targets?

| Option | Description | Selected |
|--------|-------------|----------|
| Remove target, add hook | Remove target from ALLOWED_ATTR, add afterSanitizeAttributes hook for rel=noopener noreferrer | ✓ |
| Keep target, enforce rel | Keep target but ensure every target=_blank also gets rel=noopener noreferrer | |
| You decide | Claude picks safest approach | |

**User's choice:** Remove target, add hook (Recommended)
**Notes:** Zero tab-nabbing risk, links open in same tab

---

## Leaflet CSS Bundling

### Q1: How should Leaflet CSS be bundled?

| Option | Description | Selected |
|--------|-------------|----------|
| Import from node_modules | Import leaflet/dist/leaflet.css via Vite, remove CDN link | ✓ |
| Copy to public folder | Copy CSS to public/, reference locally in index.html | |
| You decide | Claude picks best approach | |

**User's choice:** Import from node_modules (Recommended)
**Notes:** Vite handles bundling, zero external requests

---

## GTM Consent Gating

### Q1: What consent mechanism should gate GTM?

| Option | Description | Selected |
|--------|-------------|----------|
| Cookie banner with localStorage | Show consent banner, store in localStorage, GTM only loads on accept | ✓ |
| Remove GTM entirely | Strip GTM completely until proper CMP set up | |
| You decide | Claude picks best approach | |

**User's choice:** Cookie banner with localStorage (Recommended)
**Notes:** Keeps analytics functional while respecting GDPR

### Q2: What should the consent banner look like?

| Option | Description | Selected |
|--------|-------------|----------|
| Bottom bar, minimal | Fixed bottom bar, dark glassmorphism theme, Accept/Reject buttons | ✓ |
| Modal overlay | Centered modal with granular cookie category toggles | |
| You decide | Claude picks best approach | |

**User's choice:** Bottom bar, minimal (Recommended)
**Notes:** Matches site theme, lightweight for analytics-only tracking

---

## Claude's Discretion

- Exact list of whitelisted OAuth error codes (based on what backend actually returns)
- Whether the consent banner is a standalone component or embedded in App.jsx
- DOMPurify hook placement (inline in DarkWebPage or extracted to shared utility)

## Deferred Ideas

None — discussion stayed within phase scope
