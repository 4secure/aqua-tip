# Phase 61: Frontend Threat Map Buffer Refactor - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning
**Mode:** autonomous (discuss-phase --auto; Claude's discretion throughout)

<domain>
## Phase Boundary

Frontend-only refactor of the live Threat Map to render a **persistent, capped pool of event markers** with a three-state lifecycle (pulse-in → settle → evict). The existing "fire-and-forget" `addPulseMarker` temporary-marker pattern is replaced by a diff-reconciled set of long-lived Leaflet markers whose React state is kept in sync with the Leaflet DOM via a `markerInstancesRef` registry.

This phase is **foundational**: it lays the single canonical buffer abstraction that Phases 62 (dropdown), 63 (clustering), and 66 (integration validation) depend on.

**In scope (MAPBUF-01..05):**
1. New hook `frontend/src/hooks/useThreatMapBuffer.js` — owns the marker pool, lifecycle transitions, eviction logic.
2. `ThreatMapPage.jsx` refactor — wires `useThreatStream` → `useThreatMapBuffer` → Leaflet layer via `markerInstancesRef` diff-reconciliation.
3. CSS for the three visual states (arriving pulse ring, settled static dot, evicting fade) in `frontend/src/styles/animations.css` alongside the existing `.map-event-pulse*` classes.
4. Default buffer cap of **100** (so Phase 62 only has to wire the dropdown — no behaviour change at 100 between pre-refactor and post-refactor from the user's perspective at the default setting).

**Out of scope for Phase 61 (explicitly deferred to later phases):**
- Dropdown UI for buffer size (MAPCFG-01..04 → Phase 62). Phase 61 exposes the cap as a constant/prop, **not** a UI control.
- localStorage persistence of buffer size (Phase 62).
- Marker clustering (MAPCLU-01..05 → Phase 63). Phase 61 adds markers directly to the map (or to an internal `L.layerGroup`) — NOT to a `MarkerClusterGroup`.
- Backend snapshot `?limit=` query-param plumbing (already shipped in Phase 59; the frontend continues calling `/api/threat-map/snapshot` without a limit until Phase 62).
- Country-counter aggregation resize (MAPBUF-06 is a Phase 59 backend requirement, already satisfied; frontend re-aggregation from the full buffer happens naturally because `useThreatStream` already derives counters from `events`).
- Victimology / Campaigns features (Phases 64, 65).

</domain>

<decisions>
## Implementation Decisions

All decisions below are **locked in autonomous mode**. Downstream agents (researcher, planner, executor) should treat these as non-negotiable unless a verified code-level finding contradicts them — in which case surface the conflict in RESEARCH.md rather than silently diverging.

### Hook Location + Shape (MAPBUF-01, MAPBUF-05)

- **D-01:** New hook lives at `frontend/src/hooks/useThreatMapBuffer.js` — same directory as the existing `useThreatStream.js` / `useLeaflet.js` / `useAutoRefresh.js`. No sub-folder (project convention is a flat `hooks/` directory).
- **D-02:** Signature: `useThreatMapBuffer(events, bufferSize = 100)` → returns `{ markers, arrivingId, evictingId }`.
  - `events` is the raw SSE event stream from `useThreatStream` (ordered newest-first, as today).
  - `bufferSize` defaults to `100` in this phase. Phase 62 will lift this to a stateful value; the hook's contract stays identical.
  - `markers` is the derived, lifecycle-annotated array (see D-05 for shape).
  - `arrivingId` / `evictingId` are the single most recent arrival/eviction IDs — exported for future use (feed scroll-to, highlight hints); **not strictly required** by Phase 61 if unused.
- **D-03:** `useThreatMapBuffer` is **pure state management** — it holds NO Leaflet references, touches NO DOM, imports NO `leaflet`. Leaflet I/O lives exclusively in `ThreatMapPage.jsx` (the `markerInstancesRef` reconciliation effect).
- **D-04:** The hook consumes `events` but keeps its own internal `markers` state so it can track lifecycle (arriving/settled/evicting) independently of the SSE ring's natural ordering. A `useEffect([events])` inside the hook diffs new event IDs against the current `markers` set and pushes any not-yet-tracked arrivals into `markers` with `state: 'arriving'`.

### Marker State Machine (MAPBUF-01, MAPBUF-02, MAPBUF-03)

- **D-05:** Marker object shape inside `markers`:
  ```
  {
    id: string,              // STIX id — stable identity, the Leaflet key
    lat: number,
    lng: number,
    color: string,           // 'red' | 'amber' | 'violet' | 'cyan' (from event.color)
    type: string,
    ip: string,
    country: string,
    countryCode: string,
    timestamp: string,
    state: 'arriving' | 'settled' | 'evicting',
    arrivedAt: number        // Date.now() when it entered the buffer
  }
  ```
- **D-06:** Transitions (all driven inside `useThreatMapBuffer`, via `setTimeout` timers stored in a `timersRef` so they cancel on unmount):
  - `arriving → settled` after **1800 ms** (matches the existing pulse-ring keyframe duration of 1.5 s with a small settle buffer — aligns with SC2 "approximately 2 seconds").
  - `settled → evicting` is triggered by overflow policy (D-07), not a timer.
  - `evicting → removed` after **600 ms** fade window (SC4 "quietly fade out — no jarring removal").
- **D-07:** **Eviction policy is strict FIFO by `arrivedAt`** — oldest insertion wins. No LRU, no click-bump, no click-freshens, no country-weighted retention. Keeps the hook pure, deterministic, and trivially testable. When `markers.length > bufferSize`, mark the oldest non-evicting entry as `state: 'evicting'`; a 600 ms timer then removes it. Exactly one eviction per new arrival after capacity (SC4).
- **D-08:** New arrivals **always** trigger a pulse — even if an earlier marker with the same `id` already exists (defensive — should not happen because SSE event IDs are unique STIX ids, but the hook de-dupes by ID anyway via a `has(id)` check before push).
- **D-09:** Initial snapshot-loaded events (first render after `useThreatStream` hydrates) enter the buffer in **`state: 'settled'` directly — they skip the pulse**. Rationale: pulsing 100 markers simultaneously on page load is jarring and not what SC2 describes. SC2 applies to *live* arrivals. Distinguish snapshot-vs-live by a `firstHydrationRef` inside the hook: on the first `events` update after mount, treat all IDs as settled; on subsequent updates, any new ID is `arriving`.

### Diff-Reconciliation (MAPBUF-05 — CORE REQUIREMENT)

- **D-10:** `ThreatMapPage.jsx` holds the single source of truth for Leaflet marker instances: `const markerInstancesRef = useRef(new Map())` — `Map<id, L.Marker>`. **Never a plain object** (preserves insertion order + has O(1) delete without `delete` keyword drift).
- **D-11:** A single `useEffect` in `ThreatMapPage.jsx` watches `[markers]` (from the hook) and runs a **full diff reconciliation** on every change:
  1. **Add:** for each `marker` in `markers` where `markerInstancesRef.current.has(marker.id) === false` → create `L.marker([lat, lng], { icon: buildIcon(marker), interactive: false })`, `.addTo(map)`, store in ref.
  2. **Update:** for each `marker` where the instance exists but its `state` changed → `instance.setIcon(buildIcon(marker))` (idempotent DivIcon swap; no add/remove). This drives CSS class change for arriving → settled → evicting transitions without DOM remount.
  3. **Remove:** compute `evictedIds = [...markerInstancesRef.keys()].filter(id => !markersById.has(id))` → for each, `map.removeLayer(instance)` and `markerInstancesRef.current.delete(id)`.
  4. Cleanup on unmount: iterate ref, remove every layer, clear the Map.
- **D-12:** `buildIcon(marker)` is a pure helper function inside `ThreatMapPage.jsx` (or a small co-located module `frontend/src/components/threat-map/markerIcon.js` — planner's discretion; both are acceptable under the project's "many small files" rule). It returns `L.divIcon({ className: '', html: '<div class="map-buffer-marker map-buffer-marker--{state} map-buffer-marker--{color}" ...></div>', iconSize: [size, size] })`. CSS classes drive visual state.
- **D-13:** Keep a previous-markers-by-id memo (`useRef`) so the diff can detect `state` changes cheaply (`prev.get(id)?.state !== next.state`) without a full equality walk.

### SSE Reconnect Survival (MAPBUF-04)

- **D-14:** The buffer survives SSE reconnects automatically because `useThreatMapBuffer` owns `markers` state and is **not unmounted** on SSE drop. `useThreatStream`'s existing reconnect logic (retry + visibility handler) merely pauses the `events` firehose; when it resumes, the hook resumes appending new IDs to the already-populated `markers`. No code change required in `useThreatStream.js` for SC3 — verify only.
- **D-15:** On snapshot re-hydration after a network blip (browser tab was `document.hidden`, then visible), the `firstHydrationRef` guard (D-09) means the second snapshot load must also **not re-pulse every marker**. Implementation: the guard flips to `true` on first hydration and stays `true` — subsequent `events` payload deltas are diffed against the current `markers` set, and only genuinely-new IDs (not in `markers`) get `state: 'arriving'`. Previously-seen IDs already in `markers` are ignored (no-op).

### bufferSize Propagation WITHOUT SSE Reconnect (PITFALL-01 — locked v6.1 decision)

- **D-16:** Phase 61 hardcodes `bufferSize = 100`. **However**, the hook's internal implementation must already be written in the PITFALL-01-safe pattern so Phase 62 only has to wire the dropdown — no rewrite. Specifically:
  - Inside `useThreatMapBuffer`, maintain a `bufferLimitRef = useRef(bufferSize)` and sync it in a `useEffect([bufferSize], () => { bufferLimitRef.current = bufferSize })`.
  - Eviction logic reads `bufferLimitRef.current`, never the captured `bufferSize` variable directly from a closure that was frozen when the events effect set up.
  - Although `useThreatMapBuffer` doesn't open the SSE, the same stale-closure hazard would hit its events-processing effect the moment Phase 62 makes `bufferSize` dynamic. Writing the ref pattern now avoids an invasive Phase 62 refactor.
- **D-17:** `useThreatStream.js` is **not modified in Phase 61**. Its hardcoded `MAX_EVENTS = 100` stays. Phase 62 will parameterise it (and must follow the same `useRef` pattern — PITFALL-01 applies there too). Downstream note: Phase 62 RESEARCH must flag this as a one-line constant-to-prop change.

### CSS (visual states)

- **D-18:** New CSS classes in `frontend/src/styles/animations.css`, co-located with the existing `.map-event-pulse*` block (reuse the same color palette tokens):
  - `.map-buffer-marker` — 6px × 6px static dot, rounded-full, `pointer-events: none` (interactive: false on the L.marker is already set; defense-in-depth).
  - `.map-buffer-marker--arriving` — wraps the dot with a pulse ring (re-uses `@keyframes mapEventPulse` from the existing file, 1.5 s ease-out forwards). Size matches current 16 px pulse.
  - `.map-buffer-marker--settled` — steady 6 px dot; color-by-modifier-class; faint 1 px ring or inner-shadow for visibility over the dark CartoDB tiles.
  - `.map-buffer-marker--evicting` — `opacity: 0` transition over 600 ms, `pointer-events: none`.
  - Color modifiers: `--red`, `--amber`, `--violet`, `--cyan` mirror the existing pulse color rules (same rgba values).
- **D-19:** Do NOT touch the existing `.map-event-pulse*` classes. They remain — the feed-item `handleEventClick` still calls `addHighlightPulse` (a transient white-ring pulse) and that system is orthogonal to the buffer's persistent markers. Phase 61 adds a new family of classes; it does not remove the old family.

### Existing `addPulseMarker` helper (cleanup)

- **D-20:** The `addPulseMarker` function inside `ThreatMapPage.jsx` (lines 11–23 of the current file) is **removed** in Phase 61 — its role (transient pulse on new arrival) is now performed by the buffer's arriving→settled transition. The `addHighlightPulse` function (lines 25–37) **stays** — it is the click-to-highlight action triggered from `handleEventClick`, which is a distinct user-initiated action unrelated to the buffer.
- **D-21:** The `prevEventIdRef` ref and its associated `useEffect([events])` in `ThreatMapPage.jsx` (lines 61, 74–82) are **removed**. They are replaced by the `markerInstancesRef` reconciliation effect (D-11).

### `useLeaflet.js` — Minimal Change

- **D-22:** `useLeaflet.js` is **not modified** in Phase 61. Its `markers` prop + `markers` effect (lines 51–70) are unused by `ThreatMapPage` (the page passes no `markers` prop today), so leaving them in place is harmless. If the planner finds dead-code-removal appetite, it's a low-risk cleanup — but not required. **Keep the diff minimal.**
- **D-23:** Initial map creation continues through `useLeaflet({ center, zoom, onReady })`. `onReady(map)` still supplies the `leafletMapRef` used by the reconciliation effect.

### Test Strategy

- **D-24:** **No new test framework is installed** for Phase 61. `frontend/package.json` has no Vitest / RTL / Playwright today, and installing one is a larger initiative that should be its own phase (see Deferred Ideas). Phase 61 verifies success criteria via **manual QA checklist** in `61-VALIDATION.md` (planner produces), mirroring the validation approach used for prior frontend phases (11, 52, 53, 58). Each SC1–SC5 gets a manual reproduction step + an expected-vs-observed pass/fail row.
- **D-25:** Where plan tasks produce pure helper modules (e.g., a standalone `markerLifecycle.js` reducer extracted from `useThreatMapBuffer` — planner's discretion), **inline JSDoc usage examples** provide documentation-grade coverage. No Jest assertions. Keep the diff focused on shipping the feature, not standing up a test harness.

### React 19 / Vite 7 Conventions

- **D-26:** No `use(Promise)`, no React Server Components, no `useTransition` for eviction animations — stay with the established project pattern of `useState` + `useRef` + `useEffect`. This matches every other hook in the codebase (`useThreatStream`, `useAutoRefresh`, `useLeaflet`, `useFeatureAccess`, `useFormatDate`). A React 19 upgrade playbook is out of scope for v6.1.
- **D-27:** All new files are `.js` (for hooks/helpers) or `.jsx` (for JSX-containing components). No TypeScript — consistent with the project-wide "No TypeScript" constraint in CLAUDE.md.
- **D-28:** Use `import L from 'leaflet'` in `ThreatMapPage.jsx` (already imported today) for the reconciliation effect's `L.marker` and `L.divIcon` calls. No dynamic import — Leaflet is already eagerly bundled via `useLeaflet.js`.

### Claude's Discretion

The following implementation details are NOT locked by this context. Downstream planner/executor pick the cleanest option consistent with project conventions:

- Whether `buildIcon` lives inline in `ThreatMapPage.jsx` or as a tiny helper in `frontend/src/components/threat-map/markerIcon.js`. Both acceptable; latter preferred if icon HTML grows > 6 lines.
- Exact `iconSize` for the settled dot (6 px, 8 px, or 10 px — pick what looks right on the CartoDB dark tiles).
- Whether to surface `arrivingId` / `evictingId` from the hook — include them in the signature (D-02) for future-proofing, but `ThreatMapPage.jsx` may ignore them in Phase 61. No penalty for unused returns.
- How to scope the settle timer (per-marker `setTimeout` vs batched per-tick rAF-based scheduler). Per-marker setTimeouts are simpler and at 100-cap have no measurable cost.
- Whether to add a `useMemo(() => new Map(markers.map(m => [m.id, m])), [markers])` inside the reconciliation effect for O(1) lookups during remove-phase, or a plain `Set` of IDs. Micro-optimisation — planner's call.
- Whether to extract the reconciliation effect into a small `useLeafletMarkerRegistry(map, markers, buildIcon)` helper hook alongside `useThreatMapBuffer.js`. Clean separation, but only worth it if Phase 63 (clustering) can share it — planner decides after reading the Phase 63 `MarkerClusterGroup` interaction requirements.
- Whether to keep the `L.layerGroup` currently created by `useLeaflet` for buffer markers, or add each `L.marker` directly to `map`. D-11 is agnostic. Going through `layerGroup` makes Phase 63's cluster swap slightly cleaner (swap the group, not N markers), but Phase 63 does its own full re-init anyway — either works.

### Folded Todos

None — no pending todos in the todo system intersect with this phase's scope.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap + Requirements
- `.planning/ROADMAP.md` §"Phase 61: Frontend Threat Map Buffer Refactor" — Goal + SC1–SC5
- `.planning/ROADMAP.md` §"Key Architectural Notes" — PITFALL-01 (useRef for bufferSize), PITFALL-02 (markerInstancesRef diff-reconciliation)
- `.planning/REQUIREMENTS.md` §"Map Persistent Buffer (MAPBUF)" — MAPBUF-01 through MAPBUF-05
- `.planning/PROJECT.md` §"Constraints" — No TypeScript, React 19 + Vite 7 stack
- `.planning/STATE.md` §"Accumulated Context → Decisions" — v6.1 Roadmap locked decisions (bufferSize via useRef, markerInstancesRef pattern)

### Prior Phase Context (structural reference — not source-of-truth)
- `.planning/phases/60-backend-campaigns-service-endpoint/60-CONTEXT.md` — CONTEXT.md structure template (same four sections used here)
- `.planning/phases/59-backend-snapshot-resize-victimology-endpoint/` — Phase 59 ships backend `?limit=` snapshot support; Phase 61 keeps default (no limit), Phase 62 wires it

### v6.1 Research (already produced, treat as authoritative research corpus)
- `.planning/research/ARCHITECTURE.md` §1 "Threat Map Buffer Refactor" — Hook split rationale, marker shape, sync patterns
- `.planning/research/ARCHITECTURE.md` §2 "Marker Lifecycle on Map" — pulse-then-settle without DOM leaks, markerInstancesRef pattern
- `.planning/research/PITFALLS.md` §PITFALL-01 — Stale closure on SSE onmessage (bufferSize via useRef)
- `.planning/research/PITFALLS.md` §PITFALL-02 — Persistent markers accumulate without Leaflet layer cleanup
- `.planning/research/PITFALLS.md` §PITFALL-03 — Race condition: dropdown change during SSE burst (Phase 62 concern; flagged here for continuity)
- `.planning/research/PITFALLS.md` §PITFALL-04 — Pulse animation on evicted markers colliding with new arrivals at same coord
- `.planning/research/STACK.md` — React/Leaflet stack reference + dark-theme color tokens
- `.planning/research/SUMMARY.md` — v6.1 research high-level map

### Frontend Code (existing patterns to mirror / integration points)
- `frontend/src/pages/ThreatMapPage.jsx` — current map page; this phase refactors it
- `frontend/src/hooks/useThreatStream.js` — SSE + snapshot owner; **not modified in Phase 61**, but the hook produces the `events` array the buffer consumes
- `frontend/src/hooks/useLeaflet.js` — map initialiser + `onReady` callback; **not modified in Phase 61**
- `frontend/src/hooks/useAutoRefresh.js` — reference pattern for visibility-aware refs in hooks (applies indirectly)
- `frontend/src/components/threat-map/LeftOverlayPanel.jsx` / `RightOverlayPanel.jsx` — no changes; buffer is invisible to the overlay panels (Phase 62 will add a dropdown to `LeftOverlayPanel`)
- `frontend/src/styles/animations.css` §"map-event-pulse" block (lines 153–172) — CSS neighbourhood for the new `.map-buffer-marker*` classes

### External (informational only)
- Leaflet docs — `L.divIcon`, `marker.setIcon()` idempotency. Standard Leaflet 1.9.x behaviour; no surprises.
- React 19 — no RSC/Server Actions used; behaviour identical to 18.x for purposes of this phase.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`useThreatStream` (existing):** Already owns SSE connect/reconnect, snapshot hydration, visibility-aware disconnect, `events` ring. Export signature unchanged in Phase 61; `useThreatMapBuffer` composes on top of it. Lines 45–179 in `frontend/src/hooks/useThreatStream.js`.
- **`useLeaflet` (existing):** Map initialiser + `onReady(map)` callback. Phase 61 keeps using it unchanged. Lines 5–73 in `frontend/src/hooks/useLeaflet.js`.
- **CartoDB dark tiles:** Already configured in `useLeaflet.js` line 26. Map background is `#262626`. The settled-dot color palette must read cleanly against this (validates D-18 color choices).
- **`.map-event-pulse--{color}` CSS palette:** Established color mapping (red / amber / violet / cyan) in `frontend/src/styles/animations.css`. Reuse the same rgba tokens for `.map-buffer-marker--{color}` to preserve visual consistency.
- **`handleEventClick` / `addHighlightPulse`:** Existing click-to-fly-and-pulse flow for feed panel items. Orthogonal to the buffer — retain as-is.
- **STIX event `id`:** Already stable and unique per SSE event (used as React `key` in `ThreatMapFeed`). Reuse as the `markerInstancesRef` Map key.

### Established Patterns
- **Hooks are ref-heavy:** `useThreatStream` uses `esRef`, `retryCountRef`, `retryTimerRef`, `snapshotLoaded`. `useThreatMapBuffer` follows the same idiom — `markers` in state, transitions scheduled via `timersRef` for cleanup.
- **localStorage with try/catch:** Established by `panelsCollapsed` persistence in `ThreatMapPage.jsx` (lines 44–50) and decision "localStorage-backed useState with try/catch — handle storage unavailability gracefully" (PROJECT.md). Phase 61 does NOT touch localStorage (that's Phase 62) but consumers should inherit this pattern.
- **Glassmorphism + design tokens:** Existing `.map-event-pulse` classes use rgba-with-box-shadow. New `.map-buffer-marker` classes follow suit (CLAUDE.md "Design System" palette).
- **Cleanup on unmount:** Every existing hook has a `return () => { ... }` cleanup. The new buffer hook must do the same — clear all timers, clear state — but Leaflet cleanup belongs in `ThreatMapPage.jsx`'s reconciliation effect (D-11 step 4), since the hook is Leaflet-agnostic.
- **One file per concern:** `components/threat-map/` holds 9 small files; `hooks/` holds 7 focused hooks. Phase 61 adds one hook (and optionally one `markerIcon.js` helper). Do NOT bloat `ThreatMapPage.jsx` beyond its current ~180 LOC — if the reconciliation effect is > 40 LOC, extract it.

### Integration Points
- **`ThreatMapPage.jsx` line 42:** `useThreatStream()` call — add `const { markers } = useThreatMapBuffer(events, 100)` immediately after. Keep `events` exported from the page to `LeftOverlayPanel` / `RightOverlayPanel` for the feed UI — they continue to consume the raw event stream, not the buffered markers.
- **`ThreatMapPage.jsx` lines 74–82:** Delete this effect (the `prevEventIdRef` pulse trigger) and replace with the new `useEffect([markers])` diff-reconciliation effect (D-11). Net LOC change in the page: small positive.
- **`frontend/src/styles/animations.css` line 172 (end of the `.map-event-pulse--highlight` block):** Append the new `.map-buffer-marker*` classes below this line. No existing class is modified.
- **Feed-panel click-to-fly (`handleEventClick`):** Phase 61 does NOT change feed behaviour. The click handler continues to call `map.flyTo` + `addHighlightPulse` — the highlight pulse is orthogonal to buffer markers and renders on a separate DOM path.

</code_context>

<specifics>
## Specific Ideas

- **Dot visibility over dark tiles:** The settled-dot CSS must be readable against `#262626`. If a flat 6 px rgba(color, 0.6) dot vanishes into the map, add a 1 px subtle white-alpha outer ring (`box-shadow: 0 0 0 1px rgba(255,255,255,0.2)`) — same glassmorphism vocabulary as the existing overlay panels.
- **Pulse keyframes reuse:** `@keyframes mapEventPulse` already exists (animations.css lines 151–155). The `--arriving` state's pulse ring reuses it verbatim. No new keyframes needed for arrival.
- **Fade-out keyframe:** Add a simple `@keyframes mapBufferEvict { from { opacity: 1 } to { opacity: 0 } }` or just `transition: opacity 600ms ease-out` on the `.map-buffer-marker--evicting` class — either works, transition is simpler.
- **Same-coord collision (PITFALL-04):** Multiple SSE events can share a coordinate (same IP, back-to-back). A brand-new arrival during another marker's 600 ms evict window should be allowed (different IDs = different markers). The 600 ms fade is too short to matter visually; the pulse-ring on the arrival overlays the fading old dot cleanly. **Do not** add a "skip if same coord" guard — that would drop legitimate events.
- **DevTools verification path (SC5):** After 5 min of live stream at the default 100 cap, a heap snapshot should show `L.Marker` instance count ≤ 100. Manual validation checklist in `61-VALIDATION.md` (planner produces) captures this.
- **Reconnect simulation (SC3):** Throttle the network in DevTools → "Offline" for 15 s → back to "Online". `useThreatStream` auto-reconnects; `markers` persist through the gap (the hook isn't unmounted). Verify by counting dots before vs after.
- **SC2 timing:** "Approximately 2 seconds" pulse is satisfied by a 1.5 s `mapEventPulse` keyframe + 300 ms settle grace = 1.8 s total `arriving` duration. Slightly under 2 s is fine; exactly 2 s is also fine. Don't over-tune.

</specifics>

<deferred>
## Deferred Ideas

- **BufferSizeControl dropdown in the left overlay panel** → Phase 62 (MAPCFG-01..04).
- **localStorage persistence of buffer size** → Phase 62 (MAPCFG-02).
- **Backend snapshot `?limit=<n>` plumbing on the frontend** → Phase 62 (the backend endpoint already supports it, shipped in Phase 59).
- **`leaflet.markercluster` integration when buffer > 500** → Phase 63 (MAPCLU-01..05). Phase 61's marker layer must remain a plain `L.marker` collection (or `L.layerGroup`) — do NOT introduce `MarkerClusterGroup` early.
- **Spider-leg expansion at max-zoom clusters** → Out of Scope (REQUIREMENTS.md §"Out of Scope"). Phase 63 uses default zoom-to-bounds on cluster click.
- **Multi-tab buffer sync via BroadcastChannel** → Deferred to a future milestone (REQUIREMENTS.md §"Future Requirements" — MAP-SYNC).
- **Export buffered events to CSV/JSON** → Deferred (REQUIREMENTS.md §"Future Requirements" — MAP-EXPORT).
- **Installing Vitest + React Testing Library for frontend unit tests** → Its own future infrastructure phase (the project currently has zero frontend tests, not just missing ones for this feature). Installing a test harness and writing a first suite is too large to bundle into Phase 61. Phase 61 verifies via manual QA in `61-VALIDATION.md`.
- **Extracting `markerInstancesRef` reconciliation into a reusable `useLeafletMarkerRegistry` helper hook** → Planner's discretion in Phase 61. If not extracted here, Phase 63 (clustering) may revisit — the diff pattern translates to `MarkerClusterGroup` too.
- **Playwright E2E for SSE scenarios** → Future infrastructure phase, out of scope for v6.1. Network-offline + reconnect validation remains manual for now.

### Reviewed Todos (not folded)
None — no pending todos were reviewed that fall outside this phase's scope.

</deferred>

---

*Phase: 61-frontend-threat-map-buffer-refactor*
*Context gathered: 2026-04-18 (autonomous mode, discuss-phase --auto — all decisions are Claude's discretion based on locked v6.1 roadmap patterns and MAPBUF-01..05 success criteria)*
