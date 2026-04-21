---
phase: 63
slug: frontend-marker-clustering
status: draft
shadcn_initialized: false
preset: none
created: 2026-04-21
---

# Phase 63 — UI Design Contract

> Visual and interaction contract for the Threat Map marker-clustering integration. Scoped to a single new visual surface — the `.map-cluster-icon` bubble rendered by `leaflet.markercluster`'s custom `iconCreateFunction` when `bufferSize > 500` — plus the z-index, layer-swap, and spiderfy behaviours that surround it. Everything else on the map (Phase 61 buffer-marker CSS, Phase 62 `BufferSizeControl` dropdown, overlay panels, counters, feed, status pill, topbar, basemap) is **out of scope** for this phase and MUST NOT be restyled.

**Scope note (integration, not redesign):** Phase 63 installs `leaflet.markercluster@1.5.3` and teaches the Phase 61 reconciliation effect to write markers into a conditionally-swapped `L.markerClusterGroup` instead of `L.layerGroup`. The visual surface it introduces is minimal — one CSS class, one 32×32 glassmorphism bubble with a numeric child count — but the behavioural contract is load-bearing: layer swap at the 500-threshold must be pixel-clean (no ghost markers, no blank frames), and cluster icons must stay below the glassmorphism overlay panels at all times. The executor's job is to match the dark-theme vocabulary established by `.glass-card-static` while letting Leaflet's built-in spiderfy/zoom-to-bounds behaviour handle interaction.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (no shadcn; project is React 19 + Tailwind 3 hand-rolled) |
| Preset | not applicable |
| Component library | `leaflet.markercluster@1.5.3` (new dep — v6.1 roadmap-locked as the only new dep for this milestone). Plus hand-rolled CSS for the custom cluster bubble. |
| Icon library | not applicable (cluster bubble renders a numeric count, not a glyph) |
| Font | `font-mono` (JetBrains Mono) for the numeric count inside the bubble — mirrors the project convention of monospace for data/numeric content (dashboard stats, IP addresses, buffer-size dropdown values) |

