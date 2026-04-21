---
phase: 62
slug: frontend-buffer-size-dropdown
status: draft
shadcn_initialized: false
preset: none
created: 2026-04-18
---

# Phase 62 — UI Design Contract

> Visual and interaction contract for the `BufferSizeControl` dropdown that lives at the top of the Threat Map left overlay panel. Scoped to a single new component (a native `<select>` wrapped in a glass card) plus one small prop-drill through `LeftOverlayPanel`. Everything else on the map (counters, countries card, feed, right panel, topbar, status pill, basemap, buffer marker CSS from Phase 61) is **out of scope** for this phase and MUST NOT be restyled.

**Scope note (add, not redesign):** Phase 62 adds exactly one new UI element — a "Buffer" selector — that fits cleanly into the existing left-panel stack. The visual vocabulary is inherited verbatim from the threat-map panel neighbourhood (`glass-card-static`, the `ThreatMapCounters` "Global Threats / sub-label" hierarchy, the `.input-field` focus-ring token). No new colour, no new font, no new spacing token, no new keyframe. The executor's job is to slot the control into the existing grammar without drawing attention to itself.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (no shadcn; project is React 19 + Tailwind 3 hand-rolled) |
| Preset | not applicable |
| Component library | native HTML `<select>` + Tailwind utility classes. Considered and rejected: `SimpleDropdown.jsx` (excess LOC for 4 fixed presets; custom menu gives worse a11y than native). |
| Icon library | `lucide-react` available if a custom chevron is needed — NOT used in Phase 62 (native browser chevron is retained, see D-28 in CONTEXT). |
| Font | `font-sans` (Outfit) for the "Buffer" label; `font-mono` (JetBrains Mono) for the option values — mirrors the project convention of monospace for data/numeric content (dashboard stats, IP addresses, credit counts). |

**Existing neighbourhood (reuse, do not modify):**
- `frontend/src/components/threat-map/ThreatMapCounters.jsx` — direct visual sibling (glass card, label-over-value pattern)
- `frontend/src/styles/glassmorphism.css` §`.glass-card-static` (lines 17–23) — card wrapper
- `frontend/src/styles/main.css` §`.input-field` (lines 89–94) — focus-ring token reference
- `frontend/src/components/ui/SimpleDropdown.jsx` — structural reference (`bg-surface-2 border border-border rounded-lg`, violet hover tint) — mirror the tokens without importing the component

---

## Spacing Scale

Inherited from the project's Tailwind default spacing. This phase uses only tokens already established in the panel neighbourhood:

| Token | Value | Usage in Phase 62 |
|-------|-------|-------------------|
| xs | 4px | — (not used) |
| sm | 8px | Gap between label and select inside the card row (`gap-2`) |
| md | 16px | Card internal padding (`p-4` = 16px all sides — matches `ThreatMapCounters`) |
| lg | 24px | — (not used) |
| xl | 32px | — (not used) |

**Component-specific dimensions:**

| Element | Size | Rationale |
|---------|------|-----------|
| Card height | ~56px (16px top padding + 24px row + 16px bottom padding) | Fits comfortably above the existing counters card without pushing `ThreatMapFeed` below the fold at 800px+ viewport heights. |
| Select min-width | ~88px (~5ch + chevron) | Accommodates the widest option ("2000") at `text-sm font-mono` without wrap; leaves horizontal room for the "Buffer" label on the left. |
| Select padding | `px-2 py-1` (8px / 4px) | Balances touch target (~32px overall row height) with a compact footprint. Matches the implicit "data widget" density of the left panel. |
| Focus ring offset | `ring-1` (1px ring) + `ring-violet/20` | Same intensity as `.input-field` focus — visual parity with project forms. |
| Border radius | `rounded-lg` (8px) | Matches `.input-field` and `SimpleDropdown` select surface; softer than the card's `rounded-xl` (16px) to create a subtle inner/outer hierarchy. |

No exceptions to the Tailwind spacing scale. Every size above is a direct utility class, not a custom pixel value.

---

## Typography

