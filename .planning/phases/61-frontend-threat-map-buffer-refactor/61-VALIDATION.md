---
phase: 61
slug: frontend-threat-map-buffer-refactor
status: draft
nyquist_compliant: false
manual_qa_only: true
created: 2026-04-18
---

# Phase 61 — Manual QA Validation Checklist

> Per-phase validation contract. Phase 61 has **no automated test framework** — per D-24, `frontend/package.json` contains no Vitest / RTL / Playwright, and installing one is deferred to its own infrastructure phase (CONTEXT §Deferred Ideas).
>
> All validation here is **manual browser QA**, executed against the dev server (`cd frontend && npm run dev`, default `http://localhost:5173`) with the backend running (`cd backend && php artisan serve`, default `http://localhost:8000`) so the SSE stream + snapshot endpoint are live.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | none (manual browser QA) |
| **Dev server command** | `cd frontend && npm run dev` |
| **Backend command (required for live SSE)** | `cd backend && php artisan serve` |
| **Map route** | `/threat-map` (verify actual mount path in `frontend/src/App.jsx`) |
| **Browser** | Chrome / Edge (DevTools features referenced below are Chromium-specific) |
| **Estimated runtime** | ~15 min for full SC1–SC5 walk + accessibility + regression |

**Automated gates** that DO exist in Phase 61 are CSS/JS-level grep and `npm run build` — those are embedded in each PLAN's `<verify>` block and run per-task. This file captures the **visual + behavioural** gates that no static check can cover.

---

## Sampling Rate

- **Per task** (Plans 01, 02): automated `npm run build` + grep assertions in the PLAN `<verify>` blocks.
- **Per plan** (Plan 03): full manual walk of SC1–SC5 + accessibility + regression rows below.
- **Before `/gsd-verify-work`:** all rows below marked `[x]` or a deviation recorded with reason.
- **Max feedback latency:** ~15 minutes (manual walk).

---

## Per-Task Verification Map (automated)

| Task ID | Plan | Wave | Requirement | Secure Behavior | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------------|-----------|-------------------|--------|
| 61-01-01 | 01 | 0 | MAPBUF-01, MAPBUF-02 | Base + 3 state classes present in CSS | grep | `node -e "..."` (in 61-01 Task 1 verify) | ⬜ pending |
| 61-01-02 | 01 | 0 | MAPBUF-02, MAPBUF-03 | 4 colour modifiers mirror .map-event-pulse tokens | grep | `node -e "..."` (in 61-01 Task 2 verify) | ⬜ pending |
| 61-01-03 | 01 | 0 | (accessibility) | prefers-reduced-motion block + build green | grep + build | `npm run build` (in 61-01 Task 3 verify) | ⬜ pending |
| 61-02-01 | 02 | 1 | MAPBUF-01 (D-09) | Snapshot-hydration enters as `settled` directly | grep | `node -e "..."` (in 61-02 Task 1 verify) | ⬜ pending |
| 61-02-02 | 02 | 1 | MAPBUF-02, MAPBUF-03, MAPBUF-04 | Live arrival + FIFO eviction state machine | grep | `node -e "..."` (in 61-02 Task 2 verify) | ⬜ pending |
| 61-02-03 | 02 | 1 | MAPBUF-05 (D-03 purity) | Hook has no Leaflet import, no DOM access | grep + build | `npm run build` + purity grep (in 61-02 Task 3 verify) | ⬜ pending |
| 61-03-01 | 03 | 2 | MAPBUF-05 (D-20, D-21) | Legacy addPulseMarker + prevEventIdRef removed; hook wired | grep + build | `npm run build` (in 61-03 Task 1 verify) | ⬜ pending |
| 61-03-02 | 03 | 2 | MAPBUF-05 (D-10, D-11) | markerInstancesRef diff-reconciliation + buildIcon helper | grep + build | `npm run build` (in 61-03 Task 2 verify) | ⬜ pending |
| 61-03-03 | 03 | 2 | MAPBUF-01..05 | Full manual QA walk (this document, rows below) | manual (browser) | See SC rows below | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ deviation-with-reason*

---

## Success Criteria — Manual Walk

> Execute top-to-bottom in one sitting. Record outcome in the **Observed** column; flip the checkbox only when **Observed** matches **Expected**.

### SC1 — Persistence (MAPBUF-01)

- [ ] **Setup:** Dev server + backend running, threat map route loaded. Wait for the snapshot to resolve (status pill goes from "Connecting…" to "Live"). SSE stream delivering events.
- [ ] **Procedure:** Watch the map for 30 seconds after the snapshot lands.
- [ ] **Expected:** At least 50 small (~6px) coloured dots visible on the map. Dots do NOT disappear between SSE events. No pulse-then-gone flicker from the old `addPulseMarker` behaviour.
- [ ] **Observed:** _[fill in at runtime]_
- [ ] **Result:** ⬜ pass / ⬜ fail

