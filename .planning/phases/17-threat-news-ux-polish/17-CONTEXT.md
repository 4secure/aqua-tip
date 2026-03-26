# Phase 17: Threat News UX Polish - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix the tag display to show OpenCTI labels (called "categories" in the UI) instead of related entities, add a dynamic category filter dropdown populated from all available labels, and move the date column to the first position in each report row. Row layout, pagination toolbar, modal, and search behavior remain unchanged except where modified by these changes.

</domain>

<decisions>
## Implementation Decisions

### Tag display → Category display
- Replace `related_entities` chips with OpenCTI **labels** (accessed via `objectLabel` in GraphQL)
- Labels are called **"categories"** in the UI — never "labels" or "tags"
- Remove `ENTITY_TYPE_COLORS` mapping and `chipColor()` helper — no longer entity-type-based
- Keep the current app color scheme (violet, red, cyan, amber, default) — do NOT use OpenCTI's hex colors
- Map label values to the existing color palette (Claude's discretion on mapping strategy)
- 3 category chips visible per row, "+N more" overflow badge (same pattern as before)
- Detail modal shows ALL category chips (no overflow cap)
- Clicking a category chip filters reports by that category (synced with dropdown — see below)
- Remove all `related_entities` rendering from rows and modal
- Backend GraphQL query: add `objectLabel { edges { node { id, value, color } } }` to report fragments
- Backend normalization: replace `related_entities` with `labels` array `[{ id, value, color }]`

### Dynamic category filter
- New **dropdown** placed between search input and pagination controls in the toolbar
- Single-select only — one category at a time
- Shows category name only (no report counts)
- Data source: **new backend endpoint** `GET /api/threat-news/labels` that queries OpenCTI for all report labels, cached
- Filtering: add `?label=<label_id>` query param to existing `/api/threat-news` endpoint — backend builds a `FilterGroup` on `objectLabel`
- Clicking a category chip in a row sets the dropdown to that category (single source of truth, kept in sync)
- Violet banner when filter active: "Showing reports with category: [name]" with clear button
- Replace current `entity` URL search param with `label` param
- Remove `entityFilterName` state and `handleEntityChipClick` — replaced by unified category filter

### Date column position
- Move date to **first column**: Date | Title | Categories
- Fixed width ~100px for the date column
- Primary line: current format ("Mar 19, 2026" via `formatDate()`)
- Sub-detail line below: time of day (e.g., "14:32") in smaller muted text
- Update `formatDate()` or add `formatTime()` helper for the time sub-detail
- Left-aligned (not right-aligned as before)

### Claude's Discretion
- Exact color mapping strategy for label values to app color palette
- Category filter dropdown styling (glassmorphism or standard)
- Time format (24h vs 12h) for the sub-detail line
- Loading skeleton adjustments for new row layout
- Mobile responsive behavior for the date + category columns
- Cache duration for the labels endpoint

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Threat News page (primary target)
- `frontend/src/pages/ThreatNewsPage.jsx` — Current implementation: ReportRow with entity chips, ReportModal, inline pagination toolbar, entity filter
- `frontend/src/api/threat-news.js` — API client for threat news endpoint (add label param support)

### Backend service
- `backend/app/Services/ThreatNewsService.php` — GraphQL query needs `objectLabel` fragment added, normalization needs `labels` field
- `backend/app/Http/Controllers/ThreatNews/IndexController.php` — Add `label` query param, create new labels endpoint

### Pattern reference
- `frontend/src/pages/ThreatActorsPage.jsx` — Inline pagination toolbar pattern (consistent between pages)

### Prior phase context
- `.planning/phases/13-threat-news-ui-refresh/13-CONTEXT.md` — Phase 13 decisions: row layout, tag display, pagination toolbar, "+N more" overflow
- `.planning/phases/16-threat-actors-ux-polish/16-CONTEXT.md` — Phase 16 decisions: inline pagination pattern, sort removal

### Requirements
- `.planning/ROADMAP.md` — Phase 17 success criteria

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Inline pagination toolbar (lines 201–223 in ThreatNewsPage.jsx): stays intact, category filter dropdown inserted before it
- `formatDate()` helper: reuse for date display, add `formatTime()` alongside
- `cursorHistory` + `currentOffset` pattern: unchanged
- Violet filter banner pattern (lines 227–239): reuse for category filter, update text from "entity" to "category"
- `fetchThreatNews` API client: add `label` param support

### Established Patterns
- `useSearchParams` for URL-driven state — replace `entity` param with `label`
- Debounced search with `useRef` timeout — unchanged
- Framer Motion `AnimatePresence` for modal — unchanged
- Glassmorphism: `bg-surface/60 border border-border backdrop-blur-sm rounded-xl`

### Integration Points
- GraphQL query in ThreatNewsService: add `objectLabel` fragment, remove entity object fragments if no longer needed
- `normalizeResponse()`: replace `flattenRelatedEntities()` with `flattenLabels()` method
- New route: `GET /api/threat-news/labels` — new controller + method or inline in existing controller
- Frontend: new `fetchThreatNewsLabels()` function in `api/threat-news.js`

</code_context>

<specifics>
## Specific Ideas

- Categories are what OpenCTI calls "labels" — the UI must consistently call them "categories"
- Category chips and dropdown filter must stay in sync — clicking a chip selects it in the dropdown, selecting from dropdown shows the banner
- Date sub-detail shows time below the date for quick temporal scanning

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 17-threat-news-ux-polish*
*Context gathered: 2026-03-19*