| Role | Class | Size | Weight | Line Height | Usage |
|------|-------|------|--------|-------------|-------|
| Label ("Buffer") | `font-sans text-xs text-text-muted` | 12px | 400 (regular) | 1 (default tight) | The descriptor to the left of the select. Mirrors `ThreatMapCounters`' "100 Latest Attacks" / "Countries" / "Attack Types" muted sub-label hierarchy — signals "contextual control, not a headline". |
| Select value display (collapsed) | `font-mono text-sm text-text-primary` | 14px | 400 | default | The number visible inside the select button when closed. Monospace because it's a number, same as dashboard stat values. |
| Option values (native dropdown) | browser-default | — | — | — | Not themeable in a native `<select>`. Acceptable: opening the dropdown is a one-shot interaction and the OS/browser-native picker is always readable. |

Rationale for not using `font-sans` on the value: the options are 3–4 digit numbers; monospace aligns the widths so the collapsed select looks stable when the user switches between 100 and 1000. Matches the dashboard's global pattern of monospace numerics.

Copy contract (see also §Copywriting):
- Label is "Buffer" (singular, no trailing colon, no "Size", no "Max") — four characters, fits in 340px panel width with the widest option.

---

## Color

**Strategy: reuse the existing left-panel palette verbatim.** No new colours are introduced. The card and select use tokens already declared in `tailwind.config.js`.

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `bg-surface/60` (via `glass-card-static` → `rgba(15, 17, 23, 0.7)`) | Card background — identical to `ThreatMapCounters` card |
| Secondary (30%) | `border-border` (`#1E2030`) + `bg-surface-2` (`#161822`) for the select | Select surface + 1px border against the card backdrop |
| Accent (10%) | `violet` (`#7A44E4`) via `focus:border-violet/50` + `focus:ring-violet/20` | Select focus ring only — no hover tint needed on the native control |
| Destructive | n/a | No destructive action in this phase |

**Text colours:**
- Label: `text-text-muted` (`#5A6173`) — matches the "100 Latest Attacks" sub-label hierarchy
- Select value: `text-text-primary` (`#E8EAED`) — same as input-field defaults
- Card border: `rgba(30, 32, 48, 0.8)` (inherited from `.glass-card-static`)

**Accent reserved for:** select focus state only. Phase 62 does NOT introduce violet outside the focus ring (no hover, no selected-option highlight — native OS picker handles that). This is consistent with Phase 61's "accent reserved for severity markers" restraint — the left panel stays dominantly dark/grey with sparse accents.

**60/30/10 on the full left panel with this component:**
- 60% dark surface (card + panel backdrop + base background)
- 30% bordered secondary surfaces (each card + countries list rows + feed rows)
- 10% accent — split across: Phase 61 severity-coloured buffer markers on the map (dominant accent consumer), `live-dot-red` / `live-dot-amber` in counters, occasional select focus ring. Phase 62 does NOT grow the accent share meaningfully — one additional potential focus ring is negligible.

---

## Copywriting Contract

Strict micro-copy — the component surfaces only numbers and a single noun.

| Element | Copy | Rationale |
|---------|------|-----------|
| Label (visible) | `Buffer` | One word. Semantically clear in context (directly above the "100 Latest Attacks" counter). "Buffer size" would push layout; "Max markers" would import a concept not used elsewhere. |
| `<label htmlFor>` target | associates with `<select id="threat-map-buffer-size">` | Screen readers announce "Buffer, combobox, 100" — meets WCAG 1.3.1 labelling. |
| Option labels | `100`, `500`, `1000`, `2000` | Integer strings, ascending. No units ("markers"), no thousands separator ("1,000"), no qualifiers ("Recommended"). The four presets are self-evident; users recognise they're picking a cap. |
| Option `value` (DOM) | the same integers, but as Number values coerced on onChange via `Number(e.target.value)` | Prevents string/number mismatch at the hook call-site (`bufferLimitRef.current` is a number). |
| Default selected | `100` | MAPCFG-04 fallback value; also matches Phase 61's hardcoded cap so there's no behaviour change on first ever load. |
| Tooltip / helper text | **none** | No tooltip primitive exists in the project (Phase 62 does not introduce one). Context (panel position, label, observable effect on markers) is self-explanatory. |
| Disabled state | **none** | The control is always enabled. |
| Error / validation message | **none** | Invalid localStorage values fall through to `100` silently (MAPCFG-04 "without throwing"). No user-visible error. |
| Empty state | **n/a** | The control always has a value. |

