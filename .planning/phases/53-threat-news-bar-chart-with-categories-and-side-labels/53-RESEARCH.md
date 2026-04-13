# Phase 53: Threat News Bar Chart with Categories and Side Labels - Research

**Researched:** 2026-04-13
**Domain:** Chart.js horizontal bar chart in React right overlay panel
**Confidence:** HIGH

## Summary

This phase adds a horizontal bar chart widget ("Top Attack Categories") to the Threat Map page's right overlay panel (`RightOverlayPanel.jsx`). The chart displays attack category distribution data from the existing `GET /api/dashboard/categories` endpoint, which returns `array<{label: string, count: int}>`. The old `AttackChart` component from the removed DashboardPage (commit `1c52433`) provides a complete reference implementation.

The technical risk is very low. All infrastructure exists: the `useChartJs` hook manages Chart.js lifecycle, the `apiClient` is already imported in `RightOverlayPanel`, the backend endpoint is deployed and cached, and the panel's widget pattern (`glass-card-static` container, skeleton loading, `space-y-4` spacing) is well established. The only work is creating the chart component and wiring it into the panel.

**Primary recommendation:** Extract a standalone `AttackCategoryChart` component adapted from the old `AttackChart` code, fetch data inside `RightOverlayPanel` following the existing indicators/counts pattern, and render it as a new `glass-card-static` section.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Horizontal bar chart (Chart.js, `indexAxis: 'y'`). Category names on the Y-axis (left side), bar length represents count.
- **D-02:** Chart goes in the right overlay panel (`RightOverlayPanel.jsx`) as a new section, alongside existing "Recent Indicators" and "Threat Database" widgets.
- **D-03:** Data comes from the existing `GET /api/dashboard/categories` backend endpoint (already built). No new API endpoints needed.
- **D-04:** No new API endpoints needed -- reuse existing backend.
- **D-05:** Plain text, full category names on the Y-axis. Truncate with ellipsis if too long. Standard `#9AA0AD` label color.
- **D-06:** No click interaction -- pure display only.
- **D-07:** Title: "Top Attack Categories".

### Claude's Discretion
- Bar colors -- use existing `CATEGORY_COLORS` array or theme colors
- Bar thickness, border radius, chart height -- pick values that fit well in the 380px-wide right panel
- Loading/error states -- match existing skeleton/shimmer patterns used in the right panel
- Position within right panel (above or below existing widgets)

### Deferred Ideas (OUT OF SCOPE)
None.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DASH-02 | Category bar chart added to right panel alongside existing widgets | Direct match -- this phase implements the chart widget in RightOverlayPanel |
| NEWS-01 | Chart displays category-only distribution with labels on the side | The horizontal bar chart with `indexAxis: 'y'` shows category labels on the Y-axis (side) |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **No TypeScript** -- all `.jsx`/`.js` files
- **No tests exist** -- no test infrastructure to maintain
- **No linter/formatter** -- no pre-commit checks
- **Chart.js** is already in the stack (used by `useChartJs` hook)
- **D3** is also in the stack but NOT used here (Chart.js per D-01)
- **Dark theme only** -- all chart styling must use dark palette
- **Fonts:** Outfit for UI text, JetBrains Mono for data displays
- **Glassmorphism pattern:** `bg-surface/60 border border-border backdrop-blur-sm`
- **Immutability:** Create new objects, never mutate existing ones

## Standard Stack

### Core (Already Installed)
| Library | Purpose | Why Standard |
|---------|---------|--------------|
| chart.js/auto | Chart rendering | Already used via `useChartJs` hook for ThreatMapDonut and CategoryDistributionChart |
| react 19 | UI framework | Project standard |

No new dependencies required.

## Architecture Patterns

### Component Structure
```
frontend/src/
  components/
    threat-map/
      RightOverlayPanel.jsx      # Modified -- add categories fetch + chart section
      AttackCategoryChart.jsx     # NEW -- horizontal bar chart component
```

