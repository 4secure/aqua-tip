# Phase 40: Cleanup & Verification - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-06
**Phase:** 40-cleanup-verification
**Areas discussed:** Deletion scope, Sidebar nav wording, Grep audit depth

---

## Deletion Scope

| Option | Description | Selected |
|--------|-------------|----------|
| DashboardPage.jsx only | It's the only dead file — no import exists. Shared constants already in dashboard-config.js. | |
| DashboardPage.jsx + unused exports | Also audit dashboard-config.js and mock-data.js for dead exports. | |
| Full dead code sweep | Delete DashboardPage.jsx, audit all frontend/src for orphaned components, hooks, or exports. | ✓ |

**User's choice:** Full dead code sweep
**Notes:** User wants a thorough cleanup — not just the known dead file, but a complete audit of frontend/src for anything orphaned.

---

## Sidebar Nav Wording

| Option | Description | Selected |
|--------|-------------|----------|
| Keep as-is | "Dashboard" under "Overview" at /dashboard. Already meets CLEAN-02. | ✓ |
| Rename to "Threat Map" | Match the label to what users actually see on the page. | |
| Rename to "Live Map" | Shorter, emphasizes real-time SSE aspect. | |

**User's choice:** Keep as-is (Recommended)
**Notes:** No change needed — "Dashboard" is the expected main entry point label.

---

## Grep Audit Depth

| Option | Description | Selected |
|--------|-------------|----------|
| Source code only | Grep frontend/src/ for stale references. Planning docs are historical. | ✓ |
| Source + config files | Also check vite.config.js, tailwind.config.js, package.json. | |
| Source + config + CLAUDE.md | Additionally update CLAUDE.md project structure docs. | |

**User's choice:** Source code only (Recommended)
**Notes:** Audit limited to frontend/src/ — planning docs and config files excluded.

---

## Claude's Discretion

- Order of operations for delete vs audit
- Dead code sweep methodology (script vs manual grep)
- Handling of edge cases (commented-out imports, etc.)

## Deferred Ideas

None — discussion stayed within phase scope.
