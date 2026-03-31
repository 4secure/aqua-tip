---
phase: 34-enriched-threat-actor-modal
verified: 2026-03-31T10:00:00Z
status: human_needed
score: 13/13 must-haves verified
must_haves:
  truths:
    - "GET /api/threat-actors/{id}/enrichment returns TTPs, tools, malware, campaigns, and relationships for an intrusion set"
    - "Response is cached for 15 minutes server-side"
    - "TTPs include tactic grouping (phase_name) and MITRE ATT&CK IDs (x_mitre_id) when available"
    - "Campaigns come from attributed-to relationships (fromTypes Campaign direction)"
    - "Endpoint returns 502 with message on OpenCTI connection failure"
    - "User sees a tabbed modal with Overview, TTPs, Tools, Campaigns, Relationships tabs"
    - "Header (name, aliases, badges, modified date) stays fixed above tabs"
    - "Overview tab shows existing content (description, goals, countries, sectors, external refs)"
    - "TTPs tab shows techniques grouped by MITRE ATT&CK tactic in kill chain order with T-codes"
    - "Tools tab shows tool and malware chips/badges"
    - "Campaigns tab shows campaign names with date ranges"
    - "Relationships tab shows D3 force-directed graph with actor as center node"
    - "Skeleton loading shows while enrichment data fetches"
  artifacts:
    - path: "backend/app/Http/Controllers/ThreatActor/EnrichmentController.php"
      provides: "Enrichment endpoint controller"
    - path: "backend/app/Services/ThreatActorService.php"
      provides: "enrichment() method with GraphQL query"
    - path: "backend/routes/api.php"
      provides: "Route registration"
    - path: "frontend/src/api/threat-actors.js"
      provides: "fetchThreatActorEnrichment API function"
    - path: "frontend/src/pages/ThreatActorsPage.jsx"
      provides: "Tabbed ThreatActorModal with 5 tabs and D3 graph"
human_verification:
  - test: "Open threat actor modal and verify all 5 tabs render correctly"
    expected: "Header fixed above tabs; Overview shows existing data; TTPs grouped by tactic; Tools as colored chips; Campaigns as cards; Relationships as D3 graph"
    why_human: "Visual layout, tab switching interaction, D3 graph rendering, and skeleton loading timing cannot be verified programmatically"
---

# Phase 34: Enriched Threat Actor Modal Verification Report

**Phase Goal:** Users can access deep intelligence about threat actors including TTPs, tools, campaigns, and targeted sectors
**Verified:** 2026-03-31T10:00:00Z
**Status:** human_needed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | GET /api/threat-actors/{id}/enrichment returns TTPs, tools, malware, campaigns, and relationships | VERIFIED | Route registered (artisan route:list confirms), controller invokes ThreatActorService::enrichment(), GraphQL queries all 5 relationship types |
| 2 | Response is cached for 15 minutes server-side | VERIFIED | ThreatActorService.php L249-255: Cache::remember with key `threat_actor_enrichment:$id` and `addMinutes(15)` |
| 3 | TTPs include tactic grouping and MITRE ATT&CK IDs | VERIFIED | normalizeTtps() groups by phase_name, filters kill_chain_name=mitre-attack, includes x_mitre_id, sorts by 14-tactic kill chain order with 'other' fallback |
| 4 | Campaigns come from attributed-to relationships (fromTypes Campaign direction) | VERIFIED | GraphQL uses `relationship_type: "attributed-to"` with `fromTypes: ["Campaign"]`; normalizeCampaigns extracts from `$edge['node']['from']` |
| 5 | Endpoint returns 502 on OpenCTI connection failure | VERIFIED | EnrichmentController.php catches OpenCtiConnectionException and returns 502 with message |
| 6 | User sees tabbed modal with Overview, TTPs, Tools, Campaigns, Relationships tabs | VERIFIED | ThreatActorsPage.jsx L498-504: TABS array with all 5 tabs, tab-bar CSS class, activeTab state switching |
| 7 | Header stays fixed above tabs | VERIFIED | ThreatActorsPage.jsx L534-569: name, aliases, modified date, motivation/resource_level badges rendered before tab-bar div |
| 8 | Overview tab shows existing content | VERIFIED | ThreatActorsPage.jsx L596-698: description, goals, targeted_countries, targeted_sectors, external_references all rendered from actor prop |
| 9 | TTPs tab shows techniques grouped by tactic with T-codes | VERIFIED | ThreatActorsPage.jsx L715-733: iterates enrichment.ttps groups, renders tactic_label header and techniques with mitre_id display |
| 10 | Tools tab shows tool and malware chips | VERIFIED | ThreatActorsPage.jsx L754-765: tools as cyan chips, malware as red chips |
| 11 | Campaigns tab shows campaign names with date ranges | VERIFIED | ThreatActorsPage.jsx L787-800: campaign cards with first_seen/last_seen via formatDate |
| 12 | Relationships tab shows D3 force-directed graph | VERIFIED | RelationshipGraph component (L345-457) uses dynamic import('d3'), forceSimulation, actor as center node (r=18), entity-type coloring |
| 13 | Skeleton loading shows while enrichment data fetches | VERIFIED | Each tab has enrichLoading conditional with animate-pulse skeletons matching content shape |

