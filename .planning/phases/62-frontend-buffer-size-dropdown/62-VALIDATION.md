---
phase: 62
slug: frontend-buffer-size-dropdown
status: draft
nyquist_compliant: false
manual_qa_only: true
created: 2026-04-18
signed_off: null
---

# Phase 62 — Manual QA Validation Checklist

> Per-phase validation contract. Phase 62 has **no automated test framework** — per D-32, `frontend/package.json` contains no Vitest / RTL / Playwright, and installing one is deferred (mirrors Phase 61 D-24 precedent and the v6.1 roadmap constraint).
>
> All validation here is **manual browser QA**, executed against the dev server (`cd frontend && npm run dev`, default `http://localhost:5173`) with the backend running (`cd backend && php artisan serve`, default `http://localhost:8000`) so the SSE stream + snapshot endpoint are live.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | none (manual browser QA) |
| **Dev server command** | `cd frontend && npm run dev` |
| **Backend command (required for live SSE in SC3)** | `cd backend && php artisan serve` |
| **Map route** | `/threat-map` (mount path in `frontend/src/App.jsx`) |
| **Browser** | Chrome / Edge (DevTools features referenced below are Chromium-specific) |
| **Estimated runtime** | ~5 min for full SC1–SC4 walk |

**Automated gates** that DO exist in Phase 62 are `npm run build` + structural grep — those are embedded in each PLAN's `<verify>` block and run per-task. This file captures the **visual + behavioural + persistence** gates that no static check can cover.

---

## Sampling Rate

- **Per task** (Plans 62-01, 62-02): automated `npm run build` + grep assertions in the PLAN `<verify>` blocks.
- **Per phase** (at end of Plan 62-02): full manual walk of SC1–SC4 below.
- **Before `/gsd-verify-work`:** all rows below marked `[x]` or a deviation recorded with reason.
- **Max feedback latency:** ~5 minutes (manual walk).

---

## Per-Task Verification Map (automated)

| Task ID | Plan | Wave | Requirement | Secure Behavior | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------------|-----------|-------------------|--------|
| 62-01-01 | 01 | 0 | MAPCFG-01, MAPCFG-04 | Component file contains all 5 required exports + correct JSX shape + D-16 shape on readBufferSize | grep | `node -e "..."` (in 62-01 Task 1 verify) | ⬜ pending |
| 62-01-02 | 01 | 0 | MAPCFG-01, MAPCFG-04 | Build green; new file only; no hook drift; no dep drift | build + grep | `npm run build` + `git status --porcelain` (in 62-01 Task 2 verify) | ⬜ pending |
| 62-02-01 | 02 | 1 | MAPCFG-01, MAPCFG-02, MAPCFG-03 | ThreatMapPage.jsx wire tokens present (import, useState, call-site, effect, props) + legacy `100` removed | grep | `node -e "..."` (in 62-02 Task 1 verify) | ⬜ pending |
| 62-02-02 | 02 | 1 | MAPCFG-01 | LeftOverlayPanel.jsx wire tokens present + BufferSizeControl rendered BEFORE ThreatMapCounters (textual position check) | grep | `node -e "..."` (in 62-02 Task 2 verify) | ⬜ pending |
| 62-02-03 | 02 | 1 | MAPCFG-01..04 | End-to-end grep across 3 files + v6.1 hook lock + zero dep drift + scope invariant (3 files total) | build + grep | `npm run build` + scope probes (in 62-02 Task 3 verify) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ deviation-with-reason*

---

## Success Criteria — Manual Walk

> Execute top-to-bottom in one sitting. Record outcome in the **Observed** column; flip the checkbox only when **Observed** matches **Expected**.

### SC1 — Dropdown Visible with Four Options (MAPCFG-01)

- [ ] **Setup:** Dev server + backend running. Open `http://localhost:5173/threat-map` (or whichever port Vite auto-selected). Wait for the map to render and the snapshot to resolve (left panel populated).
- [ ] **Procedure:**
  1. Locate the left overlay panel.
  2. Confirm the top card is a new glass-card with the label "Buffer" on the left and a native `<select>` on the right.
  3. Click the `<select>` to open the native picker.
  4. Visually scan the options.
- [ ] **Expected:**
  - The new "Buffer" card renders at the top of the left panel, ABOVE the existing "Global Threats" counters card.
  - The card uses the same glass surface (`glass-card-static p-4`) as the counters card beneath it — visual cohesion.
  - The label reads exactly "Buffer" (not "Buffer Size", not "Max Markers", no colon).
  - The `<select>` shows exactly four options in ascending order: 100, 500, 1000, 2000.
  - Default selected value is 100 (for a first-ever load; if localStorage already has a stored value, the default matches that).
  - No other controls are visible on the new card (no tooltip, no helper text, no extra buttons).
