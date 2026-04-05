# Phase 39: Peek-on-Hover Behavior - Research

**Researched:** 2026-04-05
**Domain:** React hover interactions, Framer Motion animation, localStorage persistence
**Confidence:** HIGH

## Summary

This phase adds peek-on-hover behavior to the collapsed overlay panels on the threat map dashboard. The implementation involves three distinct concerns: (1) rendering thin glassmorphism slivers when panels are collapsed, (2) temporarily revealing full panels on hover with entry/exit delays, and (3) persisting the toggle state in localStorage.

The existing codebase already has all the building blocks: `AnimatePresence` + `motion.div` patterns, `SPRING_TRANSITION` config, `EVENT_ISOLATION` object, and `glass-card-static` CSS class. No new libraries are needed. The work is primarily state management refactoring in `ThreatMapPage.jsx` and conditional rendering changes in both overlay panel components.

**Primary recommendation:** Lift hover-peek state into `ThreatMapPage.jsx` alongside `panelsCollapsed`, use `useEffect` to sync toggle state with localStorage, and extend each overlay panel to render a sliver element when collapsed (with `onPointerEnter`/`onPointerLeave` driving the peek state through delayed callbacks via `setTimeout` + cleanup refs).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Thin glassmorphism strip (~8-12px wide) at each edge when panels are collapsed. Uses `glass-card-static` styling.
- **D-02:** Sliver spans the same vertical area as the expanded panel (matching `top-4` positioning and panel content height), not full viewport height.
- **D-03:** Subtle brighten effect on sliver hover (faint violet border glow or opacity increase) to signal interactivity.
- **D-04:** Full panel reveal on hover -- entire panel slides out using the existing Framer Motion spring animation, identical to the expanded state.
- **D-05:** Small entry delay (~150ms) before panel starts revealing on hover.
- **D-06:** Panel collapses back to sliver after a short delay (~200-300ms) when mouse leaves the revealed panel.
- **D-07:** Toggle is master, hover is temporary. Toggle button sets the base state. When collapsed, hovering reveals only that one panel. Mouse leave returns to collapsed.
- **D-08:** When panels are expanded (not collapsed), hover has no effect.
- **D-09:** Only the toggle state (collapsed/expanded boolean) is persisted in localStorage. Hover-peek is transient.
- **D-10:** Default state for first-time visitors is expanded (panels visible), matching current behavior.

### Claude's Discretion
- localStorage key naming convention (e.g., `aqua-tip:panels-collapsed`)
- Exact sliver width within the ~8-12px range
- Exact hover entry/exit delay values within the specified ranges
- Whether to use `onMouseEnter`/`onMouseLeave` or `onPointerEnter`/`onPointerLeave`
- Animation transition parameters for sliver appearance/disappearance
- Event isolation approach on slivers (same `EVENT_ISOLATION` pattern from Phase 38)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TOGGLE-02 | User sees a thin peek sliver at each edge when panels are collapsed | Sliver rendering pattern with `glass-card-static`, positioned absolutely matching panel `top-4` offset |
| TOGGLE-03 | User can hover a peek sliver to reveal just that panel independently | Per-panel `peeking` state driven by `onPointerEnter`/`onPointerLeave` with delay timers |
| TOGGLE-04 | User's toggle state persists across page refreshes via localStorage | `useState` initializer reads localStorage, `useEffect` writes on change |
</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | ^19.2.4 | Component framework | Project standard |
| framer-motion | ^12.35.2 | Animation (AnimatePresence, motion.div) | Already used by both panels |

### Supporting
No new libraries needed. All required functionality is achievable with React built-ins (`useState`, `useEffect`, `useRef`, `useCallback`) and existing Framer Motion patterns.

## Architecture Patterns

### State Model

