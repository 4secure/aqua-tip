# Phase 14: Backend Search Generalization - Research

**Researched:** 2026-03-18
**Domain:** Laravel backend / OpenCTI GraphQL API / Observable type detection
**Confidence:** HIGH

## Summary

This phase generalizes the existing IP-only search backend to accept any of 9 observable types. The existing `IpSearchService` is a clean, well-structured 545-line service with 5 sub-queries (observable, relationships, indicators, sightings, notes) plus geo enrichment. The new `ThreatSearchService` will be a parallel copy with two key changes: (1) the observable query drops the `entity_type` filter so OpenCTI matches any observable type by value, and (2) geo enrichment runs conditionally based on the `entity_type` returned by OpenCTI.

**Critical finding:** File hash observables (MD5, SHA-1, SHA-256) cannot be found using the generic `value` filter key. OpenCTI stores file hashes in separate fields and requires hash-type-specific filter keys (`hashes.MD5`, `hashes.SHA-1`, `hashes.SHA-256`). The service must detect hash-like inputs and use the appropriate filter key, OR use the `search` parameter as a fallback. This contradicts the CONTEXT.md assumption that "File hashes: try the same `value` filter -- if OpenCTI indexes hashes in `observable_value`, it just works." It does not just work for file hashes.

**Primary recommendation:** Use the `value` filter key for non-hash observables (IP, Domain, URL, Email, Hostname) and fall back to hash-type-specific filter keys (`hashes.MD5`, `hashes.SHA-1`, `hashes.SHA-256`) for hash inputs. Detect hash type by string length and character set (32 hex = MD5, 40 hex = SHA-1, 64 hex = SHA-256). This is minimal pre-detection -- not type detection of all 9 types, just distinguishing "is this a hash?" to pick the right GraphQL filter key.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- No pre-detection regex -- query OpenCTI by value only, read `entity_type` from the response
- Geo enrichment (ip-api.com) runs only when response `entity_type` is `IPv4-Addr` or `IPv6-Addr`
- No match returns `detected_type: null` -- frontend shows "No results for [query]" without type context
- Input validation: basic sanity check only (reject empty, whitespace-only, >500 chars). Let OpenCTI handle whether it's a valid observable
- No-match response: 200 with `found: false` (same pattern as current `/ip-search`)
- Same query depth for all 9 types: observable + relationships + indicators + sightings + notes + external references
- GraphQL filter uses `value` key only (drop `entity_type` filter from current IpSearchService pattern)
- File hashes: try the same `value` filter -- if OpenCTI indexes hashes in `observable_value`, it just works
- Cache key: `threat_search:` + md5($query), same 15-minute TTL
- Top-level field renamed from `ip` to `query`
- New `detected_type` field from OpenCTI response's `entity_type` (null when not found)
- `geo` field always present -- populated for IP types, `null` for everything else
- All other fields unchanged: `found`, `score`, `labels`, `description`, `created_by`, `created_at`, `updated_at`, `relationships`, `indicators`, `sightings`, `notes`, `external_references`, `raw`
- Credits payload unchanged
- New `POST /threat-search` with `deduct-credit` middleware (guests + auth, same as `/ip-search`)
- Old `/ip-search` stays untouched -- runs `IpSearchService` independently until Phase 15 retires it
- ThreatSearch namespace: `ThreatSearch/SearchController`, `ThreatSearchRequest`, `ThreatSearchService`
- SearchLog: `module='threat_search'` + new nullable `type` column storing detected `entity_type`

