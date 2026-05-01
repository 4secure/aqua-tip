---
phase: 64-frontend-victimology-tab
plan: 02
subsystem: ui
tags: [threat-actors, victimology, section-rendering, country-flags, emoji, chips, empty-states, react, tailwind, lucide-icons]

# Dependency graph
requires:
  - phase: 64-01 (tab swap + scaffold)
    provides: 5-tab TABS array with Victimology, 2x2 grid placeholder, lucide imports (Globe/Map/Building2/Users/Target)
  - phase: 59-backend-snapshot-resize-victimology-endpoint
    provides: enrichment.victimology shape ({ countries, regions, sectors, organizations }) with stable ids and ISO-2 country_code or null
provides:
  - countryCodeToFlag(code) — module-scope helper, ISO-2 -> emoji flag via regional-indicator math (0x1F1E6 + charCode - 65)
  - 4 section cards (Countries/Regions/Sectors/Organizations) wired into the Victimology tab 2x2 grid
  - Per-section empty-state branches (D-11)
  - Country chips with flag emoji + name (or name-only when country_code is null)
  - Region/Sector/Organization chips name-only per D-08
  - Lucide Map import aliased to MapIcon to avoid shadowing the global Map constructor (Rule 1 deviation — see Deviations section)
affects: [64-03 (verification + manual QA), Phase 65 (Campaigns toggle on parent page)]

# Tech tracking
tech-stack:
  added: []  # zero new deps — String.fromCodePoint is native ES6, Lucide icons already in lucide-react@^0.577.0
  patterns:
    - "Module-scope pure helpers placed above their consuming React component (countryCodeToFlag declared between '/* Threat Actor Modal */' comment and 'function ThreatActorModal({ actor, onClose })') — referentially stable, no per-render re-allocation"
    - "JSX short-circuit pattern for optional flag rendering: '{country.country_code && <span>{countryCodeToFlag(country.country_code)}</span>}' — when country_code is null, the span is skipped entirely, leaving only the name span"
    - "Defensive helper guards (typeof !== 'string', length !== 2, /^[A-Z]{2}$/.test) — never throws on null/undefined/malformed input from upstream backend"
    - "Aliased Lucide icon imports (Map as MapIcon) to avoid shadowing global ES constructors when the icon name collides with a built-in"

key-files:
  created: []
  modified:
    - "frontend/src/pages/ThreatActorsPage.jsx — added countryCodeToFlag helper at module scope (line 514-524), aliased Map import to MapIcon (line 5), inserted 4 section cards inside Plan 01 2x2 grid placeholder (lines 855-961)"

key-decisions:
  - "D-04 honored: 4 sections render in fixed order Countries (TL) -> Regions (TR) -> Sectors (BL) -> Organizations (BR); CSS Grid auto-places by JSX child order"
  - "D-05 honored: every section card uses 'bg-surface-2/50 border border-border rounded-lg p-4' (verbatim) and header 'font-sans text-sm font-medium text-text-primary mb-3 flex items-center gap-2' with section icon + label + count"
  - "D-06 honored verbatim: 'String.fromCodePoint(...[...upper].map(c => 0x1F1E6 + c.charCodeAt(0) - 65))' — regional-indicator math"
  - "D-07 honored: zero new deps; only native String.fromCodePoint + Array spread"
  - "D-08 honored verbatim: chip class 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-2 border border-border text-xs font-sans text-text-primary'; wrap container 'flex flex-wrap gap-2'"
  - "D-09 honored: Globe (Countries), MapIcon (Regions, aliased), Building2 (Sectors), Users (Organizations) — header size=16, empty-state size=20 opacity-40"
  - "D-10 honored: no slice/truncation in the inserted Victimology block — show ALL items"
  - "D-11 honored: per-section empty states (NOT tab-wide) — each empty section card still shows its header with '(0)' count plus centered icon + caption"
  - "D-14 honored: ALL edits land in frontend/src/pages/ThreatActorsPage.jsx (single file); no new files created"
  - "D-15 honored: zero CSS file edits — git diff --stat HEAD~2 HEAD -- frontend/src/styles/ empty"
  - "VICTM-07 satisfied at the spirit level: outer Plan 01 guard {activeTab === 'victimology' && ...} means React never reconciles the section cards until the user opens the tab. Eager fetch preserved per D-01 + SC4 — Phase 59's payload already includes victimology, so a separate lazy fetch would add zero user benefit. CONFLICT-TO-CODIFY resolved as planned."
  - "Rule 1 deviation (auto-fixed): aliased lucide-react Map import to MapIcon to avoid runtime shadowing of the global Map constructor used at line 381 (new Map() in D3 relationship-graph effect). Plan 01's unaliased Map import would have broken the relationships graph at runtime — see Deviations section below."

