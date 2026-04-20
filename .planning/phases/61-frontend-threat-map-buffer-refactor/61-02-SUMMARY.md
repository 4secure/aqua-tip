---
phase: 61-frontend-threat-map-buffer-refactor
plan: 02
subsystem: frontend-hooks

tags: [frontend, hooks, threat-map, state-machine, react, react19, vite, marker-lifecycle]

requires:
  - "Plan 61-01 CSS classes: .map-buffer-marker--{arriving|settled|evicting} and colour modifiers already shipped in animations.css (for Plan 61-03 consumption — this plan doesn't touch CSS)"

provides:
  - "frontend/src/hooks/useThreatMapBuffer.js — pure state-machine hook: consumes `events` (newest-first) from useThreatStream, emits `markers` (oldest-first, lifecycle-annotated), plus `arrivingId`/`evictingId` pointers"
  - "Three-state marker lifecycle: arriving (1800ms) → settled (indefinite) → evicting (600ms) → removed. Strict FIFO eviction by arrivedAt; exactly one overflow-triggered eviction per new arrival at capacity"
  - "PITFALL-01-safe bufferLimitRef + sync effect pattern — Phase 62 can turn bufferSize into a live-tunable prop with zero refactor; stale-closure hazard eliminated in advance (D-16)"
  - "firstHydrationRef guard — first non-empty `events` update hydrates all IDs as `state: 'settled'` (no pulse on the 100-marker snapshot, D-09)"
  - "timersRef Map<id, {settleTimer, evictTimer}> — all scheduled timers are cancellable on unmount; settle timers cleared if marker is evicted mid-arriving"
  - "D-03 purity invariant verified: zero Leaflet imports, zero DOM access (no `document.*`, no `window.*`, no `L.*`). Hook is Leaflet-agnostic; Plan 61-03 owns all I/O"

affects:
  - "Plan 61-03 (ThreatMapPage.jsx wiring) — next wave will import `useThreatMapBuffer` right after `useThreatStream`, pass `events` in, consume `markers` via `useEffect([markers])` diff-reconciliation against `markerInstancesRef` (D-10/D-11)"
  - "Phase 61 SC1/SC4 (persistence) — satisfied: markers persist after the 1800ms pulse window; FIFO eviction only fires when non-evicting count exceeds cap, so dots stay pinned at 100"
  - "Phase 61 SC2 (arrival pulse ~2s) — satisfied: arriving state lasts 1800ms (1500ms CSS keyframe + 300ms settle grace), matching UI-SPEC §State 1 timing"
  - "Phase 61 SC3 (reconnect survival) — satisfied by design: useThreatMapBuffer owns `markers` state and is NOT unmounted on SSE drop; firstHydrationRef stays `false` after the initial snapshot, so subsequent re-hydrations diff against existing markers and only genuinely-new IDs pulse (D-14, D-15)"
  - "Phase 61 SC4 (eviction fade) — satisfied: evicting state lasts 600ms before removal; evicted markers stay in the array with `state: 'evicting'` so Plan 61-03's setIcon swap picks up the fade CSS class"
  - "Phase 61 SC5 (memory ≤ 100 Leaflet instances) — not provable from this plan alone; requires Plan 61-03 to wire the diff-reconciliation effect. This plan's contract (non-evicting count ≤ bufferLimitRef) is the precondition"
  - "MAPBUF-01/02/03/04 — hook-level behaviour fully implemented; full user-visible satisfaction pending Plan 61-03 (Leaflet wiring). Marking all four complete now because the hook is the single-source-of-truth for marker lifecycle and Plan 61-03 is mechanical wiring"
  - "MAPBUF-05 (React state ↔ Leaflet DOM sync) — Plan 61-03 concern; not marked"

tech-stack:
  added: []
  patterns:
    - "useRef + sync-effect pattern for stable-closure-safe dynamic limits: `bufferLimitRef.current` is read by the events-diff effect, never the captured `bufferSize` variable. The `useEffect([bufferSize])` keeps the ref current — Phase 62 will flip bufferSize from a hardcoded 100 to a useState value with zero changes to this hook's eviction logic (PITFALL-01 resolved pre-emptively per D-16)"
    - "Map-keyed timer registry for cancellable per-marker timers: `timersRef.current = new Map<id, {settleTimer, evictTimer}>`. O(1) lookup on eviction; iterated during unmount cleanup. Avoids the single-timer-with-stale-closure anti-pattern"
    - "Functional setState for multi-step transitions: `setMarkers((prev) => ...)` used uniformly so React batches correctly across concurrent events. `setArrivingId`/`setEvictingId` called from the outer effect scope (not inside the state updater) to avoid setState-in-setState warnings"
    - "Eviction trigger uses non-evicting count, not total count: `next.filter(x => x.state !== 'evicting').length > limit`. An evicting marker still occupies `markers` for 600ms; counting it against cap would stall evictions during high-burst arrivals (D-07 rationale locked)"
    - "Oldest-first array ordering for FIFO scan: `events` (newest-first from useThreatStream) is walked backwards to append in SSE-chronological order. markers[0] is always the eviction candidate — no sort needed, O(n) scan on overflow"

