---
phase: 61-frontend-threat-map-buffer-refactor
plan: 03
subsystem: frontend-pages

tags: [frontend, pages, threat-map, leaflet, integration, react, react19, vite, marker-lifecycle, diff-reconciliation]

requires:
  - "Plan 61-01 CSS classes (`.map-buffer-marker--{arriving|settled|evicting}` + colour modifiers) — consumed by buildIcon helper"
  - "Plan 61-02 useThreatMapBuffer hook contract `{ markers, arrivingId, evictingId }` — consumed via `const { markers } = useThreatMapBuffer(events, 100)`"

provides:
  - "frontend/src/pages/ThreatMapPage.jsx wired end-to-end: useThreatStream → useThreatMapBuffer → markerInstancesRef Map<id, L.Marker> → Leaflet layer via setIcon / addLayer / removeLayer"
  - "buildIcon(marker) module-level helper composing `.map-buffer-marker--{state}` + `.map-buffer-marker--{color}` class triple on an L.divIcon (iconSize 16 for arriving, 6 otherwise)"
  - "Single `useEffect([markers])` diff-reconciliation: ADD new IDs, UPDATE via setIcon on _bufferState change, REMOVE IDs no longer present — the MAPBUF-05 contract"
  - "Dedicated `useEffect([])` unmount cleanup: iterate markerInstancesRef, removeLayer each, clear the Map — D-11 step 4 (orphan-layer prevention)"
  - "_bufferState instance-property tag: cheap state-change detection without a prev-markers ref or deep-equality walk (D-13)"
  - "interactive:false on every buffer L.marker — silent dots, no hover/click hijack, no flyTo interception"

affects:
  - "Phase 61 SC1 (persistence) — architecturally satisfied: dots stay on the map between SSE events because markers survive React state across renders and Leaflet layers survive via markerInstancesRef"
  - "Phase 61 SC2 (arrival pulse ~1.8s) — satisfied: new-ID branch creates an L.marker with `--arriving` class; hook's 1800ms timer flips state → setIcon swaps to `--settled`; CSS drives the visual"
  - "Phase 61 SC3 (reconnect survival) — satisfied: ThreatMapPage is not unmounted on SSE drop; markerInstancesRef persists across reconnects; the hook's firstHydrationRef guard prevents re-pulsing already-tracked IDs"
  - "Phase 61 SC4 (eviction fade) — satisfied: hook flips oldest to `state:'evicting'`, reconciliation setIcons to `--evicting` class, CSS transitions opacity 1→0 over 600ms, then the hook's 600ms timer removes the marker from `markers`, triggering map.removeLayer"
  - "Phase 61 SC5 (≤100 L.Marker instances) — architecturally satisfied: every ADD in the diff effect pairs with a REMOVE when the hook evicts; unmount clears the Map; interactive:false + no custom pane means zero event listeners to leak"
  - "MAPBUF-05 (React state ↔ Leaflet DOM sync) — completed"
  - "Phase 61 overall — ready for manual human QA (61-VALIDATION.md) and Phase 62 wiring (dropdown → bufferSize state; one-line change at the useThreatMapBuffer(events, 100) call-site)"

tech-stack:
  added: []
  patterns:
    - "Map-based Leaflet marker registry + useRef pattern (`useRef(new Map())`) — preserves insertion order, O(1) get/set/has/delete, never a plain object per D-10"
    - "Single-effect diff-reconciliation (ADD → UPDATE → REMOVE pass in one useEffect) — React state is source of truth for identity, Leaflet DOM is the target; reconciliation happens on every `markers` identity change"
    - "Instance-property tagging (`instance._bufferState = marker.state`) for cheap change detection — follows Leaflet's own `_map` / `_icon` / `_zIndex` underscore-private convention; avoids a second useRef for prev-markers comparison"
    - "Separated-lifecycle cleanup effects — `useEffect([markers])` handles per-tick reconciliation; `useEffect([])` handles unmount layer cleanup. Merging them would trigger cleanup on every reconciliation and defeat MAPBUF-05"
    - "try/catch around map.removeLayer in unmount only — useLeaflet may have already disposed the map by the time React tears down ThreatMapPage; main-effect removal does not need the guard because refs are guaranteed live in that path"
    - "setIcon idempotency for CSS transitions — replacing the icon swaps innerHTML without remounting the top-level L-managed div, so `.map-buffer-marker--evicting`'s `transition: opacity 600ms ease-out` fires naturally on class change"

