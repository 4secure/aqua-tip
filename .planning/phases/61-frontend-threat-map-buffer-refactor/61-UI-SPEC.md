---
phase: 61
slug: frontend-threat-map-buffer-refactor
status: draft
shadcn_initialized: false
preset: none
created: 2026-04-18
---

# Phase 61 — UI Design Contract

> Visual and interaction contract for the Threat Map marker buffer refactor. Scoped to the three-state marker lifecycle — arriving → settled → evicting — plus `prefers-reduced-motion` handling. Everything else on the map (overlay panels, topbar, feed list, status badge, basemap) is **out of scope** for this phase and MUST NOT be restyled.

**Scope note (refactor, not redesign):** Phase 61 formalises visual states that already exist in the project (the `.map-event-pulse*` family is the visual source of truth for colour/keyframe semantics). The new `.map-buffer-marker*` family mirrors those tokens rather than inventing new ones. The executor's job is to reproduce the existing "feel" across the new state machine — not to reimagine it.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (no shadcn; project is React 19 + Tailwind 3 hand-rolled) |
| Preset | not applicable |
| Component library | none (this phase adds CSS classes consumed by `L.divIcon`, no React components) |
| Icon library | not applicable (markers are coloured dots, not glyphs) |
| Font | not applicable (markers have no text in Phase 61) |

**Existing neighbourhood (reuse, do not modify):**
- `frontend/src/styles/animations.css` §`.map-event-pulse*` (lines 151–172) — canonical source of pulse keyframe + colour rgba tokens
- `tailwind.config.js` — `red #FF3B5C`, `amber #FFB020`, `violet #7A44E4`, `cyan #00E5FF`
- CartoDB dark basemap (`#262626`) — every colour decision below is validated against this background

---

## Spacing Scale

This phase ships dot dimensions and pulse-ring sizes only. The project's general spacing scale (from `tailwind.config.js` default + existing usage) is inherited unchanged:

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | (inherited — not used by Phase 61) |
| sm | 8px | (inherited — not used by Phase 61) |
| md | 16px | Pulse ring size (matches existing `.map-event-pulse` at 16px) |
| lg | 24px | (inherited — not used by Phase 61) |
| xl | 32px | (inherited — not used by Phase 61) |

**Marker-specific dimensions (this phase):**

| Element | Size | Rationale |
|---------|------|-----------|
| Settled dot (`.map-buffer-marker`) | 6px × 6px | Readable over CartoDB dark tiles without crowding at 100-cap density; 6 was chosen over 8/10 because at zoom 2.5 default the map shows ~globe-scale, and 8+ produces visual clumping when events share regions (common: US East Coast, EU core). `iconSize: [6, 6]` on `L.divIcon`. |
| Arriving pulse ring | 16px × 16px | Exact match to the existing `addPulseMarker` transient helper (currently 16px) — users already trained on this scale. `iconSize: [16, 16]` on `L.divIcon` while `state === 'arriving'`. |
| Subtle outer ring (settled) | 1px | `box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.2)` — defends visibility against `#262626` tiles without introducing a new colour. Mirrors the glassmorphism "hairline border" vocabulary (`border-border/50` pattern in overlay panels). |

Exceptions: none. The 6px / 16px pair is deliberately outside the 4/8/16/24/32 spacing scale because Leaflet markers are positioned by pixel offset from lat/lng — the exact pixel value is a geometric constraint, not layout spacing. Keeping them in the "dimension" vocabulary (not Tailwind spacing) prevents accidental 4px-snap rewrites.

---

## Typography

**Not applicable to Phase 61.** Buffer markers have no text content. All in-scope DOM is `<div>` icons sized and coloured via CSS class.

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | n/a | n/a | n/a |
| Label | n/a | n/a | n/a |
| Heading | n/a | n/a | n/a |
| Display | n/a | n/a | n/a |

If Phase 63 (clustering) adds count badges on cluster icons, typography for those badges will be declared in 63-UI-SPEC.md, not here.

---

## Color

**Strategy: reuse the existing map-event-pulse palette verbatim.** No new colours are introduced. The 60/30/10 split for this phase's scope:

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | CartoDB dark basemap `#262626` | Map canvas background — unchanged, existing |
| Secondary (30%) | `rgba(255, 255, 255, 0.2)` outer ring + transparent interior | Settled-dot outline (visibility aid against basemap) |
| Accent (10%) | Severity-keyed rgba fills (see table below) | Dot interior + pulse ring — the only saturated colour on the map layer |
| Destructive | `#FF3B5C` (red) | Severity level — NOT a destructive action colour in this phase (no destructive actions exist on the map surface) |

