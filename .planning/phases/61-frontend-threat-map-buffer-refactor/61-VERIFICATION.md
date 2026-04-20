---
phase: 61-frontend-threat-map-buffer-refactor
verified: 2026-04-18T00:00:00Z
status: human_needed
score: 5/5 code-structure must-haves verified (5 visual SCs pending human QA)
overrides_applied: 0
human_verification:
  - test: "SC1 — Persistence: map shows ≥50 persistent dots after 30s"
    expected: "At least 50 small (~6px) coloured dots visible on the map; dots do NOT disappear between SSE events; no pulse-then-gone flicker from the old addPulseMarker behaviour"
    why_human: "Visual observation against a running dev server + backend SSE stream; no headless equivalent without Playwright (deferred per D-24)"
  - test: "SC2 — Arrival pulse: ~1.8s ring then settle into 6px dot"
    expected: "A 16px expanding pulse ring animates for ~1.5s (matching .map-event-pulse keyframe); at approximately 1.8s the ring is gone and a 6px static dot remains at the same coordinate"
    why_human: "Subjective temporal judgement of animation timing and smoothness; no automated CSS animation timing assertion framework in the project"
  - test: "SC3 — Reconnect survival: DevTools Offline 15s → Online; dots persist"
    expected: "Dot count before offline equals dot count after reconnect; no flicker, no mass-disappear-then-reappear, no blank map"
    why_human: "Requires orchestrating DevTools Network throttling; no headless equivalent without a Playwright install"
  - test: "SC4 — Eviction at 101st arrival: exactly one oldest dot fades 600ms, count pinned at 100"
    expected: "At the 101st arrival the new arrival pulses, exactly one oldest dot begins a 600ms opacity fade, after 600ms the faded dot is removed from DOM; dot count remains pinned at 100"
    why_human: "Subjective visual QA — 'quiet' fade (no scale, pure opacity ease-out) requires a running map at buffer capacity"
  - test: "SC5 — No orphan L.Marker: Chrome DevTools heap snapshot ≤100 instances after 5min"
    expected: "L.Marker instance count at both snapshots ≤100 (the configured buffer cap); no unbounded growth"
    why_human: "Requires Chrome heap snapshot inspection; no programmatic counter exists in the codebase"
  - test: "Accessibility — prefers-reduced-motion: reduce suppresses pulse + fade"
    expected: "No pulse rings on new arrivals (arriving markers appear as 6px dots instantly or after an invisible 1800ms window); no fade on eviction (oldest dot disappears instantly at 600ms boundary)"
    why_human: "Requires DevTools CSS media feature emulation (Rendering panel)"
  - test: "Regression — click-highlight flow byte-identical to pre-refactor"
    expected: "map.flyTo + 2.1s white-ring pulse (.map-event-pulse--highlight) renders on event click; buffer dot at that location remains on the map; clicking a second event initiates a new flyTo + new highlight pulse with first highlight cleared"
    why_human: "Visual parity check — pixel-diff against pre-refactor main is required"
  - test: "Regression — overlay panels, status badge, basemap unchanged"
    expected: "Left + right overlay panels, ThreatMapStatus pill, PanelToggle, CartoDB dark basemap, severity palette all visually identical to pre-refactor main"
    why_human: "Visual parity check across multiple surfaces; subjective at-a-glance comparison"
---

# Phase 61: Frontend Threat Map Buffer Refactor — Verification Report

**Phase Goal:** The threat map renders a persistent pool of markers that pulse on arrival, settle as static dots, and fade out quietly when evicted — surviving SSE reconnects without orphan Leaflet layers.