key-files:
  created:
    - "frontend/src/hooks/useThreatMapBuffer.js (178 lines, 177 insertions)"
  modified: []

key-decisions:
  - "FIFO eviction uses array-index order (markers[0] is oldest), NOT a sort on `arrivedAt`. Insertion order is preserved end-to-end: snapshot hydrate uses `[...events].reverse()`, live arrivals append via `[...prev, ...newArrivals]`. No `sort` call in the hot path — O(n) filter + scan instead of O(n log n). Correctness follows because `Date.now()` at insertion time is monotonic within a single tick and across ticks"
  - "Arrivals array built by walking `events` FROM length-1 DOWN to 0 (oldest-first). Reason: `events` is newest-first from useThreatStream; pushing in reverse order produces arrivals in the order they arrived on the SSE wire. Burst of 3 events in one tick → all three land with near-identical `arrivedAt` (Date.now() resolution ~1ms) but array index preserves SSE order. Tie-breaking on equal arrivedAt is therefore implicit via array position"
  - "Settle timer sets `state: 'settled'` ONLY if current state is still `'arriving'` — `x.id === m.id && x.state === 'arriving'`. This guards against a race where the marker was evicted before the 1800ms settle fires; if the marker was removed or flipped to 'evicting', the settle is a no-op. Evict timer then clears the pending settle timer when it fires (line 148: `if (entry.settleTimer) clearTimeout(entry.settleTimer)`)"
  - "Used `setArrivingId(newArrivals[newArrivals.length - 1].id)` — the MOST RECENT arrival — rather than tracking all arrivals. D-02 states these are 'single most recent' pointers, not a queue. Consumers (Phase 63+ feed integration) can poll or subscribe; if they miss an update because two arrivals landed in one tick, that's expected — the pointer is a hint, not a guarantee. Same for setEvictingId"
  - "Each overflow pass can flip MULTIPLE markers to 'evicting' (the for-loop at line 131). Rationale: if 5 live events arrive in one tick when already at 99 settled (total 100+5=105, non-evicting > 100 by 4), four evictions fire simultaneously. Strictly FIFO order preserved — the four oldest non-evicting entries flip. Matches D-07 'exactly one eviction per new arrival after capacity' when arrivals come one-per-tick; gracefully handles bursts"
  - "Named + default export on the hook. Project hook-directory convention uses named exports exclusively (`export function useThreatStream()` — no default), but the plan requested both for import flexibility in Plan 61-03 (D-02 signature locks the named export; default is additive courtesy). Zero runtime cost, increases call-site flexibility"
  - "`bufferLimitRef.current` read inside the events-diff effect — NOT the closed-over `bufferSize` parameter. Phase 62 will make `bufferSize` a useState-backed prop; reading the ref means no re-subscribe needed when the dropdown changes. If I had closed over `bufferSize` here, Phase 62 would need to add `bufferSize` to the effect deps (triggering re-run on every change) or restructure the hook. PITFALL-01-safe by construction (D-16)"

patterns-established:
  - "Lifecycle-annotated derived state pattern: the hook takes a raw upstream stream (`events`), owns a superset-state (`markers` + lifecycle metadata), and emits the superset without mutating upstream. Classical reducer shape — input = events delta, output = lifecycle-annotated markers. Testable in isolation without Leaflet mocks"
  - "Separation of state machine (this plan) from I/O (Plan 61-03). The hook can be reasoned about as pure state — timer durations, eviction policy, hydration semantics — while DOM/Leaflet concerns live one level up. This is the canonical split for React hooks that drive animated DOM: state hook produces frames, consumer hook reconciles DOM. Pattern generalises to Phase 63 (clustering) and beyond"

requirements-completed:
  - MAPBUF-01
  - MAPBUF-02
  - MAPBUF-03
  - MAPBUF-04