**Severity colour map (per D-19) — MUST mirror `.map-event-pulse--{color}` rgba tokens exactly:**

| Severity / `color` | Fill rgba (settled dot & pulse) | Glow box-shadow | Hex origin (from `tailwind.config.js`) |
|--------------------|--------------------------------|-----------------|----------------------------------------|
| `red` (critical) | `rgba(255, 59, 92, 0.6)` | `0 0 12px rgba(255, 59, 92, 0.4)` | `#FF3B5C` |
| `amber` (high) | `rgba(255, 176, 32, 0.6)` | `0 0 12px rgba(255, 176, 32, 0.4)` | `#FFB020` |
| `violet` (medium) | `rgba(122, 68, 228, 0.6)` | `0 0 12px rgba(122, 68, 228, 0.4)` | `#7A44E4` |
| `cyan` (low/info) | `rgba(0, 229, 255, 0.6)` | `0 0 12px rgba(0, 229, 255, 0.4)` | `#00E5FF` |

Accent reserved for: **severity-coloured buffer markers only** (dot fill + pulse ring). Phase 61 does NOT introduce accent colour into overlay panels, status badges, feed items, or any other surface. The `.map-event-pulse--highlight` white click-pulse (orthogonal, untouched — D-19) remains the sole non-severity accent on the map.

**Colour parity rule:** if a future patch changes a severity hex in `tailwind.config.js`, the `.map-event-pulse--{color}` rgba values and `.map-buffer-marker--{color}` rgba values MUST update together. They are one contract, two class families.

---

## Copywriting Contract

**Not applicable to Phase 61.** The buffer introduces no copy — no CTAs, no empty state, no error state, no confirmation dialog. Markers are silent dots; hover/click interactions are disabled (`interactive: false` on `L.marker`, D-12).

| Element | Copy |
|---------|------|
| Primary CTA | n/a (no CTA introduced; existing "Open panels" toggle unchanged) |
| Empty state heading | n/a (empty map state is handled by existing `ThreatMapStatus` "Connecting…" indicator, not touched here) |
| Empty state body | n/a |
| Error state | n/a (SSE errors surface in existing `connected` flag → `ThreatMapStatus`; buffer fails open with empty marker set) |
| Destructive confirmation | n/a (no destructive user actions on the map surface in this phase) |

---

## Visual State Machine (phase-specific contract)

The three marker states drive all visible behaviour. Each state = one CSS modifier class applied via `L.divIcon`. Transitions are timer-driven by `useThreatMapBuffer`; the executor's job is to make each state *look correct in isolation* and *blend cleanly* at the transition boundaries.

### State 1: `arriving` (0 → 1800ms)

| Property | Value |
|----------|-------|
| CSS class | `.map-buffer-marker.map-buffer-marker--arriving.map-buffer-marker--{color}` |
| Visual | Expanding pulse ring — no inner dot yet (ring dominates at this size) |
| Keyframe | `@keyframes mapEventPulse` (REUSED verbatim from `animations.css` line 152–155; do NOT duplicate) |
| Animation | `mapEventPulse 1.5s ease-out forwards` |
| Timing: scale | 0.3 → 3.0 over 1500ms (existing keyframe) |
| Timing: opacity | 1.0 → 0.0 over 1500ms (existing keyframe) |
| `iconSize` | `[16, 16]` |
| Settle buffer | State flips to `settled` at **1800ms** (1500ms keyframe + 300ms grace). After 1500ms the ring has faded to opacity 0; the 300ms grace is a no-op visually but keeps the state-machine timer consistent with SC2's "approximately 2 seconds". |
| `pointer-events` | `none` (defence-in-depth; the `L.marker` itself is `interactive: false`) |
| Acceptance cue | Looking at the map, a brand-new IP produces a visible expanding ring matching the existing pulse behaviour — users trained on the current build see **no regression** in arrival feedback. |

### State 2: `settled` (1800ms → eviction, indefinite)