### Pattern 1: Chart Component with useChartJs Hook
**What:** A standalone chart component that receives data via props and uses `useMemo` to build the Chart.js config, then passes it to `useChartJs`.
**When to use:** Any Chart.js visualization in the project.
**Example (adapted from old AttackChart):**
```jsx
import { useMemo } from 'react';
import { useChartJs } from '../../hooks/useChartJs';

const CATEGORY_COLORS = [
  '#FF3B5C', '#7A44E4', '#00E5FF', '#FFB020', '#00C48C', '#9B6BF7',
];

export default function AttackCategoryChart({ categories }) {
  const config = useMemo(() => {
    if (!categories || categories.length === 0) return null;
    const labels = categories.map(c => c.label);
    const data = categories.map(c => c.count);
    return {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: categories.map((_, i) => CATEGORY_COLORS[i % CATEGORY_COLORS.length] + '40'),
          borderColor: categories.map((_, i) => CATEGORY_COLORS[i % CATEGORY_COLORS.length]),
          borderWidth: 1,
          borderRadius: 6,
          barThickness: 22,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#161822',
            borderColor: '#2A2D3E',
            borderWidth: 1,
            titleColor: '#E8EAED',
            bodyColor: '#9AA0AD',
            padding: 10,
            cornerRadius: 8,
            titleFont: { family: 'Outfit' },
            bodyFont: { family: 'Outfit' },
          },
        },
        scales: {
          x: {
            grid: { color: '#1E203020', drawBorder: false },
            ticks: { color: '#5A6173', font: { size: 11, family: 'Outfit' } },
          },
          y: {
            grid: { display: false },
            ticks: {
              color: '#9AA0AD',
              font: { size: 12, family: 'Outfit' },
              callback: function(value) {
                const label = this.getLabelForValue(value);
                return label.length > 18 ? label.slice(0, 18) + '...' : label;
              },
            },
          },
        },
      },
    };
  }, [categories]);

  const canvasRef = useChartJs(config);
  if (!config) return null;
  return <canvas ref={canvasRef} />;
}
```

### Pattern 2: Data Fetching in RightOverlayPanel
**What:** The panel fetches its own data via `apiClient` with cleanup pattern (cancelled flag).
**When to use:** All panel widgets that need API data.
**Example (existing pattern from indicators fetch):**
```jsx
const [categories, setCategories] = useState([]);
const [categoriesLoading, setCategoriesLoading] = useState(true);
const [categoriesError, setCategoriesError] = useState(null);

useEffect(() => {
  let cancelled = false;
  setCategoriesLoading(true);
  apiClient.get('/api/dashboard/categories')
    .then((res) => {
      if (cancelled) return;
      const data = res.data?.data || [];
      setCategories(Array.isArray(data) ? data : []);
      setCategoriesError(null);
    })
    .catch((err) => {
      if (!cancelled) setCategoriesError(err);
    })
    .finally(() => {
      if (!cancelled) setCategoriesLoading(false);
    });
  return () => { cancelled = true; };
}, []);
```

### Pattern 3: Widget Container (glass-card-static)
**What:** All right panel widgets use `glass-card-static p-3` with a title and content.
**Example:**
```jsx
<div className="glass-card-static p-3">
  <h3 className="text-sm font-semibold text-text-secondary mb-2">Top Attack Categories</h3>
  {/* chart or loading skeleton */}
</div>
```

### Anti-Patterns to Avoid
- **Do NOT add click handlers to the chart** -- D-06 explicitly says pure display only
- **Do NOT create a separate API module** -- the `apiClient.get()` call belongs directly in RightOverlayPanel, same as indicators and counts
- **Do NOT use `maintainAspectRatio: true`** -- the chart height must be fixed within the panel widget, not aspect-ratio-based

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chart rendering | Custom SVG/canvas drawing | Chart.js via `useChartJs` hook | Already handles create/destroy lifecycle |
| Data fetching | Custom fetch wrapper | `apiClient.get()` | Already configured with auth tokens, base URL |
| Loading states | Custom spinner | Skeleton divs with `animate-pulse` | Matches existing panel loading pattern exactly |

## Common Pitfalls

### Pitfall 1: useChartJs Config Reference Stability
**What goes wrong:** Chart re-creates on every render because config object has a new reference.
**Why it happens:** `useMemo` dependencies include non-primitive values or the config is not memoized.
**How to avoid:** The config MUST be wrapped in `useMemo` with only the data array as dependency. The old AttackChart used `useMemo` correctly -- follow its pattern.
**Warning signs:** Chart flickers or flashes on unrelated state changes.

### Pitfall 2: API Response Envelope
**What goes wrong:** Chart shows no data even though the API returns categories.
**Why it happens:** The `CategoriesController` wraps the response in `{ data: [...] }`, so `res.data` from axios is `{ data: [...] }`, meaning the actual array is at `res.data.data`.
**How to avoid:** Access `res.data.data` (or `res.data?.data`), not `res.data` directly.
**Warning signs:** Categories state is `{ data: [...] }` instead of `[...]`.