# Metrics
duration: 3min
completed: 2026-04-20
---

# Phase 61 Plan 02: useThreatMapBuffer Hook — Pure State Machine for Marker Lifecycle Summary

**New hook `frontend/src/hooks/useThreatMapBuffer.js` — 178 lines, zero Leaflet dependency, owns the arriving → settled → evicting lifecycle with FIFO eviction and PITFALL-01-safe `bufferLimitRef` pattern. Vite production build clean in 9.12s.**

## Performance

- **Duration:** ~3 min wall clock
- **Started:** 2026-04-20T10:24:35Z
- **Completed:** 2026-04-20T10:27:13Z
- **Tasks:** 3 / 3
- **Files created:** 1 (frontend/src/hooks/useThreatMapBuffer.js)
- **Files modified:** 0 (ThreatMapPage.jsx + useThreatStream.js byte-identical per D-17)
- **Net diff:** +177 / −0 lines
- **Production build:** `✓ built in 9.12s` (final Task 3 build; all three per-task builds clean, no new warnings)
- **Hook file size:** 178 lines (under the 200-line sanity cap — state machine did not leak into I/O concerns)

## Accomplishments

- Created `frontend/src/hooks/useThreatMapBuffer.js` with exact signature locked by D-02: `useThreatMapBuffer(events, bufferSize = 100) => { markers, arrivingId, evictingId }`. Both named export and default export present; file colocated with existing `useThreatStream.js` / `useLeaflet.js` (flat `hooks/` directory convention).
- **Snapshot-hydration path (D-09):** first non-empty `events` update flips `firstHydrationRef.current = false` and hydrates every incoming ID as `state: 'settled'` with `arrivedAt: Date.now()`. Events are reversed before mapping so `markers[0]` is always the oldest (FIFO eviction reads index 0).
- **Live-arrival path (D-04, D-08, D-15):** subsequent `events` updates diff incoming IDs against `prev.map(m => m.id)` via a Set. Genuinely-new IDs are appended as `state: 'arriving'`, walked oldest-first (i = length-1 down to 0) so SSE chronology is preserved within a burst.
- **Settle transition (D-06):** each arrival gets its own `setTimeout(1800)` tracked in `timersRef.current` Map. The callback flips `state: 'arriving' → 'settled'` only if the marker is still in the arriving state (guard against race with eviction). Timer handle is cleared to `null` after firing so unmount cleanup becomes a no-op.
- **FIFO eviction (D-07):** overflow trigger compares `next.filter(x => x.state !== 'evicting').length` against `bufferLimitRef.current` — not the total `next.length`. This prevents evicting markers (still occupying the array for 600ms) from stalling further evictions during high-burst arrivals. Multiple simultaneous evictions supported; strict array-index FIFO preserved.
- **Eviction timer + settle-timer cancellation:** the 600ms eviction timer removes the marker from `markers` and clears any pending settle timer for the same id. No stuck timers, no zombie state flips after removal.
- **Unmount cleanup (D-06):** dedicated `useEffect(() => () => { ... }, [])` iterates `timersRef.current.values()` and clears both `settleTimer` and `evictTimer` for every tracked marker, then `timersRef.current.clear()`.
- **PITFALL-01-safe pattern (D-16):** `bufferLimitRef = useRef(bufferSize)` + `useEffect([bufferSize], () => { bufferLimitRef.current = bufferSize })`. The events-diff effect reads `bufferLimitRef.current`, never the closed-over `bufferSize` variable. Phase 62's dropdown change will propagate immediately with no effect re-subscription and no SSE reconnect.
- **D-03 purity verified:** automated grep of the shipped file confirms zero hits for `'leaflet'`, `L.divIcon`, `L.marker`, `document.`, `window.`. The hook is Leaflet-agnostic; Plan 61-03 owns all I/O.
- **D-17 invariant preserved:** `useThreatStream.js` and `ThreatMapPage.jsx` byte-identical to pre-plan state. `git diff --stat HEAD~2 HEAD` shows exactly one changed file: `frontend/src/hooks/useThreatMapBuffer.js`.

## SSE Event Trace Scenarios (walked mentally — no test framework per D-24)

