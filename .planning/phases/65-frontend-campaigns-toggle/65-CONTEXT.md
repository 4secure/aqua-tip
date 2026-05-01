# Phase 65: Frontend Campaigns Toggle — Context

**Gathered:** 2026-05-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a pill toggle to the existing `/threat-actors` page toolbar that switches between two views: the existing **Threat Actors** card grid (unchanged behavior) and a new **Campaigns** card grid backed by Phase 60's `GET /api/threat-campaigns` endpoint. Each Campaign card shows name, first_seen/last_seen range, objective (if present), and attributed_to chips. Clicking a card opens a Campaign detail modal with full metadata. Active view is reflected in the URL via `?view=campaigns` (default `?view=actors` or no param). Switching views resets `?search=` and `?after=` per SC5.

**In scope:** CAMP-01..CAMP-06 (frontend toggle, URL state, paginated grid, detail modal).
**Out of scope:** CAMP-07/CAMP-08 (backend — already shipped Phase 60); any modifications to the Threat Actor list, modal, or victimology behavior shipped in Phase 64; any visual heatmap of campaign geography (deferred to MAP-INTERACT future requirement).

</domain>

<decisions>
## Implementation Decisions

### File Organization
- **D-01:** Extract Campaign-specific UI into separate component files. Three new files:
  - `frontend/src/components/threat-actors/CampaignCard.jsx` — single Campaign card (~80 lines)
  - `frontend/src/components/threat-actors/CampaignDetailModal.jsx` — full Campaign detail modal (~120 lines)
  - `frontend/src/api/threat-campaigns.js` — thin API client mirroring `threat-actors.js` (~20 lines, exports `fetchThreatCampaigns({...})`)
- **D-02:** `frontend/src/pages/ThreatActorsPage.jsx` (currently 986 lines, post-Phase-64) becomes the parent route that reads `?view=` from `useSearchParams()` and conditionally renders either the existing Actors block or a new Campaigns block. Estimated post-Phase-65 size: ~1100–1150 lines (well under 1500-line hard cap from CLAUDE.md). Toggle pill, the SC5 reset rule, and the search input live in shared toolbar code at the top of the page.
- **D-03:** No new route. The toggle drives view via URL query param only. `/threat-actors` (or `/threat-actors?view=actors`) shows Actors; `/threat-actors?view=campaigns` shows Campaigns. Rationale: aligns with CAMP-03/CAMP-04 verbatim and avoids the routing/layout refactor that a separate page route would require.

