# Phase 40: Cleanup & Verification - Research

**Researched:** 2026-04-06
**Domain:** Dead code removal, codebase hygiene, React/Vite project cleanup
**Confidence:** HIGH

## Summary

Phase 40 is a deletion and verification phase. The primary target is `DashboardPage.jsx` which was superseded in Phase 37 (its import was removed from App.jsx, and `/dashboard` now renders ThreatMapPage). Beyond that file, a full dead code sweep reveals 7 orphaned page files, 1 orphaned hook, and 1 orphaned shared component that are never imported by any live code. The Topbar also contains a stale page title mapping for `/threat-map`.

All findings are based on direct codebase grep audits. No external libraries or tools are needed -- this is purely file deletion and minor edits.

**Primary recommendation:** Delete DashboardPage.jsx and all other orphaned files identified in the dead code inventory below, remove the stale `/threat-map` entry from Topbar's PAGE_NAMES, then run a final grep audit to confirm zero stale references.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Delete `frontend/src/pages/DashboardPage.jsx` -- it is not imported anywhere (import removed in Phase 37).
- **D-02:** Full dead code sweep across all of `frontend/src/` -- audit for orphaned components, hooks, utilities, or exports that nothing imports. Delete anything that is genuinely dead.
- **D-03:** Shared constants in `frontend/src/data/dashboard-config.js` (STAT_CARD_CONFIG, STAT_COLOR_MAP, TYPE_BADGE_COLORS, formatRelativeTime) are actively used by overlay panels -- do NOT delete.
- **D-04:** Keep sidebar nav as-is. "Dashboard" under "Overview" category at `/dashboard` remains unchanged. No label, icon, or category rename.
- **D-05:** Audit scope is `frontend/src/` only. Check for references to deleted files, old routes used as non-redirect targets, and stale page title mappings.
- **D-06:** Planning docs (`.planning/`) are historical records and should not be modified.
- **D-07:** Config files (vite.config.js, tailwind.config.js, etc.) are excluded from the audit.

### Claude's Discretion
- Order of operations (delete first then audit, or audit then delete)
- Whether to use a script or manual grep for the dead code sweep
- Handling of any edge cases discovered during the sweep (e.g., commented-out imports)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CLEAN-01 | DashboardPage.jsx is deleted and all references removed | Dead code inventory confirms file exists, is unreferenced in App.jsx, and can be safely deleted. Topbar PAGE_NAMES has a stale `/threat-map` entry to clean. |
| CLEAN-02 | Sidebar navigation updated (no separate Dashboard/Threat Map links) | Already satisfied -- NAV_CATEGORIES in mock-data.js has a single "Dashboard" entry at `/dashboard`. No "Threat Map" entry exists. Verification grep confirms this. |
</phase_requirements>

## Dead Code Inventory

Complete audit results from grep analysis of `frontend/src/`. Confidence: HIGH (direct codebase inspection).

### Primary Target
| File | Status | Imported By | Safe to Delete |
|------|--------|-------------|----------------|
| `pages/DashboardPage.jsx` | DEAD | Nothing (removed in Phase 37) | YES |

### Orphaned Pages (never imported in App.jsx or any other file)
| File | Status | Evidence | Safe to Delete |
|------|--------|----------|----------------|
| `pages/ComponentsPage.jsx` | DEAD | No import found anywhere, no route in App.jsx | YES |
| `pages/CtiSearchPage.jsx` | DEAD | No import found anywhere, no route in App.jsx | YES |
| `pages/CtiReportPage.jsx` | DEAD | No import found anywhere, no route in App.jsx | YES |
| `pages/CveDetailPage.jsx` | DEAD | No import found anywhere, no route in App.jsx | YES |
| `pages/DomainReportPage.jsx` | DEAD | No import found anywhere, no route in App.jsx | YES |
| `pages/FeedsPage.jsx` | DEAD | No import found anywhere, no route in App.jsx | YES |
| `pages/VulnScannerPage.jsx` | DEAD | No import found anywhere, no route in App.jsx | YES |

### Orphaned Hook
| File | Status | Evidence | Safe to Delete |
|------|--------|----------|----------------|
| `hooks/useKeyboardShortcut.js` | DEAD | Never imported by any file | YES |

### Orphaned Shared Component
| File | Status | Evidence | Safe to Delete |
|------|--------|----------|----------------|
| `components/shared/BreachCard.jsx` | DEAD | Never imported by any file | YES |

### PROTECTED -- Do NOT Delete
| File | Why Protected |
|------|---------------|
| `data/dashboard-config.js` | Actively imported by LeftOverlayPanel.jsx and RightOverlayPanel.jsx (D-03) |
| `hooks/useChartJs.js` | Used by `components/threat-news/CategoryDistributionChart.jsx` (live) |
| `hooks/useLeaflet.js` | Used by `pages/ThreatMapPage.jsx` (live) |
| `data/icons.jsx` | Used by Sidebar, LandingScroll, DarkWebPage, and others (live) |
| `data/mock-data.js` | Used across live pages and components |
| `components/shared/CreditBadge.jsx` | Used by DarkWebPage, ThreatSearchPage (live) |
| `components/shared/SkeletonCard.jsx` | Used by ThreatActorsPage (live) |

