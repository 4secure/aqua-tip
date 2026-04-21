# Phase 63: Frontend Marker Clustering - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-21
**Phase:** 63-frontend-marker-clustering
**Mode:** autonomous (discuss-phase --auto — recommended option auto-selected for every gray area)
**Areas discussed:** Dependency + Imports, Threshold + Constants, Layer Swap Architecture, Cluster Icon Styling, Cluster Group Options, Click Propagation, Package + Lockfile, Test Strategy

---

## Dependency + Imports

| Option | Description | Selected |
|--------|-------------|----------|
| Install `leaflet.markercluster@1.5.3` via `npm install --save` | Exact roadmap-locked version; pins `^1.5.3` range | ✓ |
| Use a CDN script tag in `index.html` | Bypasses bundler; no tree-shaking | |
| Fork + vendor the library into `frontend/src/vendor/` | Maximum control; no external supply-chain surface | |
| Use react-leaflet-cluster wrapper | Violates "native Leaflet API" convention + "one new dep only" rule | |

**User's choice:** Install `leaflet.markercluster@1.5.3` (auto — recommended; roadmap-locked).
**Notes:** The roadmap locks both the library AND the version. `MarkerCluster.css` only (skip `MarkerCluster.Default.css`) per roadmap Key Architectural Notes. JS side-effect import attaches `L.markerClusterGroup` to the existing `L` namespace.

---

## Threshold + Constants

| Option | Description | Selected |
|--------|-------------|----------|
| `CLUSTER_THRESHOLD = 500` module-level in `ThreatMapPage.jsx`, strict `>` comparison | Named constant; matches roadmap SC3 examples | ✓ |
| Hardcode `500` inline in comparison | Fragile; defers the drift problem | |
| Export `CLUSTER_THRESHOLD` from `BufferSizeControl.jsx` | Premature abstraction at N=1 consumer (Phase 62 D-04 punted this to Phase 63) | |
| Dynamic threshold driven by device pixel density | Over-engineered for v6.1 | |
| Use `>=` instead of `>` | Makes `bufferSize === 500` ambiguous in manual QA | |

**User's choice:** Module-level constant in `ThreatMapPage.jsx` with strict `>` (auto).
**Notes:** Phase 62's Claude's Discretion section explicitly anticipated Phase 63 owning this constant locally. Strict `>` keeps the 500 boundary itself in plain mode, matching the roadmap's example language.

---

## Layer Swap Architecture

| Option | Description | Selected |
|--------|-------------|----------|
| Single `markerGroupRef` + `activeLayerModeRef`, re-init on threshold crossing | PITFALL-06 mitigation; matches research ARCHITECTURE.md §3 re-init strategy | ✓ |
| Keep markers on both layers simultaneously, toggle visibility | Violates PITFALL-06 (double-render); memory doubles | |
| Live-toggle: move markers between groups without re-init | Leaflet internal state fragile when moving across containers | |
| Two separate refs, one per mode, switch which is "active" | Violates single-source-of-truth rule; easy to orphan | |

**User's choice:** Single `markerGroupRef` + re-init (auto — recommended; PITFALL-06 mandated).
**Notes:** Reconciliation effect writes to `markerGroupRef.current.addLayer(instance)` instead of `instance.addTo(map)`. Plain-mode uses `L.layerGroup()` in the same ref slot for API uniformity. Lazy-init on first `[markers]` effect run handles initial mode selection based on localStorage-restored bufferSize.

---

## Cluster Icon Styling

| Option | Description | Selected |
|--------|-------------|----------|
| Custom `.map-cluster-icon` in `components.css` (glassmorphism, violet/cyan tokens) | Matches dark design system; MAPCLU-01 | ✓ |
| Use `leaflet.markercluster` default CSS | White default icons; violates MAPCLU-01 ("no white default cluster icons") | |
| Tailwind utility chain inside `divIcon` HTML | Utilities don't apply to raw HTML strings injected into Leaflet panes | |
| Canvas-drawn cluster icons | Over-engineered; DOM-divIcon works fine | |

**User's choice:** Custom CSS block in `components.css` via `buildClusterIcon(cluster)` helper + `L.divIcon` with `className: ''` override (auto).
**Notes:** Mirrors Phase 61's `buildIcon(marker)` pattern exactly. CSS block spec'd with `rgba(15,17,23,0.8)` background (surface at 80%), `backdrop-filter: blur(8px)`, `border: 1px solid rgba(30,32,48,0.8)`, 32×32 circle, JetBrains Mono numeric, `text-primary #E8EAED`.