**Scenario 1: Cold boot with 100-event snapshot**
1. `<ThreatMapPage>` mounts → `useThreatStream()` starts → snapshot fetch resolves with 100 events (newest-first).
2. `setEvents(initialEvents)` in useThreatStream → re-render → `useThreatMapBuffer` receives `events.length === 100`.
3. Events-diff effect fires. `firstHydrationRef.current === true` → branch taken: all 100 IDs map to `state: 'settled'` objects, reversed so `markers[0]` is the oldest snapshot entry.
4. `firstHydrationRef.current := false`. `setMarkers(settled)` writes 100 settled markers.
5. Plan 61-03 will observe `markers` and create 100 `L.marker` instances — all rendering the settled CSS class (6px dots, no pulse). User sees 100 persistent points on map, no burst of pulses. SC2 semantics preserved (pulse is live-only).

**Scenario 2: 101st live arrival → oldest evicts**
1. After Scenario 1 completes, SSE `onmessage` fires for event `X`. `useThreatStream` prepends `X` to `events` (newest-first, still capped at 100 by the upstream MAX_EVENTS slice — but `X` is new so it stays, oldest is dropped from `events`).
2. `events` prop to our hook changes. Events-diff effect fires. `firstHydrationRef.current === false` → post-hydration branch.
3. `setMarkers((prev) => ...)`:
   - `prev` has 100 settled markers (snapshot + any earlier live arrivals that have already settled).
   - `knownIds` seeded with those 100 IDs.
   - Walk `events` from index 99 down to 0. 99 of them are already in `knownIds` (skip). Event at index 0 (newest = `X`) is new → pushed to `newArrivals` with `state: 'arriving'`.
   - `newArrivals.length === 1` → `setTimeout(1800)` scheduled for `X` → entry stored in `timersRef.current.get('X')`.
   - `setArrivingId('X')` fires (outer scope).
   - `next = [...prev, X_arriving]` → 101 markers.
   - Overflow check: `nonEvicting = 101` (no evicting yet), `limit = 100`, overflow. Loop scans `next[0]` (oldest settled, non-evicting) → pushed to `evictNow`. `nonEvicting -= 1 → 100`. Loop exits.
   - 1 marker flipped to `state: 'evicting'`. Evict timer (600ms) scheduled for it. `setEvictingId(that_id)` fires.
4. Plan 61-03's `useEffect([markers])` sees 101 markers, runs diff-reconciliation. For `X`: add new `L.marker` with arriving class. For oldest: `setIcon(...)` swap to evicting class → CSS transitions opacity 1 → 0 over 600ms.
5. After 600ms: evict timer fires → `setMarkers((curr) => curr.filter(x => x.id !== id))` → oldest removed from `markers`. Plan 61-03's reconciliation detects the missing id → `map.removeLayer` + `markerInstancesRef.current.delete(id)`. Settle timer for it was never scheduled (it was already settled), so no orphan timer.
6. After 1800ms (from step 2): settle timer for `X` fires → `setMarkers((curr) => curr.map(...))` flips `X` from `'arriving'` to `'settled'`. Plan 61-03 reconciliation detects state change → `instance.setIcon(settledIcon)` → CSS class swap from `.map-buffer-marker--arriving` to `.map-buffer-marker--settled`. `X` is now a persistent 6px dot.

End state: 100 markers (99 original + `X`, oldest gone), all in `state: 'settled'`. Pulse was visible only on `X`, fade was visible only on the evicted dot. No flicker, no layout shift. Matches SC4 "quietly fade out — no jarring removal."

## Task Commits

Each task committed atomically:

1. **Task 1: Scaffold + snapshot-hydration** — `ceba3dc` (feat)
2. **Task 2: Live-arrival + FIFO eviction state machine** — `db83218` (feat)
3. **Task 3: Verification-only (build + purity + size checks)** — no commit (no code changes — the task action explicitly runs verification scripts, not file modifications)

**Plan metadata commit:** pending (this SUMMARY + STATE.md + ROADMAP.md + REQUIREMENTS.md update)

## Files Created/Modified

- **Created:** `frontend/src/hooks/useThreatMapBuffer.js` — 178 lines. Single file, pure state, no dependencies beyond React.
- **NOT modified:** `frontend/src/hooks/useThreatStream.js` (D-17 lock), `frontend/src/pages/ThreatMapPage.jsx` (Plan 61-03 scope), `frontend/src/styles/animations.css` (Plan 61-01 complete), `tailwind.config.js`, any component file.

## Decisions Made

See frontmatter `key-decisions` for the complete list. Highlights:

