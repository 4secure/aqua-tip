# Phase 48: API Security - Research

**Researched:** 2026-04-11
**Domain:** Laravel 12 backend security -- IDOR prevention, rate limiting, error sanitization, response stripping
**Confidence:** HIGH

## Summary

Phase 48 addresses four distinct API security concerns in a Laravel 12 / PHP 8.3 backend: (1) an IDOR vulnerability on the dark-web task status endpoint, (2) rate limiting on search/credit/OAuth/email-verification endpoints, (3) error message sanitization to prevent OpenCTI internal details from leaking, and (4) response stripping to remove the raw OpenCTI observable payload from threat search responses.

All four concerns map to existing code patterns in the codebase. Rate limiting uses Laravel's built-in `RateLimiter::for()` with the `throttle:` middleware -- already established for auth routes. The IDOR fix requires a new `dark_web_tasks` migration and a single ownership check in `DarkWeb\SearchController::status()`. Error sanitization is a surgical fix in two controllers. Response stripping requires removing the `'raw' => $observable` key from `ThreatSearchService::buildResponse()`.

**Primary recommendation:** Implement all changes as backend-only modifications to existing controllers, the AppServiceProvider, and one new migration. No new packages needed -- Laravel's built-in rate limiter and middleware cover all requirements.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Create a `dark_web_tasks` table storing `task_id` + `user_id` when a dark-web search starts. The status endpoint checks ownership before proxying to the provider.
- **D-02:** Non-owner access returns 403 Forbidden with a generic message (not 404).
- **D-03:** Single named rate limiter `api-search` (30 requests/min) applied to `/ip-search`, `/threat-search`, and `/credits`. Defined in `AppServiceProvider` following the existing `RateLimiter::for('auth', ...)` pattern.
- **D-04:** Rate limiter identifies requesters by user ID (authenticated) or IP address (guests) -- matches existing credit system pattern.
- **D-05:** OAuth redirect endpoint (`/auth/{provider}/redirect`) gets tighter rate limiting: 10/min per IP.
- **D-06:** Email verification resend keeps existing `throttle:6,1` (6/min) but adds a per-day cap of 20/day.
- **D-07:** `EnrichmentController` and `HealthController` return fixed generic messages on OpenCTI failure ("Service temporarily unavailable"). Full exception details logged server-side via `Log::error()` with context.
- **D-08:** No error codes -- just generic human-readable messages. Keep it simple.
- **D-09:** Controller whitelists only the fields the frontend needs before returning search responses. No API Resource class -- explicit field picking in the controller keeps it simple and visible.

### Claude's Discretion
- Exact migration schema for `dark_web_tasks` table (columns, indexes)
- Which fields to whitelist in threat search response (inspect what frontend actually uses)
- Exact `Log::error()` context payload structure
- Whether to define `api-search` and `oauth-redirect` as separate `RateLimiter::for()` calls or combine

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| API-01 | Dark-web task status endpoint validates user ownership (IDOR fix) | New `dark_web_tasks` table + ownership check in `DarkWeb\SearchController::status()`. See Architecture Pattern 1. |
| API-02 | Rate limiting middleware on /ip-search, /threat-search, /credits (30/min) | `RateLimiter::for('api-search', ...)` in AppServiceProvider + `throttle:api-search` middleware on routes. See Architecture Pattern 2. |
| API-03 | EnrichmentController returns generic error, logs OpenCTI details server-side | Replace `$e->getMessage()` with fixed string + `Log::error()`. See Code Examples. |
| API-04 | HealthController returns generic 503 on failure, logs details server-side | Replace `$e->getMessage()` with fixed string + `Log::error()`. See Code Examples. |
| API-05 | Raw OpenCTI observable data removed from search API responses | Remove `'raw' => $observable` from `ThreatSearchService::buildResponse()`. See Architecture Pattern 4. |
| API-06 | Rate limiting on OAuth redirect endpoint | `RateLimiter::for('oauth-redirect', ...)` at 10/min per IP. See Architecture Pattern 2. |
| API-07 | Rate limiting on email verification resend (per-day cap) | Compound throttle: keep existing `throttle:6,1` + add `throttle:email-verify-daily` at 20/day. See Architecture Pattern 3. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Laravel Framework | 12.54.1 | Application framework | Already in use |
| Pest | 3.8+ | Test framework | Already in use for all backend tests |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `Illuminate\Cache\RateLimiting\Limit` | (bundled) | Rate limiter definitions | Defining named rate limiters |
| `Illuminate\Support\Facades\RateLimiter` | (bundled) | Rate limiter registration | AppServiceProvider boot |
| `Illuminate\Support\Facades\Log` | (bundled) | Server-side error logging | Error sanitization |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Explicit field picking in controller | Laravel API Resources | API Resources add a class per response shape -- overkill for one endpoint per D-09 |
| Database table for task ownership | Cache/Redis | Table is durable, survives restarts, and queryable. Cache would lose data on restart. |