**Existing neighbourhood (reuse, do not modify):**
- `frontend/src/styles/glassmorphism.css` §`.glass-card-static` (lines 17–23) — canonical source of the dark-glassmorphism surface vocabulary (`rgba(15, 17, 23, 0.7)` + `backdrop-filter: blur(20px)` + `1px solid rgba(30, 32, 48, 0.8)`). The `.map-cluster-icon` mirrors these tokens at matching-but-not-identical values (0.8 alpha instead of 0.7; 8px blur instead of 20px) tuned for a small on-map surface.
- `frontend/src/styles/components.css` §`.map-marker` (line 242) — direct neighbour block. `.map-cluster-icon` appends immediately below it, following the established file's on-map marker vocabulary.
- `frontend/src/styles/animations.css` §`.map-buffer-marker*` (Phase 61 append, lines 173+) — **reused verbatim without modification.** Cluster bubbles visually dominate at clustered zoom; individual buffer-marker dots appear when the user zooms in past the spiderfy threshold. The two class families coexist on the same `markerPane`.
- `tailwind.config.js` — `surface #0F1117`, `border #1E2030`, `text-primary #E8EAED`, `violet #7A44E4`, `cyan #00E5FF`. All cluster-icon colours are hex-derived from these tokens (as `rgba()` literals inside the CSS block, because Tailwind utilities don't apply inside `L.divIcon` `html` strings).
- CartoDB dark basemap (`#262626`) — the background every cluster-bubble colour decision is validated against.

---

## Spacing Scale

This phase ships one new on-map surface (the cluster bubble) plus z-index adjustments. The project's general spacing scale is inherited unchanged:

| Token | Value | Usage in Phase 63 |
|-------|-------|-------------------|
| xs | 4px | — (not used) |
| sm | 8px | Cluster bubble `backdrop-filter: blur(8px)` radius; bubble shadow vertical offset `0 2px 8px` |
| md | 16px | — (not used) |
| lg | 24px | — (not used) |
| xl | 32px | Cluster bubble dimension — `width: 32px; height: 32px;` (matches `iconSize: [32, 32]` on the `L.divIcon`) |
| 2xl | 48px | — (not used) |
| 3xl | 64px | — (not used) |

**Cluster-specific dimensions (this phase):**

| Element | Size | Rationale |
|---------|------|-----------|
| Cluster bubble (`.map-cluster-icon`) | 32px × 32px | Large enough to hold a 3-digit count (e.g., "247") at `text-sm font-mono` without crowding; small enough that 10+ clusters on-screen at zoom 2.5 don't visually dominate the basemap. Matches research ARCHITECTURE.md §3 sample (`iconSize: [32, 32]`). |
| Border | 1px | `1px solid rgba(30, 32, 48, 0.8)` — the hairline border vocabulary inherited from `.glass-card-static`; defends bubble edge against `#262626` tiles without introducing a chromatic ring. |
| Border radius | 50% | Perfect circle — signals "aggregate / group" distinct from the 6px round-dot individual markers. |
| Backdrop-blur radius | 8px | Glassmorphism parity with on-map surface (lighter blur than the 20px panel blur because the bubble is small and a heavier blur smudges detail at this size). |
| Box-shadow vertical offset | 2px | `0 2px 8px rgba(0, 0, 0, 0.3)` — subtle lift over the dark tile layer. Phase 62 `BufferSizeControl` uses no shadow (it sits inside a card); the cluster bubble is on top of a busy map and needs the lift. |
| Spiderfy leg stroke | Leaflet default (~1px, `#222`) | Browser-drawn SVG path at max zoom when child markers fan out. Not overridden — dim against `#262626` tiles is the "quiet background" aesthetic. |

**Exceptions:** the 32px bubble dimension is on the XL token (Tailwind spacing-8), so no exception. The 8px blur radius and shadow offset are CSS-property values, not layout spacing — they don't participate in the 4/8/16/24/32 scale conceptually.

---

## Typography

The cluster bubble is the only surface introduced by this phase that contains text — a numeric child count.

| Role | Class / Value | Size | Weight | Line Height | Usage |
|------|---------------|------|--------|-------------|-------|
| Cluster count | `font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 600;` | 12px | 600 (semibold) | 1 (implicit — single line, no descender/ascender stacking) | The numeric child count rendered inside the 32×32 bubble. Monospace for numeric consistency (matches the project's global dashboard numerics pattern and `BufferSizeControl`'s option values). Weight 600 for legibility at small size against the semi-transparent surface. |
| All other roles | n/a | n/a | n/a | n/a | Phase 63 introduces no labels, headings, body text, or display text. Phase 61 markers already have no text; Phase 62 `BufferSizeControl` label is untouched. |

**Rationale for font weight 600 (not 400):** at 12px on a semi-transparent backdrop (`rgba(15, 17, 23, 0.8)` over potentially varied basemap tiles), a regular-weight numeric can visually smear. 600 renders crisp strokes without tipping into "heavy" territory — the bubble should read as data, not as a button.

**Rationale for font-mono, not font-sans:** the count is numeric data. The project convention is monospace for all numeric content (dashboard stats, IP addresses, credit counts, `BufferSizeControl` option values). Sans-serif would break the pattern for no gain.

---

## Color

**Strategy: reuse the existing dark-glassmorphism vocabulary verbatim.** No new colour tokens are introduced. The cluster bubble lives in the same palette as `.glass-card-static` — the same project surface now applied to an on-map 32px circle.

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | CartoDB dark basemap `#262626` (unchanged) + `surface` `#0F1117` at 0.8 α via cluster bubble background | Map canvas + cluster-bubble interior |
| Secondary (30%) | `border` `#1E2030` at 0.8 α as the bubble's 1px border | Bubble edge definition |
| Accent (10%) | none introduced in Phase 63 | Cluster bubbles are deliberately **neutral** — the severity-coloured accent (violet/cyan/red/amber) remains reserved for Phase 61 buffer-marker dots. Aggregates are a counting abstraction; assigning a severity colour to a bubble whose children mix severities would mislead. (Colour-coded clusters are explicitly deferred — see 63-CONTEXT.md "Deferred Ideas".) |
| Destructive | n/a | No destructive actions on the map surface in this phase |

**Cluster bubble colour spec (normative — executor transcribes verbatim into `components.css`):**

| Property | Value | Source / Rationale |
|----------|-------|-------|
| `background` | `rgba(15, 17, 23, 0.8)` | `surface` `#0F1117` at 80% α — mirrors `.glass-card-static` surface at a slightly higher opacity (0.8 vs 0.7) because the bubble sits over `#262626` tiles, not another glass panel, and needs more coverage to read legibly. |
| `backdrop-filter` | `blur(8px)` | Glassmorphism parity; lighter blur than `.glass-card-static`'s 20px because the bubble surface is small (32px) and a heavy blur smudges tile detail behind. |
| `-webkit-backdrop-filter` | `blur(8px)` | Safari/WebKit parity — required for the glass effect to render on Safari. Mirrors the `.glass-*` family's paired prefix convention in `glassmorphism.css`. |
| `border` | `1px solid rgba(30, 32, 48, 0.8)` | `border` `#1E2030` at 80% α — mirrors `.glass-card-static`. |
| `border-radius` | `50%` | Perfect circle. |
| `color` (text) | `#E8EAED` | `text-primary` — numeric count colour, same as `BufferSizeControl` select value. |
| `box-shadow` | `0 2px 8px rgba(0, 0, 0, 0.3)` | Subtle lift over the busy tile layer. Half-opacity black (not a coloured glow) so the shadow never competes with severity-coloured buffer markers below it. |
| Spiderfy leg stroke (Leaflet default) | `#222` (~1px) | Not overridden. Dim against `#262626` tiles — visible but quiet. Matches the "quiet background" aesthetic intentionally. |

**Accent reserved for:** nothing new in Phase 63. Phase 61 severity-coloured buffer-marker dots remain the sole accent consumer on the map surface. Phase 62 `BufferSizeControl` focus ring remains the only accent in the left panel. Phase 63 does NOT grow the accent share — the cluster bubble is dominantly neutral (dark surface + grey border + white text).

**Colour parity rule:** if a future patch changes `surface`, `border`, or `text-primary` in `tailwind.config.js`, the `.map-cluster-icon` rgba values MUST update in lockstep to keep the dark-glassmorphism contract intact. The same rule already governs `.glass-card-static` and Phase 61's `.map-buffer-marker` family.

---

## Copywriting Contract

**Not applicable to Phase 63.** The only text surface introduced by this phase is the numeric child count inside the cluster bubble, which is generated dynamically by Leaflet's `cluster.getChildCount()`. There is no static copy, no CTA, no label, no empty state, no error state, no tooltip, no confirmation dialog.

| Element | Copy |
|---------|------|
| Primary CTA | n/a (no CTA introduced; clusters are directly clickable — zoom-to-bounds via `zoomToBoundsOnClick: true`) |
| Empty state heading | n/a (empty map state is handled by existing `ThreatMapStatus` "Connecting…" indicator, untouched) |
| Empty state body | n/a |
| Error state | n/a (SSE errors surface in existing `connected` flag → `ThreatMapStatus`; cluster layer fails closed to `L.layerGroup` plain mode) |
| Destructive confirmation | n/a (no destructive user actions on the map surface in this phase) |
| Cluster count (dynamic) | `{N}` where N = `cluster.getChildCount()` — rendered as a string via `L.divIcon` `html` template. No formatting: `247` not `247 markers`, `1000` not `1,000`. Bare integer, always. |
| Tooltip on cluster hover | **none** — `showCoverageOnHover: false` disables the default coverage-polygon tooltip (per 63-CONTEXT.md D-19). No replacement tooltip is introduced. |

**Forbidden copy** (do not introduce any of these in the cluster bubble template):
- Pluralisation ("247 markers", "247 events")
- Thousands separator ("1,000" — would break the `font-mono` width alignment at different counts)
- Emoji or icons inside the count
- The words "cluster", "group", or "aggregate" — the visual bubble is self-evident; language adds noise
- Helper text below the cluster

---

## Component Contract

### `.map-cluster-icon` (new CSS class)

**Location:** `frontend/src/styles/components.css` — appended immediately below the existing `.map-marker` block (line 242+).

**Complete CSS specification (normative — executor transcribes verbatim):**
```css
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
  /* NO transitions, NO animations — static visual. Leaflet's internal
     spiderfy/cluster-open animation handles all transition behaviour
     at the layer level. */
}
```

**Executor notes:**
- No `:hover` state. Cursor-pointer is the sole hover affordance. Rationale: adding a hover transition on the bubble would collide with Leaflet's internal `.leaflet-cluster-anim` transforms during spiderfy (PITFALL-05 belt-and-braces, even though we skip `MarkerCluster.Default.css`).
- No `@media (prefers-reduced-motion: reduce)` override. The bubble has no animation to disable. Phase 61's `prefers-reduced-motion` block for `.map-buffer-marker*` remains untouched and continues to govern arrival/eviction motion.
- No `transition` property. The bubble is either present (cluster mode, zoomed out) or absent (spiderfied / zoomed in / plain mode). Swap is instantaneous by design — re-init strategy per 63-CONTEXT.md D-10.

### `buildClusterIcon(cluster)` helper (new module-scope function)

**Location:** `frontend/src/pages/ThreatMapPage.jsx` — module scope, immediately after the existing `buildIcon(marker)` helper at line 17–27 (per 63-CONTEXT.md D-14).

**Shape:**
```js
function buildClusterIcon(cluster) {
  const count = cluster.getChildCount();
  return L.divIcon({
    className: '',
    html: `<div class="map-cluster-icon">${count}</div>`,
    iconSize: [32, 32],
  });
}
```

**Executor notes:**
- `className: ''` override is **load-bearing**. Leaflet defaults to `leaflet-marker-icon` which carries absolute positioning at the DOM level that would fight our CSS. Matches the Phase 61 `buildIcon` pattern exactly.
- `iconSize: [32, 32]` MUST match the CSS `width`/`height`. Leaflet anchors the icon to the cluster centroid using half of `iconSize`; a mismatch would render the bubble off-centre.
- No JSDoc required (Phase 61 precedent: `buildIcon` has none). Informal style is the project convention.

### Cluster group options object (new inline configuration)

**Location:** `frontend/src/pages/ThreatMapPage.jsx` — passed to `L.markerClusterGroup({...})` inside the layer-swap sequence (per 63-CONTEXT.md D-18).

**Shape (normative):**
```js
{
  iconCreateFunction: buildClusterIcon,     // custom dark-theme icon (MAPCLU-01)
  showCoverageOnHover: false,               // no coverage polygon (D-19)
  chunkedLoading: true,                     // responsiveness at 1000+ (MAPCLU-04)
  chunkProgress: null,                      // silent — no console warnings
  zoomToBoundsOnClick: true,                // MAPCLU-02 (explicit, library default)
  spiderfyOnMaxZoom: true,                  // default — explicit for clarity
  zIndexOffset: -100,                       // below z-[1000] panels (MAPCLU-05)
  // Defaults left untouched (listed so planner does not accidentally override):
  //   disableClusteringAtZoom: undefined   (cluster at every zoom)
  //   removeOutsideVisibleBounds: true     (default — purge off-screen clusters)
  //   animate: true                        (default — smooth spiderfy)
  //   chunkInterval: 200ms                 (default — no perf evidence to tune)
}
```

---

## Visual Behaviour Contract

### Cluster-mode visibility (MAPCLU-01, MAPCLU-02)

| Condition | Visual |
|-----------|--------|
| `bufferSize <= 500` (plain mode) | Zero cluster bubbles on the map. Individual `.map-buffer-marker--settled` 6px dots render per Phase 61 spec. |
| `bufferSize > 500` (cluster mode) AND markers overlap at current zoom | Cluster bubbles (32×32 glassmorphism circles with numeric count) replace overlapping individual dots. Non-overlapping individual dots continue to render normally. |
| `bufferSize > 500` AND user zooms to max zoom | Spiderfy fires — overlapping markers fan out on radial legs drawn as SVG paths by Leaflet (stroke: default `#222`). Individual dot markers become clickable again. |
| User clicks a cluster at any non-max zoom | Map zooms to the cluster's `getBounds()` (Leaflet's `zoomToBoundsOnClick: true` default). Child markers become visible as the map zooms. |
| `bufferSize` crosses the 500 threshold (500 ↔ 1000 or 500 ↔ 100) | Instantaneous layer swap. Existing markers remain visible in their correct positions before and after — **no gap, no duplication, no blank frame**. See "Layer Swap Visual Contract" below for the normative SC3 visual rule. |