- [ ] **Observed:** _[fill in at runtime]_
- [ ] **Result:** ⬜ pass / ⬜ fail

### SC2 — Persistence Across Reload (MAPCFG-02)

- [ ] **Setup:** Map loaded with dropdown visible (from SC1).
- [ ] **Procedure:**
  1. Open DevTools → Application tab → Storage → Local Storage → select the current origin.
  2. Find (or confirm absence of) key `aqua-tip:threat-map-buffer-size`.
  3. In the dropdown, select `500`.
  4. Verify Local Storage now shows `aqua-tip:threat-map-buffer-size` with value `"500"` (the string, with quotes in the DevTools viewer).
  5. Press Ctrl+R (or F5) to reload the page.
  6. After reload, inspect the dropdown's current value AND the Local Storage entry.
- [ ] **Expected:**
  - Immediately after selecting 500, Local Storage shows `aqua-tip:threat-map-buffer-size` = `500`.
  - After reload, the dropdown shows `500` as the selected value (not 100).
  - Local Storage still shows `aqua-tip:threat-map-buffer-size` = `500`.
  - No console errors during the select-change, during the reload, or after the reload.
- [ ] **Observed:** _[fill in at runtime — paste the Local Storage screenshot value if different]_
- [ ] **Result:** ⬜ pass / ⬜ fail

### SC3 — No SSE Reconnect on Mid-Stream Change (MAPCFG-03)

- [ ] **Setup:** Dev server + backend running. Map loaded with events streaming (right-panel feed shows new rows arriving; status pill = "Live"). Dropdown at 100 from SC2 (or reset via localStorage clear + reload).
- [ ] **Procedure:**
  1. Open DevTools → Network tab.
  2. Apply filter: type `EventSource` or set the filter dropdown to "EventSource" (Chrome: click the filter dropdown near the top).
  3. Confirm exactly ONE active EventSource connection row is visible (green status indicator, waiting for more data, size continuously incrementing).
  4. Note the connection ID / row position.
  5. Without reloading, change the dropdown from 100 to 1000.
  6. Watch the Network tab for ~10 seconds. Also watch the right-panel feed for continuity.
- [ ] **Expected:**
  - After changing from 100 to 1000:
    - The existing EventSource row REMAINS active — same row, same connection, no status flip from "pending" to "completed" then back.
    - NO new EventSource row appears in the Network panel.
    - The right-panel feed keeps receiving new events without a visible pause, gap, or "Connecting..." status.
    - Map markers continue accumulating (now up to the new 1000 cap — over time).
  - Repeat with 1000 → 2000 → 500 → 100: at every transition, the EventSource row is unchanged, no new connections.
- [ ] **Observed:** _[fill in at runtime — confirm the single EventSource row survived all four transitions]_
- [ ] **Result:** ⬜ pass / ⬜ fail

> Architectural proof chain (CONTEXT D-25) — this SC is guaranteed by code structure:
> 1. `useThreatStream()` is called with no arguments; its EventSource-opening effect has no deps on `bufferSize`.
> 2. `useThreatMapBuffer(events, bufferSize)` reads `bufferSize` via `bufferLimitRef.current` internally; its events-diff effect depends only on `[events]`.
> 3. The separate `useEffect([bufferSize])` in the hook only writes to `bufferLimitRef.current` — no setState, no socket operations.
> If the manual DevTools check shows a reconnect, the proof chain is broken — file a regression bug immediately before marking the row green.

### SC4 — Silent Fallback on Missing / Invalid Storage (MAPCFG-04)

- [ ] **Setup:** Map loaded. From SC2, localStorage contains a valid value (e.g., 500).
- [ ] **Procedure — Case A (missing key):**
  1. DevTools → Application → Local Storage → right-click `aqua-tip:threat-map-buffer-size` → Delete.
  2. Confirm the key is gone from the list.
  3. Reload the page (Ctrl+R).
- [ ] **Expected — Case A:**
  - After reload, the dropdown shows `100` (the default).
  - The map renders normally — map tiles load, overlay panels appear, SSE reconnects.
  - DevTools → Console tab → zero errors of any kind (no red entries, no "unhandled promise rejection", no "localStorage" warning).
  - After the `useEffect([bufferSize])` first run, Local Storage now shows `aqua-tip:threat-map-buffer-size` = `100` (the default was persisted).
- [ ] **Procedure — Case B (non-numeric value):**
  1. DevTools → Application → Local Storage → click the value field of `aqua-tip:threat-map-buffer-size` → replace with `abc` → press Enter to commit.
  2. Reload.
