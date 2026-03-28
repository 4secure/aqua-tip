# Phase 30: Quick Wins - Research

**Researched:** 2026-03-28
**Domain:** React frontend UI fixes (dashboard layout, map labels, search bugs)
**Confidence:** HIGH

## Summary

Phase 30 is a collection of frontend-only UI fixes across three areas: DashboardPage (stat cards, headings, label removal), ThreatMapPage/ThreatMapCounters (label text changes), and ThreatSearchPage (D3 graph positioning, loading indicator, sticky header overlap). All changes are isolated to existing components with no new dependencies, no backend changes, and no new pages.

The codebase is well-structured with clear patterns. Each fix targets a specific line range in a specific file. The CONTEXT.md decisions are highly prescriptive, leaving minimal ambiguity for implementation.

**Primary recommendation:** Execute as three independent task groups (Dashboard, Map, Search) since they touch different files with no cross-dependencies.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Use a 4+3 centered grid layout. First row: 4 cards (IP Address, Domain, Hostname, Certificate). Second row: 3 cards (Email, Crypto Wallet, URL) centered with equal spacing on both sides.
- **D-02:** Second row cards must be the same width as first row cards -- no stretching to fill the row.
- **D-03:** Reuse existing design system colors for new card types: Email=amber, Crypto Wallet=green, URL=violet. Some colors shared across cards -- visually distinct via labels.
- **D-04:** Existing cards keep their colors: IP Address=red, Domain=violet, Hostname=cyan, Certificate=amber.
- **D-05:** Replace the spinning Search icon with pulsing skeleton cards below the search bar while loading. Matches the existing `animate-pulse` skeleton pattern used throughout DashboardPage.
- **D-06:** On the dashboard mini-map: replace "Global Threat Map" heading with "100 Latest Attacks".
- **D-07:** On the full ThreatMapPage: replace "Active Threats" counter label in ThreatMapCounters with "100 Latest Attacks". Keep "Live Feed" label on ThreatMapFeed unchanged.
- **D-08:** Add "Threat Database" heading above the stat cards section on DashboardPage (per DASH-01).
- **D-09:** Remove the green pulsating dot and "Live" text from every stat card on the dashboard (per DASH-03). The StatCard component's bottom section with `animate-pulse` dot and "Live" span gets removed entirely.

### Claude's Discretion
- "Threat Database" heading style (font size, weight, spacing) -- match existing section title patterns
- D3 graph node positioning fix approach -- investigate why nodes cluster top-left and apply appropriate fix
- Search bar z-index/positioning fix for logged-out topbar overlap -- determine correct offset or z-index

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DASH-01 | User sees "Threat Database" heading above stat cards | D-08: Add heading using `section-title` class pattern. Insert above stat card grid at line ~493 of DashboardPage.jsx |
| DASH-02 | User sees 7 stat cards: IP Address, Domain, Hostname, Certificate, Email, Crypto Wallet, URL | D-01/D-02/D-03/D-04: Extend STAT_CARD_CONFIG (line 12) and STAT_COLOR_MAP (line 19), change grid from `grid-cols-4` to responsive 4+3 centered layout |
| DASH-03 | Dashboard does not show "Live" label or pulsating green dot | D-09: Remove lines 71-74 of StatCard component (the `animate-pulse` dot and "Live" span) |
| MAP-01 | Threat map tracks only the 100 most recent IPs | Already implemented server-side (API returns 100). Label change confirms this to user |
| MAP-02 | User sees "100 Latest Attacks" label instead of "Active Threats" | D-06/D-07: Two text replacements -- DashboardPage line 472 and ThreatMapCounters line 21 |
| SEARCH-01 | Relation graph nodes display in correct positions (not clustered in top-left) | D3 simulation needs initial position seeding or alpha restart -- see Architecture Patterns |
| SEARCH-02 | User sees a proper loading indicator during search (not spinning logo) | D-05: Replace spinning Search icon (line 662) with skeleton cards below search bar |
| SEARCH-03 | Search bar does not go under the topbar when user is logged out | Sticky header `top-0` (line 609) conflicts with fixed Topbar `h-[60px] z-30` -- needs `top-[60px]` |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- No TypeScript -- all `.jsx`/`.js` files
- No tests exist, no linter/formatter configured
- All data is currently mocked in `data/mock-data.js` (though DashboardPage uses real API calls)
- Dark theme only with specific color tokens
- Fonts: Outfit (font-sans) for all UI, JetBrains Mono (font-mono) for code/data
- CSS split across 4 files in `styles/`
- Tailwind CSS 3 with custom theme in `tailwind.config.js`

