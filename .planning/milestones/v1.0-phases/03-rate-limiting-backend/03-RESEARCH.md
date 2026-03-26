# Phase 3: Rate Limiting Backend - Research

**Researched:** 2026-03-13
**Domain:** Laravel credit-based rate limiting, middleware, database design
**Confidence:** HIGH

## Summary

This phase builds a credit-based rate limiting system for the IOC search endpoint using Laravel 12 with Sanctum cookie auth already in place. The core pieces are: a `credits` table with lazy midnight-UTC reset, a `search_logs` table for usage history, a `DeductCredit` middleware that works for both guests (by IP) and authenticated users (by user ID), a POST endpoint for IOC search returning mock data, and a GET endpoint for credit status.

The existing codebase already uses `RateLimiter::for()` patterns, invokable single-action controllers, Pest 3.8 for testing, and Sanctum stateful API auth with Origin headers. This phase follows those established patterns exactly. No new packages are needed -- everything is achievable with Laravel's built-in middleware system, Eloquent models, and the existing Sanctum auth stack.

**Primary recommendation:** Implement as a `DeductCredit` middleware registered as an alias in `bootstrap/app.php`, with an Eloquent `Credit` model using lazy reset logic, and invokable controllers for IOC search and credit status.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Single shared credit pool (not per-module) -- 10 credits/day for authenticated, 1/day for guests
- Credits stored in a `credits` database table keyed by user_id (authenticated) or IP address (guests, user_id null)
- Lazy reset on access: check if last reset was before today's midnight UTC, if so reset to full credits -- no cron needed
- Guest credit rows auto-purged after 7 days via scheduled artisan command
- Separate `search_logs` table records usage history: user_id/ip, module, query, timestamp
- Credit deduction implemented as middleware (`deduct-credit`) applied to any rate-limited route
- Middleware works for both guests and authenticated users on the same route
- POST /api/ioc/search with single `query` field -- backend auto-detects indicator type via regex
- Returns mock threat data server-side with credit info in response
- GET /api/credits -- returns remaining, limit, resets_at for both guests and authenticated
- 429 response: `{ message, remaining: 0, limit, resets_at, is_guest: bool }`
- Guest identification via `$request->ip()` with trusted proxy support
- Add `trial_ends_at` column to users table (set to created_at + 30 days) -- no enforcement yet
- Cookie-based Sanctum SPA auth (established in Phase 1/2)

### Claude's Discretion
- IOC type detection regex patterns
- Mock data structure and content
- Credit middleware implementation details
- Search logs table schema
- Test structure and assertion granularity

### Deferred Ideas (OUT OF SCOPE)
- 30-day trial to paid subscription system
- Dark web search module
- OAuth users setting a password
- Per-module credit costs (weighted credits)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| RATE-01 | Guest users limited to 1 IOC lookup per day, keyed by IP address | Credit table with ip_address key, DeductCredit middleware checks/deducts, guest default limit = 1 |
| RATE-02 | Signed-in users limited to 10 IOC lookups per day, keyed by user ID | Credit table with user_id key, DeductCredit middleware checks auth status, authenticated limit = 10 |
| RATE-03 | Rate limit counters reset at midnight UTC | Lazy reset: on each access, compare `last_reset_at` with today's midnight UTC; if stale, reset `remaining` to limit |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Laravel Framework | ^12.0 | Backend framework | Already installed |
| Laravel Sanctum | ^4.0 | SPA cookie auth | Already installed, determines guest vs auth |
| Pest | ^3.8 | Test framework | Already installed, established test patterns |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Eloquent ORM | (built-in) | Credit and SearchLog models | All database operations |
| Laravel Middleware | (built-in) | DeductCredit middleware | Rate limit enforcement |
| Laravel Scheduler | (built-in) | Guest row cleanup | `schedule:run` for 7-day purge |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Database credits table | Redis + Cache | Redis adds infrastructure; DB is simpler, already have MySQL, and audit trail is built-in |
| Custom middleware | `RateLimiter::for()` | Built-in rate limiter uses cache, not DB; doesn't support lazy reset or credit pooling across modules |
| Lazy reset | Cron job to reset all rows | Cron adds ops burden; lazy reset is zero-infrastructure and handles edge cases naturally |

**Installation:**
```bash
# No new packages needed -- all built-in to Laravel
```

## Architecture Patterns

