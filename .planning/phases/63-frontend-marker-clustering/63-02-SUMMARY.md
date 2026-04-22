---
phase: 63
plan: 02
status: complete
completed: 2026-04-22
commits:
  - 5394f9e
  - 6385cfd
requirements_delivered:
  - MAPCLU-01 (code-complete — dark-theme cluster bubbles via buildClusterIcon + iconCreateFunction)
  - MAPCLU-02 (code-complete — zoomToBoundsOnClick + spiderfyOnMaxZoom defaults, clusterclick stopPropagation)
  - MAPCLU-03 (code-complete — single markerGroupRef + D-10 8-step layer swap on threshold crossing)
  - MAPCLU-04 (code-complete — chunkedLoading:true + chunkProgress:null)
  - MAPCLU-05 (code-complete — zIndexOffset:-100 places clusters below z-1000 panels)
files_modified:
  - frontend/src/pages/ThreatMapPage.jsx
---

# Phase 63 Plan 02 — Summary

**Objective:** Wire the cluster layer-swap into `ThreatMapPage.jsx` — THE load-bearing edit for Phase 63. Merged research Wave 1 (constants + helpers + refs) and Wave 2 (layer-swap integration) into a single plan per RESEARCH.md §Open Questions #4.

## Line Count Evolution

| Stage | Line count | Delta |
|-------|-----------|-------|
| Pre-plan (post Phase 62-02) | 241 | — |
| Post Task 1 (passive insertions) | 271 | +30 |
| Post Task 2 (load-bearing integration) | 359 | +88 |
| **Net Plan 02 insertion** | **+118 lines** | |

## What Shipped

### Task 1 — Passive scaffolding (commit 5394f9e; +30 lines)

Five coordinated insertions; all new symbols defined but unused at this commit's end — Vite treated them as dead code but bundled `leaflet.markercluster` into the module graph:

1. **Imports block** — `import 'leaflet.markercluster'` (side-effect JS — attaches `L.markerClusterGroup` to the `L` namespace) + `import 'leaflet.markercluster/dist/MarkerCluster.css'` (D-16 Option A — CSS side-effect in the page, not `useLeaflet.js`). No `MarkerCluster.Default.css` import anywhere (roadmap lock + D-02).
2. **`buildClusterIcon(cluster)` helper** — module scope, between `buildIcon` and `addHighlightPulse`. Uses `cluster.getChildCount()` + `L.divIcon({ className: '', html: '<div class="map-cluster-icon">${count}</div>', iconSize: [32, 32] })` per D-14.
3. **`CLUSTER_THRESHOLD = 500`** module-level constant — sibling of the existing `STORAGE_KEY` (D-05 + D-06 strict `>` comparison).
4. **`CLUSTER_OPTIONS` constant** — full 8-key object: `iconCreateFunction`, `showCoverageOnHover: false`, `chunkedLoading: true`, `chunkProgress: null`, `zoomToBoundsOnClick: true`, `spiderfyOnMaxZoom: true`, `zIndexOffset: -100`, `animate: true` (D-18).
5. **Two new refs** — `markerGroupRef = useRef(null)` (D-08) and `activeLayerModeRef = useRef(null)` (D-09), inserted immediately after `markerInstancesRef`.

### Task 2 — Load-bearing integration (commit 6385cfd; +88 lines)

Three coordinated edits lit up MAPCLU-01..05 at the code level:

**Edit A — Reconciliation `useEffect([markers])` modified in three places:**
  - **A1:** Lazy-init guard prepended — when `markerGroupRef.current == null`, derive mode from `bufferSize > CLUSTER_THRESHOLD`, create `L.markerClusterGroup(CLUSTER_OPTIONS)` or `L.layerGroup()`, attach `clusterclick` handler (cluster mode only, with `e.originalEvent` guard per D-23 + P-06), `map.addLayer`, swap refs. Effect dep array remains `[markers]` — `bufferSize` read as closed-over value per D-12 (safe because React initialises state before effects run).
  - **A2:** ADD path swapped: `L.marker(...).addTo(map)` → `const instance = L.marker(...); markerGroupRef.current.addLayer(instance);` (D-11).
  - **A3:** REMOVE path swapped: `map.removeLayer(instance)` → `markerGroupRef.current.removeLayer(instance)` (D-11).
  - `addHighlightPulse` + its own `.addTo(map)` / `map.removeLayer(marker)` are UNTOUCHED — highlight pulse bypasses cluster group by design so it reads above cluster bubbles on click.

**Edit B — New `useEffect([bufferSize])` swap effect inserted as a SIBLING of the existing persistence `useEffect([bufferSize])` (not merged):**
  - 8-step D-10 re-init sequence: bounce-guard → detach cluster listeners → remove instances from old container → remove old group from map → create new container → attach cluster listeners if needed → add new group → re-add all instances → swap refs.
  - `activeLayerModeRef` check short-circuits equal-mode bounces (e.g., 1000 ↔ 2000 both cluster — no swap).
  - Instance DOM is preserved across swap: `L.Marker` detaches from parent, keeps icon/latLng/options, re-attaches to new container (D-26 marker-count conservation).
  - Effect touches ONLY Leaflet refs — no state changes, no SSE awareness (D-25 no-reconnect proof chain).

