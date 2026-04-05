# Feature Landscape

**Domain:** Threat Map Dashboard with Overlay Widget Panels
**Researched:** 2026-04-05
**Confidence:** HIGH (features grounded in existing codebase analysis + SOC/TIP UX research)

## Existing System Inventory

Components that the new threat map dashboard builds on:

| Component | Current State | Reuse Strategy |
|-----------|--------------|----------------|
| DashboardPage | 7 stat cards, indicators table, attack chart, credits, searches, map widget, quick actions. All sub-components defined inline (StatCard, IndicatorsTable, CreditWidget, RecentSearchesWidget, GuestCta). | Extract inline sub-components to separate files. Delete the page itself. |
| ThreatMapPage | Full-viewport Leaflet map with SSE streaming via `useThreatStream`, pulse markers, counters, countries, donut chart, live feed. Layout: left sidebar overlay (340px), bottom-right feed (380px). | This IS the foundation. Merge dashboard data into this layout. |
| ThreatMapCounters | `glass-card-static` panel showing threat count, countries count, attack types count with LIVE/OFFLINE status. | Import directly. Keep in left overlay. |
| ThreatMapCountries | Top 5 source countries with flag emoji and progress bars. | Import directly. Keep in left overlay. |
| ThreatMapDonut | Doughnut chart of attack type distribution (Chart.js). | Import directly. Keep in left overlay. |
| ThreatMapFeed | Scrollable live event feed with click-to-flyTo. Auto-scroll on new events. | Import directly. Keep in bottom-right. |
| ThreatMapStatus | Centered top banner for connection-lost state. | Import directly. Keep centered top. |
| useThreatStream | SSE hook returning events, counters, countryCounts, typeCounts, connected. | Import directly. No changes needed. |
| useLeaflet | Map initialization hook with center, zoom, markers, onReady callback. | Import directly. No changes needed. |
| useKeyboardShortcut | Keyboard shortcut handler already in hooks/. | Wire to panel toggle for power users. |
| Framer Motion | Already used across the app for animations. | Use for panel slide animations. |

## Table Stakes

Features users expect from a full-viewport threat map dashboard. Missing any of these means the product feels broken or regressed.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Full-viewport Leaflet map at `/dashboard` | Every major threat map (Check Point ThreatCloud, Radware, Kaspersky Cybermap) uses full-viewport maps as the primary view. The map must be the hero element, not a widget in a scrollable page. | Low | ThreatMapPage already does `height: calc(100vh - 60px)` with negative margin `-m-6`. Copy this exact pattern. |
| Left overlay panel with 7 stat cards | SOC dashboards universally place summary KPIs in an always-visible location. The current DashboardPage has 7 stat cards analysts rely on. Removing them without replacement is a regression. | Medium | Stack 7 StatCards vertically in a glassmorphism panel. Position `absolute top-4 left-4`. Panel needs internal scroll if viewport is short (~< 900px height). Width ~320px to match existing ThreatMapPage left sidebar. |
| Right overlay panel with recent indicators | The indicators table is the second-most-used dashboard widget. SOC analysts expect a feed of recent IOCs visible alongside geographic context for correlation ("where are these indicators appearing?"). | Medium | Reuse IndicatorsTable from DashboardPage in a compact variant. Width ~380px. Position `absolute top-4 right-4`. Needs height constraint with scroll. |
| Toggle button to collapse/expand panels | Standard map UX pattern -- control panels must be dismissible so analysts can see the full map when needed. Every GIS tool (Google Maps, Mapbox Studio, ArcGIS) and every SOC threat map provides this. | Low | Single toggle button (e.g., small icon button at map edge) that slides both panels off-screen simultaneously. |
| Smooth slide animation | Framer Motion is already the animation library. Abrupt show/hide without animation would feel jarring and inconsistent with the existing glassmorphism design system. | Low | `motion.div` with `animate={{ x: 0 }}` / `animate={{ x: -panelWidth }}` for left, mirrored for right. ~200ms spring or tween. |
| Preserved existing map features | SSE live feed, pulse markers, live counters, country breakdown, donut chart, "100 Latest Attacks" label, connection status -- all exist on ThreatMapPage and must carry over. Users who used `/threat-map` should not lose functionality. | Low | All are separate components already. Import ThreatMapCounters, ThreatMapFeed, ThreatMapCountries, ThreatMapDonut, ThreatMapStatus. Compose in new page. |
| Independent widget loading states | Current dashboard loads each widget independently with skeleton placeholders. Overlay panels must follow the same pattern -- never show a blank panel or block the map render while data loads. | Low | Already implemented pattern in DashboardPage. Each API call has its own loading/error state. Reuse directly. |
| DashboardPage removal | The old DashboardPage is being replaced, not supplemented. Two dashboards would confuse users and create maintenance burden. `/dashboard` route must point to the new map dashboard. | Low | Delete DashboardPage.jsx. Update App.jsx route to render the new MapDashboardPage at `/dashboard`. Remove `/threat-map` route or redirect to `/dashboard`. |

