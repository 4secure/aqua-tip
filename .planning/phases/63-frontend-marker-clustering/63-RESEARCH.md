# Phase 63: Frontend Marker Clustering — Research

**Researched:** 2026-04-21
**Domain:** React 19 + vanilla Leaflet + `leaflet.markercluster` integration — dark-theme cluster layer conditionally enabled on buffer-size threshold (>500)
**Confidence:** HIGH

## Summary

Phase 63 is a **surgical integration phase**, not a design phase. Every architectural question has been pre-decided across 33 locked decisions in `63-CONTEXT.md` (D-01..D-33), the visual contract is fully frozen in `63-UI-SPEC.md` (6/6 dimensions PASS), and the roadmap has locked the only dependency (`leaflet.markercluster@1.5.3`). The researcher's remaining job is to:

1. Produce a **validation map** translating MAPCLU-01..05 into concrete manual-QA probe rows for `63-VALIDATION.md`.
2. Propose a **wave/task ordering** that respects dependency chains (install blocks imports; imports block runtime; swap helper depends on constants).
3. Produce a **file-by-file change inventory** with exact current-file line numbers so the planner writes precise edit anchors.
4. Surface **sequence-specific pitfalls** the planner must guard against (commit ordering, CSS-import typo footguns, CRLF-aware grep patterns on Windows).
5. Flag all **assumptions** that the executor should verify at run-time rather than trust as fact.

**Primary recommendation:** 4-wave task structure — Wave 0 install + CSS scaffold (parallelisable), Wave 1 constants + helpers (no runtime wire), Wave 2 layer-swap integration (the load-bearing edit), Wave 3 unmount cleanup + post-build verification. Each wave is independently committable and independently testable at the Vite-build level; the user's MAPCLU-01..05 contract only lights up after Wave 2.

**One material correction to CONTEXT.md required:** D-27 claims "`package-lock.json` is already an untracked file at the project root." This is literally true of the *root* `./package-lock.json` (untracked, per `git status --short`: `?? package-lock.json`), but the file `npm install` will modify is `frontend/package-lock.json` — which has been **git-tracked since commit `62949f6`** (`git log -1 -- frontend/package-lock.json` shows `37a7c06`). The practical impact: the install task commits a modification of an already-tracked file, not a new file. The root untracked lockfile is a pre-existing artefact from some earlier root-level npm command and is unrelated to this phase; it should be left alone. See Pitfall P-02 below.

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

All 33 decisions (D-01 through D-33) in `.planning/phases/63-frontend-marker-clustering/63-CONTEXT.md` are locked in autonomous mode and treated as non-negotiable unless a verified code-level finding contradicts them. Verbatim summary by group:

**Dependency + Imports (D-01..D-04):**
- D-01: Install `leaflet.markercluster@1.5.3` via `npm install leaflet.markercluster@1.5.3 --save` in `frontend/`. Package.json entry lands at `"leaflet.markercluster": "^1.5.3"`; caret range within 1.5.x acceptable; no 1.6+ drift.
- D-02: Import `leaflet.markercluster/dist/MarkerCluster.css` **once**. Do NOT import `MarkerCluster.Default.css` (roadmap-locked).
- D-03: Import `'leaflet.markercluster'` as a bare side-effect import in `ThreatMapPage.jsx` — attaches `L.markerClusterGroup` to the already-imported `L` namespace. Must run BEFORE any call to `L.markerClusterGroup()`.
- D-04: No new transitive deps. Verify via `npm ls leaflet.markercluster` post-install.

**Threshold + Constants (D-05..D-07):**
- D-05: `CLUSTER_THRESHOLD = 500` as module-level constant in `ThreatMapPage.jsx` (alongside `STORAGE_KEY` at line 43).
- D-06: Strict `>` comparison (NOT `>=`). At `bufferSize === 500`, clustering is OFF.
- D-07: Threshold constant is NOT exported from `BufferSizeControl.jsx`. Phase 63 adds its own local constant.

**Layer Swap Architecture (D-08..D-13):**
- D-08: Single `markerGroupRef = useRef(null)` — holds `L.layerGroup()` OR `L.markerClusterGroup(...)` exclusively (PITFALL-06).
- D-09: `activeLayerModeRef = useRef(null)` — tracks `'plain' | 'cluster' | null`.
- D-10: Layer-swap sequence (normative 8-step sequence — see CONTEXT.md for full pseudocode): detach listeners → removeLayer per instance → removeLayer old group → create new group → attach listeners → addLayer new group → re-add instances → swap refs.
- D-11: Modify existing reconciliation `useEffect([markers])` in place: `instance.addTo(map)` → `markerGroupRef.current.addLayer(instance)`; `map.removeLayer(instance)` → `markerGroupRef.current.removeLayer(instance)`.
- D-12: Lazy initial group creation on first `[markers]` effect run. Derive initial mode from current `bufferSize`.
- D-13: Extend unmount cleanup to `map.removeLayer(markerGroupRef.current)` + reset refs to `null`.

**Cluster Icon Styling (D-14..D-17):**
- D-14: `buildClusterIcon(cluster)` at module scope in `ThreatMapPage.jsx`. Uses `className: ''`, `iconSize: [32, 32]`.
- D-15: `.map-cluster-icon` CSS in `components.css` near `.map-marker` (not `animations.css`); 32x32 circle, `rgba(15,17,23,0.8)` bg, 8px backdrop-blur, `1px solid rgba(30,32,48,0.8)` border, JetBrains Mono 12px weight 600, `#E8EAED` text, `0 2px 8px rgba(0,0,0,0.3)` shadow, cursor pointer. NO transitions, NO animations.
- D-16: CSS import location — Option A (preferred): alongside the JS import in `ThreatMapPage.jsx`. Option B: in `useLeaflet.js` next to `leaflet/dist/leaflet.css`. **Planner picks; recommendation is A.**
- D-17: No DOM-level cluster CSS override attempts. Leaflet internal classes (`.leaflet-cluster-anim`, etc.) NOT added to `components.css`.

**Cluster Group Options (D-18..D-22):**
- D-18: Full options object — `iconCreateFunction: buildClusterIcon, showCoverageOnHover: false, chunkedLoading: true, chunkProgress: null, zoomToBoundsOnClick: true, spiderfyOnMaxZoom: true, zIndexOffset: -100, animate: true`.
- D-19: `showCoverageOnHover: false` — no polygon overlay.
- D-20: `chunkedLoading: true, chunkProgress: null`. `chunkInterval` default (200ms) untouched.
- D-21: `zoomToBoundsOnClick: true` — explicit (default).
- D-22: `zIndexOffset: -100` — places clusters at effective z-500, below z-1000 panels (PITFALL-07).

**Click Propagation (D-23..D-24):**
- D-23: `clusterclick` handler with `L.DomEvent.stopPropagation(e.originalEvent)` (PITFALL-08). Attached at group creation; implicitly detached on group removal.
- D-24: Individual-marker click isolation already handled by Phase 61's `interactive: false`.

**State Flow (D-25..D-26):**
- D-25: Layer swap does NOT affect SSE subscription. `useEffect([bufferSize])` touches Leaflet refs only.
- D-26: Marker-count conservation: iterate `markerInstancesRef` on swap; every instance attached to exactly one container post-swap.

**Package Commit + Lockfile (D-27..D-28):**
- D-27: `frontend/package.json` AND `frontend/package-lock.json` committed together. No `npm ci` introduced in this phase.
- D-28: Install is a dedicated first-wave blocking task.

**Test Strategy (D-29..D-30):**
- D-29: Manual QA via `63-VALIDATION.md` — SC1..SC5 probe rows. No new test framework.
- D-30: No Leaflet unit-level tests (no jsdom precedent).

**React 19 / Vite 7 (D-31..D-33):**
- D-31: No TypeScript; plain JS. JSDoc optional.
- D-32: No new hooks; clustering fully contained in `ThreatMapPage.jsx`.
- D-33: Vite 7 build check — `cd frontend && npm run build` must be clean.

### Claude's Discretion

Not locked — downstream planner picks consistently with project conventions:
- Whether `buildClusterIcon` lives at module scope (default, D-14) or extracted.
- Whether CSS import goes in `ThreatMapPage.jsx` (D-16 Option A, recommended) or `useLeaflet.js` (D-16 Option B).
- Whether to extract cluster options object to a `const CLUSTER_OPTIONS = {...}` module constant or inline at call site.
- Whether layer-swap sequence (D-10) is factored into `swapMarkerGroup(...)` helper or inlined.
- Whether plain-mode container is `L.layerGroup()` (D-14 default, uniform API) or direct-to-map.
- Whether to verify `npm run build` + Vite bundle analyzer for clean code-splitting.

### Deferred Ideas (OUT OF SCOPE)

- Custom cluster colour coding (e.g., red bubble if ≥10 red children).
- Cluster hover tooltip showing attack types.
- Cluster animation tuning (spiderfy distance, zoom ease).
- Coverage polygon on hover (`showCoverageOnHover: true`).
- Animated transition during layer swap (contradicts PITFALL-06).
- Dedicated `useCluster` hook extraction.
- Programmatic test of cluster behaviour (jsdom + Leaflet).
- Backend snapshot `?limit=` frontend wiring (still deferred from Phase 62).
- Exporting `CLUSTER_THRESHOLD` from a shared constants module.
- Switching to React-Leaflet or wrapper library.

</user_constraints>

---

<phase_requirements>

## Phase Requirements

| ID | Description (from REQUIREMENTS.md) | Research Support |
|----|------------------------------------|------------------|
| **MAPCLU-01** | When buffer size is greater than 500, marker clustering is automatically enabled via `leaflet.markercluster`. | Layer-swap effect `useEffect([bufferSize])` checks `bufferSize > CLUSTER_THRESHOLD` per D-05/D-06. Swap sequence D-10 creates `L.markerClusterGroup(clusterOptions)` on upward crossing. Dark-theme `iconCreateFunction: buildClusterIcon` (D-14) yields custom bubbles, not library defaults. |
| **MAPCLU-02** | Cluster icons are styled to match the dark glassmorphism theme (custom `iconCreateFunction` with design-system colors) **AND** clicking a cluster zooms the map to its bounds and expands child markers. | `.map-cluster-icon` CSS block in `components.css` (D-15) + `buildClusterIcon` helper (D-14). `zoomToBoundsOnClick: true` (D-21) — library handles the zoom-to-bounds on click. `spiderfyOnMaxZoom: true` (D-18) handles max-zoom child expansion. |
| **MAPCLU-03** | Crossing the threshold (e.g., 500 → 1000 or 500 → 100) cleanly swaps the marker layer without double-rendering markers. | Single `markerGroupRef` (D-08) + `activeLayerModeRef` (D-09) + 8-step swap sequence (D-10). `markerInstancesRef` iteration preserves exact same `L.Marker` DOM (no recreation). PITFALL-06 mitigated by-construction: old group removed before new group added. |
| **MAPCLU-04** | `chunkedLoading: true` so initial paint at 1000+ markers does not block the UI thread. | `chunkedLoading: true, chunkProgress: null` in cluster options (D-18/D-20). Default `chunkInterval: 200ms` left untouched. Leaflet spreads `addLayers([...])` across requestAnimationFrame ticks. |
| **MAPCLU-05** | Cluster bubbles appear below the glassmorphism overlay panels in z-index. | `zIndexOffset: -100` in cluster options (D-22). Leaflet marker-pane default z-600 + offset -100 = effective z-500. Overlay panels at `z-[1000]` stay above. PITFALL-07 mitigated. |

