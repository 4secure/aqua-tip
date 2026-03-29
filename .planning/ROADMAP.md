# Roadmap: AQUA TIP

## Milestones

- v1.0 Authentication System - Phases 1-6 (shipped 2026-03-14)
- v1.1 PostgreSQL & Railway - Phases 7-7 (shipped 2026-03-14)
- v2.0 OpenCTI Integration - Phases 8-11 (shipped 2026-03-16)
- v2.1 Threat Search & UI Refresh - Phases 12-17 (shipped 2026-03-18)
- v2.2 Live Dashboard & Search History - Phases 18-21 (shipped 2026-03-20)
- v3.0 Onboarding, Trial & Plans - Phases 22-26 (shipped 2026-03-25)
- v3.1 Font & UI Polish - Phases 27-29 (shipped 2026-03-27)
- v3.2 App Layout Page Tweaks - Phases 30-35 (in progress)

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

### v3.2 App Layout Page Tweaks

- [x] **Phase 30: Quick Wins** - Dashboard stat cards, map label, and search bug fixes (all frontend-only) (completed 2026-03-28)
- [x] **Phase 31: Auto-Refresh Infrastructure** - Reusable useAutoRefresh hook for Threat News and Threat Actors (completed 2026-03-29)
- [x] **Phase 32: Date-Based News Browsing** - Date selector replacing pagination with timezone-aware backend filtering (completed 2026-03-29)
- [ ] **Phase 33: Category Distribution Chart** - Time-series category chart on Threat News filtered by selected date
- [ ] **Phase 34: Enriched Threat Actor Modal** - TTPs, tools, campaigns, and targeted sectors via fetch-on-open
- [ ] **Phase 35: Functional Settings Page** - Real profile data display and editing with AuthContext sync

## Phase Details

### Phase 30: Quick Wins
**Goal**: Users see an expanded dashboard with all observable types, a correctly labeled threat map, and a bug-free search experience
**Depends on**: Nothing (first phase of v3.2)
**Requirements**: DASH-01, DASH-02, DASH-03, MAP-01, MAP-02, SEARCH-01, SEARCH-02, SEARCH-03
**Success Criteria** (what must be TRUE):
  1. User sees "Threat Database" heading above stat cards on the dashboard
  2. User sees 7 stat cards (IP Address, Domain, Hostname, Certificate, Email, Crypto Wallet, URL) with responsive layout at all breakpoints
  3. Dashboard does not display any "Live" label or pulsating green dot
  4. Threat map displays "100 Latest Attacks" label and tracks only the 100 most recent IPs
  5. Relation graph nodes on Threat Search are positioned correctly (not clustered top-left), search shows a proper loader, and search bar does not overlap topbar when logged out
**Plans:** 2/2 plans complete
Plans:
- [ ] 30-01-PLAN.md -- Dashboard stat cards (4->7), heading, live label removal, map labels
- [ ] 30-02-PLAN.md -- Search page bug fixes (D3 graph, skeleton loading, sticky header)
**UI hint**: yes

### Phase 31: Auto-Refresh Infrastructure
**Goal**: Threat News and Threat Actors pages stay current without manual reload, using a shared refresh pattern
**Depends on**: Phase 30
**Requirements**: NEWS-01, ACTOR-02
**Success Criteria** (what must be TRUE):
  1. Threat News page silently refreshes data every 5 minutes without visible flicker or scroll reset
  2. Threat Actors page silently refreshes data every 5 minutes without visible flicker or scroll reset
  3. Auto-refresh pauses when the browser tab is not visible and resumes when the user returns
**Plans:** 1/1 plans complete
Plans:
- [x] 31-01-PLAN.md -- useAutoRefresh hook + Threat News and Threat Actors integration
**UI hint**: yes

### Phase 32: Date-Based News Browsing
**Goal**: Users can browse threat news chronologically by selecting a specific date instead of paginating through results
**Depends on**: Phase 31
**Requirements**: NEWS-02, NEWS-03
**Success Criteria** (what must be TRUE):
  1. User sees the current date's threat news by default when opening the page
  2. User can select a different date and the page loads that day's threat news
  3. Selected date persists in the URL so the page can be bookmarked or shared
  4. Date filtering correctly handles timezone conversion (user's IANA timezone to UTC)
**Plans:** 2/2 plans complete
Plans:
- [x] 32-01-PLAN.md -- Backend date range filtering + frontend API client
- [x] 32-02-PLAN.md -- Calendar dropdown UI, pagination removal, URL date state
**UI hint**: yes

### Phase 33: Category Distribution Chart
**Goal**: Users can visualize category trends for threat news on the selected date
**Depends on**: Phase 32
**Requirements**: NEWS-04
**Success Criteria** (what must be TRUE):
  1. User sees a category distribution chart on the Threat News page filtered by the currently selected date
  2. Chart updates without flickering when the user changes the date
**Plans**: TBD
**UI hint**: yes

### Phase 34: Enriched Threat Actor Modal
**Goal**: Users can access deep intelligence about threat actors including TTPs, tools, campaigns, and targeted sectors
**Depends on**: Phase 31
**Requirements**: ACTOR-01
**Success Criteria** (what must be TRUE):
  1. User sees TTPs (with MITRE ATT&CK IDs where available), tools/malware, campaigns, and targeted sectors in the threat actor modal
  2. Modal shows a loading skeleton while enrichment data is fetched (fetch-on-open pattern)
  3. Modal gracefully handles actors with no relationships (empty state, not error)
**Plans**: TBD
**UI hint**: yes

### Phase 35: Functional Settings Page
**Goal**: Users can view and edit their real profile information on the settings page
**Depends on**: Phase 30
**Requirements**: SETTINGS-01, SETTINGS-02
**Success Criteria** (what must be TRUE):
  1. User sees their real profile data (name, email, phone, timezone, organization, role, plan) on the settings page
  2. User can edit profile fields and see changes reflected immediately after saving
  3. AuthContext syncs updated user data after a successful profile save (no stale data in sidebar or topbar)
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 30 -> 31 -> 32 -> 33 -> 34 -> 35

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 30. Quick Wins | 1/2 | Complete    | 2026-03-28 |
| 31. Auto-Refresh Infrastructure | 1/1 | Complete    | 2026-03-28 |
| 32. Date-Based News Browsing | 2/2 | Complete    | 2026-03-29 |
| 33. Category Distribution Chart | 0/? | Not started | - |
| 34. Enriched Threat Actor Modal | 0/? | Not started | - |
| 35. Functional Settings Page | 0/? | Not started | - |