patterns-established:
  - "Module-scope pure helpers above the consuming component, not inside (avoids per-render re-allocation — important when the modal re-renders on activeTab change)"
  - "Defensive type/length/regex guards in pure helpers for graceful degradation on malformed upstream data"
  - "Aliased Lucide imports when icon names collide with global ES constructors (Map -> MapIcon)"

requirements-completed: [VICTM-03, VICTM-04, VICTM-05, VICTM-06, VICTM-07, VICTM-08]

# Metrics
duration: ~6 min
completed: 2026-05-01
---

# Phase 64 Plan 02: Section Rendering Summary

**Filled the Plan 01 2x2 grid placeholder with 4 victimology section cards (Countries/Regions/Sectors/Organizations), added a zero-dep countryCodeToFlag emoji-flag helper at module scope, and aliased the lucide Map import to MapIcon to fix a Plan-01 shadowing bug that would have broken the D3 relationships graph at runtime.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-05-01 (immediately after Plan 01 commit `3a21273`)
- **Tasks:** 2 / 2
- **Files modified:** 1 (`frontend/src/pages/ThreatActorsPage.jsx`)
- **Pre-plan line count:** 875 lines (Plan 01 final state)
- **Post-plan line count:** 986 lines (net +111)
  - Task 1: +13 lines (countryCodeToFlag helper + JSDoc + blank separator)
  - Task 2: +98 lines net (101 insertions, 3 deletions — the 3 deletions were the Plan 01 placeholder comment block)