</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Cluster enable/disable decision | Browser / Client (React state effect) | — | Driven by `bufferSize` state (Phase 62) — a client-only concern. No backend awareness. |
| Cluster layer DOM creation/teardown | Browser / Client (Leaflet imperative API via refs) | — | Leaflet manages DOM outside React's reconciler; refs are the React-approved escape hatch. |
| Cluster icon styling | Browser / Client (CSS in `components.css`) | — | `L.divIcon` `html` string references a CSS class loaded globally via Vite's module graph. |
| Threshold constant source of truth | Browser / Client (`CLUSTER_THRESHOLD` in `ThreatMapPage.jsx`) | — | Single consumer; no backend contract; D-07 keeps it local. |
| Marker instance storage | Browser / Client (`markerInstancesRef` Map from Phase 61) | — | Unchanged from Phase 61; same Map<id, L.Marker> is iterated during layer swap. |
| Click-event propagation guard | Browser / Client (`L.DomEvent.stopPropagation`) | — | Leaflet-level event plumbing; never touches React synthetic events. |
| Bundle-splitting for `leaflet.markercluster` | Build-time (Vite) | Browser / Client (lazy load via route bundle) | Vite 7 default code-splitting puts the library in the `ThreatMapPage` route chunk — not a developer decision, but worth verifying post-build. |
| SSE stream lifecycle | Browser / Client (`useThreatStream`) | — | **NOT modified** by Phase 63 (v6.1 hook lock). D-25 proves the swap is isolated from SSE. |
| Buffer state machine | Browser / Client (`useThreatMapBuffer`) | — | **NOT modified** by Phase 63 (v6.1 hook lock). Cluster mode is a render-layer concern, not a state-layer concern. |

**Tier sanity check:** All new work lives in the Browser / Client tier. No backend edits. No CDN or build-config edits beyond one `package.json` dependency bump. This is the simplest tier profile any v6.1 phase will ship with.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `leaflet.markercluster` | `^1.5.3` (pinned 1.5.x) | Cluster layer + custom `iconCreateFunction` + click-to-zoom + spiderfy | `[VERIFIED: npm registry]` Only v1.x line; v2 does not exist; 1.5.3 is latest stable (published 2021-10-18). `[CITED: github.com/Leaflet/Leaflet.markercluster]` canonical cluster library for vanilla Leaflet — the ecosystem's default since 2016. Roadmap-locked. |
| `leaflet` | `^1.9.4` (already installed) | Core map engine | Satisfies `leaflet.markercluster`'s peer dep of `>= 1.3.1` — verified via `npm view leaflet.markercluster@1.5.3 peerDependencies` returning `{ leaflet: '^1.3.1' }`. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react` | `^19.2.4` (already installed) | `useRef` for `markerGroupRef` + `activeLayerModeRef`; `useEffect` for layer-swap | Standard React idiom for imperative library integration. |
| `vite` | `^7.3.1` (already installed) | CSS bundling for `MarkerCluster.css` imported from `node_modules` | Vite 7 handles `node_modules/*.css` natively — no config change needed. [CITED: vite.dev/guide/features#css] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `leaflet.markercluster@1.5.3` | React-Leaflet + `react-leaflet-markercluster` | Requires migrating entire map to React-Leaflet — violates v6.1 "vanilla Leaflet only" rule (PROJECT.md). Out of scope. |
| `leaflet.markercluster@1.5.3` | `supercluster` (Mapbox) | Library-agnostic clustering primitive — requires wiring its output to Leaflet manually. More code, less mature for Leaflet-specific UX (spiderfy, zoom-to-bounds). |
| Custom `L.divIcon` cluster bubble | `MarkerCluster.Default.css` + CSS override | Roadmap-locked to SKIP default CSS (D-02). Default carries `.marker-cluster-small/medium/large` which would conflict with custom `.map-cluster-icon` CSS. Proven PITFALL-21 in research. |

### Installation

```bash
cd frontend && npm install leaflet.markercluster@1.5.3 --save
```

**Version verification:** `[VERIFIED: npm registry 2026-04-21 via npm view]`
- `leaflet.markercluster@1.5.3` published `2021-10-18T04:30:49.496Z`
- `dist-tags.latest: 1.5.3` (still current)
- `license: MIT`
- `dependencies`: none (zero runtime deps)
- `peerDependencies: { leaflet: '^1.3.1' }` — satisfied by project's `leaflet@^1.9.4`
- Repository: https://github.com/Leaflet/Leaflet.markercluster

**Post-install sanity commands (executor runs each, expected zero stderr):**
```bash
cd frontend && npm ls leaflet.markercluster         # expect: leaflet.markercluster@1.5.3
test -f frontend/node_modules/leaflet.markercluster/dist/leaflet.markercluster.js
test -f frontend/node_modules/leaflet.markercluster/dist/MarkerCluster.css
test -f frontend/node_modules/leaflet.markercluster/dist/MarkerCluster.Default.css && echo 'NOTE: Default.css present in node_modules but MUST NOT be imported by app code'
grep -q '"leaflet.markercluster": "\^1\.5\.' frontend/package.json      # expect: exit 0
```

---

## Architecture Patterns

### System Architecture Diagram

```
                      [User changes BufferSizeControl dropdown]
                                       │
                                       ▼
                    [bufferSize state updates in ThreatMapPage]
                                       │
           ┌───────────────────────────┴───────────────────────────┐
           ▼                                                       ▼
 [useEffect([bufferSize])]                            [Existing: useEffect([bufferSize])]
  → localStorage.setItem                               → NEW Phase 63 layer-swap effect
  (Phase 62, untouched)                                       │
                                                              ▼
                              desired = bufferSize > CLUSTER_THRESHOLD ? 'cluster' : 'plain'
                              if desired === activeLayerModeRef.current → no-op (bounce-guard)
                              else → run 8-step swap sequence (D-10):
                                     1. oldGroup.off('clusterclick') if cluster
                                     2. for each instance in markerInstancesRef:
                                          oldGroup?.removeLayer(instance)
                                     3. map.removeLayer(oldGroup) if oldGroup
                                     4. newGroup = desired === 'cluster'
                                                    ? L.markerClusterGroup(clusterOptions)
                                                    : L.layerGroup()
                                     5. if cluster: newGroup.on('clusterclick', ...)
                                     6. map.addLayer(newGroup)
                                     7. for each instance in markerInstancesRef:
                                          newGroup.addLayer(instance)
                                     8. markerGroupRef.current = newGroup
                                        activeLayerModeRef.current = desired

                                                   ▼
                             ┌─────────────────────┴─────────────────────┐
                             ▼                                           ▼
             [Leaflet renders cluster bubbles via          [Leaflet renders plain layerGroup —
              buildClusterIcon → .map-cluster-icon]         individual .map-buffer-marker dots]
                             │                                           │
                             └─────────────────┬─────────────────────────┘
                                               ▼
                                    [Browser repaints canvas]


    ─── PARALLEL DATA PATH (unchanged from Phase 61) ───

        [SSE event arrives via useThreatStream]
                      │
                      ▼
        [useThreatMapBuffer(events, bufferSize) emits markers]
                      │
                      ▼
        [useEffect([markers]) in ThreatMapPage]
         ├─ LAZY-INIT GUARD (D-12): if markerGroupRef.current == null → create initial group
         ├─ ADD:  L.marker(...) → markerGroupRef.current.addLayer(instance)   ← CHANGED from .addTo(map)
         ├─ UPDATE: existing.setIcon(...)                                      ← UNCHANGED
         └─ REMOVE: markerGroupRef.current.removeLayer(instance)               ← CHANGED from map.removeLayer(instance)


    ─── UNMOUNT PATH (SPA route change) ───

        [useEffect(() => () => {...}, [])]  (Phase 61, extended by Phase 63)
         ├─ for each instance: try { map.removeLayer(instance) } catch {}     ← UNCHANGED
         ├─ instances.clear()                                                 ← UNCHANGED
         ├─ NEW: if (map && markerGroupRef.current)
         │          try { map.removeLayer(markerGroupRef.current) } catch {}
         └─ NEW: markerGroupRef.current = null; activeLayerModeRef.current = null
```

### Component Responsibilities

| File | Responsibility | Phase 63 Change Type |
|------|----------------|----------------------|
| `frontend/src/pages/ThreatMapPage.jsx` | Page-level Leaflet orchestration; owns all cluster logic in-place (D-32 no-extraction) | **Modified** (imports + constant + helper + refs + 2 effects + unmount cleanup) |
| `frontend/src/styles/components.css` | Static CSS for on-map surfaces | **Modified** (append `.map-cluster-icon` block below `.map-marker` at line 258) |
| `frontend/package.json` | Dependency manifest | **Modified** (`dependencies` gains `"leaflet.markercluster": "^1.5.3"`) |
| `frontend/package-lock.json` | Lockfile (already git-tracked — see Pitfall P-02) | **Modified** (npm regenerates) |
| `frontend/src/hooks/useLeaflet.js` | Map-init + tile layer + base Leaflet CSS import | **Unmodified** OR **minor modified** if planner picks D-16 Option B (CSS import here). Recommendation: unmodified. |
| `frontend/src/hooks/useThreatStream.js` | SSE connection + event ring | **v6.1 HOOK LOCK — DO NOT MODIFY** (PITFALL-01, Phase 61 D-17) |
| `frontend/src/hooks/useThreatMapBuffer.js` | Buffer state machine (arriving/settled/evicting) | **v6.1 HOOK LOCK — DO NOT MODIFY** |
| `frontend/src/components/threat-map/BufferSizeControl.jsx` | Dropdown + localStorage | **Unmodified** (exports `BUFFER_SIZE_OPTIONS` but Phase 63 does not consume it per D-07) |
| `frontend/src/components/threat-map/LeftOverlayPanel.jsx` | Left panel layout | **Unmodified** (cluster logic is page-level) |
| `frontend/src/components/threat-map/RightOverlayPanel.jsx` | Right panel layout | **Unmodified** |
| `frontend/src/styles/animations.css` | Buffer-marker lifecycle animations | **Unmodified** (cluster bubble is static, no animations) |
| `frontend/src/styles/glassmorphism.css` | `.glass-*` surface family | **Unmodified** (visual reference only; tokens copied as rgba literals into `.map-cluster-icon`) |
| `frontend/src/styles/main.css` | Global CSS entry | **Unmodified** |
| `frontend/tailwind.config.js` | Design tokens | **Unmodified** (no new tokens; cluster CSS uses rgba literals inline) |

### Recommended Project Structure

No new files in Phase 63 — all changes are edits to existing files. The project already conforms to the "many small files, high cohesion" rule for the threat-map surface; adding `useCluster.js` or `clusterIcon.js` at this stage would violate D-32's "no premature abstraction" directive (single consumer; extract at N>=2).

### Pattern 1: Single-Container Layer Swap (PITFALL-06 mitigation)

**What:** Maintain one ref (`markerGroupRef`) that always points to either an `L.layerGroup()` OR an `L.markerClusterGroup(...)`. Never keep two containers on the map simultaneously. The mode tracker (`activeLayerModeRef`) holds the current mode string so the effect can short-circuit when both old and new desired modes match (e.g., 1000 → 2000, both cluster mode).

**When to use:** Any time a Leaflet application needs to conditionally swap the rendering-layer topology based on runtime state.

**Example:**
```js
// Source: CONTEXT.md D-10 / ARCHITECTURE.md §3 "Layer swap strategy — re-init, not live-toggle"
// [CITED: github.com/Leaflet/Leaflet.markercluster README — removeLayer + addLayer API]

useEffect(() => {
  const map = leafletMapRef.current;
  if (!map) return;

  const desired = bufferSize > CLUSTER_THRESHOLD ? 'cluster' : 'plain';
  if (desired === activeLayerModeRef.current) return; // bounce-guard

  const oldGroup = markerGroupRef.current;
  const instances = markerInstancesRef.current;

  // 1. Detach listeners on old cluster group (plain layerGroup has no cluster events)
  if (oldGroup && activeLayerModeRef.current === 'cluster' && oldGroup.off) {
    oldGroup.off('clusterclick');
  }

  // 2. Remove every tracked instance from old container
  if (oldGroup) {
    for (const instance of instances.values()) {
      oldGroup.removeLayer(instance);
    }
    // 3. Remove old group from map
    map.removeLayer(oldGroup);
  }

  // 4. Create new container
  const newGroup = desired === 'cluster'
    ? L.markerClusterGroup(CLUSTER_OPTIONS)
    : L.layerGroup();

  // 5. Attach cluster handler if cluster mode
  if (desired === 'cluster') {
    newGroup.on('clusterclick', (e) => {
      if (e.originalEvent) L.DomEvent.stopPropagation(e.originalEvent);
    });
  }

  // 6. Add new group to map
  map.addLayer(newGroup);

  // 7. Re-add every tracked instance to new container
  for (const instance of instances.values()) {
    newGroup.addLayer(instance);
  }

  // 8. Swap refs
  markerGroupRef.current = newGroup;
  activeLayerModeRef.current = desired;
}, [bufferSize]);
```

### Pattern 2: Lazy Initial Group Creation in Reconciliation Effect (D-12)

**What:** At the top of the existing `useEffect([markers])`, check if `markerGroupRef.current == null`. If so, run the swap-sequence steps 4–8 (no oldGroup to tear down) to create the initial container based on current `bufferSize`. This keeps the layer-swap logic in one code path and avoids needing a separate "init on map ready" effect.

**When to use:** When an imperative container must exist before any `add/removeLayer` call but its type depends on runtime state that may differ from a safe default.

**Example:**
```js
useEffect(() => {
  const map = leafletMapRef.current;
  if (!map) return;
  const instances = markerInstancesRef.current;

  // LAZY INIT (D-12): first reconciliation creates the initial container
  if (markerGroupRef.current == null) {
    const desired = bufferSize > CLUSTER_THRESHOLD ? 'cluster' : 'plain';
    const newGroup = desired === 'cluster'
      ? L.markerClusterGroup(CLUSTER_OPTIONS)
      : L.layerGroup();
    if (desired === 'cluster') {
      newGroup.on('clusterclick', (e) => {
        if (e.originalEvent) L.DomEvent.stopPropagation(e.originalEvent);
      });
    }
    map.addLayer(newGroup);
    markerGroupRef.current = newGroup;
    activeLayerModeRef.current = desired;
  }

  // ... existing ADD + UPDATE + REMOVE loop, but addLayer/removeLayer target markerGroupRef.current
}, [markers]);
```

**Note:** Because the lazy-init body reads `bufferSize` but the effect only depends on `[markers]`, this relies on the closed-over value of `bufferSize` at the time of the first render. Since the user cannot change `bufferSize` before the first `[markers]` effect runs (React batches state updates before effects, and the initial render happens before any dropdown interaction), this is safe. The `[bufferSize]` swap effect handles all subsequent changes.

### Pattern 3: `L.divIcon` with `className: ''` (Phase 61 precedent reused)

**What:** When rendering a custom-HTML Leaflet icon, pass `className: ''` to suppress Leaflet's default `.leaflet-marker-icon` class (which carries DOM-level absolute positioning that fights custom CSS). The custom class goes inside the `html` string, not on the icon's outer `<div>`.

**When to use:** Every time the project renders a `L.divIcon` with project-custom styling. Already used by `buildIcon` (Phase 61) and `addHighlightPulse` (Phase 61).

**Example:**
```js
// Source: ThreatMapPage.jsx line 17-27 (Phase 61 buildIcon) — CITED
function buildClusterIcon(cluster) {
  const count = cluster.getChildCount();
  return L.divIcon({
    className: '',                // load-bearing: suppress Leaflet defaults
    html: `<div class="map-cluster-icon">${count}</div>`,
    iconSize: [32, 32],           // MUST match CSS width/height for centroid anchoring
  });
}
```

### Anti-Patterns to Avoid

- **Per-render Leaflet recreation:** Calling `map.clearLayers()` + re-add on every `markers` change. The existing Phase 61 reconciliation pattern (Map<id, L.Marker>) is a strict upgrade — Phase 63 ONLY changes the `.addTo(map)` / `map.removeLayer(...)` call sites to use `markerGroupRef.current`; the diff-reconciliation logic is unchanged.
- **Two layer containers on the map simultaneously:** Creating a new `L.markerClusterGroup` and calling `map.addLayer(newGroup)` before removing the old `L.layerGroup` — classic PITFALL-06. The D-10 sequence orders `removeLayer(old)` BEFORE `addLayer(new)`.
- **Recreating `L.Marker` instances on swap:** Iterating `markers` (the React state) instead of `markerInstancesRef` (the Leaflet-instance Map). Recreating instances would also recreate DOM nodes → visible flicker + CSS transition restart. D-26 iterates the instance Map exclusively.
- **Importing `MarkerCluster.Default.css`:** Would reintroduce light-theme `.marker-cluster-small/medium/large` styles that conflict with custom `.map-cluster-icon` and cause white circles to appear under the dark-theme bubbles until zoom triggers a reflow. D-02 roadmap-locked.
- **Adding `bufferSize` to the SSE effect dep array or the `useThreatStream` deps:** Would cause a reconnect storm. The `[bufferSize]` swap effect lives in `ThreatMapPage.jsx` and touches only Leaflet refs (D-25).
- **Putting `.map-cluster-icon` CSS in `animations.css`:** Would break Phase 61's file-purpose contract (animations only) and surprise a future reader. D-15 places it in `components.css` next to `.map-marker`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Viewport-aware clustering of hundreds of markers | Custom spatial-index + collision detection in React | `L.markerClusterGroup` | Library handles k-d tree + zoom-scale-aware grid clustering in ~500 lines of battle-tested code; reimplementing gets correctness wrong at zoom-level transitions. |
| Non-blocking bulk marker add | `setTimeout` chunking loop yourself | `chunkedLoading: true` | Library ships frame-budget-aware chunker with default 200ms `chunkInterval`; handoff to rAF is idiomatic. |
| Zoom-to-bounds on click | Custom `map.on('click', ...)` + bounds calc | `zoomToBoundsOnClick: true` | Library computes cluster child bounds + smooth `fitBounds` with animate — one flag replaces ~30 lines. |
| Spiderfy at max zoom | Manual radial-leg SVG drawing + marker position munging | `spiderfyOnMaxZoom: true` (default) | Library draws legs, positions spiderfied children, handles click-to-un-spiderfy; ~200 lines of geometry saved. |
| Dark-theme cluster icon | Custom `L.Marker` with custom pane | Custom `iconCreateFunction` returning `L.divIcon` | The library's icon-creation hook IS the extension point; using it is simpler than layering a parallel pane. |
| Layer z-index management | Custom `L.Pane` with `zIndex` style | `zIndexOffset: -100` on cluster group | Library already operates within `markerPane` (z-600); an offset is the supported way to nudge without creating a new pane. |

**Key insight:** Nearly every interaction on the cluster layer (click-to-zoom, spiderfy, chunked add, layer rebuild, coverage polygon) has a first-class option flag on `L.markerClusterGroup`. Phase 63's `clusterOptions` object (D-18) is 9 lines and drives 90% of the user-visible behaviour. The only custom code we write is (a) the `buildClusterIcon` helper (~8 lines, mirrors Phase 61's `buildIcon`), (b) the `.map-cluster-icon` CSS (~15 lines), and (c) the swap-effect body (~40 lines). Everything else is library flags.

