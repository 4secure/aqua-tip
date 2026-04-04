# Phase 33: Category Distribution Chart - Research

**Researched:** 2026-03-30
**Domain:** Chart.js stacked area chart, client-side data bucketing, React integration
**Confidence:** HIGH

## Summary

Phase 33 adds a stacked area chart to ThreatNewsPage showing hourly category distribution for the selected date. The entire implementation is client-side: reports are already loaded in `items` state, and the chart buckets them by hour and category. Chart.js 4.5.1 is already installed and used via the `useChartJs` hook in DashboardPage's `AttackChart` component, providing a proven pattern to follow.

The core challenge is mapping the Tailwind-class-based `CATEGORY_COLORS` + `categoryColor()` hash function to Chart.js hex/rgba values, and wiring the chart click handler to the existing `?label=` URL param mechanism. The `useChartJs` hook recreates the chart on every config change (it depends on `[config]`), so the config object must be memoized with `useMemo` to avoid unnecessary re-renders while still allowing smooth Chart.js transitions when data changes.

**Primary recommendation:** Extract a `CategoryDistributionChart` component that receives `items`, `categories`, `activeLabel`, and `onCategoryClick` as props. Compute hourly buckets in a `useMemo`, build Chart.js config in another `useMemo`, and render via the existing `useChartJs` hook.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Stacked area chart using Chart.js via the existing `useChartJs` hook. X-axis is hours (0h-23h), Y-axis is report count. Each category is a filled area stacked on top of others.
- **D-02:** Data is computed entirely client-side by bucketing the already-loaded `items` array by hour (from `published` timestamp) and category (from `labels`). No new backend endpoint or API call needed.
- **D-03:** Reports with multiple labels count toward each label's bucket (a report tagged "Malware" and "APT" adds +1 to both).
- **D-04:** Reuse the existing `CATEGORY_COLORS` array and `categoryColor()` hash function to map category names to fill colors. Consistent with the category chips on report rows.
- **D-05:** Chart sits in a glassmorphism card (bg-surface/60 border border-border backdrop-blur-sm rounded-xl) between the toolbar and the report list. Always visible when data exists (~180px height).
- **D-06:** Clicking a category area in the chart sets the `?label=` query param, same behavior as clicking a category chip on a report row. The existing category filter banner appears with the X to clear.
- **D-07:** Chart.js built-in smooth transitions handle animation when date changes -- no custom animation code needed.
- **D-08:** Chart is hidden entirely when no reports exist for the date, or when all reports lack categories. The existing empty state messaging handles the "no reports" case.

### Claude's Discretion
- How to extract hourly buckets from report timestamps (date parsing approach)
- Chart.js config details (tension, fill opacity, point radius, grid styling for dark theme)
- Whether the legend uses Chart.js native legend or a custom HTML legend
- How to map the `categoryColor()` output (Tailwind classes) to Chart.js hex/rgba values
- Tooltip formatting (count, percentage, or both)
- Whether to extract the chart as a separate component or keep inline in ThreatNewsPage

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| NEWS-04 | User sees a category distribution chart filtered by the selected date | Chart.js stacked area via `useChartJs` hook; client-side bucketing of `items` by hour+category; visibility gated on categorized data existing; click-to-filter via `?label=` param |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **No TypeScript** -- all `.jsx`/`.js` files
- **No tests exist** -- no test infrastructure to maintain
- **No linter/formatter** configured
- **React 19 + Vite 7** (ESM)
- **Tailwind CSS 3** with custom dark theme
- **Chart.js** already in use via `useChartJs` hook (DashboardPage)
- **D3** also available but Chart.js is the locked choice (D-01)
- **Immutability** -- create new objects, never mutate (from global rules)
- **Small files** -- 200-400 lines typical, 800 max
- **Functions under 50 lines**

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| chart.js | 4.5.1 | Stacked area chart rendering | Already installed, used in DashboardPage |
| react | 19.x | Component framework | Project standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| chart.js/auto | (bundled) | Auto-registers all Chart.js components | Already used by useChartJs hook |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Chart.js | D3 | D3 is available but Chart.js is locked per D-01 and already has infrastructure |

**No new dependencies required.** Everything needed is already installed.

## Architecture Patterns

### Recommended Component Structure

Extract a new component file rather than adding inline to ThreatNewsPage (which is already 850 lines):

```
frontend/src/components/threat-news/
  CategoryDistributionChart.jsx   # NEW: chart component (~150 lines)
```