### SC2 — Arrival Pulse (MAPBUF-02)

- [ ] **Setup:** With the map populated (from SC1), keep watching for new SSE arrivals.
- [ ] **Procedure:** When a new event arrives (status pill "Live"; new row appears in the left/right feed panel), watch the map precisely at the new event's coordinate.
- [ ] **Expected:** A 16px expanding pulse ring animates for ~1.5 seconds (matching the existing `.map-event-pulse` keyframe — scale 0.3 → 3.0, opacity 1 → 0). At approximately 1.8 seconds after arrival, the ring is fully faded and a 6px static dot remains at the same coordinate.
- [ ] **Observed:** _[fill in at runtime — note whether the pulse feels identical to pre-refactor `main`]_
- [ ] **Result:** ⬜ pass / ⬜ fail

### SC3 — Reconnect Survival (MAPBUF-04)

- [ ] **Setup:** Map loaded and populated (≥ 20 dots visible).
- [ ] **Procedure:**
  1. Record current visible dot count (approximate is fine — use screenshot).
  2. Open Chrome DevTools → Network tab → Throttling dropdown → "Offline".
  3. Wait 15 seconds. The status pill should flip to "Connecting…" or similar disconnect state.
  4. Throttling → "No throttling" (back online).
  5. Wait 5 seconds for SSE reconnect.
- [ ] **Expected:** The dots visible before going offline are still on the map after reconnect. No flicker, no mass-disappear-then-reappear, no blank map. New arrivals that queued during the offline window are impossible (SSE was disconnected), so the count should be equal to or slightly greater than the pre-offline count depending on the snapshot re-hydration behaviour.
- [ ] **Observed:** _[fill in at runtime]_
- [ ] **Result:** ⬜ pass / ⬜ fail

### SC4 — Eviction at Capacity (MAPBUF-03)

- [ ] **Setup:** Map loaded. Let the buffer fill to the 100 cap. If live stream is slow, wait several minutes — the snapshot endpoint initially returns up to 100 events, so if the backend has ≥ 100 recent events, the cap is hit on first load. Otherwise wait for live events.
- [ ] **Procedure:** Once visible dot count is at 100, watch for the 101st arrival. Focus attention on the oldest dots (typically the least-recently-touched region).
- [ ] **Expected:** At the 101st arrival:
  - The new arrival pulses as normal (SC2 behaviour).
  - **Exactly one** existing dot (the oldest by insertion order) begins a 600ms opacity fade.
  - After 600ms, the faded dot is removed from the DOM.
  - Dot count remains pinned at 100. Subsequent arrivals continue this 1-in-1-out rhythm.
- [ ] **Observed:** _[fill in at runtime — note whether the fade feels "quiet" per SC phrasing; if it snaps or scales, flag as fail]_
- [ ] **Result:** ⬜ pass / ⬜ fail

### SC5 — No Memory Leak (MAPBUF-05)

- [ ] **Setup:** Fresh page load. Chrome DevTools open, Memory tab selected.
- [ ] **Procedure:**
  1. Navigate to `/threat-map`, let the page stabilise (snapshot resolved, dots visible).
  2. DevTools → Memory → take a heap snapshot. Filter / search for `Marker` in the constructor column. Record the `L.Marker` (or internal Leaflet marker constructor) instance count.
  3. Leave the page idle for 5 minutes with live SSE streaming. Return.
  4. Take a second heap snapshot. Filter for `Marker` again. Record the new count.
- [ ] **Expected:** `L.Marker` instance count at both snapshots ≤ 100 (the configured buffer cap in Phase 61). A small delta between the two snapshots is acceptable only if the buffer is still filling toward 100; once full, the count should be stable at 100 or evicting markers may briefly push it to ~100-101 during the 600ms overlap (per D-07 "non-evicting count" semantic). No unbounded growth.
- [ ] **Observed:** _[fill in at runtime — record both snapshot counts]_
- [ ] **Result:** ⬜ pass / ⬜ fail

---

## Accessibility Check (prefers-reduced-motion — WCAG 2.3.3)

- [ ] **Setup:** DevTools → three-dot menu → More tools → Rendering panel → "Emulate CSS media feature prefers-reduced-motion" dropdown → "prefers-reduced-motion: reduce".
- [ ] **Procedure:** Reload the threat map page. Wait for snapshot and observe new SSE arrivals for ~30 seconds. Also wait for at least one eviction at capacity.
- [ ] **Expected:**
  - **No pulse rings** on new arrivals — arriving markers simply appear as 6px dots (possibly after a brief invisible period during the 1800ms arriving window, which is acceptable per the Plan 01 Task 3 implementation note).
  - **No fade** on eviction — oldest dot disappears instantly at the 600ms boundary (no opacity transition).
  - Status pill, overlay panels, and all other UI elements remain visually identical.
- [ ] **Observed:** _[fill in at runtime]_
- [ ] **Result:** ⬜ pass / ⬜ fail