### Recommended Project Structure
```
backend/
  app/
    Http/
      Controllers/
        Ioc/
          SearchController.php       # Invokable, POST /api/ioc/search
        Credit/
          CreditStatusController.php # Invokable, GET /api/credits
      Middleware/
        DeductCredit.php             # Credit check + deduction
      Requests/
        IocSearchRequest.php         # Validates 'query' field
    Models/
      Credit.php                     # Eloquent model with lazy reset
      SearchLog.php                  # Eloquent model for audit
    Services/
      IocDetectorService.php         # Regex IOC type detection
      MockThreatDataService.php      # Mock data generator
  database/
    migrations/
      xxxx_create_credits_table.php
      xxxx_create_search_logs_table.php
      xxxx_add_trial_ends_at_to_users_table.php
  routes/
    api.php                          # Add IOC + credit routes
    console.php                      # Schedule guest purge command
```

### Pattern 1: DeductCredit Middleware with Lazy Reset
**What:** Middleware that resolves the user's credit row, performs lazy reset if stale, checks remaining > 0, deducts 1, or returns 429.
**When to use:** Applied to any route that costs a credit.
**Example:**
```php
// DeductCredit middleware
public function handle(Request $request, Closure $next): Response
{
    $credit = $this->resolveCredit($request);

    // Lazy reset: if last_reset_at is before today midnight UTC
    if ($credit->last_reset_at->lt(now()->utc()->startOfDay())) {
        $credit = $credit->replicate(); // immutable pattern
        $credit->remaining = $credit->limit;
        $credit->last_reset_at = now()->utc()->startOfDay();
        $credit->save();
    }

    if ($credit->remaining <= 0) {
        return response()->json([
            'message' => $credit->user_id
                ? 'Daily limit reached'
                : 'Sign in for more lookups',
            'remaining' => 0,
            'limit' => $credit->limit,
            'resets_at' => now()->utc()->addDay()->startOfDay()->toISOString(),
            'is_guest' => is_null($credit->user_id),
        ], 429);
    }

    $credit->decrement('remaining');

    // Store credit on request for controller to include in response
    $request->attributes->set('credit', $credit->fresh());

    return $next($request);
}

private function resolveCredit(Request $request): Credit
{
    if ($user = $request->user()) {
        return Credit::firstOrCreate(
            ['user_id' => $user->id],
            ['remaining' => 10, 'limit' => 10, 'last_reset_at' => now()->utc()->startOfDay()]
        );
    }

    return Credit::firstOrCreate(
        ['ip_address' => $request->ip(), 'user_id' => null],
        ['remaining' => 1, 'limit' => 1, 'last_reset_at' => now()->utc()->startOfDay()]
    );
}
```

### Pattern 2: Invokable Controller with Credit Response
**What:** Single-action controller that returns mock data plus credit info from middleware.
**Example:**
```php
// SearchController
public function __invoke(IocSearchRequest $request): JsonResponse
{
    $query = $request->validated()['query'];
    $type = IocDetectorService::detect($query);
    $data = MockThreatDataService::generate($type, $query);
    $credit = $request->attributes->get('credit');

    SearchLog::create([
        'user_id' => $request->user()?->id,
        'ip_address' => $request->ip(),
        'module' => 'ioc_search',
        'query' => $query,
    ]);

    return response()->json([
        'data' => $data,
        'credits' => [
            'remaining' => $credit->remaining,
            'limit' => $credit->limit,
            'resets_at' => now()->utc()->addDay()->startOfDay()->toISOString(),
        ],
    ]);
}
```

### Pattern 3: Optional Auth Route Group
**What:** Routes that work for both guests and authenticated users using Sanctum's optional guard.
**Example:**
```php
// In routes/api.php -- optional auth (no 401 for guests)
Route::middleware(['web'])->group(function () {
    Route::post('/ioc/search', SearchController::class)->middleware('deduct-credit');
    Route::get('/credits', CreditStatusController::class);
});
```
**Key insight:** Since Sanctum uses cookie/session auth via `statefulApi()`, the session middleware is already loaded. `$request->user()` returns null for guests and the user for authenticated -- no extra middleware needed to make auth "optional."