### Pattern 1: Chart.js Config via useMemo + useChartJs

**What:** Build Chart.js config object inside `useMemo`, pass to `useChartJs` hook which manages canvas lifecycle.
**When to use:** Any Chart.js chart in this codebase.
**Example:**

```jsx
// Source: DashboardPage.jsx AttackChart pattern (lines 79-137)
function CategoryDistributionChart({ items, categories, activeLabel, onCategoryClick }) {
  const chartData = useMemo(() => {
    // Bucket items by hour and category
    // Returns { labels: ['0h',...,'23h'], datasets: [...] }
  }, [items]);

  const config = useMemo(() => {
    if (!chartData) return null;
    return {
      type: 'line',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { stacked: true, /* ... */ },
          x: { /* ... */ }
        },
        onClick: (_event, elements, chart) => {
          if (elements.length > 0) {
            const datasetIndex = elements[0].datasetIndex;
            const categoryName = chart.data.datasets[datasetIndex].label;
            onCategoryClick(categoryName);
          }
        },
        // ...
      },
    };
  }, [chartData, activeLabel, onCategoryClick]);

  const canvasRef = useChartJs(config);
  if (!config) return null;
  return <canvas ref={canvasRef} />;
}
```

### Pattern 2: Hourly Bucketing from Timestamps

**What:** Parse `published` ISO timestamps from report items, extract hour in user's timezone, count per category.
**When to use:** Building the chart data structure.
**Example:**

```jsx
// Each item has: { published: "2026-03-29T14:30:00Z", labels: [{ id, value }] }
function bucketByHourAndCategory(items, timezone) {
  // Initialize 24-hour x N-category grid
  const buckets = {};  // { categoryValue: [0,0,...0] } (24 slots)

  for (const item of items) {
    const hour = new Date(item.published).toLocaleString('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    });
    const h = parseInt(hour, 10);
    for (const label of (item.labels || [])) {
      if (!buckets[label.value]) {
        buckets[label.value] = new Array(24).fill(0);
      }
      buckets[label.value][h] += 1;
    }
  }

  return buckets; // { "Malware": [0,0,3,1,...], "APT": [0,1,0,...] }
}
```

### Pattern 3: Tailwind Color to Chart.js Hex Mapping

**What:** The existing `categoryColor()` returns Tailwind class objects (`{ bg: 'bg-violet/20', text: 'text-violet' }`). Chart.js needs hex/rgba values.
**When to use:** Building dataset colors for Chart.js.

The UI-SPEC defines the chart category palette with exact hex values. Create a parallel hex-based color array:

```jsx
// Hex palette matching CATEGORY_COLORS order from UI-SPEC
const CHART_HEX_COLORS = [
  '#7A44E4', // violet (index 0 in CATEGORY_COLORS maps to violet)
  '#00E5FF', // cyan
  '#FFB020', // amber
  '#FF3B5C', // red
  '#5A6173', // muted (surface-2 equivalent)
];

function chartColorForCategory(labelValue) {
  let hash = 0;
  for (let i = 0; i < labelValue.length; i++) {
    hash = ((hash << 5) - hash) + labelValue.charCodeAt(i);
    hash |= 0;
  }
  return CHART_HEX_COLORS[Math.abs(hash) % CHART_HEX_COLORS.length];
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
```

**Critical:** The hash function MUST be identical to the existing `categoryColor()` so the same category name maps to the same color slot in both the chart and the category chips.

### Pattern 4: useChartJs Hook Lifecycle

**What:** The hook destroys and recreates the Chart instance on every `config` change (it uses `config` in the dependency array). This means:
1. Config MUST be memoized with `useMemo` to avoid destroy/recreate on every render
2. When data genuinely changes (date switch), the config reference changes, Chart.js creates a new instance with default 750ms animation
3. No flickering because the canvas DOM element persists (only the Chart instance is swapped)

**Caveat:** The current `useChartJs` hook does NOT support updating an existing chart's data in-place (via `chart.update()`). It always destroys and recreates. This means Chart.js transitions between datasets show as fresh animations rather than morphing from old to new values. Per D-07 this is acceptable.