**Forbidden copy** (do not introduce any of these):
- Emoji or icons inside the label text
- The words "max", "limit", "cap" (we chose "Buffer" — stick with it)
- Units after the numbers ("100 markers", "500 events")
- Help text below the control

---

## Component Contract

### `BufferSizeControl` (new component)

**Location:** `frontend/src/components/threat-map/BufferSizeControl.jsx`

**Props:**
```
value: number               // one of 100 | 500 | 1000 | 2000
onChange: (n: number) => void
```

**DOM structure (reference — executor transcribes into JSX):**
```html
<div class="glass-card-static p-4 flex-shrink-0">
  <div class="flex items-center justify-between gap-2">
    <label for="threat-map-buffer-size"
           class="font-sans text-xs text-text-muted">
      Buffer
    </label>
    <select id="threat-map-buffer-size"
            class="bg-surface-2 border border-border rounded-lg
                   px-2 py-1 text-sm font-mono text-text-primary
                   focus:outline-none focus:border-violet/50
                   focus:ring-1 focus:ring-violet/20
                   transition-colors">
      <option value="100">100</option>
      <option value="500">500</option>
      <option value="1000">1000</option>
      <option value="2000">2000</option>
    </select>
  </div>
</div>
```

**Exported constants:**
```js
export const BUFFER_SIZE_OPTIONS = [100, 500, 1000, 2000];
```

Executor notes:
- The outer `flex-shrink-0` is applied at the `LeftOverlayPanel` wrapper level (mirrors how `ThreatMapCounters` is wrapped). The component itself does not self-wrap.
- Use `value={value}` on the `<select>` (controlled component); map option `value={size}` where `size` is a Number so React coerces consistently.
- `onChange={(e) => onChange(Number(e.target.value))}` — explicit coercion required.

---

## Layout Contract (LeftOverlayPanel)

### Before (Phase 61)

```
LeftOverlayPanel (expanded, 340px wide, full height)
├── ThreatMapCounters          (flex-shrink-0, glass card)
├── ThreatMapCountries          (flex-1 min-h-0, glass card, scrollable)
└── ThreatMapFeed               (flex-1 min-h-0, glass card, scrollable)
```

### After (Phase 62)

```
LeftOverlayPanel (expanded, 340px wide, full height)
├── BufferSizeControl           (flex-shrink-0, glass card, ~56px tall)  ← NEW
├── ThreatMapCounters           (flex-shrink-0, glass card)
├── ThreatMapCountries          (flex-1 min-h-0, glass card, scrollable)
└── ThreatMapFeed               (flex-1 min-h-0, glass card, scrollable)
```

**Vertical space impact:** +56px (one new card) + 16px (existing `gap-4` between children). The two `flex-1 min-h-0` children (`ThreatMapCountries`, `ThreatMapFeed`) shrink proportionally by ~36px each at a 900px panel height. Both already overflow-scroll, so the fit degrades gracefully.

**Collapsed-panel peek behaviour:** the peek overlay renders the same `panelContent` fragment — `BufferSizeControl` appears at the top of the peek panel too. No special collapsed-mode treatment required.

**z-index / stacking:** no change — `LeftOverlayPanel` sets `z-[1000]`; the select's native popup escapes the stacking context (browser-managed) so it appears above Leaflet tiles and overlay panels regardless.

---

## Interaction States

### Idle (default)

| Element | Style |
|---------|-------|
| Card | `bg-surface/60` + `border-border` (1px) + `rounded-xl` + `backdrop-blur-md` (via `.glass-card-static`) |
| Label | `text-text-muted` (`#5A6173`) |
| Select | `bg-surface-2` + `border-border` (1px) + `text-text-primary` |
| Browser chevron | native (OS-themed) — rendered by the browser; not styled |