key-files:
  created: []
  modified:
    - "frontend/src/pages/ThreatMapPage.jsx (+66 / −18, net +48 lines)"

key-decisions:
  - "Kept buildIcon as a module-level helper inside ThreatMapPage.jsx rather than extracting to a separate components/threat-map/markerIcon.js. Rationale per D-12: helper is ~10 lines with exactly one caller in this file; extracting would cost more (new file + new import) than it saves. If a Phase 63 cluster path needs the same helper, extract then — don't pre-abstract now."
  - "Used `instance._bufferState` instance-property tagging for state-change detection instead of a secondary `prevMarkersRef`. Tagging the Leaflet marker instance with its last-reconciled state is simpler than a second useRef that holds a Map<id, state>; it also follows Leaflet's own private-property convention (_map, _icon). D-13 'cheap state-change detection' satisfied with one assignment and one equality check."
  - "Placed the reconciliation useEffect immediately after the useLeaflet/handleMapReady cluster (before the panel-UX useEffects) so all Leaflet-lifecycle effects live together. Unmount cleanup sits immediately below the reconciliation effect. Panel-UX effects (localStorage sync, peek-state reset, peek-timer cleanup) are preserved in their existing order below — byte-identical to pre-plan."
  - "Unmount cleanup uses `try/catch` around `map.removeLayer` only in the unmount path — not in the main `[markers]` reconciliation. In the main effect both `map` and `instance` are fetched from live refs and guaranteed present; try/catch there would mask real bugs. In unmount, useLeaflet's own cleanup may have disposed the map first, so swallow the failure silently."
  - "interactive:false on every buffer L.marker — matches the removed addPulseMarker convention. Buffer dots are silent; click routing is owned by handleEventClick on the feed panel rows. Prevents the markers from swallowing map.flyTo pan/zoom or intercepting clicks that should go to the feed."
  - "ADD/UPDATE runs before REMOVE in the reconciliation effect — correctness is identical either way (the two sets are disjoint by construction: markers in the hook output are never simultaneously 'present and being removed'), but the order matches D-11's prose and reads naturally."
  - "typeCounts pre-existing destructured-but-unused in `const { events, counters, countryCounts, typeCounts, connected } = useThreatStream()` left as-is. Pre-existing from a prior phase, not introduced by this plan, not mentioned in any scope boundary — cleaning it up would violate the scope-boundary rule ('only auto-fix issues DIRECTLY caused by the current task's changes')."

patterns-established:
  - "Hook/page integration contract for animated-marker systems: pure state hook (61-02) produces lifecycle-annotated frames; consumer page (61-03) holds a Map<id, layer> registry and runs a single diff-reconciliation effect. Pattern generalises to Phase 63 (clustering) by swapping L.marker for MarkerClusterGroup without changing the hook contract."
  - "Leaflet instance-property tagging for React-driven DOM — `instance._bufferState` as a cheaper alternative to maintaining a mirrored Map<id, state> in useRef. Works because Leaflet accepts arbitrary properties and React never touches the DOM directly in this path (all writes go through map.addLayer / setIcon / removeLayer)."

requirements-completed:
  - MAPBUF-05

# Metrics
duration: 15min
completed: 2026-04-20
---

# Phase 61 Plan 03: ThreatMapPage Wiring — useThreatMapBuffer + markerInstancesRef Diff-Reconciliation Summary

