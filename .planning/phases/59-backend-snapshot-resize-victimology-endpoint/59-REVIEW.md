---
phase: 59-backend-snapshot-resize-victimology-endpoint
reviewed: 2026-04-17T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - backend/app/Services/ThreatMapService.php
  - backend/app/Http/Controllers/ThreatMap/SnapshotController.php
  - backend/tests/Feature/ThreatMap/SnapshotTest.php
  - backend/app/Services/ThreatActorService.php
  - backend/tests/Feature/ThreatActor/EnrichmentTest.php
findings:
  critical: 0
  warning: 2
  info: 6
  total: 8
status: issues_found
---

# Phase 59: Code Review Report

**Reviewed:** 2026-04-17
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Phase 59 delivers two backend extensions cleanly:

1. `GET /api/threat-map/snapshot?limit={100|500|1000|2000}` with per-limit cache keying.
2. `ThreatActorService` victimology consolidation returning `countries/regions/sectors/organizations` buckets.

**Security posture is solid.** GraphQL queries use parameterized variables throughout (no string concatenation of user input), the `?limit` whitelist correctly rejects non-numeric and out-of-range inputs, `normalizeVictimology` defensively guards against malformed OpenCTI shapes, and the `safeNormalizeVictimology` wrapper degrades gracefully on parse failure while letting genuine query failures bubble to a 502. No critical issues.

**Identified concerns** are primarily defense-in-depth and test-quality items: the service layer trusts the controller's whitelist (no second line of defense), the snapshot test asserting "separate caches" verifies mock dispatch rather than cache isolation, and a couple of aggregation paths in the controller are fragile against upstream event-shape drift. Details below.

## Warnings

### WR-01: Service layer does not re-validate `$limit` whitelist

**File:** `backend/app/Services/ThreatMapService.php:218-225`
**Issue:** `ThreatMapService::getSnapshot(int $limit = 100)` trusts the caller to have whitelisted the value. Any integer passed here becomes a distinct cache key (`threat_map:snapshot:{$limit}`) and a distinct `first: Int!` in the GraphQL query. A future internal caller (scheduler, Artisan command, another service) could bypass `SnapshotController::ALLOWED_LIMITS` and (a) poison Redis with arbitrary keys like `threat_map:snapshot:999999`, and (b) issue an expensive unbounded OpenCTI page. The docblock mentions the controller validates, but this is a documentation-only guarantee.

**Fix:** Add a service-layer precondition that either coerces or rejects out-of-range limits. Minimal change:

```php
public function getSnapshot(int $limit = 100): array
{
    $allowed = [100, 500, 1000, 2000];
    if (!in_array($limit, $allowed, true)) {
        $limit = 100;
    }

    return Cache::remember(
        "threat_map:snapshot:{$limit}",
        now()->addMinutes(15),
        fn () => $this->fetchSnapshot($limit),
    );
}
```

Alternatively, extract the whitelist to a shared constant (e.g., `ThreatMapService::ALLOWED_LIMITS`) so the controller and service reference one source of truth, killing drift risk between the two layers.

### WR-02: `$group[0]` in `countryCounts` assumes numeric-indexed inner collection

**File:** `backend/app/Http/Controllers/ThreatMap/SnapshotController.php:61-67`
**Issue:** After `->groupBy('countryCode')`, the inner collections are keyed numerically only because `$eventsCollection` itself was numerically keyed. If upstream `getSnapshot()` ever returns an associative array (e.g., keyed by event id for O(1) lookup in a later refactor), `$group[0]` raises `Undefined offset 0` or silently returns `null`, cascading to `$group[0]['countryCode']` → fatal. The code relies on an invariant that is not enforced anywhere.

**Fix:** Use `->first()` which is index-agnostic and returns `null` defensively:

```php
$countryCounts = $eventsCollection
    ->filter(fn ($e) => !empty($e['countryCode']))
    ->groupBy('countryCode')
    ->map(function ($group) {
        $first = $group->first();
        return [
            'code' => $first['countryCode'],
            'name' => $first['country'] ?? $first['countryCode'],
            'count' => $group->count(),
        ];
    })
    ->sortByDesc('count')
    ->values()
    ->slice(0, 10)
    ->all();
```

## Info

### IN-01: `$request->integer()` silently truncates mixed strings

**File:** `backend/app/Http/Controllers/ThreatMap/SnapshotController.php:34`
**Issue:** Laravel's `$request->integer('limit')` casts `"500abc"` → `500`, `"500.9"` → `500`, `"0500"` → `500`. All three then match `ALLOWED_LIMITS` and are accepted. This is almost certainly harmless for this endpoint (the caller is the dashboard dropdown), but it means the server silently accepts inputs the whitelist comment implies would be rejected. The inline comment already notes "0 for missing" — worth extending it to note the coercion behavior so the next maintainer does not mistakenly tighten validation and break legitimate but unusual query strings.

**Fix:** Either document explicitly or use strict validation via `$request->validate(['limit' => 'integer|in:100,500,1000,2000'])` with a try/catch that falls back to 100 on `ValidationException`. Current behavior is defensible; just clarify the comment.