**Score:** 13/13 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/app/Http/Controllers/ThreatActor/EnrichmentController.php` | Enrichment endpoint controller | VERIFIED | 30 lines, invokable controller, try/catch pattern matching IndexController |
| `backend/app/Services/ThreatActorService.php` | enrichment() method with GraphQL query | VERIFIED | 584 lines, enrichment() + executeEnrichmentQuery() + normalizeEnrichmentResponse() + 6 normalization helpers |
| `backend/routes/api.php` | Route registration | VERIFIED | Line 66: `Route::get('/threat-actors/{id}/enrichment', ThreatActorEnrichmentController::class)` inside auth:sanctum group |
| `frontend/src/api/threat-actors.js` | fetchThreatActorEnrichment API function | VERIFIED | Line 15-17: exports function with encodeURIComponent, uses apiClient.get |
| `frontend/src/pages/ThreatActorsPage.jsx` | Tabbed ThreatActorModal with 5 tabs and D3 graph | VERIFIED | 837 lines, RelationshipGraph + ThreatActorModal with all 5 tabs, skeleton loading, empty states |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| backend/routes/api.php | EnrichmentController | Route::get registration | WIRED | Line 66 registers route pointing to ThreatActorEnrichmentController |
| EnrichmentController | ThreatActorService::enrichment | app(ThreatActorService::class)->enrichment | WIRED | Line 20 calls service method with $id |
| ThreatActorService::enrichment | OpenCtiService::query | GraphQL query execution | WIRED | Line 378: `$this->openCti->query($graphql, ['id' => $id])` |
| ThreatActorModal | fetchThreatActorEnrichment | useEffect on actor.id | WIRED | Line 491: `fetchThreatActorEnrichment(actor.id)` in useEffect with [actor.id] dependency |
| ThreatActorModal | tab-bar CSS | className tab-bar / tab-item | WIRED | Line 572: `className="tab-bar !mb-4"` and Line 576: `className="tab-item ..."` |
| Relationships tab | D3 dynamic import | import('d3') | WIRED | Line 354: `import('d3').then(d3 => ...)` in RelationshipGraph useEffect |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| ThreatActorModal | enrichment (useState) | fetchThreatActorEnrichment -> apiClient.get -> backend /enrichment endpoint | Backend queries OpenCTI via GraphQL (openCti->query) | FLOWING |
| ThreatActorModal | actor (prop) | Parent ThreatActorsPage selectedActor state -> fetchThreatActors API | Backend queries OpenCTI intrusionSets | FLOWING |
| RelationshipGraph | relationships (prop) | enrichment.relationships from parent ThreatActorModal | Passed from enrichment fetch, not hardcoded empty | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Vite build succeeds | `npx vite build` | Built in 18.90s, no errors | PASS |
| Route registered | `php artisan route:list --path=threat-actors` | Shows both /threat-actors and /threat-actors/{id}/enrichment | PASS |
| Commits exist | `git log --oneline -5` | 1ba6bfb (feat 34-01) and 3565f6c (feat 34-02) confirmed | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| ACTOR-01 | 34-01, 34-02 | User sees enriched threat actor modal with TTPs, tools, campaigns, and targeted sectors | SATISFIED | Backend endpoint returns all data types; frontend modal renders 5 tabs with TTPs grouped by MITRE tactic, tool/malware chips, campaign cards, D3 relationship graph, skeleton loading, and empty states |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | - | - | - | No TODO, FIXME, placeholder, or stub patterns found in any modified file |

### Human Verification Required

### 1. Visual Verification of Enriched Modal

**Test:** Start backend (`php artisan serve`) and frontend (`npm run dev`), navigate to Threat Actors page, click a threat actor card to open modal
**Expected:**
- Fixed header shows actor name, aliases, modified date, motivation/resource_level badges above tab bar
- Tab bar displays 5 tabs: Overview, TTPs, Tools, Campaigns, Relationships
- Overview tab shows description, goals, targeted countries, targeted sectors, external references
- TTPs tab shows techniques grouped under tactic headers with T-codes (or empty state)
- Tools tab shows cyan chips for tools and red chips for malware (or empty state)
- Campaigns tab shows campaign cards with date ranges (or empty state)
- Relationships tab shows D3 force-directed graph with actor as center node (or empty state)
- Skeleton loading appears briefly before data loads
- Tab switching is instant (no re-fetch)
- Escape key and backdrop click close the modal
**Why human:** Visual layout correctness, animation timing, D3 graph rendering quality, and interaction behavior cannot be verified programmatically

### Gaps Summary

No gaps found. All 13 observable truths are verified at the code level. All 5 artifacts exist, are substantive, wired, and have data flowing through them. All key links are connected. The single requirement (ACTOR-01) is satisfied.

The only outstanding item is human visual verification (Task 2 from Plan 02 is a human-verify checkpoint that has not been completed). The code is complete and correct -- a human needs to confirm the visual appearance and interaction behavior in the browser.

---

_Verified: 2026-03-31T10:00:00Z_
_Verifier: Claude (gsd-verifier)_