### Pitfall 3: Chart Height in Compact Panel
**What goes wrong:** Chart overflows the panel or is too small to read.
**Why it happens:** The old dashboard AttackChart had `barThickness: 28` designed for a full-width layout. The right panel is only 380px wide with padding.
**How to avoid:** Use a smaller `barThickness` (around 20-22), set a fixed height container (e.g., `h-[200px]`), and use `maintainAspectRatio: false`.
**Warning signs:** Bars overlap or labels are clipped.

### Pitfall 4: Y-axis Label Truncation
**What goes wrong:** Long category names push the chart area too narrow, making bars unreadable.
**Why it happens:** Chart.js auto-sizes the Y-axis label area based on longest label.
**How to avoid:** Use a `callback` in `y.ticks` to truncate labels beyond ~18 characters with ellipsis. The full name still shows in the tooltip.
**Warning signs:** Chart bars appear as thin slivers because labels take up most of the width.

## Code Examples

### Old AttackChart Reference (from git commit 1c52433)
The old `AttackChart` component in `DashboardPage.jsx` is the canonical reference. Key differences from what we need:
- Old had `onClick` handler for filtering -- we remove this (D-06: pure display)
- Old had `activeFilter` prop for highlighting -- we remove this
- Old used `barThickness: 28` -- we reduce for 380px panel
- Old used `borderRadius: 6` -- keep this
- Old used `CATEGORY_COLORS` array: `['#FF3B5C', '#7A44E4', '#00E5FF', '#FFB020', '#00C48C', '#9B6BF7']` -- reuse this

### Tooltip Styling (Consistent Across Project)
```javascript
tooltip: {
  backgroundColor: '#161822',
  borderColor: '#2A2D3E',
  borderWidth: 1,
  titleColor: '#E8EAED',
  bodyColor: '#9AA0AD',
  padding: 10,
  cornerRadius: 8,
}
```

### Loading Skeleton (Panel Pattern)
```jsx
<div className="space-y-2">
  {[60, 80, 50, 70, 65].map((w, i) => (
    <div key={i} className="h-5 bg-surface-2 rounded animate-pulse" style={{ width: `${w}%` }} />
  ))}
</div>
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None -- no tests exist in this project |
| Config file | none |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DASH-02 | Bar chart renders in right panel | manual-only | Visual verification in browser | N/A |
| NEWS-01 | Category labels on side of chart | manual-only | Visual verification in browser | N/A |

**Justification for manual-only:** Project has no test infrastructure (CLAUDE.md: "No tests exist"). These are visual UI requirements that require browser rendering to validate Chart.js output.

### Wave 0 Gaps
None -- manual verification only. No test infrastructure to set up.

## Open Questions

1. **Widget position in panel**
   - What we know: Panel has two sections (Recent Indicators, Threat Database) in a `space-y-4` layout
   - What's unclear: Whether chart should go above, between, or below existing widgets
   - Recommendation: Place it between Recent Indicators and Threat Database -- the chart provides category-level context that bridges indicator details and aggregate counts. Claude's discretion per CONTEXT.md.

2. **Chart height for variable category count**
   - What we know: Backend returns up to 6 categories. Panel is vertically constrained.
   - What's unclear: Whether fewer categories should shrink the chart height
   - Recommendation: Use a fixed height (~200px) with `maintainAspectRatio: false`. Chart.js handles fewer bars gracefully by spacing them out.

## Sources

### Primary (HIGH confidence)
- `frontend/src/hooks/useChartJs.js` -- hook implementation (18 lines, simple create/destroy)
- `frontend/src/components/threat-map/RightOverlayPanel.jsx` -- target file, existing widget patterns
- `git show 1c52433:frontend/src/pages/DashboardPage.jsx` -- old AttackChart with full Chart.js config
- `backend/app/Http/Controllers/Dashboard/CategoriesController.php` -- endpoint returns `{ data: [...] }`
- `backend/app/Services/DashboardService.php:79` -- getCategories returns `array<{label: string, count: int}>`

### Secondary (HIGH confidence)
- `frontend/src/components/threat-news/CategoryDistributionChart.jsx` -- existing Chart.js usage pattern with same tooltip styling and color palette
- `frontend/src/data/dashboard-config.js` -- STAT_CARD_CONFIG, TYPE_BADGE_COLORS (not directly needed but confirms panel data patterns)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and in use
- Architecture: HIGH -- all patterns directly observed in existing codebase
- Pitfalls: HIGH -- derived from inspecting actual code (response envelope, config stability, panel width)

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (stable -- no moving parts, all internal code)