### Hover (select)

| Element | Style |
|---------|-------|
| Select | native browser hover — `cursor: pointer` from the user-agent stylesheet; optional Tailwind `hover:border-border-light` if the executor wants a subtle hint |

**Note:** Tailwind hover on a native `<select>` is limited — most browsers don't repaint the select on hover until the picker opens. Not a concern: the click affordance comes from the visible chevron.

### Focus (tab into the select)

| Element | Style |
|---------|-------|
| Select | `border-violet/50` + `ring-1 ring-violet/20` (via `focus:` variants) |
| Card | unchanged |

The focus ring is the only violet accent in the component — it signals "keyboard is here" without altering the idle layout.

### Open (native picker)

Browser-managed. We do NOT style the open dropdown. Chrome on Windows renders a dark dropdown if the system theme is dark (respects `color-scheme: dark`); Chrome on macOS/Linux/Safari/Firefox render their own native pickers. All are accessible and readable; none exactly match the project's glassmorphism — acceptable trade-off for a4 11y-free native control.

### Selected (after user picks an option)

The new value is immediately reflected in the collapsed `<select>` display, AND the map buffer cap updates live (Phase 61 `bufferLimitRef` picks up the change on the next reconciliation tick). No animation, no confirmation toast — the visual feedback is the map's behaviour (markers eventually redistribute to the new cap).

### Disabled / Loading

**Not used.** The control is always enabled. There is no async action to await; `setBufferSize` is synchronous React state.

---

## Accessibility

| Concern | Handling |
|---------|----------|
| Label association | `<label htmlFor="threat-map-buffer-size">` + `<select id="threat-map-buffer-size">` — explicit `for`/`id` binding. Screen readers announce "Buffer, combobox, 100" on focus. |
| Keyboard navigation | Native `<select>` — arrow keys cycle options, Enter confirms, Esc closes, Tab moves focus. Type-ahead: press "1", "5", "2" to jump to 100 / 500 / 2000 (browser-default — preserved automatically). |
| Touch target | ~32px overall row height — slightly below the WCAG AAA 44px recommendation but typical of dense dashboard controls. Acceptable at the 340px panel density; mobile opens the OS-native picker which provides the 44px+ touch target. |
| Focus visibility | `focus:ring-1 focus:ring-violet/20` + `focus:border-violet/50` — 1px ring + 1px border colour change = clearly visible on the `#161822` select surface. |
| Reduced motion | Not applicable — no animation in this component. Phase 61's reduced-motion block continues to govern marker animations, which are orthogonal. |
| Colour contrast | Label `#5A6173` on `rgba(15, 17, 23, 0.7)` backdrop → ~4.3:1 (AA pass for normal text per WCAG 1.4.3). Select value `#E8EAED` on `#161822` → ~14:1 (AAA). Focus ring is advisory — contrast not gated. |
| Semantic role | Native `<select>` has `role="combobox"` implicitly — no ARIA roles added (would be redundant and can confuse screen readers). |

**`prefers-reduced-motion`:** no motion introduced in Phase 62, so no media query needed. Phase 61's `@media (prefers-reduced-motion: reduce)` block for markers is untouched.

---

## Visual Parity With Existing Behaviour

This phase MUST NOT visually regress any of the following (all shipped pre-Phase 62):