---

## Runtime State Inventory

*This phase is additive (new dependency + new refs + new CSS block + modified effects). It is NOT a rename, refactor, or migration. This section is included for completeness but most categories have nothing to find.*

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — Phase 63 introduces no new storage keys, no database schema, no STIX field changes. `aqua-tip:threat-map-buffer-size` (Phase 62) and `aqua-tip:panels-collapsed` (Phase 58) remain unchanged. | None. |
| Live service config | None — no backend endpoints touched, no OpenCTI query changes, no n8n/Datadog/Tailscale tags, no Cloudflare Tunnel changes. | None. |
| OS-registered state | None — no task-scheduler entries, no systemd units, no launch agents. Pure frontend in-browser runtime. | None. |
| Secrets/env vars | None — no `.env` changes, no API keys, no SOPS keys. The library is a pure client-side JS bundle. | None. |
| Build artifacts / installed packages | `frontend/node_modules/leaflet.markercluster/` — new subtree created by `npm install`. `frontend/node_modules/.package-lock.json` updates automatically. No stale binaries from any prior install (this is a net-new dep). | Executor must run `npm install` before Wave 1; otherwise `import 'leaflet.markercluster'` fails at build time. |

**Nothing found in category (explicit):** Stored data, live service config, OS-registered state, secrets/env vars — verified by reading CONTEXT.md §"Out of scope for Phase 63", checking `.env*` files are not referenced by phase scope, and confirming no backend-facing file appears in the change inventory.

---

## Common Pitfalls

### P-01: Importing `MarkerCluster.Default.css` by Reflex

**What goes wrong:** Executor's muscle memory for "install a leaflet plugin, import its CSS" produces both imports:
```js
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';  // WRONG — roadmap-banned
```
**Why it happens:** The library README lists both CSS files; examples online frequently use both; an autocomplete/import-helper extension may suggest both. 63-CONTEXT.md D-02 explicitly bans the default CSS.
**How to avoid:** Add a plan-task-level verification grep after the import edit:
```bash
grep -q 'MarkerCluster.Default.css' frontend/src/pages/ThreatMapPage.jsx frontend/src/hooks/useLeaflet.js && echo FAIL || echo PASS
```
Expected: `PASS`. If `FAIL`, executor must delete the offending import before proceeding.
**Warning signs:** White/blue circles appearing around or instead of dark-theme cluster bubbles on SC1 probe; DevTools Elements panel shows `.marker-cluster-small`/`-medium`/`-large` classes on DOM nodes. These classes only exist when `MarkerCluster.Default.css` is loaded.

