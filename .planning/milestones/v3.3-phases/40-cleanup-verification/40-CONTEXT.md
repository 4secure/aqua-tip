# Phase 40: Cleanup & Verification - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Remove dead code from the old dashboard and verify the codebase has zero stale references. DashboardPage.jsx is deleted, a full dead code sweep finds any other orphaned files/exports, and a grep audit confirms clean state. Sidebar nav is unchanged.

</domain>

<decisions>
## Implementation Decisions

### Deletion Scope
- **D-01:** Delete `frontend/src/pages/DashboardPage.jsx` — it is not imported anywhere (import removed in Phase 37).
- **D-02:** Full dead code sweep across all of `frontend/src/` — audit for orphaned components, hooks, utilities, or exports that nothing imports. Delete anything that is genuinely dead.
- **D-03:** Shared constants in `frontend/src/data/dashboard-config.js` (STAT_CARD_CONFIG, STAT_COLOR_MAP, TYPE_BADGE_COLORS, formatRelativeTime) are actively used by overlay panels — do NOT delete.

### Sidebar Navigation
- **D-04:** Keep sidebar nav as-is. "Dashboard" under "Overview" category at `/dashboard` remains unchanged. No label, icon, or category rename.

### Grep Audit
- **D-05:** Audit scope is `frontend/src/` only. Check for references to deleted files, old routes used as non-redirect targets, and stale page title mappings.
- **D-06:** Planning docs (`.planning/`) are historical records and should not be modified.
- **D-07:** Config files (vite.config.js, tailwind.config.js, etc.) are excluded from the audit.

### Claude's Discretion
- Order of operations (delete first then audit, or audit then delete)
- Whether to use a script or manual grep for the dead code sweep
- Handling of any edge cases discovered during the sweep (e.g., commented-out imports)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — CLEAN-01, CLEAN-02 define this phase's scope

### Roadmap
- `.planning/ROADMAP.md` §Phase 40 — success criteria and phase dependencies

### Prior Phase Context
- `.planning/phases/37-map-route-foundation/37-CONTEXT.md` — Route swap decisions (D-01, D-04: DashboardPage import removed, deletion deferred to Phase 40)
- `.planning/phases/38-overlay-panel-components/38-CONTEXT.md` — Shared config extraction to dashboard-config.js, overlay panel components that replaced dashboard widgets

### Key Source Files
- `frontend/src/pages/DashboardPage.jsx` — File to delete (281+ lines, dead code)
- `frontend/src/App.jsx` — Router config (line 68: /dashboard uses ThreatMapPage, no DashboardPage import)
- `frontend/src/data/mock-data.js` — NAV_CATEGORIES (line 135-156: single "Dashboard" entry, no "Threat Map")
- `frontend/src/data/dashboard-config.js` — Shared constants extracted from old DashboardPage (actively used by overlay panels)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- No new components needed — this is a deletion/cleanup phase

### Established Patterns
- Phase 37 already established the pattern: remove import first, delete file later
- Phase 38 extracted shared constants to `dashboard-config.js` before this cleanup

### Integration Points
- `App.jsx` — already clean (no DashboardPage import, /dashboard points to ThreatMapPage)
- `mock-data.js` NAV_CATEGORIES — already clean (single "Dashboard" entry)
- `/threat-map` route — already redirects to `/dashboard`

</code_context>

<specifics>
## Specific Ideas

No specific requirements — straightforward cleanup with full dead code sweep.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 40-cleanup-verification*
*Context gathered: 2026-04-06*
