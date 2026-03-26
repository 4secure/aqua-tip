# Phase 17: Threat News UX Polish - Research

**Researched:** 2026-03-19
**Domain:** React UI refactoring + Laravel/OpenCTI GraphQL backend changes
**Confidence:** HIGH

## Summary

This phase modifies an existing, working Threat News page (built in Phase 13) to fix tag display, add a dynamic category filter, and reorder columns. The scope is well-constrained: one frontend page (`ThreatNewsPage.jsx`), one API client file (`threat-news.js`), one backend service (`ThreatNewsService.php`), one controller (`IndexController.php`), plus one new controller/route for labels. All patterns already exist in the codebase from phases 13 and 16.

The core technical challenge is the OpenCTI GraphQL integration: replacing `objects` inline fragments (related entities) with `objectLabel` edges for report labels, and adding a new query for all available labels. The frontend changes follow established patterns (inline pagination toolbar, URL-driven state via `useSearchParams`, glassmorphism styling).

**Primary recommendation:** Work backend-first (GraphQL query changes + new labels endpoint), then frontend (column reorder + category chips + dropdown filter). Keep changes minimal -- this is surgical refactoring, not a rewrite.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Replace `related_entities` chips with OpenCTI **labels** (accessed via `objectLabel` in GraphQL)
- Labels are called **"categories"** in the UI -- never "labels" or "tags"
- Remove `ENTITY_TYPE_COLORS` mapping and `chipColor()` helper -- no longer entity-type-based
- Keep the current app color scheme (violet, red, cyan, amber, default) -- do NOT use OpenCTI's hex colors
- 3 category chips visible per row, "+N more" overflow badge (same pattern as before)
- Detail modal shows ALL category chips (no overflow cap)
- Clicking a category chip filters reports by that category (synced with dropdown)
- Remove all `related_entities` rendering from rows and modal
- Backend GraphQL query: add `objectLabel { edges { node { id, value, color } } }` to report fragments
- Backend normalization: replace `related_entities` with `labels` array `[{ id, value, color }]`
- New **dropdown** placed between search input and pagination controls in the toolbar
- Single-select only -- one category at a time
- Shows category name only (no report counts)
- Data source: new backend endpoint `GET /api/threat-news/labels` that queries OpenCTI for all report labels, cached
- Filtering: add `?label=<label_id>` query param to existing `/api/threat-news` endpoint -- backend builds a `FilterGroup` on `objectLabel`
- Clicking a category chip in a row sets the dropdown to that category (single source of truth, kept in sync)
- Violet banner when filter active: "Showing reports with category: [name]" with clear button
- Replace current `entity` URL search param with `label` param
- Remove `entityFilterName` state and `handleEntityChipClick` -- replaced by unified category filter
- Move date to **first column**: Date | Title | Categories
- Fixed width ~100px for the date column
- Primary line: current format ("Mar 19, 2026" via `formatDate()`)
- Sub-detail line below: time of day in smaller muted text
- Update `formatDate()` or add `formatTime()` helper for the time sub-detail
- Left-aligned (not right-aligned as before)

### Claude's Discretion
- Exact color mapping strategy for label values to app color palette
- Category filter dropdown styling (glassmorphism or standard)
- Time format (24h vs 12h) for the sub-detail line
- Loading skeleton adjustments for new row layout
- Mobile responsive behavior for the date + category columns
- Cache duration for the labels endpoint

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19 | UI framework | Already in use |
| react-router-dom | 7 | URL search params for filter state | Already in use, `useSearchParams` pattern established |
| framer-motion | (current) | AnimatePresence for modal | Already in use, no changes needed |
| Lucide React | (current) | Icons (ChevronDown for dropdown) | Already in use |
| Laravel | 11 | Backend API framework | Already in use |
| Tailwind CSS | 3 | Styling | Already in use |

### Supporting
No new dependencies needed. This phase uses only what exists.

### Alternatives Considered
None -- locked decision: zero new dependencies.

## Architecture Patterns

### Recommended Changes Structure
```
backend/
  app/Services/ThreatNewsService.php          # Modify: GraphQL query + normalization
  app/Http/Controllers/ThreatNews/
    IndexController.php                        # Modify: add `label` query param
    LabelsController.php                       # NEW: GET /api/threat-news/labels
  routes/api.php                               # Add labels route

frontend/src/
  pages/ThreatNewsPage.jsx                     # Modify: column order, category chips, dropdown
  api/threat-news.js                           # Modify: add label param + fetchThreatNewsLabels()
```