### Claude's Discretion
- Exact validation rules for the sanity check (string length, character patterns)
- GraphQL query field selection for non-IP observable types
- Error handling granularity for individual sub-queries (relationships, indicators, etc.)
- Migration file details for the SearchLog `type` column

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SRCH-01 | User can search any of 9 observable types (IPv4, IPv6, Domain, URL, Email, MD5, SHA-1, SHA-256, Hostname) | ThreatSearchService with value-only filter; hash-specific filter keys for file hashes |
| SRCH-02 | Backend auto-detects input type via regex matching | Decision overrides this: read `entity_type` from OpenCTI response, no pre-detection. Exception: hash inputs need length-based detection for correct filter key |
| SRCH-05 | Geo enrichment shown only for IP-type results | Conditional geo fetch based on `entity_type` in OpenCTI response |
| SRCH-06 | Relationship graph renders for all observable types | Same `stixCoreRelationships` query works for any observable ID |
| SRCH-07 | Indicators and Sightings tabs work for all observable types | Same `indicators` and `stixSightingRelationships` queries work for any observable ID |
| SRCH-08 | Notes tab shows OpenCTI notes for any observable | Same `notes` query with `objectContains` filter works for any observable ID |
| ROUTE-03 | Backend controllers/services renamed from IpSearch to ThreatSearch | New namespace `ThreatSearch/SearchController`, `ThreatSearchRequest`, `ThreatSearchService` |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Laravel | 11 | Backend framework | Already in use |
| OpenCTI GraphQL API | Instance-specific | Threat intelligence data source | Already integrated via `OpenCtiService` |
| ip-api.com | Free tier | Geo enrichment for IP addresses | Already in use, no API key needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `Illuminate\Support\Facades\Cache` | Built-in | 15-minute result caching | Every search request |
| `Illuminate\Support\Facades\Http` | Built-in | HTTP client for ip-api.com | IP-type geo enrichment only |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `value` filter for hashes | `search` parameter (full-text) | `search` is fuzzy/partial -- may return false positives. Hash-specific keys are exact match |

**Installation:** No new packages needed. Zero dependencies added.

## Architecture Patterns

### Recommended File Structure
```
backend/app/
  Http/
    Controllers/
      ThreatSearch/
        SearchController.php    # NEW - Invokable, credit gating + refund
    Requests/
      ThreatSearchRequest.php   # NEW - Basic sanity validation
  Services/
    ThreatSearchService.php     # NEW - Generalized search service
    IpSearchService.php         # UNCHANGED - stays for /ip-search
    OpenCtiService.php          # UNCHANGED - reused as-is

backend/database/migrations/
  YYYY_MM_DD_HHMMSS_add_type_to_search_logs_table.php  # NEW
```

### Pattern 1: Generalized Observable Query (value filter)
**What:** Drop the `entity_type` filter from the GraphQL query so OpenCTI matches the value against all observable types.
**When to use:** For non-hash inputs (IPs, domains, URLs, emails, hostnames).
**Example:**
```php
// Source: Existing IpSearchService.php, modified
$variables = [
    'filters' => [
        'mode' => 'and',
        'filters' => [
            [
                'key' => 'value',
                'values' => [$query],
                'operator' => 'eq',
                'mode' => 'or',
            ],
            // entity_type filter REMOVED -- let OpenCTI match any type
        ],
        'filterGroups' => [],
    ],
];
```

### Pattern 2: Hash-Specific Filter Keys
**What:** File hash observables in OpenCTI are stored in separate fields (`hashes.MD5`, `hashes.SHA-1`, `hashes.SHA-256`), not in `observable_value`. The generic `value` filter will NOT match them.
**When to use:** When input looks like a hash (hex string of length 32, 40, or 64).
**Example:**
```php
// Detect hash type by length
private function detectHashFilterKey(string $query): ?string
{
    $clean = strtolower(trim($query));
    if (!ctype_xdigit($clean)) {
        return null;
    }

    return match (strlen($clean)) {
        32 => 'hashes.MD5',
        40 => 'hashes.SHA-1',
        64 => 'hashes.SHA-256',
        default => null,
    };
}

// Use hash-specific key in filter
$filterKey = $this->detectHashFilterKey($query) ?? 'value';

$variables = [
    'filters' => [
        'mode' => 'and',
        'filters' => [
            [
                'key' => $filterKey,
                'values' => [$query],
                'operator' => 'eq',
                'mode' => 'or',
            ],
        ],
        'filterGroups' => [],
    ],
];
```

