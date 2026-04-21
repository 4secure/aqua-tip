# Phase 62: Frontend Buffer-Size Dropdown - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning
**Mode:** autonomous (discuss-phase --auto; Claude's discretion throughout)

<domain>
## Phase Boundary

Frontend-only UI addition: a **buffer-size selector dropdown** in the Threat Map left overlay panel that lets the user pick among presets `100 / 500 / 1000 / 2000`, persists the choice in `localStorage` under `aqua-tip:threat-map-buffer-size`, and feeds the value into the existing `useThreatMapBuffer(events, bufferSize)` call-site from Phase 61.

This phase is **a thin UI + persistence layer** on top of Phase 61's already-shipped hook infrastructure. Because `useThreatMapBuffer.js` was written with the PITFALL-01-safe `bufferLimitRef` pattern (D-16), the live cap updates WITHOUT an SSE reconnect — no hook rewrite, no `useThreatStream.js` change required.

**In scope (MAPCFG-01..04):**
1. New component `BufferSizeControl` — native `<select>` styled with Tailwind, rendered at the top of `LeftOverlayPanel` above the counters card.
2. New `bufferSize` state in `ThreatMapPage.jsx` — initialised from `localStorage` via `useState` lazy initializer, persisted on change via a dedicated `useEffect`.
3. One-line call-site change: `useThreatMapBuffer(events, 100)` → `useThreatMapBuffer(events, bufferSize)`.
4. Copy contract: label "Buffer" (compact to fit the 340px overlay), `<option>` labels are the raw integers `100 / 500 / 1000 / 2000`.
5. Validation on load: if `localStorage` value is missing, non-numeric, or not in the `[100, 500, 1000, 2000]` whitelist → fall back to `100` silently (try/catch-wrapped).

**Out of scope for Phase 62 (explicitly deferred):**
- Marker clustering when `bufferSize > 500` (MAPCLU-01..05 → Phase 63). The dropdown simply updates a number; Phase 63 reads that number via the same state and conditionally enables `MarkerClusterGroup`.
- Backend snapshot `?limit=` query-param wiring on the frontend. The snapshot endpoint already supports `?limit=` (Phase 59), but `useThreatStream.js` currently calls `/api/threat-map/snapshot` without a limit — adding the query param is a follow-up that bundles more cleanly with Phase 63 (where large buffers actually benefit from a larger initial hydration). Phase 62 keeps the snapshot call unchanged; the buffer fills incrementally via live SSE for larger caps, which is acceptable per REQUIREMENTS.md §"Out of Scope" ("Backend SSE buffer scaling").
- Modifying `useThreatStream.js` — **forbidden by v6.1 roadmap lock** (PITFALL-01 + D-17 from Phase 61). Its hardcoded `MAX_EVENTS = 100` stays; the buffer hook is the only cap that matters for rendering.
- Any change to `useThreatMapBuffer.js` — the hook is already Phase-62-ready.
- Victimology / Campaigns UI (Phases 64, 65).
- New dependencies — project convention is zero new deps unless the Roadmap locks one in (only `leaflet.markercluster@1.5.3` in Phase 63).

</domain>

<decisions>
## Implementation Decisions

All decisions below are **locked in autonomous mode**. Downstream agents (researcher, planner, executor) should treat these as non-negotiable unless a verified code-level finding contradicts them — in which case surface the conflict in RESEARCH.md rather than silently diverging.

### Component Shape + Location

- **D-01:** New file `frontend/src/components/threat-map/BufferSizeControl.jsx`. Scoped to the threat map surface (like `ThreatMapCounters.jsx`, `ThreatMapFeed.jsx`, etc.). Not placed in `components/ui/` because the control is domain-specific to the threat map — it carries a "Buffer" label tied to marker-buffer semantics, not a generic reusable select. If a future page needs a similar control, extract to `ui/` at that point (per project "many small files" convention, not premature abstraction).
- **D-02:** Control type: **native `<select>`** (HTML), styled with Tailwind utilities. Rationale:
  - Project has no shadcn/Radix/headless-menu wiring (CLAUDE.md: no shadcn; components.json absent).
  - Existing `SimpleDropdown.jsx` is a custom button-driven menu — more LOC than we need for a 4-option preset list, and its click-outside logic adds complexity without value here. We're not matching a design spec that requires a custom dropdown; native `<select>` satisfies MAPCFG-01 exactly.
  - Native select is **keyboard/accessibility-free-for-all** (arrow keys, Enter, screen-reader announces options, mobile gets native picker UI). Meeting this bar with a custom menu would cost dozens of LOC.
  - Zero new dependencies (locked constraint).
- **D-03:** Props contract: `<BufferSizeControl value={bufferSize} onChange={setBufferSize} />`. Controlled component; state lives in `ThreatMapPage.jsx`.
- **D-04:** Options are a module-level constant: `const BUFFER_SIZE_OPTIONS = [100, 500, 1000, 2000]`. Exported from the same file so `ThreatMapPage.jsx` (or a future Phase 63 cluster-threshold check) can import the canonical list. Whitelist reuse — single source of truth.

### Label + Copy

- **D-05:** Primary label text: **"Buffer"** (compact). Rationale: the overlay panel is 340px wide; "Buffer size" plus a 4-digit value ("2000") plus a chevron would push layout tightly. "Buffer" is unambiguous in context (the counters card immediately below says "100 Latest Attacks" so the semantic connection is clear).
- **D-06:** Option labels: the raw integer ("100", "500", "1000", "2000") — no thousands separator, no "markers" suffix. Rationale: the values are monospace-friendly, short, and the unit is implicit from the "Buffer" label. Adding "markers" would bloat the select to ~9 chars per option.
- **D-07:** No tooltip in Phase 62 (would require a new UI primitive — tooltips don't exist in the project). The label + position (directly above the counters card that shows live marker counts) provides sufficient affordance.
- **D-08:** No `aria-label` needed beyond the visible "Buffer" label bound via `<label htmlFor>` / `<select id>`. Screen readers announce "Buffer, combobox, 100" natively.

### Layout + Placement in LeftOverlayPanel

- **D-09:** `BufferSizeControl` renders **above** `ThreatMapCounters` inside `LeftOverlayPanel.jsx`'s `panelContent` fragment. Vertical order from top of left panel:
  1. `BufferSizeControl` (new — small, single row)
  2. `ThreatMapCounters` (existing)
  3. `ThreatMapCountries` (existing)
  4. `ThreatMapFeed` (existing)
- **D-10:** `BufferSizeControl`'s container uses the same `glass-card-static p-4` pattern as `ThreatMapCounters` — visual cohesion with the panel. Single row: `<label>Buffer</label>` on the left, `<select>` on the right, `items-center justify-between flex` container.
- **D-11:** Do NOT render the control inside the `flex-shrink-0` wrapper that `ThreatMapCounters` uses — give it its own `flex-shrink-0` wrapper. Independent layout block; future Phase 63/64 cluster indicators may want to slot between the control and the counters.
- **D-12:** `BufferSizeControl` props are passed through `LeftOverlayPanel.jsx`. Add `bufferSize` + `onBufferSizeChange` to the panel's prop list alongside the existing `counters / countryCounts / events / onEventClick / connected`. Keep the prop ordering alphabetical-ish (not critical — match existing file style).

### State Management + localStorage Persistence

- **D-13:** `bufferSize` state lives in `ThreatMapPage.jsx` as `useState(() => readBufferSize())` — lazy initializer reads `localStorage` synchronously on first render. Mirrors the established pattern already in the file: `panelsCollapsed` uses the same lazy-initializer + try/catch idiom (ThreatMapPage.jsx line 48).
- **D-14:** Persistence effect: `useEffect(() => { try { localStorage.setItem(BUFFER_SIZE_KEY, String(bufferSize)); } catch {} }, [bufferSize])`. Mirrors the `panelsCollapsed` sync effect (ThreatMapPage.jsx lines 132–139). The string serialization is deliberate — `localStorage` stores strings natively; `String(100)` is unambiguous and round-trips via `Number()` or `parseInt` cleanly.
- **D-15:** Storage key: `const BUFFER_SIZE_KEY = 'aqua-tip:threat-map-buffer-size'` — exact string required by MAPCFG-02. Declare as a module-level constant in `ThreatMapPage.jsx` (alongside the existing `STORAGE_KEY = 'aqua-tip:panels-collapsed'` on line 42).
- **D-16:** Read helper `readBufferSize()` is a **private function inside `ThreatMapPage.jsx`** (not exported, not moved to a util module — single caller, ~8 lines). Shape:
  ```
  function readBufferSize() {
    try {
      const raw = localStorage.getItem(BUFFER_SIZE_KEY);
      if (raw == null) return DEFAULT_BUFFER_SIZE;
      const n = Number(raw);
      if (!Number.isFinite(n)) return DEFAULT_BUFFER_SIZE;
      if (!BUFFER_SIZE_OPTIONS.includes(n)) return DEFAULT_BUFFER_SIZE;
      return n;
    } catch {
      return DEFAULT_BUFFER_SIZE;
    }
  }
  ```
- **D-17:** `const DEFAULT_BUFFER_SIZE = 100` — module-level constant in `ThreatMapPage.jsx`. Mirrors the `100` Phase 61 had hardcoded. Having it named defends against future drift (e.g., someone changes the fallback to `500` but forgets the hook call-site).
- **D-18:** Storage **serialization = integer-as-string** (via `String(n)` / `Number(raw)`). Rationale: `localStorage` is string-typed natively; using `JSON.stringify`/`JSON.parse` would be over-engineered for a scalar and fragile (parse error path). Numeric round-trip via `Number()` is simpler and catches all invalid values (NaN, Infinity, negative, floats outside the whitelist) via `Number.isFinite` + whitelist check.

### Validation Rules (MAPCFG-04 edge cases)

- **D-19:** Invalid-value behaviour (all fall through to `DEFAULT_BUFFER_SIZE = 100`, no throw, no user-visible error):
  - `localStorage.getItem` returns `null` (key absent) → default.
  - `localStorage.getItem` throws (e.g., storage quota, disabled) → caught by outer try/catch → default.
  - Value is non-numeric (e.g., `"abc"`, `""`) → `Number()` returns `NaN` → `Number.isFinite` catches → default.
  - Value is numeric but not in whitelist (e.g., `"250"`, `"10000"`, `"-500"`, `"0"`, `"99.5"`) → whitelist check fails → default.
  - Value is `"NaN"` or `"Infinity"` → `Number.isFinite` catches → default.
- **D-20:** Intentionally NO user-facing error banner on invalid value. MAPCFG-04 says "defaults to 100 without error" — silent fallback is the requirement. The dropdown will simply render with `100` selected; if the user set 500 and the storage got corrupted, they re-pick 500, done.
- **D-21:** The `readBufferSize()` helper runs exactly **once per page mount** (via the `useState` lazy initializer). Any `localStorage` change made by another tab (BroadcastChannel / `storage` event) is NOT synced — cross-tab sync is deferred to a future milestone (REQUIREMENTS.md "Future Requirements → MAP-SYNC"). This is an intentional non-goal for Phase 62.

### Call-Site Wiring

- **D-22:** Exact call-site change in `ThreatMapPage.jsx`:
  ```
  const { markers } = useThreatMapBuffer(events, 100);  // before (Phase 61)
  const { markers } = useThreatMapBuffer(events, bufferSize);  // after (Phase 62)
  ```
  Net: `100` → `bufferSize`. One token change.
- **D-23:** `useThreatMapBuffer.js` is **not modified**. The hook's `bufferLimitRef` + sync effect (lines 41–44) already handle dynamic `bufferSize` without SSE reconnect. Phase 61 D-16 was written for exactly this moment.
- **D-24:** `useThreatStream.js` is **not modified** (v6.1 lock, PITFALL-01, Phase 61 D-17). Its `MAX_EVENTS = 100` internal ring stays — the ring is the raw SSE buffer, orthogonal to the user-visible marker buffer. Users choosing `bufferSize = 2000` will still only see up to 100 events arrive per SSE tick window, but the marker pool accumulates unboundedly (up to the cap) because the marker hook doesn't drop already-seen events. Acceptable per REQUIREMENTS.md §"Out of Scope" (backend SSE buffer scaling).

### No SSE Reconnect — Proof Chain (MAPCFG-03)

- **D-25:** The no-reconnect guarantee rests on three ALREADY-TRUE facts (verified against the code during context gathering, documented here for the plan executor):
  1. `ThreatMapPage.jsx` renders `useThreatStream()` once per mount, with zero deps — its internal `useEffect` that opens the `EventSource` is not re-subscribed when `bufferSize` changes (bufferSize is not in its dep array because it's not even a variable `useThreatStream` knows about).
  2. `useThreatMapBuffer(events, bufferSize)` sees `bufferSize` as a parameter, but internally reads it via `bufferLimitRef.current` for eviction math (Phase 61 D-16). The events-diff effect has `[events]` as its only dep — changing `bufferSize` does NOT re-run it, so no re-diff, no SSE churn.
  3. The `bufferLimitRef` sync effect has `[bufferSize]` as its dep and runs a single `bufferLimitRef.current = bufferSize` line — it doesn't touch state, doesn't open sockets, doesn't cause re-renders of `useThreatStream`.
  Result: changing `bufferSize` from the dropdown updates the cap on the NEXT overflow-eviction tick in the buffer hook; the SSE stream is completely untouched. MAPCFG-03 satisfied architecturally.
- **D-26:** Manual QA for MAPCFG-03: DevTools Network tab → filter "EventSource". Change dropdown from 100 → 1000 → 2000 → 500 → 100. **The existing EventSource row must remain active (green dot) the entire time** — zero new connections. The plan executor should document this check explicitly in 62-VALIDATION.md.

### Visual Design

- **D-27:** Full visual contract lives in `62-UI-SPEC.md`. Summary for context completeness:
  - `BufferSizeControl` glass card matches `ThreatMapCounters` (`glass-card-static p-4`).
  - Label: `text-xs text-text-muted font-sans` (mirrors "100 Latest Attacks" sub-label hierarchy).
  - Select: Tailwind-styled native `<select>`, `bg-surface-2 border border-border rounded-lg px-2 py-1 text-sm font-mono text-text-primary`. Focus state: `focus:border-violet/50 focus:ring-1 focus:ring-violet/20` (mirrors `.input-field` from main.css).
  - Height budget: ~56px total (16px padding + 24px row + 16px padding). Does NOT push the existing feed below the fold at 800px+ viewports.
- **D-28:** The `<select>` uses the dark theme via Tailwind `bg-surface-2 text-text-primary`. Browser-default select styling is OS-theme-respecting, but Tailwind overrides the background to prevent white-on-dark flash on Chrome/Windows. The native dropdown menu (when opened) is browser-chrome — we do NOT try to theme that (impossible without a custom menu). Acceptable: it's a one-shot interaction.

### React 19 / Vite 7 Conventions

- **D-29:** No TypeScript (CLAUDE.md constraint). `BufferSizeControl.jsx` uses JSDoc for prop docs if the executor wants, but a simple component comment is fine — existing components in `threat-map/` mostly use JSDoc sparingly.
- **D-30:** No new hooks. `useState` + `useEffect` in `ThreatMapPage.jsx` is sufficient. A `useLocalStorage` custom hook would be nice-to-have but violates the "zero premature abstraction" rule (single use site in Phase 62; `panelsCollapsed` already uses the same inline pattern without a hook).
- **D-31:** React event pattern: `onChange={(e) => onChange(Number(e.target.value))}` — explicit Number coercion because `<select>` values are strings. The `Number()` conversion is safe (values are whitelist-constrained).

### Test Strategy

- **D-32:** **No new test framework installed** (Phase 61 D-24 precedent). `frontend/package.json` has no Vitest/RTL/Playwright; installing one is a dedicated infrastructure phase, not bundled here. Phase 62 verifies SC1–SC4 via **manual QA checklist** in `62-VALIDATION.md` (planner produces), same format as Phase 61.
- **D-33:** Manual QA rows to capture in 62-VALIDATION.md:
  - **SC1:** Open `/threat-map` → left panel shows "Buffer" row with select → dropdown lists `100 / 500 / 1000 / 2000` in that order → default selected = `100`.
  - **SC2:** Pick `500` → reload → dropdown reads `500` → check `localStorage` via DevTools Application tab shows `aqua-tip:threat-map-buffer-size = "500"`.
  - **SC3:** Keep DevTools Network tab open with EventSource filter → pick `1000` mid-stream → verify the EventSource row stays active, no new connection row, event list keeps ticking.
  - **SC4:** DevTools → Application → localStorage → delete the key → reload → dropdown reads `100`, map renders, no console errors.
  - **Bonus edge cases:** set the key to `"abc"` → reload → dropdown = `100`. Set the key to `"250"` → reload → dropdown = `100`. Set to `"2000"` → reload → dropdown = `2000`.

### Claude's Discretion

The following implementation details are NOT locked by this context. Downstream planner/executor pick the cleanest option consistent with project conventions:

- Whether to pre-create the `BufferSizeControl.jsx` component as JSX + Tailwind inline, or add a small dedicated CSS class in `components.css` for the select. Tailwind-inline is preferred (matches the rest of the threat-map folder), but a `.buffer-size-select` class is acceptable if the utility chain grows past ~6 classes.
- Whether to export `BUFFER_SIZE_OPTIONS` as a named export from `BufferSizeControl.jsx` or from a shared constants file. If Phase 63 needs the 500 threshold as a named constant, Phase 63 introduces its own `CLUSTER_THRESHOLD = 500`; Phase 62 doesn't need to anticipate that.
- Whether `readBufferSize()` is declared inside `ThreatMapPage` (closure capture of `BUFFER_SIZE_OPTIONS` + `DEFAULT_BUFFER_SIZE`) or module-level. Module-level is cleaner (pure function, no closure); inside-component is also fine. Planner's call.
- Whether the select's Tailwind chain includes `appearance-none` + custom chevron (requires the `lucide-react` ChevronDown icon) or leaves the native browser chevron. Native chevron is simpler and Phase 62's scope is MAPCFG — not visual polish. UI-SPEC specifies the chosen approach.
- Whether `onChange` is inlined in the JSX or extracted to a `handleBufferSizeChange` useCallback in `ThreatMapPage`. Given the handler is one line (`setBufferSize(Number(e.target.value))`), inline is fine; `useCallback` is noise at this scale.

### Folded Todos

None — no pending todos in the todo system intersect with this phase's scope.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap + Requirements
- `.planning/ROADMAP.md` §"Phase 62: Frontend Buffer-Size Dropdown" — Goal + SC1–SC4
- `.planning/ROADMAP.md` §"Key Architectural Notes" — PITFALL-01 (useRef for bufferSize — already satisfied by Phase 61 D-16)
- `.planning/REQUIREMENTS.md` §"Map Buffer Size Selector (MAPCFG)" — MAPCFG-01 through MAPCFG-04
- `.planning/PROJECT.md` §"Constraints" — No TypeScript, React 19 + Vite 7 stack, zero new deps convention
- `.planning/STATE.md` §"Accumulated Context → Decisions" — v6.1 locked decisions (bufferSize via useRef already in hook, ready for dropdown wiring)

### Prior Phase Context (structural reference + direct handoff)
- `.planning/phases/61-frontend-threat-map-buffer-refactor/61-CONTEXT.md` — **Direct handoff: D-16 `bufferLimitRef` pattern is the foundation Phase 62 builds on.** Read this in full before planning Phase 62.
- `.planning/phases/61-frontend-threat-map-buffer-refactor/61-UI-SPEC.md` — UI-SPEC structural template (Design System, Spacing, Typography, Color, Copy, Acceptance Cues, Registry Safety, Checker Sign-Off)
- `.planning/phases/61-frontend-threat-map-buffer-refactor/61-03-SUMMARY.md` — Phase 61 wiring summary: the call site `useThreatMapBuffer(events, 100)` lives at `ThreatMapPage.jsx` line 46; Phase 62 changes `100` → `bufferSize`.
- `.planning/phases/60-backend-campaigns-service-endpoint/60-CONTEXT.md` — CONTEXT.md structure template (same four sections used here)

### v6.1 Research (authoritative)
- `.planning/research/ARCHITECTURE.md` §1 "Threat Map Buffer Refactor" — already-implemented architecture; Phase 62 is the UI surface.
- `.planning/research/PITFALLS.md` §PITFALL-01 — Stale closure on SSE onmessage (satisfied by hook-level `bufferLimitRef`, no further work here).
- `.planning/research/PITFALLS.md` §PITFALL-03 — Race condition: dropdown change during SSE burst. Documented that the `bufferLimitRef` pattern is the mitigation; Phase 62 executor verifies via DevTools (rapidly flip dropdown during a burst — no marker miscount, no dropped events).
- `.planning/research/STACK.md` — React/Tailwind stack reference + dark-theme color tokens.

### Frontend Code (existing patterns to mirror / integration points)
- `frontend/src/pages/ThreatMapPage.jsx` — the single page this phase modifies. Lines 42–55 (state declarations), line 46 (hook call), lines 132–139 (existing `panelsCollapsed` localStorage persistence — exact pattern to mirror for `bufferSize`).
- `frontend/src/components/threat-map/LeftOverlayPanel.jsx` — takes new `bufferSize` + `onBufferSizeChange` props, renders `BufferSizeControl` above `ThreatMapCounters`.
- `frontend/src/components/threat-map/ThreatMapCounters.jsx` — visual reference for the new `BufferSizeControl` card (`glass-card-static p-4` pattern, text-xs muted sub-label).
- `frontend/src/components/ui/SimpleDropdown.jsx` — considered and REJECTED for this use (D-02); referenced here so the planner knows why native `<select>` was chosen.
- `frontend/src/hooks/useThreatMapBuffer.js` — the hook that already has `bufferLimitRef` (lines 41–44); **not modified in Phase 62**, but the planner should re-read to confirm the contract.
- `frontend/src/hooks/useThreatStream.js` — **not modified in Phase 62** (v6.1 lock). The SSE open lives in its own effect, independent of `bufferSize`.
- `frontend/src/styles/main.css` §`.input-field` (lines 89–94) — Tailwind @apply reference for the select's focus styling.
- `frontend/src/styles/glassmorphism.css` §`.glass-card-static` (lines 17–23) — the card wrapper pattern reused for `BufferSizeControl`.
- `frontend/tailwind.config.js` — color tokens: `violet #7A44E4`, `border #1E2030`, `surface-2 #161822`, `text-primary #E8EAED`, `text-muted #5A6173`.

### External (informational only)
- MDN `<select>` + `<label for>` — native semantics; no surprise.
- React 19 controlled-component patterns — identical to 18.x for `<select>`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Phase 61 `useThreatMapBuffer(events, bufferSize)`:** already parameterised on `bufferSize`, already PITFALL-01-safe via `bufferLimitRef`. Phase 62 only changes the argument passed in.
- **`panelsCollapsed` localStorage pattern in `ThreatMapPage.jsx`:** exact template for `bufferSize` persistence. Lines 48–54 (lazy-init + try/catch) and lines 132–139 (sync effect + try/catch) are the copy-paste targets — replace the key, replace the value type (boolean → number), and validate via whitelist instead of `=== 'true'` comparison.
- **`glass-card-static p-4` wrapper:** used by `ThreatMapCounters` — visual neighbour to the new `BufferSizeControl`. Reuse verbatim.
- **Tailwind color tokens:** `bg-surface-2` (`#161822`), `border-border` (`#1E2030`), `text-text-primary` (`#E8EAED`), `text-text-muted` (`#5A6173`), `violet` (`#7A44E4`). No new tokens introduced.
- **`.input-field` Tailwind @apply (main.css lines 89–94):** reference chain for select focus styling — copy the `focus:outline-none focus:border-violet/50 focus:ring-1 focus:ring-violet/20` pattern.

### Established Patterns
- **localStorage with try/catch:** established by `panelsCollapsed` and decision "localStorage-backed useState with try/catch — handle storage unavailability gracefully" (PROJECT.md Key Decisions).
- **Module-level storage keys:** `ThreatMapPage.jsx` line 42 declares `const STORAGE_KEY = 'aqua-tip:panels-collapsed'`. Phase 62 adds a sibling `const BUFFER_SIZE_KEY = 'aqua-tip:threat-map-buffer-size'`.
- **Lazy-init `useState` for storage reads:** `panelsCollapsed` uses `useState(() => ...)` — Phase 62 uses the same form for `bufferSize`.
- **Single-file components in `threat-map/`:** the folder has 9 small files averaging <100 LOC each. `BufferSizeControl.jsx` fits the pattern (expected ~40 LOC).
- **Prop drilling through panels:** `LeftOverlayPanel` already receives ~5 props drilled from the page. Adding `bufferSize` + `onBufferSizeChange` is consistent with the established style — no context provider needed at this scale.

### Integration Points
- **`ThreatMapPage.jsx` line 42:** add `const BUFFER_SIZE_KEY = 'aqua-tip:threat-map-buffer-size'` below the existing `STORAGE_KEY` declaration. Add `const BUFFER_SIZE_OPTIONS = [100, 500, 1000, 2000]` and `const DEFAULT_BUFFER_SIZE = 100` nearby (either in-page or imported from `BufferSizeControl`).
- **`ThreatMapPage.jsx` line 46:** change `useThreatMapBuffer(events, 100)` → `useThreatMapBuffer(events, bufferSize)`. Add `const [bufferSize, setBufferSize] = useState(readBufferSize)` before the hook call. Wire the setter through to `LeftOverlayPanel` as `onBufferSizeChange={setBufferSize}`.
- **`ThreatMapPage.jsx` lines 132–139:** add a sibling `useEffect([bufferSize])` that calls `localStorage.setItem(BUFFER_SIZE_KEY, String(bufferSize))` with try/catch.
- **`LeftOverlayPanel.jsx` line 20:** extend the destructured props with `bufferSize, onBufferSizeChange`.
- **`LeftOverlayPanel.jsx` line 22 (`panelContent`):** prepend `<BufferSizeControl value={bufferSize} onChange={onBufferSizeChange} />` inside a new `<div className="flex-shrink-0">` wrapper before the existing `<ThreatMapCounters>` block.
- **Feed-panel click-to-fly / peek state / panel collapse:** **untouched** — orthogonal to buffer sizing.

### Files NOT Modified
- `frontend/src/hooks/useThreatMapBuffer.js` — Phase 61 already parameterised it.
- `frontend/src/hooks/useThreatStream.js` — v6.1 lock (PITFALL-01).
- `frontend/src/hooks/useLeaflet.js` — unrelated.
- `frontend/src/components/threat-map/RightOverlayPanel.jsx` — no buffer semantics in the right panel.
- `frontend/src/styles/animations.css` — no new animations needed.
- `frontend/src/styles/glassmorphism.css` — reuses existing `.glass-card-static`.
- `frontend/src/styles/components.css` — no new classes needed if Tailwind utilities suffice (planner's discretion).
- `frontend/tailwind.config.js` — no new tokens.

</code_context>

<specifics>
## Specific Ideas

- **Dropdown re-ordering guard:** the options must render in ascending numeric order `100 / 500 / 1000 / 2000`. Do NOT sort at render time (the whitelist array is authored in order). If a future refactor adds more presets, keep them in ascending order in the source constant.
- **Reload-robustness:** the storage key is reloaded on **every page mount**, not on every re-render. This is a deliberate design choice (D-21) and a perf consideration — `localStorage.getItem` is synchronous IO, but reading it once at mount costs <1ms and is below the noise floor.
- **Typing in the select (native keyboard shortcut):** browsers let users type a digit to jump to the next option starting with it. With numeric options 100/500/1000/2000, typing "1" jumps to 100, "5" jumps to 500, "1" again jumps to 1000 (browser-specific). This is free accessibility; don't break it with custom JS.
- **Mobile UX:** native `<select>` opens the platform-native picker on iOS/Android — accessible by default. A custom dropdown would need extra work for touch. Another reason native select wins here.
- **Value coercion PITFALL:** `<select value={100}>` with `<option value={100}>` actually passes strings to the DOM (`"100"`). Use `<option value={size}>` where `size` is a number — React handles the number-to-string coercion — and read back via `Number(e.target.value)` in the onChange. Do NOT store as string and convert at the call-site; the state should be a Number so the hook's `bufferSize` parameter types align with `bufferLimitRef.current`.
- **Default value round-trip:** on first ever page load, `localStorage` has no key → `readBufferSize()` returns `100` → `useState(100)` → select renders with `100` selected. First `setBufferSize(500)` call triggers the persistence effect → storage now has `"500"`. Reload → `readBufferSize()` returns `500` → select renders with `500` selected. Round-trip verified in the SC2 manual QA step.
- **Tailwind quirk with native select:** without `appearance-none`, the native browser chevron renders; WITH `appearance-none`, Tailwind needs a custom chevron or the dropdown looks broken. We keep native chevron (no `appearance-none`) for simplicity — matches the "not a visual polish phase" positioning.
- **Focus ring contrast:** `focus:ring-violet/20` on `#161822` background = acceptable contrast at 2px ring width. No WCAG AA issue at this accent intensity because the ring is advisory, not semantic.
- **Re-render count:** changing `bufferSize` re-renders `ThreatMapPage` + `LeftOverlayPanel` + `BufferSizeControl`. `RightOverlayPanel` also re-renders (same parent) — acceptable at the 1-change-per-user-action cadence. No memo optimisation needed at this scale.

</specifics>

<deferred>
## Deferred Ideas

- **Marker clustering when bufferSize > 500** → Phase 63 (MAPCLU-01..05). Phase 62 simply produces the state value Phase 63 reads.
- **Backend snapshot `?limit=` frontend wiring** → Deferred to Phase 63 or later. The backend already supports it (Phase 59), but the UX of a larger initial hydration only matters at larger cluster-enabled caps; Phase 62 accepts incremental fill via live SSE.
- **Cross-tab sync (BroadcastChannel / `storage` event listener)** → Future milestone (REQUIREMENTS.md "Future Requirements → MAP-SYNC"). Per-tab state is acceptable for v6.1.
- **Custom dropdown with dark-themed option list** → Not needed for Phase 62 (native `<select>` satisfies MAPCFG-01). If v7+ demands unified dark menus, introduce a shared Select component then.
- **Tooltip "Controls the maximum number of persistent markers on the map"** → Requires a new Tooltip primitive which does not exist in the project. Not justified by MAPCFG-01..04 — label position + context are sufficient.
- **Animated value transition on change** → Not spec'd, not needed. Dropdown is an instantaneous mode switch; the buffer hook handles the cap update silently.
- **`useLocalStorage` custom hook extraction** → Premature (single caller in Phase 62; `panelsCollapsed` already inlines the pattern without a hook). Extract at N≥3 usage sites.
- **`BUFFER_SIZE_OPTIONS` exported from a shared constants file** → Deferred until a second consumer exists (Phase 63 cluster-threshold check may introduce the 500 threshold; it can import from `BufferSizeControl.jsx` or author its own constant).
- **Installing Vitest + React Testing Library** → Out of scope for v6.1 (Phase 61 D-24 precedent). Manual QA via 62-VALIDATION.md is sufficient.
- **Live-tuning slider UI (granular 100–2000 range)** → Rejected. MAPCFG-01 locks four presets; a slider introduces cluster-threshold races and a lot more testing surface. Presets are final.

### Reviewed Todos (not folded)
None — no pending todos were reviewed that fall outside this phase's scope.

</deferred>

---

*Phase: 62-frontend-buffer-size-dropdown*
*Context gathered: 2026-04-18 (autonomous mode, discuss-phase --auto — all decisions are Claude's discretion based on locked v6.1 roadmap patterns, Phase 61's bufferLimitRef handoff, and MAPCFG-01..04 success criteria)*