```
ThreatMapPage state:
  panelsCollapsed: boolean    // master toggle, persisted in localStorage
  leftPeeking: boolean        // transient, hover-driven
  rightPeeking: boolean       // transient, hover-driven

Panel visibility logic:
  Left panel visible  = !panelsCollapsed OR leftPeeking
  Right panel visible = !panelsCollapsed OR rightPeeking
  Left sliver visible = panelsCollapsed AND !leftPeeking
  Right sliver visible = panelsCollapsed AND !rightPeeking
```

### Recommended Approach: State in ThreatMapPage, Slivers in Panels

```
ThreatMapPage.jsx
  |-- panelsCollapsed (localStorage-backed)
  |-- leftPeeking / rightPeeking (transient)
  |-- passes: collapsed, peeking, onPeekStart, onPeekEnd to each panel
  |
  |-- LeftOverlayPanel
  |     |-- renders sliver when collapsed && !peeking
  |     |-- renders full panel when !collapsed || peeking
  |
  |-- RightOverlayPanel
        |-- (same pattern, mirrored)
```

### Pattern 1: localStorage-backed useState

**What:** Initialize `panelsCollapsed` from localStorage, sync writes with `useEffect`.
**When to use:** D-09, D-10 -- persist toggle state, default to expanded.

```jsx
const STORAGE_KEY = 'aqua-tip:panels-collapsed';

const [panelsCollapsed, setPanelsCollapsed] = useState(() => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'true';
  } catch {
    return false; // default: expanded
  }
});

useEffect(() => {
  try {
    localStorage.setItem(STORAGE_KEY, String(panelsCollapsed));
  } catch {
    // localStorage unavailable (private browsing edge case) -- degrade silently
  }
}, [panelsCollapsed]);
```

### Pattern 2: Delayed Hover with Cleanup Refs

**What:** Use `setTimeout` with ref-based cleanup to implement entry/exit delays.
**When to use:** D-05 (150ms entry delay), D-06 (250ms exit delay).

```jsx
const peekEntryTimer = useRef(null);
const peekExitTimer = useRef(null);

const handlePeekStart = useCallback((side) => {
  // Clear any pending exit timer
  if (peekExitTimer.current) {
    clearTimeout(peekExitTimer.current);
    peekExitTimer.current = null;
  }
  // Delay entry
  peekEntryTimer.current = setTimeout(() => {
    if (side === 'left') setLeftPeeking(true);
    else setRightPeeking(true);
  }, 150);
}, []);

const handlePeekEnd = useCallback((side) => {
  // Clear any pending entry timer
  if (peekEntryTimer.current) {
    clearTimeout(peekEntryTimer.current);
    peekEntryTimer.current = null;
  }
  // Delay exit
  peekExitTimer.current = setTimeout(() => {
    if (side === 'left') setLeftPeeking(false);
    else setRightPeeking(false);
  }, 250);
}, []);

// Cleanup on unmount
useEffect(() => {
  return () => {
    clearTimeout(peekEntryTimer.current);
    clearTimeout(peekExitTimer.current);
  };
}, []);
```

**Important:** Each side needs its own pair of timer refs (left entry/exit, right entry/exit) to avoid cross-panel interference. Or use a single pair per side. The above is simplified; actual implementation should use separate refs per side.

### Pattern 3: Sliver Element

**What:** A thin glassmorphism strip rendered inside each panel component when collapsed and not peeking.
**When to use:** D-01, D-02, D-03.

```jsx
// Inside LeftOverlayPanel, when collapsed && !peeking
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  transition={{ duration: 0.2 }}
  className="absolute top-4 left-4 z-[1000] w-[10px] glass-card-static cursor-pointer hover:border-violet/30 transition-colors"
  style={{ height: 'calc(100vh - 120px)' }}  // match panel max-h
  onPointerEnter={() => onPeekStart('left')}
  {...EVENT_ISOLATION}
/>
```

The sliver inherits `glass-card-static` for glassmorphism consistency. The hover glow (`hover:border-violet/30`) matches the `glass-card` hover effect already in the design system.

### Pattern 4: Unified Hover Zone (Sliver + Revealed Panel)

