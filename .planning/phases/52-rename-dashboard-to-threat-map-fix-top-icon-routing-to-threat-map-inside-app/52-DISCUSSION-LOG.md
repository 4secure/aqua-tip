# Phase 52: Rename Dashboard to Threat Map — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-11
**Phase:** 52-rename-dashboard-to-threat-map-fix-top-icon-routing-to-threat-map-inside-app
**Areas discussed:** Route & redirect strategy, Sidebar label & icon, Top icon/logo routing, Topbar breadcrumb

---

## Route & Redirect Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Flip routes | Make /threat-map primary, /dashboard redirects to /threat-map | ✓ |
| Remove /dashboard entirely | Only /threat-map exists, old URLs break | |
| Keep both, rename labels only | Both routes work, /dashboard stays primary | |

**User's choice:** Flip routes (Recommended)
**Notes:** Matches the rename intent — /threat-map becomes the canonical route.

---

## Sidebar Label & Icon

| Option | Description | Selected |
|--------|-------------|----------|
| "Threat Map" + map icon | Label becomes 'Threat Map', icon changes to map-related Lucide icon | ✓ |
| "Threat Map" + keep dashboard icon | Label changes but icon stays the same | |
| "Live Map" + map icon | Shorter label emphasizing real-time aspect | |

**User's choice:** "Threat Map" + map icon (Recommended)
**Notes:** Consistent naming across sidebar, route, and breadcrumb.

---

## Top Icon / Logo Routing

| Option | Description | Selected |
|--------|-------------|----------|
| Logo links to /threat-map when inside app | Sidebar logo goes to /threat-map in app layout | ✓ |
| Logo always links to /threat-map | Logo goes to /threat-map everywhere, landing page only via direct URL | |
| Add separate home icon in topbar | Keep logo → '/', add new icon for /threat-map | |

**User's choice:** Logo links to /threat-map when inside app (Recommended)
**Notes:** Scoped to AppLayout — sidebar only renders inside authenticated app views.

---

## Topbar Breadcrumb

| Option | Description | Selected |
|--------|-------------|----------|
| Show 'Threat Map' | Breadcrumb reads 'Aqua-Tip / Threat Map' | ✓ |
| Show 'Live Threat Map' | More descriptive but longer breadcrumb text | |

**User's choice:** Yes, show 'Threat Map' (Recommended)
**Notes:** Consistent with sidebar label.

---

## Claude's Discretion

- Specific Lucide map icon choice (Map, MapPin, Globe, etc.)

## Deferred Ideas

None — discussion stayed within phase scope.