## Architecture Patterns

### Dashboard Stat Card Grid (DASH-02)

**Current:** `grid grid-cols-4 gap-4` at DashboardPage line 494. Renders 4 cards in a single row.

**Target:** 4+3 centered layout. Two approaches:

**Recommended approach -- Flexbox with fixed-width cards:**
```jsx
// Wrap stat cards in a flex container with wrapping and centering
<div className="flex flex-wrap justify-center gap-4">
  {STAT_CARD_CONFIG.map(cfg => (
    <div key={cfg.entity_type} className="w-[calc(25%-12px)]">
      <StatCard ... />
    </div>
  ))}
</div>
```

This naturally wraps 7 cards into 4+3 rows, centers the second row, and keeps all cards the same width (D-02). The `calc(25%-12px)` accounts for the gap (16px * 3 gaps / 4 items = 12px per item).

**Responsive breakpoints:** For mobile, switch to `w-full` or `w-[calc(50%-8px)]`:
```jsx
className="w-full sm:w-[calc(50%-8px)] lg:w-[calc(25%-12px)]"
```

### STAT_CARD_CONFIG Extension (DASH-02)

**Current (line 12-17):**
```js
const STAT_CARD_CONFIG = [
  { entity_type: 'IPv4-Addr', label: 'IP Addresses', color: 'red' },
  { entity_type: 'Domain-Name', label: 'Domains', color: 'violet' },
  { entity_type: 'Hostname', label: 'Hostnames', color: 'cyan' },
  { entity_type: 'X509-Certificate', label: 'Certificates', color: 'amber' },
];
```

**Add 3 new entries (per D-03):**
```js
  { entity_type: 'Email-Addr', label: 'Email', color: 'amber' },
  { entity_type: 'Cryptocurrency-Wallet', label: 'Crypto Wallet', color: 'green' },
  { entity_type: 'Url', label: 'URL', color: 'violet' },
```

**STAT_COLOR_MAP must also add `green`:**
```js
green: { bg: 'bg-green/10', text: 'text-green', border: 'border-green/20' },
```

Note: `green` color token is `#00C48C` per CLAUDE.md. Already in Tailwind config but not in STAT_COLOR_MAP.

### D3 Graph Node Clustering Fix (SEARCH-01)

**Root cause analysis:** The D3 force simulation at ThreatSearchPage line 105-109 is correctly configured with `forceCenter(width/2, height/2)`. However, nodes likely cluster top-left because:

1. **No initial position seeding.** D3 defaults unpositioned nodes to (0,0) or near-zero random positions. The simulation may not have enough alpha iterations to spread them before the first render tick.

2. **Container dimensions may be 0.** If the component mounts while hidden or before layout, `container.clientWidth` and `container.clientHeight` could be 0, making `forceCenter(0, 0)` push everything to top-left.

