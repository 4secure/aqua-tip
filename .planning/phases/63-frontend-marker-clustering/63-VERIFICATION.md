---
phase: 63
slug: frontend-marker-clustering
status: verified
verified: 2026-05-01
code_complete: true
manual_qa_pending: false
manual_qa_signed_off: 2026-05-01
requirements:
  - MAPCLU-01
  - MAPCLU-02
  - MAPCLU-03
  - MAPCLU-04
  - MAPCLU-05
commits:
  - 39e211c
  - 34c5525
  - 518948c
  - 5394f9e
  - 6385cfd
  - b7eb446
  - 0f3a769
  - 4caa82c   # post-phase enhancement: size-by-count + color-by-dominant-category, no count badge
---

# Phase 63 — Frontend Marker Clustering — Verification

**Status:** `verified` (2026-05-01) — all machine-verifiable gates pass and human manual QA passed against the live deploy at https://tip.aquasecure.ai/threat-map. Original SC2..SC5 confirmed; SC1 was superseded by post-phase enhancement (commit `4caa82c`) that replaced the count-badge contract with size-by-count + color-by-dominant-category — verified via NEW-A and NEW-B probes.

## Post-Phase Enhancement (commit `4caa82c`, 2026-05-01)

User-requested visual change after Phase 63 shipped:
- **No count text** in cluster bubbles (replaced badge contract from MAPCLU-02)
- **Stepped size buckets:** 2–10 → 24px (`--xs`), 11–50 → 32px (`--sm`), 51–200 → 44px (`--md`), 201+ → 56px (`--lg`)
- **Dominant-category color:** tally child `_color`, pick most common (severity tiebreak red > amber > violet > cyan); rgba palette mirrors `.map-buffer-marker--{color}` for cross-element parity
- L.Marker tagged with `_color` at construction (mirrors existing `_bufferState` instance-tagging pattern)
- Treated as freeform quick enhancement (not Phase 63.1) per user direction; logged here for traceability

## Phase Goal (from ROADMAP.md)

> When buffer size exceeds 500, overlapping markers automatically cluster with count badges styled to the dark theme; crossing back under 500 reverts to individual markers cleanly.

## Goal-Backward Analysis

| Must-Have (from goal + SC1..SC5) | Evidence at Code Level | Status |
|----------------------------------|-----------------------|--------|
| Cluster bubbles render with dark-theme styling when `bufferSize > 500` | `.map-cluster-icon` CSS (Plan 01) + `buildClusterIcon` helper + `iconCreateFunction: buildClusterIcon` in `CLUSTER_OPTIONS` (Plan 02) + `L.markerClusterGroup(CLUSTER_OPTIONS)` created when `desired === 'cluster'` | ✅ code-complete |
| Clicking a cluster zooms the map to show children | `zoomToBoundsOnClick: true` in `CLUSTER_OPTIONS` (library default, explicit per D-21) | ✅ code-complete |
| Threshold crossing swaps the active layer cleanly (no double-render, no blank, no position jump) | Single `markerGroupRef` + `activeLayerModeRef` bounce-guard + D-10 8-step re-init sequence (Plan 02 Edit B) + `markerInstancesRef` preserved (marker DOM conserved across swap per D-26) | ✅ code-complete |
| 1000+ markers do not freeze the browser tab | `chunkedLoading: true` + `chunkProgress: null` in `CLUSTER_OPTIONS` (Plan 02 D-20) | ✅ code-complete (SC4 FPS measurement requires browser) |
| Cluster bubbles appear below z-1000 overlay panels | `zIndexOffset: -100` in `CLUSTER_OPTIONS` (Plan 02 D-22) | ✅ code-complete (SC5 computed-style check requires browser) |

## Machine-Verifiable Gates (all PASS)

1. **Dependency installed correctly:** `npm ls leaflet.markercluster` → `leaflet.markercluster@1.5.3`, zero transitive deps, no UNMET PEER DEPENDENCY. `frontend/node_modules/leaflet.markercluster/dist/MarkerCluster.css` present.
2. **Forbidden import absent:** `grep -rq "MarkerCluster.Default.css" frontend/src/` returns exit 1 (roadmap lock + D-02).
3. **v6.1 hook-lock preserved byte-identical:** `git diff --stat frontend/src/hooks/useThreatStream.js frontend/src/hooks/useThreatMapBuffer.js` returns empty at HEAD.
4. **Phase 62 consumer untouched:** `git diff --stat frontend/src/components/threat-map/BufferSizeControl.jsx frontend/src/components/threat-map/LeftOverlayPanel.jsx` returns empty (D-07 consumer isolation).
5. **`useLeaflet.js` untouched:** D-16 Option A chosen (CSS import in page, not hook).
6. **Strict > 500 threshold:** `grep -q "CLUSTER_THRESHOLD = 500" frontend/src/pages/ThreatMapPage.jsx` present; no `>=` anywhere in comparison (D-06 + P-07).
7. **MAPCLU-04 foundation:** `chunkedLoading: true` + `chunkProgress: null` literals present.
8. **MAPCLU-05 foundation:** `zIndexOffset: -100` literal present (not -50/-200/0).
9. **Two sibling `[bufferSize]` effects:** persistence (Phase 62) + swap (Phase 63). `grep -c ", \[bufferSize\])" frontend/src/pages/ThreatMapPage.jsx` returns 2.
10. **Vite production build green:** `cd frontend && npm run build` → `✓ built in ~45s`, no CSS parse errors, no missing-module errors (chunk-size warning pre-existing since Phase 57).