### Anti-Patterns to Avoid
- **Mutating items array:** Never sort or modify `items` directly -- always derive new structures
- **Unstable config reference:** If `useMemo` deps are wrong, config recreates every render causing chart flicker
- **Timezone-naive hour extraction:** Using `getHours()` instead of timezone-aware parsing would show UTC hours, not the user's local hours
- **Heavy computation on every render:** The bucketing function must be in `useMemo` dependent on `items`, not recomputed on every render

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chart rendering | Canvas drawing code | Chart.js via useChartJs | Complex rendering, animations, tooltips, interactions |
| Stacking math | Manual Y-offset calculation | Chart.js `scales.y.stacked: true` | Handles edge cases, hover interactions |
| Timezone-aware hour extraction | Manual UTC offset math | `Date.toLocaleString()` with `timeZone` option | Handles DST, user preferences |
| Color hash function | New hash algorithm | Copy existing `categoryColor()` hash logic | Must produce identical slot indices |

## Common Pitfalls

### Pitfall 1: useChartJs Config Identity
**What goes wrong:** Chart flickers or re-animates on every render.
**Why it happens:** The `config` object passed to `useChartJs` is a new reference on each render because it's not memoized, or its `useMemo` dependencies include unstable references (e.g., an inline `onCategoryClick` callback).
**How to avoid:** Wrap config in `useMemo` with stable deps. Use `useCallback` for the click handler passed as prop. Include only `items`, `activeLabel`, and `onCategoryClick` in the dependency chain.
**Warning signs:** Chart blinks when hovering, typing in search, or interacting with other page elements.

### Pitfall 2: Timezone Mismatch in Hour Bucketing
**What goes wrong:** Reports appear in wrong hour slots -- a report published at 2pm user-time shows in a different hour.
**Why it happens:** Using `new Date(published).getHours()` extracts the hour in the browser's system timezone, not the user's configured timezone from AuthContext.
**How to avoid:** Use `new Date(published).toLocaleString('en-US', { timeZone: timezone, hour: 'numeric', hour12: false })` where `timezone` comes from `useAuth()` or the fallback in ThreatNewsPage.
**Warning signs:** Hour distribution doesn't match the report timestamps shown in the list.

### Pitfall 3: Chart Click Identifying Wrong Dataset
**What goes wrong:** Clicking on one category area filters to a different category.
**Why it happens:** In stacked area charts, Chart.js `onClick` elements array may contain multiple elements (one per dataset) at the same x position. The element at index 0 might not be the visually topmost area the user intended to click.
**How to avoid:** Use `interaction: { mode: 'nearest', axis: 'x', intersect: false }` for tooltips but for click handling, get the dataset index from `elements[0].datasetIndex` which corresponds to the nearest dataset to the click point. Alternatively, use `chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, false)` for more precise hit testing.
**Warning signs:** Clicking near the boundary between two stacked areas triggers the wrong filter.

### Pitfall 4: Empty Categories Creating Invisible Datasets
**What goes wrong:** Chart renders with extra legend entries for categories that have zero reports at every hour.
**Why it happens:** Including categories with all-zero data as datasets.
**How to avoid:** Only create datasets for categories that have at least one report in the bucketed data. Filter out zero-sum categories before building the config.
**Warning signs:** Legend shows many items, some with invisible areas.

### Pitfall 5: Category Color Mismatch Between Chart and Chips
**What goes wrong:** "Malware" is violet in the report chips but a different color in the chart.
**Why it happens:** Using a different hash function or different color array order than the existing `categoryColor()`.
**How to avoid:** Use the exact same hash algorithm and ensure the hex color array maps 1:1 with the Tailwind class array indices.
**Warning signs:** Visual inconsistency between chart areas and category chip colors.

## Code Examples

### Complete Stacked Area Chart Config (Chart.js 4.5.1)