**Verified:** 2026-04-18
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Persistent settled markers accumulate via React state keyed by STIX id (SC1) | VERIFIED (code) / HUMAN NEEDED (visual) | `useThreatMapBuffer.js:34-174` owns `markers` state; `ThreatMapPage.jsx:65` holds `markerInstancesRef = useRef(new Map())`; reconciliation effect at `ThreatMapPage.jsx:80-115` uses ADD/UPDATE/REMOVE diff keyed by `marker.id` — markers are persistent, NOT one-shot `addLayer/removeLayer`. Visual "≥50 dots after 30s" requires a running browser. |
| 2 | New arrival pulses ~1.8s then settles as 6px dot (SC2) | VERIFIED (code) / HUMAN NEEDED (visual) | Hook transitions `arriving → settled` after 1800ms via `setTimeout` at `useThreatMapBuffer.js:109-115`. CSS at `animations.css:183-187` defines `.map-buffer-marker--arriving { animation: mapEventPulse 1.5s ease-out forwards }`, and `:189-194` defines `.map-buffer-marker--settled`. `buildIcon(marker)` at `ThreatMapPage.jsx:16-26` composes `.map-buffer-marker--${marker.state}` class. |
| 3 | Buffer survives SSE reconnect without re-pulsing existing markers (SC3) | VERIFIED (code) / HUMAN NEEDED (visual) | `firstHydrationRef` at `useThreatMapBuffer.js:48` flips to `false` on first non-empty `events` and never flips back. Post-hydration branch at `:81-89` diffs new IDs against `prev.map(m => m.id)` — known IDs are no-ops. `ThreatMapPage.jsx` does not unmount the hook across SSE reconnects (the hook is at component-scope, not conditional). |
| 4 | Exactly one old marker fades out at 101st arrival (SC4) | VERIFIED (code) / HUMAN NEEDED (visual) | Overflow logic at `useThreatMapBuffer.js:127-137` uses `nonEvicting count > limit` (not total count), scans `next[i]` in FIFO array-index order, marks oldest non-evicting as `evicting`. 600ms eviction timer at `:144-154` removes the marker. CSS `transition: opacity 600ms ease-out` on `.map-buffer-marker--evicting` at `animations.css:197-202` drives the fade. |
| 5 | No orphan L.Marker accumulation (SC5) | VERIFIED (code) / HUMAN NEEDED (heap snapshot) | Reconciliation REMOVE branch at `ThreatMapPage.jsx:109-114` iterates `markerInstancesRef` and calls `map.removeLayer(instance)` + `instances.delete(id)` for every id not in `nextIds`. Unmount cleanup effect at `:119-130` removes every layer on page unmount. `interactive: false` at `:94` prevents event-listener accumulation. |

**Score:** 5/5 code-structure truths verified; 5/5 visual observable SCs require human browser verification.

### Required Artifacts

