---
phase: 64-frontend-victimology-tab
plan: 01
subsystem: ui
tags: [threat-actors, modal, tab-bar, lucide-icons, scaffold, react, tailwind]

# Dependency graph
requires:
  - phase: 59-backend-snapshot-resize-victimology-endpoint
    provides: enrichment.victimology payload (countries/regions/sectors/organizations)
  - phase: 56 (existing ThreatActorModal)
    provides: TABS array, eager enrichment fetch, enrichLoading/enrichError states, global error fallback
provides:
  - Updated TABS array with `victimology` tab in place of `campaigns`
  - Victimology tab content scaffold (skeleton 2x2 grid + non-victimology guard + placeholder grid container)
  - Lucide-react import block ready for Plan 02 section headers (Map, Building2, Users, Target added; Globe pre-existing; Flag removed)
  - Empty 2x2 `grid grid-cols-1 md:grid-cols-2 gap-4` placeholder ready for Plan 02 section renderers
affects: [64-02 (section rendering), 64-03 (verification + manual QA), Phase 65 (Campaigns toggle on parent page)]

# Tech tracking
tech-stack:
  added: []  # zero new deps — Lucide icons already in lucide-react@^0.577.0
  patterns:
    - "Atomic delete-and-insert via single Edit (Tools-close → Campaigns-block → Relationships-open as one old_string) — eliminates the order-of-operations trap when sequential deletes leave dangling anchor mismatches"
    - "Task ordering chosen so dev server hot-reload remains runnable across each commit boundary EXCEPT the build-time gap between Task 1 (Target referenced) and Task 3 (Target imported)"

key-files:
  created: []
  modified:
    - "frontend/src/pages/ThreatActorsPage.jsx — TABS swap, Campaigns block deleted, Victimology scaffold inserted, Lucide imports rebalanced"

key-decisions:
  - "D-02 honored: Campaigns content block (lines 829-862, 34 lines) deleted wholesale and Victimology scaffold (~22 lines) inserted in a single atomic Edit"
  - "D-04 honored: Victimology grid container uses `grid grid-cols-1 md:grid-cols-2 gap-4` Tailwind class string verbatim"
  - "D-09 honored: Target icon assigned to the Victimology tab in TABS; Map/Building2/Users imported (unreferenced this plan, consumed by Plan 02 section headers)"
  - "D-12 honored: skeleton uses 4 cards × `bg-surface-2 rounded-lg animate-pulse h-32` verbatim"
  - "D-13 honored: Victimology tab block guards via `&& !enrichError` — re-uses existing global enrichError fallback at line 640 area; no Victimology-specific error path"
  - "D-14 honored: ALL edits land in frontend/src/pages/ThreatActorsPage.jsx (single file); no new files created"
  - "D-15 honored: zero CSS file edits — `git diff --stat HEAD~3 HEAD -- frontend/src/styles/` empty"
  - "D-03 honored: existing line-542 `setActiveTab('overview')` reset is byte-identical pre/post plan"
  - "VICTM-07 satisfied at the spirit level: outer `{activeTab === 'victimology' && ...}` guard means React never reconciles or paints the 2x2 grid until the user clicks the Victimology tab; the underlying network fetch remains eager per D-01"

patterns-established:
  - "Atomic single-Edit deletion + insertion eliminates two-Edit anchor-ordering traps when the second Edit's anchor only matches AFTER the first Edit's deletion"
  - "Defensive double-guard `&& !enrichError && enrichment?.victimology` matches the existing TTPs/Tools/Relationships pattern — global enrichError fallback already covers the new tab"

requirements-completed: [VICTM-01, VICTM-02]

# Metrics
duration: ~7 min
completed: 2026-05-01
---

# Phase 64 Plan 01: Tab Swap + Scaffold Summary