**What:** The revealed panel and sliver share the same hover zone so moving from sliver to panel does not trigger exit.
**When to use:** D-06 -- preventing accidental dismissal.

The key insight: wrap both sliver and panel in a single container div that handles `onPointerEnter`/`onPointerLeave`. This way, moving from sliver into the revealed panel does not fire a leave event. The exit delay timer only starts when the pointer leaves the outer container entirely.

```jsx
<div
  onPointerEnter={() => onPeekStart('left')}
  onPointerLeave={() => onPeekEnd('left')}
>
  {/* Sliver (always present when collapsed, but visually hidden when peeking) */}
  {/* Full panel (shown when peeking) */}
</div>
```

### Anti-Patterns to Avoid
- **Separate hover zones for sliver and panel:** If the sliver and revealed panel are separate elements with independent hover handlers, moving from sliver to panel triggers sliver-leave then panel-enter, causing flicker. Use a wrapper div instead.
- **Storing peeking state in localStorage:** D-09 explicitly says only toggle state is persisted. Peeking is always transient.
- **Using CSS `:hover` for reveal:** CSS hover cannot implement delays or conditional logic based on collapsed state. Use React event handlers.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Hover delay management | Custom event system | `setTimeout` + `useRef` cleanup | Simple, well-understood, no dependencies needed |
| Animation orchestration | CSS transitions | Framer Motion `AnimatePresence` | Already used by panels, handles mount/unmount animation |
| Glassmorphism styling | Custom CSS per sliver | `glass-card-static` class | Existing utility, consistent with panel styling |

## Common Pitfalls

### Pitfall 1: Timer Leaks on Fast Toggle
**What goes wrong:** User toggles expand while a peek timer is pending, leading to stale state updates.
**Why it happens:** `setTimeout` fires after toggle state has changed, setting peeking to true when panels are expanded.
**How to avoid:** Clear all peek timers when `panelsCollapsed` changes to `false` (expanding). Reset both `leftPeeking` and `rightPeeking` to `false` when expanding.
**Warning signs:** Panel briefly flickers or shows both expanded and peeking state.

### Pitfall 2: Hover Zone Gap Between Sliver and Panel
**What goes wrong:** A pixel gap between sliver and revealed panel causes pointer-leave to fire during the transition.
**Why it happens:** If sliver and panel are positioned separately with a gap, the pointer exits the sliver before entering the panel.
**How to avoid:** Use a single wrapper div for hover detection that encompasses both the sliver position and the full panel position. The wrapper's hover zone should be continuous.
**Warning signs:** Panel flickers when trying to interact with it after hover-reveal.

### Pitfall 3: AnimatePresence Key Conflicts
**What goes wrong:** Panel and sliver animations interfere with each other because they share the same AnimatePresence context.
**Why it happens:** AnimatePresence tracks children by key. If the sliver and panel animate in/out within the same AnimatePresence, exit animations may conflict.
**How to avoid:** Use distinct `key` props for sliver and panel elements within the AnimatePresence, or use separate AnimatePresence wrappers for sliver vs panel.
**Warning signs:** Exit animation of sliver plays simultaneously with entry animation of panel, causing visual glitch.

### Pitfall 4: localStorage SSR/Hydration Issues
**What goes wrong:** Not applicable here (Vite SPA, no SSR), but worth noting: the `useState` initializer with `localStorage.getItem` is safe because this is a client-only Vite app. No SSR hydration mismatch risk.

## Code Examples

### localStorage Initialization (verified React pattern)
```jsx
// Safe initializer -- runs once on mount, try/catch for private browsing
const [panelsCollapsed, setPanelsCollapsed] = useState(() => {
  try {
    return localStorage.getItem('aqua-tip:panels-collapsed') === 'true';
  } catch {
    return false;
  }
});
```

### Pointer Events (recommended over Mouse Events)
```jsx
// onPointerEnter/onPointerLeave -- works with mouse, touch, and pen
// Consistent with existing EVENT_ISOLATION which uses onPointerDown
<div
  onPointerEnter={handleEnter}
  onPointerLeave={handleLeave}
>
```

