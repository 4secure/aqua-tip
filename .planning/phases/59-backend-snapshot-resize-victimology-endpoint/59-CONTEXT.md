# Phase 59: Backend Snapshot Resize + Victimology Endpoint - Context

**Gathered:** 2026-04-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Backend-only phase delivering two independent API extensions:

1. **Snapshot resize** — `GET /api/threat-map/snapshot` accepts a `?limit` param (100/500/1000/2000) and returns up to that many events with per-limit cache isolation. Defaults to 100 on invalid/missing.
2. **Victimology enrichment** — `GET /api/threat-actors/{id}/enrichment` response gains a `victimology` key with four sub-arrays (`countries`, `regions`, `sectors`, `organizations`). Consolidated single GraphQL block using `toTypes: ["Country","Region","Sector","Identity"]`, normalized in PHP.

No frontend work in this phase. Phase 61 consumes the resized snapshot; Phase 64 consumes victimology.

</domain>

<decisions>
## Implementation Decisions

### Snapshot Endpoint (MAPBUF-06)
- **D-01:** Validate `?limit` as a **whitelist** — only `100`, `500`, `1000`, `2000` are accepted (matches MAPCFG-01 frontend dropdown presets). Any other value (non-numeric, out-of-range, missing) silently defaults to `100`. No 422, no error.
- **D-02:** Cache key pattern is **semantic**: `threat_map:snapshot:{limit}` (e.g. `threat_map:snapshot:500`). Four discrete cache entries maximum, each 15-min TTL, no cross-contamination. Easy to flush per-size via `artisan cache:forget threat_map:snapshot:500` during debugging.
- **D-03:** `ThreatMapService::getSnapshot()` signature changes to `getSnapshot(int $limit = 100): array`. Existing callers (if any) keep working via default. Controller reads `request()->integer('limit')`, validates against whitelist, passes to service.
- **D-04:** GraphQL `first: $limit` is parameterized (currently hardcoded `first: 100`). Snapshot fetch still orders `created_at desc` with no time filter (matches current behavior).
- **D-05:** Country counter aggregation (`countries`, `types`, `countryCounts` in controller response) runs over the full resized event array — counts reflect the active buffer size, not last-100.

### Victimology Enrichment (VICTM-09)
- **D-06:** Consolidate the 4 victimology sub-queries into a **single** `stixCoreRelationships` block in the enrichment GraphQL with `relationship_type: "targets"` and `toTypes: ["Country", "Region", "Sector", "Identity"]`. PITFALL-13 requires this to avoid N+1 enrichment timeout.
- **D-07:** PHP normalizer splits the consolidated edges by `entity_type` on the `to` node. Use concrete type fragments in GraphQL (`... on Country`, `... on Region`, `... on Sector`, `... on Organization`) to pull the fields needed per type. Organization is a sub-type of Identity in OpenCTI — filter in normalizer by `entity_type === 'Organization'`. PITFALL-12.
- **D-08:** **GraphiQL verification step is mandatory before coding.** Before writing the GraphQL query, connect to `http://192.168.251.20:8080/graphql` (OpenCTI GraphiQL) and confirm:
  - `toTypes: ["Identity"]` returns Organizations when filtered
  - The `Organization` concrete type fragment resolves fields cleanly (STIX type is `Identity`; `entity_type` distinguishes `Organization` from `Individual`/`System`)
  - A representative actor (e.g. APT28) returns non-empty data for at least one of countries/regions/sectors/organizations
  Document the verified query shape as a code comment above the GraphQL heredoc.
- **D-09:** Victimology item shape is **objects**, not strings:
  - `countries: [{id, name, country_code}]` — `country_code` is ISO-2 (e.g. `"US"`). Extract from OpenCTI Country `x_opencti_aliases` or an equivalent field; fall back to `null` when unavailable. Phase 64 VICTM-03 needs this for flag icons.
  - `regions: [{id, name}]`
  - `sectors: [{id, name}]`
  - `organizations: [{id, name}]`
  This matches the existing enrichment block conventions (`tools`, `malware` are already `{id, name}`).
- **D-10:** Graceful degradation on victimology failure. If the consolidated sub-query throws (e.g. OpenCTI partial outage, malformed fragment), the normalizer catches the error, logs it (`Log::warning('Victimology sub-query failed', ['actor_id' => $id, 'error' => ...])`), and returns `victimology: {countries:[], regions:[], sectors:[], organizations:[]}` — the rest of the enrichment payload (ttps/tools/malware/campaigns/relationships) continues to return. Matches SC3 (empty arrays without 500).
- **D-11:** Caching unchanged: `threat_actor_enrichment:{id}` key, 15-min TTL. Victimology data cached alongside the rest of the enrichment payload. A failed victimology fetch is **not** cached — on next request, retry naturally (cache the full successful payload only).
- **D-12:** The existing `campaigns` sub-query stays in the enrichment response. VICTM-01 (remove Campaigns tab) is a frontend-only change in Phase 64. Backend keeps serving `campaigns` for revert safety and for any future frontend that wants it.

### Deduplication (normalizer)
- **D-13:** Normalizer uses `array_unique` on `id` per sub-array to prevent duplicates when OpenCTI returns overlapping relationships (e.g., two `targets` edges to the same Country).

### Test Coverage
- **D-14:** Write Pest feature tests in existing directories:
  - `backend/tests/Feature/ThreatMap/SnapshotTest.php` — cover success criteria 1, 4 (whitelist validation, cache isolation, default fallback)
  - `backend/tests/Feature/ThreatActor/EnrichmentTest.php` (new file) — cover SC2, SC3 (victimology shape, empty-state, graceful failure)