**Installation:**
No new packages needed. All functionality is built into Laravel 12.

## Architecture Patterns

### Recommended File Changes
```
backend/
├── app/
│   ├── Http/Controllers/
│   │   ├── DarkWeb/SearchController.php          # MODIFY: store task, check ownership
│   │   ├── ThreatSearch/SearchController.php      # MODIFY: strip 'raw' field
│   │   ├── ThreatActor/EnrichmentController.php   # MODIFY: sanitize error
│   │   └── OpenCti/HealthController.php            # MODIFY: sanitize error
│   ├── Models/
│   │   └── DarkWebTask.php                         # NEW: Eloquent model
│   └── Providers/
│       └── AppServiceProvider.php                  # MODIFY: add rate limiters
├── database/migrations/
│   └── 2026_04_12_000001_create_dark_web_tasks_table.php  # NEW
├── routes/
│   └── api.php                                     # MODIFY: add throttle middleware
└── tests/Feature/
    ├── DarkWeb/DarkWebOwnershipTest.php            # NEW
    ├── RateLimit/ApiSearchRateLimitTest.php         # NEW
    ├── RateLimit/OAuthRateLimitTest.php             # NEW
    ├── RateLimit/EmailVerifyRateLimitTest.php       # NEW
    ├── ThreatSearch/ResponseStrippingTest.php       # NEW
    └── ErrorSanitization/ErrorSanitizationTest.php  # NEW
```

### Pattern 1: IDOR Fix -- Task Ownership Table

**What:** Create `dark_web_tasks` table to map task_id to user_id. On search start, insert the mapping. On status check, verify the authenticated user owns the task.

