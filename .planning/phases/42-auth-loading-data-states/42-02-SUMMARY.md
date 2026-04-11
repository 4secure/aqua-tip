---
phase: 42-auth-loading-data-states
plan: 02
status: complete
started: 2026-04-11T03:20:00+05:00
completed: 2026-04-11T03:35:00+05:00
---

## Summary

Replaced misleading error messages with proper loading indicators in ThreatMapStatus and RightOverlayPanel. ThreatMapStatus now shows "Fetching data..." with a violet spinner in neutral surface colors instead of amber "Connection lost" warning. RightOverlayPanel error state shows skeleton shimmer blocks (matching existing loading state) instead of "Failed to load indicators" text.

## Self-Check: PASSED

All acceptance criteria verified:
- ThreatMapStatus.jsx contains "Fetching data..." text
- No "Connection lost" or amber colors remain
- Spinner added with animate-spin class
- RightOverlayPanel.jsx uses skeleton blocks for error state
- "Failed to load indicators" text removed
- SKELETON_WIDTHS referenced 3 times (definition + loading + error)
- StatRow "---" fallback preserved
- Frontend builds successfully

## Key Files

### Modified
- `frontend/src/components/threat-map/ThreatMapStatus.jsx` — "Fetching data..." with violet spinner in neutral colors
- `frontend/src/components/threat-map/RightOverlayPanel.jsx` — Skeleton shimmer for indicator error state

## Deviations

None — implemented exactly as planned.
