---
phase: 65-frontend-campaigns-toggle
plan: 02
subsystem: frontend/threat-actors
type: execute
wave: 2
status: complete
completed: 2026-05-05
tags:
  - threat-actors
  - campaigns
  - toolbar
  - toggle
  - url-state
  - page-wiring
  - view-aware-fetch
requirements:
  - CAMP-01 (code-complete — toolbar pill toggle renders 2 .tab-item buttons)
  - CAMP-02 (code-complete — Campaigns view exists; components from Plan 01 wired into page)
  - CAMP-03 (code-complete — `?view=campaigns` URL state written via setSearchParams in handleViewChange)
  - CAMP-04 (code-complete — refresh restores view from URL via the per-render `view` derivation)
dependency_graph:
  requires:
    - frontend/src/api/threat-campaigns.js (Plan 01 — fetchThreatCampaigns)
    - frontend/src/components/threat-actors/CampaignCard.jsx (Plan 01 — default export)
    - frontend/src/components/threat-actors/CampaignDetailModal.jsx (Plan 01 — default export)
    - frontend/src/api/threat-actors.js (existing — fetchThreatActors UNCHANGED)
    - frontend/src/styles/main.css (existing — `.tab-bar` / `.tab-item` / `.tab-item.active` reused per D-05)
    - react-router-dom useSearchParams (existing dep)
    - framer-motion AnimatePresence (existing dep)
  provides:
    - Phase 65 user-visible behavior — toggle + view-aware fetch + view-aware grid + view-aware empty state + Campaign modal portal
  affects:
    - frontend/src/pages/ThreatActorsPage.jsx (single-file modify; 986 → 1073 lines)
tech-stack:
  added: []
  patterns:
    - View derivation as single source of truth — `searchParams.get('view') === 'campaigns' ? 'campaigns' : 'actors'` (D-08)
    - Toolbar pill toggle reusing `.tab-bar` / `.tab-item` classes from main.css with `!mb-0 !border-b-0` overrides (D-05)
    - Mobile-stack toolbar layout via `flex flex-col md:flex-row md:items-center gap-3` (D-04)
    - Search input remount on view toggle via `key={view}` to clear uncontrolled defaultValue (D-10)
    - Active-pill click as no-op via early return guard (`if (newView === view) return`) (D-07)
    - Single setSearchParams call in handleViewChange that sets view + deletes search + deletes after (D-09)
    - cursorHistory reset to [] on view toggle (D-11)
    - View-aware loadData branch: Campaigns sends NO sort/order (backend defaults per D-26)
    - Phase 60 pagination shape `{ has_next, has_previous, end_cursor, page_size }` consumed verbatim — no shape adapter needed
    - Two parallel createPortal blocks (one per modal) so opening a Campaign modal cannot collide with an Actor modal stacking context
key-files:
  created: []
  modified:
    - frontend/src/pages/ThreatActorsPage.jsx (986 → 1073 lines; +130 / −43 across the 3 task commits)
decisions:
  - D-04 verbatim — toolbar uses `flex flex-col md:flex-row md:items-center gap-3` (mobile stack, md+ side-by-side)
  - D-05 verbatim — pill bar reuses `.tab-bar` / `.tab-item` / `.active` classes from main.css with `!mb-0 !border-b-0` overrides (toolbar context, not content-tab context)
  - D-06 verbatim — pill labels are exactly `Threat Actors` and `Campaigns`
  - D-07 verbatim — `if (newView === view) return` early-return guard makes active-pill click a no-op
  - D-08 verbatim — `searchParams.get('view') === 'campaigns' ? 'campaigns' : 'actors'` is THE source of truth (any other value falls back to 'actors')
  - D-09 verbatim — handleViewChange's setSearchParams sets view + deletes search + deletes after in a single update
  - D-10 verbatim — search input has `key={view}` so React unmounts/remounts on toggle, clearing the uncontrolled defaultValue
  - D-11 verbatim — `setCursorHistory([])` resets pagination history on every successful toggle
  - D-14 verbatim — Campaigns modal renders straight from prop (no enrichment fetch)
  - D-25 verbatim — error fallback reuses existing `setError(err.message || ...)` pattern with contextually correct copy ("Unable to load campaigns" vs "Unable to load threat actors")
  - D-26 verbatim — Campaigns branch params start as `const params = {}` (NO sort, NO order — backend defaults applied)
  - D-28 verified — zero CSS file edits across the 3 task commits
  - D-29 verified — zero package.json/package-lock.json edits across the 3 task commits
  - Page header text "Threat Actors" left UNCHANGED across views — Claude's-discretion polish call per D-02 ("Campaigns is a sub-view of the Threat Actors hub, not a separate page"). Avoids visual jitter on toggle and matches design intent.
  - Open Actor/Campaign modals are CLOSED on view toggle (added to handleViewChange) — defensive UX so a stale modal does not hover above a freshly toggled view's grid. Implementation: `setSelectedActor(null); setSelectedCampaign(null);` after the cursor reset.
