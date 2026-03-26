# Phase 12: Threat Actors UI Refresh - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Refresh the Threat Actors page to display a clean, dense 4-column card grid without visual clutter. Remove descriptions from cards and clean the page subheading. The detail modal, search, filters, and pagination behavior remain unchanged.

</domain>

<decisions>
## Implementation Decisions

### Card content density
- Remove `actor.description` from card face entirely (TA-02)
- Keep all other fields on cards: name, modified date, aliases, targeted countries, targeted sectors, motivation badge
- Aliases capped at 3 visible on card, with "+N more" indicator for overflow
- Targeted countries capped at 3 visible on card, with "+N more" indicator for overflow
- Targeted sectors capped at 3 visible on card, with "+N more" indicator for overflow
- All overflow items remain fully visible in the detail modal

### Subheading
- Replace "Browse known threat actor profiles from OpenCTI" with "Browse known threat actor profiles" (TA-03)

### Grid layout
- 4-column grid on desktop (TA-01)
- Responsive breakpoints: 1-col mobile, 2-col md (768px), 3-col lg (1024px), 4-col xl (1280px)
- Loading skeleton updated to 8 cards in the same 4-col responsive grid

### Page size
- PAGE_SIZE changed from 21 to 24 (6 even rows of 4 columns)

### Claude's Discretion
- Exact "+N more" badge styling (color, position)
- Card height equalization approach (if needed)
- Any minor spacing adjustments for narrower 4-col cards

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Threat Actors page
- `frontend/src/pages/ThreatActorsPage.jsx` -- Current implementation: ThreatActorCard, ThreatActorModal, grid layout, pagination
- `frontend/src/api/threat-actors.js` -- API client for threat actors endpoint
- `frontend/src/components/shared/PaginationControls.jsx` -- Shared pagination component (PAGE_SIZE used here)
- `frontend/src/components/shared/SkeletonCard.jsx` -- Skeleton loading component

### Requirements
- `.planning/REQUIREMENTS.md` -- TA-01, TA-02, TA-03 requirement definitions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PaginationControls` component: Already handles cursor-based pagination, receives pageSize prop
- `SkeletonCard` component: Accepts count prop, used for loading state
- Glassmorphism card pattern: `bg-surface/60 border border-border backdrop-blur-sm rounded-xl` established across codebase

### Established Patterns
- Framer Motion `AnimatePresence` for modal enter/exit
- `useSearchParams` for URL-driven filter/pagination state
- Debounced search input with `useRef` timeout pattern
- `line-clamp-*` CSS for text truncation (currently on description and country/sector lists)

### Integration Points
- `ThreatActorCard` is an inline component in ThreatActorsPage.jsx (not extracted)
- `ThreatActorModal` is also inline -- only card face changes, modal stays intact
- Grid class change is in the card grid `div` and the loading skeleton `div`
- PAGE_SIZE constant at top of file controls both frontend display and API request

</code_context>

<specifics>
## Specific Ideas

No specific requirements -- open to standard approaches for the "+N more" overflow pattern and responsive grid.

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 12-threat-actors-ui-refresh*
*Context gathered: 2026-03-17*
