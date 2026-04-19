---
status: partial
phase: 60-backend-campaigns-service-endpoint
source: [60-VERIFICATION.md]
started: "2026-04-19T05:18:55Z"
updated: "2026-04-19T05:18:55Z"
---

## Current Test

[awaiting human testing]

## Tests

### 1. Live endpoint smoke test (cache-hit timing + envelope shape)
expected: `curl -H "Authorization: Bearer <token>" http://localhost:8000/api/threat-campaigns` (or https://api.tip.aquasecure.ai/api/threat-campaigns on Railway) returns HTTP 200 with a `{data: {items, pagination}}` envelope. Running the same curl a second time within 15 minutes should be visibly faster (cache hit — response time should drop by at least an order of magnitude since the GraphQL round-trip to OpenCTI is skipped on the second call).
result: [pending]

### 2. Real-data attribution shape against non-empty OpenCTI dataset
expected: At least one item in the response has `attributed_to` populated with a non-empty array of `{id, name}` objects pointing to Intrusion Set entities. The D-12 cross-endpoint check during Plan 60-02 returned empty edges (dataset-dependent); a live production smoke confirms the Campaign→IntrusionSet UNION fragment resolves correctly against real data.
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
