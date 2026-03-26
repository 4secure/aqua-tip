# Phase 13: Threat News UI Refresh - Research

**Researched:** 2026-03-18
**Domain:** React UI refactoring (layout transformation, component removal)
**Confidence:** HIGH

## Summary

Phase 13 transforms the Threat News page from a card grid to a scannable row-based (inbox-style) layout, adds entity tags to rows and modal, removes confidence level entirely, and consolidates the top bar into a single search + pagination toolbar. This is a pure frontend refactor within a single file (`ThreatNewsPage.jsx`) plus minor skeleton adaptation.

The existing code is well-structured with clearly separable concerns. `ReportCard` becomes `ReportRow`, the confidence-related code (constant, function, JSX) gets deleted, the filter bar collapses into a toolbar, and `PaginationControls` moves from below the grid to inline in the toolbar. No new dependencies are needed. The Phase 12 "+N more" overflow pattern is directly reusable.

**Primary recommendation:** Treat this as a single-plan phase with 4-5 sequential tasks in one file, leveraging existing helpers (`chipColor`, `formatDate`, `PaginationControls`).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Compact single-line rows: title, published date, and entity tags all on one horizontal line
- No description in rows -- description stays in the detail modal only
- Subtle border-border divider between rows (inbox-style)
- Background highlight (bg-surface-2) on row hover to signal clickability
- Rows are clickable -- open the detail modal (same as current card click behavior)
- 3 entity tags visible per row, then "+N more" overflow badge (consistent with Phase 12)
- Tags keep current color-coding by entity type (violet=actors, red=malware, cyan=indicators, amber=attack patterns)
- Clicking a tag filters the report list by that entity (current behavior preserved)
- Entity filter violet banner stays when a tag filter is active
- Detail modal shows ALL entity tags (no overflow cap) per TN-02
- Single toolbar above the report list containing: search input + pagination count + prev/next buttons
- Sort toggle REMOVED -- hard-coded to newest first (order=desc always)
- Confidence filter REMOVED entirely from the page (TN-03)
- Pagination at top ONLY -- no bottom pagination
- Result count format: "1-21 of 84" inline with pagination arrows
- Subheading changed from "Browse threat intelligence reports from OpenCTI" to "Browse threat intelligence reports"
- Keep current PAGE_SIZE of 21
- Remove CONFIDENCE_OPTIONS constant, confidence filter dropdown, confidenceBadge() function, confidence badge from ReportCard, confidence badge from ReportModal, confidence search param handling

### Claude's Discretion
- Exact row padding and spacing
- Loading skeleton adaptation (rows vs cards)
- Responsive behavior on mobile (single-column rows)
- Empty state styling adjustments for row layout

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TN-01 | Cards replaced with row-based table layout | ReportCard -> ReportRow transformation; single-line rows with border-b dividers; existing click handler preserved |
| TN-02 | Tags shown in both table rows and detail modal | Row: 3 tags + overflow using MAX_VISIBLE_ENTITIES=3; Modal: all tags (already shows all, just remove confidence) |
| TN-03 | Confidence level removed from entire page | Delete: CONFIDENCE_OPTIONS, confidenceBadge(), confidence param usage, confidence badges in card and modal |
| TN-04 | Pagination and count moved to top, replacing filters | Inline PaginationControls in top toolbar alongside search; remove confidence dropdown and sort toggle |
</phase_requirements>

## Standard Stack

### Core
No new libraries needed. This phase uses only what is already installed.

| Library | Purpose | Already Installed |
|---------|---------|-------------------|
| React 19 | Component framework | Yes |
| react-router-dom 7 | useSearchParams for URL state | Yes |
| framer-motion | AnimatePresence for modal | Yes |
| lucide-react | Icons (Search, ChevronLeft, ChevronRight, etc.) | Yes |

### Removed Imports After This Phase
| Import | Reason |
|--------|--------|
| `ArrowUpDown` from lucide-react | Sort toggle removed |

## Architecture Patterns

### Current File Structure (unchanged)
```
frontend/src/
  pages/ThreatNewsPage.jsx          # Main page + ReportRow + ReportModal (all inline)
  components/shared/PaginationControls.jsx  # Reused, repositioned
  components/shared/SkeletonCard.jsx        # May need SkeletonRow variant or inline skeleton
  api/threat-news.js                        # Unchanged (confidence param stays in API, just unused)
```