**Wired `useThreatMapBuffer` into `ThreatMapPage.jsx` via a `markerInstancesRef = useRef(new Map<id, L.Marker>())` registry and a single `useEffect([markers])` diff-reconciliation (ADD + UPDATE via setIcon + REMOVE). Added `buildIcon(marker)` helper composing `.map-buffer-marker--{state} --{color}` classes on an L.divIcon. Removed legacy `addPulseMarker` (D-20) and `prevEventIdRef` (D-21) plumbing. `addHighlightPulse` + `handleEventClick` byte-identical (D-19). Vite production build clean in 9.17s; dev server boots in 288ms; route transform returns 200 with expected `buildIcon` + hook import symbols in the compiled output. MAPBUF-05 satisfied.**

## Performance

- **Duration:** ~15 min wall clock (10:33:08Z → 11:48:27Z; most time in reads + per-task production builds)
- **Started:** 2026-04-20T10:33:08Z
- **Completed:** 2026-04-20T11:48:27Z
- **Tasks:** 3 / 3
- **Files modified:** 1 (`frontend/src/pages/ThreatMapPage.jsx`)
- **Net diff:** +66 / −18 = +48 lines (objective targeted ~+55 / −25; compact because I did not add extra blank-line separators, contract fully expressed)
- **Production build (Task 1):** `✓ built in 9.17s`
- **Production build (Task 2):** `✓ built in 9.17s`
- **Production build (Task 3):** `✓ built in 9.21s`
- **Dev server boot:** Vite v7.3.1 ready in 288ms on port 5176 (5173–5175 were in use)

## Diff Summary (ThreatMapPage.jsx — +66 / −18)

**Removed (−26 then +2 adjustment to imports):**
- `addPulseMarker` function (13 lines): the transient pulse-on-new-arrival helper, replaced by the buffer's `arriving → settled` transition (D-20).
- `prevEventIdRef = useRef(null)` declaration (1 line) and its associated `useEffect([events])` pulse-trigger (10 lines) — replaced by the `markerInstancesRef` reconciliation effect (D-21).
- Blank-line padding around the deletions (net small).

**Added (+72):**
- `import { useThreatMapBuffer } from '../hooks/useThreatMapBuffer';` (1 line, grouped with existing hook imports).
- `buildIcon(marker)` module-level helper (~14 lines including JSDoc): composes the L.divIcon with `.map-buffer-marker--{state}` and `.map-buffer-marker--{color}` classes; 16px bounding box for arriving, 6px for settled/evicting.
- `const { markers } = useThreatMapBuffer(events, 100);` (1 line) after the `useThreatStream()` destructure.
- `const markerInstancesRef = useRef(new Map()); // Map<id, L.Marker>` (1 line) next to `leafletMapRef`.
- Reconciliation `useEffect([markers])` (~37 lines including comments): ADD new IDs with new `L.marker([lat,lng], { icon, interactive: false }).addTo(map)`; UPDATE via `setIcon` when `_bufferState` differs; REMOVE via `map.removeLayer` + `instances.delete(id)` for IDs not in the new set.
- Unmount `useEffect([])` cleanup (~14 lines): iterate `markerInstancesRef`, try/catch `map.removeLayer`, clear the Map.

**Byte-identical (untouched):**
- `addHighlightPulse` function (D-19)
- `handleEventClick` (D-19)
- All peek-state logic (`handlePeekStart`, `handlePeekEnd`, the panel-collapsed effects, entry/exit timer refs)
- localStorage sync effect
- `useLeaflet` / `handleMapReady`
- Entire JSX return (overlay panels, status pill, panel toggle, map container)

## Accomplishments