## Differentiators

Features that elevate this beyond a basic "map with sidebar" toward a proper SOC command-center feel.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Peek-on-hover (edge sliver) | When panels are collapsed, a thin edge strip (~8-12px) remains at the screen edge. Hovering this strip temporarily reveals that panel. This is a power-user pattern from Bloomberg Terminal, Splunk dashboards, and gaming HUDs. Analysts glance at stats without committing to reopening panels. | Medium | Requires: (1) visible edge strip when collapsed, (2) `onMouseEnter`/`onMouseLeave` with delay, (3) temporary expand animation that auto-reverts on mouse leave. Must not conflict with the toggle (permanent state change). |
| Independent left/right hover reveal | Hovering the left edge reveals only the left panel; the right stays collapsed. Avoids the "all or nothing" problem that a single global toggle creates. Each panel peeks independently. | Medium | Two separate state machines per panel: `expanded`, `collapsed`, `peeking`. Peeking is transient (hover-only), not a toggle state. |
| Auth-aware panel content | Authenticated users see credit balance and recent searches in the right panel below indicators. Guests see stat cards and indicators but get a sign-in CTA for auth-only widgets. Maintains the current dashboard's auth-gated behavior. | Low | Already built: `isAuthenticated` check, `GuestCta` component, `CreditWidget`, `RecentSearchesWidget`. Conditionally render in right overlay panel. |
| Category filter cross-panel interaction | Clicking a category in the attack donut or chart filters the indicators table (existing DashboardPage behavior). Cross-panel interaction persists in overlay layout, connecting left chart and right table logically. | Low | Already implemented with `activeFilter` state. Lift to parent component that owns both panels. |
| Keyboard shortcut for panel toggle | SOC analysts are power users who expect keyboard shortcuts. `[` / `]` to toggle left/right panels, or `\` to toggle both. | Low | `useKeyboardShortcut` hook already exists. Wire to panel toggle state. |

## Anti-Features

Features to explicitly NOT build for this milestone.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Draggable/resizable panels | Adds major complexity (pointer events, resize handles, persistence, mobile breakage) for marginal benefit. No web-based SOC tool does this well. | Fixed-width panels with responsive breakpoints. The glassmorphism design relies on consistent sizing. |
| Panel docking/undocking (pop-out) | Multi-window management is a desktop paradigm. Web pop-outs create popup-blocker issues, lost state, and z-index chaos. | Keep panels as in-viewport overlays only. |
| Customizable widget order/drag-and-drop | Requires a layout engine (react-grid-layout), persistence layer, and reset mechanism. Massive complexity for a v3.3 milestone. | Fixed widget order matching the existing dashboard information hierarchy. |
| Panel state persistence (localStorage) | Storing open/closed state across sessions adds complexity and confuses users who forget they collapsed panels on a previous visit. | Panels default to expanded on every page load. Fresh state every time. |
| Attack bar chart in overlay panel | The horizontal bar chart ("Top Attack Categories" from DashboardPage) takes significant vertical space and does not work in a narrow ~320px overlay. Cramming it in degrades both the chart and the panel. | ThreatMapDonut already shows attack type distribution. This covers the same use case in a more compact form. Omit the bar chart entirely. |
| Quick Actions in overlay | The "Quick Actions" links (IP Lookup, Threat Search, etc.) duplicate sidebar navigation. Placing them on a map overlay wastes prime real estate. | Sidebar already provides navigation. Remove Quick Actions entirely with the old DashboardPage. |
| Mini-map or map-in-map inset | Adds visual noise. The full-viewport map IS the overview -- there is nothing to contextualize with an inset. | One map, one zoom level, scroll/zoom to navigate. |
| Animated page transition from old to new dashboard | DashboardPage is being removed. There is no transition between coexisting pages -- the map IS the dashboard now. | Route swap, not animated transition. |
| Responsive bottom-sheet panels for mobile | Mobile SOC usage is negligible. Adding bottom-sheet behavior for small screens is premature complexity. | Fixed side overlays. Mobile users see panels overlapping the map (acceptable for this milestone). Polish in a later mobile-responsive milestone. |

## Feature Dependencies

```
Full-viewport map at /dashboard (foundation)
  --> Left overlay panel (stat cards)
  --> Right overlay panel (recent indicators)
    --> Toggle button (controls both panels)
      --> Peek-on-hover (requires collapsed state from toggle)
        --> Independent left/right peek (extends peek behavior)

