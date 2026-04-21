---
phase: 62-frontend-buffer-size-dropdown
plan: 02
subsystem: ui
tags: [frontend, pages, threat-map, integration, react, react19, vite, localStorage, prop-drilling, hooks]

# Dependency graph
requires:
  - phase: 62-01
    provides: BufferSizeControl component + BUFFER_SIZE_STORAGE_KEY / BUFFER_SIZE_OPTIONS / DEFAULT_BUFFER_SIZE / readBufferSize exports
  - phase: 61-03
    provides: useThreatMapBuffer(events, bufferSize) hook with bufferLimitRef PITFALL-01-safe dynamic-cap contract — the architectural foundation that makes the one-token 100→bufferSize swap SSE-reconnect-free
provides:
  - User-visible buffer-size dropdown at top of threat-map left overlay panel
  - Live, reactive buffer cap threaded from React state through useThreatMapBuffer via a single parameter change (100 → bufferSize)
  - localStorage round-trip persistence of user-selected cap (read on mount via readBufferSize lazy initializer; write on change via useEffect([bufferSize]))
  - Prop-drilled bufferSize + onBufferSizeChange contract through LeftOverlayPanel (no new context provider)
affects: [63, 64-marker-clustering]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useState(readBufferSize) lazy-initializer as synchronous localStorage read at mount — mirror of the existing panelsCollapsed pattern in the same file"
    - "Sibling persistence useEffect with [bufferSize] dep array — one effect per persisted scalar, same try/catch + String() coercion shape as panelsCollapsed, no shared abstraction"
    - "Prop-drill for 2-level depth (page → panel → control) — consistent with existing LeftOverlayPanel pattern (~5 props already flow through); no context provider at this scale"
    - "One-token call-site swap (useThreatMapBuffer(events, 100) → useThreatMapBuffer(events, bufferSize)) — Phase 61 D-16 bufferLimitRef pattern converts this into a zero-reconnect live-cap update"

key-files:
  created: []
  modified:
    - frontend/src/pages/ThreatMapPage.jsx (+14 / -1 lines — import + state + persistence effect + call-site swap + 2 props on <LeftOverlayPanel>)
    - frontend/src/components/threat-map/LeftOverlayPanel.jsx (+5 / -1 lines — import + 2 destructured props + 1 new <div className="flex-shrink-0"><BufferSizeControl/></div> block prepended to panelContent)

key-decisions:
  - "[Phase 62-02] Imported only the named symbols (BUFFER_SIZE_STORAGE_KEY + readBufferSize) at the page level; the default BufferSizeControl component is imported directly by LeftOverlayPanel where it is rendered. Keeps each file's imports minimal — the page needs the key + helper, not the component reference."
  - "[Phase 62-02] Appended bufferSize={bufferSize} + onBufferSizeChange={setBufferSize} to the existing <LeftOverlayPanel> prop list rather than reorganising the prop order. Minimal git diff; preserves readability of the existing 'visibility / interaction / data / handler' groupings."
  - "[Phase 62-02] Placed the new persistence effect immediately below the existing panelsCollapsed effect and above the 'Clear peek state and timers when expanding' comment. Groups all localStorage persistence effects together and keeps peek-state logic visually adjacent to itself."
  - "[Phase 62-02] Verification Task 3 produced zero diff (pure quality gate: Vite build + hook-lock check + dep-drift check + scope check + end-to-end grep + legacy-literal absence + VALIDATION.md presence). Per GSD protocol and Plan 62-01 precedent, verification-only tasks with no file changes do not generate a task commit."

patterns-established:
  - "Phase-62 user-visible-wiring pattern: (a) import named symbols from component file, (b) useState(reader) lazy init, (c) sibling useEffect persistence mirroring adjacent state's persistence effect, (d) swap hook argument from literal to state variable, (e) append props to child panel. Five surgical edits; zero side-effects."
  - "bufferLimitRef handoff verified end-to-end: Phase 61 parameterised the hook (D-16), Phase 62-01 shipped the component + reader, Phase 62-02 wired the state — the entire MAPCFG-03 no-SSE-reconnect guarantee rests on useThreatStream.js not reading bufferSize, which git diff --stat confirms (empty). Architectural guarantee is machine-verifiable via a single git command."

requirements-completed:
  - MAPCFG-01
  - MAPCFG-02
  - MAPCFG-03
  - MAPCFG-04