- [ ] **Expected — Case B:**
  - Dropdown reads `100` on load (whitelist check rejects `"abc"`).
  - No console errors.
  - After first `useEffect([bufferSize])` run, Local Storage is updated to `"100"` (the `"abc"` was overwritten because `bufferSize` state is 100).
- [ ] **Procedure — Case C (numeric, off-whitelist):**
  1. Local Storage → set `aqua-tip:threat-map-buffer-size` = `250` → reload.
- [ ] **Expected — Case C:**
  - Dropdown reads `100` on load (250 is not in `[100, 500, 1000, 2000]`).
  - No console errors.
  - Local Storage overwritten to `"100"` after first render.
- [ ] **Procedure — Case D (valid whitelist hit, positive control):**
  1. Local Storage → set value to `2000` → reload.
- [ ] **Expected — Case D:**
  - Dropdown reads `2000` on load.
  - Local Storage remains `"2000"` (the valid value is kept).
  - Map cap updates to 2000 markers (over time; verify in SC3 architecturally — no SSE reconnect on the load).
- [ ] **Observed (all 4 cases):** _[fill in at runtime]_
- [ ] **Result:** ⬜ pass / ⬜ fail

---

## Regression Check — Left Panel Layout Parity

The Phase 61 panel layout (counters → countries → feed) must still render correctly; the only change is the new card prepended at the top.

- [ ] **Setup:** Map loaded. Left panel expanded (default state or via `PanelToggle`).
- [ ] **Procedure:** Visually compare the left panel against a pre-Phase-62 screenshot (from `main` commit before Plan 62-02). Scan top-to-bottom.
- [ ] **Expected:**
  - Panel width still 340px (unchanged).
  - Top of panel shows the new "Buffer" card (~56px tall).
  - Below it, unchanged: "Global Threats" counters card with the three-column stat grid (threats / countries / types), live dot, LIVE/OFFLINE badge.
  - Below counters, unchanged: the countries list card (scrollable).
  - Below countries, unchanged: the feed card (scrollable).
  - Total vertical rhythm: 4 cards with `gap-4` between them. The two `flex-1 min-h-0` children (countries + feed) shrink by ~36px each to accommodate the new card — both still scroll internally.
  - No horizontal scrollbar on the panel.
  - Collapsed + peek behaviour unchanged: clicking `PanelToggle` collapses the panel to the 10px sliver; hovering the sliver slides out the same 4-card stack (including the new Buffer card at top).
- [ ] **Observed:** _[fill in at runtime]_
- [ ] **Result:** ⬜ pass / ⬜ fail

---

## Regression Check — Right Panel, Status Pill, Map Body Untouched

- [ ] **Setup:** Map loaded.
- [ ] **Procedure:** Visually compare the following surfaces against pre-Phase-62 `main`:
  - Right overlay panel (feed)
  - `ThreatMapStatus` connecting/live pill (top-left of map)
  - `PanelToggle` button
  - CartoDB dark basemap tiles
  - Phase 61 buffer marker behaviour (arriving pulse → settled dot → evicting fade)
- [ ] **Expected:** Every surface pixel-identical to pre-Phase-62 `main`. Only the left panel has changed (one new card at top).
- [ ] **Observed:** _[fill in at runtime]_
- [ ] **Result:** ⬜ pass / ⬜ fail

---

## Accessibility Check — Keyboard + Screen Reader

- [ ] **Setup:** Map loaded with dropdown visible.
- [ ] **Procedure:**
  1. Click on the map body (not the panel) to move focus away from the dropdown.
  2. Press `Tab` repeatedly until focus reaches the `<select>`. Observe the focus ring.
  3. Press Arrow Down / Arrow Up to cycle through options.
  4. Press Enter (or Space) to confirm a selection. The dropdown should update the map cap immediately.
  5. (Optional, if a screen reader is available — macOS VoiceOver / Windows NVDA) Navigate to the select and listen for the announcement.
- [ ] **Expected:**
  - Focus ring appears on the select: a 1px violet border + 1px violet/20 ring (per UI-SPEC §Interaction States "Focus").
  - Arrow keys cycle 100 → 500 → 1000 → 2000 → (wraps or stops per browser-default).
  - Enter confirms; dropdown closes (or stays open depending on browser) with the new value visible.
  - Screen reader announcement on focus: "Buffer, combobox, <current value>" (or equivalent — exact wording browser/SR-dependent).
  - Type-ahead works: with the select focused and opened, pressing digit `5` jumps to the `500` option.
- [ ] **Observed:** _[fill in at runtime]_
- [ ] **Result:** ⬜ pass / ⬜ fail

---

## Wave 0 Requirements