**Acceptance cue (SC1):** At `bufferSize = 1000` with ≥200 markers on the map, zooming out to global view shows numeric cluster bubbles in the project's dark glassmorphism style. **No white default cluster icons are ever visible.** If any white/blue circle appears, the `MarkerCluster.Default.css` import was incorrectly included (per 63-CONTEXT.md D-02 prohibition) or the `iconCreateFunction` was omitted.

**Acceptance cue (SC2):** Clicking any cluster triggers a smooth map zoom animation; the cluster disappears and child markers (or smaller sub-clusters) become visible. No JS error fires; the right-panel feed and left-panel counters are unaffected.

### Layer swap visual contract (MAPCLU-03, MAPCLU-04)

The threshold crossing at `bufferSize = 500` is the single most visually sensitive moment of this phase. The contract:

| Frame | Visual State |
|-------|-------|
| Frame N (pre-swap) | User has `bufferSize = 100`. Map shows 100 individual `.map-buffer-marker--settled` dots in a `L.layerGroup`. |
| User opens `BufferSizeControl` dropdown and picks 1000 → Frame N+1 | `bufferSize` state updates to 1000. React re-renders `ThreatMapPage`. The `[bufferSize]` layer-swap effect fires. Leaflet swap sequence executes synchronously (per 63-CONTEXT.md D-10). |
| Frame N+2 (post-swap) | All 100 existing `L.Marker` instances now belong to the new `L.markerClusterGroup`. **Every marker instance is at its exact pre-swap `latLng`. No marker DOM was recreated.** If ≥2 markers overlap at current zoom, they visually cluster into a `.map-cluster-icon` bubble; otherwise they render as individual dots. |