metrics:
  tasks: 3
  commits: 3 (task) + 1 (summary)
  files_added: 0
  files_modified: 1
  net_lines: +130 / −43 (net +87)
  pre_plan_lines: 986
  post_plan_lines: 1073
  vite_build_durations: [Task 1: 28.41s, Task 2: 28.25s, Task 3: 24.75s]
  vite_build_status: green (exit 0 after every task)
---

# Phase 65 Plan 02: Frontend Campaigns Toggle — Page Wiring Summary

Wave 2 of Phase 65 — single-file modification of `frontend/src/pages/ThreatActorsPage.jsx` (986 → 1073 lines, +130/-43) wires the Plan 01 outputs (`fetchThreatCampaigns`, `CampaignCard`, `CampaignDetailModal`) into the page via three atomic task commits. Adds the toolbar pill toggle (`.tab-bar` reuse with margin/border overrides), the URL-state-driven `view` derivation as single source of truth (D-08), the view-aware loadData/silentRefresh branches with correct envelope parsing for both response shapes, the view-aware empty-state copy + grid render, and the second `createPortal` block for the Campaign modal. Phase 65 user-visible behavior is now COMPLETE.

## File Changes

| File | Pre | Post | Δ |
|------|-----|------|---|
| `frontend/src/pages/ThreatActorsPage.jsx` | 986 | 1073 | +130 / −43 |

**Total net delta:** +87 net lines, single file, zero new files, zero deletions of existing files.

**File size guard:** `1073 < 1500` (CLAUDE.md hard cap). PASS.

## Commits

| # | Hash | Message | Lines (+/−) |
|---|------|---------|-------------|
| 1 | `253eb73` | `feat(65-02): add view state + pill toggle + handleViewChange + selectedCampaign state (CAMP-01, CAMP-03, CAMP-04 scaffold)` | +58 / −15 |
| 2 | `44759ea` | `feat(65-02): view-aware loadData + silentRefresh (Campaigns branch with no sort/order per D-26)` | +41 / −18 |
| 3 | `0dcf0ab` | `feat(65-02): wire view-aware grid + Campaign modal portal (CAMP-02 complete, CAMP-05/CAMP-06 user-visible)` | +31 / −10 |

## Per-Task Summary

### Task 1 (commit `253eb73`) — Imports + state + view derivation + handleViewChange + toolbar restructure

Six surgical edits to a single file:
- **Edit 1**: 3 new imports (fetchThreatCampaigns, CampaignCard, CampaignDetailModal) added after their respective sibling-module imports
- **Edit 2**: New `selectedCampaign` state hook added immediately after `selectedActor`
- **Edit 3**: New derived `view` value computed alongside the existing `after` / `search` URL readers; uses the D-08 verbatim predicate (any value other than literal `'campaigns'` falls back to `'actors'`)
- **Edit 4**: `handleViewChange` callback added between the search-debounce cleanup effect and `handleNext`. Implements: D-07 active-pill no-op early return, D-09 single `setSearchParams` (set view + delete search + delete after), D-11 `setCursorHistory([])`, plus open-modal closers (`setSelectedActor(null)` + `setSelectedCampaign(null)`)
- **Edit 5**: Toolbar restructured. Outer `<div>` becomes `flex flex-col md:flex-row md:items-center gap-3` (D-04 mobile stack). New pill bar `<div className="tab-bar !mb-0 !border-b-0 shrink-0">` inserted as first child with two `<button>` elements ("Threat Actors" / "Campaigns" — D-06 exact labels). New inner search-row wrapper `<div className="flex items-center gap-3 flex-1">` wraps the existing search-input `<div>` and pagination column `<div>` to preserve their horizontal layout on md+. Search `<input>` gets `key={view}` (D-10).
- **Edit 6**: One additional `</div>` inserted between the pagination column close and outer toolbar close to close the new inner search-row wrapper from Edit 5.