# Metrics
duration: 3min
completed: 2026-04-21
---

# Phase 62 Plan 02: ThreatMapPage + LeftOverlayPanel Integration Summary

**Wires the Plan 62-01 BufferSizeControl primitive into ThreatMapPage + LeftOverlayPanel via a 5-edit surgical change — delivers user-visible MAPCFG-01/02/03/04 with zero hook edits and zero new dependencies.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-21T10:45:09Z
- **Completed:** 2026-04-21T10:48:03Z
- **Tasks:** 3 (2 implementation + 1 verification gate — no separate commit for verification)
- **Files modified:** 2
- **Files created:** 0

## Accomplishments

- `ThreatMapPage.jsx` wired end-to-end: import line + `useState(readBufferSize)` lazy initializer + `useThreatMapBuffer(events, bufferSize)` call-site swap + `useEffect([bufferSize])` persistence effect + two props on `<LeftOverlayPanel>` — five coordinated edits, +14 / -1 lines, zero collateral changes
- `LeftOverlayPanel.jsx` wired: import line + props destructure extension + new `<div className="flex-shrink-0"><BufferSizeControl/></div>` block prepended to `panelContent` — three edits, +5 / -1 lines, zero changes to AnimatePresence / SPRING_TRANSITION / EVENT_ISOLATION / peek-zone logic
- MAPCFG-01 (dropdown visible with 4 options) delivered at the code level; manual QA walk in 62-VALIDATION.md SC1
- MAPCFG-02 (localStorage persistence under `aqua-tip:threat-map-buffer-size`) delivered end-to-end: lazy read on mount + effect write on change, round-trip verified architecturally; manual QA walk in 62-VALIDATION.md SC2
- MAPCFG-03 (live cap update without SSE reconnect) delivered architecturally via the Phase 61 `bufferLimitRef` pattern — `useThreatStream.js` git diff empty, `useThreatMapBuffer.js` git diff empty, therefore `bufferSize` is not in the SSE effect's closure or dep array, therefore `EventSource` never re-subscribes; manual QA DevTools walk in 62-VALIDATION.md SC3
- MAPCFG-04 (invalid storage → silent 100 fallback) delivered: `readBufferSize` (Plan 62-01, D-16) guards null/throw/non-numeric/off-whitelist; `useState(readBufferSize)` lazy-initializer runs it exactly once at mount; manual QA walk in 62-VALIDATION.md SC4
- Vite production build green (`✓ built in 26.76s`); pre-existing >500kB chunk-size warning unchanged from Phase 61 — not introduced by this plan
- Hook-lock invariant preserved byte-identical: `git diff --stat frontend/src/hooks/useThreatStream.js frontend/src/hooks/useThreatMapBuffer.js` returns empty
- Zero dep drift: `git diff --stat frontend/package.json frontend/package-lock.json` returns empty
- Scope exact: 2 modified files (`ThreatMapPage.jsx`, `LeftOverlayPanel.jsx`) — both in commits `c9a768a` and `0694231`; no stray edits to any hook, CSS file, tailwind.config.js, package.json, or right-panel component

## Task Commits

Each implementation task was committed atomically:

1. **Task 1: Wire bufferSize state + localStorage persistence + call-site parameterization in ThreatMapPage.jsx** — `c9a768a` (feat; 1 file, +14 / -1)
2. **Task 2: Render BufferSizeControl at top of LeftOverlayPanel.jsx panelContent** — `0694231` (feat; 1 file, +5 / -1)
3. **Task 3: Full-phase integration gates — build green, scope clean, v6.1 locks held, 62-VALIDATION.md file exists** — no commit (verification-only task; produced zero file changes)

_Task 3 was a pure quality gate (Vite build + git scope + structural regex probe + hook-lock diff + deps diff + legacy-literal grep + VALIDATION.md presence). No files were modified, so no task commit was created — per standard GSD protocol and the Plan 62-01 precedent, verification-only tasks that produce zero diff do not generate a commit._

## Files Created/Modified