- [x] No new test directory required (manual QA only per D-32).
- [x] No new test file required (no framework to install).
- [x] No Wave 0 scaffolding — Plans 62-01 and 62-02 execute directly against the existing codebase + Phase 61 handoff.
- Framework install: **none needed** (explicitly deferred per D-32 and CONTEXT §Deferred Ideas).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dropdown renders in left panel with 4 options + correct label | MAPCFG-01 (SC1) | Visual DOM check; no automated snapshot framework in project | SC1 row above |
| localStorage round-trip across reload | MAPCFG-02 (SC2) | Requires DevTools Application tab + page reload — no headless equivalent without Playwright (deferred) | SC2 row above |
| No SSE reconnect on mid-stream dropdown change | MAPCFG-03 (SC3) | Requires DevTools Network EventSource filter + continuous observation — no programmatic counter exposed | SC3 row above |
| Invalid / missing localStorage → silent 100 fallback | MAPCFG-04 (SC4) | Requires DevTools Application tab manipulation; 4 distinct cases (missing / abc / 250 / 2000) | SC4 row above (Cases A–D) |
| Left panel layout regression (new card above existing 3) | Phase 61 + 62 layout parity | Visual diff vs `main` | Left panel regression row above |
| Right panel + map body untouched | Phase 61 regression safety | Visual diff vs `main` | Right panel regression row above |
| Keyboard focus ring + screen reader announcement | Accessibility | Requires keyboard navigation + (optionally) SR; no programmatic a11y scanner in project | Accessibility row above |

All other phase behaviours have automated build + grep coverage in the PLAN `<verify>` blocks.

---

## Validation Sign-Off

- [ ] All Plan 62-01 and 62-02 task `<verify>` automated checks are green.
- [ ] SC1 through SC4 manual rows all marked `[x]` (or deviation recorded).
- [ ] Regression rows (left panel layout, right panel / status / map body) marked `[x]`.
- [ ] Accessibility row marked `[x]`.
- [ ] `git diff --stat frontend/` shows exactly three files changed across Phase 62:
  - `M frontend/src/pages/ThreatMapPage.jsx`
  - `M frontend/src/components/threat-map/LeftOverlayPanel.jsx`
  - `A frontend/src/components/threat-map/BufferSizeControl.jsx`
- [ ] `git diff --stat frontend/src/hooks/useThreatStream.js frontend/src/hooks/useThreatMapBuffer.js` is empty (v6.1 lock preserved — architectural guarantee for MAPCFG-03).
- [ ] `git diff --stat frontend/package.json frontend/package-lock.json` is empty (zero new dependencies).
- [ ] `frontmatter.nyquist_compliant` flipped to `true` **only if** the above rows all pass; otherwise leave `false` and record reason.

**Approval:** _pending — awaiting human manual QA walk after Plan 62-02 code-complete_

---

## Notes

- This document is executed against a running dev server + running backend. SC3 (no-reconnect) requires the backend to be streaming SSE — coordinate if the stream is down.
- All four MAPCFG SCs are guaranteed architecturally by the code structure (see CONTEXT D-25 proof chain). The manual walk is a confirmation, not a discovery exercise. If anything fails, it indicates an actual deviation — not a subtle edge case.
- SC4 tests four cases (A: missing, B: non-numeric, C: off-whitelist numeric, D: valid whitelist positive control). All four must pass to mark SC4 green. Record each case's outcome individually.
- If any manual row fails, capture a before/after screenshot or a DevTools Network trace and attach to the implicated plan's SUMMARY.md. Do not mark any row `[x]` without visual evidence.

---

## Executor Observations — _pending_

Plan 62-02 executor will populate this section during Task 3 (integration gates). Expected content:

- `npm run build` output (`✓ built in ...s`).
- Scope-invariant grep probes: `git status --porcelain frontend/` → 3 lines (2 `M` + 1 `??`).
- v6.1 hook-lock probe: `git diff --stat frontend/src/hooks/useThreat*.js` → empty.
- Dep-drift probe: `git diff --stat frontend/package*.json` → empty.
- End-to-end wire grep: `OK — MAPCFG-01..04 end-to-end wire verified (13 tokens across 3 files)`.
- Legacy-literal absence: `useThreatMapBuffer(events, 100)` → zero hits.
- Optional dev-server smoke probe (mirrors 61-03's approach): `cd frontend && npm run dev` + HTTP probes on `/threat-map`, `/src/pages/ThreatMapPage.jsx`, `/src/components/threat-map/BufferSizeControl.jsx`, `/src/components/threat-map/LeftOverlayPanel.jsx` — all should return 200 and contain the expected compiled tokens.

Handing off to the human operator for the manual QA walk (SC1–SC4 + regression + accessibility) using the rows above.
</content>
