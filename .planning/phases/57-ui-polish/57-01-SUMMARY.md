---
phase: 57-ui-polish
plan: 01
status: checkpoint-pending
started: 2026-04-14
completed: 2026-04-14
---

# Plan 57-01 Summary

## What Was Built

Six UI polish fixes across the application:

1. **Settings page centering (D-01):** Added `mx-auto` to profile card — already applied
2. **Scrollbar styling (D-05):** 4px thin scrollbar, transparent track, no arrow buttons — already applied
3. **Favicon (D-06):** Added `<link rel="icon">` and `<link rel="apple-touch-icon">` tags to `index.html` pointing to existing `/logo.png`
4. **Threat Map sidebar z-index (D-07):** Added `zIndex: 0` stacking context isolation to map container in `ThreatMapPage.jsx`
5. **Globe instant render (D-02, D-03):** Replaced async GitHub fetch with static import of bundled `ne_110m_land.json` (~237KB raw, ~24KB gzipped). Land dots now render on first paint with no empty purple circle delay
6. **Scroll-aware rotation (D-04):** Added `isScrolling` flag with 150ms debounce that pauses globe rotation during scroll to prevent D3/Framer Motion frame contention

## Files Modified

| File | Change |
|------|--------|
| `frontend/index.html` | Added 3 favicon link tags |
| `frontend/src/pages/ThreatMapPage.jsx` | Added `zIndex: 0` stacking context |
| `frontend/src/components/ui/Globe.jsx` | Static import, removed async fetch/error state, scroll-aware rotation |
| `frontend/src/data/ne_110m_land.json` | New — bundled Natural Earth 110m land GeoJSON |

## Files Already Modified (prior session)

| File | Change |
|------|--------|
| `frontend/src/pages/SettingsPage.jsx` | `mx-auto` on profile card |
| `frontend/src/styles/main.css` | 4px scrollbar, transparent track, no arrows |

## Verification

- Production build: PASS
- All grep checks: PASS
- Human visual checkpoint: PENDING (Task 3)

## Awaiting

Task 3 human checkpoint — user must visually verify all 6 fixes in the browser.