Preserved map features (SSE, markers, counters)
  --> No dependency on overlay panels (map works independently)
  --> Existing threat-map components imported as-is

Auth-aware panel content
  --> Left/right overlay panels must exist first
  --> useAuth context (already available, no changes)

Category filter cross-panel
  --> Both panels rendered
  --> Shared activeFilter state lifted to parent component

Keyboard shortcuts
  --> Toggle button logic must exist first
  --> useKeyboardShortcut hook (already exists)

Route changes
  --> /dashboard -> new MapDashboardPage
  --> /threat-map -> redirect to /dashboard (or remove)
  --> DashboardPage.jsx deleted
```

## Interaction State Machine

Each panel (left, right) operates with three visual states:

```
EXPANDED (default on page load)
  |
  |--> user clicks toggle --> COLLAPSED
  |                            |
  |                            |--> user clicks toggle --> EXPANDED
  |                            |--> user hovers edge strip --> PEEKING
  |                                                            |
  |                                                            |--> mouse leaves --> COLLAPSED
  |                                                            |--> user clicks toggle --> EXPANDED
  |
  Panel is fully visible and interactive.

COLLAPSED
  Only a thin edge sliver (~8-12px) visible at screen edge.
  Map occupies full viewport.

PEEKING (transient hover state)
  Panel slides in temporarily. Fully visible but auto-reverts.
  No backdrop, no state persistence.