End-of-task state: toolbar shows the toggle and URL updates correctly when clicked, but content below the toolbar still always shows Threat Actors. Vite build green (28.41s) — all imports valid, JSX syntactically complete.

### Task 2 (commit `44759ea`) — View-aware loadData + silentRefresh

Two surgical edits replacing the bodies of `loadData` and `silentRefresh`:
- **Edit 1 (loadData)**: Branches on `view`. Campaigns branch uses `const params = {}` (D-26 — no sort/order; backend defaults), calls `fetchThreatCampaigns(params)`, parses Phase 60 envelope `{ data: [...], pagination: {...} }` directly via `setItems(response.data || [])` + `setPagination(response.pagination || null)`. Actors branch is byte-identical to pre-plan. Catch block uses contextual fallbackMsg per D-25. Dep array becomes `[view, after, search]`.
- **Edit 2 (silentRefresh)**: Same view branch with same param/parse pattern. Dep array becomes `[view, after, search]`.

End-of-task state: Toggling to Campaigns now triggers a real `/api/threat-campaigns` fetch and populates `items`. But the GRID still uses `<ThreatActorCard>` for Campaign objects (visually wrong, functionally correct — defensive optional chaining in ThreatActorCard prevents crashes). Vite build green (28.25s).

### Task 3 (commit `0dcf0ab`) — View-aware grid + view-aware empty state + Campaign modal portal

Three surgical edits:
- **Edit 1**: Empty state `<p>` text becomes `{view === 'campaigns' ? 'No campaigns found' : 'No threat actors found'}`. Secondary line ("Try adjusting your search or filters") and Shield icon left UNCHANGED.
- **Edit 2**: Grid render branches on view. Campaigns branch maps `items` to `<CampaignCard key={c.id} campaign={c} onClick={() => setSelectedCampaign(c)} />`. Actors branch is byte-identical to pre-plan. Both share the same outer `<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">` wrapper.
- **Edit 3**: Second `createPortal` block added immediately after the existing ThreatActorModal portal. Mirrors the existing pattern (`<AnimatePresence>` + conditional render + `document.body` portal target). Wires `selectedCampaign` state to `<CampaignDetailModal>`.

End-of-task state: Full Phase 65 behavior live. Vite build green (24.75s).

## Critical Gates — All PASS

### D-08 single source of truth predicate

```bash
$ grep -qF "searchParams.get('view') === 'campaigns' ? 'campaigns' : 'actors'" frontend/src/pages/ThreatActorsPage.jsx
$ echo $?
0
```

PASS. The exact predicate from D-08.

### D-07 active-pill no-op guard

```bash
$ grep -qF "if (newView === view) return" frontend/src/pages/ThreatActorsPage.jsx
$ echo $?
0
```

PASS. Re-clicking the active pill returns immediately — no setSearchParams call, no refetch, no cursor reset.

### D-09 + SC5 — toggle resets URL

```bash
$ grep -qF "next.delete('search')" frontend/src/pages/ThreatActorsPage.jsx ; echo $?
0
$ grep -qF "next.delete('after')" frontend/src/pages/ThreatActorsPage.jsx ; echo $?
0
```

PASS. handleViewChange deletes both search and after URL params.

### D-10 — search input remount key

```bash
$ grep -qF "key={view}" frontend/src/pages/ThreatActorsPage.jsx ; echo $?
0
```

PASS. The search `<input>` has `key={view}`, so toggling the view unmounts and remounts the input, which clears the uncontrolled `defaultValue={search}` from the previous view.

### D-11 — cursor history reset

```bash
$ grep -qF "setCursorHistory([])" frontend/src/pages/ThreatActorsPage.jsx ; echo $?
0
```

PASS. cursorHistory is reset to `[]` inside handleViewChange.

### D-26 — Actors branch sort/order count

