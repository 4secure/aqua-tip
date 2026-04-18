# Phase 60: Backend Campaigns Service & Endpoint - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Backend-only phase delivering a new, standalone OpenCTI Campaigns surface:

1. **`ThreatCampaignService`** — new class under `backend/app/Services/`. **Must be standalone** — NOT a subclass, wrapper, or refactor of `ThreatActorService` (PITFALL-09). Campaign STIX fields differ: `first_seen`, `last_seen`, `objective` (no `aliases/primary_motivation/resource_level`/`goals` semantics shared with IntrusionSet).
2. **`GET /api/threat-campaigns`** — new route inside the existing `feature-gate` middleware group in `backend/routes/api.php`. Returns a paginated, normalized list of OpenCTI Campaign entities, 15-min server-side cached.
3. **Feature tests** — new directory `backend/tests/Feature/ThreatCampaign/` mirroring the existing `tests/Feature/ThreatActor/` structure.

No frontend work. Phase 65 consumes this endpoint.

</domain>

<decisions>
## Implementation Decisions

### Service Structure (CAMP-07)
- **D-01:** `ThreatCampaignService` is a **standalone** class in `backend/app/Services/ThreatCampaignService.php`. Depends only on `OpenCtiService` via constructor injection (same DI pattern as `ThreatActorService`). Does NOT extend, copy, or import methods from `ThreatActorService` — PITFALL-09 is non-negotiable.
- **D-02:** Public `list()` signature mirrors `ThreatActorService::list()` parity, minus `motivation`:
  `list(int $first = 24, ?string $after = null, ?string $search = null, string $orderBy = 'modified', string $orderMode = 'desc'): array`
  Returns `['items' => [...], 'pagination' => [...]]`.