---

## Cluster Group Options

| Option | Description | Selected |
|--------|-------------|----------|
| `chunkedLoading: true`, `showCoverageOnHover: false`, `zIndexOffset: -100`, `spiderfyOnMaxZoom: true`, custom `iconCreateFunction` | Satisfies MAPCLU-01..05 + mitigates PITFALL-07 | ✓ |
| Use Leaflet defaults for every option | `showCoverageOnHover: true` default clashes with no-polygon design language; z-index default collides with overlay panels | |
| `disableClusteringAtZoom: 10` | Forces un-clustering at high zoom — unnecessary and conflicts with spiderfy | |
| `animate: false` | Strips the smooth spiderfy animation; unnecessary optimisation | |

**User's choice:** Full options object per D-18 (auto).
**Notes:** Options are spelled out explicitly (including defaults like `zoomToBoundsOnClick: true`) so future maintainers don't accidentally regress on behaviour if Leaflet changes a default.

---

## Click Propagation

| Option | Description | Selected |
|--------|-------------|----------|
| `clusterclick` handler with `L.DomEvent.stopPropagation(e.originalEvent)` | PITFALL-08 mitigation; idiomatic Leaflet | ✓ |
| Rely on Leaflet defaults | PITFALL-08 documents that `clusterclick` ALSO fires map click — needs explicit stop | |
| `e.stopPropagation()` on React-synthetic-event | Wrong event namespace; Leaflet uses native DOM events | |
| Don't handle; add map click guard instead | Scatters defensive logic; point-of-leak is the better fix location | |

**User's choice:** `clusterclick` handler with `L.DomEvent.stopPropagation` (auto).
**Notes:** Individual marker clicks are already silenced by Phase 61's `interactive: false`. Only clusters need the explicit guard.

---

## Package + Lockfile

| Option | Description | Selected |
|--------|-------------|----------|
| Commit `package.json` + `package-lock.json` together via `npm install --save` | Standard; lockfile becomes tracked | ✓ |
| Skip lockfile commit | Violates reproducible-install guarantees | |
| Switch to `npm ci` workflow | Requires lockfile checked-in first; chicken-and-egg | |
| Use `yarn.lock` instead | Project uses npm per the existing `package-lock.json` (untracked) | |

**User's choice:** `npm install leaflet.markercluster@1.5.3 --save`, commit both files together (auto).
**Notes:** Dedicated plan task in Wave 0 because the install blocks all subsequent code edits that import the library.

---

## Test Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Manual QA via `63-VALIDATION.md` checklist | Matches Phase 61/62 precedent; no test infra exists | ✓ |
| Install Vitest + jsdom + Leaflet stubs | Out of scope for v6.1 (would be its own phase) | |
| Install Playwright for E2E cluster tests | Even further out of scope | |
| Skip verification | Violates GSD protocol | |

**User's choice:** Manual QA via `63-VALIDATION.md` (auto — recommended; matches precedent).
**Notes:** SC1–SC5 mapped to concrete manual QA rows including Chrome Performance tab checks for MAPCLU-04, z-index computed-style checks for MAPCLU-05, and layer-swap DOM inspection for MAPCLU-03.

---

## Claude's Discretion

The following were noted in CONTEXT.md as "planner's call":

- `buildClusterIcon` module scope vs separate file.
- CSS import location: `ThreatMapPage.jsx` (recommended A) vs `useLeaflet.js` (B).
- Cluster options as inline literal vs `const CLUSTER_OPTIONS = {...}` module constant.
- Layer-swap sequence as inlined effect vs `swapMarkerGroup()` helper function.
- Plain-mode container as `L.layerGroup()` (recommended for API uniformity) vs direct-to-map.
- Whether to run `npm run build` verification post-install.

## Deferred Ideas

- Custom cluster colour coding based on child severity composition → Phase 66 evaluation.
- Cluster hover tooltip with attack types → no tooltip primitive exists.
- Spiderfy tuning, ease curves → default is fine for v6.1.
- Coverage polygon on hover → no design tokens for it.
- Animated layer-swap transition → contradicts PITFALL-06 mitigation.
- `useCluster` custom hook → single consumer; extract at N≥2.
- Programmatic cluster tests (jsdom) → no test framework in project.
- Backend snapshot `?limit=` frontend wiring → pair with Phase 66 if needed.
- Exporting `CLUSTER_THRESHOLD` → single consumer; extract at N≥2.
- React-Leaflet / wrapper library → violates one-new-dep v6.1 rule.