**Rationale for `onPointerEnter`/`onPointerLeave`:** The existing `EVENT_ISOLATION` object already uses `onPointerDown` (not `onMouseDown`), establishing the pointer events convention. Pointer events are the modern standard, handle all input types, and are supported by all target browsers.

### Framer Motion AnimatePresence with Multiple Children
```jsx
// Use unique keys to allow simultaneous enter/exit animations
<AnimatePresence mode="wait">
  {collapsed && !peeking && (
    <motion.div key="sliver" ...sliverAnimation />
  )}
  {(!collapsed || peeking) && (
    <motion.div key="panel" ...panelAnimation />
  )}
</AnimatePresence>
```

**Note:** `mode="wait"` ensures exit completes before enter starts, preventing overlap glitches. However, for a smoother feel, omit `mode` (default is "sync") and let animations overlap -- test both.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `onMouseEnter`/`onMouseLeave` | `onPointerEnter`/`onPointerLeave` | Pointer Events standard (2019+) | Handles all input types uniformly |
| `componentDidMount` localStorage | `useState(() => localStorage.getItem(...))` | React 16.8+ (hooks) | Cleaner, no flash of default state |

## Open Questions

1. **AnimatePresence mode for sliver-to-panel transition**
   - What we know: `mode="wait"` prevents overlap but adds visual delay. Default mode allows overlap.
   - What's unclear: Which looks better for this specific transition (sliver shrink -> panel expand).
   - Recommendation: Start with default mode (simultaneous), switch to "wait" if it looks glitchy. This is a visual tuning decision for implementation time.

## Project Constraints (from CLAUDE.md)

- **No TypeScript** -- all `.jsx`/`.js` files
- **No tests exist** -- no test infrastructure to add validation tests
- **No linter/formatter** -- no auto-formatting constraints
- **Framer Motion** is the animation library (not CSS transitions or other libs)
- **Tailwind CSS 3** with custom dark theme for all styling
- **Immutability pattern** -- use new state objects, never mutate (from global coding-style.md)
- **File size** -- keep under 800 lines, prefer small focused files

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None -- no test infrastructure exists (per CLAUDE.md) |
| Config file | none |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TOGGLE-02 | Thin peek sliver visible at each edge when collapsed | manual-only | Visual inspection in browser | N/A |
| TOGGLE-03 | Hover sliver reveals panel independently | manual-only | Hover interaction in browser | N/A |
| TOGGLE-04 | Toggle state persists across refresh | manual-only | Toggle, refresh, verify state | N/A |

**Justification for manual-only:** No test framework exists in the project. All three requirements involve visual/interactive behavior (hover, animation, localStorage persistence) that are best verified through browser interaction. Adding a test framework is out of scope for this phase.

### Sampling Rate
- **Per task commit:** Manual browser verification
- **Per wave merge:** Full manual walkthrough of all 3 requirements
- **Phase gate:** All 3 success criteria verified visually

### Wave 0 Gaps
None -- no test infrastructure to gap-fill; manual verification is the established project pattern.

## Sources

### Primary (HIGH confidence)
- Direct code inspection of `ThreatMapPage.jsx`, `LeftOverlayPanel.jsx`, `RightOverlayPanel.jsx`, `PanelToggle.jsx`, `glassmorphism.css`
- React documentation (useState lazy initializer, useEffect, useRef, useCallback) -- well-known stable APIs
- Framer Motion AnimatePresence pattern -- already implemented in both panel components

### Secondary (MEDIUM confidence)
- Pointer Events recommendation based on existing codebase convention (`EVENT_ISOLATION` uses `onPointerDown`)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, all patterns already in codebase
- Architecture: HIGH -- state model is straightforward extension of existing pattern
- Pitfalls: HIGH -- well-known React timer/hover patterns, verified against code structure

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (stable patterns, no fast-moving dependencies)