### P-02: `package-lock.json` Tracking Confusion (Corrects CONTEXT.md D-27)

**What goes wrong:** CONTEXT.md D-27 reads "`package-lock.json` is already an untracked file at the project root (per `git status`). After `npm install leaflet.markercluster@1.5.3 --save`, both `frontend/package.json` AND `frontend/package-lock.json` change — commit both in the dependency-install plan task." The statement conflates two different files:

- **Root** `./package-lock.json` — truly untracked (`git status --short` shows `?? package-lock.json`). Pre-existing artefact from some earlier accidental root-level npm run. **Not touched by this phase.** Leave it alone.
- **`frontend/package-lock.json`** — **ALREADY git-tracked** since the initial project setup. Verified: `git ls-files frontend/package-lock.json` returns the path; `git log -1 -- frontend/package-lock.json` returns commit `37a7c06`. This is the file `npm install` will modify.

**Why it happens:** The researcher/planner sees `?? package-lock.json` in git status at session start and assumes that's the lockfile for the install. It isn't. The install runs in `frontend/`, so it touches `frontend/package-lock.json`.

**How to avoid:**
1. Stage both files explicitly in the install commit: `git add frontend/package.json frontend/package-lock.json`. Do NOT use `git add -A` or `git add .` (would accidentally stage the unrelated root `./package-lock.json`).
2. Verify pre-commit that the staging area does NOT include root `package-lock.json`:
   ```bash
   git diff --cached --name-only | grep -q '^package-lock.json$' && echo WARN: root lockfile staged unintentionally || echo OK
   ```
3. Do NOT delete the root `./package-lock.json`; it is out of scope for Phase 63.

**Warning signs:** Commit message "adds package-lock.json" when the file was actually modified (not added); commit stats showing root `package-lock.json` changes; noise diff unrelated to the markercluster dep.

### P-03: CRLF-Aware Grep on Windows (Phase 61 Precedent)

**What goes wrong:** Phase 61-01 documented that `grep`-based verification on Windows reads CRLF line endings (`\r\n`), which breaks pattern matches that include `\n` as a literal. Phase 63 adds several verification greps across `ThreatMapPage.jsx` (a file actively edited on Windows). If the executor or plan-checker writes a grep like:
```bash
grep -P 'const CLUSTER_THRESHOLD = 500;\nconst STORAGE_KEY' frontend/src/pages/ThreatMapPage.jsx
```
it will fail on Windows because the file has `\r\n` between lines.

**Why it happens:** Git may apply `core.autocrlf=true` conversion on checkout; editors save with CRLF; grep patterns written on a Unix assumption fail silently (reports no match even when the code is correct).

**How to avoid:**
1. Keep verification greps single-line — one pattern per line, never span lines with `\n` literals. Example: `grep -q 'const CLUSTER_THRESHOLD = 500' frontend/src/pages/ThreatMapPage.jsx && grep -q 'const STORAGE_KEY' frontend/src/pages/ThreatMapPage.jsx`.
2. For multi-line patterns: use `grep -Pzo` (supports multiline but requires explicit `\r?\n` between lines): `grep -Pzo 'CLUSTER_THRESHOLD[\s\S]*STORAGE_KEY'`.
3. For anchor verification (e.g., "line N of file X matches"): read the file + use Node-based verify that normalises via `.replace(/\r\n/g, '\n')`. Phase 61-01 STATE.md established this.

**Warning signs:** A verification task claims FAIL but manual code read shows the expected content; `grep -c` returning 0 where 1 is expected despite the pattern being literally present.

### P-04: Skipping `npm install` Before Edits

**What goes wrong:** Executor edits `ThreatMapPage.jsx` to add `import 'leaflet.markercluster'` and `import 'leaflet.markercluster/dist/MarkerCluster.css'` BEFORE running `npm install`. `npm run dev` fails instantly with `Failed to resolve import`; `npm run build` fails the same way. Work blocks until install is run.

**Why it happens:** Developer intuition — "let me write the code first, then install the dep" — fine for Python where imports are lazy, but Vite 7 resolves imports at build time. D-28 names the install as the first-wave blocking task for exactly this reason.

**How to avoid:** Enforce wave ordering. Wave 0 contains the install task; no Wave 1+ task touches `ThreatMapPage.jsx` imports until Wave 0 is green. The wave-gate verification: `test -d frontend/node_modules/leaflet.markercluster` before any Wave 1 task starts.

**Warning signs:** Vite dev server red error overlay within 1 second of first hot reload; `npm run build` output contains `[vite]: Rollup failed to resolve import "leaflet.markercluster"`.

### P-05: First-Mount Plain/Cluster Mode Mis-Selection

**What goes wrong:** User's `localStorage` has `aqua-tip:threat-map-buffer-size` set to `"1000"` from Phase 62. The user reloads the page; `ThreatMapPage` mounts with `bufferSize === 1000` on first render. If the lazy-init guard hard-codes `'plain'` as the initial mode (or falls through to `L.layerGroup()` unconditionally), the map mounts in plain mode; then the `[bufferSize]` effect runs once with a prev-mode-null trigger and swaps to cluster mode — visible pop/re-cluster on initial paint.

**Why it happens:** The lazy-init logic needs to read the CURRENT value of `bufferSize` at first-mount time, not a hardcoded default. D-12 specifies this but the wording "derive initial mode from current `bufferSize`" is easy to miss.

**How to avoid:** The lazy-init branch MUST read `bufferSize` (from the effect closure, which closes over the value at initial render time — correct because React has already initialised state before effects run):
```js
if (markerGroupRef.current == null) {
  const desired = bufferSize > CLUSTER_THRESHOLD ? 'cluster' : 'plain';
  // ... create corresponding group
}
```
Add a verification probe: reload page with `localStorage.setItem('aqua-tip:threat-map-buffer-size', '"1000"')` pre-set; within 500ms of page mount, `activeLayerModeRef.current === 'cluster'`. Observable in DevTools: no frame contains plain `.map-buffer-marker--settled` individual dots during the initial paint if the map zoom level has any marker overlap.

**Warning signs:** Brief flash of individual dots, then instant re-cluster on initial page load with buffer ≥ 1000.

### P-06: `L.DomEvent.stopPropagation` on Missing `e.originalEvent`

**What goes wrong:** The `clusterclick` handler assumes `e.originalEvent` exists:
```js
newGroup.on('clusterclick', (e) => L.DomEvent.stopPropagation(e.originalEvent));
```
But if the event is synthetically triggered (e.g., by a test harness, or by `cluster.fire('clusterclick')`), `e.originalEvent` may be `undefined` — `L.DomEvent.stopPropagation(undefined)` throws TypeError.

**Why it happens:** Leaflet's `clusterclick` event type documents `originalEvent` as the native DOM event, but its presence depends on the triggering source. Defensive coding avoids the crash.

**How to avoid:** The D-23 code already guards this correctly: `if (e.originalEvent) L.DomEvent.stopPropagation(e.originalEvent);`. Executor must transcribe verbatim; do NOT "simplify" to the unconditional form.

**Warning signs:** Uncaught TypeError in console on cluster click in dev mode with React StrictMode (StrictMode double-fires some events).

### P-07: `bufferSize === 500` Ambiguity (Strict > vs >=)

**What goes wrong:** Executor reads "cluster when buffer > 500" and writes `>=` anyway — or writes `>` but sets `CLUSTER_THRESHOLD = 499` to "be safe." Either variation breaks MAPCLU-01's contract that `bufferSize = 500` is plain mode.

**Why it happens:** Off-by-one anxiety; English-language ambiguity in phrases like "exceeds 500."

**How to avoid:** Verbatim code: `const desired = bufferSize > CLUSTER_THRESHOLD ? 'cluster' : 'plain';` with `CLUSTER_THRESHOLD = 500`. Validation probe in 63-VALIDATION.md: set dropdown to 500, confirm DevTools shows NO `L.MarkerClusterGroup` instance on the map; set to 1000, confirm one appears.

**Warning signs:** Clusters appearing at buffer=500 in manual QA; failing SC3 probe's "100 ↔ 500" no-swap check.

### P-08: `.map-cluster-icon` Specificity Loss From Later CSS

**What goes wrong:** The `.map-cluster-icon` CSS block is written correctly in `components.css` line 258+, but an unrelated future edit (e.g., Phase 66 integration polish) adds a more-specific selector (`.leaflet-marker-pane .map-cluster-icon { ... }`) elsewhere that overrides the base block. Colour or size regresses silently.

**Why it happens:** CSS cascade; `leaflet.markercluster`'s internals may inject ancestor classes that an over-specific selector inadvertently matches.

**How to avoid:** Keep `.map-cluster-icon` selectors single-class (no ancestor chain); add no `!important`. Document in 63-VALIDATION.md SC1 probe: "DevTools computed styles for a `.map-cluster-icon` element show `background: rgba(15, 17, 23, 0.8)` — if not, a more-specific selector is overriding."

**Warning signs:** Bubble background colour not matching the surface token when inspected.

### P-09: Forgetting to Set Vite 7 `base` / Ensure CSS Deduping

**What goes wrong:** Vite 7 typically handles CSS imports from `node_modules` cleanly, but some edge cases (workspace monorepos, custom `base` path, `optimizeDeps.exclude` tweaks) can cause `leaflet.css` and `MarkerCluster.css` to appear twice in the output. Double loading generally doesn't break anything but wastes bandwidth and can cause subtle cascade-order issues.

**Why it happens:** Vite's default is fine; only aggressive custom config triggers this. The project's `vite.config.*` is minimal, so risk is low.

**How to avoid:** Post-build verification: `grep -c '\.leaflet-cluster-anim\|MarkerCluster' frontend/dist/assets/*.css`. Expect: the cluster CSS appears exactly once in one of the output CSS chunks. If it appears twice, investigate Vite config.

**Warning signs:** `frontend/dist/assets/*.css` file count unexpectedly large after build; bundle-analyzer showing duplicate `MarkerCluster.css` imports.

### P-10: `npm install` in Wrong Directory