### Pattern 3: Conditional Geo Enrichment
**What:** Only call ip-api.com when the observable is an IP address.
**When to use:** After receiving the OpenCTI response.
**Example:**
```php
$entityType = $observable['entity_type'] ?? null;
$isIpType = in_array($entityType, ['IPv4-Addr', 'IPv6-Addr'], true);
$geo = $isIpType ? $this->fetchGeoFromIpApi($query) : null;
```

### Pattern 4: Response Shape Migration
**What:** Rename `ip` to `query`, add `detected_type` field.
**Example:**
```php
private function buildResponse(
    string $query,
    bool $found,
    ?array $observable,
    ?array $geo,
    array $relationships,
    array $indicators,
    array $sightings,
    array $notes,
    array $externalReferences,
): array {
    return [
        'query' => $query,                                      // was 'ip'
        'detected_type' => $observable['entity_type'] ?? null,  // NEW
        'found' => $found,
        'score' => $observable['x_opencti_score'] ?? null,
        'labels' => $observable['objectLabel'] ?? [],
        'description' => $observable['x_opencti_description'] ?? null,
        'created_by' => $observable['createdBy']['name'] ?? null,
        'created_at' => $observable['created_at'] ?? null,
        'updated_at' => $observable['updated_at'] ?? null,
        'geo' => $geo,                                          // null for non-IP
        'relationships' => $relationships,
        'indicators' => $indicators,
        'sightings' => $sightings,
        'notes' => $notes,
        'external_references' => $externalReferences,
        'raw' => $observable,
    ];
}
```

### Anti-Patterns to Avoid
- **Modifying IpSearchService:** The decision is clean-break. Copy and adapt, do not modify the existing service.
- **Pre-detecting all 9 types with regex:** The decision says no pre-detection regex. The only "detection" is hash-length check to pick the right GraphQL filter key, which is a technical necessity, not type detection for the user.
- **Using `search` parameter for hashes:** The `search` param is full-text/fuzzy and may return false positives. Use exact-match hash filter keys instead.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| GraphQL HTTP client | Custom cURL wrapper | Existing `OpenCtiService` | Already handles auth, retry, error parsing |
| Credit gating | Manual credit logic | Existing `deduct-credit` middleware | Battle-tested, handles guests + auth |
| Geo enrichment | New geo service | Existing `fetchGeoFromIpApi` method (copy from IpSearchService) | Simple, no API key needed, already works |
| Response normalization | New normalizer classes | Copy normalizer methods from IpSearchService | Same GraphQL response shape for all types |

**Key insight:** This phase is 90% copy-and-adapt from IpSearchService. The only genuinely new logic is hash detection for filter key selection and conditional geo enrichment.

## Common Pitfalls

### Pitfall 1: File Hash Filter Key Mismatch
**What goes wrong:** Using `value` as the filter key for hash searches returns zero results even when the hash exists in OpenCTI.
**Why it happens:** OpenCTI stores file hash observables with the hash in `hashes.MD5`, `hashes.SHA-1`, `hashes.SHA-256` fields, not in `observable_value`. The `value` filter key does not search hash fields.
**How to avoid:** Detect hex strings of length 32/40/64 and use the corresponding `hashes.X` filter key.
**Warning signs:** Hash searches always return `found: false` while IP/domain searches work fine.

### Pitfall 2: Old Hash Key Format (Pre-5.12)
**What goes wrong:** Using underscore format (`hashes_MD5`) instead of dot format (`hashes.MD5`).
**Why it happens:** OpenCTI 5.12 renamed filter keys from underscores to dots.
**How to avoid:** Use dot notation: `hashes.MD5`, `hashes.SHA-1`, `hashes.SHA-256`.
**Warning signs:** GraphQL query error or silent empty results.

