# Phase 63: Frontend Marker Clustering - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning
**Mode:** autonomous (discuss-phase --auto; Claude's discretion throughout)

<domain>
## Phase Boundary

Frontend-only UI integration: install **`leaflet.markercluster@1.5.3`** (the only new v6.1 dependency, locked by ROADMAP "Key Architectural Notes") and wrap the persistent buffer markers in a conditionally-enabled `L.markerClusterGroup` when `bufferSize > 500`. When the threshold is crossed in either direction (≤500 ↔ >500), swap the active marker layer cleanly via a single `markerGroupRef` (PITFALL-06 mitigation), transfer existing buffer markers into the new layer without re-creating DOM, and style cluster bubbles with the project's dark glassmorphism theme via a custom `iconCreateFunction`.

This phase rides on top of **Phase 61's** `markerInstancesRef` diff-reconciliation (D-05/D-13/D-14 of 61-CONTEXT.md) and **Phase 62's** `bufferSize` dropdown state (MAPCFG-01..04). Phase 61 wrote `L.marker(...).addTo(map)` directly — Phase 63 changes that write target from `map` to `markerGroupRef.current` and teaches the reconciliation effect that the "layer container" is mutable across bufferSize threshold transitions.

**In scope (MAPCLU-01..05):**
1. Install `leaflet.markercluster@1.5.3` as a `dependencies` entry in `frontend/package.json` (exact version lock — roadmap).
2. Import `MarkerCluster.css` **only** (skip `MarkerCluster.Default.css` — the custom `iconCreateFunction` replaces the default cluster icon, so the default CSS is dead weight and conflicts with PITFALL-05 CSS concerns).
3. Add `leaflet.markercluster` JS import in `ThreatMapPage.jsx` (side-effect import — attaches `L.markerClusterGroup` to the global `L` namespace).
4. Add `CLUSTER_THRESHOLD = 500` module-level constant in `ThreatMapPage.jsx` (or a shared constants module — planner's discretion between D-23 below).
5. New `markerGroupRef = useRef(null)` in `ThreatMapPage.jsx` — single source of truth for the active marker container (either a `L.layerGroup`/direct-to-map stand-in, or a `L.markerClusterGroup`).
6. New `activeLayerModeRef = useRef('plain')` in `ThreatMapPage.jsx` — tracks current mode (`'plain'` or `'cluster'`) so the layer-swap effect knows when a threshold crossing has happened.
7. New `useEffect([bufferSize])` in `ThreatMapPage.jsx` — checks `bufferSize > CLUSTER_THRESHOLD` vs current mode. On mismatch → layer swap sequence (see D-08 below).
8. Modify the existing reconciliation `useEffect([markers])` in `ThreatMapPage.jsx` to call `markerGroupRef.current.addLayer(instance)` instead of `instance.addTo(map)`. Similarly `.removeLayer(instance)` on `markerGroupRef.current` for eviction.
9. New `buildClusterIcon(cluster)` helper (or inlined into the `markerClusterGroup` options) — returns a `L.divIcon` with `className: ''`, `html: '<div class="map-cluster-icon">{count}</div>'`, `iconSize: [32, 32]`.
10. Append new CSS class `.map-cluster-icon` to `frontend/src/styles/components.css` — dark glassmorphism bubble matching the project design system (violet/cyan accent, `bg-surface/80`, `border border-border`, `backdrop-blur-sm`, numeric text in `font-mono`).
11. Cluster group options (MAPCLU-02/04/05):
    - `iconCreateFunction: buildClusterIcon` (MAPCLU-01 dark theme).
    - `showCoverageOnHover: false` (simplicity; project has no coverage-polygon design language).
    - `chunkedLoading: true` (MAPCLU-04 — spreads initial marker addition across frames, keeping the tab responsive at 1000–2000 markers).
    - `zoomToBoundsOnClick: true` (MAPCLU-02 — default behaviour; listed explicitly so the planner doesn't strip it).
    - `zIndexOffset: -100` (PITFALL-07 — keeps cluster icons below z-[1000] overlay panels).
    - `spiderfyOnMaxZoom: true` (default; explicit for clarity — at max zoom, nearby markers fan out instead of permanently clustering).
12. Cluster click handler: `markerGroupRef.current.on('clusterclick', (e) => e.originalEvent && L.DomEvent.stopPropagation(e.originalEvent))` — PITFALL-08 mitigation. Attach once per group creation; detach implicitly on group removal.
13. Threshold-crossing layer-swap effect (MAPCLU-03) follows the **re-init strategy** from research ARCHITECTURE.md §3: remove every `L.Marker` instance from the old container via `markerGroupRef.current.removeLayer(instance)` (or fall through when there's no prior group), call `map.removeLayer(markerGroupRef.current)` if it was a cluster group, create the new container, call `map.addLayer(newGroup)` (cluster mode) or leave markers to re-add directly to the map (plain mode), then iterate `markerInstancesRef` and call `newGroup.addLayer(instance)` for each. No marker DOM is recreated — only the container is swapped.
14. Graceful handling of the plain-mode pseudo-container: in plain mode, `markerGroupRef.current` is set to a `L.layerGroup()` that's added to the map (instead of going direct-to-map). This uniformises the add/remove API across modes (`markerGroupRef.current.addLayer(instance)` works the same way whether it's a cluster group or a plain layer group). Avoids an `if/else` branch in the reconciliation effect on every render.

**Out of scope for Phase 63 (explicitly deferred):**
- Custom cluster colour coding (e.g., red if ≥10 red children, violet if mixed) → not in MAPCLU-01 rubric. The cluster icon renders a count in a neutral glassmorphism style. Phase 66 may audit.
- Spiderfy animation tuning → default Leaflet behaviour is fine; no design call-out in the roadmap.
- Cluster hover tooltip showing attack types → not spec'd. `showCoverageOnHover: false` disables the polygon overlay; we don't add a replacement.
- Backend snapshot `?limit=` frontend wiring → still deferred from Phase 62. Phase 66 may pick this up when integration polishing — for now, Phase 63 works with Phase 61's snapshot-fill-via-SSE behaviour.
- Modifying `useThreatMapBuffer.js` → untouched. The hook already emits the correct markers array regardless of buffer size; clustering is a render-layer concern, not a state-layer concern.
- Modifying `useThreatStream.js` → v6.1 lock (PITFALL-01, Phase 61 D-17). The SSE effect has no cluster awareness.
- Modifying `useLeaflet.js` → minor CSS import only if planner chooses that route (see D-16 below). The map-init behaviour stays identical.
- Victimology tab (Phase 64), Campaigns pill (Phase 65), E2E integration audit (Phase 66).
- Any test-framework installation → Phase 61/62 precedent: manual QA via `63-VALIDATION.md`.

</domain>

<decisions>
## Implementation Decisions

All decisions are **locked in autonomous mode**. Downstream agents (researcher, planner, executor) treat these as non-negotiable unless a verified code-level finding contradicts them — in which case surface the conflict in `63-RESEARCH.md` rather than silently diverging.

### Dependency + Imports

- **D-01:** Install `leaflet.markercluster@1.5.3` exactly — the version is locked by ROADMAP.md "Key Architectural Notes" ("`leaflet.markercluster@1.5.3` installed in Phase 63 only"). Use `npm install leaflet.markercluster@1.5.3 --save` so the `package.json` entry lands at `"leaflet.markercluster": "^1.5.3"` (caret range within the locked minor is acceptable — 1.5.x only; no 1.6+ drift in this milestone). The `package-lock.json` update is committed with the install.
- **D-02:** Import `leaflet.markercluster/dist/MarkerCluster.css` **once** in `ThreatMapPage.jsx` (or `useLeaflet.js` — see D-16). Do NOT import `MarkerCluster.Default.css` — the roadmap locks this ("import MarkerCluster.css only, skip MarkerCluster.Default.css") because we replace the default icon via `iconCreateFunction` and the default CSS carries `.marker-cluster-small/medium/large` classes that would conflict with our custom `.map-cluster-icon` without adding value.
- **D-03:** Import `'leaflet.markercluster'` as a bare side-effect import (no named bindings) in `ThreatMapPage.jsx`. It attaches `L.markerClusterGroup` + `L.MarkerClusterGroup` to the already-imported `L` namespace from `leaflet`. The import must run BEFORE any call to `L.markerClusterGroup()` — keep it alongside the existing `import L from 'leaflet'` at the top of the file to keep execution order obvious.
- **D-04:** No new transitive dependencies are acceptable. `leaflet.markercluster@1.5.3` has zero runtime deps (peer deps on `leaflet@>=1.3.1` — already satisfied by `leaflet@^1.9.4`). The planner/executor verifies this via `npm ls leaflet.markercluster` post-install.

### Threshold + Constants

- **D-05:** `CLUSTER_THRESHOLD = 500` — declared as a module-level constant in `ThreatMapPage.jsx` (alongside `STORAGE_KEY = 'aqua-tip:panels-collapsed'` on line 43). Rationale: the roadmap locks `> 500` as the cluster trigger in MAPCLU-01 success criteria and phase 62's CONTEXT.md D-04 already anticipated a future `CLUSTER_THRESHOLD` constant. A named constant protects against the drift seen between Phase 61 D-17 (hardcoded 100) and Phase 62 D-17 (promoted to `DEFAULT_BUFFER_SIZE`).
- **D-06:** Comparison is strict `>`, not `>=`. At `bufferSize === 500`, clustering is OFF. Reason: the roadmap ("buffer set to 1000 and 200+ markers on screen, nearby markers merge") and SC3 ("Changing the dropdown from 1000 back to 100") both use examples strictly above or strictly below 500 — the 500 itself is the safe dividing line where the map is still legible without clustering. Makes the manual QA unambiguous: toggling 100 ↔ 500 does NOT swap layers; toggling 500 ↔ 1000 DOES.
- **D-07:** The threshold constant is NOT exported from `BufferSizeControl.jsx`. Phase 62 CONTEXT.md Claude's Discretion explicitly punted this: "If Phase 63 needs the 500 threshold as a named constant, Phase 63 introduces its own `CLUSTER_THRESHOLD = 500`". Phase 63 honours that — adds a local constant in `ThreatMapPage.jsx`. If Phase 66's integration pass finds two consumers, promote to `constants/threat-map.js` then, not now.

### Layer Swap Architecture (single markerGroupRef)

- **D-08:** **Single `markerGroupRef = useRef(null)`** in `ThreatMapPage.jsx`. This is the PITFALL-06 mitigation — never keep two simultaneous marker containers on the map. `markerGroupRef.current` is either:
    - A `L.layerGroup()` added to the map (plain mode, `bufferSize <= 500`), OR
    - A `L.markerClusterGroup(options)` added to the map (cluster mode, `bufferSize > 500`).
  Initialised lazily: on first reconciliation after map is ready, create the appropriate group based on the INITIAL `bufferSize` (it may already be 1000 or 2000 from `localStorage` — do NOT assume plain-mode on mount).
- **D-09:** **`activeLayerModeRef = useRef(null)`** — tracks `'plain'` | `'cluster'` | `null` (the `null` sentinel means "not yet initialised"). The layer-swap effect `useEffect([bufferSize])` compares the desired mode (derived from `bufferSize > CLUSTER_THRESHOLD`) against `activeLayerModeRef.current` and only swaps on mismatch. This avoids a no-op swap when the user bounces between 1000 and 2000 (both cluster mode — no re-init needed, the marker group stays put).
- **D-10:** **Layer-swap sequence (MAPCLU-03 "no double-render" contract):**
  ```
  desired = bufferSize > CLUSTER_THRESHOLD ? 'cluster' : 'plain'
  if desired === activeLayerModeRef.current: return  // no-op
  
  // 1. Detach listeners on old group (if it was a cluster group)
  if oldGroup && oldGroup.off: oldGroup.off('clusterclick')
  
  // 2. Remove every tracked marker instance from the old group.
  //    This does NOT re-create marker DOM — L.Marker detaches from parent and keeps its icon/latlng/options.
  for instance of markerInstancesRef.current.values():
    oldGroup?.removeLayer(instance)
  
  // 3. Remove the old group from the map (if it existed).
  if oldGroup: map.removeLayer(oldGroup)
  
  // 4. Create the new group.
  const newGroup = desired === 'cluster'
    ? L.markerClusterGroup({ ...clusterOptions })
    : L.layerGroup()
  
  // 5. Attach cluster listeners if cluster mode.
  if desired === 'cluster':
    newGroup.on('clusterclick', (e) => { if (e.originalEvent) L.DomEvent.stopPropagation(e.originalEvent); })
  
  // 6. Add the new group to the map.
  map.addLayer(newGroup)
  
  // 7. Re-add every tracked marker instance to the new group.
  for instance of markerInstancesRef.current.values():
    newGroup.addLayer(instance)
  
  // 8. Swap refs.
  markerGroupRef.current = newGroup
  activeLayerModeRef.current = desired
  ```
- **D-11:** The existing **reconciliation effect** `useEffect([markers])` at `ThreatMapPage.jsx:82-117` is modified in place (not replaced):
    - Instead of `L.marker(...).addTo(map)` → `L.marker(...)` then `markerGroupRef.current.addLayer(instance)` (lazy-create the group on first reconciliation if `markerGroupRef.current` is null; see D-12).
    - Instead of `map.removeLayer(instance)` in the eviction branch → `markerGroupRef.current.removeLayer(instance)`.
    - The `instance._bufferState` tagging stays untouched — it's state-change detection, orthogonal to clustering.
- **D-12:** **Lazy initial group creation:** at the top of the `[markers]` effect, if `markerGroupRef.current == null`, derive the initial mode from current `bufferSize` and run the swap sequence (D-10 steps 4–8 — there's no oldGroup to remove). This keeps the layer-swap logic in ONE place. The `[bufferSize]` effect simply triggers step 10 re-reconciliation; the `[markers]` effect handles both new markers AND first-mount initialisation.
- **D-13:** **Unmount cleanup** — the existing unmount `useEffect(() => () => ..., [])` at `ThreatMapPage.jsx:121-132` is extended to also call `map.removeLayer(markerGroupRef.current)` AFTER the per-instance loop. Wrap in try/catch — on SPA route change, `useLeaflet` may have already disposed the map. Reset `markerGroupRef.current = null` and `activeLayerModeRef.current = null` inside the cleanup.

### Cluster Icon Styling (MAPCLU-01 dark theme)

- **D-14:** **`iconCreateFunction`** factored as a `buildClusterIcon(cluster)` helper at module scope in `ThreatMapPage.jsx` (NOT inlined into `clusterOptions`) — mirrors the Phase 61 `buildIcon(marker)` helper pattern at `ThreatMapPage.jsx:17-27`. Keeps the options object readable.
  ```
  function buildClusterIcon(cluster) {
    const count = cluster.getChildCount();
    return L.divIcon({
      className: '',
      html: `<div class="map-cluster-icon">${count}</div>`,
      iconSize: [32, 32],
    });
  }
  ```
  The `className: ''` override is load-bearing: Leaflet defaults to `leaflet-marker-icon` which carries absolute positioning at the DOM level — we want our custom `.map-cluster-icon` to own the visual layout. Matches Phase 61 D-11's buildIcon pattern exactly.
- **D-15:** **`.map-cluster-icon` CSS** lives in `frontend/src/styles/components.css` next to the existing `.map-marker` block (line 242) — NOT in `animations.css` (which is reserved for the buffer-marker lifecycle states per Phase 61). Spec:
    - `width: 32px; height: 32px;` (matches `iconSize`)
    - `display: flex; align-items: center; justify-content: center;` (centre the numeric label)
    - `background: rgba(15, 17, 23, 0.8);` (matches `surface #0F1117` at 80% α — mirrors `.glass-card-static` glass surface)
    - `backdrop-filter: blur(8px);` (glassmorphism parity with `.glass-card-static`)
    - `border: 1px solid rgba(30, 32, 48, 0.8);` (`border #1E2030` at 80% α)
    - `border-radius: 50%;` (circular bubble — spec'd by research §"Cluster Styling")
    - `font-family: 'JetBrains Mono', monospace;` (numeric consistency — matches counters sub-label)
    - `font-size: 12px; font-weight: 600;`
    - `color: #E8EAED;` (`text-primary`)
    - `box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);` (subtle lift over the dark tile layer)
    - `cursor: pointer;` (affordance — cluster is clickable per MAPCLU-02)
  NO transitions, NO animations — this is a static display element. Leaflet's internal spiderfy animation handles cluster-open transitions at the layer level.
- **D-16:** **Where to import `MarkerCluster.css`:** TWO options, planner picks:
    - **Option A (preferred):** alongside the JS side-effect import at the top of `ThreatMapPage.jsx` — `import 'leaflet.markercluster/dist/MarkerCluster.css';` right after the JS import. Keeps cluster-related imports co-located with the page that uses them.
    - **Option B:** at the top of `useLeaflet.js` next to the existing `import 'leaflet/dist/leaflet.css';` line — groups all Leaflet-family CSS. The concern: `useLeaflet` is used ONLY by `ThreatMapPage`, but conceptually the CSS is a Leaflet concern.
  Recommendation is A because `ThreatMapPage.jsx` is the only consumer and this matches the file-scoped concerns pattern already established. Planner's final call in PLAN.md.
- **D-17:** **No DOM-level cluster CSS override attempts.** Leaflet's internal `.leaflet-cluster-anim` / `.leaflet-markercluster-icon` CSS classes are NOT added to `components.css` — they only appear when using `MarkerCluster.Default.css` (which we don't import). Our custom `iconCreateFunction` + `.map-cluster-icon` replaces them entirely. PITFALL-05 avoidance: no CSS conflicts by construction because the conflicting defaults are not loaded.

### Cluster Group Options Contract

- **D-18:** Explicit options object passed to `L.markerClusterGroup({...})`:
  ```
  {
    iconCreateFunction: buildClusterIcon,     // D-14 (MAPCLU-01)
    showCoverageOnHover: false,               // D-19 (no coverage polygon)
    chunkedLoading: true,                     // D-20 (MAPCLU-04 responsiveness)
    chunkProgress: null,                      // D-20 (disable default progress callback)
    zoomToBoundsOnClick: true,                // D-21 (MAPCLU-02 default, explicit)
    spiderfyOnMaxZoom: true,                  // default, explicit for clarity
    zIndexOffset: -100,                       // D-22 (PITFALL-07 — below z-1000 panels)
    disableClusteringAtZoom: undefined,       // default behaviour — cluster everywhere
    removeOutsideVisibleBounds: true,         // default — purge off-screen clusters
    animate: true,                            // default — smooth spiderfy
  }
  ```
  The `null`/`undefined` entries are listed so the planner doesn't accidentally set them to something non-default.
- **D-19:** **`showCoverageOnHover: false`** — no polygon overlay on cluster hover. Rationale: the project has no coverage-polygon design language, the default polygon uses Leaflet's generic blue which would clash with the violet/cyan accent palette, and hover-only UX is poor on mobile/touch devices. Clusters are visibly numeric; users click to explore, they don't hover to read.
- **D-20:** **`chunkedLoading: true, chunkProgress: null`** — MAPCLU-04 contract ("Loading 1000+ markers does not freeze the browser tab"). Leaflet chunks the initial batch add across requestAnimationFrame ticks. `chunkProgress: null` disables the default progress callback (which logs to console in some builds — noisy). `chunkInterval: 200` (default ms budget per chunk) is left untouched; tuning is premature without perf evidence.
- **D-21:** **`zoomToBoundsOnClick: true`** — the default. Explicit to prevent silent behavioural regression if Leaflet changes its default in a future minor. MAPCLU-02 ("Clicking a cluster zooms the map to show all child markers") is satisfied by this flag plus the library's built-in `clusterclick` → `zoomToBounds` routing.
- **D-22:** **`zIndexOffset: -100`** — PITFALL-07 mitigation. The overlay panels sit at `z-[1000]`; Leaflet's default `.leaflet-marker-pane` is `z-600`. Cluster icons default to `z-600 + 0 = 600`. Our markers at `-100` offset land at `z-500` — still above the tile layer (z-400) but solidly below the panels. MAPCLU-05 ("Cluster bubbles appear below the glassmorphism overlay panels in z-index") is satisfied.

### Click Propagation (PITFALL-08)

- **D-23:** **`clusterclick` handler** attached to the cluster group at creation time:
  ```
  newGroup.on('clusterclick', (e) => {
    if (e.originalEvent) L.DomEvent.stopPropagation(e.originalEvent);
  });
  ```
  The `L.DomEvent.stopPropagation` wrapper is the Leaflet-idiomatic way to halt DOM propagation without invoking React's synthetic-event path. Rationale: without this, clicking a cluster also fires `map.click` which the existing `handleEventClick` (currently only wired to feed-panel rows) doesn't touch — but if a future phase adds a map click handler for IOC drill-down, this handler is a no-op guard. Cheap insurance against PITFALL-08 (documented in research).
- **D-24:** **Individual marker click isolation** — not needed in Phase 63 because Phase 61 D-18 established `interactive: false` on every buffer `L.marker` (see `ThreatMapPage.jsx:96`). Clicks on individual markers are already silenced. Clusters alone are interactive, which is the correct MAPCLU-02 contract.

### State Flow + No-Reconnect Proof Chain (MAPCLU-03)

- **D-25:** The layer swap triggered by `bufferSize` threshold crossings does NOT affect SSE subscription. Verification chain:
    1. `useThreatStream()` is called once per mount with no arguments — its internal `EventSource` effect has `[]` deps (v6.1 hook lock, Phase 61 D-17). No `bufferSize` awareness whatsoever.
    2. `useThreatMapBuffer(events, bufferSize)` reads `bufferSize` via `bufferLimitRef.current` in its eviction math (Phase 61 D-16). Phase 63 doesn't modify this hook.
    3. The Phase 63 `useEffect([bufferSize])` runs the layer swap in `ThreatMapPage.jsx` — touches Leaflet refs only, never state. No re-render, no SSE churn.
    4. The `useEffect([markers])` reconciliation still runs on every marker change — but now calls `markerGroupRef.current.addLayer(instance)` instead of `instance.addTo(map)`. The call is synchronous, non-re-render, non-re-subscribing.
  Result: toggling the dropdown past 500 updates the visible layer on the next render; the SSE stream is untouched. MAPCLU-03 ("Changing the dropdown from 1000 back to 100 removes the cluster layer and reverts to individual markers — no marker is rendered twice, no blank map") is satisfied architecturally.
- **D-26:** **Marker-count conservation across swaps:** the layer-swap sequence iterates `markerInstancesRef.current` (the Phase 61 single-source-of-truth `Map<id, L.Marker>`). After swap: every instance in the Map is attached to exactly one layer container (the new one). None orphaned, none double-attached. The buffer hook's `markers` state doesn't change during the swap — a cluster-mode-ON swap doesn't trigger eviction.

### Package Commit + Lockfile

- **D-27:** `package-lock.json` is already an untracked file at the project root (per `git status`). After `npm install leaflet.markercluster@1.5.3 --save`, both `frontend/package.json` AND `frontend/package-lock.json` change — commit both in the dependency-install plan task. Do NOT introduce `npm ci` in this phase (would require the `package-lock.json` to be checked in before ever being committed). Phase 63 simply: install, stage both files, commit.
- **D-28:** The install is a dedicated plan task (first wave) — `npm install leaflet.markercluster@1.5.3 --save` in `frontend/` — because it blocks every subsequent code edit that imports the library. Verify post-install via `grep -q '"leaflet.markercluster": "\^1\.5\.' frontend/package.json && test -d frontend/node_modules/leaflet.markercluster` before proceeding.

### Test Strategy

- **D-29:** **No new test framework** (Phase 61/62 precedent). Phase 63 verifies SC1–SC5 via **manual QA checklist** in `63-VALIDATION.md`, same format as Phases 61/62. Sample rows:
    - **SC1:** Set `localStorage.setItem('aqua-tip:threat-map-buffer-size', '"1000"')`, reload, observe 200+ markers → nearby clusters show numeric count in dark bubble, no white default icons.
    - **SC2:** Click a cluster → map zooms to child bounds, cluster splits or spiderfies.
    - **SC3:** Toggle dropdown: 1000 → 100 → 1000. Inspect DOM: only ONE `.leaflet-marker-pane` child count discrepancy should resolve on each swap (no ghost layer).
    - **SC4:** Set buffer to 2000, keep tab open 60s → Chrome Performance tab shows no frame drops below 40fps during initial burst load.
    - **SC5:** DevTools Elements → find an `.map-cluster-icon` → check computed style `z-index`. Should be < 1000 (the overlay panel z-index). Left panel hover shows panel above cluster.
- **D-30:** **No Leaflet unit-level tests** — Leaflet + leaflet.markercluster are DOM-dependent; unit-testing would require jsdom + Leaflet instance, which has no precedent in the codebase. Behavioural verification at the SPA level (manual QA) is the contract.

### React 19 / Vite 7 Conventions

- **D-31:** **No TypeScript** (CLAUDE.md constraint). The new helpers are plain JS. JSDoc annotations are optional but helpful on `buildClusterIcon` — the Leaflet `cluster` argument is a `L.MarkerCluster` with a `.getChildCount()` method.
- **D-32:** **No new hooks.** The clustering logic is fully contained in `ThreatMapPage.jsx` via refs and two effects. A `useCluster` custom hook would violate the "zero premature abstraction" rule (single consumer in Phase 63; Phase 66 may evaluate if integration makes patterns obvious).
- **D-33:** **Vite 7 build check** — the new `import 'leaflet.markercluster/dist/MarkerCluster.css'` must not break `vite build`. Vite handles CSS imports from `node_modules` via its built-in handler; no config change expected. Verify with `cd frontend && npm run build` — any non-clean output is a blocker.

### Claude's Discretion

The following implementation details are NOT locked. Downstream planner/executor picks the cleanest option consistent with project conventions:

- Whether `buildClusterIcon` lives at module scope in `ThreatMapPage.jsx` (preferred for locality with `buildIcon`) or extracts to `components/threat-map/clusterIcon.js` (preferred only if Phase 66's E2E audit surfaces another consumer). Default: module-scope in `ThreatMapPage.jsx`, per D-14.
- Whether the CSS import goes in `ThreatMapPage.jsx` (D-16 Option A, recommended) or `useLeaflet.js` (D-16 Option B). Either acceptable; planner picks.
- Whether to extract the cluster options object to a `const CLUSTER_OPTIONS = { ... }` module constant or inline it at the `L.markerClusterGroup(...)` call site. If the layer-swap helper is factored as a function (see below), a module constant is cleaner.
- Whether the layer-swap sequence (D-10) is factored into a `swapMarkerGroup(map, nextMode, instancesMap)` helper function or inlined into the `useEffect([bufferSize])` body. Factoring is preferred for readability since the sequence is ~8 steps, but inline is acceptable for a single-phase one-shot. Planner's call.
- Whether the plain-mode container is `L.layerGroup()` (D-14 default, uniform API) or direct-to-map (Phase 61 current behaviour — would keep `instance.addTo(map)` as the plain-mode path). Using `L.layerGroup()` in both modes is recommended because the reconciliation effect then has ONE code path (`markerGroupRef.current.addLayer(instance)`), not a conditional; this matches D-14 intent.
- Whether to run an end-to-end verification via `npm run build` and confirm Vite bundle analyzer shows leaflet.markercluster is code-split correctly (default Vite behaviour) or left untested. Recommended: run `npm run build` and verify no warnings about duplicate Leaflet — if CSS deduping is working, only `leaflet/dist/leaflet.css` and `leaflet.markercluster/dist/MarkerCluster.css` should appear.

### Folded Todos

None — no pending todos in `.planning/todo` intersect with this phase's scope. The Phase 63 work is fully specified by MAPCLU-01..05.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap + Requirements
- `.planning/ROADMAP.md` §"Phase 63: Frontend Marker Clustering" — Goal + SC1–SC5.
- `.planning/ROADMAP.md` §"Key Architectural Notes" — `leaflet.markercluster@1.5.3` version lock; PITFALL-06 (cluster layer swap via single markerGroupRef); `MarkerCluster.css` only (skip `MarkerCluster.Default.css`).
- `.planning/REQUIREMENTS.md` §"Map Clustering (MAPCLU)" — MAPCLU-01 through MAPCLU-05 (plain-language acceptance criteria).
- `.planning/PROJECT.md` §"Constraints" — No TypeScript, React 19 + Vite 7 stack, one new dep allowed per v6.1 (used here — after this, the zero-new-deps rule resumes for Phases 64/65/66).

### v6.1 Research (authoritative)
- `.planning/research/ARCHITECTURE.md` §2.2 "Eviction Strategy with Clustering" — leaflet.markercluster handles `removeLayer` cleanly; 600ms fade prevents visible pop during cluster recompute.
- `.planning/research/ARCHITECTURE.md` §3 "Cluster Integration" — conditional-enable, layer-swap re-init strategy, `iconCreateFunction` override, import targets.
- `.planning/research/FEATURES.md` §"Standard UX (Leaflet.markercluster defaults)" — user-expected behaviour for click-to-zoom, spiderfy at max zoom.
- `.planning/research/PITFALLS.md` §PITFALL-05 — MarkerClusterGroup breaks custom divIcon pulse CSS; mitigated by NOT adding `addPulseMarker` temporaries to the cluster group (we don't — highlight pulse is added direct-to-map at `ThreatMapPage.jsx:37`) and by using custom `iconCreateFunction` instead of default CSS (D-02, D-14, D-17).
- `.planning/research/PITFALLS.md` §PITFALL-06 — Toggling cluster on/off leaks the old layer. Mitigation = single `markerGroupRef` (D-08, D-10).
- `.planning/research/PITFALLS.md` §PITFALL-07 — Z-index conflict between cluster popups and overlay panels. Mitigation = `zIndexOffset: -100` (D-22).
- `.planning/research/PITFALLS.md` §PITFALL-08 — `clusterclick` fires map click. Mitigation = `L.DomEvent.stopPropagation` in the handler (D-23).
- `.planning/research/STACK.md` — Leaflet 1.9.4, React 19, Tailwind 3, no UI framework beyond custom components. Dark theme tokens for `.map-cluster-icon` CSS.

### Prior Phase Context (direct handoff — READ IN FULL)
- `.planning/phases/61-frontend-threat-map-buffer-refactor/61-CONTEXT.md` — **D-05 `markerInstancesRef` Map pattern**, **D-11 reconciliation effect**, **D-13 `instance._bufferState` tagging**, **D-18 `interactive: false` silence**. Phase 63 modifies the write target of that reconciliation from `map` → `markerGroupRef.current`, but the Map-of-instances contract is unchanged.
- `.planning/phases/61-frontend-threat-map-buffer-refactor/61-UI-SPEC.md` — UI-SPEC structural template (Design System, Spacing, Typography, Color, Copy, Acceptance Cues, Registry Safety, Checker Sign-Off). Phase 63's UI-SPEC mirrors this structure for the cluster icon + cluster popup z-index rules.
- `.planning/phases/61-frontend-threat-map-buffer-refactor/61-03-SUMMARY.md` — Phase 61 wiring summary: establishes `markerInstancesRef.current.set(marker.id, instance)` as the write path. Phase 63 writes the same instance into `markerGroupRef.current.addLayer(instance)` instead of `instance.addTo(map)`.
- `.planning/phases/62-frontend-buffer-size-dropdown/62-CONTEXT.md` — **D-04 `BUFFER_SIZE_OPTIONS`** (100/500/1000/2000 canonical whitelist), **D-22 call-site `useThreatMapBuffer(events, bufferSize)`** (Phase 63 doesn't touch this), **D-24 `useThreatStream.js` not modified** (v6.1 hook lock still in force for Phase 63), **D-25 no-reconnect proof chain** (extended by Phase 63 D-25).
- `.planning/phases/62-frontend-buffer-size-dropdown/62-UI-SPEC.md` — UI-SPEC template for small-feature visual contracts. Phase 63 UI-SPEC slot: cluster icon card (32×32 bubble), cluster popup z-stack.
- `.planning/phases/62-frontend-buffer-size-dropdown/62-02-SUMMARY.md` — Phase 62 wiring summary: `bufferSize` state in `ThreatMapPage.jsx:47`, propagated to `useThreatMapBuffer(events, bufferSize)` at line 48. Phase 63 adds a SIBLING `useEffect([bufferSize])` reading the SAME state.

### Frontend Code (existing patterns to mirror / integration points)
- `frontend/src/pages/ThreatMapPage.jsx` — the single page this phase modifies. Lines 1-11 (imports — add `leaflet.markercluster` + CSS), line 43 (constants — add `CLUSTER_THRESHOLD`), line 47 (state — no change), lines 66-77 (refs — add `markerGroupRef` + `activeLayerModeRef`), lines 82-117 (reconciliation effect — change `addTo(map)` to `markerGroupRef.current.addLayer(instance)`), lines 121-132 (unmount cleanup — extend to remove markerGroupRef). New effect: `useEffect([bufferSize])` for layer swap, inserted after the existing `useEffect([markers])` unmount effect.
- `frontend/src/components/threat-map/BufferSizeControl.jsx` — **not modified** in Phase 63. Exports `BUFFER_SIZE_OPTIONS` as canonical whitelist but Phase 63 adds its OWN `CLUSTER_THRESHOLD = 500` per D-07.
- `frontend/src/components/threat-map/LeftOverlayPanel.jsx` — **not modified** in Phase 63. Cluster logic is page-level, not panel-level.
- `frontend/src/hooks/useThreatMapBuffer.js` — **not modified** (v6.1 hook lock).
- `frontend/src/hooks/useThreatStream.js` — **not modified** (v6.1 hook lock, PITFALL-01).
- `frontend/src/hooks/useLeaflet.js` — minor change ONLY if planner picks D-16 Option B (CSS import here). Otherwise untouched. If modified, lines 1-2 (add `import 'leaflet.markercluster/dist/MarkerCluster.css'`).
- `frontend/src/styles/components.css` — add `.map-cluster-icon` block near line 242 (existing `.map-marker` region). ~15 lines.
- `frontend/src/styles/animations.css` — **not modified** (buffer-marker lifecycle animations untouched; cluster icons are static).
- `frontend/src/styles/glassmorphism.css` — **not modified** (`.glass-card-static` reused only for the `.map-cluster-icon` visual parity, not imported).
- `frontend/tailwind.config.js` — **not modified** (color tokens `surface #0F1117`, `border #1E2030`, `text-primary #E8EAED` all used via hard-coded rgba in components.css per the animations.css precedent from Phase 61; Tailwind utilities don't apply inside `L.divIcon` `html` strings).
- `frontend/package.json` — MODIFIED (add `leaflet.markercluster: ^1.5.3` to dependencies).
- `frontend/package-lock.json` — MODIFIED (untracked at session start per `git status`; becomes tracked + committed with the dependency install).

### External (informational only)
- `leaflet.markercluster` npm page — v1.5.3 is the latest 1.x; v2.x does not exist yet as of 2026-04-21.
- `leaflet.markercluster` GitHub README — `iconCreateFunction`, `clusterclick` event, `chunkedLoading`, `zIndexOffset` options documented.
- Leaflet 1.9.x docs — `L.DomEvent.stopPropagation`, `L.layerGroup`, `L.divIcon` — already used in Phase 61 code.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`markerInstancesRef` (Map<id, L.Marker>)** at `ThreatMapPage.jsx:67` — Phase 61's single source of truth for live marker instances. Phase 63 reuses verbatim; the only change is the ADD path (from `.addTo(map)` to `markerGroupRef.current.addLayer(instance)`).
- **`buildIcon(marker)` helper** at `ThreatMapPage.jsx:17-27` — template for `buildClusterIcon(cluster)` (D-14). Same `L.divIcon` shape, same `className: ''` override, same `iconSize` sizing convention.
- **`interactive: false`** on every buffer `L.marker` at `ThreatMapPage.jsx:96` — Phase 61 D-18 already silences marker click propagation. Phase 63 gets PITFALL-08 mitigation for free on individual markers; only clusters need the explicit `stopPropagation` handler (D-23).
- **`leafletMapRef.current` + `handleMapReady`** at `ThreatMapPage.jsx:66, 69-71` — the map instance is captured once per mount via `onReady` callback. Phase 63's layer-swap effect reads this ref; no new map-ready plumbing needed.
- **`L` namespace import** at `ThreatMapPage.jsx:2` — `import L from 'leaflet'`. The `leaflet.markercluster` side-effect import (D-03) attaches `L.markerClusterGroup` to this already-imported namespace. No re-import needed.
- **`STORAGE_KEY` + `BUFFER_SIZE_STORAGE_KEY` constants** at `ThreatMapPage.jsx:43` + `BufferSizeControl.jsx:32` — established module-level constant pattern. Phase 63 adds `CLUSTER_THRESHOLD = 500` in the same idiom.
- **`.map-marker` CSS block** at `components.css:242` — neighbour block for the new `.map-cluster-icon`. Reuse glassmorphism token patterns (`background: rgba(15, 17, 23, 0.8)` matches `surface` at 80% α, mirroring `.glass-card-static`).

### Established Patterns
- **Module-level constants** in `ThreatMapPage.jsx` — `STORAGE_KEY` (line 43) established this. Phase 62 extended it in `BufferSizeControl.jsx`. Phase 63 adds `CLUSTER_THRESHOLD` alongside `STORAGE_KEY`.
- **Ref-based Leaflet state** — `leafletMapRef`, `markerInstancesRef`, `bufferLimitRef` (in the buffer hook). Phase 63 adds `markerGroupRef` + `activeLayerModeRef`, consistent with the "refs for Leaflet DOM, state for React UI" rule.
- **Single-effect reconciliation** — Phase 61 D-11 established ONE `useEffect([markers])` for ADD+UPDATE+REMOVE. Phase 63 adds a SEPARATE `useEffect([bufferSize])` for layer swap. The two effects don't collide: `[markers]` doesn't re-run when `bufferSize` changes; `[bufferSize]` doesn't read `markers` (it iterates `markerInstancesRef.current` directly). Ordering is fine either way because the layer-swap effect runs AFTER the map is ready (implicit via `leafletMapRef.current` null-check).
- **Try/catch around map.removeLayer** in unmount — Phase 61 D-15 established this. Phase 63 extends the same guard to `map.removeLayer(markerGroupRef.current)`.
- **Zero-state CSS classNames in `L.divIcon`** — `className: ''` is the convention for custom-HTML icons (Phase 61 `buildIcon` and the existing `addHighlightPulse` at line 32 both use it). Phase 63 `buildClusterIcon` follows suit.
- **Single-caller module scope helpers** — `buildIcon` lives in `ThreatMapPage.jsx` not a separate file (Phase 61 D-12). Phase 63 `buildClusterIcon` follows the same rule — extract to a file only if Phase 66 finds a second consumer.

### Integration Points
- **`ThreatMapPage.jsx:1-11`** — imports section. Add:
  ```
  import 'leaflet.markercluster';               // side-effect, extends L.*
  import 'leaflet.markercluster/dist/MarkerCluster.css';  // D-02 — ONLY this CSS
  ```
  No import from `MarkerCluster.Default.css`.
- **`ThreatMapPage.jsx:43`** — constants. Add `const CLUSTER_THRESHOLD = 500;` on a new line below the existing `STORAGE_KEY`.
- **`ThreatMapPage.jsx:17-27`** — after the existing `buildIcon(marker)` helper, add the new `buildClusterIcon(cluster)` helper (D-14).
- **`ThreatMapPage.jsx:66-68`** — refs. Add:
  ```
  const markerGroupRef = useRef(null);          // D-08
  const activeLayerModeRef = useRef(null);      // D-09
  ```
- **`ThreatMapPage.jsx:82-117`** — reconciliation effect. Change:
  ```
  // BEFORE (Phase 61):
  const instance = L.marker(...).addTo(map);
  // AFTER (Phase 63):
  const instance = L.marker(...);
  markerGroupRef.current.addLayer(instance);
  ```
  And in the eviction branch:
  ```
  // BEFORE:
  map.removeLayer(instance);
  // AFTER:
  markerGroupRef.current.removeLayer(instance);
  ```
  Prepend a lazy-init guard at the top of the effect body (D-12): if `markerGroupRef.current == null`, run the layer-swap sequence (D-10 steps 4–8) to create the initial group based on current `bufferSize`.
- **`ThreatMapPage.jsx:117`** — AFTER the existing `useEffect([markers])`, add a NEW `useEffect([bufferSize])` for the layer swap (D-10). Mirrors the `[bufferSize]` persistence effect at line 144 structurally but touches Leaflet refs instead of localStorage.
- **`ThreatMapPage.jsx:121-132`** — unmount cleanup. After the `instances.clear()` at line 130, add:
  ```
  if (map && markerGroupRef.current) {
    try { map.removeLayer(markerGroupRef.current); } catch { /* map disposed */ }
  }
  markerGroupRef.current = null;
  activeLayerModeRef.current = null;
  ```
- **`frontend/src/styles/components.css:242`** — after the existing `.map-marker` block, add the `.map-cluster-icon` block per D-15 (~15 lines).
- **`frontend/package.json`** — `dependencies` section: add `"leaflet.markercluster": "^1.5.3"`. Performed via `npm install leaflet.markercluster@1.5.3 --save`.
- **`frontend/package-lock.json`** — auto-updated by `npm install`; commit alongside `package.json`.

### Files NOT Modified
- `frontend/src/hooks/useThreatMapBuffer.js` — v6.1 hook lock (pure state machine).
- `frontend/src/hooks/useThreatStream.js` — v6.1 hook lock (PITFALL-01).
- `frontend/src/hooks/useLeaflet.js` — modified ONLY if planner picks D-16 Option B (CSS import here). Otherwise untouched.
- `frontend/src/components/threat-map/LeftOverlayPanel.jsx` — cluster logic is page-level.
- `frontend/src/components/threat-map/RightOverlayPanel.jsx` — no cluster semantics on the right panel.
- `frontend/src/components/threat-map/BufferSizeControl.jsx` — exports `BUFFER_SIZE_OPTIONS` which Phase 63 does NOT consume; the `CLUSTER_THRESHOLD = 500` constant is a Phase-63 local (D-07).
- `frontend/src/styles/animations.css` — buffer-marker lifecycle only; no cluster animations added.
- `frontend/src/styles/glassmorphism.css` — cluster bubble reuses `.glass-card-static`-like rgba tokens in `components.css`, not the glassmorphism module itself.
- `frontend/src/styles/main.css` — no changes.
- `frontend/tailwind.config.js` — no new tokens (cluster icon uses rgba literals inside divIcon HTML).

</code_context>

<specifics>
## Specific Ideas

- **Version pin rationale:** `leaflet.markercluster@1.5.3` was the latest stable as of v6.1 roadmap drafting (2026-04-17). The `^1.5.3` range admits 1.5.x patches but blocks 1.6+ to prevent drift within this milestone. If a 1.5.4 drops during the phase, the install will still pin to 1.5.3 on the next `npm ci`.
- **Initial-mount mode selection:** on first mount, `bufferSize` may be 100 (default), 500, 1000, or 2000 — whatever the user's last choice was per Phase 62 `localStorage`. The lazy-init guard in the `[markers]` effect (D-12) must read `bufferSize` fresh (via the closure of the effect's dep, or via a `bufferSize > CLUSTER_THRESHOLD` comparison in the effect body). Do NOT hardcode plain-mode on first render.
- **Chunked loading sanity check:** `chunkedLoading: true` with `chunkInterval: 200` (default) means: for 2000 markers, initial `addLayers([...])` call splits into ~10 batches of 200, each with a 16ms yield to the browser. Total hydration takes ~200ms — acceptable. MAPCLU-04 is satisfied by default settings; no tuning needed.
- **Spiderfy interaction at max zoom:** Leaflet's default `spiderfyOnMaxZoom: true` + `spiderfyDistanceMultiplier: 1` fans out overlapping markers at max zoom. Users who zoom deep and still see clusters can click to spiderfy. The visual: radial legs from cluster centre to each child marker. Dark theme compatibility: legs are drawn as SVG paths by Leaflet at `stroke: #222` by default — dim against `#262626` background but visible. No override needed; dim legs are acceptable and match the "quiet background" aesthetic.
- **`.map-cluster-icon` hover state:** none explicitly. The cursor changes to `pointer` (D-15) — that's the only hover affordance. Avoids animation/transition conflicts with MarkerCluster's internal `.leaflet-cluster-anim` transforms (even though we don't import default CSS, belt-and-braces).
- **`chunkProgress: null` quirk:** some versions of leaflet.markercluster emit a warning if `chunkProgress` is undefined. Setting it to `null` explicitly avoids the warning; setting to a function would require a real handler. `null` is the "silent no-op" the library recommends.
- **Click-through on spiderfied markers:** after spiderfy, clicking a child marker does NOT re-fire `clusterclick` (Leaflet handles this internally). So our PITFALL-08 `stopPropagation` only fires on the un-spiderfied cluster click — correct semantics.
- **Layer-swap race with SSE burst:** if the user flips the dropdown mid-burst (5+ arrivals within one render tick), the sequence is: SSE event → buffer state update → reconciliation effect runs (adds markers to current group) → user changes dropdown → bufferSize state updates → `[bufferSize]` effect runs → layer swap (transfers all current instances including the just-added ones). Net: zero markers lost, zero double-rendered. `markerInstancesRef.current` holds the authoritative Map throughout.
- **`removeOutsideVisibleBounds: true` (default):** off-screen clusters don't render DOM. When the user pans, the library auto-creates/destroys cluster icons for the now-visible area. This is a MAPCLU-04 perf win at 2000 markers — only the viewport's clusters are in the DOM.
- **CSS import order and Vite CSS chunking:** Vite bundles both `leaflet.css` (from `useLeaflet.js`) and `MarkerCluster.css` (from `ThreatMapPage.jsx` per D-16 Option A) into a single stylesheet chunk for the ThreatMap route. The ordering is determined by the module graph; our `.map-cluster-icon` in `components.css` is imported by `main.css` which is imported via Vite's entry → it loads globally, overrides any conflicting Leaflet default. Verify via `cd frontend && npm run build && cat dist/assets/*.css | grep -c map-cluster-icon` after build — should be exactly 1.
- **Re-render count impact:** changing `bufferSize` triggers: `ThreatMapPage` re-render (state change) + `LeftOverlayPanel` re-render (prop change) + `BufferSizeControl` re-render (prop change) + the `[bufferSize]` effect fires (layer swap — pure DOM mutation, no re-render). The cluster layer swap does NOT cause a React re-render cascade because it touches only refs. React is unaware it happened.
- **TypeScript-less prop annotation for `buildClusterIcon`:** a JSDoc `@param {L.MarkerCluster} cluster` plus `@returns {L.DivIcon}` is optional. Phase 61's `buildIcon` uses `@param {Object} marker` — follow the same informal style; don't over-annotate.
- **Z-index coverage polygon fallback:** if a future design pass wants a coverage polygon overlay, set `showCoverageOnHover: true` and tune `polygonOptions: { color: '#7A44E4', opacity: 0.3 }` (violet accent, low α). Not in Phase 63 scope but Phase 66's audit may evaluate.

</specifics>

<deferred>
## Deferred Ideas

- **Custom cluster colour coding** (e.g., red bubble if ≥10 red children, violet if mixed) → not MAPCLU-01 scope. Phase 66 integration audit may re-evaluate after user feedback.
- **Cluster hover tooltip showing attack types** → no tooltip primitive in the project (Phase 62 D-07 noted this). Deferred to any milestone that introduces tooltips.
- **Cluster animation tuning (spiderfy distance, zoom ease)** → default Leaflet values are fine for v6.1. Pre-polish territory for v7+.
- **Coverage polygon on hover (`showCoverageOnHover: true`)** → no design language; deferred to future milestone that adds coverage polygon design tokens.
- **Animated transition during layer swap** → layer swap is instantaneous by design (re-init strategy per research §3). A crossfade would require dual-layer rendering which contradicts PITFALL-06 mitigation. Deferred indefinitely.
- **Dedicated `useCluster` hook extraction** → single consumer in Phase 63; extract at N≥2 call sites.
- **Programmatic test of cluster behaviour (jsdom + Leaflet)** → no precedent in codebase; manual QA via `63-VALIDATION.md` is the contract. Deferred to a dedicated test-infra phase (not in v6.1).
- **Backend snapshot `?limit=` frontend wiring** → still deferred from Phase 62. May pair with Phase 66's E2E audit if the initial SSE-fill feels slow at 2000-cap setups.
- **Exporting `CLUSTER_THRESHOLD` from a shared constants module** → single consumer in Phase 63 (`ThreatMapPage.jsx`); extract at N≥2.
- **Switching to React-Leaflet or another wrapper library** → violates v6.1 "only one new dep" rule. Native Leaflet API is the contract.

### Reviewed Todos (not folded)
None — no pending todos were reviewed that fall outside this phase's scope.

</deferred>

---

*Phase: 63-frontend-marker-clustering*
*Context gathered: 2026-04-21 (autonomous mode, discuss-phase --auto — all decisions are Claude's discretion grounded in v6.1 ROADMAP + REQUIREMENTS, Phase 61/62 handoff patterns, research PITFALLS §05–08 + ARCHITECTURE §3, and existing ThreatMapPage.jsx code landmarks)*