```

Key behavior rules:
- Toggle is a permanent state change (click to switch)
- Peek is transient (hover-only, auto-reverts when mouse leaves)
- Peek has a ~150ms enter delay to prevent accidental triggers
- Peek has a ~200ms leave delay so users can move mouse into panel content
- Both panels start EXPANDED on every page load
- Toggle controls both panels simultaneously (one button, affects both)
- Peek works independently per panel (hover left edge = only left peeks)

## Components to Extract from DashboardPage

These sub-components are currently defined inline in DashboardPage.jsx and need extraction to be reusable in the new map dashboard:

| Component | Extract To | Lines in DashboardPage | Changes Needed |
|-----------|-----------|----------------------|----------------|
| `StatCard` | `components/dashboard/StatCard.jsx` | 61-77 | None -- already self-contained |
| `IndicatorsTable` | `components/dashboard/IndicatorsTable.jsx` | 139-189 | Add compact mode prop for narrow panel width |
| `CreditWidget` | `components/dashboard/CreditWidget.jsx` | 192-246 | None -- already self-contained |
| `RecentSearchesWidget` | `components/dashboard/RecentSearchesWidget.jsx` | 248-307 | None -- already self-contained |
| `GuestCta` | `components/dashboard/GuestCta.jsx` | 309-319 | None -- already self-contained |
| `AttackChart` | Not needed | 79-137 | Do not extract. Replaced by ThreatMapDonut in overlay context. |
| `STAT_CARD_CONFIG` | `components/dashboard/StatCard.jsx` | 12-20 | Co-locate with StatCard |
| `STAT_COLOR_MAP` | `components/dashboard/StatCard.jsx` | 22-28 | Co-locate with StatCard |

## New Components Needed

| Component | Purpose | Complexity |
|-----------|---------|------------|
| `MapDashboardPage` | New page replacing DashboardPage + ThreatMapPage at `/dashboard`. Composes map + overlay panels + existing threat-map widgets. | Medium |
| `OverlayPanel` | Reusable animated side panel (left or right) with slide collapse/expand + peek-on-hover. Wraps children. | Medium |
| `PanelToggle` | Small icon button on the map to collapse/expand all panels. Positioned centrally or near a panel edge. | Low |
| `PeekStrip` | Thin edge strip (8-12px) visible when a panel is collapsed. Handles mouseEnter/mouseLeave for peek trigger. | Low |

## MVP Recommendation

Build in this order:

1. **Full-viewport map at `/dashboard` with existing map features** -- Foundation. Merge ThreatMapPage into a new MapDashboardPage. Remove DashboardPage. Route `/dashboard` to the new page. Zero new components, just composition and route changes.

2. **Extract DashboardPage sub-components** -- Pull StatCard, IndicatorsTable, CreditWidget, RecentSearchesWidget, GuestCta into `components/dashboard/`. Required before overlay panels can use them.

3. **Left overlay panel with stat cards** -- Wrap 7 StatCards in a `motion.div` positioned absolutely over the map. Use `glass-card-static` styling (matches existing ThreatMapCounters). Integrate existing map widgets (counters, countries, donut) below stat cards.

4. **Right overlay panel with recent indicators** -- Same pattern, right side. Compact IndicatorsTable + auth-gated CreditWidget and RecentSearchesWidget below.

5. **Toggle button with slide animation** -- Single button that collapses both panels via Framer Motion x-axis slide. `AnimatePresence` for mount/unmount or `animate` for slide transforms.

6. **Peek-on-hover with edge sliver** -- Thin strips at screen edges when collapsed. `onMouseEnter` triggers temporary panel reveal with delays.

7. **Independent left/right peek** -- Extend peek to work per-panel rather than both simultaneously.

**Defer to polish pass (not v3.3 scope):**
- Keyboard shortcuts for panel toggle
- Responsive panel widths for smaller screens
- Category filter cross-panel interaction (will work naturally if state is lifted, but not a dedicated task)

## Sources

- [5 Map UI Design Patterns That Elevate UX](https://bricxlabs.com/blogs/map-ui-design-patterns-examples) -- map overlay and control panel patterns
- [SOC Threat Intelligence Dashboard Case Study](https://medium.com/@sarathb1998sb/threats-at-a-glance-soc-threat-intelligence-dashboard-case-study-cfca25f5c5eb) -- dashboard layout and widget hierarchy
- [Cybersecurity Dashboard UI/UX Design Guide](https://www.aufaitux.com/blog/cybersecurity-dashboard-ui-ux-design/) -- SOC dashboard design principles
- [Dashboard Design UX Patterns](https://www.pencilandpaper.io/articles/ux-pattern-analysis-data-dashboards) -- progressive disclosure and hover patterns
- [Collapsible Panels Pattern](http://www.welie.com/patterns/showPattern.php?patternID=collapsible-panels) -- toggle and collapse UX conventions
- [Adobe Slide-out Panels Pattern](https://developer.adobe.com/commerce/admin-developer/pattern-library/containers/slideouts-modals-overlays) -- overlay panel best practices
- [Map UI Design Best Practices](https://www.eleken.co/blog-posts/map-ui-design) -- map overlay and tooltip patterns
- [Check Point Live Threat Map](https://threatmap.checkpoint.com/) -- real-world threat map with overlay panels
- [Radware Live Threat Map](https://livethreatmap.radware.com/) -- full-viewport threat visualization reference
- [Framer Motion Animated Sidebar](https://www.freecodecamp.org/news/create-a-fully-animated-sidebar/) -- slide panel animation patterns
- [Framer Motion Sliding Sidebar Menu](https://egghead.io/blog/how-to-create-a-sliding-sidebar-menu-with-framer-motion) -- AnimatePresence + motion.div patterns
- Existing codebase: ThreatMapPage.jsx, DashboardPage.jsx, threat-map components, useThreatStream hook, useLeaflet hook

---
*Feature research for: AQUA TIP v3.3 Threat Map Dashboard*
*Researched: 2026-04-05*