| Behaviour | Where | Phase 62 disposition |
|-----------|-------|----------------------|
| `ThreatMapCounters` glass card layout (header + 3-column stat grid) | `ThreatMapCounters.jsx` | **Untouched.** Renders immediately below the new `BufferSizeControl`. |
| `ThreatMapCountries` scrollable card | `ThreatMapCountries.jsx` | **Untouched.** Shrinks by ~36px in vertical space (still scrolls internally). |
| `ThreatMapFeed` scrollable card | `ThreatMapFeed.jsx` | **Untouched.** Shrinks by ~36px in vertical space (still scrolls internally). |
| Left-panel peek overlay (340px slide-in on hover when collapsed) | `LeftOverlayPanel.jsx` AnimatePresence blocks | **Untouched.** Peek renders the same `panelContent` with the new control at top — works for free. |
| Panel toggle (collapse/expand via `PanelToggle`) | `PanelToggle.jsx` | **Untouched.** |
| Right overlay panel | `RightOverlayPanel.jsx` | **Untouched.** No buffer semantics on the right. |
| Threat map severity markers (Phase 61 `.map-buffer-marker*` classes) | `animations.css` | **Untouched.** The dropdown changes the cap, not the marker styling. |
| `ThreatMapStatus` live/connecting pill | `ThreatMapStatus.jsx` | **Untouched.** |
| CartoDB dark tiles | `useLeaflet.js` | **Untouched.** |
| Glassmorphism and severity palette in `tailwind.config.js` | `tailwind.config.js` | **Untouched.** No new tokens. |

**Visual regression test (manual, pre/post diff):**
1. Open `/threat-map` on `main` (pre-62). Screenshot the left panel.
2. Apply Phase 62 changes. Reload. Screenshot the same panel.
3. Diff: a new ~56px "Buffer" card at the top. Everything below shifts down by (56 + 16)px. All existing cards are pixel-identical internally. No new colour tokens visible. No new font introduced. No right-panel change. No map-body change.

---

## Layering / Z-Index Contract

| Layer | z-index | Phase 62 impact |
|-------|---------|-----------------|
| Leaflet tile layer | browser default | unchanged |
| Buffer marker layer (`.map-buffer-marker*`) | `markerPane` (Leaflet z 600) | unchanged |
| Click-highlight pulse (`.map-event-pulse--highlight`) | same pane, later-inserted-wins | unchanged |
| Left overlay panel (expanded + peek) | `z-[1000]` | unchanged — new card lives INSIDE this panel |
| Right overlay panel | `z-[1000]` | unchanged |
| Panel toggle button | `z-[1001]`-ish (above panels) | unchanged |
| Topbar + sidebar (AppLayout) | app-wide | unchanged |
| Native `<select>` open picker | browser-managed (escapes all CSS z-index) | correctly appears above all map content when open |

No custom z-index added. The native picker's escape-the-stacking-context behaviour is the only reason the 4 options are visible at all when opened over Leaflet — and it's automatic.

---

## Component / File Inventory

| Artefact | Location | Shape | Change |
|----------|----------|-------|--------|
| `BufferSizeControl.jsx` | `frontend/src/components/threat-map/BufferSizeControl.jsx` | React component, ~35–45 LOC | **NEW** |
| `BUFFER_SIZE_OPTIONS` constant | exported from `BufferSizeControl.jsx` | `[100, 500, 1000, 2000]` | **NEW** |
| `ThreatMapPage.jsx` | `frontend/src/pages/ThreatMapPage.jsx` | React page | **Modified** — add `BUFFER_SIZE_KEY` + `DEFAULT_BUFFER_SIZE` constants, `readBufferSize()` helper, `bufferSize` state + persistence effect, change the hook call-site from `100` → `bufferSize`, pass `bufferSize` + `setBufferSize` to `LeftOverlayPanel` |
| `LeftOverlayPanel.jsx` | `frontend/src/components/threat-map/LeftOverlayPanel.jsx` | React component | **Modified** — add `bufferSize` + `onBufferSizeChange` props, render `BufferSizeControl` at top of `panelContent` |

**Zero changes** to:
- `frontend/tailwind.config.js`
- `frontend/src/styles/main.css`, `components.css`, `glassmorphism.css`, `animations.css`
- `frontend/src/hooks/useThreatMapBuffer.js` (Phase 61 D-23 — bufferLimitRef already in place)
- `frontend/src/hooks/useThreatStream.js` (v6.1 lock, PITFALL-01)
- `frontend/src/hooks/useLeaflet.js`
- `frontend/src/components/threat-map/` other than `LeftOverlayPanel.jsx` + the new `BufferSizeControl.jsx`
- Any page except `ThreatMapPage.jsx`

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none | not required — shadcn not initialised in this project (`components.json` absent) |
| third-party | none | not applicable |
| Browser built-ins | native `<select>` + `<label>` + `<option>` | always available; no polyfill needed |

