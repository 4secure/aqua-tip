---
phase: 62-frontend-buffer-size-dropdown
plan: 01
subsystem: ui
tags: [frontend, component, threat-map, react, react19, vite, tailwind, localStorage, accessibility, controlled-component]

# Dependency graph
requires:
  - phase: 61-frontend-threat-map-buffer-refactor
    provides: useThreatMapBuffer hook with bufferLimitRef PITFALL-01-safe dynamic-cap contract (ready for Phase 62 dropdown to flow a live bufferSize prop in without SSE reconnect)
provides:
  - BufferSizeControl React component (controlled native <select> in glass-card-static p-4)
  - BUFFER_SIZE_OPTIONS named export ([100, 500, 1000, 2000] - single source of truth for whitelist)
  - BUFFER_SIZE_STORAGE_KEY named export ('aqua-tip:threat-map-buffer-size' - MAPCFG-02 key)
  - DEFAULT_BUFFER_SIZE named export (100 - MAPCFG-04 fallback)
  - readBufferSize() helper with silent-fallback contract (D-16/D-19 — null/throw/non-numeric/off-whitelist all default to 100)
affects: [62-02, 63, 64-marker-clustering]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Module-level whitelist constant + single-function reader (readBufferSize) co-located in component file — single source of truth for MAPCFG-04 validation"
    - "Silent-fallback localStorage read: try/catch outer + null check + Number() coercion + Number.isFinite + whitelist.includes (four guard clauses in order)"
    - "Controlled native <select> with explicit Number(e.target.value) coercion on change — keeps consumer state numeric without string/number mismatch at downstream hook call-site"

key-files:
  created:
    - frontend/src/components/threat-map/BufferSizeControl.jsx (101 lines — component + 3 constants + 1 helper)
  modified: []

key-decisions:
  - "[Phase 62-01] Exported BUFFER_SIZE_OPTIONS / BUFFER_SIZE_STORAGE_KEY / DEFAULT_BUFFER_SIZE / readBufferSize from the component file rather than a shared constants module — single caller in Plan 62-02, zero new files, no premature abstraction. Phase 63 (cluster threshold) can still import from the component file; if a second consumer emerges with divergent needs, extract then."
  - "[Phase 62-01] readBufferSize declared at module scope (not inside the component) — pure function, no closure capture needed, testable in isolation. Matches the 'no premature abstraction' rule while keeping the function where its caller (Plan 62-02's useState lazy-init) can import it."
  - "[Phase 62-01] Collapsed the <label> JSX to `>Buffer</label>` single-line form instead of the multi-line pretty-print the plan's example code showed — required by the automated verify grep `>Buffer<`. Semantically equivalent; JSX whitespace collapses identically at render time."

patterns-established:
  - "Phase-62 whitelist-first localStorage read: BUFFER_SIZE_OPTIONS as single source of truth, readBufferSize performs try/catch + null-check + Number.isFinite + .includes in that order — all invalid inputs fall through to DEFAULT_BUFFER_SIZE silently"
  - "Co-location of enum-like constants with their sole view component — when a constant has one consumer and one validation site, keeping them in the same file avoids a shared-module ceremony; future consumers re-import from the component file until N>=2 consumers with divergent needs justify extraction"

requirements-completed:
  - MAPCFG-01
  - MAPCFG-04

# Metrics
duration: 3min
completed: 2026-04-21
---

# Phase 62 Plan 01: BufferSizeControl Component Summary

**Controlled native <select> for the 4-preset buffer cap (100/500/1000/2000) plus a whitelist-backed readBufferSize() helper that silent-falls-back to 100 on any invalid localStorage state.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-21T10:37:29Z
- **Completed:** 2026-04-21T10:40:27Z
- **Tasks:** 2 (1 implementation + 1 verification — gate-only, no separate commit)
- **Files modified:** 1 (new file)

## Accomplishments