### Pattern 1: OpenCTI objectLabel GraphQL Fragment
**What:** Replace the `objects(first: 20)` inline fragments with `objectLabel` edges
**When to use:** When fetching labels/categories assigned to reports
**Example:**
```graphql
# Add to report query (replaces objects fragment)
objectLabel {
  edges {
    node {
      id
      value
      color
    }
  }
}
```

### Pattern 2: OpenCTI FilterGroup for Label Filtering
**What:** Build a FilterGroup to filter reports by objectLabel ID
**When to use:** When the `label` query param is provided
**Example:**
```php
// In ThreatNewsService::executeQuery()
if ($labelId) {
    $filterGroups = [];
    $filters = [
        [
            'key' => 'objectLabel',
            'values' => [$labelId],
            'operator' => 'eq',
            'mode' => 'or',
        ],
    ];
    // Merge with existing confidence filter if present
    $variables['filters'] = [
        'mode' => 'and',
        'filters' => $filters,
        'filterGroups' => $filterGroups,
    ];
}
```

### Pattern 3: Standalone Labels Query
**What:** Query all available labels from OpenCTI for the dropdown
**When to use:** New `/api/threat-news/labels` endpoint
**Example:**
```graphql
query {
  labels(first: 100, orderBy: value, orderMode: asc) {
    edges {
      node {
        id
        value
        color
      }
    }
  }
}
```
Note: `labels` is a top-level query in OpenCTI's GraphQL schema. It returns all labels in the platform, not just those on reports. This is acceptable since we want all available categories for filtering.

### Pattern 4: URL-Driven Category Filter (Frontend)
**What:** Single source of truth for category filter via URL search params
**When to use:** Replacing the old `entity` param with `label`
**Example:**
```jsx
// URL param: ?label=<label_id>
const label = searchParams.get('label') || '';

// Category chip click sets the filter
const handleCategoryClick = (e, category) => {
  e.stopPropagation();
  updateParam('label', category.id);
  setCategoryFilterName(category.value);
};

// Dropdown change sets the filter
const handleCategoryDropdownChange = (labelId, labelName) => {
  setCategoryFilterName(labelName);
  updateParam('label', labelId);
};
```

### Pattern 5: Color Mapping Strategy (Claude's Discretion)
**What:** Map label values to the existing 5-color palette deterministically
**Recommendation:** Use a hash-based mapping so the same label always gets the same color. Five colors available: violet, red, cyan, amber, default(surface-2/muted).
**Example:**
```jsx
const CATEGORY_COLORS = [
  { bg: 'bg-violet/20', text: 'text-violet' },
  { bg: 'bg-cyan/20', text: 'text-cyan' },
  { bg: 'bg-amber/20', text: 'text-amber' },
  { bg: 'bg-red/20', text: 'text-red' },
  { bg: 'bg-surface-2', text: 'text-text-muted' },
];

function categoryColor(labelValue) {
  let hash = 0;
  for (let i = 0; i < labelValue.length; i++) {
    hash = ((hash << 5) - hash) + labelValue.charCodeAt(i);
    hash |= 0;
  }
  return CATEGORY_COLORS[Math.abs(hash) % CATEGORY_COLORS.length];
}
```
This is deterministic (same label always gets same color) and requires no configuration.

### Anti-Patterns to Avoid
- **Using OpenCTI hex colors directly:** Locked decision says keep app color scheme. The `color` field from labels is stored but NOT used for chip styling.
- **Multi-select dropdown:** Locked decision says single-select only.
- **Separate state for chip clicks vs dropdown:** Must be unified -- one `label` param drives both.
- **Keeping `related_entities` alongside labels:** Must fully replace, not augment.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dropdown component | Custom select from scratch | Native `<select>` styled with Tailwind or a simple custom dropdown div | The dropdown has only ~20-50 items max, single-select. A native select or simple styled div is sufficient. |
| URL state management | Custom state sync logic | `useSearchParams` from react-router-dom | Already the established pattern in this codebase |
| Cache layer | Custom cache | Laravel `Cache::remember()` | Already used in ThreatNewsService |

## Common Pitfalls

### Pitfall 1: GraphQL objects Fragment Removal
**What goes wrong:** Removing the `objects(first: 20)` fragment but forgetting that `flattenRelatedEntities()` is still called in `normalizeResponse()`.
**Why it happens:** The normalization method references `$node['objects']` which won't exist after the query change.
**How to avoid:** Remove `flattenRelatedEntities()` method entirely, replace with `flattenLabels()` that reads from `$node['objectLabel']`.
**Warning signs:** Backend 500 error on undefined array key.

