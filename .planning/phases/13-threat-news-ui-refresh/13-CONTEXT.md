# Phase 13: Threat News UI Refresh - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Transform the Threat News page from a card grid to a scannable row-based layout. Add entity tags to rows and modal, remove confidence level entirely, and move pagination/count to the top alongside search. Sort toggle removed — always newest first.

</domain>

<decisions>
## Implementation Decisions

### Row layout
- Compact single-line rows: title, published date, and entity tags all on one horizontal line
- No description in rows — description stays in the detail modal only
- Subtle border-border divider between rows (inbox-style)
- Background highlight (bg-surface-2) on row hover to signal clickability
- Rows are clickable — open the detail modal (same as current card click behavior)

### Tag display
- 3 entity tags visible per row, then "+N more" overflow badge (consistent with Phase 12 actor cards)
- Tags keep current color-coding by entity type (violet=actors, red=malware, cyan=indicators, amber=attack patterns)
- Clicking a tag filters the report list by that entity (current behavior preserved)
- Entity filter violet banner stays when a tag filter is active
- Detail modal shows ALL entity tags (no overflow cap) per TN-02

### Top navigation bar
- Single toolbar above the report list containing: search input + pagination count + prev/next buttons
- Sort toggle REMOVED — hard-coded to newest first (order=desc always)
- Confidence filter REMOVED entirely from the page (TN-03)
- Pagination at top ONLY — no bottom pagination
- Result count format: "1–21 of 84" inline with pagination arrows

### Subheading
- Change from "Browse threat intelligence reports from OpenCTI" to "Browse threat intelligence reports"
- Consistent with Phase 12's OpenCTI removal from subheadings

### Page size
- Keep current PAGE_SIZE of 21 (rows are compact, 21 fits well in a list view)

### Confidence removal (TN-03)
- Remove CONFIDENCE_OPTIONS constant
- Remove confidence filter dropdown
- Remove confidenceBadge() function
- Remove confidence badge from ReportCard
- Remove confidence badge from ReportModal
- Remove confidence search param handling

### Claude's Discretion
- Exact row padding and spacing
- Loading skeleton adaptation (rows vs cards)
- Responsive behavior on mobile (single-column rows)
- Empty state styling adjustments for row layout

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Threat News page
- `frontend/src/pages/ThreatNewsPage.jsx` — Current implementation: ReportCard, ReportModal, card grid, confidence filter, pagination, entity chips
- `frontend/src/api/threat-news.js` — API client for threat news endpoint (confidence param can stay in API, just unused by frontend)
- `frontend/src/components/shared/PaginationControls.jsx` — Shared pagination component (will be repositioned to top)
- `frontend/src/components/shared/SkeletonCard.jsx` — Current skeleton (may need row-based skeleton variant)

### Requirements
- `.planning/REQUIREMENTS.md` — TN-01, TN-02, TN-03, TN-04 requirement definitions

### Prior phase context
- `.planning/phases/12-threat-actors-ui-refresh/12-CONTEXT.md` — Phase 12 decisions: +N more overflow pattern, OpenCTI subheading removal

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PaginationControls` component: Already handles cursor-based pagination with pageSize/currentOffset props — reposition from bottom to top toolbar
- `ENTITY_TYPE_COLORS` mapping: Already defined in ThreatNewsPage.jsx — reuse for tag coloring in rows
- `chipColor()` helper: Existing function for entity type color resolution
- `formatDate()` helper: Already formats dates for display
- Entity filter banner: Already implemented with violet styling and clear button

### Established Patterns
- `useSearchParams` for URL-driven state (search, entity, after cursor)
- Debounced search with `useRef` timeout pattern
- `cursorHistory` array for previous/next pagination
- Framer Motion `AnimatePresence` for modal transitions
- Glassmorphism: `bg-surface/60 border border-border backdrop-blur-sm rounded-xl`

### Integration Points
- `ReportCard` component becomes a `ReportRow` component (inline in same file)
- `ReportModal` stays largely intact — just remove confidence badge, keep all tags
- `PaginationControls` moves from below the grid to the top toolbar
- `fetchThreatNews` API call unchanged — just stop sending confidence param

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for the compact row layout and top toolbar arrangement.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 13-threat-news-ui-refresh*
*Context gathered: 2026-03-17*