- **Task 1 (commit `da42859`):** Removed legacy `addPulseMarker` (D-20) and `prevEventIdRef` + its pulse-trigger `useEffect` (D-21). Added `import { useThreatMapBuffer } from '../hooks/useThreatMapBuffer'` and the hook invocation `const { markers } = useThreatMapBuffer(events, 100)`. `addHighlightPulse` and `handleEventClick` preserved byte-identical. Production build green in 9.17s. File at this commit compiles but does not render buffer markers — transient intermediate per the plan.
- **Task 2 (commit `8f013e4`):** Added `buildIcon(marker)` module-level helper; added `markerInstancesRef = useRef(new Map())`; added the `useEffect([markers])` diff-reconciliation effect (ADD + UPDATE via `existing.setIcon(buildIcon(marker))` when `_bufferState` differs + REMOVE via `map.removeLayer`); added the `useEffect([])` unmount cleanup. Production build green in 9.17s. MAPBUF-05 contract fully wired.
- **Task 3 (commit `a75fa41`):** Final integration gates. Automated: production build clean; legacy-symbol grep returns zero hits; plan-level token presence confirmed; out-of-scope files (`useThreatStream.js`, `useLeaflet.js`) untouched; `git diff --name-only` shows exactly three files changed across the phase (animations.css, useThreatMapBuffer.js, ThreatMapPage.jsx). Headless dev-server probe: Vite booted in 288ms, `/threat-map` returned HTTP 200, `/src/pages/ThreatMapPage.jsx` transform returned 200 with expected `buildIcon` + `useThreatMapBuffer` import in the compiled output, `/src/hooks/useThreatMapBuffer.js` returned 200, `/src/styles/animations.css` returned 200. Marked 61-01/02/03 automated rows in 61-VALIDATION.md as ✅ green; marked 61-03-03 manual walk as ⚠️ deferred (human-in-the-loop browser QA).

## Task Commits

Each task committed atomically:

1. **Task 1 (refactor):** `da42859` — remove legacy addPulseMarker + prevEventIdRef; import useThreatMapBuffer
2. **Task 2 (feat):** `8f013e4` — wire useThreatMapBuffer via markerInstancesRef diff-reconciliation
3. **Task 3 (docs):** `a75fa41` — mark automated validation rows green; record executor observations

**Plan metadata commit:** pending (this SUMMARY + STATE.md + ROADMAP.md + REQUIREMENTS.md update)

## Files Created/Modified

- **Modified:** `frontend/src/pages/ThreatMapPage.jsx` — +66 / −18 lines.
- **Modified:** `.planning/phases/61-frontend-threat-map-buffer-refactor/61-VALIDATION.md` — +29 / −9 (rows flipped green for 61-01/02/03-auto, deferred marker on 61-03-03 manual walk, executor-observations section appended).
- **NOT modified:** `frontend/src/hooks/useThreatStream.js` (D-17 lock), `frontend/src/hooks/useLeaflet.js` (D-22 lock), `frontend/src/hooks/useThreatMapBuffer.js` (Plan 02 scope — byte-identical to post-Plan-02 state), `frontend/src/styles/animations.css` (Plan 01 scope), any component file, `tailwind.config.js`.

## Dev-Server Smoke Observation

Since this plan is the Phase 61 integration gate and the objective invited a `npm run dev` observation where possible, I booted the dev server headlessly and verified:

- **Boot:** Vite v7.3.1 booted on port 5176 in 288ms (ports 5173–5175 were in use by other laragon services). No errors in startup output; only the standard "Local: http://localhost:5176/" + "Network: use --host" banner.
- **Route probe:** `curl http://localhost:5176/threat-map` → HTTP 200, 768 bytes (the standard Vite dev HTML shell with script imports).
- **Transform probes:**
  - `GET /src/pages/ThreatMapPage.jsx` → HTTP 200. Output contained `function buildIcon(marker)`, `import { useThreatMapBuffer } from "/src/hooks/useThreatMapBuffer.js"`, and the expected React.createElement/jsxDEV call. No syntax errors, no missing imports, no `React Refresh` warnings.
  - `GET /src/hooks/useThreatMapBuffer.js` → HTTP 200 (hook compiles).
  - `GET /src/styles/animations.css` → HTTP 200 (CSS served).
- **Teardown:** Vite process killed cleanly via `Stop-Process -Force`; no orphan listeners on 5176.