### Anti-Patterns to Avoid
- **Putting credit logic in controllers:** Breaks extensibility -- new modules would duplicate logic. Use middleware.
- **Using Carbon::today() without UTC:** Server timezone may differ. Always use `now()->utc()->startOfDay()`.
- **Race condition on decrement:** Use `decrement()` (atomic SQL) not `$credit->remaining -= 1; $credit->save()`.
- **Mutating credit object in middleware then passing it:** Use `$credit->fresh()` or re-query after decrement to get accurate remaining count.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| IOC type detection | Complex parser | Simple regex map (IP/domain/hash/URL patterns) | Well-known regex patterns exist for each IOC type |
| Atomic counter decrement | Manual read-decrement-write | Eloquent `decrement()` method | Generates `UPDATE SET remaining = remaining - 1` -- atomic, no race condition |
| Middleware registration | Manual kernel editing | `bootstrap/app.php` alias (Laravel 12) | Laravel 12 uses `withMiddleware()` not `Kernel.php` |
| Date comparison for reset | Manual timestamp math | Carbon `lt()` and `startOfDay()` | Carbon handles timezone, DST, leap seconds |

## Common Pitfalls

### Pitfall 1: Race Condition on Credit Check + Deduct
**What goes wrong:** Two simultaneous requests both read remaining=1, both pass check, both deduct, user gets 2 uses on last credit.
**Why it happens:** Read-check-write is not atomic.
**How to avoid:** Use `UPDATE credits SET remaining = remaining - 1 WHERE remaining > 0 AND id = ?` and check affected rows. If 0 rows affected, credit was exhausted.
**Warning signs:** Users occasionally getting one extra request through.

### Pitfall 2: Timezone Mismatch on Reset
**What goes wrong:** Credits reset at midnight server time, not midnight UTC.
**Why it happens:** Using `Carbon::today()` without explicit UTC timezone.
**How to avoid:** Always use `now('UTC')->startOfDay()` or `Carbon::now('UTC')->startOfDay()`.
**Warning signs:** Reset timing differs from expected midnight UTC.

### Pitfall 3: Guest IP Behind Proxy
**What goes wrong:** All guests share one IP (the load balancer/proxy IP), getting one combined credit.
**Why it happens:** `$request->ip()` returns proxy IP without trusted proxy config.
**How to avoid:** Configure `TrustProxies` middleware in `bootstrap/app.php`. Laravel 12 has `$middleware->trustProxies(at: '*')` or specific proxy IPs.
**Warning signs:** All guest users appear to share the same rate limit.

### Pitfall 4: Sanctum Optional Auth Not Working
**What goes wrong:** `$request->user()` always returns null even for logged-in users.
**Why it happens:** Route not going through Sanctum's stateful middleware.
**How to avoid:** The `statefulApi()` call in `bootstrap/app.php` already applies session middleware to all `/api` routes. Ensure the request includes cookies (withCredentials) and comes from a stateful domain.
**Warning signs:** Credit always resolves as guest even for logged-in users.

### Pitfall 5: firstOrCreate Race Condition
**What goes wrong:** Two simultaneous first requests create duplicate credit rows.
**Why it happens:** Both requests find no row, both try to insert.
**How to avoid:** Add unique composite index on `(user_id)` for authenticated and `(ip_address)` where `user_id IS NULL` for guests. Use `try/catch` with `QueryException` to handle duplicate key, then re-fetch.
**Warning signs:** Duplicate credit rows in database.

## Code Examples

### Credits Table Migration
```php
Schema::create('credits', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
    $table->string('ip_address', 45)->nullable(); // IPv6 max length
    $table->integer('remaining')->unsigned();
    $table->integer('limit')->unsigned();
    $table->timestamp('last_reset_at');
    $table->timestamps();

    // Unique constraints to prevent duplicates
    $table->unique('user_id'); // One row per authenticated user
    $table->index('ip_address'); // Index for guest lookups
});
```

### Search Logs Table Migration
```php
Schema::create('search_logs', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
    $table->string('ip_address', 45);
    $table->string('module', 50); // 'ioc_search', future: 'dark_web', etc.
    $table->text('query');
    $table->timestamp('created_at');

    $table->index(['user_id', 'created_at']);
    $table->index(['ip_address', 'created_at']);
});
```

### Trial Column Migration
```php
Schema::table('users', function (Blueprint $table) {
    $table->timestamp('trial_ends_at')->nullable()->after('email_verified_at');
});
```

### IOC Type Detection Service
```php
class IocDetectorService
{
    private const PATTERNS = [
        'ipv4' => '/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/',
        'ipv6' => '/^([0-9a-fA-F]{1,4}:){2,7}[0-9a-fA-F]{1,4}$/',
        'domain' => '/^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/',
        'md5' => '/^[a-fA-F0-9]{32}$/',
        'sha1' => '/^[a-fA-F0-9]{40}$/',
        'sha256' => '/^[a-fA-F0-9]{64}$/',
        'url' => '/^https?:\/\/.+/',
    ];

    public static function detect(string $query): string
    {
        $query = trim($query);
        foreach (self::PATTERNS as $type => $pattern) {
            if (preg_match($pattern, $query)) {
                return $type;
            }
        }
        return 'unknown';
    }
}
```