### Stale Reference to Clean
| File | Line | Content | Action |
|------|------|---------|--------|
| `components/layout/Topbar.jsx` | 10 | `'/threat-map': 'Threat Map',` in PAGE_NAMES | Remove this entry -- `/threat-map` is a redirect to `/dashboard`, not a real page |

## Architecture Patterns

### Deletion Order (Recommended)
1. **Delete all orphaned files** (10 files total)
2. **Edit Topbar.jsx** to remove stale PAGE_NAMES entry
3. **Run grep audit** to confirm zero stale references to deleted files

This order is recommended because deleting first, then auditing, produces the cleanest verification. The audit will confirm both the deletions AND catch any references that were missed.

### Grep Audit Strategy
After deletions, grep `frontend/src/` for:
- `DashboardPage` -- must return zero results
- `ComponentsPage` -- must return zero results
- `CtiSearchPage` -- must return zero results
- `CtiReportPage` -- must return zero results
- `CveDetailPage` -- must return zero results
- `DomainReportPage` -- must return zero results
- `FeedsPage` -- must return zero results
- `VulnScannerPage` -- must return zero results
- `useKeyboardShortcut` -- must return zero results
- `BreachCard` -- must return zero results
- `'/threat-map'` in Topbar.jsx -- must not exist as a PAGE_NAMES key (the redirect route in App.jsx is fine)

### What NOT to Grep For
- `threat-map` as a general string -- this is a valid directory name (`components/threat-map/`) and API endpoint (`/api/threat-map/`)
- `dashboard-config` -- this is a live file (D-03)
- Files in `.planning/` -- these are historical docs (D-06)

## Common Pitfalls

### Pitfall 1: Deleting dashboard-config.js
**What goes wrong:** It looks like it belongs to the old DashboardPage, but it was extracted in Phase 38 for overlay panels.
**Why it happens:** The filename contains "dashboard" suggesting it is part of the old dashboard.
**How to avoid:** Decision D-03 explicitly protects this file. LeftOverlayPanel.jsx and RightOverlayPanel.jsx import from it.
**Warning signs:** Build error -- overlay panels fail to resolve imports.

### Pitfall 2: Removing the /threat-map redirect route
**What goes wrong:** Users with bookmarked `/threat-map` URLs get a 404.
**Why it happens:** Confusing "remove stale references" with "remove the redirect."
**How to avoid:** The redirect in App.jsx line 69 (`<Navigate to="/dashboard" replace />`) is intentional and must stay. Only the PAGE_NAMES entry in Topbar.jsx is stale.
**Warning signs:** Navigating to `/threat-map` no longer works.

### Pitfall 3: Missing an import chain
**What goes wrong:** Deleting a file that is indirectly imported through a chain.
**How to avoid:** The dead code inventory above was built by checking ALL import statements across the entire `frontend/src/` directory. No indirect chains were found for the listed orphaned files.

### Pitfall 4: Orphaned CSS classes
**What goes wrong:** CSS classes defined for deleted components remain in stylesheets.
**Why it happens:** CSS is not import-tracked like JS modules.
**How to avoid:** Out of scope per D-07 (config files excluded). Tailwind purges unused classes at build time anyway, so this is not a practical issue.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dead code detection | Custom AST parser | grep/ripgrep across `frontend/src/` | Simple text search is sufficient for this JSX codebase with explicit imports |
| Import verification | Build-time validation | `npm run build` (Vite) | Vite will error on broken imports, serving as final verification |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None (no tests exist per CLAUDE.md) |
| Config file | None |
| Quick run command | `npm run build` (Vite production build catches broken imports) |
| Full suite command | `npm run build` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CLEAN-01 | DashboardPage.jsx deleted, zero references | manual (grep audit) | `grep -r "DashboardPage" frontend/src/` returns empty | N/A |
| CLEAN-02 | Single Dashboard nav entry, no Threat Map link | manual (grep audit) | `grep -r "Threat Map" frontend/src/data/mock-data.js` returns empty | N/A |

### Sampling Rate
- **Per task commit:** `cd frontend && npm run build` (catches broken imports)
- **Per wave merge:** Full grep audit of all deleted file names
- **Phase gate:** Build succeeds + grep audit returns zero matches for all deleted files

### Wave 0 Gaps
None -- no test infrastructure needed. Verification is grep-based + Vite build.

## Project Constraints (from CLAUDE.md)

- No TypeScript -- all .jsx/.js files
- No tests exist (verification is build + grep)
- No linter/formatter configured
- React 19 + Vite 7
- CSS split across 4 files in `styles/` (not relevant to this phase)

## Sources

### Primary (HIGH confidence)
- Direct codebase grep audit of `frontend/src/` -- all import chains verified
- `App.jsx` -- confirmed no DashboardPage import, confirmed /threat-map redirect exists
- `mock-data.js` lines 135-158 -- confirmed single "Dashboard" nav entry
- `Topbar.jsx` lines 7-15 -- confirmed stale `/threat-map` PAGE_NAMES entry

## Metadata

**Confidence breakdown:**
- Dead code inventory: HIGH -- every file checked via grep for import references
- Stale references: HIGH -- complete audit of PAGE_NAMES and NAV_CATEGORIES
- Protected files: HIGH -- import chains verified for each protected file

**Research date:** 2026-04-06
**Valid until:** 2026-05-06 (stable -- this is codebase-specific, not library-dependent)
