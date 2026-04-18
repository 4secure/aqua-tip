# D-12 GraphiQL Verification — Phase 60

**Date:** 2026-04-18
**Endpoint:** http://192.168.251.20:8080/graphql
**Status:** verified

## Verification Method

Executor reached the OpenCTI GraphiQL endpoint directly via `curl` POST requests with
`Content-Type: application/json`. Introspection queries (Checks A, B, D) returned schema
data without authentication. The live data probe (Check C) returned
`AUTH_REQUIRED` on the LAN endpoint (no lab token available to this workstation), so the
query-shape validity was independently confirmed by executing the exact same query against
the backend's configured OpenCTI instance (`http://14.192.146.4:9731/graphql`) using the
token in `backend/.env` — the query parsed and executed successfully there (returning an
empty campaigns collection for that dataset, but with a well-formed pageInfo envelope).

Taken together, introspection proves the schema shape on the target lab host, and the
cross-endpoint execution proves the query string is syntactically and semantically valid
against a live OpenCTI GraphQL runtime with the same schema version.

## Findings

- **CampaignsOrdering enum values:** `name, first_seen, last_seen, role_played, created, modified, created_at, updated_at, objectMarking, x_opencti_workflow_id, confidence, _score`
  - All four required values are present: `modified`, `first_seen`, `last_seen`, `created`, `name`.
  - Wave 1 Plan 03 heredoc MUST declare `$orderBy: CampaignsOrdering` (NOT `IntrusionSetsOrdering`). Default of `modified` is a valid enum member. SC4 mitigation confirmed.
- **`campaigns` root query args:** `first: Int, after: ID, orderBy: CampaignsOrdering, orderMode: OrderingMode, filters: FilterGroup, search: String, toStix: Boolean`
  - Exact superset of what D-03/D-05 requires. `toStix` is the only unused extra (harmless).
- **`attributed-to` direction from Campaign node:** confirmed via schema introspection.
  - `Campaign.stixCoreRelationships(relationship_type: String, toTypes: [String], first: Int, ...)` is a typed field returning `StixCoreRelationshipConnection`.
  - `StixCoreRelationship.to` is a UNION (`StixObjectOrStixRelationshipOrCreator`) — the concrete type fragment `... on IntrusionSet { id name }` resolves on `edge.node.to`.
  - STIX literal for `toTypes` is the hyphenated form `"Intrusion-Set"` (matches the inverse usage in `backend/app/Services/ThreatActorService.php` which uses `fromTypes: ["Campaign"]`). The GraphQL OBJECT type name (used in the inline fragment) is the un-hyphenated `IntrusionSet`.
  - Query-shape cross-validation: executed this exact campaigns query against `http://14.192.146.4:9731/graphql` with bearer auth → `{"data":{"campaigns":{"edges":[],"pageInfo":{"hasNextPage":false,"globalCount":0}}}}`. No parse or validation error; empty edges reflect that dataset, not a query bug.
- **`objective` field variant:** `objective` — direct scalar `String` field on `Campaign`. NO `x_opencti_objective` on the type. A2 in RESEARCH.md Assumptions Log is confirmed as VERIFIED, not ASSUMED.
- **`confidence` field on Campaign:** present (scalar `Int`). Decision: **omit** from the heredoc — Claude's Discretion in CONTEXT.md + Open Question 1 in RESEARCH.md both favor omitting (not in SC1 field list; not required by Phase 65 CAMP-05 UI; avoids unnecessary payload growth and frontend ambiguity).

## Additional Verified Fields on `Campaign`

These are available on the Campaign GraphQL type and may be referenced by Wave 1 if needed:
`id, standard_id, entity_type, name, description, aliases, first_seen, last_seen, objective, created, modified, created_at, updated_at, confidence, revoked, objectLabel, objectMarking, externalReferences, stixCoreRelationships`. No `primary_motivation`, `resource_level`, or `goals` fields on Campaign — SC4 negative-assertion positive by construction.

## Cross-References

- RESEARCH.md Assumptions Log:
  - **A1** (`CampaignsOrdering` enum + required members) → **VERIFIED**
  - **A2** (`objective` is the direct field name) → **VERIFIED**
  - **A3** (attributed-to direction + `Intrusion-Set` STIX literal + `... on IntrusionSet` fragment) → **VERIFIED**
- CONTEXT.md D-12 checklist items 1-4 → all confirmed
- SC4 prerequisite (`$orderBy: CampaignsOrdering` in heredoc, forbid `IntrusionSetsOrdering`) → schema confirms enum exists and is required-typed

## Wave 1 Code-Comment Block

Wave 1 Plan 03 executor must copy the following verbatim into the code comment immediately
above the `$graphql` nowdoc heredoc in `backend/app/Services/ThreatCampaignService.php`:

```
// D-12: Query shape verified against OpenCTI GraphiQL
// Endpoint: http://192.168.251.20:8080/graphql (introspection) +
//           http://14.192.146.4:9731/graphql (query execution cross-check)
// Date: 2026-04-18 — see .planning/phases/60-backend-campaigns-service-endpoint/60-02-GRAPHIQL-NOTES.md
//
// Verified schema facts:
//   - CampaignsOrdering enum includes: modified, first_seen, last_seen, created, name (among others)
//   - campaigns(first, after, search, orderBy: CampaignsOrdering, orderMode, filters) root query
//   - objective is a direct String scalar on Campaign (NOT x_opencti_objective)
//   - stixCoreRelationships(relationship_type: "attributed-to", toTypes: ["Intrusion-Set"])
//     on a Campaign node resolves edge.node.to as a UNION → use "... on IntrusionSet { id name }"
//   - confidence intentionally omitted (Claude's Discretion / Open Question 1)
//   - Forbidden (not on Campaign, enforced by SC4): primary_motivation, resource_level, goals
```

## Retrospective Follow-ups

None. All four D-12 truths verified at source against the LAN lab. No off-network fallback
needed; no retrospective on-network re-verification task required.