### IN-02: Test name "uses separate caches" actually verifies mock dispatch, not cache isolation

**File:** `backend/tests/Feature/ThreatMap/SnapshotTest.php:150-171`
**Issue:** The test binds a mock that returns different arrays for `getSnapshot(100)` vs `getSnapshot(500)` and asserts the HTTP responses differ. Because the mock replaces the real service entirely, the cache layer (`Cache::remember` inside `getSnapshot`) is bypassed — this test would pass even if cache keys collided. It proves the controller forwards the correct `$limit` to the service, which is useful, but the name promises something stronger.

**Fix:** Either rename to `passes distinct limit through to service` (honest description) or add a dedicated service-level test that exercises the real `Cache::remember` path:

```php
test('ThreatMapService::getSnapshot keys cache separately per limit', function () {
    Cache::flush();
    $openCti = Mockery::mock(OpenCtiService::class);
    $openCti->shouldReceive('query')->twice()->andReturn(['stixCyberObservables' => ['edges' => []]]);
    $svc = new ThreatMapService($openCti);

    $svc->getSnapshot(100);
    $svc->getSnapshot(500);

    expect(Cache::has('threat_map:snapshot:100'))->toBeTrue();
    expect(Cache::has('threat_map:snapshot:500'))->toBeTrue();
});
```

### IN-03: Malformed-edge test does not cover missing `node` key

**File:** `backend/tests/Feature/ThreatActor/EnrichmentTest.php:177-193`
**Issue:** The test covers null `to`, null `entity_type`, and missing `id`, but not an edge lacking the `node` key entirely (e.g., `['to' => ...]` with no wrapping `['node' => ...]`). The production code handles this via `$edge['node']['to'] ?? null` chain, so it is safe — but coverage should assert that safety rather than rely on visual inspection of the normalizer.

**Fix:** Add one more entry to the malformed-edges fixture:

```php
['to' => ['id' => 'x', 'entity_type' => 'Country', 'name' => 'x']], // missing wrapping 'node'
[],                                                                  // fully empty edge
```

Both should be silently skipped without throwing.

### IN-04: `match()` used for side-effecting dispatch with discarded result

**File:** `backend/app/Services/ThreatActorService.php:733-741`
**Issue:** `match($node['entity_type']) { 'Country' => $buckets['countries'][] = $base + [...], ... }` uses PHP's match *expression* purely for side effects — the expression result is discarded. This compiles and runs correctly, but most PHP style guides reserve `match` for value selection and use `switch` or `if/elseif` for dispatch. Readability cost is small; current form is compact and arguably clearer here.

**Fix:** Optional. If you want stricter style, rewrite as:

```php
switch ($node['entity_type']) {
    case 'Country':
        $buckets['countries'][] = $base + ['country_code' => $this->extractIsoCode($node['x_opencti_aliases'] ?? [])];
        break;
    case 'Region':
        $buckets['regions'][] = $base;
        break;
    case 'Sector':
        $buckets['sectors'][] = $base;
        break;
    case 'Organization':
        $buckets['organizations'][] = $base;
        break;
}
```

### IN-05: Parse-level fallback caches empty victimology for 15 minutes

**File:** `backend/app/Services/ThreatActorService.php:688-700`
**Issue:** The docblock already calls this out transparently: if `normalizeVictimology` throws (malformed edge shape), `safeNormalizeVictimology` returns empty buckets, and because this happens inside the `Cache::remember` closure that ALSO wraps tools/malware/campaigns (which DID succeed), the whole enrichment payload — including the empty victimology — is cached for 15 minutes. For an actor that legitimately has victimology data but parsing hit a one-off malformed edge (e.g., OpenCTI schema drift), the UI shows "no victims" for up to 15 min after the upstream fix.

**Fix:** Acknowledged trade-off per the docblock. If you want faster recovery, consider either (a) shortening the cache TTL for payloads that contain any empty-bucket victimology (but this is complex), or (b) emitting a metric/alert on the `Log::warning` path so ops sees the drift immediately. Current behavior is acceptable given the 15-min TTL is already short.

### IN-06: Public snapshot endpoint has no explicit rate limit

**File:** `backend/app/Http/Controllers/ThreatMap/SnapshotController.php` (whole file)
**Issue:** Phase 59 spec notes the route is public (outside `auth:sanctum`). The 15-min cache blunts most abuse scenarios (each accepted limit → 1 OpenCTI round-trip per 15 min), but an attacker hitting `?limit=100` in a tight loop still consumes web-server threads and returns a potentially large JSON (up to 2000 events). No `throttle:` middleware annotation visible in the controller, and `routes/api.php` was not in the review scope to confirm.

**Fix:** Verify `routes/api.php` applies a `throttle:60,1` (or similar) middleware to this route. If not, add it — costs nothing since cached responses are microseconds to serve, but bounds the worst case. Out of Phase 59 scope to fix here; flagging for roadmap awareness.

---

_Reviewed: 2026-04-17_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