### Pitfall 2: Filter Merging with Existing Confidence Filter
**What goes wrong:** The `label` filter overwrites the `confidence` filter (or vice versa) instead of merging them.
**Why it happens:** Both need to go into `$variables['filters']` as a FilterGroup. Currently confidence is the only filter.
**How to avoid:** Build the filters array incrementally -- push both confidence and label filters into the same `filters` array within the FilterGroup.
**Warning signs:** Applying category filter removes any active confidence filter (confidence is currently unused in UI but the code path exists).

### Pitfall 3: Label ID vs Label Value in URL
**What goes wrong:** Using label name/value in the URL param instead of ID, causing issues with labels that have special characters or duplicates.
**Why it happens:** Easier to read in URL, but fragile.
**How to avoid:** Use `label=<label_id>` in URL as specified in CONTEXT.md. Store the display name in component state (`categoryFilterName`) for the banner text.
**Warning signs:** Filters break for labels with spaces, ampersands, or unicode.

### Pitfall 4: Dropdown Not Synced After Chip Click
**What goes wrong:** Clicking a category chip in a row filters correctly but the dropdown still shows "All categories".
**Why it happens:** Chip click updates URL param but dropdown has its own uncontrolled state.
**How to avoid:** Make the dropdown a controlled component -- its value comes from the `label` URL search param, not local state.
**Warning signs:** Filter banner shows correct category but dropdown shows wrong selection.

### Pitfall 5: Frontend Still Referencing `related_entities`
**What goes wrong:** After backend changes, frontend code breaks because it reads `report.related_entities`.
**Why it happens:** Multiple places in `ReportRow` and `ReportModal` reference this field.
**How to avoid:** Search-replace all `related_entities` references with `labels` in ThreatNewsPage.jsx. Update both row and modal components.
**Warning signs:** Category chips don't render, empty arrays everywhere.

### Pitfall 6: Loading Labels Before Page Renders
**What goes wrong:** Dropdown flashes empty then populates, or category filter doesn't work on first render.
**Why it happens:** Labels are fetched from a separate endpoint, creating a race condition with the main data fetch.
**How to avoid:** Fetch labels in a separate `useEffect` on mount, store in state. The dropdown can show a loading placeholder until labels arrive. The main data fetch does NOT depend on labels (filtering happens server-side via label ID).
**Warning signs:** Dropdown empty on first load, or category chip clicks fail before labels load.

## Code Examples

### Backend: Updated GraphQL Query (objectLabel fragment)
```graphql
# Replace objects(first: 20) { ... } with:
objectLabel {
  edges {
    node {
      id
      value
      color
    }
  }
}
```

### Backend: flattenLabels() Method
```php
private function flattenLabels(array $edges): array
{
    return array_map(
        fn (array $edge) => [
            'id' => $edge['node']['id'] ?? null,
            'value' => $edge['node']['value'] ?? null,
            'color' => $edge['node']['color'] ?? null,
        ],
        $edges,
    );
}
```

### Backend: Labels Endpoint Query
```graphql
query ($first: Int!) {
  labels(first: $first, orderBy: value, orderMode: asc) {
    edges {
      node {
        id
        value
        color
      }
    }
  }
}
```

### Backend: FilterGroup with Label
```php
// Build filters array
$filterItems = [];

if ($confidence) {
    $filterItems[] = [
        'key' => 'confidence',
        'values' => [$confidence],
        'operator' => 'eq',
        'mode' => 'or',
    ];
}

if ($labelId) {
    $filterItems[] = [
        'key' => 'objectLabel',
        'values' => [$labelId],
        'operator' => 'eq',
        'mode' => 'or',
    ];
}

if (!empty($filterItems)) {
    $variables['filters'] = [
        'mode' => 'and',
        'filters' => $filterItems,
        'filterGroups' => [],
    ];
}
```

