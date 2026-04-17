---
status: partial
phase: 59-backend-snapshot-resize-victimology-endpoint
source: [59-VERIFICATION.md]
started: 2026-04-17T00:00:00Z
updated: 2026-04-17T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. OpenCTI GraphiQL Verification A — Identity sub-type discrimination
expected: entity_type literals for identities are exactly 'Organization', 'Individual', 'System'; PHP `match` arms in normalizeVictimology use these exact strings
result: [pending]

### 2. OpenCTI GraphiQL Verification B — toTypes: ["Identity"] filter behavior
expected: Running `stixCoreRelationships(relationship_type: "targets", toTypes: ["Identity"])` on APT28 returns mix of Organization/Individual/System entities; PHP filter retains only Organization
result: [pending]

### 3. OpenCTI GraphiQL Verification C — Country ISO-2 source field
expected: `Country.x_opencti_aliases` actually carries ISO-2 codes (e.g. 'US') for representative countries; OR a direct scalar (code/country_code) exists on Country and should be used instead
result: [pending]

### 4. OpenCTI GraphiQL Verification D — consolidated toTypes multi-type query
expected: `victimology: stixCoreRelationships(toTypes: ["Country", "Region", "Sector", "Identity"], first: 200)` runs without validation errors and returns non-empty buckets on representative actor (e.g., APT28) within 5s
result: [pending]

### 5. End-to-end enrichment against live OpenCTI
expected: `php artisan tinker` → `app(\App\Services\ThreatActorService::class)->enrichment('<real-apt28-id>')` returns array with `victimology` key populated with at least one non-empty sub-array
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
