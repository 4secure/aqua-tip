# Phase 39: Peek-on-Hover Behavior - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-05
**Phase:** 39-peek-on-hover-behavior
**Areas discussed:** Peek sliver design, Hover reveal behavior, Independent vs shared state, localStorage persistence

---

## Peek Sliver Design

### Q1: What should the peek sliver look like when panels are collapsed?

| Option | Description | Selected |
|--------|-------------|----------|
| Thin glassmorphism strip | ~8-12px frosted-glass vertical strip at each edge, matching glass-card-static style | ✓ |
| Icon tab | ~32x80px tab with chevron icon at vertical center of each edge | |
| Color accent line | 3-4px solid violet line running full panel height | |

**User's choice:** Thin glassmorphism strip
**Notes:** Subtle and consistent with existing panel styling.

### Q2: Should the sliver span the full height of the panel area, or match a shorter fixed height?

| Option | Description | Selected |
|--------|-------------|----------|
| Match panel height | Sliver spans same vertical area as expanded panel | ✓ |
| Full viewport height | Sliver runs from top to bottom of map container | |
| You decide | Claude picks based on layout | |

**User's choice:** Match panel height
**Notes:** Visually indicates where the panel will appear.

### Q3: Should the sliver have any visual hint on hover before the panel reveals?

| Option | Description | Selected |
|--------|-------------|----------|
| Subtle brighten | Slightly brighter or faint violet border glow on hover | ✓ |
| No extra hint | Sliver stays the same, panel reveal is the feedback | |
| You decide | Claude picks what fits | |

**User's choice:** Subtle brighten
**Notes:** Signals interactivity before panel slides out.

---

## Hover Reveal Behavior

### Q4: When hovering the peek sliver, should the panel fully reveal or show a partial preview?

| Option | Description | Selected |
|--------|-------------|----------|
| Full panel reveal | Entire panel slides out on hover, identical to expanded state | ✓ |
| Partial preview | Only ~120px of panel slides out, click for full | |
| You decide | Claude picks approach | |

**User's choice:** Full panel reveal
**Notes:** Simple and consistent — reuses existing Framer Motion spring animation.

### Q5: What should happen when the mouse leaves the revealed panel?

| Option | Description | Selected |
|--------|-------------|----------|
| Collapse after short delay | Panel stays ~200-300ms after mouse leaves, then collapses | ✓ |
| Collapse immediately | Instant collapse on mouse leave | |
| Stay until click away | Panel stays open until click outside or hover other sliver | |

**User's choice:** Collapse after short delay
**Notes:** Prevents accidental dismissal when moving cursor across the panel.

### Q6: Should there be a hover delay before the panel reveals?

| Option | Description | Selected |
|--------|-------------|----------|
| Small delay ~150ms | Brief pause before panel slides out | ✓ |
| No delay — instant | Panel starts revealing immediately | |
| You decide | Claude picks delay | |

**User's choice:** Small delay ~150ms
**Notes:** Prevents accidental reveals when cursor passes over edge.

---

## Independent vs Shared State

### Q7: How should the toggle button and hover-peek interact?

| Option | Description | Selected |
|--------|-------------|----------|
| Toggle is master, hover is temporary | Toggle sets base state; hover temporarily reveals one panel | ✓ |
| Hover locks panel open | Hovering opens panel and it stays until toggled again | |
| You decide | Claude picks interaction model | |

**User's choice:** Toggle is master, hover is temporary
**Notes:** Clean separation — toggle controls base state, hover provides transient peek.

### Q8: When panels are expanded, should hovering do anything?

| Option | Description | Selected |
|--------|-------------|----------|
| No effect | Hover only matters when collapsed | ✓ |
| Hover highlights panel | Subtle highlight on hover when expanded | |

**User's choice:** No effect
**Notes:** Simpler logic. Hover-peek only activates in collapsed state.

---

## localStorage Persistence

### Q9: What should be persisted in localStorage?

| Option | Description | Selected |
|--------|-------------|----------|
| Just toggle state | Simple boolean for collapsed/expanded | ✓ |
| Toggle state + last-peeked panel | Also save which panel was last hovered | |
| You decide | Claude picks what to persist | |

**User's choice:** Just toggle state
**Notes:** Hover-peek is always transient and never persisted.

### Q10: What should the default state be for first-time visitors?

| Option | Description | Selected |
|--------|-------------|----------|
| Expanded | Panels visible by default, matches current behavior | ✓ |
| Collapsed | Start with just map and slivers | |

**User's choice:** Expanded
**Notes:** Users discover content on first visit. Matches current `useState(false)` default.

---

## Claude's Discretion

- localStorage key naming convention
- Exact sliver width within ~8-12px range
- Exact hover entry/exit delay values within specified ranges
- Pointer event API choice for hover detection
- Animation transition parameters for sliver
- Event isolation on slivers

## Deferred Ideas

None — discussion stayed within phase scope