- `frontend/src/pages/ThreatMapPage.jsx` (MODIFIED, +14 / -1) — Phase-62 additions:
  - New import line after `PanelToggle` import: `import { BUFFER_SIZE_STORAGE_KEY, readBufferSize } from '../components/threat-map/BufferSizeControl';`
  - New state line between the `useThreatStream()` destructure and the `useThreatMapBuffer` call: `const [bufferSize, setBufferSize] = useState(readBufferSize);`
  - Call-site swap on the same line: `useThreatMapBuffer(events, 100)` → `useThreatMapBuffer(events, bufferSize)` (one-token change per D-22)
  - New sibling persistence effect immediately below the `panelsCollapsed` persistence effect: `useEffect(() => { try { localStorage.setItem(BUFFER_SIZE_STORAGE_KEY, String(bufferSize)); } catch { /* localStorage unavailable — degrade silently */ } }, [bufferSize]);`
  - Two new props appended to `<LeftOverlayPanel>`: `bufferSize={bufferSize}` and `onBufferSizeChange={setBufferSize}`
  - Nothing else changed: `STORAGE_KEY` unchanged, `buildIcon`/`addHighlightPulse`/`handleEventClick` unchanged, reconciliation effect unchanged, unmount-cleanup effect unchanged, peek-state logic unchanged, `useThreatStream()` destructure unchanged, `<RightOverlayPanel>` props unchanged, JSX tree shape unchanged
- `frontend/src/components/threat-map/LeftOverlayPanel.jsx` (MODIFIED, +5 / -1) — Phase-62 additions:
  - New import line between `framer-motion` and `ThreatMapCounters`: `import BufferSizeControl from './BufferSizeControl';`
  - Extended props destructure: `bufferSize, onBufferSizeChange` appended to the end of the existing prop list
  - New first child in `panelContent` fragment: `<div className="flex-shrink-0"><BufferSizeControl value={bufferSize} onChange={onBufferSizeChange} /></div>` — inserted BEFORE the existing `<ThreatMapCounters>` wrapper (D-09, D-11); independent flex-shrink-0 block per D-11
  - Nothing else changed: `SPRING_TRANSITION` unchanged, `stopPropagation`/`EVENT_ISOLATION` unchanged, AnimatePresence blocks unchanged, motion.div props unchanged, peek-zone div unchanged, existing three children (`<ThreatMapCounters>`, `<ThreatMapCountries>`, `<ThreatMapFeed>`) in their original wrappers in original order

## Decisions Made