**Migration schema (Claude's discretion):**
```php
Schema::create('dark_web_tasks', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->string('task_id', 256)->unique();
    $table->timestamp('created_at')->useCurrent();
});
```

**Key decisions:**
- `task_id` column with unique index for fast lookups
- `user_id` foreign key to users table with cascade delete
- No `updated_at` needed (write-once record)
- Single index on `task_id` is sufficient since lookups are by task_id

**Controller changes in `DarkWeb\SearchController`:**

In `__invoke()` -- after `startSearch()` succeeds, before returning:
```php
DarkWebTask::create([
    'user_id' => $request->user()->id,
    'task_id' => $taskId,
]);
```

In `status()` -- before proxying to provider:
```php
$task = DarkWebTask::where('task_id', $taskId)->first();

if (!$task || $task->user_id !== $request->user()->id) {
    return response()->json([
        'message' => 'Forbidden.',
    ], 403);
}
```

### Pattern 2: Rate Limiting in AppServiceProvider

**What:** Define named rate limiters in `AppServiceProvider::boot()` following the existing `auth` limiter pattern.

**Implementation:**
```php
// 30 requests/min for search and credit endpoints
RateLimiter::for('api-search', function (Request $request) {
    return Limit::perMinute(30)->by(
        $request->user()?->id ?: $request->ip()
    );
});

// 10 requests/min for OAuth redirect
RateLimiter::for('oauth-redirect', function (Request $request) {
    return Limit::perMinute(10)->by($request->ip());
});
```

**Route changes in `api.php`:**
```php
// OAuth redirect -- add throttle
Route::get('/auth/{provider}/redirect', [SocialAuthController::class, 'redirect'])
    ->middleware('throttle:oauth-redirect');

// Search + credits -- add throttle (outside auth group since they're public)
Route::post('/ip-search', SearchController::class)
    ->middleware(['deduct-credit', 'throttle:api-search']);
Route::post('/threat-search', ThreatSearchController::class)
    ->middleware(['deduct-credit', 'throttle:api-search']);
Route::get('/credits', CreditStatusController::class)
    ->middleware('throttle:api-search');
```

**Claude's discretion recommendation:** Use separate `RateLimiter::for()` calls for `api-search` and `oauth-redirect`. They have different limits and keying strategies, so separating them is clearer.

### Pattern 3: Compound Throttle for Email Verification

**What:** Add a per-day cap alongside the existing per-minute throttle.

**AppServiceProvider:**
```php
RateLimiter::for('email-verify-daily', function (Request $request) {
    return Limit::perDay(20)->by(
        $request->user()?->id ?: $request->ip()
    );
});
```

**Route change:**
```php
Route::post('/email/verification-notification', ResendVerificationController::class)
    ->middleware(['throttle:6,1', 'throttle:email-verify-daily'])
    ->name('verification.send');
```

Laravel allows stacking multiple `throttle:` middleware. Both limits are enforced independently.

### Pattern 4: Response Stripping

**What:** Remove the `'raw' => $observable` key from `ThreatSearchService::buildResponse()`.

**Current code (line 208):**
```php
'raw' => $observable,  // REMOVE THIS LINE
```

**Frontend field usage analysis (verified via grep):**
The frontend (`ThreatSearchPage.jsx`) uses these fields from the response:
- `query`, `detected_type`, `found`, `score` -- header/score display
- `labels` -- tag badges
- `description`, `created_by` -- info panel
- `created_at`, `updated_at` -- (available but not prominently displayed)
- `geo` -- geolocation panel
- `relationships` -- D3 graph tab
- `indicators` -- indicators tab
- `sightings` -- sightings tab
- `notes` -- notes tab
- `external_references` -- external refs tab

**NOT used by frontend:** `raw` -- zero grep matches for `.raw` in frontend source.

**Action:** Remove the single `'raw' => $observable` line. All other fields in `buildResponse()` are curated and used by the frontend.

### Anti-Patterns to Avoid
- **Returning 404 for IDOR:** D-02 explicitly chose 403 over 404. 404 would let attackers enumerate valid task IDs by distinguishing "not found" from "not authorized."
- **Rate limiting by session:** Use user ID or IP, never session token. Session tokens rotate and can be forged.
- **Conditional error messages based on APP_DEBUG:** Never expose debug info in API responses regardless of environment. Log it server-side instead.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rate limiting | Custom middleware with counters | Laravel `RateLimiter::for()` + `throttle:` middleware | Handles atomic counting, cache backend, headers (X-RateLimit-*), 429 responses |
| Request throttle headers | Manual header injection | Laravel's built-in throttle middleware | Automatically sets Retry-After, X-RateLimit-Limit, X-RateLimit-Remaining |
| Task-to-user mapping | In-memory map or cache | Database table with foreign key | Persistent, survives restarts, enforceable with DB constraints |

## Common Pitfalls

### Pitfall 1: Rate Limiter Cache Driver
**What goes wrong:** Rate limiters silently fail when cache driver is `array` (resets every request in testing).
**Why it happens:** Test environment uses `CACHE_STORE=array` by default.
**How to avoid:** In tests, explicitly assert 429 status after loop of requests. The `array` driver still counts within a single test method for `withoutExceptionHandling()` disabled tests. For rate limit tests, do NOT use `RefreshDatabase` trait if it interferes -- rate limits use cache, not database.
**Warning signs:** Rate limit tests always pass or always fail regardless of request count.

### Pitfall 2: Middleware Order on Search Routes
**What goes wrong:** If `throttle:api-search` is placed after `deduct-credit`, the credit is deducted even when the request is rate-limited.
**Why it happens:** Middleware executes in order of declaration.
**How to avoid:** Place `throttle:api-search` before `deduct-credit` in the middleware array: `->middleware(['throttle:api-search', 'deduct-credit'])`.
**Warning signs:** Users lose credits even when receiving 429 responses.

### Pitfall 3: DarkWebTask Creation Race Condition
**What goes wrong:** If the `DarkWebTask::create()` fails (e.g., duplicate task_id), the search starts but the ownership record is never written, permanently orphaning the task.
**Why it happens:** External provider returns the same task_id for duplicate queries within a window.
**How to avoid:** Use `firstOrCreate` instead of `create` for the task record, keyed on `task_id`. Or wrap in try-catch and handle the unique constraint violation gracefully.
**Warning signs:** Status checks return 403 for tasks the user legitimately started.

### Pitfall 4: Stacking Throttle Middleware
**What goes wrong:** Adding a second `throttle:` middleware on the email verification route might conflict with the existing inline `throttle:6,1`.
**Why it happens:** Both throttle middleware share the same cache but use different keys.
**How to avoid:** This actually works fine in Laravel -- each named limiter uses its own cache key. The inline `throttle:6,1` uses a key based on the route+IP, while `throttle:email-verify-daily` uses the key defined in the `RateLimiter::for()` callback. They are independent.
**Warning signs:** None expected -- this is a non-issue, documented here for awareness.

## Code Examples

### Error Sanitization -- EnrichmentController (API-03)
```php
// Source: backend/app/Http/Controllers/ThreatActor/EnrichmentController.php
// BEFORE (leaks exception message):
catch (OpenCtiQueryException $e) {
    return response()->json([
        'message' => 'Enrichment query failed: ' . $e->getMessage(),
    ], 502);
}

// AFTER (generic message, server-side log):
catch (OpenCtiQueryException $e) {
    Log::error('OpenCTI enrichment query failed', [
        'threat_actor_id' => $id,
        'exception' => $e->getMessage(),
        'trace' => $e->getTraceAsString(),
    ]);

    return response()->json([
        'message' => 'Service temporarily unavailable.',
    ], 502);
}
```

### Error Sanitization -- HealthController (API-04)
```php
// Source: backend/app/Http/Controllers/OpenCti/HealthController.php
// BEFORE (leaks exception message):
catch (OpenCtiConnectionException|OpenCtiQueryException $e) {
    return response()->json([
        'status' => 'error',
        'message' => $e->getMessage(),
    ], 503);
}

// AFTER (generic message, server-side log):
catch (OpenCtiConnectionException|OpenCtiQueryException $e) {
    Log::error('OpenCTI health check failed', [
        'exception' => $e->getMessage(),
        'trace' => $e->getTraceAsString(),
    ]);

    return response()->json([
        'status' => 'error',
        'message' => 'Service temporarily unavailable.',
    ], 503);
}
```

### Rate Limiter Definition -- AppServiceProvider
```php
// Source: Laravel 12 docs / existing pattern in AppServiceProvider
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;

// In boot():
RateLimiter::for('api-search', function (Request $request) {
    return Limit::perMinute(30)->by(
        $request->user()?->id ?: $request->ip()
    );
});

RateLimiter::for('oauth-redirect', function (Request $request) {
    return Limit::perMinute(10)->by($request->ip());
});

RateLimiter::for('email-verify-daily', function (Request $request) {
    return Limit::perDay(20)->by(
        $request->user()?->id ?: $request->ip()
    );
});
```

### IDOR Test Example
```php
// Pest test for IDOR protection
test('dark web status returns 403 for non-owner', function () {
    $owner = User::factory()->create(['email_verified_at' => now()]);
    $intruder = User::factory()->create(['email_verified_at' => now()]);

    // Create task owned by $owner
    DarkWebTask::create([
        'user_id' => $owner->id,
        'task_id' => 'test-task-123',
    ]);

    // Intruder tries to access
    $response = $this->actingAs($intruder)
        ->getJson('/api/dark-web/status/test-task-123');

    $response->assertStatus(403);
});
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Pest 3.8+ (on PHPUnit 11.5) |
| Config file | `backend/phpunit.xml` |
| Quick run command | `cd backend && php artisan test --filter=DarkWebOwnership --filter=RateLimit --filter=ErrorSanitization --filter=ResponseStripping` |
| Full suite command | `cd backend && php artisan test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| API-01 | Non-owner gets 403 on dark-web status | Feature | `php artisan test tests/Feature/DarkWeb/DarkWebOwnershipTest.php -x` | Wave 0 |
| API-01 | Owner gets 200 on dark-web status | Feature | Same file | Wave 0 |
| API-01 | Task record created on search start | Feature | Same file | Wave 0 |
| API-02 | 429 after 30 requests on /ip-search, /threat-search, /credits | Feature | `php artisan test tests/Feature/RateLimit/ApiSearchRateLimitTest.php -x` | Wave 0 |
| API-03 | EnrichmentController returns generic message on OpenCTI failure | Feature | `php artisan test tests/Feature/ErrorSanitization/ErrorSanitizationTest.php -x` | Wave 0 |
| API-04 | HealthController returns generic 503 on failure | Feature | Same file | Wave 0 |
| API-05 | Threat search response has no 'raw' key | Feature | `php artisan test tests/Feature/ThreatSearch/ResponseStrippingTest.php -x` | Wave 0 |
| API-06 | OAuth redirect returns 429 after 10 requests | Feature | `php artisan test tests/Feature/RateLimit/OAuthRateLimitTest.php -x` | Wave 0 |
| API-07 | Email verify resend returns 429 after 20/day | Feature | `php artisan test tests/Feature/RateLimit/EmailVerifyRateLimitTest.php -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd backend && php artisan test --filter=<relevant_test_class> -x`
- **Per wave merge:** `cd backend && php artisan test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/Feature/DarkWeb/DarkWebOwnershipTest.php` -- covers API-01
- [ ] `tests/Feature/RateLimit/ApiSearchRateLimitTest.php` -- covers API-02
- [ ] `tests/Feature/RateLimit/OAuthRateLimitTest.php` -- covers API-06
- [ ] `tests/Feature/RateLimit/EmailVerifyRateLimitTest.php` -- covers API-07
- [ ] `tests/Feature/ErrorSanitization/ErrorSanitizationTest.php` -- covers API-03, API-04
- [ ] `tests/Feature/ThreatSearch/ResponseStrippingTest.php` -- covers API-05
- [ ] `app/Models/DarkWebTask.php` -- Eloquent model for migration
- [ ] Migration `create_dark_web_tasks_table` -- schema for IDOR fix

## Open Questions

1. **Log::error context payload structure**
   - What we know: Need exception message + trace at minimum
   - What's unclear: Whether to include request context (IP, user_id, URL)
   - Recommendation: Include `exception`, `trace`, and contextual identifier (e.g., `threat_actor_id` for enrichment, nothing extra for health check). Keep it simple per D-08 spirit.

2. **DarkWebTask cleanup**
   - What we know: Tasks accumulate over time in the table
   - What's unclear: Whether a cleanup mechanism is needed now
   - Recommendation: Defer. Table grows slowly (only on dark-web searches). Can add a scheduled prune command later if needed.

## Sources

### Primary (HIGH confidence)
- `backend/app/Http/Controllers/DarkWeb/SearchController.php` -- current IDOR-vulnerable code inspected
- `backend/app/Http/Controllers/ThreatActor/EnrichmentController.php` -- error message leak confirmed (line 28)
- `backend/app/Http/Controllers/OpenCti/HealthController.php` -- error message leak confirmed (line 21)
- `backend/app/Services/ThreatSearchService.php` -- `'raw' => $observable` on line 208 confirmed
- `backend/app/Providers/AppServiceProvider.php` -- existing rate limiter pattern confirmed
- `backend/routes/api.php` -- all route definitions and existing middleware inspected
- `frontend/src/pages/ThreatSearchPage.jsx` -- frontend field usage verified (no `raw` usage)
- `backend/tests/Feature/DarkWeb/DarkWebSearchTest.php` -- existing test patterns for Pest + HTTP faking

### Secondary (MEDIUM confidence)
- Laravel 12 rate limiting docs (verified against existing codebase patterns)
- Laravel throttle middleware stacking behavior (verified conceptually, standard Laravel feature)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all features use built-in Laravel, no new packages
- Architecture: HIGH -- all patterns follow existing codebase conventions (verified by reading code)
- Pitfalls: HIGH -- identified from direct code inspection and known Laravel behaviors

**Research date:** 2026-04-11
**Valid until:** 2026-05-11 (stable -- no fast-moving dependencies)