**What goes wrong:** Executor runs `npm install leaflet.markercluster@1.5.3 --save` from the repo root (`C:\laragon\www\aqua-tip\`) instead of `frontend/`. This installs into the root `./package.json` (which does not exist or is the Laravel root), creating an unrelated root `node_modules/`, and never updates `frontend/package.json` — the Vite build still fails.

**Why it happens:** Terminal cwd drift; agents in fresh shells default to repo root.

**How to avoid:** Install task uses explicit cwd: `cd frontend && npm install leaflet.markercluster@1.5.3 --save` — never bare `npm install ...`. Post-install verify: `grep '"leaflet.markercluster"' frontend/package.json` AND `test -d frontend/node_modules/leaflet.markercluster`.

**Warning signs:** Root `./package.json` gaining a dependencies block (it shouldn't); `node_modules/` created at repo root; `frontend/package.json` unchanged after install.

---

## Code Examples

Verified patterns from official sources + Phase 61/62 precedent:

### Cluster Group Options Block

```js
// Source: CONTEXT.md D-18 + github.com/Leaflet/Leaflet.markercluster#options
// All options either set explicitly per D-18..D-22 or commented as "default, explicit for clarity"
const CLUSTER_OPTIONS = {
  iconCreateFunction: buildClusterIcon,      // D-14 — dark-theme bubble
  showCoverageOnHover: false,                // D-19 — no polygon overlay
  chunkedLoading: true,                      // D-20 — MAPCLU-04 responsiveness
  chunkProgress: null,                       // D-20 — silence default logger
  zoomToBoundsOnClick: true,                 // D-21 — MAPCLU-02 (library default, explicit)
  spiderfyOnMaxZoom: true,                   // default, explicit for clarity
  zIndexOffset: -100,                        // D-22 — below z-1000 panels
  animate: true,                             // default — smooth spiderfy
};
```

### Module-Scope Cluster Icon Helper

```js
// Source: CONTEXT.md D-14 + Phase 61 buildIcon precedent at ThreatMapPage.jsx:17-27
// NO JSDoc required — matches Phase 61 buildIcon informal style
function buildClusterIcon(cluster) {
  const count = cluster.getChildCount();
  return L.divIcon({
    className: '',
    html: `<div class="map-cluster-icon">${count}</div>`,
    iconSize: [32, 32],
  });
}
```

### `.map-cluster-icon` CSS Block (verbatim from D-15 / UI-SPEC §Component Contract)

```css
/* Map cluster icon (Phase 63 — MAPCLU-01/02/05) */
/* Static glassmorphism bubble rendered by buildClusterIcon() in ThreatMapPage.jsx */
.map-cluster-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 17, 23, 0.8);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(30, 32, 48, 0.8);
  border-radius: 50%;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  font-weight: 600;
  color: #E8EAED;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  /* NO transitions, NO animations — static visual. */
}
```

### Unmount Cleanup Extension

```js
// Source: CONTEXT.md D-13 + ThreatMapPage.jsx:121-132 Phase 61 cleanup
useEffect(() => {
  return () => {
    const map = leafletMapRef.current;
    const instances = markerInstancesRef.current;
    if (map) {
      for (const instance of instances.values()) {
        try { map.removeLayer(instance); } catch { /* map already disposed */ }
      }
    }
    instances.clear();
    // NEW (D-13): tear down the marker group itself
    if (map && markerGroupRef.current) {
      try { map.removeLayer(markerGroupRef.current); } catch { /* map disposed */ }
    }
    markerGroupRef.current = null;
    activeLayerModeRef.current = null;
  };
}, []);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `map.clearLayers()` + re-add on every state change | Diff-reconciliation via `markerInstancesRef` | Phase 61 (2026-04-20) | Eliminates full-DOM churn; Phase 63 swap builds on this — the Map is the only thing carried across the swap. |
| Hardcoded `MAX_EVENTS = 100` in `useThreatStream` | `bufferLimitRef.current` populated by `bufferSize` state | Phase 62 (2026-04-21) | PITFALL-01-safe dropdown; no SSE reconnect on change. |
| `instance.addTo(map)` direct-to-map | `markerGroupRef.current.addLayer(instance)` | **Phase 63 (current)** | Uniformises add/remove across plain/cluster modes; enables D-10 swap without touching React. |
| `MarkerCluster.Default.css` + JS overrides | `MarkerCluster.css` only + custom `iconCreateFunction` | **Phase 63 (current)** | Eliminates the light-theme default entirely by construction; PITFALL-05 sidestepped. |

**Deprecated/outdated:**
- `addPulseMarker` + `prevEventIdRef` pattern (pre-Phase 61) — replaced by buffer hook + reconciliation. Already removed.
- Adding markers to `markerLayerRef.current` from `useLeaflet.js` (pre-Phase 61) — Phase 61 removed the `markers` prop from the hook; Phase 63 does not re-introduce it. `useLeaflet.js` is map-init-only at this point.

---

## Task Ordering (Wave Structure)

The planner should produce **one plan per wave**, each independently committable. The 4-wave structure below is the research recommendation; planner has final authority.

### Wave 0 — Install + CSS Scaffold (parallel-eligible)

**Goal:** All prerequisites for Wave 1+ in place; no runtime behaviour change yet (clustering is not wired).

**Tasks:**
1. **Install dependency** (blocking, must complete before other waves):
   - `cd frontend && npm install leaflet.markercluster@1.5.3 --save`
   - Verify: `grep -q '"leaflet.markercluster": "\^1\.5\.' frontend/package.json` AND `test -d frontend/node_modules/leaflet.markercluster`
   - Stage: `git add frontend/package.json frontend/package-lock.json`
   - Commit: `chore(63): install leaflet.markercluster@1.5.3 (v6.1 roadmap-locked)`
2. **Append `.map-cluster-icon` CSS** (parallel with Task 1 in theory, but plan conservatively sequentially since both files land in one commit batch):
   - File: `frontend/src/styles/components.css`
   - Line anchor: after line 257 (last existing line, closing the `.map-marker::before` block)
   - Content: verbatim from D-15 / UI-SPEC §Component Contract (see "Code Examples" above)
   - Verify: `grep -c 'map-cluster-icon' frontend/src/styles/components.css` returns `1`; `npm run build` (in `frontend/`) exits 0.
   - Commit: `style(63-W0): add .map-cluster-icon glassmorphism bubble CSS (MAPCLU-01/02 visual contract)`
3. **Create `63-VALIDATION.md` shell** (pre-populate with SC1..SC5 rows; actual probe content written during manual QA — see Validation Architecture section below).
   - Commit: `docs(63): scaffold 63-VALIDATION.md with SC1..SC5 manual-QA rubric`

**Gate criteria for Wave 1:** `frontend/node_modules/leaflet.markercluster` exists AND `frontend/package.json` contains the dep entry AND `.map-cluster-icon` selector exists in `components.css`.

### Wave 1 — Constants + Helpers + Refs (pure additions, no behaviour wire)

**Goal:** Introduce all new module-level symbols + refs in `ThreatMapPage.jsx`. These are passive — referenced but not yet called.

**Tasks:**
1. **Add imports at top of `ThreatMapPage.jsx`:**
   - File: `frontend/src/pages/ThreatMapPage.jsx`
   - Line anchor: between current line 2 (`import L from 'leaflet'`) and line 3 (`import { useLeaflet } from ...`)
   - Insert:
     ```js
     import 'leaflet.markercluster';                              // D-03 side-effect — attaches L.markerClusterGroup
     import 'leaflet.markercluster/dist/MarkerCluster.css';        // D-02, D-16 Option A
     ```
   - Verify: `grep -c "leaflet.markercluster" frontend/src/pages/ThreatMapPage.jsx` returns `2`; `grep -q "MarkerCluster.Default.css" frontend/src/pages/ThreatMapPage.jsx` returns non-zero (pattern NOT present); Vite `npm run build` clean.
2. **Add `CLUSTER_THRESHOLD` constant:**
   - Line anchor: after current line 43 (`const STORAGE_KEY = 'aqua-tip:panels-collapsed';`)
   - Insert: `const CLUSTER_THRESHOLD = 500;`
   - Verify: `grep -q "const CLUSTER_THRESHOLD = 500" frontend/src/pages/ThreatMapPage.jsx`.
3. **Add `buildClusterIcon` helper:**
   - Line anchor: after current line 27 (closing brace of `buildIcon`) and before current line 29 (`function addHighlightPulse`)
   - Insert verbatim from D-14 / "Code Examples" above.
   - Verify: `grep -q "function buildClusterIcon" frontend/src/pages/ThreatMapPage.jsx` AND `grep -q "cluster.getChildCount" frontend/src/pages/ThreatMapPage.jsx`.
4. **Add `CLUSTER_OPTIONS` module constant (planner discretion per CONTEXT.md):**
   - Line anchor: after `CLUSTER_THRESHOLD` line (same block)
   - Insert verbatim from "Code Examples" — the options object.
   - Verify: `grep -q "chunkedLoading: true" frontend/src/pages/ThreatMapPage.jsx` AND `grep -q "zIndexOffset: -100" frontend/src/pages/ThreatMapPage.jsx`.
5. **Add two refs:**
   - Line anchor: after current line 67 (`const markerInstancesRef = useRef(new Map()); // Map<id, L.Marker>`)
   - Insert:
     ```js
     const markerGroupRef = useRef(null);           // D-08 — single container ref
     const activeLayerModeRef = useRef(null);       // D-09 — 'plain' | 'cluster' | null
     ```
   - Verify: `grep -c "markerGroupRef\|activeLayerModeRef" frontend/src/pages/ThreatMapPage.jsx` returns ≥ 2.

**Gate criteria for Wave 2:** Vite build green; module loads in dev server; no TypeErrors (all new symbols are defined but unused — warning-level, not error-level, in Vite).

Commit: `feat(63-W1): add cluster constants + helpers + refs in ThreatMapPage (MAPCLU scaffold)`

### Wave 2 — Layer-Swap Integration (THE LOAD-BEARING EDIT)

**Goal:** Wire the new symbols into live behaviour. This is the wave where MAPCLU-01..05 actually lights up.

**Tasks:**
1. **Modify existing `useEffect([markers])` reconciliation:**
   - File: `frontend/src/pages/ThreatMapPage.jsx`
   - Line anchor: lines 82-117 (existing reconciliation effect)
   - Changes:
     - (a) Prepend lazy-init guard at top of effect body (inside the `if (!map) return` early-exit but above the `for (const marker of markers)` loop) — implements D-12.
     - (b) Replace line 96 `instance.addTo(map)` → remove `.addTo(map)` from the `L.marker(...)` call; on the following line, call `markerGroupRef.current.addLayer(instance)`. Net: the `L.marker(...)` creation and the `addLayer` call become two statements.
     - (c) Replace line 113 `map.removeLayer(instance)` → `markerGroupRef.current.removeLayer(instance)`.
   - Verify:
     - `grep -q "markerGroupRef.current.addLayer(instance)" frontend/src/pages/ThreatMapPage.jsx`
     - `grep -q "markerGroupRef.current.removeLayer(instance)" frontend/src/pages/ThreatMapPage.jsx`
     - `grep -q "instance.addTo(map)" frontend/src/pages/ThreatMapPage.jsx` returns NOTHING (pattern removed from reconciliation effect — note `addHighlightPulse` keeps its `.addTo(map)` and is untouched).
2. **Insert new `useEffect([bufferSize])` layer-swap effect:**
   - Line anchor: immediately after the existing `useEffect([markers])` closing at line 117; BEFORE the existing unmount cleanup at line 121.
   - Body: the 8-step swap sequence from D-10 / "Code Examples" Pattern 1 (above).
   - Verify: `grep -c "desired === activeLayerModeRef.current" frontend/src/pages/ThreatMapPage.jsx` returns ≥ 1; `grep -q "markerClusterGroup(CLUSTER_OPTIONS)" frontend/src/pages/ThreatMapPage.jsx`.
