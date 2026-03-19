# Phase 19: Search History Backend - Research

**Researched:** 2026-03-19
**Domain:** Laravel 11 REST API -- read endpoint on existing table
**Confidence:** HIGH

## Summary

This phase adds a single GET endpoint (`/api/search-history`) that reads from the existing `search_logs` table, scoped to the authenticated user. All infrastructure already exists: the `SearchLog` model with fillable fields, the `User::searchLogs()` HasMany relationship, and a composite index on `[user_id, created_at]` that perfectly supports the query pattern.

The implementation is minimal: one invokable controller, one route registration, and tests. No new models, migrations, services, or middleware are needed. The existing codebase patterns (invokable controllers, envelope responses, Pest feature tests with RefreshDatabase) provide a clear template.

**Primary recommendation:** Follow the established invokable controller pattern. Query via `$request->user()->searchLogs()` with Eloquent scopes for module filtering, return envelope response with `data` and `meta` keys.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Response fields per entry: `id`, `query`, `type`, `module`, `created_at` -- do NOT expose `ip_address` or `user_id`
- Envelope format: `{ data: [...], meta: { total, limit } }`
- Default limit: 20 results, ordered by `created_at DESC`
- Optional `?module=` query parameter to filter by module
- Valid modules: `threat_search`, `ip_search`, `dark_web`
- No deduplication -- every search entry returned individually
- No pagination -- fixed limit of 20
- Auth required via `auth:sanctum` middleware -- guests receive 401
- Only returns searches for the authenticated user

### Claude's Discretion
- Controller structure (single controller vs resource controller)
- Whether to use Eloquent query or raw query builder
- Validation approach for the optional module filter
- Test structure and coverage strategy

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| HIST-01 | Backend stores search queries (query + type + module, no response data) -- already exists | Verified: `SearchLog` model, `search_logs` table, and logging in all 3 search controllers already exist. No work needed. |
| HIST-02 | Backend provides auth-only endpoint to retrieve user's recent searches | New invokable controller + route registration in `auth:sanctum` group. Patterns fully established. |
</phase_requirements>

## Standard Stack

### Core (Already Exists -- No New Dependencies)

| Component | Version | Purpose | Status |
|-----------|---------|---------|--------|
| Laravel 11 | 11.x | Framework | Existing |
| Sanctum | bundled | Auth middleware | Existing |
| Pest | 3.x | Testing | Existing |
| PostgreSQL | -- | Database | Existing |

No new packages to install. This phase uses only existing framework features.

## Architecture Patterns

### Recommended File Structure

```
backend/
  app/Http/Controllers/SearchHistory/
    IndexController.php          # New -- invokable controller
  routes/
    api.php                      # Modified -- add one route
  tests/Feature/SearchHistory/
    IndexTest.php                # New -- feature tests
```

### Pattern: Invokable Controller (Established Project Pattern)

**What:** Single-action controller with `__invoke` method.
**Why:** Every controller in this project follows this pattern (DashboardCountsController, ThreatActorIndexController, all search controllers). Consistency is mandatory.

**Example (adapted from existing codebase):**
```php
// Source: Adapted from backend/app/Http/Controllers/Dashboard/CountsController.php
namespace App\Http\Controllers\SearchHistory;

use App\Http\Controllers\Controller;
use App\Models\SearchLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IndexController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $query = $request->user()->searchLogs()
            ->select(['id', 'query', 'type', 'module', 'created_at'])
            ->latest('created_at')
            ->limit(20);

        if ($request->has('module') && in_array($request->query('module'), SearchLog::VALID_MODULES, true)) {
            $query->where('module', $request->query('module'));
        }

        $results = $query->get();

        return response()->json([
            'data' => $results,
            'meta' => [
                'total' => $results->count(),
                'limit' => 20,
            ],
        ]);
    }
}
```

### Pattern: Envelope Response (Established Project Pattern)

**What:** All JSON responses wrap data in `{ data: [...] }` with optional `meta`.
**Source:** Used by ThreatActorIndexController, DashboardCountsController, LoginController, UserController.

### Pattern: Route Registration

**Where:** Inside the existing `Route::middleware('auth:sanctum')->group(...)` block in `routes/api.php`.
**Example:**
```php
Route::get('/search-history', \App\Http\Controllers\SearchHistory\IndexController::class);
```

### Anti-Patterns to Avoid
- **Resource controller:** Do not use `Route::resource` or multi-method controllers. The project uses invokable controllers exclusively.
- **Service class for simple queries:** No need for a SearchHistoryService. The query is a single Eloquent chain -- a service would be over-engineering. The existing DashboardService exists because it wraps complex OpenCTI GraphQL calls.
- **FormRequest for optional filter:** Overkill for a single optional query param. Inline validation is sufficient and matches project style.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Query scoping to user | Manual WHERE clause | `$request->user()->searchLogs()` | Relationship already exists on User model |
| Auth enforcement | Custom middleware | `auth:sanctum` route middleware | Already configured for all auth routes |
| Module validation | Complex validation class | `in_array()` with const array | Only 3 valid values, simple check |

## Common Pitfalls

### Pitfall 1: Exposing sensitive fields
**What goes wrong:** Returning `ip_address` or `user_id` in the response.
**Why it happens:** Using `SearchLog::all()` or `->get()` without `->select()`.
**How to avoid:** Explicitly `->select(['id', 'query', 'type', 'module', 'created_at'])`.
**Warning signs:** Response JSON contains `ip_address` or `user_id` keys.