```jsx
// Source: https://www.chartjs.org/docs/latest/samples/area/line-stacked.html
// Adapted for this project's dark theme
const config = {
  type: 'line',
  data: {
    labels: Array.from({ length: 24 }, (_, i) => `${i}h`),
    datasets: [
      {
        label: 'Malware',
        data: [0, 0, 1, 3, 2, ...],  // 24 values
        borderColor: '#7A44E4',
        backgroundColor: 'rgba(122, 68, 228, 0.35)',
        fill: true,       // Required for area
        tension: 0.4,     // Smooth curves
        pointRadius: 0,   // No dots
        borderWidth: 2,
      },
      // ... more datasets
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',        // Tooltip shows all datasets at same x
      intersect: false,
    },
    plugins: {
      legend: { display: false },  // Using custom HTML legend
      tooltip: {
        backgroundColor: '#161822',
        borderColor: '#2A2D3E',
        borderWidth: 1,
        titleColor: '#E8EAED',
        bodyColor: '#9AA0AD',
        padding: 8,
        cornerRadius: 8,
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y} reports`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(30, 32, 48, 0.125)', drawBorder: false },
        ticks: { color: '#5A6173', font: { size: 12, family: 'Outfit' } },
      },
      y: {
        stacked: true,   // KEY: enables stacking
        beginAtZero: true,
        grid: { color: 'rgba(30, 32, 48, 0.125)', drawBorder: false },
        ticks: {
          color: '#5A6173',
          font: { size: 12, family: 'Outfit' },
          stepSize: 1,
          precision: 0,  // Integer only
        },
      },
    },
    onClick: (_event, elements, chart) => {
      if (elements.length > 0) {
        const datasetIndex = elements[0].datasetIndex;
        const categoryName = chart.data.datasets[datasetIndex].label;
        // Map category name back to category ID for ?label= param
        handleCategoryClick(categoryName);
      }
    },
  },
};
```

### Custom HTML Legend Pattern

```jsx
// Source: project pattern decision from UI-SPEC
function ChartLegend({ datasets }) {
  return (
    <div className="flex flex-wrap gap-4 mt-3">
      {datasets.map((ds) => (
        <div key={ds.label} className="flex items-center gap-1">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: ds.borderColor }}
          />
          <span className="font-sans text-xs text-text-muted">{ds.label}</span>
        </div>
      ))}
    </div>
  );
}
```

### Active Filter Highlighting

```jsx
// When ?label= is set, dim non-active categories
const fillAlpha = activeLabel
  ? (categoryName === activeLabelValue ? 0.6 : 0.15)
  : 0.35;

const backgroundColor = hexToRgba(hexColor, fillAlpha);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Chart.js `fill: 'origin'` with manual stacking | `scales.y.stacked: true` with `fill: true` | Chart.js 3.x+ | Simpler config, automatic stacking math |
| `chart.update()` for data changes | Full destroy/recreate via useChartJs hook | Project convention | Works but no morphing animation between states |

## Open Questions

1. **Chart click precision in stacked areas**
   - What we know: Chart.js `onClick` returns nearest elements. In stacked charts the topmost area catches clicks more easily.
   - What's unclear: Whether `intersect: true` provides reliable hit-testing for the intended category area.
   - Recommendation: Use default `intersect: false` with `mode: 'nearest'` -- the nearest dataset to the click Y position will be selected. Test and iterate if needed.

2. **Category ID lookup from chart click**
   - What we know: Chart click gives us the dataset label (category name/value). The `?label=` param requires the category ID.
   - What's unclear: Whether `categories` state always contains a matching entry for every label in `items`.
   - Recommendation: Pass `categories` array to the chart component. On click, look up category by `value` to get `id`. Fall back gracefully if not found.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None (no tests exist per CLAUDE.md) |
| Config file | none |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NEWS-04 | Category distribution chart filtered by selected date | manual-only | N/A | N/A |

**Justification for manual-only:** No test infrastructure exists in the project. Visual chart rendering requires browser environment. Manual verification: load Threat News page, verify chart appears with data, change date, verify chart updates without flicker, click category area, verify filter applies.

### Sampling Rate
- **Per task commit:** Visual inspection in dev server
- **Per wave merge:** Full page interaction walkthrough
- **Phase gate:** Manual verification of both success criteria

### Wave 0 Gaps
None -- no test infrastructure to create per project convention.

## Sources

### Primary (HIGH confidence)
- `frontend/src/hooks/useChartJs.js` -- hook source code, lifecycle behavior
- `frontend/src/pages/DashboardPage.jsx` lines 79-137 -- AttackChart reference implementation
- `frontend/src/pages/ThreatNewsPage.jsx` -- full page source, integration points
- `frontend/tailwind.config.js` -- hex color values for chart palette

### Secondary (MEDIUM confidence)
- [Chart.js Area Chart docs](https://www.chartjs.org/docs/latest/charts/area.html) -- fill configuration
- [Chart.js Stacked Area sample](https://www.chartjs.org/docs/latest/samples/area/line-stacked.html) -- stacked config pattern
- [Chart.js Line Chart docs](https://www.chartjs.org/docs/latest/charts/line.html) -- dataset options

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Chart.js 4.5.1 already installed and used, no new deps
- Architecture: HIGH -- follows established AttackChart pattern exactly
- Pitfalls: HIGH -- identified from reading actual hook implementation and Chart.js docs

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (Chart.js 4.x stable, project patterns well-established)