**Fix approach (Claude's discretion):**

Seed initial node positions randomly within the container bounds before simulation starts:
```js
const nodes = Array.from(nodeMap.values());
// Seed positions around center to prevent top-left clustering
nodes.forEach(n => {
  n.x = width / 2 + (Math.random() - 0.5) * width * 0.5;
  n.y = height / 2 + (Math.random() - 0.5) * height * 0.5;
});
```

Also add a guard for zero-dimension container:
```js
const width = container.clientWidth || 600;
const height = container.clientHeight || 450;
```

### Sticky Header Overlap Fix (SEARCH-03)

**Root cause:** ThreatSearchPage line 609 uses `sticky top-0 z-10`. The Topbar is `fixed top-0 z-30 h-[60px]` (Topbar.jsx line 50). When logged out, the search sticky header slides under the topbar because `top-0` puts it at viewport top, behind the z-30 topbar.

**Fix:** Change `top-0` to `top-[60px]` on the sticky header. The `main-content` class already has `pt-[60px]` (main.css line 51), so the sticky element needs to account for the same offset.

```jsx
// Line 609 change:
'sticky top-[60px] z-10 bg-primary/90 backdrop-blur-md pb-4 pt-2 -mx-6 px-6'
```

**Note:** This works regardless of auth state since the topbar is always 60px. The bug manifests "when logged out" likely because logged-out view has different content that forces scrolling, but the fix is universal.

### Search Loading Skeleton (SEARCH-02)

**Current (line 661-662):** Spinning Search icon inside the button.

**Target (D-05):** Pulsing skeleton cards below the search bar while loading. Pattern from DashboardPage:
```jsx
// Skeleton pattern already used throughout the codebase
<div className="space-y-4">
  {[1, 2, 3].map(i => (
    <div key={i} className="glass-card p-5 flex items-center gap-4 animate-pulse">
      <div className="w-16 h-16 rounded-full bg-surface-2" />  {/* Score ring placeholder */}
      <div className="flex-1 space-y-2">
        <div className="h-4 w-32 bg-surface-2 rounded" />
        <div className="h-3 w-48 bg-surface-2 rounded" />
      </div>
    </div>
  ))}
</div>
```

The skeleton replaces result content area (not the search bar). The search button should still show a loading state (disabled) but not the spinning icon.

### "Threat Database" Heading (DASH-01)

**Style pattern (Claude's discretion):** Use existing `section-title` class which is defined as:
```css
.section-title {
  @apply text-lg font-sans font-semibold text-text-primary mb-4;
}
```

For a page-level section heading above stat cards, a slightly larger variant is appropriate:
```jsx
<h2 className="text-xl font-sans font-bold text-text-primary mb-4">Threat Database</h2>
```

Or simply use `section-title` for consistency:
```jsx
<h2 className="section-title">Threat Database</h2>
```

Recommend using `section-title` for maximum consistency with the rest of the dashboard (Recent Indicators, Top Attack Categories, Quick Actions all use it).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Centered 4+3 grid | Custom JS grid logic | CSS flexbox `flex-wrap justify-center` | Pure CSS, responsive by default, no JS needed |
| Skeleton loading | Custom animation | Existing `animate-pulse` + `bg-surface-2` pattern | Already used 10+ places in codebase |
| D3 force graph layout | Manual node positioning | D3's built-in `forceSimulation` with proper initial positions | Already implemented, just needs position seeding |

## Common Pitfalls

### Pitfall 1: Grid-cols vs Flexbox for Uneven Card Counts
**What goes wrong:** Using `grid-cols-4` for 7 items leaves the last 3 cards left-aligned, not centered.
**Why it happens:** CSS Grid auto-places items left-to-right within defined columns.
**How to avoid:** Use flexbox with `flex-wrap justify-center` instead of grid for the 7-card layout.
**Warning signs:** Second row of cards stuck to the left side.

### Pitfall 2: D3 Node Position Seeding
**What goes wrong:** All nodes render at (0,0) briefly before simulation spreads them, or never spread if container is 0-sized.
**Why it happens:** D3 nodes without `x`/`y` properties default to near-zero positions. Simulation needs time to spread them.
**How to avoid:** Explicitly seed `x` and `y` on each node before starting simulation. Guard against zero-dimension containers.
**Warning signs:** Nodes flash in top-left corner then animate to position, or permanently stuck there.

### Pitfall 3: Sticky + Fixed Header Conflict
**What goes wrong:** Sticky content slides behind fixed topbar.
**Why it happens:** `sticky top-0` positions relative to scroll container, but fixed topbar occupies the top 60px.
**How to avoid:** Use `top-[60px]` to account for topbar height.
**Warning signs:** Content disappears behind topbar when scrolling.

### Pitfall 4: Missing Color in STAT_COLOR_MAP
**What goes wrong:** New stat cards with `color: 'green'` render with fallback violet styling.
**Why it happens:** `STAT_COLOR_MAP` (line 19-24) only has red, violet, cyan, amber -- no green entry.
**How to avoid:** Add green entry to STAT_COLOR_MAP before adding green-colored cards to config.
**Warning signs:** Crypto Wallet card appears violet instead of green.

### Pitfall 5: entity_type Mismatch
**What goes wrong:** New stat cards show 0 count even when API returns data.
**Why it happens:** `entity_type` in STAT_CARD_CONFIG must exactly match what the OpenCTI API returns. Wrong strings (e.g., "Email" vs "Email-Addr") cause the `.find()` at line 496 to miss.
**How to avoid:** Verify exact entity_type strings against the API response or existing TYPE_BADGE_COLORS map which already lists the correct STIX types.
**Warning signs:** New cards always show "0" while existing cards show real counts.

## Code Examples

### Verified: StatCard component structure (DashboardPage.jsx line 57-76)
```jsx
function StatCard({ label, count, color, loading, error }) {
  const colors = STAT_COLOR_MAP[color] || STAT_COLOR_MAP.violet;
  return (
    <div className="glass-card p-5">
      <div className="text-xs text-text-muted mb-1">{label}</div>
      {loading ? (
        <div className="h-8 w-24 bg-surface-2 rounded animate-pulse mb-2" />
      ) : error ? (
        <div className="text-sm text-red">Failed to load</div>
      ) : (
        <div className="text-2xl font-sans font-bold text-text-primary mb-2">
          {(count || 0).toLocaleString()}
        </div>
      )}
      {/* REMOVE: lines 71-74 (Live indicator) per D-09 */}
      <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full bg-green animate-pulse`} />
        <span className="text-[10px] text-text-muted">Live</span>
      </div>
    </div>
  );
}
```

### Verified: ThreatMapCounters labels (ThreatMapCounters.jsx line 10, 21)
```jsx
// Line 10: "Global Threats" heading -> keep or change per D-07 scope
<h2 className="font-sans font-semibold">Global Threats</h2>
// Line 21: "Active Threats" counter label -> "100 Latest Attacks"
<div className="text-[10px] text-text-muted">Active Threats</div>
```

### Verified: Dashboard mini-map heading (DashboardPage.jsx line 472)
```jsx
// "Global Threat Map" -> "100 Latest Attacks" per D-06
<h2 className="font-sans font-semibold text-sm">Global Threat Map</h2>
```

### Verified: Sticky header (ThreatSearchPage.jsx line 608-609)
```jsx
showStickyHeader
  ? 'sticky top-0 z-10 bg-primary/90 backdrop-blur-md pb-4 pt-2 -mx-6 px-6'
  // Fix: change top-0 to top-[60px]