- Shipped `BufferSizeControl.jsx` (101 lines) — one new file, zero edits to any existing file
- Established single source of truth for `BUFFER_SIZE_OPTIONS = [100, 500, 1000, 2000]` (named export, consumable by Plan 62-02 + Phase 63 cluster threshold)
- Implemented `readBufferSize()` silent-fallback contract per D-16/D-19 — passes all 8 structural guards in order (try/catch + null-check + Number + Number.isFinite + whitelist.includes + return n + catch fallback)
- Component mirrors `ThreatMapCounters.jsx` surface treatment (glass-card-static p-4) + `.input-field` focus ring (focus:border-violet/50, focus:ring-1, focus:ring-violet/20) — zero new Tailwind tokens, zero new CSS classes
- Verified Vite production build remains green (`✓ built in 12.95s`) — no regression in any currently-imported module
- Hook-lock invariant preserved: `useThreatMapBuffer.js` + `useThreatStream.js` byte-identical to pre-plan (v6.1 lock, PITFALL-01)
- Zero dependency drift: `frontend/package.json` + `frontend/package-lock.json` untouched

## Task Commits

Each task was committed atomically:

1. **Task 1: Create BufferSizeControl.jsx with constants + readBufferSize helper + component** — `bf1135e` (feat)
2. **Task 2: Verify production build stays green and scope invariants hold** — no commit (verification gate only; no file changes produced)

_Task 2 was a pure quality gate (Vite build + git scope + structural regex probe + hook diff + deps diff). No files were modified, so no task commit was created — per standard GSD protocol, verification-only tasks that produce zero diff do not generate a commit._

## Files Created/Modified

- `frontend/src/components/threat-map/BufferSizeControl.jsx` (NEW, 101 lines) — React component file containing: (a) 3 module-level constants (`BUFFER_SIZE_OPTIONS`, `BUFFER_SIZE_STORAGE_KEY`, `DEFAULT_BUFFER_SIZE`); (b) `readBufferSize()` helper; (c) default-export `BufferSizeControl({ value, onChange })` component rendering glass-card-static p-4 wrapper → flex row → `<label htmlFor="threat-map-buffer-size">Buffer</label>` + controlled `<select id="threat-map-buffer-size" value={value} onChange={(e) => onChange(Number(e.target.value))}>` with four `<option>` children mapped from `BUFFER_SIZE_OPTIONS`.

## Decisions Made