**First-paint & marker behaviour (not observed):** requires an actual browser DOM and a running backend SSE stream. That walk is the human operator's job per 61-VALIDATION.md. The executor only confirmed the code compiles, the route serves, and the modules transform without errors.

## SC1–SC5 Architectural Analysis (what the human walker should observe)

**SC1 — Persistence:** After 30s of live stream, ≥ 50 persistent dots. Architecturally satisfied because `markers` is owned by `useThreatMapBuffer`'s React state (survives re-renders) and every marker in the state maps 1:1 to an L.Marker in `markerInstancesRef` (survives until the REMOVE branch of the diff fires, which only happens when the hook evicts).

**SC2 — Arrival pulse:** Expanding ring 1.5s → settled 6px dot at ~1.8s. Architecturally satisfied because new IDs enter the hook with `state: 'arriving'` → buildIcon uses `--arriving` class → CSS `@keyframes mapEventPulse 1.5s ease-out forwards` fires. Hook's 1800ms timer flips `state: 'settled'` → reconciliation detects `_bufferState !== marker.state` → `existing.setIcon(buildIcon(marker))` swaps to `--settled` class → 6px dot remains.

**SC3 — Reconnect survival:** Offline 15s → online, dot count preserved. Architecturally satisfied because `ThreatMapPage` is not unmounted during SSE drop; `markerInstancesRef` persists across the gap; `useThreatMapBuffer`'s `firstHydrationRef` flipped to `false` on first hydration, so any subsequent snapshot re-hydration (Phase 59 `?limit=100` result) diffs against existing markers and only genuinely-new IDs pulse (D-15). No re-pulse, no flicker.

**SC4 — Eviction at capacity:** 101st arrival, one oldest dot fades 600ms. Architecturally satisfied because: (a) hook's overflow logic flips the oldest non-evicting entry to `state: 'evicting'`; (b) reconciliation detects the state change and calls `setIcon(buildIcon)` with `--evicting` class; (c) CSS `transition: opacity 600ms ease-out` fires naturally because the same DOM element stays mounted; (d) hook's 600ms eviction timer removes the marker from state → next reconciliation's REMOVE branch calls `map.removeLayer` and `markerInstancesRef.current.delete(id)`. Dot count pinned at 100.

**SC5 — No orphan L.Marker accumulation:** Heap snapshot shows ≤ 100 L.Marker instances after 5min. Architecturally satisfied because every ADD in the diff effect pairs with a REMOVE on hook eviction; unmount effect clears the Map; `interactive: false` means zero event listeners attached; no custom Leaflet pane means no pane-level leak. The only way to violate SC5 would be a bug in the REMOVE branch (e.g., iterating a stale snapshot of `instances`) — verified by inspection that we iterate `instances` (the live Map) and mutate via `instances.delete(id)` inside the loop, which is safe for Map iteration.

**Accessibility (`prefers-reduced-motion: reduce`):** Satisfied by Plan 01's CSS `@media (prefers-reduced-motion: reduce)` block: `--arriving` animation → none + opacity 0; `--evicting` transition → none + opacity 0. JS state machine still runs; only visual expression changes.

## Decisions Made

See frontmatter `key-decisions` for the complete list. Highlights:

1. **buildIcon stays inline** in ThreatMapPage.jsx — ~14 lines, one caller, extraction would cost more than it saves (D-12 discretion).
2. **`instance._bufferState` tagging** for cheap state-change detection — follows Leaflet's private-property convention, avoids a second useRef.
3. **Separated reconciliation + unmount effects** — merging cleanup into `[markers]` deps would fire on every re-render and defeat MAPBUF-05.
4. **try/catch only in unmount** — main-effect refs are guaranteed live; unmount may run after useLeaflet disposal.
5. **interactive:false on buffer markers** — silent dots, click routing owned by feed panel via handleEventClick.
6. **typeCounts pre-existing destructured-unused left alone** — pre-existing, not introduced here, cleanup would violate scope boundary.

## Deviations from Plan