3. **Extend unmount cleanup effect:**
   - Line anchor: lines 121-132 (existing unmount effect)
   - Changes: after the `instances.clear()` at line 130, insert the D-13 tear-down block (see "Code Examples" above).
   - Verify: `grep -q "markerGroupRef.current = null" frontend/src/pages/ThreatMapPage.jsx` AND `grep -q "activeLayerModeRef.current = null" frontend/src/pages/ThreatMapPage.jsx`.

**Post-wave verification:**
- `cd frontend && npm run build` — clean build, no warnings about `MarkerCluster.Default.css`.
- `git diff --stat frontend/src/hooks/useThreatStream.js frontend/src/hooks/useThreatMapBuffer.js` — MUST return empty (v6.1 hook lock preserved, per D-25).
- No new files created in `frontend/src/hooks/` or `frontend/src/components/threat-map/`.

Commit: `feat(63-W2): wire markerGroupRef + [bufferSize] layer-swap effect (MAPCLU-01..05)`

### Wave 3 — Manual QA Walk + VALIDATION.md

**Goal:** Execute the SC1..SC5 manual QA probe rows; record outcomes in `63-VALIDATION.md`.

**Tasks:**
1. **Manual QA session (human or agent-with-browser):**
   - Boot local dev: `cd frontend && npm run dev` → http://localhost:5173/threat-map
   - Execute each probe row from `63-VALIDATION.md` (see Validation Architecture §"Phase Requirements → Test Map" below for the exact mapping).
   - Record PASS/FAIL + any DevTools screenshots in `63-VALIDATION.md`.
2. **Post-QA dev-lint:**
   - Verify browser console shows no red errors during normal operation at bufferSize=1000.
   - Verify DevTools Performance tab: at bufferSize=2000 with initial SSE burst, no frame drops below 40fps (MAPCLU-04 / SC4).
3. **Commit validation outcomes:**
   - `docs(63): manual QA walk complete — SC1..SC5 PASS (MAPCLU-01..05 satisfied)`

**If any SC fails:** file a blocker, do NOT mark Phase 63 complete.

---

## File-by-File Change Inventory (with current line numbers)

| File | Current State | Phase 63 Edit | Exact Line Anchor |
|------|---------------|---------------|-------------------|
| `frontend/package.json` | 29 lines; `dependencies` block lines 11-28; `leaflet` at line 19 | Add `"leaflet.markercluster": "^1.5.3"` entry alphabetically (between `leaflet` and `lucide-react`) | Line 19-20 boundary (npm install handles this, but planner should verify the entry lands in alpha order) |
| `frontend/package-lock.json` | Already tracked since initial commit; currently does NOT contain `leaflet.markercluster` | Regenerated entirely by `npm install`; adds ~50 lines for the new dep subtree | npm-managed; do not hand-edit |
| `frontend/src/styles/components.css` | 257 lines; `.map-marker` block lines 242-257 | Append `.map-cluster-icon` block | After line 257 (file currently ends with closing `}` of `.map-marker::before`); insert blank line + comment + CSS block |
| `frontend/src/pages/ThreatMapPage.jsx` | 241 lines; current structure: imports 1-10, blank 11-12, buildIcon 14-27, addHighlightPulse 29-41, STORAGE_KEY 43, component 45-240 | 5 coordinated edits (see below) | See table below |
| `frontend/src/hooks/useLeaflet.js` | 73 lines; single `import 'leaflet/dist/leaflet.css'` at line 1 | **No edit** if D-16 Option A (recommended); insert `import 'leaflet.markercluster/dist/MarkerCluster.css'` at line 2 if D-16 Option B | Line 1-2 boundary (Option B only) |

### `ThreatMapPage.jsx` Detailed Edit Map

| # | Edit | Current Line | Insert/Modify Location |
|---|------|--------------|------------------------|
| 1 | Add `import 'leaflet.markercluster';` side-effect + `import 'leaflet.markercluster/dist/MarkerCluster.css';` | 2 → 3 boundary | Between existing line 2 (`import L from 'leaflet';`) and line 3 (`import { useLeaflet } ...`). Two new lines. |
| 2 | Add `function buildClusterIcon(cluster) { ... }` helper | 27 → 29 boundary | Between existing line 27 (closing `}` of `buildIcon`) and line 29 (`function addHighlightPulse`). Insert with a preceding blank line. ~8 lines. |
| 3 | Add `const CLUSTER_THRESHOLD = 500;` + `const CLUSTER_OPTIONS = { ... };` module constants | After line 43 | Immediately after `const STORAGE_KEY = 'aqua-tip:panels-collapsed';`. ~11 lines (1 threshold + 10 options block). |
| 4 | Add `markerGroupRef` + `activeLayerModeRef` refs | After line 67 | Immediately after `const markerInstancesRef = useRef(new Map()); // Map<id, L.Marker>`. 2 new lines. |
| 5a | In reconciliation effect (lines 82-117): prepend lazy-init guard | Inside effect body, after line 86 (`const nextIds = new Set(...)`) and before line 89 (`// 1. ADD + UPDATE: ...`) | Insert the D-12 lazy-init block. ~15 lines. |
| 5b | Modify line 96 `L.marker([...], {...}).addTo(map)` → split into creation + addLayer | Line 96 | Replace `const instance = L.marker([marker.lat, marker.lng], { icon, interactive: false }).addTo(map);` with two statements: `const instance = L.marker([marker.lat, marker.lng], { icon, interactive: false });` and `markerGroupRef.current.addLayer(instance);`. Net +1 line. |
| 5c | Modify line 113 `map.removeLayer(instance)` → `markerGroupRef.current.removeLayer(instance)` | Line 113 | One-token swap. |
| 6 | Insert new `useEffect([bufferSize])` layer-swap effect | After line 117 (closing `}` of reconciliation effect) and before line 119 (blank line + line 120 comment `// Unmount cleanup`) | Insert the 8-step D-10 sequence in a new `useEffect`. ~45 lines. |
| 7 | Extend unmount cleanup (lines 121-132): after `instances.clear()` at line 130 | After line 130 | Insert the D-13 tear-down block. ~5 lines. |

**Total estimated net line delta:** `ThreatMapPage.jsx` grows by ~85 lines (from 241 to ~326); `components.css` grows by ~18 lines (from 257 to ~275); no other file grows materially. `package-lock.json` gains ~50 lines from the dep subtree.

---

## Validation Architecture

> Per `.planning/config.json`, `workflow.nyquist_validation: true`. Section required.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | **None (manual QA only)** — project has no test framework; D-30 and CLAUDE.md §"Gotchas" confirm. |
| Config file | N/A |
| Quick run command | `cd frontend && npm run build` (Vite build is the only automated correctness gate) |
| Full suite command | Same — `cd frontend && npm run build` + human manual QA walk of `63-VALIDATION.md` |
| Phase gate | Vite build green + `63-VALIDATION.md` SC1..SC5 all PASS |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| MAPCLU-01 | Cluster bubbles render with dark-theme custom icon when `bufferSize > 500`; no white default icons visible | manual — SC1 | `cd frontend && npm run build` (establishes build-time correctness; visual requires browser) | ❌ Wave 0 — create `63-VALIDATION.md` SC1 probe row |
| MAPCLU-02 | Custom `iconCreateFunction` matches glassmorphism theme + click-to-zoom works + spiderfy at max zoom | manual — SC1 (icon styling) + SC2 (click interaction) | Same build gate + DevTools click | ❌ Wave 0 — create `63-VALIDATION.md` SC2 probe row |
| MAPCLU-03 | Threshold crossing (100 ↔ 1000 ↔ 500 ↔ 1000 ↔ 100) swaps cleanly — no double-render, no blank map, no position jump | manual — SC3 (5-press stress) | Build gate + DevTools Elements inspection | ❌ Wave 0 — create `63-VALIDATION.md` SC3 probe row |
| MAPCLU-04 | `bufferSize=2000` + initial SSE burst remains interactive; no frame drops < 40fps in Chrome Performance | manual — SC4 (performance trace) | Build gate + Chrome Performance recording | ❌ Wave 0 — create `63-VALIDATION.md` SC4 probe row |
| MAPCLU-05 | Cluster bubbles below z-1000 overlay panels (z-index verification + panel-slide-over-cluster visual) | manual — SC5 | Build gate + DevTools computed-style inspection | ❌ Wave 0 — create `63-VALIDATION.md` SC5 probe row |

**63-VALIDATION.md probe row template (planner transcribes verbatim per row):**

```markdown
## SC{N} — {requirement summary}

**Requirement:** MAPCLU-{N} — {verbatim from REQUIREMENTS.md}

**Setup:**
1. {localStorage / URL / env precondition}
2. Reload `/threat-map`
3. Wait {N} seconds for SSE snapshot + fill

**Probe:**
| Step | Action | Expected | Observed (fill during QA) |
|------|--------|----------|----------------------------|
| 1 | {concrete DevTools / visual check} | {exact expected string or visual} | ☐ PASS / ☐ FAIL |
| 2 | {concrete action} | {expected} | ☐ PASS / ☐ FAIL |

**Result:** ☐ PASS / ☐ FAIL

**DevTools artefact (if FAIL):** {screenshot path or HAR capture}
```

### Per-Requirement Probe Rows (draft — planner refines)

**SC1 (MAPCLU-01 + MAPCLU-02 icon styling):**
1. Setup: `localStorage.setItem('aqua-tip:threat-map-buffer-size', '"1000"')`; reload `/threat-map`; wait 60s for ≥200 markers.
2. Zoom out to global view (zoom=2).
3. Probe 1: DevTools Elements → find any `.map-cluster-icon` element → computed style `background` is `rgba(15, 17, 23, 0.8)` and `border-radius: 50%`. **Expected:** match.
4. Probe 2: Visually inspect the map → all cluster bubbles are dark semi-transparent circles with numeric counts in monospace. **No white or blue circular icons anywhere on the map.** **Expected:** no white defaults.
5. Probe 3: Grep source `grep -q 'MarkerCluster.Default.css' frontend/src/` returns exit-1 (pattern NOT found). **Expected:** clean.

**SC2 (MAPCLU-02 interaction):**
1. Setup: same as SC1.
2. Probe 1: Click any cluster bubble at zoom=2. **Expected:** smooth `flyTo` animation zooms the map to the cluster's bounds; cluster disappears and child markers / sub-clusters become visible.
3. Probe 2: Zoom to max zoom (19) on a pair of overlapping markers. **Expected:** spiderfy fires; radial SVG legs drawn; child markers fan out.
4. Probe 3: DevTools Console → add `map.on('click', () => console.log('MAP_CLICK_LEAK'))` in DevTools Sources, then click a cluster. **Expected:** zoom-to-bounds fires but `MAP_CLICK_LEAK` does NOT print (PITFALL-08 mitigation verified).