**Replaced Campaigns tab with Victimology tab in Threat Actor modal: TABS swap, Campaigns block deleted, 2x2 grid scaffold inserted, Lucide imports rebalanced (Flag out, Map+Building2+Users+Target in)**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-05-01T00:00:00Z
- **Completed:** 2026-05-01T00:07:00Z
- **Tasks:** 3 / 3
- **Files modified:** 1 (frontend/src/pages/ThreatActorsPage.jsx)
- **Pre-plan line count:** 888 lines
- **Post-plan line count:** 875 lines (net -13 lines)
- **Vite build:** PASS, 10.70s

## Accomplishments
- TABS array's 5th entry rewritten in place: `{ key: 'campaigns', label: 'Campaigns', icon: Flag }` → `{ key: 'victimology', label: 'Victimology', icon: Target }`. Tab order: Overview → Relationships → TTPs → Tools → Victimology
- Campaigns content block (lines 829-862, 34 lines) deleted wholesale AND Victimology scaffold (~22 lines including 4 comment lines) inserted in a SINGLE atomic Edit — eliminates the two-Edit anchor-ordering trap
- Lucide-react import block rebalanced on line 5: removed `Flag`, added `Map, Building2, Users, Target` immediately after `Globe` (Globe pre-existing). Single-line import block preserved.
- Vite production build green: `cd frontend && npm run build` exits 0 in 10.70s. ThreatActorsPage.jsx chunk = 22.25 kB (slightly down from pre-plan).

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace `campaigns` entry in TABS array with `victimology`** — `19eb05c` (feat)
2. **Task 2: Atomically delete Campaigns content block + insert Victimology scaffold (single Edit)** — `8d1afe0` (feat) — 25 deletions, 12 insertions
3. **Task 3: Swap Lucide imports — remove Flag, add Map+Building2+Users+Target** — `427c1ef` (refactor) — first build gate of the plan; restores green build

**Net edits per task:**
- Task 1: 1-line TABS entry rewrite
- Task 2: 25-line deletion + 12-line insertion (atomic single-Edit; net -13 lines)
- Task 3: 1-line import rewrite (4 added named imports, 1 removed)

## Files Created/Modified
- `frontend/src/pages/ThreatActorsPage.jsx` — Updated TABS array (Campaigns→Victimology slot 5), deleted Campaigns content block, inserted Victimology scaffold (skeleton 4-card 2x2 grid + non-victimology guard + placeholder grid container), rebalanced Lucide imports

## Decisions Made
- All implementation decisions were already locked in 64-CONTEXT.md (D-01..D-15). Plan 01 transcribed D-02/D-03/D-04/D-09/D-12/D-13/D-14/D-15 verbatim — no new decisions made.
- Task ordering rationale (already in plan): Task 1 (TABS swap) → Task 2 (atomic Campaigns-delete + Victimology-insert) → Task 3 (Flag-import cleanup). Chosen so dev server hot-reload remains runnable through every commit boundary EXCEPT the build-time gap between Task 1 (Target referenced) and Task 3 (Target imported). Build gate intentionally placed at the end of Task 3, not between tasks.

## Deviations from Plan

None — plan executed exactly as written.

The pre-existing repo state showed two unrelated uncommitted files (`backend/tmp_upgrade_pro.sql`, `package-lock.json`) and two stale `M` entries on auth/sidebar components in the initial git-status snapshot; on actually inspecting the working tree at execution start, those reset themselves to clean. No untracked or unrelated files were modified by this plan. `git status --short` after each task showed exactly one `M` entry: `frontend/src/pages/ThreatActorsPage.jsx`.

## Issues Encountered

None.

## Plan-Level Verification Results

All gates from the plan's `<verification>` block ran green from repo root:

