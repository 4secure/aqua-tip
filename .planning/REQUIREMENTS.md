# Requirements: AQUA TIP

**Defined:** 2026-03-28
**Core Value:** Users get real threat intelligence from OpenCTI -- searchable across all observable types through a secure, credit-gated platform with subscription plan tiers.

## v3.2 Requirements

Requirements for App Layout Page Tweaks milestone. Each maps to roadmap phases.

### Dashboard

- [ ] **DASH-01**: User sees "Threat Database" heading above stat cards
- [ ] **DASH-02**: User sees 7 stat cards: IP Address, Domain, Hostname, Certificate, Email, Crypto Wallet, URL
- [ ] **DASH-03**: Dashboard does not show "Live" label or pulsating green dot

### Threat Map

- [ ] **MAP-01**: Threat map tracks only the 100 most recent IPs
- [ ] **MAP-02**: User sees "100 Latest Attacks" label instead of "Active Threats"

### Threat News

- [ ] **NEWS-01**: Threat news page auto-refreshes every 5 minutes silently
- [ ] **NEWS-02**: User sees current date's threat news by default
- [ ] **NEWS-03**: User can select a date to load that day's threat news (replaces pagination)
- [ ] **NEWS-04**: User sees a category distribution chart filtered by the selected date

### Threat Actors

- [ ] **ACTOR-01**: User sees enriched threat actor modal with TTPs, tools, campaigns, and targeted sectors
- [ ] **ACTOR-02**: Threat actors page auto-refreshes every 5 minutes silently

### Threat Search

- [ ] **SEARCH-01**: Relation graph nodes display in correct positions (not clustered in top-left)
- [ ] **SEARCH-02**: User sees a proper loading indicator during search (not spinning logo)
- [ ] **SEARCH-03**: Search bar does not go under the topbar when user is logged out

### Settings/Profile

- [ ] **SETTINGS-01**: User sees their real profile data on the settings page (not dummy data)
- [ ] **SETTINGS-02**: User can update their profile information and see changes reflected immediately

## Future Requirements

### Deferred from research

- **NEWS-F01**: Advanced date range filtering (start + end date)
- **ACTOR-F01**: Threat actor comparison view (side-by-side)
- **SETTINGS-F01**: API key management for external integrations
- **SETTINGS-F02**: Webhook configuration for alerts
- **SETTINGS-F03**: Usage analytics dashboard

## Out of Scope

| Feature | Reason |
|---------|--------|
| API key management UI | No backend infrastructure exists -- future milestone |
| Webhook configuration | No backend infrastructure exists -- future milestone |
| Usage analytics tab | No usage tracking system -- future milestone |
| Real-time WebSocket auto-refresh | SSE + polling is simpler and sufficient |
| Date range filtering (multi-day) | Single-date filtering covers the use case for now |
| Password change in settings | Not requested -- separate security feature |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DASH-01 | Phase 30 | Pending |
| DASH-02 | Phase 30 | Pending |
| DASH-03 | Phase 30 | Pending |
| MAP-01 | Phase 30 | Pending |
| MAP-02 | Phase 30 | Pending |
| NEWS-01 | Phase 31 | Pending |
| NEWS-02 | Phase 32 | Pending |
| NEWS-03 | Phase 32 | Pending |
| NEWS-04 | Phase 33 | Pending |
| ACTOR-01 | Phase 34 | Pending |
| ACTOR-02 | Phase 31 | Pending |
| SEARCH-01 | Phase 30 | Pending |
| SEARCH-02 | Phase 30 | Pending |
| SEARCH-03 | Phase 30 | Pending |
| SETTINGS-01 | Phase 35 | Pending |
| SETTINGS-02 | Phase 35 | Pending |

**Coverage:**
- v3.2 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0

---
*Requirements defined: 2026-03-28*
*Last updated: 2026-03-28 after roadmap creation*
