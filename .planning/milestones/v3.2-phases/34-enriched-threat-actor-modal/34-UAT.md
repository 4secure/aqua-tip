---
status: diagnosed
phase: 34-enriched-threat-actor-modal
source: [34-01-SUMMARY.md, 34-02-SUMMARY.md]
started: 2026-04-04T12:00:00Z
updated: 2026-04-04T12:00:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

[testing complete]

## Tests

### 1. Tabbed Modal Layout
expected: Open a threat actor modal from the Threat Actors page. Modal shows a fixed header with the actor's name, aliases, date, and badges. Below the header is a tab bar with 5 tabs: Overview, TTPs, Tools, Campaigns, Relationships.
result: issue
reported: "i can see the tabs but getting this in each tab Failed to load enrichment data"
severity: major

### 2. Overview Tab Content
expected: Overview tab is the default active tab. It shows the actor's description, goals, targeted countries, targeted sectors, and external references — all existing content preserved from before the refactor.
result: pass

### 3. TTPs Tab
expected: Clicking the TTPs tab shows attack techniques grouped by MITRE ATT&CK tactic (e.g., Initial Access, Execution, Persistence). Each technique displays its T-code (e.g., T1566). Tactics appear in kill chain order.
result: issue
reported: "getting this Failed to load enrichment data"
severity: major

### 4. Tools & Malware Tab
expected: Clicking the Tools tab shows tool chips in cyan and malware chips in red, combined in one view. Each chip shows the tool/malware name.
result: issue
reported: "getting this Failed to load enrichment data"
severity: major

### 5. Campaigns Tab
expected: Clicking the Campaigns tab shows campaign cards. Each card displays the campaign name with first_seen and last_seen date ranges.
result: issue
reported: "getting this Failed to load enrichment data"
severity: major

### 6. Relationships Tab (D3 Graph)
expected: Clicking the Relationships tab shows a D3 force-directed graph. The threat actor is the center node. Related entities are connected with lines and colored by entity type. Nodes can be dragged and the graph responds interactively.
result: issue
reported: "getting this Failed to load enrichment data"
severity: major

### 7. Loading States
expected: When the modal first opens and enrichment data is fetching, the enrichment tabs (TTPs, Tools, Campaigns, Relationships) show skeleton loading animations. Each tab's skeleton matches its content shape (pulse groups for TTPs, pills for tools, rows for campaigns, rectangle for graph).
result: issue
reported: "it opening directly i cannot see any skeleton"
severity: minor

### 8. Empty States
expected: If an enrichment tab has no data (e.g., no TTPs found for this actor), the tab shows an empty state with an icon and message instead of a blank area.
result: blocked
blocked_by: server
reason: "enrichment API failing entirely — cannot distinguish empty state from error state"

## Summary

total: 8
passed: 1
issues: 6
pending: 0
skipped: 0
blocked: 1

## Gaps

- truth: "Modal tabs display enrichment data (TTPs, tools, campaigns, relationships) after loading"
  status: failed
  reason: "User reported: i can see the tabs but getting this in each tab Failed to load enrichment data"
  severity: major
  test: 1
  root_cause: "EnrichmentController only catches OpenCtiConnectionException, not OpenCtiQueryException — unhandled exception returns 500"
  artifacts:
    - path: "backend/app/Http/Controllers/ThreatActor/EnrichmentController.php"
      issue: "Missing catch for OpenCtiQueryException at line 21"
    - path: "backend/app/Services/ThreatActorService.php"
      issue: "GraphQL query may reference fields changed in OpenCTI schema (lines 263-376)"
  missing:
    - "Add catch clause for OpenCtiQueryException returning structured JSON error"
    - "Verify GraphQL enrichment query against current OpenCTI schema"
  debug_session: ".planning/debug/threat-actor-enrichment-fail.md"
- truth: "TTPs tab shows techniques grouped by MITRE ATT&CK tactic with T-codes in kill chain order"
  status: failed
  reason: "User reported: getting this Failed to load enrichment data"
  severity: major
  test: 3
  root_cause: "Same as test 1 — single enrichment API failure affects all tabs"
  artifacts: []
  missing: []
  debug_session: ".planning/debug/threat-actor-enrichment-fail.md"
- truth: "Tools tab shows tool chips (cyan) and malware chips (red) with names"
  status: failed
  reason: "User reported: getting this Failed to load enrichment data"
  severity: major
  test: 4
  root_cause: "Same as test 1 — single enrichment API failure affects all tabs"
  artifacts: []
  missing: []
  debug_session: ".planning/debug/threat-actor-enrichment-fail.md"
- truth: "Campaigns tab shows campaign cards with first_seen/last_seen date ranges"
  status: failed
  reason: "User reported: getting this Failed to load enrichment data"
  severity: major
  test: 5
  root_cause: "Same as test 1 — single enrichment API failure affects all tabs"
  artifacts: []
  missing: []
  debug_session: ".planning/debug/threat-actor-enrichment-fail.md"
- truth: "Relationships tab shows D3 force-directed graph with actor as center node"
  status: failed
  reason: "User reported: getting this Failed to load enrichment data"
  severity: major
  test: 6
  root_cause: "Same as test 1 — single enrichment API failure affects all tabs"
  artifacts: []
  missing: []
  debug_session: ".planning/debug/threat-actor-enrichment-fail.md"
- truth: "Enrichment tabs show skeleton loading animations while data is fetching"
  status: failed
  reason: "User reported: it opening directly i cannot see any skeleton"
  severity: minor
  test: 7
  root_cause: "Skeletons exist in code but API fails so fast that loading state is never visible — fixing the API error will resolve this"
  artifacts:
    - path: "frontend/src/pages/ThreatActorsPage.jsx"
      issue: "Skeletons at lines 704-816 render only when enrichLoading && !enrichError — error arrives instantly"
  missing:
    - "No code change needed — will resolve when enrichment API works correctly"
  debug_session: ".planning/debug/threat-actor-enrichment-fail.md"