### Pattern 1: Row Layout (replacing Card Grid)
**What:** Each report renders as a single horizontal row with border-bottom divider instead of a card in a grid.
**Structure:**
```jsx
// ReportRow replaces ReportCard
<div
  onClick={onClick}
  className="flex items-center gap-4 px-4 py-3 border-b border-border hover:bg-surface-2 cursor-pointer transition-colors"
>
  {/* Title - takes available space */}
  <h3 className="font-display text-sm font-semibold text-text-primary truncate flex-1 min-w-0">
    {report.name}
  </h3>

  {/* Entity tags - fixed width area */}
  <div className="flex items-center gap-1.5 shrink-0">
    {visibleEntities.map(ent => (
      <button key={ent.id} onClick={e => onEntityClick(e, ent)}
        className={`${color.bg} ${color.text} text-xs px-2 py-0.5 rounded-full font-mono`}>
        {ent.name}
      </button>
    ))}
    {overflowCount > 0 && (
      <span className="bg-surface-2 text-text-muted text-xs px-2 py-0.5 rounded-full font-mono">
        +{overflowCount} more
      </span>
    )}
  </div>

  {/* Date - fixed width */}
  <span className="font-mono text-xs text-text-muted shrink-0 w-24 text-right">
    {formatDate(report.published)}
  </span>
</div>
```

### Pattern 2: Unified Top Toolbar
**What:** Search input + result count + pagination arrows in a single row, replacing the multi-row filter bar.
**Structure:**
```jsx
<div className="flex items-center gap-3">
  {/* Search input - flexible */}
  <div className="relative flex-1">
    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
    <input ... />
  </div>

  {/* Inline pagination count + arrows */}
  {pagination && (
    <div className="flex items-center gap-2 shrink-0">
      <span className="font-mono text-sm text-text-muted">1-21 of 84</span>
      <button onClick={onPrevious} disabled={!has_previous}>
        <ChevronLeft size={16} />
      </button>
      <button onClick={onNext} disabled={!has_next}>
        <ChevronRight size={16} />
      </button>
    </div>
  )}
</div>
```

### Pattern 3: Skeleton Row Loading
**What:** Replace card skeleton grid with row-shaped skeletons.
```jsx
// Inline in ThreatNewsPage or a small SkeletonRow component
<div className="space-y-0">
  {Array.from({ length: 8 }, (_, i) => (
    <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border animate-pulse">
      <div className="h-4 bg-surface-2 rounded flex-1" />
      <div className="h-4 bg-surface-2 rounded w-32" />
      <div className="h-4 bg-surface-2 rounded w-20" />
    </div>
  ))}
</div>
```

### Anti-Patterns to Avoid
- **Using a table element:** Rows are clickable with interactive tag buttons inside. HTML `<table>` makes event handling awkward. Use flex divs.
- **Extracting to separate file:** ReportRow and ReportModal are small, page-specific components. Keep inline per existing pattern.
- **Keeping confidence in API calls:** Stop passing the `confidence` search param from the frontend. The API param can remain in `threat-news.js` signature for backward compat, it just won't receive a value.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Pagination UI | Custom pagination | Existing `PaginationControls` (inline variant) | Already handles cursor logic, count display |
| Entity tag colors | New color mapping | Existing `ENTITY_TYPE_COLORS` + `chipColor()` | Already correct and tested |
| Date formatting | New formatter | Existing `formatDate()` | Already handles edge cases |
| URL state management | Custom state | Existing `useSearchParams` pattern | Already handles param sync, cursor history |

## Common Pitfalls

### Pitfall 1: Forgetting to Remove All Confidence References
**What goes wrong:** Confidence badge or filter remnant appears in UI after "removal"
**Why it happens:** Confidence is referenced in 6 separate places (constant, function, card JSX, modal JSX, search param, filter dropdown)
**How to avoid:** Systematic deletion checklist: CONFIDENCE_OPTIONS, confidenceBadge(), ReportCard badge JSX, ReportModal badge JSX, `confidence` searchParam destructure, confidence `updateParam` call, `select` dropdown JSX
**Warning signs:** Any remaining reference to `confidence` in ThreatNewsPage.jsx after the refactor

### Pitfall 2: MAX_VISIBLE_ENTITIES Change Not Applied
**What goes wrong:** Row shows 4 tags (old value) instead of 3 (new value per CONTEXT.md)
**Why it happens:** Current `MAX_VISIBLE_ENTITIES = 4`, needs to change to `3` for rows
**How to avoid:** Update the constant value from 4 to 3

### Pitfall 3: Entity Tag Click Propagation in Rows
**What goes wrong:** Clicking a tag also opens the modal (row click handler fires)
**Why it happens:** Click event bubbles from tag button to row div
**How to avoid:** Keep `e.stopPropagation()` in `handleEntityChipClick` (already implemented correctly)

### Pitfall 4: Pagination Count Format Mismatch
**What goes wrong:** Count shows "Showing 1-21 of 84" instead of "1-21 of 84"
**Why it happens:** PaginationControls prepends "Showing" in its label
**How to avoid:** Either modify PaginationControls to accept a format prop, or inline the count display in the toolbar instead of reusing the component

