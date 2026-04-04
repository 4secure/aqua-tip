---
status: diagnosed
trigger: "Investigate why the threat actor enrichment API call fails with 'Failed to load enrichment data'"
created: 2026-04-04T00:00:00Z
updated: 2026-04-04T00:00:00Z
---

## Current Focus

hypothesis: EnrichmentController only catches OpenCtiConnectionException but not OpenCtiQueryException — GraphQL errors bubble up as unhandled 500s
test: Trace exception flow from OpenCtiService through EnrichmentController
expecting: Unhandled OpenCtiQueryException causes Laravel 500 with HTML/generic error
next_action: return diagnosis

## Symptoms

expected: Clicking a threat actor card opens modal, enrichment tabs (TTPs, Tools, Campaigns, Relationships) load data with skeleton placeholders during fetch
actual: All enrichment tabs show "Failed to load enrichment data" immediately; user reports no skeleton visible
errors: "Failed to load enrichment data" in frontend modal
reproduction: Open any threat actor modal, switch to any enrichment tab
started: Unknown — may have always been broken if OpenCTI returns GraphQL errors

## Eliminated

(none needed — root cause found on first hypothesis)

## Evidence

- timestamp: 2026-04-04T00:00:00Z
  checked: EnrichmentController.php exception handling (line 21)
  found: Only catches OpenCtiConnectionException. OpenCtiQueryException (thrown on GraphQL errors at OpenCtiService.php line 62-63) is NOT caught.
  implication: Any GraphQL-level error (wrong field, permission denied, etc.) results in an unhandled exception -> Laravel 500 response

- timestamp: 2026-04-04T00:00:00Z
  checked: Frontend error handling in ThreatActorModal (line 491-493)
  found: apiClient throws on non-ok responses (client.js line 40-48) with message from body.message. On a 500, Laravel may return HTML or a generic error. The catch fallback is 'Failed to load enrichment data'.
  implication: The generic error message is the fallback in the frontend catch clause

- timestamp: 2026-04-04T00:00:00Z
  checked: Skeleton loading state implementation in modal tabs (lines 704-713, 747-752, 780-785, 815-816)
  found: Skeleton states ARE implemented for all four enrichment tabs (TTPs, Tools, Campaigns, Relationships). They render when enrichLoading is true AND enrichError is falsy.
  implication: Skeletons exist but are never visible because the error condition at line 588 takes precedence — the error appears so fast (immediate 500) that the loading state is barely perceptible

- timestamp: 2026-04-04T00:00:00Z
  checked: Tab content rendering logic for enrichment tabs
  found: Each tab (lines 702, 745, 778, 813) has condition `activeTab === 'xxx' && !enrichError`. When enrichError is set, the error block at line 588 renders instead. The skeleton inside the tab block requires BOTH enrichLoading=true AND !enrichError.
  implication: The skeleton and tab content are mutually exclusive with the error state — this is correct design, but the error fires so quickly that skeletons never appear

- timestamp: 2026-04-04T00:00:00Z
  checked: Route registration for enrichment endpoint (api.php line 68)
  found: Route is correctly registered as GET /threat-actors/{id}/enrichment inside auth:sanctum middleware group
  implication: Route is fine — not a routing issue

- timestamp: 2026-04-04T00:00:00Z
  checked: Frontend API function (threat-actors.js line 15-17)
  found: URL is `/api/threat-actors/${encodeURIComponent(id)}/enrichment` — matches backend route
  implication: URL construction is correct

- timestamp: 2026-04-04T00:00:00Z
  checked: API client auth mechanism (client.js lines 17-19, 25)
  found: Uses XSRF-TOKEN cookie + credentials:include (Sanctum SPA auth). Same pattern as fetchThreatActors which works.
  implication: Auth is not the issue — same mechanism works for the list endpoint

## Resolution

root_cause: |
  PRIMARY: EnrichmentController (line 21) only catches `OpenCtiConnectionException` but NOT `OpenCtiQueryException`.
  The OpenCtiService.query() method (line 60-63) throws `OpenCtiQueryException` when the GraphQL response contains errors.
  This means any GraphQL-level error (bad query, permission issue, field mismatch) results in an unhandled exception,
  which Laravel converts to a 500 response. The frontend catch clause at ThreatActorModal line 493 then shows
  "Failed to load enrichment data" as its fallback message.

  SECONDARY (skeleton visibility): The skeleton loading states ARE implemented in the code (lines 704-713, 747-752, 780-785, 815-816).
  They are not visible because the API error returns so quickly (~instant 500) that the loading state is imperceptible.
  Once the primary issue is fixed (API returns data successfully), skeletons will be visible during normal loading times.

fix: (not yet applied)
verification: (not yet verified)
files_changed: []