```bash
$ grep -c "const params = { sort: 'modified', order: 'desc' };" frontend/src/pages/ThreatActorsPage.jsx
2
```

PASS. Exactly 2 occurrences — one in loadData's Actors branch, one in silentRefresh's Actors branch. Campaigns branch sends NO sort/order params (uses `const params = {}`).

### Modal portal count

```bash
$ grep -c "createPortal(" frontend/src/pages/ThreatActorsPage.jsx
2
```

PASS. Two `createPortal(` calls — one for `<ThreatActorModal>`, one for `<CampaignDetailModal>`.

### D-28 + D-29 — no CSS, no deps across plan range

```bash
$ git diff --stat HEAD~3 HEAD -- frontend/src/styles/
(empty)
$ git diff --stat HEAD~3 HEAD -- frontend/package.json frontend/package-lock.json
(empty)
```

PASS — D-28 (zero CSS file edits) and D-29 (zero new dependencies) both honored across all 3 task commits.

### Plan 01 outputs untouched in this plan

```bash
$ git diff --stat HEAD~3 HEAD -- frontend/src/api/threat-campaigns.js frontend/src/components/threat-actors/
(empty)
```

PASS. The three Plan 01 files are referenced by import only — zero modifications in this plan's range.

## Vite Build

| Task | Build duration | Status |
|------|----------------|--------|
| Task 1 (`253eb73`) | 28.41s | green (exit 0) |
| Task 2 (`44759ea`) | 28.25s | green (exit 0) |
| Task 3 (`0dcf0ab`) | 24.75s | green (exit 0) |

All three task commits produce a clean build. Within the Phase 64 sampled range (~25–35s).

## Mid-State Notes