### Pitfall 3: Mutating IpSearchService
**What goes wrong:** Editing the existing IP search service breaks the old frontend before Phase 15 migrates it.
**Why it happens:** Temptation to avoid code duplication.
**How to avoid:** Clean-break strategy -- new files only. IpSearchService remains untouched.
**Warning signs:** `/ip-search` endpoint stops working.

### Pitfall 4: Geo Enrichment for Non-IP Types
**What goes wrong:** Calling ip-api.com with a domain name or hash value returns garbage or errors.
**Why it happens:** ip-api.com expects IP addresses only. Domain names may resolve but return the DNS resolver's IP, not the intended result.
**How to avoid:** Only call geo enrichment when `entity_type` from OpenCTI response is `IPv4-Addr` or `IPv6-Addr`.
**Warning signs:** Geo data shows random/incorrect locations for domain searches.

### Pitfall 5: SearchLog Migration Breaks Existing Data
**What goes wrong:** Adding a non-nullable `type` column to `search_logs` fails because existing rows have no type value.
**Why it happens:** Forgetting to make the new column nullable.
**How to avoid:** Use `$table->string('type', 50)->nullable()->after('module')`.
**Warning signs:** Migration fails on production with existing data.

## Code Examples

### ThreatSearchRequest Validation
```php
// Source: Adapted from existing IpSearchRequest.php
class ThreatSearchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'query' => ['required', 'string', 'min:1', 'max:500'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->query)) {
            $this->merge(['query' => trim($this->query)]);
        }
    }
}
```

### SearchLog with Type Column
```php
// In ThreatSearch/SearchController.php
SearchLog::create([
    'user_id' => $request->user()?->id,
    'ip_address' => $request->ip(),
    'module' => 'threat_search',
    'query' => $query,
    'type' => $data['detected_type'],  // nullable, from OpenCTI response
]);
```

### Route Registration
```php
// In routes/api.php -- ADD alongside existing /ip-search
Route::post('/threat-search', \App\Http\Controllers\ThreatSearch\SearchController::class)
    ->middleware('deduct-credit');
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `hashes_MD5` filter key | `hashes.MD5` (dot notation) | OpenCTI 5.12 | Must use dot notation for hash filters |
| `labelledBy` filter key | `objectLabel` | OpenCTI 5.12 | Already correct in current IpSearchService |
| `objectContains` filter key | `objects` | OpenCTI 5.12 | Current notes query uses `objectContains` -- verify this still works or update to `objects` |

**Deprecated/outdated:**
- `hashes_MD5`, `hashes_SHA1`, `hashes_SHA256`: Replaced with dot notation in OpenCTI 5.12+
- `objectContains`: Renamed to `objects` in OpenCTI 5.12 -- the existing `IpSearchService` uses `objectContains` for notes queries. This may need updating in the new service.

## Open Questions

1. **Does `objectContains` still work or was it replaced by `objects`?**
   - What we know: OpenCTI 5.12 docs list `objectContains` -> `objects` as a rename. Current IpSearchService uses `objectContains` and it works.
   - What's unclear: Whether OpenCTI supports both old and new key names for backward compatibility.
   - Recommendation: Use `objectContains` in the new service (since it works in the existing one). If it fails, switch to `objects`. Flag for live validation.

2. **Hash filter key live validation needed**
   - What we know: Documentation and GitHub issues confirm `hashes.MD5`, `hashes.SHA-1`, `hashes.SHA-256` are the correct keys.
   - What's unclear: Whether the specific OpenCTI instance has file hash observables indexed and searchable.
   - Recommendation: Implement the hash detection logic. Test against the live instance. If hash searches return empty, it may be a data issue, not a code issue.

3. **Does `value` filter work for Domain-Name, Email-Addr, Url types?**
   - What we know: The `value` key works for IPv4-Addr and IPv6-Addr (proven by current IpSearchService). Documentation suggests it should work for any observable type that stores its data in `observable_value`.
   - What's unclear: 100% confirmation for Domain-Name, Email-Addr, Url, and Hostname types.
   - Recommendation: HIGH confidence this works -- these types all store their value in `observable_value`. Implement and verify.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None -- no tests exist in the project (per CLAUDE.md) |
| Config file | none -- see Wave 0 |
| Quick run command | `php artisan test --filter ThreatSearch` |
| Full suite command | `php artisan test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SRCH-01 | POST /threat-search accepts 9 observable types | integration | `php artisan test --filter ThreatSearchControllerTest -x` | No -- Wave 0 |
| SRCH-02 | Response includes detected_type from OpenCTI | unit | `php artisan test --filter ThreatSearchServiceTest -x` | No -- Wave 0 |
| SRCH-05 | Geo enrichment only for IP types | unit | `php artisan test --filter ThreatSearchServiceTest::test_geo_only_for_ip -x` | No -- Wave 0 |
| SRCH-06 | Relationships returned for all types | integration | `php artisan test --filter ThreatSearchControllerTest::test_relationships -x` | No -- Wave 0 |
| SRCH-07 | Indicators and Sightings returned for all types | integration | `php artisan test --filter ThreatSearchControllerTest::test_indicators_sightings -x` | No -- Wave 0 |
| SRCH-08 | Notes returned for all types | integration | `php artisan test --filter ThreatSearchControllerTest::test_notes -x` | No -- Wave 0 |
| ROUTE-03 | ThreatSearch namespace used | manual-only | Verify file paths and namespaces | N/A |