| Property | Value |
|----------|-------|
| CSS class | `.map-buffer-marker.map-buffer-marker--settled.map-buffer-marker--{color}` |
| Visual | 6px static dot with subtle 1px outer ring |
| `width` / `height` | `6px` / `6px` |
| `border-radius` | `50%` (perfect circle) |
| `background` | severity rgba (see Color table, 0.6 alpha) |
| `box-shadow` | **two layers:** `0 0 0 1px rgba(255, 255, 255, 0.2), 0 0 8px {severity-rgba-at-0.4}` — the white 1px outer ring gives edge definition against `#262626`; the 8px coloured glow reinforces severity without screaming |
| Opacity | `1.0` (full saturation) |
| Animation | **none** — static. A dot that subtly animates is a dot that distracts at 50+ count. |
| `iconSize` | `[6, 6]` |
| `pointer-events` | `none` |
| z-layering | Below `.map-event-pulse` elements (the click-highlight pulse — D-19 — must always read on top). Leaflet default marker z-index `1000` applies; no manual `z-index` override needed since all markers share the same pane (`markerPane`), but DO NOT add a custom pane for buffer markers that would elevate them above `.map-event-pulse--highlight`. |
| Acceptance cue (SC4) | After 30s of live stream, counting dots on the screenshot yields ≥50 persistent points, each clearly a filled circle (not a ring, not a pulse, not a highlight flash). |

### State 3: `evicting` (600ms fade → removal)

| Property | Value |
|----------|-------|
| CSS class | `.map-buffer-marker.map-buffer-marker--evicting.map-buffer-marker--{color}` |
| Visual | Settled dot fading to transparent |
| Starting state | Whatever the settled dot looked like (same 6px, same colour) |
| Fade | `transition: opacity 600ms ease-out` (CSS transition, NOT a keyframe — simpler, avoids name collisions; per §specifics in CONTEXT) |
| Opacity target | `0` (fully transparent) |
| Scale | **no scale change** — pure opacity fade. Scaling + fading reads as "zoomed away by the map", which is wrong; the dot should feel like it *quietly disappears in place* (SC4 "quietly fade out — no jarring removal"). |
| Duration | **600ms** exactly |
| Removal | After 600ms, `useThreatMapBuffer` deletes the marker from `markers` → reconciliation effect calls `map.removeLayer` (D-11 step 3). |
| `pointer-events` | `none` |
| Acceptance cue (SC4) | At the 101st arrival, the oldest dot fades to nothing over ~0.6s while the new arrival's pulse ring expands. **No flash. No snap. No layout shift.** If eviction feels "jarring", the ease curve is wrong. |

### Transition diagrams (executor reference)

```
Live arrival:   [∅] ──pulse ring 1500ms──▶ [∅]  ──+300ms grace──▶ [●] ──────indefinite──────▶ [●] ──fade 600ms──▶ [∅]
                 │                                                  │                           │
                 arriving class set                                  settled class set           evicting class set
                 iconSize [16,16]                                    iconSize [6,6]              iconSize [6,6]
                                                                     state stable                opacity: 1 → 0

Snapshot hydrate: [●] (settled directly — no pulse, per D-09)
                   │
                   state: 'settled' on first hydration; only NEW live IDs after hydration pulse.
```

---

## Layering / Z-Index Contract

Against the existing map DOM, buffer markers must respect this stack (bottom → top):

1. **CartoDB dark tile layer** (`#262626`) — bottom
2. **Buffer marker layer** (`.map-buffer-marker--settled` and `.map-buffer-marker--evicting`) — middle. All 100 settled dots live here.
3. **Arriving pulse rings** (`.map-buffer-marker--arriving`) — same pane as 2 (Leaflet `markerPane`), but the ring's larger `iconSize` naturally overlays adjacent settled dots. No z-hack needed.
4. **Click-highlight pulse** (`.map-event-pulse--highlight`, orthogonal, D-19) — must read on top of all buffer elements. Already handled because `addHighlightPulse` adds its marker **after** buffer reconciliation, putting it later in the pane's DOM order (Leaflet's later-inserted-wins rule).
5. **Glassmorphism overlay panels** (LeftOverlayPanel, RightOverlayPanel, ThreatMapStatus, PanelToggle) — top. These use absolute positioning outside the Leaflet map container and are unaffected by Leaflet z-panes.