```
1. Tab swap landed (Task 1):
   PASS: Victimology label present
   PASS: victimology key present
   PASS: Target icon assigned

2. Campaigns + Flag fully purged (Tasks 2 + 3):
   campaigns=0 / Campaigns=0 / Flag=0  (case-sensitive grep -c)

3. Lucide imports rebalanced (Task 3):
   PASS: 4 new icons imported (Map, Building2, Users, Target contiguous after Globe)

4. Victimology scaffold structurally complete (Task 2):
   PASS: tab guard (activeTab === 'victimology')
   PASS: 2x2 grid (grid grid-cols-1 md:grid-cols-2 gap-4)
   PASS: skeleton spec (bg-surface-2 rounded-lg animate-pulse h-32)
   PASS: enrichment?.victimology payload guard

5. Single-file scope (D-14):
   git diff --name-only HEAD~3 HEAD = "frontend/src/pages/ThreatActorsPage.jsx" (single file)

6. No CSS file edits (D-15):
   git diff --stat HEAD~3 HEAD -- frontend/src/styles/  →  EMPTY

7. Vite build: exit 0, 10.70s

8. D-03 byte-identity check:
   git diff HEAD~3..HEAD shows no -/+ on the line-542 setActiveTab('overview') call

9. D-13 byte-identity check:
   git diff HEAD~3..HEAD shows no -/+ on the "Failed to load enrichment" fallback at line 640
```

## VALIDATION.md Mapping (this plan)

- **SC1 (5-tab bar with Victimology last, no Campaigns):** code-complete via Tasks 1+2+3
- **SC4 (single eager fetch, switching tabs triggers zero new requests):** structurally guaranteed by re-using existing line-543 fetch + `{activeTab === 'victimology' && ...}` guard. Manual DevTools-Network verification deferred to Plan 64-03.
- **VICTM-01 (Campaigns tab removed):** satisfied — TABS entry replaced + content block deleted + Flag import removed
- **VICTM-02 (Victimology tab added):** satisfied — new TABS entry + scaffold block + Target icon imported
- **VICTM-03..VICTM-06, VICTM-08:** DEFERRED to Plan 64-02 (section renderers — Countries / Regions / Sectors / Organizations cards, country flag emoji helper, per-section empty states)

## Class-String Transcription Audit

All Tailwind class strings copied verbatim from 64-CONTEXT.md normative spec:

- Grid container (D-04): `"grid grid-cols-1 md:grid-cols-2 gap-4"` — verbatim
- Skeleton card (D-12): `"bg-surface-2 rounded-lg animate-pulse h-32"` — verbatim

Zero deviations from normative class strings.

## Note on Task Ordering

Tasks 1 → 2 → 3 (TABS swap → atomic Campaigns-delete + Victimology-insert → Flag-import cleanup) chosen so the dev server remains runnable through every commit boundary EXCEPT the build-time gap between Task 1 (Target referenced in TABS) and Task 3 (Target imported from lucide-react). The plan executes Tasks 1+2+3 back-to-back in a single executor session and the build gate runs only at the end of Task 3 — no intermediate `npm run build` was attempted between tasks (intentional, per plan).

## Next Phase Readiness

- Plan 64-02 (Victimology section renderers) is unblocked. The 2x2 grid container at the new Victimology block is empty and waiting for 4 section cards: Countries (top-left), Regions (top-right), Sectors (bottom-left), Organizations (bottom-right). The lucide-react imports already include Globe/Map/Building2/Users for section header icons.
- The country flag emoji helper (D-06) is not yet present — Plan 02 adds it at module scope.
- The existing global `enrichError && activeTab !== 'overview'` fallback at line ~640 already covers the Victimology tab (D-13 re-use); no Victimology-specific error UI is needed.
- VICTM-07 lazy-render is structurally satisfied by the `{activeTab === 'victimology' && ...}` outer guard inserted in Task 2 — no further work required for that requirement.

## Self-Check: PASSED

- Commit 19eb05c (Task 1) found in git log
- Commit 8d1afe0 (Task 2) found in git log
- Commit 427c1ef (Task 3) found in git log
- File frontend/src/pages/ThreatActorsPage.jsx exists
- File .planning/phases/64-frontend-victimology-tab/64-01-SUMMARY.md exists

---
*Phase: 64-frontend-victimology-tab*
*Plan: 01*
*Completed: 2026-05-01*
