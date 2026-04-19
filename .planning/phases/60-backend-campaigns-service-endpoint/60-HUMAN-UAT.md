---
status: partial
phase: 60-backend-campaigns-service-endpoint
source: [60-VERIFICATION.md]
started: "2026-04-19T05:18:55Z"
updated: "2026-04-19T06:05:00Z"
---

## Current Test

[attributed_to population blocked on dataset availability]

## Tests

### 1. Live endpoint smoke test (cache-hit timing + envelope shape)
expected: `GET /api/threat-campaigns` returns HTTP 200 with a `{data: {items, pagination}}` envelope. Second call within 15 minutes should be visibly faster due to cache hit.
result: **passed 2026-04-19** — executed locally (`php artisan serve` + Sanctum token for a fresh trial user). Call 1 (cold, cache flushed): HTTP 200, 1.44s, 118 bytes. Call 2 (warm): HTTP 200, 0.81s, 118 bytes. Ratio 56.5% — cache saves ~600ms on skipped OpenCTI GraphQL round-trip. Envelope confirmed: top keys `data`; data keys `items, pagination`; pagination has all 5 keys (`has_next, has_previous, start_cursor, end_cursor, total`). Smoke test also surfaced a real bug in the GraphQL heredoc (`objectLabel` was queried as a Connection but OpenCTI returns it as a direct `[Label!]` list) — fixed in commit `ebbd1e8`, tests re-run green.

### 2. Real-data attribution shape against non-empty OpenCTI dataset
expected: At least one item has `attributed_to` populated with `{id, name}` objects pointing to Intrusion Set entities.
result: **blocked 2026-04-19** — live OpenCTI at `14.192.146.4:9731` returned 0 Campaign items (empty dataset, consistent with 60-02 cross-endpoint observation). The code path executed end-to-end without error (proves the `... on IntrusionSet` union fragment parses correctly against the live schema), but populated attribution cannot be verified until the OpenCTI instance has Campaign data with `attributed-to` relationships. Re-test when the dataset is populated or when targeting a different OpenCTI instance.

## Summary

total: 2
passed: 1
issues: 0
pending: 0
skipped: 0
blocked: 1

## Gaps

None blocking. Item 2 is dataset-dependent — no code defect.