### Toggle UX
- **D-04:** Pill placement: inline-left of the existing search bar, in the same toolbar row. On mobile (`< md` breakpoint), pill stacks above search via `flex-wrap` (or explicit `flex-col md:flex-row`). Pagination chip remains in its current row below.
- **D-05:** Visual style: reuse the existing `.tab-bar` and `.tab-item` classes already in use by the modal tab bar (line 624 of `ThreatActorsPage.jsx`). Two `.tab-item` buttons inside a `.tab-bar` container, with active state via `.active` class. Dark glassmorphism + violet underline on active — visual consistency with the modal tabs. Zero new CSS.
- **D-06:** Pill labels exactly: "Threat Actors" and "Campaigns" (per CAMP-01 verbatim). Title-case, no icons inside the pills (existing `.tab-item` style supports icons but we're skipping for compactness — toolbar is already busy).
- **D-07:** Toggle interaction: clicking the inactive pill calls a single `setSearchParams` that sets `?view=<new>`, deletes `?search=`, deletes `?after=`. Click on the already-active pill is a no-op (no URL churn).

### URL State
- **D-08:** `?view=campaigns` → Campaigns view. Anything else (including `?view=actors`, no `?view`, or junk like `?view=foo`) → Actors view (default fallback). `useSearchParams().get('view') === 'campaigns'` is the single source of truth.
- **D-09:** On view toggle: `setSearchParams(prev => { const p = new URLSearchParams(prev); p.set('view', newView); p.delete('search'); p.delete('after'); return p; })`. Per SC5 + D-07.
- **D-10:** Search input value resets too — re-mount the search `<input>` with a `key={view}` so React remounts it, clearing the uncontrolled `defaultValue` state. Avoids the existing `defaultValue={search}` pattern getting stale across toggle.
- **D-11:** Cursor history (`cursorHistory[]` state) resets per view. Two separate `cursorHistory` states, OR one state cleared on view change. Plan should pick the simpler — likely `setCursorHistory([])` inside the toggle handler.

### Campaigns Data
- **D-12:** API client `frontend/src/api/threat-campaigns.js` mirrors `threat-actors.js`:
  ```js
  import { apiClient } from './client';
  export function fetchThreatCampaigns({ after, search, sort, order } = {}) {
    const params = new URLSearchParams();
    if (after) params.set('after', after);
    if (search) params.set('search', search);
    if (sort) params.set('sort', sort);
    if (order) params.set('order', order);
    const qs = params.toString();
    return apiClient.get(`/api/threat-campaigns${qs ? '?' + qs : ''}`);
  }
  ```
- **D-13:** Response shape (Phase 60 contract): `{ data: [campaign...], pagination: { end_cursor, has_more, total? } }`. Each campaign: `{ id, name, objective, first_seen, last_seen, modified, created, labels: [{id,value,color}], external_references: [...], attributed_to: [{id, name}] }`. **No `description` field.**
- **D-14:** No enrichment endpoint for Campaigns in Phase 65. The list payload contains everything the detail modal needs. Rationale: backend (Phase 60) intentionally returns full Campaign metadata in the list response (unlike Actors, which split list + enrichment). Avoids a second round-trip.

### Card Render (CAMP-05)
- **D-15:** `CampaignCard` displays:
  - Name (h3, `font-sans text-base font-semibold text-text-primary`)
  - Date range pill (`font-mono text-xs text-text-muted`): `<formatDate(first_seen) || '?'> — <formatDate(last_seen) || 'ongoing'>`. Re-use existing `useFormatDate` hook (already imported in `ThreatActorsPage`).
  - Objective (paragraph, `font-sans text-sm text-text-muted line-clamp-2`) when present; omit the paragraph entirely when null/empty (no placeholder text on the card itself).
  - Attributed-to chips: one chip per `attributed_to[]` item, label = item.name. Style mirrors Phase 64 victimology chips: `inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-2 border border-border text-xs font-sans text-text-primary`. Wrap via `flex flex-wrap gap-1.5`. **If `attributed_to.length === 0`, omit the chip row entirely** (per D-21 below).
- **D-16:** Card container: same outer style as `ThreatActorCard` — `bg-surface border border-border rounded-xl p-5 hover:border-violet/40 transition-colors cursor-pointer`. Click target is the entire card.
- **D-17:** Card height is content-driven, not fixed. Cards in the same row may have different heights. Acceptable — grid is `gap-4`, visual rhythm preserved.

### Detail Modal (CAMP-06)
- **D-18:** `CampaignDetailModal` mirrors the structural shell of `ThreatActorModal` (backdrop, motion, X close, Escape key, `body` overflow lock) but is much simpler — no tabs, single scrollable content area.
- **D-19:** Modal sections (in order):
  1. Header: name (h2)
  2. Date range row (first_seen — last_seen)
  3. Objective section: if present, render `<h3>Objective</h3>` + paragraph; if null/empty, render `<p class="text-text-muted">No objective specified.</p>` instead of the entire section.
  4. Attribution section: if `attributed_to.length > 0`, render `<h3>Attributed to</h3>` + chips (clickable in future; static text for v6.1 — see Deferred Ideas). If empty, **omit the section entirely** per D-21.
  5. Labels section: if `labels.length > 0`, render small label chips with their OpenCTI `color` field (use the color verbatim as inline style background, fallback to `bg-surface-2`). If empty, omit.
- **D-20:** **No "description" field rendered.** CAMP-06's mention of "description" is treated as imprecise prose — the backend payload (Phase 60) does not include `description`, only `objective`. Update REQUIREMENTS.md CAMP-06 prose to remove "description" word during this phase OR add a clarifying note. Plan should choose the cleaner option.

### Empty / Null Handling
- **D-21:** When `attributed_to.length === 0`: hide the chip row on cards AND hide the entire "Attributed to" section in the modal. Do not render placeholder "Unknown attribution" chips. Keeps cards visually quieter and matches the per-section omission pattern used in Phase 64 victimology.
- **D-22:** When `objective` is null/empty: card omits the paragraph entirely (no placeholder line). Modal renders "No objective specified." in muted text inside the Objective section. Different treatment because the modal benefits from a structural anchor; the card benefits from compactness.
- **D-23:** When `first_seen` and `last_seen` are both null: render `"Unknown date range"` in the date row (both card and modal). When only one is null: card uses `?` for the missing side and renders the known side; modal does the same.

### Loading & Error
- **D-24:** Loading state on view switch: re-use existing `SkeletonCard` count={8} pattern (line 211 of `ThreatActorsPage.jsx`). Both views share the same skeleton renderer.
- **D-25:** Error state on Campaigns fetch: re-use existing error fallback pattern from Actors (`<p>Error: {error}</p>` muted style). Per-page-level retry via the toggle pill (re-clicking the active view re-fetches via `useEffect` dep change is NOT desired — D-07 makes active-pill click a no-op). Manual retry: page refresh.

### Default Sort
- **D-26:** Initial Campaigns view sort: `?orderBy=modified&orderMode=desc` (backend default per Phase 60 service signature). The frontend does NOT send these params explicitly — backend default applies. If we later add a sort dropdown, that's a v6.2 enhancement (deferred).

### File Boundaries
- **D-27:** Files modified/created in this phase:
  - **New:** `frontend/src/components/threat-actors/CampaignCard.jsx`
  - **New:** `frontend/src/components/threat-actors/CampaignDetailModal.jsx`
  - **New:** `frontend/src/api/threat-campaigns.js`
  - **Modified:** `frontend/src/pages/ThreatActorsPage.jsx` (add view-switch logic, toggle pill, conditional render)
  - **Modified (optional, planner discretion):** `.planning/REQUIREMENTS.md` — clarify CAMP-06 description prose per D-20
- **D-28:** No CSS file changes. All styling via Tailwind utility classes + reuse of existing `.tab-bar` / `.tab-item` classes.
- **D-29:** No new dependencies. CLAUDE.md zero-dep philosophy preserved.

### Claude's Discretion
- Whether to extract a `<CampaignChip>` helper for the attributed_to + labels chip rendering if the inline JSX duplicates across CampaignCard and CampaignDetailModal. Single-caller extraction is project anti-pattern, but two callers with identical chip markup is borderline — planner's call.
- Exact Tailwind tokens for the date range pill (e.g., `text-text-muted` vs `text-text-secondary` vs explicit color). Pick the visually closest match to existing Threat Actor card.
- Subtle hover affordance variations (e.g., card lift, border glow, scale) — design polish, no behavioral implication.
- Whether the `key={view}` re-mount on the search input is sufficient OR should be replaced with a controlled-input refactor (likely overkill for this phase).
- Plan structure: single plan with atomic file additions + page edit, OR two plans (Wave 1: API client + components scaffold; Wave 2: page wiring + toggle). Phase 64 used 3 plans for similar scope; Phase 65 may compress to 2 since component extraction means the page edit is smaller.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap & Requirements
- `.planning/ROADMAP.md` §"Phase 65: Frontend Campaigns Toggle" — phase goal, SC1..SC5
- `.planning/REQUIREMENTS.md` — CAMP-01..CAMP-06 (Phase 65); CAMP-07/CAMP-08 (Phase 60, satisfied)
- `.planning/STATE.md` — current state, prior decisions
- `.planning/PROJECT.md` — project-level constraints
- `CLAUDE.md` — design tokens, font conventions, file-size rules (800 soft / 1500 hard cap)

### Backend Contract (Phase 60, ALREADY SHIPPED)
- `backend/app/Http/Controllers/ThreatCampaign/IndexController.php` — controller for `GET /api/threat-campaigns`
- `backend/app/Services/ThreatCampaignService.php:46..170` — `list()` method signature `(first=24, after, search, orderBy='modified', orderMode='desc')`
- `backend/app/Services/ThreatCampaignService.php:186..230` — response normalization (the exact campaign object shape)
- `backend/app/Services/ThreatCampaignService.php:233..` — `flattenAttributedTo()` deduped {id, name} contract
- `backend/routes/api.php:81` — route registration
- `.planning/phases/60-backend-campaigns-service-endpoint/` — Phase 60 plans + summaries (cache key correctness fix, GraphQL schema verification)

### Existing Frontend Patterns (re-use)
- `frontend/src/pages/ThreatActorsPage.jsx:1..258` — toolbar + URL state + cursor pagination + grid + skeleton + actor card; the page that grows to host the toggle
- `frontend/src/pages/ThreatActorsPage.jsx:259..510` — `ThreatActorCard` component as structural reference for `CampaignCard`
- `frontend/src/pages/ThreatActorsPage.jsx:511..988` — `ThreatActorModal` as structural reference for `CampaignDetailModal` (much simpler — no tabs)
- `frontend/src/pages/ThreatActorsPage.jsx:624..635` — existing `.tab-bar` / `.tab-item` JSX usage (the style D-05 reuses for the toggle pill)
- `frontend/src/api/threat-actors.js` — API client to mirror in `threat-campaigns.js`
- `frontend/src/api/client.js` — `apiClient.get(...)` (cookies + XSRF — already wired)
- `frontend/src/hooks/useFormatDate.js` (or wherever it lives — verify) — date formatting hook used by Threat Actor cards
- `frontend/src/components/shared/SkeletonCard.jsx` — reused for both Actors and Campaigns loading state
- `frontend/src/.../components/threat-actors/` — the directory CampaignCard/CampaignDetailModal land in (verify it exists or create it)
- `.planning/phases/64-frontend-victimology-tab/64-CONTEXT.md` — D-08 chip class string verbatim (D-15 chip pattern reuses this)

### Design System
- `frontend/tailwind.config.js` — design tokens (surface, border, text-primary, text-muted, font-sans, font-mono, violet)
- `frontend/src/styles/components.css` — `.tab-bar` and `.tab-item` definitions (verify exact class signatures)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`useSearchParams()`** — already drives `?after=` + `?search=` URL state in `ThreatActorsPage.jsx:14`. Extend to also read/write `?view=`.
- **`fetchThreatActors(...)`** — pattern to mirror for `fetchThreatCampaigns(...)` in a new sibling file.
- **`useFormatDate`** — hook already imported in the modal (line 514) for date formatting. Re-use for both card and modal date rendering.
- **`SkeletonCard`** — generic skeleton component; works for any 4-col grid card layout. Both views share it.
- **`apiClient`** (in `frontend/src/api/client.js`) — handles cookies, XSRF, error envelopes. The new `threat-campaigns.js` client uses it directly.
- **`.tab-bar` / `.tab-item` CSS classes** — already defined in `frontend/src/styles/components.css` (used at line 624 of `ThreatActorsPage.jsx` for modal tabs). D-05 reuses these for the toolbar pill toggle.
- **`PAGE_SIZE = 24`** — module-level constant at line 11. Reuse verbatim for Campaigns pagination math.
- **Cursor history pattern** — `cursorHistory[]` state + `currentOffset = cursorHistory.length * PAGE_SIZE` at lines 20 + 129. Per-view cursor history (D-11) clears on toggle.

### Established Patterns
- **Page structure** — toolbar (top), card grid (middle), modal (overlay portal). Same shape works for both views.
- **API client convention** — thin file per resource, named exports, params object → URLSearchParams. Mirror exactly.
- **Card click → modal open** — `onClick={() => setSelectedCampaign(c)}` on card, modal render guarded by `selectedCampaign && <CampaignDetailModal campaign={selectedCampaign} onClose={() => setSelectedCampaign(null)} />`. Same pattern as ThreatActorCard.
- **Modal Escape key + body overflow lock** — `useEffect` pattern at lines 524–534. Replicate verbatim in CampaignDetailModal.
- **Defensive optional chaining** — `enrichment?.victimology?.countries` style. Use `campaign?.attributed_to ?? []` defensively in chip rendering to survive a malformed payload.

### Integration Points
- `ThreatActorsPage.jsx:14` — `useSearchParams()` destructure; add `view` reader.
- `ThreatActorsPage.jsx:143–225` — toolbar JSX; this is where the toggle pill JSX inserts.
- `ThreatActorsPage.jsx:228–256` — main content render; wrap with `view === 'campaigns' ? <CampaignsView ... /> : <ActorsView ... />` (or inline conditional render).
- `ThreatActorsPage.jsx:514` — fetch effect deps; the existing fetch becomes view-aware (or a parallel fetch effect runs for Campaigns).
- New: `frontend/src/components/threat-actors/` directory — verify it exists or create it before writing CampaignCard/CampaignDetailModal.

</code_context>

<specifics>
## Specific Ideas

- User explicitly chose "Reuse existing `.tab-bar` style" over a custom rounded-pill: visual consistency across the app is the deciding factor.
- User explicitly chose "Drop description" over backend extension: avoids gating Phase 65 on backend work; CAMP-06's "description" prose is treated as imprecise (objective covers the user-facing intent).
- User explicitly chose "Hide attribution chip" for empty `attributed_to` over showing "Unknown" placeholder — matches Phase 64's per-section omission pattern.
- The toolbar inline-left placement keeps the existing single-row toolbar shape — no vertical reflow when toggling. The mobile stack happens via `flex-wrap` natural behavior.
- File extraction is justified by the existing 986-line file size; not extraction-for-extraction's-sake. CLAUDE.md "many small files" rule applies when the extraction earns its keep — here it does (parent file would otherwise breach the 1500-line hard cap).

</specifics>

<deferred>
## Deferred Ideas

- **Sort dropdown for Campaigns** (e.g., modified / first_seen / last_seen). Backend supports it (`orderBy` param). v6.2 candidate when telemetry shows sort is wanted.
- **Clickable attributed_to chips** that deep-link to the corresponding Threat Actor / Intrusion Set. Requires resolving the linked Actor's URL — Phase 65 renders chips as static text. Future polish phase.
- **Campaign-IntrusionSet relationship enrichment** — clicking a Campaign card could fetch related Threat Actors / TTPs / victims. Out of v6.1 scope; matches the "no separate enrichment endpoint" decision (D-14).
- **Visual heatmap of campaign geography** — already deferred via REQUIREMENTS.md MAP-INTERACT future requirement.
- **Per-view skeleton variants** — Campaign cards may benefit from a different skeleton shape (date range placeholder vs Actor's TTPs placeholder). v6.2 polish.
- **Campaign filtering by label / time-range** — backend would need to accept additional filters. Future capability.
- **REQUIREMENTS.md "description" prose cleanup** — CAMP-06 currently mentions "name, description, dates, objective, attribution"; D-20 drops description. Plan task should patch CAMP-06 prose during this phase.

</deferred>

---

*Phase: 65-frontend-campaigns-toggle*
*Context gathered: 2026-05-01*
