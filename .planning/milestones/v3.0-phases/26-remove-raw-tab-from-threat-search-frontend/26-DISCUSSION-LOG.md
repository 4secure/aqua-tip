# Phase 26: Remove raw tab from threat search frontend - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-24
**Phase:** 26-remove-raw-tab-from-threat-search-frontend
**Areas discussed:** Removal scope

---

## Removal Scope

### Removal approach

| Option | Description | Selected |
|--------|-------------|----------|
| Full deletion (Recommended) | Remove RawTab component, tab entry, and rendering conditional entirely. Raw API data is still visible in browser DevTools Network tab. | ✓ |
| Dev flag toggle | Keep the code but hide behind a config flag (e.g., localStorage dev mode). Useful if you sometimes need to debug API responses in-app. | |
| Replace with copy button | Remove the visible tab but add a small 'Copy raw JSON' button somewhere in the results header for power users. | |

**User's choice:** Full deletion
**Notes:** None

### Import cleanup

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, clean imports (Recommended) | Remove the Code icon import if it becomes unused after Raw tab removal. Keep the codebase tidy. | ✓ |
| Leave imports as-is | Don't touch imports — minimal change footprint only. | |

**User's choice:** Yes, clean imports
**Notes:** None

---

## Claude's Discretion

- Verify Code icon usage elsewhere before removing import
- Minor formatting cleanup if removal leaves awkward spacing

## Deferred Ideas

None