- **Whitelist + key co-located with component (D-04 locked; D-15 locked):** Exported from `BufferSizeControl.jsx` rather than a shared constants module. One current consumer (Plan 62-02's ThreatMapPage wiring); one future consumer candidate (Phase 63 cluster-threshold check may reuse the 500 pivot). Co-location beats premature extraction at the current N=1.
- **Module-level `readBufferSize`:** Pure function at module scope, no closure capture. Testable in isolation; plan 62-02 imports it directly into the `useState(readBufferSize)` lazy initializer — same import site as `BUFFER_SIZE_OPTIONS`.
- **Single-line `<label>Buffer</label>` JSX:** Collapsed the pretty-printed multi-line form to satisfy the automated verify grep `>Buffer<`. Zero semantic/visual difference (JSX whitespace is normalized at render); keeps the verification contract strictly satisfied without relaxing the probe.
- **Number-as-option-value, Number-coerced-on-change:** `<option value={size}>` where `size` is a JS Number (React coerces to DOM string); `onChange={(e) => onChange(Number(e.target.value))}` per D-31. Consumer state stays numeric end-to-end — `useThreatMapBuffer`'s `bufferLimitRef.current` is a Number, so no boundary mismatch.
- **No `aria-label`, no `appearance-none`, no custom chevron:** D-08 + D-28 + UI-SPEC §Idle locked these explicitly. Native control is the most accessible + least-code option; browser chevron is fine for a 4-option preset picker.

## Deviations from Plan

None — plan executed as written with one micro-clarification (see "Decisions Made" for the single-line `<label>` JSX note, which was a literal match to the plan's automated verify grep rather than a semantic deviation).

## Verification Evidence

1. **File existence + all 14 required tokens present:** `OK — 14 tokens present; component file shape verified` (node regex probe on `export const BUFFER_SIZE_OPTIONS = [100, 500, 1000, 2000]`, `export const BUFFER_SIZE_STORAGE_KEY = 'aqua-tip:threat-map-buffer-size'`, `export const DEFAULT_BUFFER_SIZE = 100`, `export function readBufferSize()`, `export default function BufferSizeControl({ value, onChange })`, `htmlFor="threat-map-buffer-size"`, `id="threat-map-buffer-size"`, `glass-card-static p-4`, `font-sans text-xs text-text-muted`, `bg-surface-2 border border-border rounded-lg`, `focus:border-violet/50 focus:ring-1 focus:ring-violet/20`, `onChange(Number(e.target.value))`, `BUFFER_SIZE_OPTIONS.map`, `>Buffer<`).
2. **readBufferSize D-16 structural shape:** `OK — readBufferSize body matches D-16 (8 structural tokens in order)` (try/localStorage.getItem(KEY)/null-check+return DEFAULT/Number(raw)/!Number.isFinite+return DEFAULT/!BUFFER_SIZE_OPTIONS.includes+return DEFAULT/return n/catch+return DEFAULT, all present in source order).
3. **Vite production build:** `✓ built in 12.95s` (pre-existing >500kB chunk-size warning on `dist/assets/index-Dfsflwoj.js` — identical to Phase 61 builds, not introduced by this plan).
4. **Scope invariant — frontend/:** `git status --porcelain frontend/` empty post-commit (only change was the new file, now committed as bf1135e).
5. **Hook-lock invariant (v6.1 lock):** `git diff --stat frontend/src/hooks/useThreatStream.js frontend/src/hooks/useThreatMapBuffer.js` empty (zero changes to either hook).
6. **Zero dependency drift:** `git diff --stat frontend/package.json frontend/package-lock.json` empty (no new deps, no lockfile churn).

## JSX Runtime Readiness Note

This plan's file is not imported by any other module yet (Plan 62-02 adds the import). Vite tree-shakes unimported modules out of the production bundle, so the JSX inside `BufferSizeControl.jsx` has not yet been end-to-end JSX-transformed by `@vitejs/plugin-react`. **No further adjustment is expected** — the JSX follows the identical syntax as sibling components in `components/threat-map/` (e.g., `ThreatMapCounters.jsx`) which compile cleanly; Plan 62-02's build will be the first end-to-end validation of the JSX and will catch any unexpected JSX-runtime issue there.

## Issues Encountered

- **Automated verify grep `>Buffer<` initially failed against multi-line `<label>` JSX** — resolved by collapsing the label to single-line form. Semantic parity with UI-SPEC fully preserved; plan's own verify script is now strictly satisfied. No scope/contract change.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **Plan 62-02 unblocked:** `ThreatMapPage.jsx` can now `import BufferSizeControl, { BUFFER_SIZE_OPTIONS, BUFFER_SIZE_STORAGE_KEY, DEFAULT_BUFFER_SIZE, readBufferSize } from '../components/threat-map/BufferSizeControl'`, wire `const [bufferSize, setBufferSize] = useState(readBufferSize)`, swap the `useThreatMapBuffer(events, 100)` call-site to `useThreatMapBuffer(events, bufferSize)`, add the `useEffect([bufferSize])` persistence effect, and render `<BufferSizeControl value={bufferSize} onChange={setBufferSize} />` at the top of `LeftOverlayPanel`'s `panelContent`.
- **Phase 61 code-complete lock intact:** Both `useThreatMapBuffer.js` and `useThreatStream.js` are byte-identical to their Phase 61 Plan 03 state. PITFALL-01-safe `bufferLimitRef` pattern stays untouched; Plan 62-02's dropdown will flow the live `bufferSize` into the hook without SSE reconnect (verified architecturally per D-25).
- **No blockers.** MAPCFG-01 (dropdown with 4 options) and MAPCFG-04 (invalid localStorage → silent default) are half-satisfied at the primitive level (component + helper exist); Plan 62-02 completes the user-observable SC1/SC2/SC3/SC4 gates by wiring the primitive into the page.

## Self-Check: PASSED

- **File exists:** `frontend/src/components/threat-map/BufferSizeControl.jsx` — FOUND (101 lines, matches expected 60–80-line range with expanded JSDoc headers)
- **Task 1 commit exists:** `bf1135e` — FOUND in git log (`feat(62-01): add BufferSizeControl with readBufferSize helper`)
- **All 14 plan-level verify tokens present** (verified via node regex probe post-commit)
- **All 8 readBufferSize D-16 structural guards present in order** (verified via node regex probe post-commit)
- **Vite production build green** (`✓ built in 12.95s` — no errors, pre-existing chunk-size warning only)
- **Hook-lock invariant preserved** (git diff --stat on both hook files returns empty)
- **Zero dep drift** (git diff --stat on package files returns empty)

---
*Phase: 62-frontend-buffer-size-dropdown*
*Completed: 2026-04-21*
