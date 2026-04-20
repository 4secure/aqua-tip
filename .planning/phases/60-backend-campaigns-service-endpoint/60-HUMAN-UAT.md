---
status: resolved
phase: 60-backend-campaigns-service-endpoint
source: [60-VERIFICATION.md]
started: "2026-04-19T05:18:55Z"
updated: "2026-04-20T03:55:00Z"
---

## Current Test

[all items passed]

## Tests

### 1. Live endpoint smoke test (cache-hit timing + envelope shape)
expected: `GET /api/threat-campaigns` returns HTTP 200 with a `{data: {items, pagination}}` envelope. Second call within 15 minutes should be visibly faster due to cache hit.
result: **passed 2026-04-20** — executed locally (`php artisan serve` + Sanctum token for a fresh trial user). Call 1 (cold, cache flushed): HTTP 200, 1.420s, 45,599 bytes. Call 2 (warm): HTTP 200, 0.453s, 45,599 bytes. Ratio 31.9% — cache saves ~970ms on skipped OpenCTI GraphQL round-trip. Envelope confirmed: top keys `data`; data keys `items, pagination`; pagination has all 5 keys (`has_next, has_previous, start_cursor, end_cursor, total`) with `total: 52`, `has_next: true`, `has_previous: false`. Earlier smoke also surfaced a real bug in the GraphQL heredoc (`objectLabel` was queried as a Connection but OpenCTI returns it as a direct `[Label!]` list) — fixed in commit `ebbd1e8`.

### 2. Real-data attribution shape against non-empty OpenCTI dataset
expected: At least one item has `attributed_to` populated with `{id, name}` objects pointing to Intrusion Set entities.
result: **passed 2026-04-20** — against the live OpenCTI instance (52 Campaigns total), **11/24** items on the first page have non-empty `attributed_to` arrays. Shape correct: array of `{id, name}`. Real samples verified: `C0033` → StrongPity; `SPACEHOP Activity` → [GREF, APT5] (confirms multi-attribution + D-20 dedupe works against real data); `KV Botnet Activity` → Volt Typhoon; `Triton Safety Instrumented System Attack` → TEMP.Veles; `3CX Supply Chain Attack` → Citrine Sleet. Earlier blocker was a token access restriction — the original `api_readonly` token belonged to a group that did not have Campaign entity-type visibility; updating `OPENCTI_TOKEN` in `backend/.env` to an admin-scope token resolved visibility without any code change.

## Summary

total: 2
passed: 2
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

None. All human-verification items pass against real data.

## Operational Note — Token Scope

For production use, the `OPENCTI_TOKEN` configured in `backend/.env` must belong to a user whose group has **Campaign** in its allowed entity types. An API token from a group that restricts Campaign visibility will silently return `globalCount: 0` (no 403, no error) — the code runs cleanly but returns an empty list. Recommend creating a dedicated service account in OpenCTI with the minimum necessary entity-type access (Campaign + Intrusion-Set for `attributed_to` resolution) rather than using the `api_readonly` group's token.