### Pitfall 5: Order Param Still in URL
**What goes wrong:** Old bookmarks with `?order=asc` still work but show oldest-first
**Why it happens:** `order` searchParam still read even though toggle removed
**How to avoid:** Hard-code `order: 'desc'` in loadData, ignore URL param. Remove `order` from searchParams destructure.

## Code Examples

### Confidence Removal Checklist
```jsx
// DELETE these lines/blocks:
const CONFIDENCE_OPTIONS = [...];                    // Line 17-22
function confidenceBadge(confidence) {...}           // Line 38-42
const confidence = searchParams.get('confidence');   // Line 74
// In loadData: if (confidence) params.confidence = confidence;  // Line 85
// In ReportCard: const badge = confidenceBadge(...) + badge JSX
// In ReportModal: const badge = confidenceBadge(...) + badge JSX
// The <select> dropdown for confidence filter (lines 222-232)
// Remove 'confidence' from loadData useCallback deps
```

### Sort Toggle Removal
```jsx
// DELETE:
const order = searchParams.get('order') || 'desc';  // Line 75
const toggleOrder = useCallback(...)                 // Lines 163-165
// The ArrowUpDown button JSX (lines 234-240)
// Import: ArrowUpDown from lucide-react

// REPLACE in loadData:
const params = { sort: 'published', order: 'desc' };  // Hard-coded
```

### Inline Pagination in Toolbar
The current `PaginationControls` component renders as a full-width flex row with "Showing X-Y of Z" on left and buttons on right. For the toolbar, we need a compact inline variant. Options:

1. **Inline the pagination JSX directly in the toolbar** (recommended -- simpler, no component API changes needed)
2. Add a `compact` prop to PaginationControls

Option 1 is cleaner since the toolbar layout is unique to this page.

## State of the Art

No technology changes needed. This is a layout refactor using existing React patterns.

| Old Approach (Current) | New Approach (Phase 13) | Impact |
|------------------------|------------------------|--------|
| 3-col card grid | Single-col row list | More scannable, fits more items |
| Confidence filter + sort toggle | Search only | Simpler toolbar |
| Pagination at bottom | Pagination at top inline | Faster navigation |
| 4 visible tags per card | 3 visible tags per row | Fits compact row layout |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None (no tests exist per CLAUDE.md) |
| Config file | none -- see Wave 0 |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TN-01 | Rows render instead of card grid | manual-only | Visual verification in browser | N/A |
| TN-02 | Tags in rows (3+overflow) and modal (all) | manual-only | Visual verification in browser | N/A |
| TN-03 | No confidence anywhere on page | manual-only | Grep for "confidence" in file | N/A |
| TN-04 | Pagination+count at top, no filter bar | manual-only | Visual verification in browser | N/A |

**Justification for manual-only:** Project has no test infrastructure (CLAUDE.md: "No tests exist"). This is a UI layout change best verified visually. Adding test infrastructure is out of scope for this phase.

### Sampling Rate
- **Per task commit:** Visual check in dev server (`npm run dev`)
- **Per wave merge:** Full page walkthrough (search, tag click, pagination, modal)
- **Phase gate:** All 4 requirements visually confirmed

### Wave 0 Gaps
None relevant -- no test infrastructure exists and adding it is out of scope for a UI refresh phase.

## Open Questions

1. **PaginationControls reuse vs inline**
   - What we know: Current component has "Showing" prefix and full-width layout
   - What's unclear: Whether to modify the shared component or inline pagination in toolbar
   - Recommendation: Inline the count + arrows directly in the toolbar. PaginationControls is used by ThreatActorsPage too -- modifying it risks breaking that page. Keep it simple.

2. **Responsive row behavior on mobile**
   - What we know: Rows should be single-column on mobile (they already are since rows are full-width)
   - What's unclear: Whether tags should wrap or hide on very narrow screens
   - Recommendation: Hide tags below sm breakpoint (tags are supplementary; title is primary). Use `hidden sm:flex` on the tags container.

## Sources

### Primary (HIGH confidence)
- `frontend/src/pages/ThreatNewsPage.jsx` -- Current implementation read in full (536 lines)
- `frontend/src/components/shared/PaginationControls.jsx` -- Pagination component (44 lines)
- `frontend/src/components/shared/SkeletonCard.jsx` -- Skeleton component (27 lines)
- `frontend/src/api/threat-news.js` -- API client (14 lines)
- `.planning/phases/13-threat-news-ui-refresh/13-CONTEXT.md` -- All locked decisions

### Secondary (MEDIUM confidence)
- `.planning/phases/12-threat-actors-ui-refresh/12-CONTEXT.md` -- Phase 12 overflow pattern reference

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, existing code fully read
- Architecture: HIGH -- straightforward layout transformation with clear patterns from CONTEXT.md
- Pitfalls: HIGH -- all identified from reading actual code, specific line numbers referenced

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (stable -- no external dependencies changing)
