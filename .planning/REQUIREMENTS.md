# Requirements: AQUA TIP

**Defined:** 2026-04-05
**Core Value:** Real threat intelligence from OpenCTI — searchable across all observable types through a secure, credit-gated platform with subscription plan tiers.

## v3.3 Requirements

Requirements for Threat Map Dashboard milestone. Each maps to roadmap phases.

### Map Dashboard Layout

- [ ] **LAYOUT-01**: User sees the threat map as the main page at `/dashboard` (DashboardPage removed)
- [ ] **LAYOUT-02**: User navigating to `/threat-map` is redirected to `/dashboard`
- [ ] **LAYOUT-03**: User sees existing map widgets (live feed, pulse markers, counters, donut, countries) preserved on the map

### Overlay Panels

- [ ] **PANEL-01**: User sees 7 threat database stat cards stacked vertically in a left overlay panel
- [ ] **PANEL-02**: User sees recent indicators in a scrollable table in a right overlay panel
- [ ] **PANEL-03**: User sees overlay panels styled with glassmorphism (semi-transparent, backdrop blur, border)

### Toggle & Peek Interaction

- [ ] **TOGGLE-01**: User can click a single toggle button to collapse/expand both overlay panels
- [ ] **TOGGLE-02**: User sees a thin peek sliver at each edge when panels are collapsed
- [ ] **TOGGLE-03**: User can hover a peek sliver to reveal just that panel independently
- [ ] **TOGGLE-04**: User's toggle state persists across page refreshes via localStorage

### Cleanup

- [ ] **CLEAN-01**: DashboardPage.jsx is deleted and all references removed
- [ ] **CLEAN-02**: Sidebar navigation updated (no separate Dashboard/Threat Map links)

## Future Requirements

### Dashboard Enhancements

- **DASH-01**: Attack categories widget on map overlay
- **DASH-02**: Credit balance widget on map overlay
- **DASH-03**: Recent searches widget on map overlay

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multiple independent toggle buttons per panel | Single toggle is simpler; peek-on-hover provides independent access |
| Attack categories chart in overlay | Donut already covers this on the map; avoid clutter |
| Credit balance/recent searches in overlay | User requested only stat cards and indicators |
| WebSocket replacement for SSE | SSE works well, no need to change |
| Backend API changes | All needed endpoints already exist |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| LAYOUT-01 | — | Pending |
| LAYOUT-02 | — | Pending |
| LAYOUT-03 | — | Pending |
| PANEL-01 | — | Pending |
| PANEL-02 | — | Pending |
| PANEL-03 | — | Pending |
| TOGGLE-01 | — | Pending |
| TOGGLE-02 | — | Pending |
| TOGGLE-03 | — | Pending |
| TOGGLE-04 | — | Pending |
| CLEAN-01 | — | Pending |
| CLEAN-02 | — | Pending |

**Coverage:**
- v3.3 requirements: 12 total
- Mapped to phases: 0
- Unmapped: 12

---
*Requirements defined: 2026-04-05*
*Last updated: 2026-04-05 after initial definition*
