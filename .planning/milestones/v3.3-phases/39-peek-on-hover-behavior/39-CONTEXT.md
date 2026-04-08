# Phase 39: Peek-on-Hover Behavior - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Add peek-on-hover behavior to the collapsed overlay panels on the threat map dashboard. When panels are collapsed via the toggle button, thin glassmorphism slivers appear at each edge. Hovering a sliver temporarily reveals that panel independently. The user's toggle state (expanded/collapsed) persists across page refreshes via localStorage.

</domain>

<decisions>
## Implementation Decisions

### Peek Sliver Design
- **D-01:** Thin glassmorphism strip (~8-12px wide) at each edge when panels are collapsed. Uses `glass-card-static` styling consistent with existing panel design.
- **D-02:** Sliver spans the same vertical area as the expanded panel (matching `top-4` positioning and panel content height), not full viewport height.
- **D-03:** Subtle brighten effect on sliver hover (faint violet border glow or opacity increase) to signal interactivity before the panel slides out.

### Hover Reveal Behavior
- **D-04:** Full panel reveal on hover — the entire panel slides out using the existing Framer Motion spring animation, identical to the expanded state.
- **D-05:** Small entry delay (~150ms) before panel starts revealing on hover, to prevent accidental triggers when cursor passes over edge.
- **D-06:** Panel collapses back to sliver after a short delay (~200-300ms) when mouse leaves the revealed panel, preventing accidental dismissal.

### State Model
- **D-07:** Toggle is master, hover is temporary. Toggle button sets the base state (expanded/collapsed). When collapsed, hovering a sliver temporarily reveals only that one panel. Mouse leave returns it to collapsed. Toggle to expand restores both panels permanently.
- **D-08:** When panels are expanded (not collapsed), hover has no effect. Hover-peek logic only activates in the collapsed state.

### localStorage Persistence
- **D-09:** Only the toggle state (collapsed/expanded boolean) is persisted in localStorage. Hover-peek is always transient and never persisted.
- **D-10:** Default state for first-time visitors (no localStorage value) is expanded — panels visible by default, matching current behavior.

### Claude's Discretion
- localStorage key naming convention (e.g., `aqua-tip:panels-collapsed`)
- Exact sliver width within the ~8-12px range
- Exact hover entry/exit delay values within the specified ranges
- Whether to use `onMouseEnter`/`onMouseLeave` or `onPointerEnter`/`onPointerLeave` for hover detection
- Animation transition parameters for sliver appearance/disappearance
- Event isolation approach on slivers (same `EVENT_ISOLATION` pattern from Phase 38)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — TOGGLE-02, TOGGLE-03, TOGGLE-04 define this phase's scope

### Roadmap
- `.planning/ROADMAP.md` §Phase 39 — success criteria and phase dependencies

### Prior Phase Context
- `.planning/phases/38-overlay-panel-components/38-CONTEXT.md` — Panel positioning, toggle behavior (D-08, D-09), animation patterns, event isolation

### Key Source Files
- `frontend/src/pages/ThreatMapPage.jsx` — Main page with `panelsCollapsed` state and panel integration (lines 40, 78-95)
- `frontend/src/components/threat-map/LeftOverlayPanel.jsx` — Left panel with AnimatePresence, spring transition, glass-card-static styling
- `frontend/src/components/threat-map/RightOverlayPanel.jsx` — Right panel with AnimatePresence, spring transition, glass-card-static styling
- `frontend/src/components/threat-map/PanelToggle.jsx` — Toggle button component with event isolation
- `frontend/src/styles/glassmorphism.css` — Glass effect utilities for sliver styling

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SPRING_TRANSITION` (both overlay panels): `{ type: 'spring', stiffness: 300, damping: 30 }` — reuse for peek reveal animation
- `EVENT_ISOLATION` object (both overlay panels): Shared event propagation blocking — reuse on sliver elements
- `glass-card-static` CSS class: Glassmorphism styling for slivers
- `AnimatePresence` + `motion.div` pattern: Already wrapping both panels, extend for sliver/peek states

### Established Patterns
- Panels use `absolute` positioning with `z-[1000]` and `top-4 left-4` / `top-4 right-4`
- Both panels use identical animation pattern: `initial={{ x: +-20, opacity: 0 }}` / `animate={{ x: 0, opacity: 1 }}` / `exit`
- `panelsCollapsed` boolean controls panel visibility via `!collapsed &&` conditional rendering
- Left panel: 340px wide, right panel: 380px wide

### Integration Points
- `ThreatMapPage.jsx` line 40: `useState(false)` needs to read from localStorage and write on change
- `ThreatMapPage.jsx` lines 78-95: Panel components need new props for hover-peek state (e.g., `peeking` boolean)
- Slivers need to be rendered when `panelsCollapsed` is true (replacing the current "nothing rendered" state)
- Both `LeftOverlayPanel` and `RightOverlayPanel` need to handle a third render state: collapsed-but-peeking

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 39-peek-on-hover-behavior*
*Context gathered: 2026-04-05*