```

### Verified: Search loading spinner (ThreatSearchPage.jsx line 661-662)
```jsx
{loading ? (
  <span className="animate-spin"><Search size={18} /></span>
) : (
  <Search size={18} />
)}
```

## File Change Map

| File | Changes | Requirements |
|------|---------|-------------|
| `frontend/src/pages/DashboardPage.jsx` | Extend STAT_CARD_CONFIG (3 entries), add green to STAT_COLOR_MAP, add "Threat Database" heading, change grid to flexbox, remove Live indicator from StatCard | DASH-01, DASH-02, DASH-03 |
| `frontend/src/pages/DashboardPage.jsx` | Replace "Global Threat Map" with "100 Latest Attacks" in mini-map heading | MAP-02 |
| `frontend/src/components/threat-map/ThreatMapCounters.jsx` | Replace "Active Threats" with "100 Latest Attacks" | MAP-02 |
| `frontend/src/pages/ThreatSearchPage.jsx` | Seed D3 node positions, guard container dimensions | SEARCH-01 |
| `frontend/src/pages/ThreatSearchPage.jsx` | Replace spinning icon with skeleton cards below search | SEARCH-02 |
| `frontend/src/pages/ThreatSearchPage.jsx` | Change sticky `top-0` to `top-[60px]` | SEARCH-03 |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None -- no test infrastructure exists |
| Config file | None |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DASH-01 | "Threat Database" heading visible | manual-only | Visual check in browser | N/A |
| DASH-02 | 7 stat cards in 4+3 centered layout | manual-only | Visual check at multiple breakpoints | N/A |
| DASH-03 | No "Live" label or green dot | manual-only | Visual check on dashboard | N/A |
| MAP-01 | Map tracks 100 most recent IPs | manual-only | Check API response / map markers | N/A |
| MAP-02 | "100 Latest Attacks" label shown | manual-only | Visual check on dashboard + threat map page | N/A |
| SEARCH-01 | Graph nodes positioned correctly | manual-only | Search an IP, verify graph layout | N/A |
| SEARCH-02 | Skeleton loading during search | manual-only | Trigger search, observe loading state | N/A |
| SEARCH-03 | Search bar does not overlap topbar | manual-only | Log out, search, scroll page | N/A |

### Sampling Rate
- **Per task commit:** Visual verification in browser (`npm run dev`)
- **Per wave merge:** Full manual walkthrough of all 8 requirements
- **Phase gate:** All 8 requirements visually confirmed before verify-work

### Wave 0 Gaps
None -- no test infrastructure exists and all requirements are visual/UI. Manual verification is appropriate given the project has no tests (per CLAUDE.md).

## Sources

### Primary (HIGH confidence)
- Direct code reading of DashboardPage.jsx, ThreatSearchPage.jsx, ThreatMapCounters.jsx, Topbar.jsx, main.css
- CONTEXT.md decisions (user-locked)
- CLAUDE.md project documentation

### Secondary (MEDIUM confidence)
- D3 force simulation behavior (node default positioning) -- based on established D3.js documentation, confirmed by code inspection showing no initial x/y seeding

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, all changes use existing patterns
- Architecture: HIGH -- all target files read and analyzed, exact line numbers identified
- Pitfalls: HIGH -- root causes identified through direct code inspection

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (stable -- no moving parts, all frontend-only)