**Normative visual rules (MAPCLU-03 / SC3):**
1. **No marker is rendered twice.** If the executor can produce a DevTools screenshot showing a single marker's `latLng` painted at the same screen position twice (once by the old layer, once by the new), PITFALL-06 was hit. The `markerGroupRef` single-container contract is being violated.
2. **No blank map.** If any frame during the swap shows the tile layer with zero markers (when the buffer has ≥1 marker), the swap was not atomic. The sequence in 63-CONTEXT.md D-10 must run synchronously within a single effect body.
3. **No position jump.** Individual markers must not visually move on swap. The `L.Marker` instances are re-parented (old container → new container) without re-creating DOM; their `latLng` is preserved. If a marker appears to "jump" position, the reconciliation effect was incorrectly recreating the `L.marker(...)` call instead of calling `.addLayer(existingInstance)`.
4. **Cluster appearance on the upward crossing.** When the user crosses from `bufferSize = 500` → `1000`, nearby markers that were standalone dots instantaneously become a cluster bubble (no fade, no ease). This is correct — the re-init strategy is instantaneous by design.
5. **Cluster dissolution on the downward crossing.** When the user crosses from `bufferSize = 1000` → `100`, any visible cluster bubbles instantaneously dissolve into their constituent dots (which then respect the new `100` cap, so eviction may fire if overcap). No dissolve animation.

**Acceptance cue (SC3):** Toggle dropdown `100 → 1000 → 500 → 1000 → 100` five times in quick succession. Dot/cluster count should match the new mode on every settle. DevTools Elements panel should show at most ONE child of the `markerPane` of each layer-container type (one `L.layerGroup` OR one `L.markerClusterGroup` at any moment, never both simultaneously).

**Acceptance cue (SC4 — chunked loading):** Set `bufferSize = 2000`, clear localStorage, reload. Wait for snapshot fill + ~60s of SSE stream. While markers are being added via `chunkedLoading: true`, the tab remains responsive — scrolling the panel feed works, hover animations fire smoothly, no frame drop below 40fps in Chrome Performance tab. `chunkInterval: 200` default (16ms yield per batch) is sufficient; no tuning.

### Spiderfy behaviour at max zoom

When the user zooms deep enough that a cluster still contains overlapping markers, Leaflet's `spiderfyOnMaxZoom: true` default fans out the children on radial legs. Visual contract:

| Property | Value |
|----------|-------|
| Leg stroke | Leaflet default (`#222`, ~1px SVG path) |
| Leg background | Tile layer (`#262626`) — legs are dim against it, visible but quiet |
| Child marker appearance during spiderfy | Individual `.map-buffer-marker--settled` dots at their true `latLng` (not radially distributed — Leaflet draws the legs as a visual hint while the dots remain at their actual coordinates) |
| Animation | Leaflet default `animate: true` (smooth fan-out over ~300ms) |
| Click-through | Clicking a spiderfied child dot does NOT re-fire `clusterclick` (Leaflet handles internally). Individual dots retain their `interactive: false` from Phase 61 D-18, so they silently ignore clicks — correct semantics; spiderfy is a visual reveal only, not an interactive drill-down. |

**No override of spiderfy styling.** The dim SVG legs against `#262626` match the "quiet background" aesthetic intentionally. Colouring the legs to match the severity palette would mislead (legs are connective tissue, not data).

**Acceptance cue:** At zoom level ≥ `maxZoom`, click a still-clustered bubble. Markers fan out with smooth animation; radial legs are visible but unobtrusive. Clicking a child dot is a no-op (silent — correct).

---

## Layering / Z-Index Contract (MAPCLU-05)