This phase ships hand-rolled React + Tailwind + a native HTML control. No package install, no external asset fetch, no vendored snippet from third-party sources.

---

## Executor Success Criteria (what "looks correct" means)

Direct reformulations of SC1–SC4 from ROADMAP.md §Phase 62 in design-contract terms:

1. **SC1 (dropdown present, 4 options):** Opening `/threat-map` with an expanded left panel shows a new glass card at the top of the panel with the label "Buffer" on the left and a native `<select>` on the right. Opening the select reveals exactly four options in ascending order: 100, 500, 1000, 2000. The default selection is `100`.
2. **SC2 (persistence across reload):** Picking `500`, then reloading the page, restores the dropdown to `500`. DevTools → Application → Local Storage shows `aqua-tip:threat-map-buffer-size = "500"`.
3. **SC3 (no SSE reconnect on change):** With DevTools Network tab open and filter `EventSource`, changing the dropdown from `100` → `1000` mid-stream shows exactly **one** active `EventSource` connection (green status indicator), no new connection row appears, and the `events` feed in the right panel keeps ticking uninterrupted.
4. **SC4 (invalid storage → silent default):** Deleting `aqua-tip:threat-map-buffer-size` from Application → Local Storage and reloading results in the dropdown showing `100`, the map rendering normally, and zero console errors (neither `JS error` nor `unhandled promise rejection`). The same is true when setting the key to `"abc"`, `"250"`, `""`, `"NaN"`, or any value not in `[100, 500, 1000, 2000]`.
5. **No regressions (implicit):** Counters card, countries card, feed card, right overlay panel, map body, topbar, sidebar, Phase 61 marker behaviour (pulse → settle → evict) all visually identical to pre-Phase-62 `main`.
6. **Accessibility:** The select is labelled via `<label htmlFor>`, is keyboard-focusable (Tab), opens via Enter / Space / Arrow, announces "Buffer, combobox, {value}" in a screen reader, and shows a violet focus ring when focused.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS when label text is exactly "Buffer", option labels are exactly "100" / "500" / "1000" / "2000", and no tooltip/helper/error copy is introduced
- [ ] Dimension 2 Visuals: PASS when the new card matches `ThreatMapCounters` surface treatment (`glass-card-static p-4`) and the select surface uses `bg-surface-2 border border-border rounded-lg`
- [ ] Dimension 3 Color: PASS when the only non-neutral colour used is `violet` on the focus ring/border; no new colour tokens added to `tailwind.config.js`
- [ ] Dimension 4 Typography: PASS when label uses `font-sans text-xs text-text-muted` and the select value is rendered in `font-mono text-sm text-text-primary`
- [ ] Dimension 5 Spacing: PASS when card padding is `p-4`, row uses `flex items-center justify-between gap-2`, and the card shares the panel's existing `gap-4` inter-card rhythm
- [ ] Dimension 6 Registry Safety: n/a — hand-rolled component, no external registry

**Approval:** pending

---

## Deviations from `ui-brand.md`

`ui-brand.md` in this workspace describes **console output patterns** (stage banners, checkpoint boxes, status symbols) — it is the visual grammar for CLI/chat messages from the GSD orchestrator, not a visual brand for product UI. It is therefore **not applicable** to Phase 62's scope (a React/Tailwind form control on the Threat Map page). No deviations recorded because no overlap exists.

The product's visual brand is encoded in `CLAUDE.md` §"Design System" + `frontend/tailwind.config.js`, and Phase 62 adheres strictly: inherited palette (no new colours), inherited fonts (Outfit + JetBrains Mono), inherited glassmorphism card pattern (`.glass-card-static`), inherited focus-ring token (`.input-field` pattern), and inherited spacing scale (Tailwind default).