### Pitfall 2: N+1 or missing index
**What goes wrong:** Slow queries on large search_logs table.
**Why it happens:** Forgetting the index exists or querying without user_id scope.
**How to avoid:** Already handled -- `[user_id, created_at]` composite index exists and the relationship query scopes by `user_id` automatically.

### Pitfall 3: Ignoring null user_id rows
**What goes wrong:** Guest searches (where `user_id IS NULL`) leaking into results.
**Why it happens:** Querying the table directly instead of through the relationship.
**How to avoid:** Always use `$request->user()->searchLogs()` which adds `WHERE user_id = ?`.

### Pitfall 4: Invalid module filter silently returning empty results
**What goes wrong:** User passes `?module=invalid_value`, gets empty data, thinks the endpoint is broken.
**How to avoid:** Only apply module filter when value is in the allowed list. If invalid, ignore the filter and return all modules. Alternatively, return 422 for invalid module values.
**Recommendation:** Ignore invalid values (return unfiltered) -- simpler, no error handling needed on frontend.

## Code Examples

### SearchLog Model Enhancement (Optional)
```php
// Add valid modules constant to SearchLog model
class SearchLog extends Model
{
    public const VALID_MODULES = ['threat_search', 'ip_search', 'dark_web'];
    // ... existing code
}
```

### Route Registration
```php
// Inside auth:sanctum group in routes/api.php
Route::get('/search-history', \App\Http\Controllers\SearchHistory\IndexController::class);
```

### Feature Test Pattern (Pest, adapted from LoginTest.php)
```php
// Source: Pattern from tests/Feature/Auth/LoginTest.php + tests/Feature/Dashboard/CountsTest.php
uses(Illuminate\Foundation\Testing\RefreshDatabase::class);

test('GET /api/search-history returns 401 for guests', function () {
    $response = $this->getJson('/api/search-history');
    $response->assertStatus(401);
});

test('GET /api/search-history returns user searches', function () {
    $user = \App\Models\User::factory()->create();
    \App\Models\SearchLog::create([
        'user_id' => $user->id,
        'ip_address' => '127.0.0.1',
        'module' => 'threat_search',
        'query' => 'test query',
        'type' => 'domain',
    ]);

    $response = $this->actingAs($user)->getJson('/api/search-history');

    $response->assertStatus(200)
        ->assertJsonStructure([
            'data' => [['id', 'query', 'type', 'module', 'created_at']],
            'meta' => ['total', 'limit'],
        ]);
});
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Pest 3.x (PHP) |
| Config file | `backend/phpunit.xml` |
| Quick run command | `cd backend && php artisan test --filter=SearchHistory` |
| Full suite command | `cd backend && php artisan test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HIST-01 | Search logs already stored | N/A (pre-existing) | N/A | N/A |
| HIST-02 | GET /search-history returns auth user's recent searches | Feature | `cd backend && php artisan test --filter=SearchHistory` | No -- Wave 0 |
| HIST-02 | Guests receive 401 | Feature | same filter | No -- Wave 0 |
| HIST-02 | Results ordered by most recent first | Feature | same filter | No -- Wave 0 |
| HIST-02 | Module filter works | Feature | same filter | No -- Wave 0 |
| HIST-02 | Response excludes ip_address and user_id | Feature | same filter | No -- Wave 0 |
| HIST-02 | Other user's searches not visible | Feature | same filter | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `cd backend && php artisan test --filter=SearchHistory`
- **Per wave merge:** `cd backend && php artisan test`
- **Phase gate:** Full suite green before verification

### Wave 0 Gaps
- [ ] `tests/Feature/SearchHistory/IndexTest.php` -- all HIST-02 test cases
- [ ] No framework install needed -- Pest already configured

## Open Questions

1. **Should invalid module values return 422 or be silently ignored?**
   - What we know: CONTEXT.md says valid modules are `threat_search`, `ip_search`, `dark_web`
   - What's unclear: Whether to reject or ignore invalid filter values
   - Recommendation: Silently ignore (return unfiltered) -- simpler for frontend consumers, no error state to handle. If the planner prefers strictness, a 422 with validation message is equally straightforward.

2. **Should `meta.total` reflect total user searches or just the returned count?**
   - What we know: Limit is fixed at 20, no pagination needed
   - What's unclear: Whether `total` means "total matching" (could be > 20) or "total returned" (always <= 20)
   - Recommendation: Use count of returned results (same as `data` array length). A separate COUNT query for total-in-database adds latency with no consumer benefit since there is no pagination.

## Sources

### Primary (HIGH confidence)
- `backend/app/Models/SearchLog.php` -- Model definition, fillable fields, relationships
- `backend/app/Models/User.php` -- `searchLogs()` HasMany relationship confirmed
- `backend/database/migrations/2026_03_13_000002_create_search_logs_table.php` -- Table schema, indexes
- `backend/database/migrations/2026_03_18_000001_add_type_to_search_logs_table.php` -- Type column addition
- `backend/routes/api.php` -- Route structure, auth:sanctum group
- `backend/app/Http/Controllers/Dashboard/CountsController.php` -- Invokable controller pattern
- `backend/app/Http/Controllers/ThreatActor/IndexController.php` -- Envelope response pattern
- `backend/tests/Feature/Dashboard/CountsTest.php` -- Pest feature test pattern
- `backend/tests/Feature/Auth/LoginTest.php` -- Auth test pattern with RefreshDatabase + actingAs

### Secondary (MEDIUM confidence)
- None needed -- all patterns verified from existing codebase

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- No new dependencies, everything exists
- Architecture: HIGH -- All patterns verified from existing codebase controllers and tests
- Pitfalls: HIGH -- Derived from actual table schema and model inspection

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (stable -- no external dependencies, internal patterns only)