## Files Modified (entire phase)

| File | Role | Lines changed |
|------|------|--------------|
| `frontend/package.json` | add leaflet.markercluster@^1.5.3 | +1 |
| `frontend/package-lock.json` | resolved lockfile entry | +10 |
| `frontend/src/styles/components.css` | `.map-cluster-icon` CSS block | +22 |
| `frontend/src/pages/ThreatMapPage.jsx` | imports + constants + helper + refs + lazy-init + reconciliation swap + new `[bufferSize]` effect + unmount extension | +118, -4 |

Total: 4 files modified, ~151 lines added, ~4 removed across 7 commits.

## Files NOT Modified (invariants preserved)

- `frontend/src/hooks/useThreatMapBuffer.js` — v6.1 lock
- `frontend/src/hooks/useThreatStream.js` — v6.1 lock (PITFALL-01)
- `frontend/src/hooks/useLeaflet.js` — D-16 Option A
- `frontend/src/components/threat-map/BufferSizeControl.jsx` — Phase 62 consumer untouched
- `frontend/src/components/threat-map/LeftOverlayPanel.jsx` — cluster logic is page-level
- `frontend/src/components/threat-map/RightOverlayPanel.jsx` — no cluster semantics
- `frontend/src/styles/animations.css` — buffer-marker lifecycle only (cluster is static)
- `frontend/src/styles/glassmorphism.css` — no changes
- `frontend/src/styles/main.css` — no changes
- `frontend/tailwind.config.js` — no new tokens

## Architectural Decisions Realized

- **D-01..D-04 (Dependency):** `leaflet.markercluster@1.5.3` locked, `MarkerCluster.css` only imported, side-effect JS import, zero transitive deps.
- **D-05..D-07 (Threshold):** `CLUSTER_THRESHOLD = 500` module-level, strict `>` comparison, local constant (not exported from `BufferSizeControl.jsx`).
- **D-08..D-10 (Layer swap architecture):** Single `markerGroupRef` + `activeLayerModeRef` + D-10 8-step re-init sequence with bounce-guard.
- **D-11..D-13 (Effect modifications):** Reconciliation ADD/REMOVE paths swapped to `markerGroupRef.current.addLayer/removeLayer`, lazy-init on first `[markers]` run, unmount extended with `map.removeLayer(markerGroupRef.current)`.
- **D-14..D-17 (Cluster icon styling):** `buildClusterIcon` at module scope with `className: ''` override + `.map-cluster-icon` CSS in `components.css` (not `animations.css`) with 32×32 glassmorphism spec + no `MarkerCluster.Default.css` import.
- **D-18..D-22 (Cluster group options):** Full 8-key object with `chunkedLoading: true`, `showCoverageOnHover: false`, `zoomToBoundsOnClick: true`, `spiderfyOnMaxZoom: true`, `zIndexOffset: -100`, `animate: true`, `chunkProgress: null`.
- **D-23..D-24 (Click propagation):** `clusterclick` handler with `L.DomEvent.stopPropagation(e.originalEvent)` + P-06 `e.originalEvent` guard; individual marker clicks already silenced by Phase 61 `interactive: false`.
- **D-25..D-26 (No-reconnect + marker conservation):** `useThreatStream.js` + `useThreatMapBuffer.js` byte-identical confirmed; marker DOM preserved across layer swaps via `markerInstancesRef` single source of truth.
- **D-27..D-28 (Packaging):** `package.json` + `package-lock.json` committed together in Wave 1; root-level `./package-lock.json` untouched.
- **D-29..D-33 (Conventions):** Manual QA via `63-VALIDATION.md` (no new test framework); no TypeScript; no new hooks; Vite 7 build clean.

## Human Verification Required

**Five SC probe rows staged in `63-VALIDATION.md`:**

1. **SC1** — Dark-theme cluster icons (MAPCLU-01 + MAPCLU-02 icon styling): `bufferSize=1000`, reload, zoom out, verify computed-style tokens + no white default icons.
2. **SC2** — Click-to-zoom + spiderfy + PITFALL-08: click cluster → zoom; max zoom → spiderfy; cluster click does not propagate to map click.
3. **SC3** — Clean layer swap on 500 threshold: 5-press stress 100→1000→500→1000→100; at most one active container at any point; no blank frame; no position jump; no SSE reconnect.
4. **SC4** — Responsive at 1000–2000: `bufferSize=2000`, Performance tab recording, FPS ≥40 during initial burst, UI responsive during fill.
5. **SC5** — Z-index hierarchy: computed `z-index < 1000` on `.map-cluster-icon`; overlay panels always render above clusters.

**Start the walk:** `cd frontend && npm run dev` → `http://localhost:5173/threat-map` → walk each SC row in `63-VALIDATION.md`.

## Status Routing

- **Code level:** ✅ PASSED — all requirements code-complete, all 10 machine-verifiable gates green, build clean.
- **Browser QA:** ⏳ PENDING — requires human sign-off on SC1..SC5.
- **Phase outcome:** `human_needed` — consistent with Phase 61 + Phase 62 which are also "code-complete, manual QA pending" per their VALIDATION.md files.