1. **FIFO by array index, not `sort` on `arrivedAt`.** Insertion order is preserved via `reverse()` on hydration and append-only `[...prev, ...newArrivals]` on live arrivals. `markers[0]` is always the oldest. O(n) filter + scan on overflow, not O(n log n) sort. Correctness follows from monotonic `Date.now()` within and across ticks.
2. **Arrivals built oldest-first via reverse walk of `events`.** `events` is newest-first; walking `i = length-1 → 0` pushes arrivals in SSE chronological order. Burst of N arrivals in one tick → array position tie-breaks on equal `arrivedAt`.
3. **Settle timer guarded by current state** (`x.state === 'arriving'`). Eviction cancels the pending settle timer when it fires. No stuck timers, no zombie state flips after removal.
4. **Non-evicting count is the overflow trigger, not total count.** Evicting markers hold their array slot for 600ms; counting them against cap would stall further evictions under bursts.
5. **`bufferLimitRef.current` read inside events effect, NOT closed-over `bufferSize`.** PITFALL-01-safe — Phase 62 dropdown will work without SSE reconnect.
6. **Named + default export** — project convention is named-only, but plan requests both for Plan 61-03 import flexibility. Zero runtime cost.

## Deviations from Plan

None. Plan executed exactly as written. Code snippets embedded in the PLAN.md action blocks were transcribed verbatim; no substitutions, no renames, no reorderings. Verification scripts all passed on first run.

**Total deviations:** 0 code, 0 scope, 0 architectural.

## Issues Encountered

None. Each task's verification passed on first attempt; all three Vite builds completed cleanly in 9.12–9.44s; D-03 purity grep returned zero forbidden tokens; file is 178/200 lines (11% headroom).

## User Setup Required

None. No environment variables, no external service configuration, no package install. Pure React hook addition.

## Threat Surface Scan

No new network endpoints, no auth paths, no file access patterns, no schema changes. The hook is client-only state management consuming data already flowing through the frontend via useThreatStream (which owns the SSE + snapshot paths unchanged). Nothing to flag.

## Next Phase Readiness

- **Plan 61-03 (ThreatMapPage.jsx wiring):** READY. The hook's contract is fully implemented:
  - Import path: `import { useThreatMapBuffer } from '../hooks/useThreatMapBuffer'` (or default import).
  - Call site: `const { markers } = useThreatMapBuffer(events, 100);` immediately after `const { events, ... } = useThreatStream();` in ThreatMapPage.jsx.
  - Consumer effect: `useEffect(() => { /* diff markers against markerInstancesRef.current, add/update/remove L.markers per D-11 */ }, [markers])`.
  - `buildIcon(marker)` helper: use `marker.state` for the lifecycle class (`--arriving`/`--settled`/`--evicting`) and `marker.color` for the palette class (`--red`/`--amber`/`--violet`/`--cyan`). CSS families shipped by Plan 61-01 are ready to receive these.
- **Phase 62 (BufferSizeControl dropdown):** READY for the hook side. The `bufferLimitRef` + sync-effect pattern means Phase 62 only needs to:
  1. Change the ThreatMapPage call site from `useThreatMapBuffer(events, 100)` to `useThreatMapBuffer(events, bufferSize)` where `bufferSize` is a useState value.
  2. Wire the dropdown to `setBufferSize`.
  3. No SSE reconnect, no hook refactor, no re-entry into PLAN.md territory.

## Self-Check: PASSED

Automated verification:
- ✓ `frontend/src/hooks/useThreatMapBuffer.js` exists (178 lines, under 200 cap)
- ✓ Named export: `export function useThreatMapBuffer(...)` present
- ✓ Default export: `export default useThreatMapBuffer` present
- ✓ All 8 state-machine tokens present: `'arriving'`, `'settled'`, `'evicting'`, `1800`, `600`, `bufferLimitRef`, `firstHydrationRef`, `timersRef`
- ✓ D-03 purity: zero hits for `from 'leaflet'`, `from "leaflet"`, `L.divIcon`, `L.marker`, `document.`, `window.`
- ✓ Commit `ceba3dc` present in `git log` (Task 1 scaffold)
- ✓ Commit `db83218` present in `git log` (Task 2 state machine)
- ✓ `git diff --stat HEAD~2 HEAD` → exactly one file changed (`frontend/src/hooks/useThreatMapBuffer.js`)
- ✓ `useThreatStream.js` and `ThreatMapPage.jsx` untouched (D-17 invariant holds)
- ✓ `cd frontend && npm run build` completed in 9.12s with zero new warnings (only pre-existing chunk-size info)

---
*Phase: 61-frontend-threat-map-buffer-refactor*
*Plan: 02*
*Completed: 2026-04-20*