**Normative stack (bottom → top):**

| Layer | z-index | Phase 63 impact |
|-------|---------|-----------------|
| CartoDB dark tile layer | Leaflet tile pane (~200) | unchanged |
| Phase 61 buffer marker layer (`.map-buffer-marker*`) | Leaflet `markerPane` (~600) | unchanged |
| Phase 63 cluster bubble layer (`.map-cluster-icon`) | Leaflet `markerPane` (~600) + `zIndexOffset: -100` → **effective ~500** | **NEW** — explicitly offset BELOW the default marker pane baseline so cluster bubbles always render under the glassmorphism overlay panels at z-1000, even when Framer Motion creates a transform stacking context on panel entry. |
| Phase 61 click-highlight pulse (`.map-event-pulse--highlight`) | same pane, later-inserted-wins | unchanged — the highlight pulse still renders on top of cluster bubbles (it's added AFTER cluster reconciliation on click) |
| Phase 62 `BufferSizeControl` glass card | inside `LeftOverlayPanel` at `z-[1000]` | unchanged |
| Left/Right overlay panels (expanded + peek) | `z-[1000]` | unchanged — new cluster bubbles MUST stay below |
| Panel toggle button | `z-[1001]`-ish | unchanged |
| Native `<select>` picker (when `BufferSizeControl` is open) | browser-managed (escapes all CSS z-index) | unchanged |
| Topbar + sidebar (AppLayout) | app-wide | unchanged |

**Why `zIndexOffset: -100` (not 0, not -1000):**
- Leaflet's `.leaflet-marker-pane` default is z-600. Cluster icons at offset `-100` land at effective z-500 → comfortably below the z-1000 overlay panels with headroom.
- `-1000` would land at z-(-400) → below the tile pane (z-200) → bubbles invisible. Do not use.
- `0` (default) keeps bubbles at z-600 → exposed to PITFALL-07 z-index conflict if Framer Motion's transform on panel open creates a stacking context where the bubble can escape. Observed on some browser/Framer-Motion version combinations; `-100` is the belt-and-braces mitigation.

**Acceptance cue (SC5 / PITFALL-07):** DevTools Elements → find a `.map-cluster-icon` → computed `z-index` < 1000. Trigger `LeftOverlayPanel` peek-hover: the panel slides in over the cluster bubbles without any bubble visibly floating above the panel at any frame during the slide-in animation. Both expanded panels and peek panels are tested.

---

## Click Propagation Contract (PITFALL-08)

Cluster clicks must not accidentally trigger map-level click handlers.

**Handler (attached to every new `L.markerClusterGroup` at creation time per 63-CONTEXT.md D-23):**
```js
newGroup.on('clusterclick', (e) => {
  if (e.originalEvent) L.DomEvent.stopPropagation(e.originalEvent);
});
```

**Rationale:**
- Without `stopPropagation`, clicking a cluster fires BOTH `clusterclick` (library-handled → zoom-to-bounds) AND `map click` (bubbles up the DOM). Phase 61/62 have no map-level click handler today, so this is belt-and-braces — but if any future phase (e.g., an IOC drill-down feature) adds one, the guard prevents cluster clicks from triggering phantom coordinates.
- Individual marker click isolation is ALREADY handled by Phase 61 D-18's `interactive: false` on every buffer marker. Only clusters need the explicit stopPropagation.

**Detach:** the handler is implicitly detached when the cluster group is removed during a layer swap (Leaflet GCs event listeners with the layer). No explicit `group.off('clusterclick')` is required on swap because the entire group is discarded.

**Acceptance cue:** DevTools Console → add `map.on('click', () => console.log('map click'))` manually. Click a cluster bubble. The zoom-to-bounds fires, but the map-click log does NOT appear. (Remove the test handler after verification — it's a diagnostic only.)

---

## Same-Coordinate Collision (Phase 61 → 63 carry-over)

Phase 61 UI-SPEC §"Same-Coordinate Collision" established: multiple SSE events at identical coordinates each render their own pulse/settle/evict lifecycle without merge or stack-count. Phase 63 extends this contract:

- When `bufferSize > 500` and 2+ same-coordinate markers are settled, they WILL be grouped into a single cluster bubble (Leaflet `MarkerCluster` handles `latLng` coincidence by definition). The cluster `getChildCount()` correctly includes all coincident markers.
- When `bufferSize <= 500` (plain mode), coincident markers still render as overlapping individual dots (no clustering). The topmost dot is visible; the others are hidden below it. Phase 61's contract is unchanged.
- At the threshold boundary (`bufferSize = 500`), behaviour is plain-mode (per D-06's strict `>`, not `>=`). At `501+`, clustering engages.

No new visual handling is introduced by Phase 63 for same-coordinate events beyond what `leaflet.markercluster` provides out-of-the-box. No merge, no stack-count, no custom "N stacked" indicator on plain-mode overlaps.

---

## Accessibility

| Concern | Handling |
|---------|----------|
| Keyboard navigation of clusters | Not provided — `leaflet.markercluster` does not natively support keyboard focus on cluster icons, and the library doesn't expose a first-class a11y hook. This is a known library limitation; documented as out-of-scope for v6.1 (no precedent in the threat-map surface for keyboard marker interaction). Phase 66's audit may evaluate if a11y is elevated. |
| Screen reader announcement | Not provided — `L.divIcon` `html` for the bubble includes no `aria-label` or `role`. Matches Phase 61 (buffer markers have no SR labels) and the existing `.map-marker` / `.map-event-pulse` family. The map is effectively "visualisation-only" for assistive tech; the left panel's counters/countries/feed (keyboard-accessible) convey the data alternately. |
| Touch target | 32×32 px cluster bubble — below the WCAG 44×44 recommendation. Acceptable because: (1) cluster bubble is a visualisation affordance, not a primary action; (2) the dropdown + left-panel feed row clicks (both ≥44px) are the primary interaction path for the map; (3) on mobile browsers, Leaflet expands the hit area implicitly via touch-tolerant event handling. |
| Focus visibility | n/a — cluster bubbles are not focusable (see keyboard nav row). |
| Reduced motion | The `.map-cluster-icon` itself has no animation to disable. Leaflet's internal spiderfy animation is NOT wrapped in `prefers-reduced-motion` — this is a library behaviour, not under our CSS control. Users with motion sensitivity can avoid max-zoom spiderfy by not zooming that deep; the default behaviour at all non-max zoom levels is click-to-zoom (no spiderfy). Acceptable trade-off; documented in SC rubric. |
| Colour contrast | Cluster count `#E8EAED` on `rgba(15, 17, 23, 0.8)` backdrop-blur layer over `#262626` tiles → approximately 13:1 contrast ratio (AAA pass for normal text per WCAG 1.4.3). Well above the 4.5:1 threshold. |
| Semantic role | No ARIA roles added to the cluster bubble. Adding `role="button"` would be misleading (not all clusters click-through to a useful drill-down at max zoom — spiderfy is a visual-only reveal). Leaflet's own affordance (cursor: pointer + zoom-to-bounds) is the implicit signal. |

**Rationale summary:** Phase 63 accepts the same accessibility posture as Phase 61 on map markers (visualisation-only, no SR/keyboard parity for on-map elements) and does not regress it. The left panel (counters, feed rows, buffer dropdown — all keyboard-navigable) remains the accessible conduit to the same underlying threat data.

---

## Visual Parity With Existing Behaviour

This phase MUST NOT visually regress any of the following (all shipped pre-Phase 63):

| Behaviour | Where | Phase 63 disposition |
|-----------|-------|----------------------|
| Phase 61 `.map-buffer-marker*` lifecycle (arriving → settled → evicting) | `animations.css` | **Untouched.** Cluster bubbles replace overlapping dots when `bufferSize > 500`, but the individual-dot CSS is unchanged and still renders at current zoom where markers don't overlap. |
| Phase 61 click-highlight pulse (`.map-event-pulse--highlight`) | `animations.css` + `ThreatMapPage.jsx` `addHighlightPulse` | **Untouched.** Highlight pulse is added direct-to-map (NOT to `markerGroupRef.current`), so it never enters the cluster group and always reads on top of cluster bubbles. |
| Phase 62 `BufferSizeControl` dropdown | `BufferSizeControl.jsx` | **Untouched.** The dropdown is the trigger for Phase 63's threshold crossing but its own visual contract is unchanged. |
| `ThreatMapCounters`, `ThreatMapCountries`, `ThreatMapFeed` cards | `LeftOverlayPanel.jsx` | **Untouched.** Left panel layout, spacing, and content all unchanged. |
| `RightOverlayPanel` | `RightOverlayPanel.jsx` | **Untouched.** |
| `ThreatMapStatus` live/connecting pill | `ThreatMapStatus.jsx` | **Untouched.** |
| Panel toggle (collapse/expand) | `PanelToggle.jsx` | **Untouched.** |
| CartoDB dark tiles | `useLeaflet.js` | **Untouched.** (Note: if executor picks 63-CONTEXT.md D-16 Option B, a single `import 'leaflet.markercluster/dist/MarkerCluster.css'` line is added to the top of this file. No visual impact beyond enabling the cluster layout engine.) |
| Glassmorphism and severity palette in `tailwind.config.js` | `tailwind.config.js` | **Untouched.** No new tokens. |
| `.map-marker` class in `components.css` | `components.css` line 242 | **Untouched.** The new `.map-cluster-icon` class appends immediately below it; the existing block is not modified. |

**Visual regression test (manual, pre/post diff):**
1. On `main` pre-Phase-63: open `/threat-map` with `localStorage.setItem('aqua-tip:threat-map-buffer-size', '100')` and reload. Let the map fill. Screenshot.
2. Apply Phase 63 changes. Reload same setup (still 100 buffer). Screenshot.
3. Diff: **pixel-identical.** Phase 63 at `bufferSize = 100` is a no-op — clustering is OFF, so the map surface is visually unchanged. If diff shows any change at buffer=100, the plain-mode path is being incorrectly routed through `L.markerClusterGroup` or the cluster CSS is being applied when it shouldn't be.
4. Then set `localStorage.setItem('aqua-tip:threat-map-buffer-size', '1000')`, reload. Wait 60s for snapshot fill. Screenshot. The only new element should be: clustered markers at global zoom replaced by numeric glass bubbles; individual non-overlapping dots still visible in isolated regions.

---

## Component / File Inventory

| Artefact | Location | Shape | Change |
|----------|----------|-------|--------|
| `.map-cluster-icon` CSS block | `frontend/src/styles/components.css` (below `.map-marker` block, ~line 258+) | ~15 lines of CSS per the Component Contract spec | **NEW** |
| `buildClusterIcon(cluster)` helper | `frontend/src/pages/ThreatMapPage.jsx` (module scope, below `buildIcon`) | Pure function `(cluster) => L.DivIcon` | **NEW** |
| `CLUSTER_THRESHOLD` module constant | `frontend/src/pages/ThreatMapPage.jsx` (below `STORAGE_KEY` at line 43) | `const CLUSTER_THRESHOLD = 500;` | **NEW** |
| `markerGroupRef` ref | `frontend/src/pages/ThreatMapPage.jsx` (refs block around line 66) | `useRef(null)` — holds `L.layerGroup` OR `L.markerClusterGroup` | **NEW** |
| `activeLayerModeRef` ref | `frontend/src/pages/ThreatMapPage.jsx` (refs block around line 66) | `useRef(null)` — `'plain'` \| `'cluster'` \| `null` | **NEW** |
| `useEffect([bufferSize])` layer-swap effect | `frontend/src/pages/ThreatMapPage.jsx` (after existing `useEffect([markers])` at line 117) | Triggers the D-10 swap sequence on threshold crossing | **NEW** |
| `useEffect([markers])` reconciliation | `frontend/src/pages/ThreatMapPage.jsx` (line 82–117) | ADD/UPDATE/REMOVE now targets `markerGroupRef.current.addLayer/removeLayer` instead of `map` directly; lazy-init guard prepended (D-12) | **Modified** |
| Unmount cleanup effect | `frontend/src/pages/ThreatMapPage.jsx` (line 121–132) | Extended to `map.removeLayer(markerGroupRef.current)` + reset refs (D-13) | **Modified** |
| `leaflet.markercluster` side-effect import | `frontend/src/pages/ThreatMapPage.jsx` imports (line 1–11) | `import 'leaflet.markercluster';` — attaches `L.markerClusterGroup` to `L` namespace | **NEW** |
| `MarkerCluster.css` import | `frontend/src/pages/ThreatMapPage.jsx` imports (D-16 Option A, preferred) OR `frontend/src/hooks/useLeaflet.js` (D-16 Option B) | `import 'leaflet.markercluster/dist/MarkerCluster.css';` | **NEW** |
| `leaflet.markercluster` dependency | `frontend/package.json` `dependencies` | `"leaflet.markercluster": "^1.5.3"` | **NEW** |
| `frontend/package-lock.json` | frontend/ root | npm install regenerates; becomes tracked | **NEW (from untracked)** |

**Explicitly NOT modified by Phase 63:**
- `frontend/src/styles/animations.css` (Phase 61 buffer-marker animations untouched; no cluster animations added)
- `frontend/src/styles/glassmorphism.css` (`.glass-card-static` is the visual reference for `.map-cluster-icon` tokens, but the file itself is not modified; no new class added here)
- `frontend/src/styles/main.css` (no changes)
- `frontend/tailwind.config.js` (no new tokens; cluster bubble uses rgba literals inside the CSS block)
- `frontend/src/hooks/useThreatMapBuffer.js` (v6.1 hook lock — pure state machine, no Leaflet awareness)
- `frontend/src/hooks/useThreatStream.js` (v6.1 hook lock — PITFALL-01, Phase 61 D-17)
- `frontend/src/components/threat-map/BufferSizeControl.jsx` (Phase 62 surface; Phase 63 does not re-export or modify it)
- `frontend/src/components/threat-map/LeftOverlayPanel.jsx` (cluster logic is page-level, not panel-level)
- `frontend/src/components/threat-map/RightOverlayPanel.jsx` (no cluster semantics)
- `frontend/src/components/threat-map/ThreatMapStatus.jsx`, `ThreatMapCounters.jsx`, `ThreatMapCountries.jsx`, `ThreatMapFeed.jsx`, `PanelToggle.jsx` (all untouched)
- **Critically:** `MarkerCluster.Default.css` is NEVER imported (per 63-CONTEXT.md D-02 / roadmap lock). Importing it would reintroduce light-theme cluster icons and conflict with the custom `.map-cluster-icon` CSS.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none | not required — shadcn not initialised in this project (`components.json` absent) |
| third-party | none | not applicable |
| npm — `leaflet.markercluster@1.5.3` | library package (not a UI "block" in the shadcn sense) | version-pinned via roadmap; safety gate = static code read + bundle audit, see below |

This phase installs one new npm dependency (`leaflet.markercluster@1.5.3`). It is NOT a shadcn registry block — it is a standard MIT-licensed JavaScript library (github.com/Leaflet/Leaflet.markercluster). The shadcn registry-vetting gate does not apply, but the dependency install itself has its own safety contract:

| Check | Expected Result |
|-------|-----------------|
| License | MIT (verify via `cat frontend/node_modules/leaflet.markercluster/LICENSE` post-install) |
| Peer dependencies | `leaflet >= 1.3.1` — already satisfied by project's `leaflet@^1.9.4`. Verify via `npm ls leaflet.markercluster`. |
| Transitive dependencies | ZERO runtime deps (library has no `dependencies` block in its own package.json). Verify via `npm ls leaflet.markercluster` — should list only the library itself and the `leaflet` peer. |
| Version lock | `^1.5.3` in `frontend/package.json` admits 1.5.x patches only; blocks 1.6+ for the milestone. Roadmap-locked. |
| Bundle audit | Run `cd frontend && npm run build` post-install. Vite output should not show duplicate Leaflet imports. Only `leaflet/dist/leaflet.css` and `leaflet.markercluster/dist/MarkerCluster.css` in the CSS chunk. |
| CSS conflict audit | `grep -c map-cluster-icon frontend/dist/assets/*.css` after build should return `1` (exactly one occurrence per CSS chunk — from `components.css`). No `.marker-cluster-small/medium/large` from the skipped default CSS. |

**No third-party registry is introduced**, so the shadcn-specific safety vetting gate (source-code review for `fetch`, `eval`, obfuscated names, etc.) is not applicable. The library is widely used (>1M weekly npm downloads at v1.5.x), MIT-licensed, and zero-dep. Dependency install is the only new supply-chain surface in Phase 63.

---

## Acceptance Cues Summary (what "looks correct" means)

Direct reformulations of SC1–SC5 from ROADMAP.md §Phase 63 in design-contract terms:

1. **SC1 (cluster bubble in dark theme):** At `bufferSize = 1000` with ≥200 markers present, zooming out shows numeric cluster bubbles (32×32 circles, dark semi-transparent surface, white numeric count in JetBrains Mono 12px weight 600). **No white or blue default cluster icons appear at any zoom level.** If any appear, check that `MarkerCluster.Default.css` is NOT imported and that `iconCreateFunction: buildClusterIcon` is passed to `L.markerClusterGroup()`.
2. **SC2 (click-to-zoom):** Clicking any cluster bubble zooms the map to that cluster's `getBounds()` with smooth animation. At max zoom, overlapping child markers fan out via Leaflet's default spiderfy (radial SVG legs against the dark tile background). Child dots become visible.
3. **SC3 (clean layer swap — no double-render, no blank):** Toggling `bufferSize` across the 500 threshold (100 → 1000 → 500 → 1000 → 100, five rapid presses) never produces a frame where (a) the same marker is painted twice, (b) the map goes blank, or (c) a marker visually jumps coordinates. DevTools Elements panel shows at most one layer container of each type at any moment.
4. **SC4 (chunked loading — UI remains responsive):** At `bufferSize = 2000` with an initial SSE burst that delivers hundreds of markers in a few seconds, the browser tab remains interactive. Chrome Performance tab shows no frame drops below 40fps during the initial paint. Feed-panel hover and dropdown interactions respond immediately; no spinner-style freeze.
5. **SC5 (z-index — panels always above clusters):** DevTools Elements → any `.map-cluster-icon` → computed `z-index` < 1000. On panel peek-hover (collapsed-mode), the left panel's glass card slides in over the cluster bubbles without any bubble visibly floating above the panel at any frame during the slide-in animation. Same rule for expanded panels.
6. **No regressions (implicit):** Phase 61 buffer-marker lifecycle (pulse/settle/evict) is visually identical to pre-Phase-63. Phase 62 `BufferSizeControl` dropdown is visually identical. Left and right overlay panels, status pill, topbar, sidebar, basemap colour are all pixel-identical at `bufferSize = 100`.
7. **Accessibility (implicit):** Cluster count `#E8EAED` on bubble backdrop passes WCAG AAA contrast (>13:1). The map remains a visualisation-only surface; keyboard/SR users rely on the left panel's counters and feed (unchanged).

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS when the only text inside `.map-cluster-icon` is the bare integer from `cluster.getChildCount()` (no units, no separators, no labels, no tooltip). No empty/error/destructive copy is introduced.
- [ ] Dimension 2 Visuals: PASS when the cluster bubble matches the normative CSS spec byte-for-byte (32×32 circle, `rgba(15, 17, 23, 0.8)` surface, `backdrop-filter: blur(8px)`, `1px solid rgba(30, 32, 48, 0.8)`, `0 2px 8px rgba(0, 0, 0, 0.3)` shadow); the layer swap respects the "no double-render, no blank" rule; and no white default cluster icons ever render.
- [ ] Dimension 3 Color: PASS when the rgba literals in `.map-cluster-icon` match the `tailwind.config.js` tokens (`surface #0F1117` at 0.8, `border #1E2030` at 0.8, `text-primary #E8EAED` opaque); no new colour tokens are added to `tailwind.config.js`; severity accent (violet/cyan/red/amber) is NOT applied to clusters (deferred).
- [ ] Dimension 4 Typography: PASS when the cluster count is rendered in `JetBrains Mono` at `12px` weight `600`, colour `#E8EAED`. No other text surfaces are introduced.
- [ ] Dimension 5 Spacing: PASS when cluster bubble dimensions are `32px × 32px` exactly (matching `iconSize: [32, 32]`), border is `1px`, backdrop-blur is `8px`, shadow offset is `0 2px 8px`. No exceptions to the project spacing scale beyond these component-specific dimensions.
- [ ] Dimension 6 Registry Safety: PASS when `leaflet.markercluster@1.5.3` is installed with zero transitive deps (verified via `npm ls`), `MarkerCluster.Default.css` is NOT imported, bundle audit shows exactly one occurrence of `map-cluster-icon` CSS and one occurrence of each Leaflet CSS in the dist output.

**Approval:** pending

---

## Deviations from `ui-brand.md`

`ui-brand.md` in this workspace describes **console output patterns** (stage banners, checkpoint boxes, status symbols) — it is the visual grammar for CLI/chat messages from the GSD orchestrator, not a visual brand for product UI. It is therefore **not applicable** to Phase 63's scope (Leaflet cluster-icon CSS + layer-swap integration). No deviations recorded because no overlap exists.

The product's visual brand is instead encoded in `CLAUDE.md` §"Design System" + `frontend/tailwind.config.js` + the `.glass-card-static` family in `glassmorphism.css`, and Phase 63 adheres strictly: inherited dark-glassmorphism surface vocabulary (no new tokens), inherited `JetBrains Mono` numeric font, inherited `surface / border / text-primary` colour tokens as rgba literals, and no severity accent on neutral aggregate UI (reserved for Phase 61 buffer markers only).