---

## Regression Check — Click-Highlight Flow (D-19)

The `addHighlightPulse` + `handleEventClick` click-to-fly behaviour is **orthogonal** to the buffer refactor and must be byte-identical post-refactor.

- [ ] **Setup:** Map loaded with ≥ 5 dots. Left or right overlay panel visible (not collapsed). Feed list populated.
- [ ] **Procedure:** Click any event row in the feed list. Observe the map.
- [ ] **Expected:**
  - The map `flyTo`s the event's coordinates at zoom 6 (unchanged from pre-refactor).
  - A transient white-ring pulse (`.map-event-pulse--highlight`) renders at the event location for ~2.1 seconds, then self-cleans.
  - The **buffer dot** at that location (if the clicked event is still in the buffer) remains on the map — the click pulse does NOT remove it.
  - Clicking a second event initiates a new flyTo + new highlight pulse; the first highlight pulse has already cleared.
- [ ] **Observed:** _[fill in at runtime]_
- [ ] **Result:** ⬜ pass / ⬜ fail

---

## Regression Check — Overlay Panels & Status Badge

- [ ] **Setup:** Map loaded.
- [ ] **Procedure:** Visually compare (ideally pixel-diff from a pre-refactor screenshot) the following surfaces:
  - Left overlay panel (counters, country list, feed)
  - Right overlay panel (feed)
  - `ThreatMapStatus` pill (top-left, connected/connecting state)
  - `PanelToggle` button
  - CartoDB dark basemap tiles (`#262626` background)
  - Tailwind severity palette (red / amber / violet / cyan)
- [ ] **Expected:** Every surface is visually identical to pre-refactor `main`. Only the on-map marker behaviour should have changed (dots persist; pulse+settle replaces pulse+gone).
- [ ] **Observed:** _[fill in at runtime]_
- [ ] **Result:** ⬜ pass / ⬜ fail

---

## Wave 0 Requirements

- [x] No new test directory required (manual QA only per D-24).
- [x] No new test file required (no framework to install).
- [x] No Wave 0 scaffolding — Plans 01, 02, 03 execute directly against the existing codebase.
- Framework install: **none needed** (and explicitly deferred per D-24 + CONTEXT §Deferred Ideas).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Pulse animation matches existing `.map-event-pulse` feel | MAPBUF-02 (SC2) | Visual / temporal judgement; no automated CSS animation timing assertion framework in the project | SC2 row above |
| Eviction fade reads as "quiet" (not jarring) | MAPBUF-03 (SC4) | Subjective visual QA; "quiet" is defined in UI-SPEC §State 3 as "no scale, pure opacity, ease-out 600ms" | SC4 row above |
| Reconnect preserves markers across SSE drop | MAPBUF-04 (SC3) | Requires orchestrating DevTools Network throttling; no headless equivalent without a Playwright install (deferred per D-24) | SC3 row above |
| No `L.Marker` orphan accumulation | MAPBUF-05 (SC5) | Requires Chrome heap snapshot inspection; no programmatic counter exists | SC5 row above |
| `prefers-reduced-motion` suppresses animations | Accessibility (WCAG 2.3.3) | Requires DevTools CSS media feature emulation | Accessibility row above |
| Click-highlight flow byte-identical to pre-refactor | D-19 (regression) | Visual parity check | Regression row above |

All other phase behaviours have automated grep / build coverage in the PLAN `<verify>` blocks.

---

## Validation Sign-Off

- [ ] All three plans' task `<verify>` automated checks are green (61-01, 61-02, 61-03).
- [ ] SC1 through SC5 manual rows all marked `[x]` (or deviation recorded).
- [ ] Accessibility row marked `[x]`.
- [ ] Regression rows (click-highlight + panels/status) marked `[x]`.
- [ ] `git diff --stat frontend/` shows exactly three files changed (animations.css, useThreatMapBuffer.js, ThreatMapPage.jsx) — no drift into `useThreatStream.js`, `useLeaflet.js`, or component files.
- [ ] `frontmatter.nyquist_compliant` flipped to `true` **only if** the above rows all pass; otherwise leave `false` and record reason.

**Approval:** pending

---

## Notes

- This document is executed against a running dev server + running backend. If the backend is not serving live SSE (no events arriving), SC1/SC2/SC3/SC4 cannot be exercised — coordinate with the backend team or re-run after restoring the stream.
- The `L.Marker` constructor name in heap snapshots may appear as `NewClass` or similar depending on Leaflet's internal minification when bundled by Vite. If the exact constructor name is hard to find, search for any string containing `marker` and look at instances whose prototypes match the Leaflet marker shape (have `_latlng`, `_icon`, `_map`).
- If any manual row fails, capture a before/after screenshot or a DevTools performance trace and attach to the 61-XX-SUMMARY.md for the implicated plan. Do not mark any row `[x]` without visual evidence.