### Frontend: formatTime() Helper
```jsx
function formatTime(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return '';
  }
}
```
**Recommendation (Claude's discretion):** Use 24h format -- consistent with cybersecurity/threat intel conventions and more compact.

### Frontend: Category Dropdown (Glassmorphism)
```jsx
// Recommendation: use glassmorphism style to match the page aesthetic
<select
  value={label}
  onChange={(e) => {
    const selected = categories.find(c => c.id === e.target.value);
    handleCategoryChange(e.target.value, selected?.value || '');
  }}
  className="bg-surface border border-border text-text-primary rounded-lg font-mono text-sm px-3 py-2.5 focus:outline-none focus:border-violet transition-colors appearance-none"
>
  <option value="">All categories</option>
  {categories.map(cat => (
    <option key={cat.id} value={cat.id}>{cat.value}</option>
  ))}
</select>
```
**Recommendation (Claude's discretion):** Use a native `<select>` styled with Tailwind. Simpler, accessible, keyboard-navigable. A custom dropdown adds complexity for no functional gain here.

### Frontend: Date Column (First Position)
```jsx
<div className="flex items-center gap-4 px-4 py-3 border-b border-border hover:bg-surface-2 cursor-pointer transition-colors">
  {/* Date - first column, fixed width */}
  <div className="shrink-0 w-[100px]">
    <p className="font-mono text-sm text-text-primary">
      {formatDate(report.published)}
    </p>
    <p className="font-mono text-[11px] text-text-muted">
      {formatTime(report.published)}
    </p>
  </div>

  {/* Title - flexible */}
  <h3 className="font-display text-sm font-semibold text-text-primary truncate flex-1 min-w-0">
    {report.name}
  </h3>

  {/* Category chips - shrink-0 */}
  {/* ... chips here ... */}
</div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Entity-type based chips (`related_entities`) | Label-based category chips (`objectLabel`) | Phase 17 | Categories are curated labels, not raw graph objects |
| Date as last column, right-aligned | Date as first column with time sub-detail | Phase 17 | Faster temporal scanning |
| Entity name search filter | Label ID-based filter via dropdown | Phase 17 | Structured, reliable filtering vs text search |

## Open Questions

1. **OpenCTI `labels` query availability**
   - What we know: OpenCTI has a `labels` top-level query based on standard STIX/OpenCTI schema. The `objectLabel` field on reports is well-documented.
   - What's unclear: Exact GraphQL ordering enum name for labels (likely `LabelsOrdering` with `value` field).
   - Recommendation: Test query against OpenCTI playground at `http://192.168.251.20/graphql` during implementation. If ordering enum differs, adjust accordingly.

2. **Number of labels in the system**
   - What we know: Using `first: 100` should cover typical OpenCTI installations.
   - What's unclear: How many labels exist in this specific instance.
   - Recommendation: Use `first: 200` to be safe. If there are more, the dropdown still works with the most common ones. Cache aggressively (15-30 minutes).

3. **Labels endpoint cache duration**
   - What we know: Labels change infrequently (admin-managed in OpenCTI).
   - Recommendation (Claude's discretion): Cache for 15 minutes. Labels are semi-static data -- longer than the 5-minute report cache but not indefinite.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None -- no tests exist (per CLAUDE.md) |
| Config file | none |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| N/A | Category chips display from labels data | manual-only | Visual inspection in browser | N/A |
| N/A | Category dropdown filters reports | manual-only | Click dropdown, verify filtered results | N/A |
| N/A | Date column is first | manual-only | Visual inspection | N/A |
| N/A | Backend returns labels array | manual-only | `curl /api/threat-news` and inspect response | N/A |
| N/A | Labels endpoint returns all categories | manual-only | `curl /api/threat-news/labels` | N/A |
| N/A | Label filter param works | manual-only | `curl /api/threat-news?label=<id>` | N/A |

### Sampling Rate
- **Per task:** Manual browser verification + curl backend endpoints
- **Phase gate:** All 3 success criteria verified visually

### Wave 0 Gaps
No test infrastructure exists. All validation is manual per project conventions (no tests, no linter -- per CLAUDE.md).

## Sources

### Primary (HIGH confidence)
- `frontend/src/pages/ThreatNewsPage.jsx` -- Current implementation fully read (493 lines)
- `frontend/src/api/threat-news.js` -- Current API client (14 lines)
- `backend/app/Services/ThreatNewsService.php` -- Current GraphQL query + normalization (245 lines)
- `backend/app/Http/Controllers/ThreatNews/IndexController.php` -- Current controller (46 lines)
- `backend/routes/api.php` -- Current routes (72 lines)
- `.planning/phases/17-threat-news-ux-polish/17-CONTEXT.md` -- User decisions

### Secondary (MEDIUM confidence)
- OpenCTI `objectLabel` GraphQL fragment structure -- based on standard OpenCTI schema patterns observed in existing codebase queries
- OpenCTI `labels` top-level query -- standard in OpenCTI GraphQL API, needs live verification for exact enum names
- OpenCTI FilterGroup on `objectLabel` -- follows same pattern as existing `confidence` filter in codebase

### Tertiary (LOW confidence)
- Exact GraphQL ordering enum for labels query (`LabelsOrdering`) -- needs playground verification

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- zero new dependencies, all existing tech
- Architecture: HIGH -- follows established patterns from phases 13/16, all source code read
- Pitfalls: HIGH -- identified from reading actual code, not hypothetical
- OpenCTI GraphQL specifics: MEDIUM -- objectLabel pattern is standard but enum names need live validation

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (stable -- no moving parts, all existing tech)