| Artifact | Expected | Status | Details |
|---------|----------|--------|---------|
| `frontend/src/hooks/useThreatMapBuffer.js` | New pure state hook, <200 lines, no Leaflet import | VERIFIED | 178 lines; named + default export; D-03 purity grep returns zero hits for `leaflet`, `L.divIcon`, `L.marker`, `document.`, `window.`; all 9 state-machine tokens present |
| `frontend/src/pages/ThreatMapPage.jsx` | Wired to useThreatMapBuffer via markerInstancesRef diff-reconciliation; legacy addPulseMarker/prevEventIdRef removed | VERIFIED | 227 lines; imports hook at line 5; invokes at line 46; `markerInstancesRef = useRef(new Map())` at line 65; reconciliation useEffect at lines 80-115; unmount cleanup at lines 119-130; `buildIcon` helper at lines 16-26. Legacy `addPulseMarker` and `prevEventIdRef` grep returns 0 hits. `addHighlightPulse` (decl + 2 usages) and `handleEventClick` (decl + 2 JSX usages) retained per D-19 |
| `frontend/src/styles/animations.css` | New `.map-buffer-marker*` family + colour modifiers + prefers-reduced-motion | VERIFIED | Lines 174-248 contain all 4 base/state classes + 4 colour modifiers + 4 arriving-colour overrides + prefers-reduced-motion block. Existing `.map-event-pulse*` family (lines 151-172) is byte-identical to pre-phase. `@keyframes mapEventPulse` reused by reference (not duplicated) |
| `frontend/src/hooks/useThreatStream.js` | Byte-identical to pre-phase per D-17 | VERIFIED | `git diff fa0dac5 HEAD -- frontend/src/hooks/useThreatStream.js` returns empty (zero bytes of change). `MAX_EVENTS = 100` constant preserved |
| `frontend/src/hooks/useLeaflet.js` | Byte-identical per D-22 | VERIFIED | `git diff fa0dac5 HEAD -- frontend/src/hooks/useLeaflet.js` returns empty |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `ThreatMapPage.jsx` | `useThreatMapBuffer` | named import + invocation | WIRED | `import { useThreatMapBuffer } from '../hooks/useThreatMapBuffer';` at line 5; `const { markers } = useThreatMapBuffer(events, 100);` at line 46 |
| `useThreatMapBuffer` | `events` from `useThreatStream` | `useEffect([events])` diff | WIRED | Effect at `useThreatMapBuffer.js:55-161` observes `events`, walks oldest-first (`i = length-1 → 0`), diffs against `prev.map(m => m.id)` |
| `markers` | `markerInstancesRef` (Leaflet layer) | `useEffect([markers])` diff-reconciliation | WIRED | Effect at `ThreatMapPage.jsx:80-115` iterates `markers`, creates new `L.marker([lat, lng], { icon: buildIcon(marker), interactive: false }).addTo(map)` for new ids, swaps icon via `existing.setIcon(buildIcon(marker))` when `_bufferState` differs, calls `map.removeLayer(instance)` + `instances.delete(id)` for evicted ids |
| `buildIcon(marker)` | `.map-buffer-marker--{state} --{color}` CSS | `L.divIcon` className composition | WIRED | Helper at `ThreatMapPage.jsx:16-26` returns `L.divIcon({ html: '<div class="map-buffer-marker map-buffer-marker--${marker.state} map-buffer-marker--${color}" ...>' })` |
| `.map-buffer-marker--arriving` | `@keyframes mapEventPulse` | `animation` shorthand | WIRED | `animation: mapEventPulse 1.5s ease-out forwards` at `animations.css:186` — reuses existing keyframe by name (no duplication) |
| `.map-buffer-marker--evicting` | CSS opacity transition | `transition` property | WIRED | `transition: opacity 600ms ease-out` at `animations.css:201` (timing matches hook's 600ms eviction timer) |
| bufferLimitRef pattern | PITFALL-01 stale-closure safety | `useRef` + sync `useEffect` | WIRED | `bufferLimitRef = useRef(bufferSize)` at `useThreatMapBuffer.js:41`; sync effect at `:42-44`; eviction reads `bufferLimitRef.current` at `:127` (never closed-over `bufferSize`) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `ThreatMapPage.jsx` markers rendering | `markers` | `useThreatMapBuffer(events, 100)` which consumes `events` from `useThreatStream` (real SSE + snapshot API via `/api/threat-map/snapshot` + `/api/threat-map/stream`) | Yes (when backend running) | FLOWING (code path verified) — visual rendering requires live backend per 61-VALIDATION.md test infrastructure |
| `useThreatMapBuffer` markers state | `markers` (state) | `events` prop (raw SSE stream) | Yes — events flow via setMarkers functional updater | FLOWING |
| Leaflet marker DOM | L.Marker instances | `markerInstancesRef.current` Map populated from `markers` via reconciliation effect | Yes — add/setIcon/removeLayer wired | FLOWING |

No HOLLOW_PROP or DISCONNECTED paths detected. Data chain: backend SSE → `useThreatStream.events` → `useThreatMapBuffer.markers` → `markerInstancesRef` → `L.divIcon` DOM with CSS classes.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Production build succeeds (all modules compile) | `cd frontend && npm run build` | `✓ built in 10.05s` — zero new warnings (pre-existing chunk-size info only) | PASS |
| D-03 purity: hook has no Leaflet import | `node -e` grep for `from 'leaflet'`, `L.divIcon`, `L.marker`, `document.`, `window.` in `useThreatMapBuffer.js` | Zero forbidden tokens | PASS |
| Page wiring: all expected tokens present, no legacy symbols | `node -e` grep for required tokens + forbidden tokens in `ThreatMapPage.jsx` | All 10 required tokens present; `addPulseMarker` / `prevEventIdRef` return 0 hits | PASS |
| CSS tokens: all 11 selectors and key properties present | `node -e` grep for `.map-buffer-marker*`, `@media (prefers-reduced-motion: reduce)`, `transition: opacity 600ms ease-out`, `mapEventPulse 1.5s ease-out forwards` | All 11 tokens present | PASS |
| D-19 retained functions: `addHighlightPulse` + `handleEventClick` present at expected sites | `node -e` count decl + usage sites | `addHighlightPulse`: 1 decl + 2 usages; `handleEventClick`: 1 decl + 2 JSX usages | PASS |
| Phase scope: exactly 3 frontend files changed | `git diff --name-only fa0dac5 HEAD -- frontend/` | Exactly 3: `animations.css`, `useThreatMapBuffer.js`, `ThreatMapPage.jsx` | PASS |
| D-17: `useThreatStream.js` byte-identical | `git diff fa0dac5 HEAD -- frontend/src/hooks/useThreatStream.js` | Empty output (zero changes) | PASS |
| D-22: `useLeaflet.js` byte-identical | `git diff fa0dac5 HEAD -- frontend/src/hooks/useLeaflet.js` | Empty output (zero changes) | PASS |
| Live dot-persistence behaviour (SC1) | Manual browser QA | Not run | SKIP — requires running dev server + backend SSE |
| Live pulse timing (SC2) | Manual browser QA | Not run | SKIP — requires running dev server + backend SSE |
| Reconnect survival (SC3) | Manual DevTools throttling | Not run | SKIP — requires running dev server + backend SSE |
| Eviction fade at capacity (SC4) | Manual browser QA at ≥100 events | Not run | SKIP — requires running dev server + backend SSE |
| Heap snapshot L.Marker ≤100 (SC5) | Chrome DevTools Memory tab | Not run | SKIP — requires running dev server + backend SSE |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| MAPBUF-01 | 61-01, 61-02, 61-03 | Buffered IP attack events render as static markers (persist after pulse) | SATISFIED (code) | Hook state machine + CSS `--settled` class + reconciliation ADD branch. Visual SC1 pending human QA |
| MAPBUF-02 | 61-01, 61-02, 61-03 | New marker pulses ~2s then settles as static dot | SATISFIED (code) | 1800ms arriving→settled timer; CSS `@keyframes mapEventPulse` 1.5s + 300ms grace; setIcon class swap. Visual SC2 pending human QA |
| MAPBUF-03 | 61-01, 61-02, 61-03 | Buffer full: oldest fades quietly as new arrivals push it out | SATISFIED (code) | FIFO eviction by array index; 600ms fade via CSS transition; one eviction per arrival at cap. Visual SC4 pending human QA |
| MAPBUF-04 | 61-02, 61-03 | Marker lifecycle survives SSE reconnects | SATISFIED (code) | `firstHydrationRef` latches false; post-hydration diff no-ops known IDs; hook is component-scope (not unmounted on reconnect). Visual SC3 pending human QA |
| MAPBUF-05 | 61-03 | React buffer state and Leaflet DOM stay in sync (no orphan markers) | SATISFIED (code) | `markerInstancesRef = useRef(new Map<id, L.Marker>())`; reconciliation ADD/UPDATE/REMOVE; unmount layer cleanup; `interactive:false`. Heap SC5 pending human verification |

All 5 requirements declared by phase plans are satisfied at the code level. No orphaned requirements detected — REQUIREMENTS.md lines 13-17 map MAPBUF-01..05 to Phase 61, and all 5 are claimed by at least one plan's `requirements` frontmatter.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `useThreatMapBuffer.js` | — | None detected | — | Hook uses functional `setMarkers((prev) => ...)` updater uniformly; no `setMarkers(markers.concat(...))` stale-read anti-pattern; timers cleanly keyed by id in `timersRef` Map with unmount cleanup |
| `ThreatMapPage.jsx` | — | None detected | — | All required cleanup paths present; unmount effect clears both React state (via hook) and Leaflet DOM (via markerInstancesRef); no `return null` stubs; no TODO/FIXME/PLACEHOLDER; no empty handlers |
| `animations.css` | — | None detected | — | No duplicated keyframes; no unused selectors; `@media (prefers-reduced-motion: reduce)` properly structured |

No stubs, no hollow props, no placeholders, no TODO/FIXME markers in the three modified files. Legacy `addPulseMarker` / `prevEventIdRef` completely removed (D-20, D-21).

### Human Verification Required

8 items require human browser testing (see `human_verification` frontmatter above for full list). Summary:

1. **SC1 — Persistence (≥50 dots after 30s)** — Manual observation on running `npm run dev` + backend SSE.
2. **SC2 — Arrival pulse (~1.8s ring → 6px dot)** — Temporal/visual judgement.
3. **SC3 — Reconnect survival (DevTools Offline 15s → Online)** — DevTools Network throttling orchestration.
4. **SC4 — Eviction at 101st arrival (one dot fades 600ms, count pinned at 100)** — Run to capacity + observe fade smoothness.
5. **SC5 — No L.Marker orphan accumulation (heap snapshot ≤100 after 5min)** — Chrome DevTools Memory tab.
6. **Accessibility (`prefers-reduced-motion: reduce` suppresses pulse + fade)** — DevTools CSS media feature emulation.
7. **Regression — Click-highlight flow byte-identical** — Feed click → flyTo + white pulse must still work.
8. **Regression — Overlay panels + status badge + basemap unchanged** — Visual parity check across untouched surfaces.

Full manual walk instructions are in `.planning/phases/61-frontend-threat-map-buffer-refactor/61-VALIDATION.md` §"Success Criteria — Manual Walk". Estimated runtime: ~15 minutes.

### Gaps Summary

**No code-level gaps.** All five observable truths are satisfied at the code/wiring level with strong evidence:

- **Persistence (SC1):** `markers` React state is owned by the hook (not recreated each event); `markerInstancesRef` holds live `L.Marker` instances keyed by STIX id; reconciliation effect only REMOVEs on eviction, never on arbitrary re-render.
- **Pulse timing (SC2):** 1800ms hook timer + 1.5s CSS keyframe + setIcon class swap forms the full pipeline.
- **Reconnect survival (SC3):** `firstHydrationRef` + diff-against-existing-markers + component-scope hook mounting are all wired correctly.
- **FIFO eviction (SC4):** Non-evicting count comparison, array-index FIFO scan, 600ms CSS transition, and 600ms JS removal timer are all synchronized.
- **No orphan markers (SC5):** Every ADD paired with REMOVE; unmount cleanup; `interactive:false` prevents listener accumulation.

**Phase scope invariants all hold:**
- `useThreatStream.js` and `useLeaflet.js` byte-identical to pre-phase (D-17, D-22 verified by `git diff`).
- Exactly 3 frontend files changed across the phase (matches file-scope contract in 61-VALIDATION.md line 194).
- `addHighlightPulse` + `handleEventClick` retained byte-identical (D-19 verified by AST-level count: 1 decl + 2 usages each).
- `@keyframes mapEventPulse` reused by reference, not duplicated (single definition at line 152).
- D-03 purity: hook imports zero Leaflet symbols and touches no DOM.
- PITFALL-01: `bufferLimitRef` + sync effect pattern in place so Phase 62 dropdown wiring is a one-line change.

**Why `human_needed` and not `passed`:** The phase goal is expressed in visual-observable terms ("renders a persistent pool of markers that pulse on arrival, settle as static dots, and fade out quietly when evicted"). Automated grep and build checks verify the **code structure** that implements this behaviour but cannot verify the **visual expression** of pulse timing, fade smoothness, or heap-snapshot memory behaviour. The VALIDATION.md manual-QA rows (SC1–SC5, accessibility, 2 regression checks) are all currently `⬜ pass / ⬜ fail` (unchecked). Per the explicit verifier instruction ("treat headless grep+build evidence as SUFFICIENT for automated pass on code structure, but flag SC1–SC5 for human verification"), the correct status is `human_needed`.

Once the human operator walks through 61-VALIDATION.md and flips the 8 rows to `[x]` pass (or records deviations with reason), the phase is fully shippable. The `nyquist_compliant` flag in 61-VALIDATION.md frontmatter should then flip from `false` to `true`.

---

*Verified: 2026-04-18*
*Verifier: Claude (gsd-verifier)*
