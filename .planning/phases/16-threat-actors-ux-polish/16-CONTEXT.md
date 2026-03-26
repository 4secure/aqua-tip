# Phase 16: Threat Actors UX Polish - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Remove motivation filter and sort toggle from Threat Actors page, hardcode newest-first ordering, and replace the bottom PaginationControls with an inline pagination toolbar beside the search bar (matching the Threat News pattern). Cards, modal, grid layout, and search behavior remain unchanged.

</domain>

<decisions>
## Implementation Decisions

### Toolbar layout
- Exact match of Threat News pattern: search input on the left, "1–24 of N" count + prev/next chevron arrows on the right, all in one row
- Pagination at top only — no bottom pagination
- Keep current placeholder text: "Search Threat Actors, Keywords..."

### Removed controls — motivation filter
- Remove `MOTIVATION_OPTIONS` constant
- Remove motivation filter dropdown from the toolbar
- Remove `motivation` URL search param handling entirely (no hidden param)
- Stop sending `motivation` param to the API
- Keep motivation badge visible on cards and in the detail modal (read-only info, not a filter)

### Removed controls — sort toggle
- Remove sort toggle button (ArrowUpDown)
- Remove `toggleOrder` function
- Remove `order` URL search param handling entirely (no hidden param)
- Hardcode `order: 'desc'` in the API call (always newest-first)

### PaginationControls replacement
- Remove the shared `PaginationControls` component import and bottom-of-page usage
- Inline the pagination count + prev/next arrows directly in the toolbar (same pattern as ThreatNewsPage.jsx lines 201–222)
- Delete `frontend/src/components/shared/PaginationControls.jsx` — zero consumers after this change

### Claude's Discretion
- Exact spacing between search input and pagination controls
- ChevronLeft/ChevronRight icon import handling
- Any minor responsive adjustments for the toolbar on mobile

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Threat Actors page (primary target)
- `frontend/src/pages/ThreatActorsPage.jsx` — Current implementation: motivation filter, sort toggle, bottom PaginationControls, ThreatActorCard, ThreatActorModal
- `frontend/src/api/threat-actors.js` — API client (motivation param sent here, will stop)

### Pattern reference (copy from)
- `frontend/src/pages/ThreatNewsPage.jsx` lines 185–223 — Inline toolbar pattern: search + pagination count + prev/next arrows

### Components to delete
- `frontend/src/components/shared/PaginationControls.jsx` — Shared pagination component, will have zero consumers

### Requirements
- `.planning/REQUIREMENTS.md` — TA-01, TA-02, TA-03 (completed Phase 12), Phase 16 success criteria in ROADMAP.md

### Prior phase context
- `.planning/phases/12-threat-actors-ui-refresh/12-CONTEXT.md` — Phase 12 decisions: 4-col grid, PAGE_SIZE=24, "+N more" overflow
- `.planning/phases/13-threat-news-ui-refresh/13-CONTEXT.md` — Phase 13 decisions: inline pagination pattern, sort removal precedent

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- ThreatNewsPage.jsx inline pagination: exact pattern to replicate (count display, chevron buttons, disabled states)
- `cursorHistory` + `currentOffset` pattern: already in ThreatActorsPage, works with inline pagination
- `ChevronLeft`/`ChevronRight` icons: need to import from lucide-react (replace `ArrowUpDown` import)

### Established Patterns
- `useSearchParams` for URL state — simplifies after removing motivation and order params
- Debounced search with `useRef` timeout — stays intact
- Glassmorphism toolbar styling: `bg-surface border border-border rounded-lg`

### Integration Points
- Search bar div (lines 159–193): replace entire flex container — remove motivation dropdown and sort button, add inline pagination
- Bottom PaginationControls (lines 244–250): remove entirely
- API call params (line 58): remove `order` variable, hardcode `order: 'desc'`; remove motivation param
- `loadData` dependency array (line 74): remove `motivation` and `order`

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Match the Threat News toolbar pattern exactly for visual consistency between the two pages.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 16-threat-actors-ux-polish*
*Context gathered: 2026-03-18*