- **Named-only import at the page (D-15 single-source-of-truth):** `ThreatMapPage.jsx` imports only `BUFFER_SIZE_STORAGE_KEY` + `readBufferSize` — the default `BufferSizeControl` component is imported directly by `LeftOverlayPanel.jsx` (Task 2) where it is rendered. Avoids a dead default-import at the page site and keeps each file's imports minimal.
- **useState lazy initializer with function reference (D-13):** `useState(readBufferSize)` passes the function itself (not an invocation) so React calls it exactly once on first render. Mirrors the `panelsCollapsed` pattern already in the file (lines 48-54 pre-edit). No inline `() => readBufferSize()` wrapper needed.
- **Persistence effect placement:** Immediately below the `panelsCollapsed` persistence effect and above the peek-clear effect. Groups all localStorage persistence logic together (two effects, two keys, identical try/catch shape) and keeps the peek-state logic visually adjacent to itself. Dep array is exactly `[bufferSize]`; `setBufferSize` is stable across renders and does not belong in the array (React guarantee).
- **`String(bufferSize)` coercion (D-18):** `localStorage` is string-typed natively; `String(100)` → `"100"` round-trips cleanly via `Number(raw)` in `readBufferSize`. Using `JSON.stringify` would be over-engineered for a scalar (and fragile on the parse path if a future executor misuses it).
- **Props appended to child-panel prop list in "append" style:** `<LeftOverlayPanel>` already mixes visibility / interaction / data / handler concerns in its prop ordering (by design — see Plan 62-02 plan's "arbitrary but consistent" remark). Appending `bufferSize={bufferSize}` + `onBufferSizeChange={setBufferSize}` at the end preserves git-diff minimalism and matches the existing file style.
- **Verification task produces zero commit (GSD protocol):** Task 3 is a pure quality gate (build + grep + git status). No file changes, no commit. Standard GSD executor protocol per Plan 62-01 precedent.

## Deviations from Plan

None — plan executed exactly as written. The three edits to `ThreatMapPage.jsx` (import, state+call-site, effect, props) and the three edits to `LeftOverlayPanel.jsx` (import, destructure, JSX) landed verbatim; no architectural change, no scope change, no plan-text adjustment required.

## Verification Evidence

All 7 plan-level gates verified (Phase 62 cumulative state — Plan 62-01 + Plan 62-02):

1. **Full-wire grep probe (13 structural tokens across 3 files):** `OK — MAPCFG-01..04 end-to-end wire verified (13 tokens across 3 files)` — all of: `page imports readBufferSize / page lazy-init / page call-site uses bufferSize / page imports storage key / page persistence effect / page drills prop / page drills handler / panel imports component / panel passes value / panel passes handler / ctrl exports whitelist / ctrl exports key / ctrl coerces to Number`.
2. **Production Vite build:** `✓ built in 26.76s` (pre-existing >500kB chunk-size warning on `dist/assets/index-DIo8j5fh.js` — identical shape to Phase 61/62-01 builds; not introduced by this plan).
3. **v6.1 hook-lock invariant:** `git diff --stat frontend/src/hooks/useThreatStream.js frontend/src/hooks/useThreatMapBuffer.js` returns empty — both hooks byte-identical to pre-Phase-62 state.
4. **Zero-dep-drift invariant:** `git diff --stat frontend/package.json frontend/package-lock.json` returns empty — zero new dependencies, zero lockfile churn.
5. **Scope invariant (Plan 62-02 alone):** `git diff --stat c9a768a~1..HEAD -- frontend/` shows exactly two files modified: `LeftOverlayPanel.jsx` (+6/-1 raw including trailing newline) and `ThreatMapPage.jsx` (+15/-1 raw including trailing newline) — total `2 files changed, 19 insertions(+), 2 deletions(-)`. No `M` on `RightOverlayPanel.jsx`, `ThreatMapCounters.jsx`, any hook, any CSS file, or `tailwind.config.js`.
6. **Legacy literal absent:** `grep "useThreatMapBuffer(events, 100)" frontend/src/pages/ThreatMapPage.jsx` returns zero matches — Phase-61-era hardcoded `100` literal is gone; the hook call-site is fully state-parameterised.
7. **62-VALIDATION.md present:** `.planning/phases/62-frontend-buffer-size-dropdown/62-VALIDATION.md` exists on disk — phase's manual-QA contract is in place.

## MAPCFG-03 Architectural Proof

The MAPCFG-03 no-SSE-reconnect guarantee is machine-verifiable:

- **Premise A (Phase 61 locked):** `useThreatStream.js` opens the `EventSource` inside a `useEffect([snapshotLoaded])` — `bufferSize` is not a variable `useThreatStream` imports, references, or closes over.
- **Premise B (Phase 62-02 verified above):** `git diff --stat frontend/src/hooks/useThreatStream.js` returns empty after Plan 62-02. Premise A is preserved byte-identical.
- **Premise C (Phase 61 locked):** `useThreatMapBuffer.js` reads `bufferSize` via `bufferLimitRef.current` inside the events-diff effect. The `bufferLimitRef` sync effect (`useEffect([bufferSize])`, one line: `bufferLimitRef.current = bufferSize`) does not touch state, does not open sockets, does not cause `useThreatStream` to re-render.
- **Premise D (Phase 62-02 verified above):** `git diff --stat frontend/src/hooks/useThreatMapBuffer.js` returns empty after Plan 62-02. Premise C is preserved byte-identical.
- **Conclusion:** Changing the dropdown re-renders `ThreatMapPage` (state change) and `LeftOverlayPanel` + `BufferSizeControl` (prop change), but the `EventSource` connection in `useThreatStream` is never torn down or re-opened. The bufferLimitRef picks up the new cap on the next overflow-eviction tick in the buffer hook; the SSE stream is completely untouched.

DevTools verification of this architectural guarantee (manual QA): 62-VALIDATION.md SC3 instructs the walker to filter Network → EventSource, flip the dropdown across `100 / 500 / 1000 / 2000`, and observe that the existing EventSource row remains active (green dot) with no new connection row throughout — this converts the architectural proof into an observable behavioural proof.

## Stub / Threat-Surface Scan

- **Stubs:** None. The dropdown is not a placeholder — it is fully wired to `useState` on the page, to `localStorage` via the persistence effect, and to the `useThreatMapBuffer` hook via the call-site swap. Every user interaction produces a real state change, a real localStorage write, and a real buffer-cap update.
- **Threat flags:** None. No new network endpoints, no new auth paths, no new file-access patterns, no schema changes. The new surface is a client-side UI control writing a whitelist-constrained scalar to localStorage — the same trust boundary the existing `panelsCollapsed` scalar already crosses. `readBufferSize` enforces a whitelist on read (MAPCFG-04 silent fallback) so a manually-tampered localStorage value cannot inject an arbitrary cap.

## Issues Encountered

None. All edits applied cleanly on first attempt; automated verify probes passed on first run for both Task 1 (7/7 tokens) and Task 2 (ordering check passed at positions 866 < 999); Vite build passed on first invocation; no RED/GREEN/REFACTOR cycle needed (this is a straightforward wiring plan, not a TDD plan); no deviations from plan text, no scope creep, no collateral edits.

## User Setup Required

None — no external service configuration required. The phase is code-complete; the human walker runs the manual QA in 62-VALIDATION.md to exercise the four MAPCFG success criteria against a live SSE stream at `/threat-map`.

## Handoff — Manual QA Walker (62-VALIDATION.md)

- **Start the dev server:** `cd frontend && npm run dev` — open `http://localhost:5173/threat-map`.
- **SC1 (dropdown visible, 4 options):** Expand the left panel (or hover to peek when collapsed). The top card reads "Buffer" with a `<select>` on the right. Open the select — four options in ascending order: 100 / 500 / 1000 / 2000. Default selected: 100.
- **SC2 (persistence):** Pick 500 → reload (`Ctrl+R`) → dropdown reads 500. DevTools → Application → Local Storage → `aqua-tip:threat-map-buffer-size` = `"500"`.
- **SC3 (no SSE reconnect):** DevTools → Network → filter `EventSource`. Flip the dropdown through 100 → 1000 → 2000 → 500 → 100. The existing `/api/threat-map/stream` row stays active (green dot) throughout; no new connection row appears; the right-panel feed keeps ticking uninterrupted.
- **SC4 (invalid storage → silent default):** DevTools → Application → Local Storage → delete the key → reload → dropdown = 100, map renders, zero console errors. Set the key to `"abc"` → reload → dropdown = 100. Set to `"250"` → reload → dropdown = 100. Set to `"2000"` → reload → dropdown = 2000.
- **Total walker time:** ~5 minutes per VALIDATION instructions.

## Next Phase Readiness

- **Phase 62 code-complete:** MAPCFG-01/02/03/04 all user-visible; the only outstanding work is the manual QA walk (62-VALIDATION.md) which does not require code changes — any finding there is a QA-regression ticket, not a plan-internal deviation.
- **Phase 63 (MAPCLU — marker clustering) unblocked:** Phase 63 reads `bufferSize` state at the same location Plan 62-02 defined it (`ThreatMapPage.jsx` — `const [bufferSize, setBufferSize] = useState(readBufferSize)`). When Phase 63 adds the `bufferSize > 500` threshold for conditionally enabling `MarkerClusterGroup`, it imports `BUFFER_SIZE_OPTIONS` from `BufferSizeControl.jsx` (or authors its own `CLUSTER_THRESHOLD = 500` constant — planner's call at that point).
- **Phase 61 manual QA still pending:** 61-VALIDATION.md walk is independent from Phase 62 and remains on the queue per STATE.md.
- **No blockers.**

## Self-Check: PASSED

- **ThreatMapPage.jsx edits committed:** commit `c9a768a` — FOUND in `git log --oneline` (`feat(62-02): wire bufferSize state + localStorage persistence into ThreatMapPage`).
- **LeftOverlayPanel.jsx edits committed:** commit `0694231` — FOUND in `git log --oneline` (`feat(62-02): render BufferSizeControl at top of LeftOverlayPanel panelContent`).
- **All 13 plan-level verify tokens present** (verified via node regex probe post-commit: `OK — MAPCFG-01..04 end-to-end wire verified (13 tokens across 3 files)`).
- **Vite production build green** (`✓ built in 26.76s` — pre-existing chunk-size warning only, not introduced by this plan).
- **Hook-lock invariant preserved** (git diff --stat on both hook files returns empty).
- **Zero dep drift** (git diff --stat on package files returns empty).
- **Legacy literal absent** (grep for `useThreatMapBuffer(events, 100)` returns zero matches in ThreatMapPage.jsx).
- **62-VALIDATION.md present** (file exists at `.planning/phases/62-frontend-buffer-size-dropdown/62-VALIDATION.md`).

---
*Phase: 62-frontend-buffer-size-dropdown*
*Completed: 2026-04-21*