### Query Parameters (Controller Contract)
- **D-03:** Controller accepts parity with `GET /api/threat-actors`: `after` (cursor), `search` (full-text via GraphQL `search`), `sort` (mapped to `orderBy`), `order` (mapped to `orderMode`). No `motivation` filter (Campaigns don't have that STIX field).
- **D-04:** Defaults: `sort = modified`, `order = desc`, `first = 24` — matches `ThreatActorService::list()` conventions so Phase 65 grid layout can mirror threat-actors behavior without divergent UX.
- **D-05:** GraphQL variable typing uses the **`CampaignsOrdering`** enum — NOT `IntrusionSetsOrdering`. Success criterion SC4 explicitly forbids the wrong enum.

### Field Selection (GraphQL `campaigns` query)
- **D-06:** Node fields returned per campaign (locked 7 + extras chosen during discussion):
  - `id`, `name`, `description`
  - `first_seen`, `last_seen`
  - `objective`
  - `aliases` (array)
  - `modified`, `created` (ISO timestamps — enables `useFormatDate` on frontend)
  - `objectLabel { edges { node { id value color } } }` (STIX labels)
  - `externalReferences { edges { node { source_name url description } } }`
  - `attributed_to` via `stixCoreRelationships(relationship_type: "attributed-to", toTypes: ["Intrusion-Set"], first: 10)` — returns `... on IntrusionSet { id name }`.
- **D-07:** The list response is rich enough to also back Phase 65's detail modal (CAMP-06) without a separate detail endpoint. Decision: **one endpoint, one cached payload**. No `GET /api/threat-campaigns/{id}` in this phase. If a future phase needs heavier campaign data (e.g., victim graphs, per-campaign TTPs), it adds its own enrichment endpoint — do not retroactively bloat this list response.
- **D-08:** Strictly **exclude** IntrusionSet-only fields from GraphQL selection: no `primary_motivation`, no `resource_level`, no `goals`. SC4 + PITFALL-09. The field selection must fail at GraphQL parse time on the OpenCTI side if someone accidentally pastes an IntrusionSet field.

### Attribution Shape (CAMP-05 forward compat)
- **D-09:** `attributed_to` is normalized to **an array of `{id, name}` objects**, not a single object or flat string. OpenCTI permits multiple `attributed-to` edges per campaign (rare but possible — e.g., joint APT operations). Phase 65 renders the first entry as the chip and can extend to multiple chips later without a backend change.
- **D-10:** Relationship direction: query **from Campaign → IntrusionSet**, i.e., `stixCoreRelationships(relationship_type: "attributed-to", toTypes: ["Intrusion-Set"])` on the campaign node, extract `edge.node.to { ... on IntrusionSet { id name } }`. This is the inverse of `ThreatActorService::normalizeCampaigns()` (which queries from the intrusion set using `fromTypes: ["Campaign"]`) — deliberately different, because we're querying from the campaign side here.
- **D-11:** If a campaign has zero `attributed-to` edges, `attributed_to` returns `[]` (empty array), not `null`. Frontend CAMP-05 renders no chip in that case.

### GraphiQL Verification (PITFALL-09 + PITFALL-12 discipline)
- **D-12:** **Mandatory live GraphiQL verification at `http://192.168.251.20:8080/graphql` before writing the query.** Planner must confirm:
  1. `CampaignsOrdering` enum values include `modified`, `first_seen`, `last_seen` (at minimum).
  2. `campaigns` root query exists with arguments `(first, after, search, orderBy: CampaignsOrdering, orderMode, filters)`.
  3. `stixCoreRelationships(relationship_type: "attributed-to", toTypes: ["Intrusion-Set"])` on a Campaign node returns non-empty edges for at least one representative campaign (e.g., search Campaigns for known named operations like "Solorigate" or any returned by `campaigns(first: 5)`).
  4. Concrete type fragment `... on IntrusionSet { id name }` resolves inside `edge.node.to`.
  Document the verified query shape as a code comment above the GraphQL heredoc in `ThreatCampaignService.php`, same convention as Phase 59's victimology query comment.

### Caching (CAMP-08)
- **D-13:** Cache key pattern **mirrors `ThreatActorService::list()`**: `'threat_campaigns:' . md5(json_encode(func_get_args()))`. This keeps per-param-combo isolation (search + sort + cursor + orderBy + orderMode) without semantic key design work. 15-minute TTL via `now()->addMinutes(15)`.
- **D-14:** SC2 is verified in tests by calling the endpoint twice with identical params and asserting `Cache::has('threat_campaigns:...')` is true after call 1 — matches existing Pest test patterns.

### Route + Middleware (SC3)
- **D-15:** Route definition added inside the existing `Route::middleware('feature-gate')->group(...)` block in `backend/routes/api.php` (currently wraps threat-actors, threat-news, threat-map stream, dashboard stats). Registered as:
  `Route::get('/threat-campaigns', ThreatCampaignIndexController::class);`
- **D-16:** Controller class: `App\Http\Controllers\ThreatCampaign\IndexController` — new namespace `ThreatCampaign`, new directory `backend/app/Http/Controllers/ThreatCampaign/`. `__invoke(Request $request)` reads `after`, `search`, `sort`, `order`, calls the service, catches `OpenCtiConnectionException` → 502 with message `"Unable to load campaigns. Please try again."` (matches `ThreatActorIndexController` style).
- **D-17:** No additional middleware (no `deduct-credit`, no throttle beyond the global `auth:sanctum`). Browsing campaigns does not consume credits, consistent with threat-actors.

### Normalization
- **D-18:** `normalizeResponse()` is a **private method on `ThreatCampaignService`** — copy the shape of `ThreatActorService::normalizeResponse()` but do not import or call it. Extract:
  - `items`: array mapped from edges.
  - `pagination`: `{has_next, has_previous, start_cursor, end_cursor, total}` from `pageInfo` (`hasNextPage`, `hasPreviousPage`, `startCursor`, `endCursor`, `globalCount`) — same keys Phase 65 expects.
- **D-19:** Per-campaign item shape:
  ```
  {
    id, name, description, objective,
    aliases: [...],
    first_seen, last_seen, modified, created,
    labels: [{id, value, color}],       // from objectLabel.edges
    external_references: [{source_name, url, description}],
    attributed_to: [{id, name}]          // from stixCoreRelationships.edges where to is IntrusionSet
  }
  ```
- **D-20:** Deduplicate `attributed_to` by `id` (`array_unique` on id extraction) — OpenCTI can return duplicate edges when multiple relationship objects point to the same intrusion set.

### Test Coverage
- **D-21:** New test file: `backend/tests/Feature/ThreatCampaign/IndexTest.php`. Mirrors `ThreatActorIndexTest.php` style:
  - Mock `OpenCtiService::query()` via `app()->bind(OpenCtiService::class, ...)` + `Mockery::mock()`.
  - Fake fixture helper `fakeCampaignsResponse(int $count = 2)` in the same file (matches `fakeIntrusionSetsResponse` pattern).
  - Cover SC1 (shape + all fields), SC2 (cache hit on second call), SC3 (403 for free plan, 200 for paid), SC4 (no IntrusionSet-only fields bleed — assert absence of `primary_motivation`, `resource_level`, `goals` keys).
- **D-22:** Use `RefreshDatabase` + real `User` + `Plan` seeding for SC3 — same pattern as existing feature-gated tests. Free plan user → 403; Basic+ plan user → 200.

### Claude's Discretion
- Exact OpenCTI field for `objective` — may be `objective` (STIX 2.1 Campaign SDO) or a custom `x_opencti_*` variant. Planner confirms during D-12 GraphiQL verification.
- Whether to include `confidence` field — not in success criteria, add only if zero-cost during GraphiQL verification and the field exists on Campaign.
- Log level if the query returns an unexpected shape — planner picks `warning` vs `error` to match existing Log conventions in `ThreatActorService`.
- Controller `FormRequest` vs inline `$request->query()` — planner picks the lighter option consistent with `ThreatActorIndexController` (currently inline, no FormRequest).
- Pest assertion granularity — planner matches existing `ThreatActorIndexTest.php` style.

### Folded Todos
None — no open todos intersected with this phase's scope.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap + Requirements
- `.planning/ROADMAP.md` §Phase 60 — Goal + success criteria SC1–SC4
- `.planning/ROADMAP.md` §Key Architectural Notes — PITFALL-09 (standalone service)
- `.planning/REQUIREMENTS.md` §CAMP — CAMP-07 (standalone service), CAMP-08 (15-min cache)
- `.planning/PROJECT.md` §Key Decisions — cache patterns, OpenCTI proxy rule, feature-gate enforcement
- `.planning/phases/59-backend-snapshot-resize-victimology-endpoint/59-CONTEXT.md` — reference for GraphiQL verification discipline (D-08 there → D-12 here)

### Backend Code (existing patterns to mirror, NOT modify)
- `backend/app/Services/ThreatActorService.php` — DI pattern, cache key convention (line 37), `list()` signature (lines 29-44), normalizer shape (lines 169-209), flatten helpers (lines 211-235). **Pattern reference only — do not extend or import.**
- `backend/app/Http/Controllers/ThreatActor/IndexController.php` — `__invoke` shape, query param reads, 502 error handling on `OpenCtiConnectionException`. Mirror exactly in new controller.
- `backend/app/Http/Middleware/FeatureGate.php` — confirms the `feature-gate` alias; returns 403 with `error: "upgrade_required"` for free plan users.
- `backend/routes/api.php` lines 65-87 — the `feature-gate` middleware group where `/threat-campaigns` registers.

### Backend Code (new files to create)
- `backend/app/Services/ThreatCampaignService.php` (new)
- `backend/app/Http/Controllers/ThreatCampaign/IndexController.php` (new)
- `backend/tests/Feature/ThreatCampaign/IndexTest.php` (new)

### Tests (existing patterns to mirror)
- `backend/tests/Feature/ThreatActor/ThreatActorIndexTest.php` — fixture helper, service-binding mock, RefreshDatabase + plan seeding. Copy structure.
- `backend/tests/Feature/ThreatActor/EnrichmentTest.php` — feature-gate 403/200 assertion pattern.

### External: OpenCTI GraphiQL (mandatory verification per D-12)
- `http://192.168.251.20:8080/graphql` — verify `CampaignsOrdering` enum values, `campaigns` query args, `attributed-to` relationship direction, concrete `IntrusionSet` fragment inside `edge.node.to`. Document verified shape as a code comment above the heredoc.

### OpenCTI Campaign STIX reference (informational)
- STIX 2.1 Campaign SDO fields: `name`, `description`, `aliases`, `first_seen`, `last_seen`, `objective`. OpenCTI adds `x_opencti_*` extensions — confirm actual available fields via GraphiQL before coding.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `OpenCtiService::query($graphql, $variables)` — GraphQL proxy with Bearer token auth, already handles `OpenCtiConnectionException` / `OpenCtiQueryException`. Inject via constructor, same pattern as `ThreatActorService`.
- `Cache::remember($key, $ttl, $closure)` — direct reuse. 15-minute TTL constant via `now()->addMinutes(15)` matches the codebase idiom.
- `OpenCtiConnectionException` / `OpenCtiQueryException` — existing exception types. Catch the connection exception in the controller, return 502 with user-safe message.
- `array_values(array_unique(array_filter(array_map(...))))` chain — established helper pattern in `ThreatActorService::flattenRelationshipTargets()` (line 214). Reuse shape for normalizing `attributed_to` and `labels`.
- `feature-gate` middleware alias — already registered. Wrapping `/threat-campaigns` in the existing group is a one-line addition.

### Established Patterns
- **Cache key convention:** `'{namespace}:' . md5(json_encode(func_get_args()))` — used by `ThreatActorService::list()`. Use identical approach for `ThreatCampaignService::list()`.
- **Controller shape:** single-action `__invoke(Request $request)` class, reads query params with defaults, calls service, wraps in `{data: ...}` envelope, catches connection exception → 502.
- **Test shape:** Pest feature tests with service-binding mock (`app()->bind(OpenCtiService::class, ...)` + `Mockery::mock(...)` + `shouldReceive('query')->andReturn($fixture)`). `RefreshDatabase` + seeded `User` with specific plan for feature-gate assertions.
- **GraphQL heredoc:** `<<<'GRAPHQL' ... GRAPHQL` with concrete type fragments (`... on IntrusionSet`, `... on Country`). Verified shape documented as a code comment above the heredoc — introduced in Phase 59.
- **Response envelope:** `response()->json(['data' => $serviceResult])` — consistent across threat-actors, threat-news, dashboard.

### Integration Points
- **Route registration:** `backend/routes/api.php` lines 77-86 is the `feature-gate` middleware group. New `Route::get('/threat-campaigns', ThreatCampaignIndexController::class);` slots alongside `/threat-actors`, `/threat-news`, `/threat-map/stream`.
- **Phase 65 consumer contract:** frontend will call `GET /api/threat-campaigns?after=<cursor>&search=<q>&sort=<field>&order=<asc|desc>` and expect `{data: {items: [...], pagination: {...}}}`. Matches `ThreatActorIndexController` envelope precisely so Phase 65 can share the pagination helper pattern from threat-actors.

</code_context>

<specifics>
## Specific Ideas

- PITFALL-09 is **not optional** — planner must instantiate `ThreatCampaignService` as a clean class, never extending, copying methods from, or injecting `ThreatActorService`. Field inheritance mistakes will bleed IntrusionSet-only fields into Campaign responses (SC4 violation).
- Do the GraphiQL verification at `192.168.251.20` (D-12) **before** committing the GraphQL heredoc — same discipline as Phase 59 victimology. Record the verified introspection results as a code comment above the query.
- Explicit negative test in `IndexTest.php`: assert the response payload does NOT contain any of `primary_motivation`, `resource_level`, `goals` keys — this is how SC4 is enforced in CI.
- Cache flushing for dev/debug: because the key is `threat_campaigns:<md5>`, flush via `php artisan cache:clear` or `Cache::forget('threat_campaigns:'.md5(...))` in tinker. No per-size semantic keys needed here (unlike Phase 59 snapshot).
- Feature-gate behavior: free plan → 403 with `{error: "upgrade_required", message: "Upgrade your plan to access this feature"}`. Active trial user (plan_id null + trial_ends_at future) → 200. Paid plans → 200. Confirmed by reading `FeatureGate.php`.

</specifics>

<deferred>
## Deferred Ideas

- **Separate `GET /api/threat-campaigns/{id}` detail endpoint** — not needed in Phase 60 because the list payload already carries everything Phase 65's detail modal requires. Add only if a future phase (e.g., v6.2 campaign→victim graph) needs heavier per-campaign enrichment.
- **Date-range filtering on campaigns** (`first_seen` / `last_seen` window) — considered, deferred. Not in Phase 65 requirements; can be added in a future analytics milestone alongside the Threat News date browser pattern.
- **Search facets / filter dropdown** on campaigns (labels, confidence, attribution motivation) — frontend-side filtering in Phase 65 can cover simple cases; backend facet support is a future phase.
- **Related REQUIREMENTS.md §Future** — CAMP-GRAPH (campaign→actor navigation graph) and MAP-INTERACT (victimology heatmap) remain deferred per roadmap; this phase does not block them.

</deferred>

---

*Phase: 60-backend-campaigns-service-endpoint*
*Context gathered: 2026-04-18*
