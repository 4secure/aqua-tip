# Phase 57: UI Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-14
**Phase:** 57-ui-polish
**Areas discussed:** Settings centering, Globe render timing, Animation smoothness, Custom scrollbar, Favicon, Threat map sidebar z-index

---

## Settings Centering

| Option | Description | Selected |
|--------|-------------|----------|
| Match other pages | Use same max-width and mx-auto pattern used on other content pages | ✓ |
| Wider centered | Use max-w-3xl or max-w-4xl centered for more breathing room | |
| You decide | Pick whatever fits best | |

**User's choice:** Match other pages (max-w-2xl mx-auto)
**Notes:** None

---

## Globe Render Timing

| Option | Description | Selected |
|--------|-------------|----------|
| Bundle GeoJSON locally | Include 24KB land data in build — instant render | ✓ |
| Show spinner until loaded | Loading indicator inside globe circle | |
| Hide globe until ready | Don't show globe until data loaded, then fade in | |

**User's choice:** Bundle GeoJSON locally
**Notes:** User clarified the issue is NOT opacity — the globe shows an empty purple circle because the GeoJSON fetch hasn't completed yet. The land dots only appear after async load.

---

## Animation Smoothness

| Option | Description | Selected |
|--------|-------------|----------|
| Globe stutters during scroll | Globe movement/scaling lags behind scroll | ✓ |
| Cards appear late | Section 2 cards fade in too late or pop abruptly | |
| General sluggishness | Whole page feels heavy | |
| Multiple issues | Combination of above | |

**User's choice:** Globe stutters during scroll
**Notes:** Specific to globe canvas re-rendering during scroll, not a general performance issue

---

## Custom Scrollbar

| Option | Description | Selected |
|--------|-------------|----------|
| Thin track, no buttons | Minimal scrollbar: thin thumb, transparent track, no arrows | ✓ |
| Auto-hide scrollbar | Appears only when scrolling, then fades | |
| Invisible | Hide scrollbar completely | |

**User's choice:** Thin track, no buttons
**Notes:** User specifically wants no track background AND no up/down arrow buttons

---

## Favicon

| Option | Description | Selected |
|--------|-------------|----------|
| Use logo.png as-is | Generate favicon sizes from existing logo.png | ✓ |
| Separate favicon file | User provides different image | |

**User's choice:** Use existing logo.png
**Notes:** None

---

## Threat Map Sidebar Z-Index

| Option | Description | Selected |
|--------|-------------|----------|
| Desktop sidebar | Collapsible sidebar goes behind Leaflet map on desktop | ✓ |
| Mobile sidebar | Hamburger menu sidebar goes behind map | |
| Both | Happens on both | |

**User's choice:** Desktop sidebar
**Notes:** Sidebar goes below both the map tiles and the overlay widgets

---

## Claude's Discretion

- Spring config tuning values for scroll smoothness
- Exact scrollbar color choice
- Favicon generation approach

## Deferred Ideas

None