- **D-15:** Mock `OpenCtiService::query()` via `Http::fake()` or service binding; do not hit live OpenCTI in tests.

### Claude's Discretion
- Exact field on OpenCTI Country for ISO-2 country code (likely `x_opencti_aliases` or a direct code field) — planner resolves this during the mandatory GraphiQL verification step (D-08).
- Specific validation helper location (inline in controller vs. small `FormRequest`) — planner picks the lighter option consistent with existing backend controllers.
- Exact Log level (`warning` vs. `error`) for partial victimology failure — planner picks based on existing Log conventions in `ThreatActorService`.
- Pest test assertion granularity — planner matches existing `ThreatActorIndexTest.php` style.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap + Requirements
- `.planning/ROADMAP.md` §Phase 59 — Success criteria SC1–SC5
- `.planning/ROADMAP.md` §Key Architectural Notes — PITFALL-12 and PITFALL-13
- `.planning/REQUIREMENTS.md` §MAPBUF (MAPBUF-06) and §VICTM (VICTM-09)
- `.planning/PROJECT.md` §Key Decisions — cache patterns, OpenCTI proxy rule

### Backend Code (existing, modify these)
- `backend/app/Services/ThreatMapService.php` — `getSnapshot()` (line 211), `fetchSnapshot()` (line 383). Hardcoded `first: 100` becomes parameterized.
- `backend/app/Services/ThreatActorService.php` — `enrichment()` (line 247), `executeEnrichmentQuery()` (line 261), `normalizeEnrichmentResponse()` (line 432). Add victimology sub-query block + `normalizeVictimology()` method.
- `backend/app/Http/Controllers/ThreatMap/SnapshotController.php` — add `?limit` param handling, pass to service.
- `backend/app/Http/Controllers/ThreatActor/EnrichmentController.php` — unchanged; response shape change handled in service.
- `backend/routes/api.php` §105–106 — public snapshot route confirmation.

### Tests (existing patterns, mirror these)
- `backend/tests/Feature/ThreatMap/SnapshotTest.php` — existing assertion style for snapshot response.
- `backend/tests/Feature/ThreatActor/ThreatActorIndexTest.php` — existing Pest feature test style with HTTP fake.

### External: OpenCTI GraphiQL (mandatory verification)
- `http://192.168.251.20:8080/graphql` — D-08 requires live query verification before coding the victimology GraphQL. Document the verified query as a code comment above the heredoc.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `OpenCtiService::query()` — GraphQL proxy with Bearer token auth (existing). No changes needed; both endpoints already use it.
- `Cache::remember(key, ttl, closure)` pattern — used in `ThreatMapService::getSnapshot()` and `ThreatActorService::enrichment()`. Directly reusable for both new cache keys.
- `OpenCtiConnectionException` / `OpenCtiQueryException` — existing exception types. `SnapshotController` and `EnrichmentController` already catch these and return 502.
- `array_unique` + `array_filter` + `array_map` chain — established normalizer pattern in `ThreatActorService::flattenRelationshipTargets()` (line 213).

### Established Patterns
- Cache-per-param-combo: `ThreatActorService::list()` uses `md5(json_encode(func_get_args()))`. We **diverge** here (D-02) because a single int param doesn't need hashing — semantic keys are clearer. Do not hash the snapshot cache key.
- GraphQL heredoc with concrete type fragments: `ThreatActorService::executeEnrichmentQuery()` already uses `... on Country`, `... on Identity`, etc. Reuse this pattern for victimology.
- Normalizer → `normalize*()` private methods per sub-section: proven pattern in `normalizeEnrichmentResponse()`. Add `normalizeVictimology()` following the same shape.
- Public snapshot route (no auth) vs. authenticated threat-actors route — `SnapshotController` stays public; `EnrichmentController` stays inside feature-gate group. No auth changes in this phase.

### Integration Points
- Snapshot controller aggregates `countries`, `types`, `countryCounts` in controller (not service) — this aggregation runs over the service-returned event array, so it automatically respects the new `limit` with no controller-side math change beyond passing the limit through.
- Enrichment response is wrapped in `{data: ...}` envelope — adding `victimology` becomes `data.victimology`, consistent with existing `data.ttps` / `data.tools` / etc.

</code_context>

<specifics>
## Specific Ideas

- PITFALL-13 (roadmap) is not optional — the planner must produce a **single consolidated** GraphQL sub-query for victimology, not 4 aliased blocks. Re-verify this constraint during planning.
- PITFALL-12 (roadmap) requires live GraphiQL verification at `192.168.251.20` before writing the GraphQL query. Document the verified `toTypes` shape in a code comment for traceability.
- Cache flushing during dev: `php artisan tinker` → `Cache::forget('threat_map:snapshot:500')` — works cleanly because D-02 uses semantic keys.
- Free plan users: snapshot is public (no feature gate), enrichment is inside feature-gate group (existing state, unchanged).

</specifics>

<deferred>
## Deferred Ideas

None surfaced during discussion — scope stayed tight to backend endpoints. Related future capabilities already deferred in REQUIREMENTS.md §Future Requirements:
- MAP-INTERACT (victimology heatmap) — Phase 64 list view is sufficient
- CAMP-GRAPH (campaign→actor navigation) — not needed for v6.1
- MAP-EXPORT (CSV/JSON export) — out of scope

</deferred>

---

*Phase: 59-backend-snapshot-resize-victimology-endpoint*
*Context gathered: 2026-04-17*