### Sampling Rate
- **Per task commit:** `php artisan test --filter ThreatSearch`
- **Per wave merge:** `php artisan test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/Feature/ThreatSearchControllerTest.php` -- covers SRCH-01, SRCH-06, SRCH-07, SRCH-08
- [ ] `tests/Unit/ThreatSearchServiceTest.php` -- covers SRCH-02, SRCH-05
- [ ] PHPUnit config: `phpunit.xml` -- verify it exists in backend root
- [ ] Framework install: PHPUnit likely already installed via `laravel/framework` -- verify with `composer show phpunit/phpunit`

## Sources

### Primary (HIGH confidence)
- `backend/app/Services/IpSearchService.php` -- Full source code of existing service to generalize
- `backend/app/Services/OpenCtiService.php` -- Reusable GraphQL proxy
- `backend/app/Http/Controllers/IpSearch/SearchController.php` -- Credit gating pattern
- `backend/app/Http/Requests/IpSearchRequest.php` -- Current validation
- `backend/routes/api.php` -- Route registration pattern
- `backend/app/Models/SearchLog.php` -- Current model (needs `type` in fillable)
- `backend/database/migrations/2026_03_13_000002_create_search_logs_table.php` -- Current schema

### Secondary (MEDIUM confidence)
- [OpenCTI Filters Documentation](https://docs.opencti.io/latest/reference/filters/) -- FilterGroup structure
- [OpenCTI 5.12 Breaking Changes](https://docs.opencti.io/latest/deployment/breaking-changes/5.12-filters/) -- Hash filter key renames
- [GitHub Issue #6676](https://github.com/OpenCTI-Platform/opencti/issues/6676) -- File observable value filter limitation

### Tertiary (LOW confidence)
- [OpenCTI Python Client](https://github.com/OpenCTI-Platform/client-python/blob/master/pycti/entities/opencti_stix_cyber_observable.py) -- `search` parameter usage pattern

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- zero new dependencies, all existing code
- Architecture: HIGH -- direct copy-and-adapt from proven IpSearchService
- Hash filter keys: MEDIUM -- documented in OpenCTI 5.12 breaking changes and GitHub issues, but needs live validation against the specific instance
- Pitfalls: HIGH -- well-documented OpenCTI quirks with file hash filtering

**Research date:** 2026-03-18
**Valid until:** 2026-04-17 (stable -- no moving parts, all existing stack)