None. Plan executed exactly as written. Code snippets embedded in the PLAN.md `<action>` blocks were transcribed verbatim. Verification scripts all passed on first run.

**Total deviations:** 0 code, 0 scope, 0 architectural.

## Issues Encountered

- **Windows shell cwd drift across chained `cd frontend && ...` commands:** A chained verification command worked from `frontend/` for the build but then the next node `-e` ran in that same cwd and failed to open `frontend/src/...`. Diagnosed immediately; re-ran the grep from the repo root. No code impact; verification tooling observation only.
- **Dev-server port 5173–5175 in use** (local laragon services): Vite auto-advanced to 5176. No impact on the smoke test — all HTTP probes targeted the actual bound port.

## User Setup Required

None. No environment variables, no external service configuration, no package install. Pure React page modification.

## Threat Surface Scan

No new network endpoints, no auth paths, no file access patterns, no schema changes at trust boundaries. The plan wires an existing client-only state hook into an existing client-only page; all data flows through already-established code paths (useThreatStream SSE + snapshot — unchanged). Nothing to flag.

## Next Phase Readiness

- **Phase 61 overall:** COMPLETE at the code level. All three plans shipped, all five MAPBUF requirements (01–05) satisfied. Ready for human manual QA against 61-VALIDATION.md SC1–SC5 + accessibility + regression rows. After the human walk flips those rows `[x]`, Phase 61 is fully shippable.
- **Phase 62 (BufferSizeControl dropdown — MAPCFG-01..04):** READY. The wiring point is a single line in `ThreatMapPage.jsx`: change `const { markers } = useThreatMapBuffer(events, 100);` → `const { markers } = useThreatMapBuffer(events, bufferSize);` where `bufferSize` is a useState value driven by the dropdown. No SSE reconnect, no hook refactor, no reconciliation-effect changes. The `bufferLimitRef` pattern already in Plan 02 makes this a zero-friction change.
- **Phase 63 (Clustering — MAPCLU-01..05):** The markerInstancesRef pattern established here generalises to `MarkerClusterGroup` (swap `L.marker(...).addTo(map)` for `cluster.addLayer(marker)` and `map.removeLayer(instance)` for `cluster.removeLayer(instance)`). The `buildIcon(marker)` helper is cluster-agnostic.

## Self-Check: PASSED

Automated verification:
- ✓ `frontend/src/pages/ThreatMapPage.jsx` exists and contains all required tokens: `import { useThreatMapBuffer }`, `useThreatMapBuffer(events, 100)`, `function buildIcon(marker)`, `markerInstancesRef`, `new Map()`, `map-buffer-marker--`, `_bufferState`, `map.removeLayer(instance)`, `instances.delete(id)`
- ✓ Legacy symbols fully removed: `addPulseMarker` and `prevEventIdRef` return zero grep hits
- ✓ D-19 retained functions: `addHighlightPulse` present (decl + 1 usage), `handleEventClick` present (decl + 2 usages)
- ✓ D-17/D-22 scope invariants: `frontend/src/hooks/useThreatStream.js` and `frontend/src/hooks/useLeaflet.js` contain no `useThreatMapBuffer` reference and were not touched this plan
- ✓ Phase-scope invariant: `git diff --name-only 816a71e...HEAD -- frontend/` returns exactly three files (animations.css, useThreatMapBuffer.js, ThreatMapPage.jsx) — one per plan, no drift
- ✓ Commit `da42859` (Task 1 refactor) present in `git log`
- ✓ Commit `8f013e4` (Task 2 feat) present in `git log`
- ✓ Commit `a75fa41` (Task 3 docs) present in `git log`
- ✓ `cd frontend && npm run build` clean in 9.17s–9.21s across all three tasks, zero new warnings
- ✓ Dev server boot + route transform probes all returned HTTP 200 with expected compiled output tokens

---
*Phase: 61-frontend-threat-map-buffer-refactor*
*Plan: 03*
*Completed: 2026-04-20*