**Do not** introduce a custom Leaflet pane for buffer markers. The default `markerPane` at z-index 600 is correct.

---

## Same-Coordinate Collision

Per PITFALL-04 and CONTEXT §specifics: multiple SSE events may share a coordinate (same IP, back-to-back). The visual contract:

- A new `arriving` marker at the same coord as an existing `settled` or `evicting` marker **must render normally**. The expanding 16px ring visually overlays the 6px dot or fading dot; no guard code, no deduplication.
- The 600ms evicting fade is short enough that collision overlap is ≤ 600ms, and the arrival's pulse ring visually dominates the faded remnant.
- Do NOT implement a "merge" or "stack count" behaviour — that's a Phase 63 clustering concern.

**Acceptance cue:** spam-click the same lat/lng in DevTools (inject fake SSE events) — each event pulses once, settles as its own dot, and evicts independently. No visual confusion.

---

## Accessibility — `prefers-reduced-motion`

**Required CSS rule (must be in the new `.map-buffer-marker*` block):**

```css
@media (prefers-reduced-motion: reduce) {
  .map-buffer-marker--arriving {
    animation: none;
    /* Skip the pulse ring entirely. Arriving markers render as immediate settled dots. */
    /* iconSize is still [16,16] via L.divIcon, but the HTML div inside should flatten
       visually — easiest approach: force the same 6px dot rendering via a container
       override: */
  }
  .map-buffer-marker--evicting {
    transition: none;
    opacity: 0;
    /* Instant removal instead of fade. Still honours the 600ms JS timer for state
       cleanup, but visually snaps to absent. */
  }
}
```

**Rationale:**
- Users with vestibular sensitivity or `prefers-reduced-motion: reduce` set get a still map where markers appear and disappear without animation.
- This MUST be a CSS-level handling (not JS), so the buffer state machine is motion-agnostic — timers still run, state still transitions, only the visual expression changes.
- This satisfies WCAG 2.3.3 (Animation from Interactions, Level AAA) and aligns with the project's existing respect for the OS setting (though no other page currently checks — this is the first explicit handling in the codebase, acceptable because the map is the most motion-heavy surface).

**Test path:** Chrome DevTools → Rendering → Emulate CSS media feature `prefers-reduced-motion: reduce`. Reload the map. Verify: no pulse rings appear on new arrivals, no fade on evictions — markers just appear and disappear instantly.

---

## Visual Parity with Existing Behaviour

This phase MUST NOT visually regress any of the following (all of which already ship):

| Behaviour | Where | Phase 61 disposition |
|-----------|-------|----------------------|
| Transient 1.6s pulse on new SSE event | old `addPulseMarker` in `ThreatMapPage.jsx` | **Replaced** by `arriving → settled` transition. Visually near-identical (1.5s keyframe vs 1.6s cleanup timer). |
| Click-to-fly + 2.1s white highlight pulse | `addHighlightPulse` + `.map-event-pulse--highlight` | **Retained unchanged.** Orthogonal to buffer. |
| 4-colour severity palette (red/amber/violet/cyan) | `.map-event-pulse--{color}` | **Mirrored.** New `.map-buffer-marker--{color}` classes use identical rgba tokens. |
| CartoDB dark tiles | `useLeaflet.js` line 26 | **Unchanged.** |
| Overlay panel glassmorphism | `LeftOverlayPanel`, `RightOverlayPanel` | **Untouched.** Not in scope. |
| `ThreatMapStatus` live/connecting pill | `ThreatMapStatus.jsx` | **Untouched.** |

**Visual regression test (manual, pre/post diff):** take a screenshot of the map at `localhost:5173/dashboard` (where the threat map lives per v3.3) on `main` branch. After Phase 61 lands, retake at the same zoom/centre. At a glance the only difference should be: instead of dots vanishing between SSE events, they persist. Everything else — palette, overlay panels, status badge, basemap, highlight click — should be pixel-identical.

---

## Component / File Inventory

No new React components. The only additions are:

| Artefact | Location | Shape |
|----------|----------|-------|
| 4 new CSS classes (+ 4 colour modifiers) | `frontend/src/styles/animations.css` (appended below line 172) | `.map-buffer-marker`, `.map-buffer-marker--arriving`, `.map-buffer-marker--settled`, `.map-buffer-marker--evicting`, `.map-buffer-marker--{red,amber,violet,cyan}` |
| 1 `@media (prefers-reduced-motion: reduce)` block | same file | motion-disable overrides for the 4 state classes |
| `buildIcon(marker)` helper | inside `ThreatMapPage.jsx` OR `frontend/src/components/threat-map/markerIcon.js` (planner's discretion per CONTEXT) | Pure function `(marker) => L.divIcon` — assembles the class list and iconSize based on `marker.state` and `marker.color` |
| 1 new hook | `frontend/src/hooks/useThreatMapBuffer.js` | Pure state, no visual concerns — listed here for completeness only |

**Zero changes** to: `tailwind.config.js`, `main.css`, `components.css`, `glassmorphism.css`, any component under `frontend/src/components/` (except the optional `markerIcon.js` new file), any page except `ThreatMapPage.jsx`.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none | not required — shadcn not initialised in this project (`components.json` absent) |
| third-party | none | not applicable |

This phase ships hand-rolled CSS only. No package install, no external asset fetch, no vendored snippet from third-party sources. The pulse keyframe `mapEventPulse` is already in the project (authored in-house) and is reused verbatim.

---

## Executor Success Criteria (what "looks correct" means)

These are direct reformulations of SC1–SC5 from ROADMAP.md §Phase 61 in design-contract terms:

1. **SC1 / SC4 (persistence):** After 30 seconds of live stream with the default 100 cap, a screenshot of the map shows ≥ 50 static 6px dots, each with visible severity colour and subtle white outer ring. None are pulsing unless newly arrived. None are mid-fade unless capacity was exceeded.
2. **SC2 (arrival pulse):** A newly arriving marker shows the same expanding ring animation as the existing `.map-event-pulse` (1.5s ease-out, 0.3 → 3.0 scale, 1.0 → 0.0 opacity). At approximately 1.8s, the ring is gone and a 6px dot remains in its place at the same coordinates.
3. **SC3 (reconnect):** DevTools → offline → 15s → online. The dot count immediately before going offline equals the dot count immediately after reconnecting (modulo any new arrivals during the gap, which are impossible while offline). **No flicker.** No dots disappear and reappear during the reconnect.
4. **SC4 (eviction):** At the 101st arrival (capacity exceeded by 1), the oldest settled dot begins a 600ms opacity fade while the new arrival's pulse ring expands. The fade completes and the dot is removed from DOM. Only **one** dot fades per new arrival. Dot count stays pinned at 100.
5. **SC5 (memory):** Not a visual criterion — verified by Chrome DevTools Memory snapshot showing `L.Marker` instance count ≤ 100 after 5min streaming. No visual consequence if violated, but is a contract on the reconciliation effect.
6. **Accessibility (implicit):** With `prefers-reduced-motion: reduce` set in DevTools, no pulse and no fade is observed — arrivals appear instantly as settled dots; evictions disappear instantly.
7. **No regressions:** Click-highlight pulse, overlay panels, topbar, status badge, basemap colour, and severity palette are all visually identical to pre-refactor `main`.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: n/a — no copy introduced in this phase (marker-only visual refactor)
- [ ] Dimension 2 Visuals: PASS when marker states render as specified and parity with existing `.map-event-pulse` is maintained
- [ ] Dimension 3 Color: PASS when the 4 severity rgba values in `.map-buffer-marker--{color}` match `.map-event-pulse--{color}` byte-for-byte
- [ ] Dimension 4 Typography: n/a — markers have no text
- [ ] Dimension 5 Spacing: PASS when settled dot = 6px and pulse ring = 16px exactly; outer-ring box-shadow is 1px
- [ ] Dimension 6 Registry Safety: n/a — hand-rolled CSS, no external registry

**Approval:** pending

---

## Deviations from `ui-brand.md`

`ui-brand.md` in this workspace describes **console output patterns** (stage banners, checkpoint boxes, status symbols) — it is the visual grammar for CLI/chat messages from the GSD orchestrator, not a visual brand for product UI. It is therefore **not applicable** to Phase 61's scope (Leaflet marker CSS). No deviations recorded because no overlap exists.

The product's visual brand is instead encoded in `CLAUDE.md` §"Design System" + `frontend/tailwind.config.js`, and Phase 61 adheres strictly: same severity palette, same glassmorphism vocabulary (1px white-alpha ring), no new tokens introduced.