**SC3 (MAPCLU-03 layer swap):**
1. Setup: `bufferSize=100` initial; wait for 100 markers.
2. Probe 1: Change dropdown 100 → 1000 → 500 → 1000 → 100 in 5 quick presses (~5 seconds total).
3. Probe 2: After each press, DevTools Elements → `.leaflet-marker-pane` has at most one child layer container of each type. **Expected:** never two `L.layerGroup` + `L.markerClusterGroup` simultaneously.
4. Probe 3: During the swap frames (inspect in DevTools Performance recording), no frame shows the tile layer with zero markers. **Expected:** no blank frame.
5. Probe 4: Pick one specific marker's lat/lng before the swap; verify it's at the same pixel position after the swap (no position jump). **Expected:** identical coordinates.

**SC4 (MAPCLU-04 chunked loading):**
1. Setup: clear localStorage; set `aqua-tip:threat-map-buffer-size` to `"2000"`; reload.
2. Probe 1: DevTools Performance tab → start recording → wait 60s for snapshot + SSE fill.
3. Probe 2: Stop recording. FPS graph should not dip below 40fps during the initial burst load. **Expected:** sustained 40+ fps.
4. Probe 3: During the fill, scroll the feed panel and hover over `BufferSizeControl`. **Expected:** UI responds immediately, no spinner freeze.

**SC5 (MAPCLU-05 z-index):**
1. Setup: `bufferSize=1000`; wait for clusters to appear.
2. Probe 1: DevTools Elements → `.map-cluster-icon` → computed `z-index` < 1000. **Expected:** < 1000 (Leaflet marker pane at z-600 + zIndexOffset -100 = effective z-500).
3. Probe 2: Collapse overlay panels; trigger left panel peek (hover left edge of map). **Expected:** panel slides in OVER cluster bubbles at every frame; no bubble visibly floats above the panel.
4. Probe 3: Expand overlay panels (click PanelToggle). **Expected:** panels fully cover their designated area; no cluster bubble bleeds through.

### Sampling Rate

- **Per task commit:** `cd frontend && npm run build` (Vite build green → no import/syntax/CSS errors).
- **Per wave merge:** Same build + visual smoke check in browser (load `/threat-map` at default `bufferSize=100`; confirm no console errors and map renders).
- **Phase gate:** All SC1..SC5 PASS in `63-VALIDATION.md` before `/gsd-verify-work`.

### Wave 0 Gaps

- [ ] `63-VALIDATION.md` — the file does not yet exist in `.planning/phases/63-frontend-marker-clustering/`. Must be created in Wave 0 with SC1..SC5 probe rows as drafted above.
- [ ] No framework install required (D-30).

*No additional gaps — existing Vite + browser infrastructure covers all phase requirements.*

---

## Project Constraints (from CLAUDE.md)

Relevant directives the planner MUST enforce:

| Directive | Source | Phase 63 Application |
|-----------|--------|----------------------|
| React 19 + Vite 7, ESM, no TypeScript | CLAUDE.md §"Tech Stack" | All new code is `.jsx`/`.js`; no `.ts`/`.tsx` files. No TypeScript imports or type annotations. |
| No tests exist | CLAUDE.md §"Gotchas" | Phase 63 ships no new tests; manual QA only per D-29/D-30. |
| No linter/formatter configured | CLAUDE.md §"Gotchas" | No lint gate in CI; executor self-enforces project style (2-space indent, single quotes, no semicolons before dedent). |
| All data mocked in `data/mock-data.js` — no API calls | CLAUDE.md §"Gotchas" | Not applicable to `/threat-map` — this page is LIVE (uses real SSE). Phase 63 does not touch mock data. |
| CSS split across 4 files in `styles/` | CLAUDE.md §"Project Structure" | `.map-cluster-icon` goes in `components.css` (D-15) — correct file per the animations/components/glassmorphism/main split. |
| Dark theme only; tokens in `tailwind.config.js` | CLAUDE.md §"Design System" | `.map-cluster-icon` CSS uses rgba literals that match `surface #0F1117 @ 0.8`, `border #1E2030 @ 0.8`, `text-primary #E8EAED` — no new tokens added. |
| `font-mono` (JetBrains Mono) for numeric content | CLAUDE.md §"Fonts" | Cluster count rendered in `'JetBrains Mono', monospace` at 12px weight 600 — compliant. |
| Globe component heavy — memo + DPR capping | CLAUDE.md §"Gotchas" | Not applicable (threat map uses Leaflet, not `cobe`). |
| No TypeScript → all `.jsx`/`.js` | CLAUDE.md §"Gotchas" | All new Phase 63 symbols are plain JS. |

Additional constraints inherited from `.planning/STATE.md`:
- **v6.1 hook lock:** `useThreatStream.js` and `useThreatMapBuffer.js` are byte-frozen. Phase 63 must not modify either. Verified by `git diff --stat` returning empty for both files post-wave 2.
- **One new dep per v6.1 milestone** — already budgeted: `leaflet.markercluster@1.5.3`. Phase 64/65/66 must resume zero-new-deps rule.
- **PITFALL-01** (stale closure in SSE) — not touched by Phase 63 (SSE effect not modified).
- **PITFALL-06** (cluster layer leak on mode toggle) — actively mitigated via D-08/D-10 single-ref swap.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | `npm install`, Vite build, dev server | ✓ (assumed — project already builds in Phase 62) | (project-relative, use engines if pinned) | None — blocker if missing |
| npm | Dependency install | ✓ (assumed) | bundled with Node | None |
| `leaflet` (existing) | `leaflet.markercluster` peer dep | ✓ | `^1.9.4` in `frontend/package.json` line 19; satisfies peer `^1.3.1` | N/A (already installed) |
| Modern browser with `backdrop-filter` support | `.map-cluster-icon` glassmorphism rendering | ✓ (Chrome/Firefox/Safari all support since 2020; `-webkit-` prefix included per D-15) | N/A | Graceful degradation: on unsupported browsers, bubble renders solid `rgba(15,17,23,0.8)` without blur — acceptable visual |
| SSE connection to backend | Markers to cluster | ✓ (assumed — Phase 59/60/61/62 all verified live) | N/A | If SSE disconnects, buffer persists; clustering still works on existing markers |
| Chrome DevTools Performance tab | SC4 manual QA probe | ✓ (any modern Chromium) | N/A | Firefox Performance panel or Safari Web Inspector Timelines as fallback |

**Missing dependencies with no fallback:** None — all infrastructure is assumed already present from Phase 62.

**Missing dependencies with fallback:** `backdrop-filter` unsupported (rare; pre-2020 browsers) — bubble still renders, just without blur. Acceptable per browser support policy (CLAUDE.md does not pin minimum browser versions).

---

## Security Domain

> `security_enforcement` not explicitly set in `.planning/config.json` → treated as enabled. Scope is narrow: Phase 63 installs one MIT-licensed, widely-used npm package with zero runtime deps and introduces one new CSS class. The surface area for security issues is small but non-zero.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no | Phase 63 adds no auth surface; `/threat-map` route's auth is unchanged (AppLayout-wrapped, existing session cookie gate). |
| V3 Session Management | no | No session handling in phase scope. |
| V4 Access Control | no | No access-control decisions; cluster visibility is a UI concern, not a permission concern. |
| V5 Input Validation | **yes (narrow)** | Cluster count is an integer from `cluster.getChildCount()` — library-controlled; trusted. But executor must ensure the count is NOT interpolated into HTML in a way that admits injection if the library ever changes return type. Current template `${count}` with `count` being an integer is safe (numeric coercion via template literal is injection-immune). No user input reaches this path. |
| V6 Cryptography | no | No crypto in phase scope. |
| V7 Error Handling / Logging | yes (narrow) | Layer-swap errors must not leak to console.error in production. The try/catch wrapping `map.removeLayer` in unmount cleanup (Phase 61 precedent) is the pattern; the new `markerGroupRef` teardown must use the same guard. |
| V11 Business Logic | no | N/A |
| V12 Files and Resources | no | N/A |
| V13 API | no | N/A |
| V14 Configuration | **yes (narrow)** | `MarkerCluster.Default.css` must NOT be imported — this is both a visual-theme requirement (D-02) and a supply-chain discipline (minimise attack surface; every imported CSS file is code the browser loads). Explicit verification grep in Wave 1 enforces this. |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| HTML injection via `L.divIcon` `html` template | Tampering | `${count}` is an integer; JavaScript template literals coerce non-string values to string via `String()`. Integer coercion cannot produce angle brackets. **Verified safe.** If the library's `getChildCount()` ever returns a non-integer (e.g., a user-controlled string), this becomes an injection vector — but no such change is documented and the library hasn't released a new version since 2021. |
| Supply-chain compromise via `leaflet.markercluster` | Tampering / Elevation of Privilege | Pin exact version in `package.json` (`^1.5.3` — caret admits 1.5.x patches only per D-01); verify via `npm ls` that no unexpected transitive deps landed; project's npm registry is public (not a private registry, so no registry-substitution risk). MIT license (verified via `npm view`). |
| Cross-origin CSS loaded from CDN | Information Disclosure | N/A — `MarkerCluster.css` is loaded from `node_modules` and bundled by Vite; no CDN fetch. |
| DOM pollution via `L.markerClusterGroup` side effects | Tampering | The side-effect import `import 'leaflet.markercluster'` modifies the global `L` namespace (already imported). This is documented library behaviour; no other globals are touched. Verified by reading library source: only `L.markerClusterGroup` and `L.MarkerClusterGroup` are attached. |
| `cluster.getChildCount()` returning unexpected type | Tampering | If executor wants belt-and-braces: `const count = Number(cluster.getChildCount()) || 0;` — but unnecessary given 5 years of stable library behaviour. Planner's discretion; default is the D-14 verbatim form. |

---

## Assumptions Log

> All `[ASSUMED]` claims extracted for executor verification. This phase has few assumptions because CONTEXT.md already locked most decisions — the assumptions below are about runtime behaviour of the library + environment that weren't directly verified in this research session.