Per the plan's deviation protocol (point 5), the page passes through two intentional intermediate states:
- **End of Task 1**: Toolbar shows the toggle and the URL updates correctly when clicked, but the content area below still always renders the Threat Actors grid. (No fetch wiring yet.)
- **End of Task 2**: Toggling to Campaigns triggers a real `/api/threat-campaigns` fetch and populates `items` correctly, but the GRID still uses `<ThreatActorCard>` for every item. Defensive optional chaining in `ThreatActorCard` prevents crashes — the visual is wrong (Campaign fields don't render), but the functional state (data loaded, no errors) is correct.

These mid-states are by design (atomic per-task commits over fewer-but-bigger commits) and the build stays green at every step. Full user-visible behavior lands at end of Task 3.

## Requirement Coverage

- **CAMP-01** (toolbar pill toggle visible): **code-complete** — Task 1 toolbar restructure renders 2 `.tab-item` buttons with exact labels "Threat Actors" / "Campaigns" per D-06; pill bar visually distinct via `!border-b-0 !mb-0` overrides per D-05.
- **CAMP-02** (Campaigns view exists): **code-complete** — Plan 01 created the components, Plan 02 wired them in (Tasks 2 + 3); user-clickable Campaigns view fully functional with view-aware fetch + grid + empty state + modal portal.
- **CAMP-03** (URL state via `?view=campaigns`): **code-complete** — Task 1 handleViewChange writes `?view=` via setSearchParams within a single update.
- **CAMP-04** (refresh restores view): **code-complete** — Task 1 view derivation reads `?view=` on every render, so refresh re-runs the same derivation and immediately reaches the correct view.
- **CAMP-05** (card fields user-visible): was code-complete in Plan 01 component-level; Plan 02 wires it into the grid render (Task 3 Edit 2) — user-visible after this plan.
- **CAMP-06** (detail modal user-visible): was code-complete in Plan 01 component-level; Plan 02 wires it via the second createPortal block (Task 3 Edit 3) — user-visible after this plan.

**SC5** (toggle resets search/after): satisfied — handleViewChange deletes both URL params + resets cursorHistory.

**Not addressed in this plan (Plan 03 territory):**
- Manual QA validation steps
- REQUIREMENTS.md prose patch (D-20 enforcement at the requirements level)
- VALIDATION.md scaffold

## Deviations

### Plan grep gate `>Threat Actors<` / `>Campaigns<` did not match — pill labels are multi-line JSX

**Found during:** Task 1 verification.

**Issue:** The plan's acceptance gate `grep -qF ">Threat Actors<" ...` (and the parallel one for `>Campaigns<`) was written assuming inline JSX like `<button>Threat Actors</button>`. The plan's own `<action>` Edit 5 spec, however, formats the buttons across multiple lines:
```jsx
<button ...>
  Threat Actors
</button>
```
With the label on its own line, the `>` and `<` are on different lines and `grep -qF ">Threat Actors<"` returns non-zero.

**Resolution applied (per `<deviation_protocol>` Rule 2 — plan grep typo, satisfy structural intent):** The structural intent (the exact pill labels per D-06) is verified via `grep -c "^            Threat Actors$"` and `^            Campaigns$"`, both returning 1. The pill labels ARE present and correctly rendered. The plan grep gate was over-strict for the chosen JSX formatting — no code change needed.

**Files modified:** none (the labels are correct as-written by the plan's `<action>` block).

**Verification:**
```bash
$ grep -c "^            Threat Actors$" frontend/src/pages/ThreatActorsPage.jsx
1
$ grep -c "^            Campaigns$" frontend/src/pages/ThreatActorsPage.jsx
1
```
PASS — both pill labels present at the expected JSX nesting depth.

## Claude's-Discretion Calls

1. **Open modals are CLOSED on view toggle.** Added `setSelectedActor(null); setSelectedCampaign(null);` after the cursor reset inside `handleViewChange`. Without this, an open Actor modal could remain visible when the user toggled to Campaigns (the modal portal renders to `document.body` independent of the view tree). This is a defensive UX call — the plan's `<behavior>` block did mention these closers as part of the handleViewChange spec, so this is a verbatim apply rather than a new call. (Documenting it here for completeness.)

2. **Page header "Threat Actors" left UNCHANGED across views.** Per D-02 and the plan's Task 3 `<behavior>` note: Campaigns is a sub-view of the Threat Actors hub, not a separate page. Toggling to Campaigns leaves the `<h1>Threat Actors</h1>` and the subtitle "Browse known threat actor profiles" UNCHANGED. Avoids visual jitter on toggle, matches the design intent that the route `/threat-actors` is the hub for both views.

3. **Toolbar pill bar uses `!mb-0 !border-b-0 shrink-0` overrides.** The default `.tab-bar` from main.css applies `mb-6` (bottom margin for content tab bars) and `border-b border-border` (underline). For the toolbar pill bar both are unwanted: the toolbar already uses `gap-3` so the bottom margin would create double spacing, and the underline visually conflates the toolbar bar with the modal's content tab bar lower in the page. The `!important` overrides keep the rest of the `.tab-bar` styling (flex layout, gap-1) while suppressing the two undesired effects. Plan 03 polish phase can revisit if a different visual treatment is desired.

## Self-Check

**File modified:**
- FOUND: `frontend/src/pages/ThreatActorsPage.jsx` (1073 lines, < 1500 cap)

**Commits exist:**
- FOUND: `253eb73` (Task 1 — view state + pill toggle + handleViewChange)
- FOUND: `44759ea` (Task 2 — view-aware loadData + silentRefresh)
- FOUND: `0dcf0ab` (Task 3 — view-aware grid + Campaign modal portal)

**Critical gates:**
- D-08 single-source predicate present — PASS
- D-07 active-pill no-op guard present — PASS
- D-09 + SC5 — `next.delete('search')` AND `next.delete('after')` both present — PASS
- D-10 search input `key={view}` remount — PASS
- D-11 `setCursorHistory([])` reset — PASS
- D-26 — `const params = { sort: 'modified', order: 'desc' };` count = 2 (Actors loadData + silentRefresh; Campaigns sends NO sort/order) — PASS
- `createPortal(` count = 2 (Threat Actor + Campaign portals) — PASS
- D-28 — zero CSS file edits across plan range (`git diff --stat HEAD~3 HEAD -- frontend/src/styles/` empty) — PASS
- D-29 — zero deps changes across plan range (`git diff --stat HEAD~3 HEAD -- frontend/package.json frontend/package-lock.json` empty) — PASS
- Plan 01 outputs UNTOUCHED — PASS
- File line count 1073 < 1500 (CLAUDE.md hard cap) — PASS
- Vite build green at every task commit — PASS

## Self-Check: PASSED