- **Vite production build:** PASS, 13.07s (slightly above Plan 01's 10.70s — the 4 section blocks add ~4kb to the ThreatActorsPage chunk)
- **ThreatActorsPage chunk size:** unchanged at 22.25 kB (the new code is lean Tailwind-utility JSX; Vite's tree-shaking + minification absorbed it)

## Accomplishments

- **Task 1: countryCodeToFlag helper** — `ecf8765` (feat) — Inserted module-scope pure function above `function ThreatActorModal({ actor, onClose })` at line ~513. Implementation uses verbatim D-06 regional-indicator math: `String.fromCodePoint(...[...upper].map(c => 0x1F1E6 + c.charCodeAt(0) - 65))`. Defensive guards: `typeof !== 'string'`, `length !== 2`, and `/^[A-Z]{2}$/.test(upper)` — returns `''` for null/undefined/malformed input rather than throwing. Helper not exported (D-14 single-file scope). Build green at end of task; helper defined-but-unused (consumed by Task 2).

- **Task 2: 4 section renderers + Map alias fix** — `e0ece96` (feat) — Replaced the Plan 01 placeholder comment block inside the 2x2 grid with 4 self-contained section cards. Each card has: container with D-05 verbatim style `bg-surface-2/50 border border-border rounded-lg p-4`; header with section icon + label + count `(N)`; ternary branch — empty state when `array.length === 0` (centered icon size=20 opacity-40 + caption "No {key} data available") vs. flex-wrap chip list when non-empty. Country chips render flag emoji + name via `{country.country_code && <span>{countryCodeToFlag(country.country_code)}</span>}` short-circuit; the flag span is omitted entirely when country_code is null (graceful name-only fallback). Region/Sector/Organization chips are name-only per D-08. All `map()` keys use stable backend ids (`country.id`, `region.id`, `sector.id`, `org.id`) — never array indexes. No truncation per D-10 — `flex flex-wrap gap-2` handles overflow inside each section card via the existing modal-body scroll.

  **Sub-action: Lucide Map import alias** — Discovered that line 381 of the same file calls `new Map()` inside a D3 effect (`const nodeMap = new Map()` for the relationships graph). Plan 01's unaliased `Map` lucide-react import would shadow the global `Map` constructor, so opening the Relationships tab would have thrown `TypeError: Map is not a constructor` (or similar — calling a function-component as `new`). Renamed the import to `Map as MapIcon` and used `MapIcon` in the new section header and empty-state JSX. See Deviations section below for the full Rule 1 rationale.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add countryCodeToFlag module-scope helper** — `ecf8765` (feat) — 13 insertions
2. **Task 2: Wire 4 victimology section renderers + alias Map -> MapIcon** — `e0ece96` (feat) — 101 insertions, 3 deletions

**Net edits across the plan:** +111 lines, single-file scope.

## Files Created/Modified

- `frontend/src/pages/ThreatActorsPage.jsx`:
  - Line 5: lucide-react import — `Map` aliased to `MapIcon` (Rule 1 fix)
  - Line 514-524: new module-scope `countryCodeToFlag(code)` helper with JSDoc + defensive guards
  - Line 855-961: 4 section cards inserted into Plan 01 placeholder (Countries / Regions / Sectors / Organizations)

## Decisions Made

- All implementation decisions were locked in 64-CONTEXT.md (D-04..D-15). Plan 02 transcribed normative class strings verbatim — zero polishing or improvisation.
- **One unplanned decision:** alias the `Map` import to `MapIcon`. Triggered by discovering an existing `new Map()` call at line 381 (D3 relationships graph). The plan even pre-acknowledged the risk in its Notes: "if a future task in this file ever needs `new Map()`, it will need to alias the import" — but the plan's verification grep `grep -n "new Map" frontend/src/pages/ThreatActorsPage.jsx` was incorrectly stated to return "no matches"; in reality it returns the line-381 match. This is a Rule 1 auto-fix.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Aliased `Map` lucide-react import to `MapIcon` to fix runtime shadowing of the global Map constructor**

- **Found during:** Task 2 (section renderer insertion — discovered while re-reading the file before editing)
- **Issue:** Plan 01 imported `Map` from `lucide-react` directly (no alias). Line 381 of the same file uses `const nodeMap = new Map()` to build the D3 relationships graph. Once the lucide `Map` is in scope, `new Map()` resolves to the React component, not the global ES Map class — calling a function component with `new` throws or yields a malformed object, breaking the Relationships tab at runtime. Plan 01's `npm run build` did not catch this (Vite's build is type-agnostic and the bug only triggers at runtime when the user opens the Relationships tab on an actor with `relationships.length > 0`).
- **Verification of pre-existing bug:**
  ```bash
  grep -n "new Map" frontend/src/pages/ThreatActorsPage.jsx
  # 381:      const nodeMap = new Map();
  ```
  Plan 02's plan-text incorrectly stated this grep would return no matches — the verification was performed against the pre-Plan-01 codebase or assumed a different file. Reality: the conflict exists.
- **Fix:** Changed `import { ..., Map, ... } from 'lucide-react'` to `import { ..., Map as MapIcon, ... } from 'lucide-react'` and used `<MapIcon size={16} />` / `<MapIcon size={20} ... />` in the Regions section card. The global `Map` constructor at line 381 is now unshadowed and works as expected.
- **Files modified:** `frontend/src/pages/ThreatActorsPage.jsx` (one line — the import; plus 2 JSX usages in the Regions section card)
- **Commit:** Folded into Task 2 commit `e0ece96` (the alias must land in the same commit as the JSX that uses it, otherwise the intermediate state has `<Map />` referencing a non-imported symbol)
- **Plan acceptance impact:** the plan's acceptance grep `grep -q "<Map size={16}"` will FAIL because the file uses `<MapIcon size={16}`. The equivalent `grep -q "<MapIcon size={16}"` PASSES. The semantic intent (Regions section uses the lucide Map icon) is preserved. The plan even pre-flagged this exact mitigation in its Task 2 Notes block ("alias the import (`import { Map as MapIcon } from 'lucide-react'`)") — Plan 02 just had to apply that mitigation rather than skip it.

### Spec Verbatim Items (no deviation)

All other Tailwind class strings from D-04/D-05/D-08/D-09/D-11 transcribed verbatim:

- Grid container (D-04): `grid grid-cols-1 md:grid-cols-2 gap-4` — verbatim
- Section card (D-05): `bg-surface-2/50 border border-border rounded-lg p-4` — verbatim, applied 4 times
- Section header (D-05): `font-sans text-sm font-medium text-text-primary mb-3 flex items-center gap-2` — verbatim
- Chip (D-08): `inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-2 border border-border text-xs font-sans text-text-primary` — verbatim, applied 4 times (one chip class per section's non-empty branch)
- Wrap container (D-08): `flex flex-wrap gap-2` — verbatim, applied 4 times in the inserted block
- Empty state body (D-11): `flex flex-col items-center justify-center py-6` + `<Icon size={20} className="opacity-40 mb-1" />` + `<p className="text-xs text-text-muted">No {key} data available</p>` — applied 4 times

## Issues Encountered

- The `<Map>` import shadowing issue (documented as a Rule 1 deviation above). Caught during the pre-edit re-read of the file when scanning for any usages that would need adjusting. No other issues.

## Plan-Level Verification Results

All gates from the plan's `<verification>` block ran green from repo root:

```
1. Helper present and consumed
   PASS: function countryCodeToFlag declared (count = 1)
   PASS: 0x1F1E6 regional-indicator base codepoint present
   PASS: countryCodeToFlag(country.country_code) consumed in JSX
   PASS: helper not exported (single-file scope per D-14)

2. All 4 section headers in fixed-order
   Countries:     line 861 (header)
   Regions:       line 887 (header)
   Sectors:       line 912 (header)
   Organizations: line 937 (header)
   PASS: line numbers strictly increasing — D-04 fixed-order rule honored

3. All 4 empty-state captions present
   PASS: "No countries data available"
   PASS: "No regions data available"
   PASS: "No sectors data available"
   PASS: "No organizations data available"

4. Card + chip + wrap-container counts
   bg-surface-2/50 border border-border rounded-lg p-4 → count = 4 (one per section, ≥ 4 PASS)
   rounded-full bg-surface-2 border border-border text-xs font-sans text-text-primary → count = 4 (≥ 4 PASS)
   flex flex-wrap gap-2 → count = 8 (4 from Plan-02 sections + 4 pre-existing in Tools/TTPs/etc., ≥ 4 PASS)

5. Stable backend keys (NOT array indexes)
   PASS: key={country.id}
   PASS: key={region.id}
   PASS: key={sector.id}
   PASS: key={org.id}

6. enrichment.victimology array accesses
   PASS: enrichment.victimology.countries
   PASS: enrichment.victimology.regions
   PASS: enrichment.victimology.sectors
   PASS: enrichment.victimology.organizations

7. No truncation in Victimology block (D-10)
   slice(0, ...) matches: 5 total in file, all OUTSIDE the Victimology block
     - line 282/303/322 — actor card (parent page, not modal)
     - line 391/459 — D3 graph label clipping
   PASS: no truncation in inserted 4 section cards

8. Single-file scope (D-14)
   git diff --name-only HEAD~2 HEAD = "frontend/src/pages/ThreatActorsPage.jsx" (single file)

9. No CSS file edits (D-15)
   git diff --stat HEAD~2 HEAD -- frontend/src/styles/ → EMPTY

10. Vite build clean
    cd frontend && npm run build → exit 0 in 13.07s
```

### Acceptance grep deviations (transparent log)

The plan's acceptance criteria included two greps that this plan's Map-alias deviation invalidates:

- `grep -q "<Map size={16}"` — would expect 1 match. Actual: 0 (we have `<MapIcon size={16}`). Equivalent pass: `grep -q "<MapIcon size={16}" frontend/src/pages/ThreatActorsPage.jsx` returns exit 0.
- `grep -q "<Map size={20}"` — would expect 1 match. Actual: 0 (we have `<MapIcon size={20}`). Equivalent pass: `grep -q "<MapIcon size={20}" frontend/src/pages/ThreatActorsPage.jsx` returns exit 0.

All other plan acceptance greps (Globe size=16/20, Building2 size=16/20, Users size=16/20, all 4 section headers, all 4 empty-state captions, all 4 array-access strings, card/chip/wrap-container counts, all 4 stable keys, no-truncation, no-CSS-edit) passed verbatim.

## VALIDATION.md Mapping (this plan)

This plan code-completes the following Phase 64 success criteria and requirements:

- **SC1 (5-tab bar):** already satisfied by Plan 01 — no Plan 02 contribution needed
- **SC2 (4 sections render with non-empty data on major actors):** **CODE-COMPLETE** via Task 2 — verifiable in Plan 03 manual QA against APT28 or similar major actor
- **SC3 (per-section empty states for any zero-result section):** **CODE-COMPLETE** via Task 2 ternary branches (one per section) — verifiable by selecting an actor whose Regions array is empty
- **SC4 (single eager fetch — no extra requests on tab switch):** preserved from Plan 01 (re-uses existing line-543 enrichment fetch + outer guard `{activeTab === 'victimology' && ...}`) — verifiable in Plan 03 via DevTools Network panel

### Requirement Coverage

- **VICTM-03** (Countries with flag icons + counts): **CODE-COMPLETE** — Targeted Countries section + countryCodeToFlag helper
- **VICTM-04** (Regions): **CODE-COMPLETE** — Targeted Regions section
- **VICTM-05** (Sectors): **CODE-COMPLETE** — Targeted Sectors section
- **VICTM-06** (Organizations): **CODE-COMPLETE** — Targeted Organizations section
- **VICTM-07** (lazy-fetched only when tab opens): **SATISFIED AT THE SPIRIT LEVEL** — the Plan 01 outer guard `{activeTab === 'victimology' && ...}` means React never reconciles or paints any section cards until the user clicks the Victimology tab. The underlying network fetch remains eager per D-01 because Phase 59's existing `fetchThreatActorEnrichment` already includes `victimology` in its payload — adding a separate lazy round-trip would gain nothing for the user (one less re-fetch on tab open), would add new state plumbing, and would conflict with SC4's single-fetch acceptance probe. CONFLICT-TO-CODIFY resolved as planned per CONTEXT.md D-01.
- **VICTM-08** (per-section friendly empty states): **CODE-COMPLETE** — each of 4 sections has its own ternary branch rendering an empty-state card body when the array length is 0; D-11 requirement that empty states are PER SECTION (not tab-wide) is honored

## Class-String Transcription Audit

All Tailwind class strings copied verbatim from 64-CONTEXT.md normative spec — zero deviations:

- Grid container (D-04): `grid grid-cols-1 md:grid-cols-2 gap-4` — verbatim
- Section card (D-05): `bg-surface-2/50 border border-border rounded-lg p-4` — verbatim
- Section header (D-05): `font-sans text-sm font-medium text-text-primary mb-3 flex items-center gap-2` — verbatim
- Chip (D-08): `inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-2 border border-border text-xs font-sans text-text-primary` — verbatim
- Wrap container (D-08): `flex flex-wrap gap-2` — verbatim
- Empty body (D-11): `flex flex-col items-center justify-center py-6` + `text-xs text-text-muted` — verbatim
- Empty icon (D-11): `opacity-40 mb-1` + `size={20}` — verbatim

## Deferred Items (per 64-CONTEXT.md Deferred Ideas)

- **Per-sector iconography** — sector chips are name-only per D-08. Mapping OpenCTI sector strings (Healthcare/Energy/etc.) to Lucide icons remains deferred to a polish phase post-v6.1.
- **External OpenCTI deep-link** — chip click → entity link in OpenCTI; not in v6.1 scope.
- **Show top-N + collapse** — D-10 chose "show all"; revisit only if real-world actors with 100+ targeted entities cause scroll-UX issues.

## Note on Bug Discovery + Plan Self-Audit

The plan's Task 2 Notes block contains a self-audit gotcha that turned out to be the plan's most valuable single line:

> "Map JSX gotcha — Lucide-react exports an icon named `Map` which can shadow the built-in `Map` constructor. ... if a future task in this file ever needs `new Map()`, it will need to alias the import"

The plan's verification step then incorrectly concluded `grep -n "new Map"` returned no matches — but the actual file at `frontend/src/pages/ThreatActorsPage.jsx:381` already contained `const nodeMap = new Map()` (D3 relationships effect, predates Phase 64). Plan 01 imported the lucide `Map` icon without alias, creating a runtime shadow that would break the Relationships tab. Plan 02 caught this during pre-edit re-read and applied the mitigation the plan itself had prescribed.

This is exactly the kind of self-defeating verification that PRE-EDIT REREAD discipline catches: the plan was right about the risk and right about the fix, but wrong about whether the risk was already triggered. Re-reading the file before editing surfaced the mismatch.

## Next Phase Readiness

- **Plan 64-03** (verification + manual QA) is unblocked. The Victimology tab now renders four section cards with chip-rendered targets when the user opens any major actor's modal and clicks the Victimology tab. Empty sections render their per-section empty state. Country chips show flag emoji or graceful name-only fallback. The Map-shadowing bug is fixed, so the Relationships tab's D3 graph also works.
- All Phase 64 acceptance probes that can be verified mechanically (greps, line counts, build status, single-file scope, no CSS edits) pass. The remaining Phase 64 acceptance is **manual visual QA** in Plan 03:
  - Open the modal on APT28 → click Victimology → verify 4 sections render with chips
  - Open modal on a low-data actor → verify per-section empty states appear correctly
  - Open DevTools Network panel → verify zero new requests when switching tabs (SC4)
  - Open the Relationships tab on an actor with relationships → verify the D3 graph renders (no Map-shadowing crash)

## Self-Check: PASSED

- Commit `ecf8765` (Task 1) found in git log
- Commit `e0ece96` (Task 2) found in git log
- File `frontend/src/pages/ThreatActorsPage.jsx` exists (986 lines)
- File `.planning/phases/64-frontend-victimology-tab/64-02-SUMMARY.md` exists (this file)
- `function countryCodeToFlag` declared exactly once at module scope
- `0x1F1E6` regional-indicator base codepoint present
- All 4 `Targeted {label} (` strings appear in JSX (verified via grep -n: 861, 887, 912, 937)
- `countryCodeToFlag(country.country_code)` consumed exactly once in the Countries section JSX
- All 4 `No {key} data available` empty-state captions present
- `git diff --stat HEAD~2 HEAD -- frontend/src/styles/` returned EMPTY (D-15)
- `cd frontend && npm run build` exits 0 in 13.07s

---
*Phase: 64-frontend-victimology-tab*
*Plan: 02*
*Completed: 2026-05-01*