| # | Claim | Section | Risk if Wrong | Verification Command / Probe |
|---|-------|---------|---------------|------------------------------|
| A1 | `leaflet.markercluster@1.5.3` has zero runtime `dependencies` — only a peer dep on `leaflet@^1.3.1`. | Standard Stack; D-04 | If wrong, installing it pulls in N transitive deps the roadmap didn't budget for (v6.1 dep constraint). | **VERIFIED via `npm view leaflet.markercluster@1.5.3 dependencies` returning empty + `peerDependencies` returning `{ leaflet: '^1.3.1' }` during this research session (2026-04-21).** Executor re-verifies post-install via `npm ls leaflet.markercluster`. |
| A2 | `chunkedLoading: true` with default `chunkInterval: 200ms` is sufficient for 2000 markers without frame drops below 40fps. | Code Examples; D-20; SC4 | If wrong, MAPCLU-04 fails; executor may need to tune `chunkInterval` lower (50ms) or `chunkDelay` differently. | `[ASSUMED]` based on library docs + research sample specs; empirical verification only via SC4 Performance trace during Wave 3 manual QA. Fallback if FAIL: tune `chunkInterval: 100` and re-test. |
| A3 | Vite 7 + React 19 correctly bundles `leaflet.markercluster` side-effect + CSS imports without config changes. | D-33; Don't Hand-Roll | If wrong, `npm run build` fails or produces incorrect bundle. | `[ASSUMED]` based on Vite 7 default behaviour with `node_modules/*.css` imports. Verification: `cd frontend && npm run build` in Wave 0 post-install + Wave 2 post-integration. Both must be clean. |
| A4 | `L.markerClusterGroup(...)` does not fire spurious `clusterclick` events during layer swap (e.g., during `removeLayer`). | P-06 | If wrong, the swap's detach step (`oldGroup.off('clusterclick')`) may come too late and the handler fires after the ref has been nulled. | `[ASSUMED]` based on Leaflet event model (remove operations are synchronous). Unlikely to be wrong; if observed, mitigation is to null-check inside the handler: `if (!markerGroupRef.current) return;`. |
| A5 | `L.Marker` instances retain their icon + latLng + options across `removeLayer`/`addLayer` transitions between containers. | Pattern 1; D-26; MAPCLU-03 visual "no position jump" rule | If wrong, markers would visually flicker or reset position during swap. | `[VERIFIED: github.com/Leaflet/Leaflet.markercluster README — "markers can be re-added via addLayer without recreating"]`. `L.Marker` `removeLayer` only detaches from parent; all instance state remains. Phase 61 precedent — Phase 62 layer migration would have crashed otherwise. |
| A6 | `MarkerCluster.css` (NOT Default.css) contains ONLY the minimum positioning + pane CSS needed for the library to function — no visual cluster-icon styling. | D-02 | If wrong, clusters would still inherit some default styling even without Default.css, producing visual conflicts with `.map-cluster-icon`. | `[VERIFIED: reading library source]` — `MarkerCluster.css` contains `.leaflet-cluster-anim` transition rule and spiderfy leg SVG path styling only. Cluster icon rendering is entirely delegated to `iconCreateFunction`. Confirmed by reading CONTEXT.md research notes + library README. |
| A7 | Vite 7's default code-splitting puts `leaflet.markercluster` + its CSS in the `ThreatMapPage.jsx` route chunk (not the main bundle). | Architectural Responsibility Map; P-09 | If wrong, every route downloads the cluster library — minor perf regression, not a correctness issue. | `[ASSUMED]` based on Vite default behaviour with lazy-loaded routes. The project's `App.jsx` routing pattern should be inspected — if `ThreatMapPage` is statically imported (not `React.lazy`), the chunk may merge into main. Verification: `cd frontend && npm run build` + inspect `dist/assets/*.js` chunk manifest. Low priority. |
| A8 | CONTEXT.md D-27's "package-lock.json is already an untracked file at the project root" refers to ROOT `./package-lock.json`, not `frontend/package-lock.json`. | P-02; File Inventory | If wrong (if D-27 actually meant `frontend/package-lock.json` is untracked), then this research has incorrect understanding and planner should treat `frontend/package-lock.json` as a NEW file. | **VERIFIED via `git ls-files frontend/package-lock.json` returning the path AND `git log -1 -- frontend/package-lock.json` returning commit `37a7c06` during this research session.** The `frontend/` lockfile is tracked; the root one is the untracked file D-27 referenced. See Pitfall P-02 for full treatment. |

**Assumption severity review:** A1, A5, A6, A8 are VERIFIED against live tool output or library source during this research session — executor can treat these as FACTS, not assumptions. A2, A3, A4, A7 are ASSUMED — executor should verify at the named checkpoints.

---

## Open Questions

1. **D-16 Option A vs Option B for CSS import location — planner's final call.**
   - What we know: A (`ThreatMapPage.jsx`) is recommended by CONTEXT.md and matches file-scoped-concerns pattern; B (`useLeaflet.js`) groups all Leaflet-family CSS.
   - What's unclear: No objective difference in bundle output (both result in the same Vite CSS chunk). Pure readability preference.
   - Recommendation: **Option A** — keeps all cluster-related imports in one file (`ThreatMapPage.jsx`) and reduces `useLeaflet.js`'s surface area. Matches the "file this change lives where it's consumed" project convention (per Phase 62 precedent). Planner decides in 63-01-PLAN.md.

2. **Factoring the 8-step swap sequence into a helper function vs inlining — planner's final call.**
   - What we know: Inline is acceptable for a one-off; helper improves readability at ~45 lines of sequence.
   - What's unclear: No precedent either way — Phase 61 had a comparable multi-step reconciliation inlined in the effect; Phase 62 used pure inline effects.
   - Recommendation: **Inline** — the sequence runs in exactly one effect, reading all its inputs from the effect's closure (`bufferSize`, `markerGroupRef`, `activeLayerModeRef`, `markerInstancesRef`, `leafletMapRef`). Extracting to a helper would require passing all of these as parameters, inflating the signature. Inline + ASCII-art comment block matches Phase 61's D-11 reconciliation style.

3. **Should `CLUSTER_OPTIONS` be a `const` in module scope, or inlined at the `L.markerClusterGroup({...})` call?**
   - What we know: Inline is 9 object properties; extracting deduplicates nothing because only one call site (the layer-swap effect) constructs a cluster group.
   - What's unclear: Readability tradeoff — module-level named constant signals "this is a configuration contract"; inline signals "this is a one-time call argument."
   - Recommendation: **Module-level `const CLUSTER_OPTIONS`** — signals intent ("these are locked phase-63 contract values") and matches the D-18 phrasing ("explicit options object"). Placed adjacent to `CLUSTER_THRESHOLD` constant.

4. **How should the planner split work into separate plan files?**
   - What we know: Phase 61 used 3 plans (CSS scaffold, hook, page wiring). Phase 62 used 2 plans (component, wiring).
   - Recommendation: **2-3 plans** depending on wave cohesion:
     - Plan A (Wave 0): `63-01-PLAN.md` — install + CSS + VALIDATION.md scaffold.
     - Plan B (Wave 1 + Wave 2 merged): `63-02-PLAN.md` — all `ThreatMapPage.jsx` edits as a single plan (constants + helpers + refs + effects + unmount). Rationale: Wave 1 pure-addition task is small (~25 lines across 4 insertion points); splitting it from Wave 2 (the effect wiring) would force two commits touching the same file with the first commit leaving the file in a "symbols defined but unused" warning state.
     - Plan C (Wave 3): `63-03-PLAN.md` — manual QA walk recording PASS/FAIL for SC1..SC5 in VALIDATION.md.
   - Planner's final authority; above is research recommendation.

5. **Chrome Performance tracing at 2000 markers — what's the pass threshold for SC4?**
   - What we know: CONTEXT.md and UI-SPEC both say "no frame drops below 40fps during the initial burst load" as the pass bar.
   - What's unclear: Ambient frame rate on the dev machine baseline — if the user's machine can't sustain 60fps at rest, "40fps during burst" may already be the baseline rather than a degradation.
   - Recommendation: Record a baseline (at `bufferSize=100`) AND a test (`bufferSize=2000`) Performance trace. Pass if the test trace's minimum fps >= 40 AND the delta from baseline-minimum is < 20fps. Documented in 63-VALIDATION.md SC4 row.

---

## Sources

### Primary (HIGH confidence — verified in this session)

- **npm registry** via `npm view leaflet.markercluster@1.5.3 dependencies peerDependencies` (2026-04-21) — confirmed zero runtime deps, peer dep `leaflet: ^1.3.1`, license MIT, published 2021-10-18.
- **git metadata** via `git ls-files frontend/package-lock.json` + `git log -1 -- frontend/package-lock.json` — confirmed `frontend/package-lock.json` tracked since commit `37a7c06` (corrects CONTEXT.md D-27 confusion).
- **`frontend/src/pages/ThreatMapPage.jsx`** (live read, 241 lines) — all current line numbers for edit anchors verified.
- **`frontend/src/styles/components.css`** (live read, 257 lines) — `.map-marker` block confirmed at lines 242-257; append target line 258+ confirmed.
- **`frontend/package.json`** (live read, 29 lines) — `leaflet: ^1.9.4` at line 19; alpha-order insert position for new entry confirmed.
- **`frontend/src/hooks/useLeaflet.js`** (live read, 73 lines) — `leaflet.css` at line 1; Option B insert position at line 2 confirmed.
- **`.planning/phases/63-frontend-marker-clustering/63-CONTEXT.md`** — all 33 decisions read in full; mapped to requirements.
- **`.planning/phases/63-frontend-marker-clustering/63-UI-SPEC.md`** — all 6 dimensions PASS confirmed; CSS spec normative transcription verified.
- **`.planning/research/ARCHITECTURE.md` §2.2, §3** — cluster integration strategy, re-init layer swap, iconCreateFunction override pattern.
- **`.planning/research/PITFALLS.md` §PITFALL-05..08, 21** — cluster-specific pitfalls catalogued and mapped.
- **`.planning/ROADMAP.md`** — dependency version lock, key architectural notes, SC1..SC5 source.
- **`.planning/REQUIREMENTS.md`** — MAPCLU-01..05 verbatim requirements.
- **`.planning/STATE.md`** — v6.1 hook lock, Phase 61/62 lessons learned (especially CRLF grep).

### Secondary (MEDIUM confidence — verified against project precedent)

- Library API behaviour (`getChildCount()`, `on('clusterclick', ...)`, layer-swap semantics) — from `ARCHITECTURE.md` citing library README.
- Vite 7 `node_modules/*.css` bundling — assumed from Vite docs; verification deferred to Wave 0 build gate.
- React 19 effect-closure semantics for lazy-init pattern — standard React idiom; relies on React's guarantee that state is initialised before first effect runs.

### Tertiary (LOW confidence — flagged in Assumptions Log)

- `chunkInterval: 200ms` default being sufficient for 2000 markers without frame drops — Assumption A2; verify in SC4 probe.
- Vite 7 automatic code-splitting placing library into route chunk — Assumption A7; verify post-build.

---

## Metadata

**Confidence breakdown:**

- Standard stack: **HIGH** — npm registry verified for version + deps + peer deps; library is 5+ years mature with stable API.
- Architecture: **HIGH** — all decisions already locked in CONTEXT.md across 33 Ds; architecture research already exists in `research/ARCHITECTURE.md` and has been followed by Phase 61/62 successfully.
- Pitfalls: **HIGH** — cluster-specific pitfalls (PITFALL-05..08, 21) catalogued in research; sequence pitfalls (P-01..10) derived from Phase 61/62 lessons learned in STATE.md.
- Validation: **HIGH** — manual QA probe rows derived directly from SC1..SC5 and the observable behaviours described in UI-SPEC §"Visual Behaviour Contract" and §"Acceptance Cues Summary".
- Environment: **HIGH** — all dependencies already present from Phase 62; only net-new runtime is the library itself.

**Research date:** 2026-04-21

**Valid until:** 2026-05-21 (30 days — library is frozen at 1.5.3 since 2021; only exogenous risk is a React 19 or Vite 7 behaviour change, both stable stacks)

---

*Phase: 63-frontend-marker-clustering*
*Research prepared for: planner (gsd-planner) consumption*
*Primary input: CONTEXT.md (33 locked decisions) + UI-SPEC (6/6 PASS visual contract) — this research tightens edit anchors, wave ordering, and validation map on top.*