### Middleware Registration (Laravel 12)
```php
// bootstrap/app.php
->withMiddleware(function (Middleware $middleware): void {
    $middleware->statefulApi();
    $middleware->append(\App\Http\Middleware\SecurityHeaders::class);
    $middleware->alias([
        'deduct-credit' => \App\Http\Middleware\DeductCredit::class,
    ]);
})
```

### Atomic Credit Deduction (Race-Safe)
```php
// Instead of read-check-write, use atomic UPDATE
$affected = Credit::where('id', $credit->id)
    ->where('remaining', '>', 0)
    ->update(['remaining' => DB::raw('remaining - 1')]);

if ($affected === 0) {
    // Credit exhausted between check and deduct
    return $this->rateLimitResponse($credit);
}
```

### Guest Cleanup Command
```php
// app/Console/Commands/PurgeGuestCredits.php
// Register in routes/console.php:
Schedule::command('credits:purge-guests')->daily();

// Command logic:
Credit::whereNull('user_id')
    ->where('updated_at', '<', now()->subDays(7))
    ->delete();
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `app/Http/Kernel.php` middleware | `bootstrap/app.php` `withMiddleware()` | Laravel 11+ | Middleware aliases registered differently |
| `Artisan::command()` in console.php | `Schedule::command()` in `routes/console.php` | Laravel 11+ | Scheduling defined in routes file |
| `$this->middleware()` in controller | Middleware in route definition or `bootstrap/app.php` | Laravel 11+ | Controllers no longer have middleware methods |

## Open Questions

1. **Guest IP uniqueness for composite index**
   - What we know: MySQL doesn't support partial unique indexes (WHERE user_id IS NULL)
   - What's unclear: Best approach for preventing duplicate guest rows
   - Recommendation: Use application-level `firstOrCreate` with try/catch for duplicate key exception. The `ip_address` index handles lookup performance. Alternatively, use a sentinel value (0) for guest user_id with a unique composite index on `(user_id, ip_address)`.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Pest 3.8 |
| Config file | `backend/phpunit.xml` |
| Quick run command | `cd backend && php artisan test --filter=Credit` |
| Full suite command | `cd backend && php artisan test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RATE-01 | Guest limited to 1/day by IP | feature | `php artisan test --filter=GuestCreditLimitTest` | No - Wave 0 |
| RATE-02 | Auth user limited to 10/day by user ID | feature | `php artisan test --filter=AuthCreditLimitTest` | No - Wave 0 |
| RATE-03 | Credits reset at midnight UTC | feature | `php artisan test --filter=CreditResetTest` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `cd backend && php artisan test --filter=Credit`
- **Per wave merge:** `cd backend && php artisan test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/Feature/Credit/GuestCreditLimitTest.php` -- covers RATE-01
- [ ] `tests/Feature/Credit/AuthCreditLimitTest.php` -- covers RATE-02
- [ ] `tests/Feature/Credit/CreditResetTest.php` -- covers RATE-03
- [ ] `tests/Feature/Ioc/IocSearchTest.php` -- covers IOC search endpoint
- [ ] `tests/Feature/Credit/CreditStatusTest.php` -- covers GET /api/credits

## Sources

### Primary (HIGH confidence)
- Existing codebase: `backend/app/Providers/AppServiceProvider.php` -- established RateLimiter and middleware patterns
- Existing codebase: `backend/bootstrap/app.php` -- Laravel 12 middleware registration pattern
- Existing codebase: `backend/routes/api.php` -- route grouping and middleware application patterns
- Existing codebase: `backend/composer.json` -- confirmed Laravel 12, Sanctum 4, Pest 3.8

### Secondary (MEDIUM confidence)
- Laravel 12 middleware alias registration via `withMiddleware()` -- verified from existing `bootstrap/app.php`
- Eloquent `decrement()` generates atomic SQL -- standard Laravel behavior, well-documented

### Tertiary (LOW confidence)
- MySQL partial unique index limitation -- known constraint, but workaround approach (sentinel value vs application logic) needs validation during implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed, patterns established in Phase 1/2
- Architecture: HIGH -- follows existing codebase patterns (invokable controllers, middleware, Eloquent)
- Pitfalls: HIGH -- race conditions and timezone issues are well-known in rate limiting systems

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (stable Laravel 12 patterns)