**Edit C — Unmount cleanup extended per D-13:**
  - After the existing per-instance `map.removeLayer(instance)` loop + `instances.clear()`, added `try { map.removeLayer(markerGroupRef.current); } catch { /* map disposed */ }` + reset both new refs to `null`.

## Invariants Verified

| Invariant | Status |
|-----------|--------|
| `grep -q "import 'leaflet.markercluster';" ThreatMapPage.jsx` | ✅ |
| `grep -q "import 'leaflet.markercluster/dist/MarkerCluster.css';"` | ✅ |
| `grep -rq "MarkerCluster.Default.css" frontend/src/` | ✅ exit 1 (not found — roadmap lock) |
| `grep -q "const CLUSTER_THRESHOLD = 500"` | ✅ |
| `grep -q "function buildClusterIcon"` + `grep -q "cluster.getChildCount"` | ✅ |
| `grep -q "zIndexOffset: -100"` (exact value, not `-50` or `-200`) | ✅ |
| `grep -q "chunkedLoading: true"` + `grep -q "chunkProgress: null"` | ✅ |
| `grep -q "markerGroupRef = useRef(null)"` + `grep -q "activeLayerModeRef = useRef(null)"` | ✅ |
| `grep -q "markerGroupRef.current.addLayer(instance)"` (ADD path swapped) | ✅ |
| `grep -q "markerGroupRef.current.removeLayer(instance)"` (REMOVE path swapped) | ✅ |
| `grep -q "desired === activeLayerModeRef.current"` (bounce-guard) | ✅ |
| `grep -q "L.markerClusterGroup(CLUSTER_OPTIONS)"` + `grep -q "L.layerGroup()"` | ✅ both present |
| `grep -q "newGroup.on('clusterclick'"` (D-23 handler attached) | ✅ |
| `grep -q "if (e.originalEvent) L.DomEvent.stopPropagation(e.originalEvent)"` (P-06 guard) | ✅ |
| `grep -q "oldGroup.off('clusterclick')"` (D-10 Step 1 detach) | ✅ |
| `grep -q "map.removeLayer(markerGroupRef.current)"` (D-13 unmount tear-down) | ✅ |
| `grep -c ", \[bufferSize\])"` (two sibling effects: persistence + swap) | **✅ = 2** |
| v6.1 hook-lock: `git diff --stat frontend/src/hooks/useThreatStream.js frontend/src/hooks/useThreatMapBuffer.js` | ✅ empty |
| Phase 62 component untouched: `git diff --stat BufferSizeControl.jsx LeftOverlayPanel.jsx` | ✅ empty |
| `useLeaflet.js` untouched (D-16 Option A chosen) | ✅ empty |
| `animations.css` untouched (cluster is static) | ✅ empty |
| Scope: only `ThreatMapPage.jsx` modified this plan (2 commits) | ✅ |
| Task 1 Vite build: `✓ built in 1m 6s`, no warnings | ✅ |
| Task 2 Vite build: `✓ built in 1m 25s`, no warnings | ✅ |

## Architectural Notes

- **No SSE reconnect on bufferSize change (D-25 machine-verifiable):** the new `[bufferSize]` swap effect closes over only Leaflet refs (`markerGroupRef`, `activeLayerModeRef`, `markerInstancesRef`, `leafletMapRef`). `useThreatStream.js` + `useThreatMapBuffer.js` `git diff --stat` both empty — `bufferSize` is never read inside either hook's SSE/events effect closure, so `EventSource` never re-subscribes.
- **Marker DOM conservation across layer swaps (D-26):** every `L.Marker` instance in `markerInstancesRef.current` is attached to exactly one container after any swap iteration. Instances are detached from the old group, never recreated. `_bufferState` tagging from Phase 61 D-13 persists unchanged.
- **Strict > 500 threshold locked (D-06 + P-07):** `bufferSize > CLUSTER_THRESHOLD` (never `>=`). At `bufferSize === 500`, clustering is OFF. This makes the 100 ↔ 500 toggle a no-op for the swap effect, while 500 ↔ 1000 triggers it.
- **No forbidden CSS import (D-02 + P-01):** `MarkerCluster.Default.css` is not imported anywhere in `frontend/src/`. `.map-cluster-icon` from Plan 01 fully owns the cluster-bubble visual layout via `className: ''` override on the divIcon.

## Deviations From Spec

**Zero deviations from D-10 normative sequence.** The 8-step swap sequence was transcribed verbatim from CONTEXT.md D-10 + RESEARCH.md §Architecture Patterns Pattern 1. Comment numbering in the code matches the step numbering in the decision spec.

**Zero deviations from UI-SPEC §Visual Behaviour Contract.** Layer-swap visual contract (MAPCLU-03 / SC3) preserved: no double-render, no blank frame, no marker position jump. Validated at code level; manual QA in Plan 03.

## Ready for Plan 03

This plan code-completes MAPCLU-01..05. The Vite build is green. The hook-lock is preserved byte-identical. The `.map-cluster-icon` CSS (Plan 01) and the `buildClusterIcon` + `L.markerClusterGroup(CLUSTER_OPTIONS)` runtime (Plan 02) are both in place.

Plan 03 is the manual QA walk of `63-VALIDATION.md` SC1..SC5 — browser-based verification that the visual + interaction + performance + z-index contracts hold at runtime. No code edits expected in Plan 03 (pure quality gate; `autonomous: false` per plan frontmatter).
