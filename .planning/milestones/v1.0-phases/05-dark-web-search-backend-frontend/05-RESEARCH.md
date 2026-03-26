# Phase 5: Dark Web Search Backend + Frontend - Research

**Researched:** 2026-03-13
**Domain:** Laravel API proxy + React search UI for breach data
**Confidence:** HIGH

## Summary

Phase 5 adds a Dark Web breach search feature with a Laravel backend proxy to an external breach data provider API (e.g., LeakCheck, Snusbase, or similar) and a React frontend search page. The backend pattern is nearly identical to the existing IOC search endpoint: an invokable controller with a Form Request, the `DeductCredit` middleware, and a `SearchLog` entry. The key new element is the outbound HTTP call via Laravel's `Http` facade, with error handling that refunds credits on provider failure.

The frontend builds a new search page with a centered-to-top Google-style transition, email/domain toggle, credit badge (shared with IP Search), and breach result cards. All UI primitives (glassmorphism cards, chip classes, dark theme tokens) already exist. The page is behind `ProtectedRoute` in `App.jsx` already -- the `/dark-web` route is inside the protected group.

**Primary recommendation:** Follow the established invokable-controller + middleware pattern exactly. Use Laravel's `Http` facade with `timeout()` and `retry()` for the provider call. Wrap the provider call in try/catch and refund credits on failure. Build the frontend as a single `DarkWebPage.jsx` with extracted `CreditBadge` and `BreachCard` components.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Card-based layout, one card per breach result -- glassmorphism styled to match existing design system
- Key fields shown on each card: email, password (partially masked -- first 2-3 chars + dots), source name, breach date
- Extra fields (name, phone, etc.) in a collapsible "More" section per card
- Results summary header above cards: "X breaches found for [query]" with credit badge
- Pill-style credit badge next to search bar, always visible (fetched on page load via GET /api/credits)
- Color shifts based on remaining: cyan (>50%), amber (<50%), red (0) -- uses existing .chip CSS classes
- Badge appears on BOTH Dark Web page AND IP Search page (shared credit pool)
- Explicit Email/Domain toggle switch (not auto-detect) -- user picks type before searching
- Centered layout on initial load: icon, "Dark Web Search" heading, tagline, toggle + search bar + credit badge
- After search: search bar transitions to top of page, results fill below (Google-style pattern)
- Recent queries dropdown (last 5) stored in localStorage, shown on input focus
- Credits at 0: search bar disabled/grayed out, inline message "Daily limit reached. Your credits reset at 00:00 UTC."
- API provider failure: red-tinted inline error card with "Something went wrong" + Retry button. "No credit was deducted."
- No results (valid query, zero breaches): green success card. Credit IS deducted for successful zero-result searches
- Invalid query: client-side validation before submission
- POST /api/dark-web/search endpoint -- accepts { query, type } where type is "email" or "domain"
- Applies deduct-credit middleware (same as IOC search)
- If provider returns error: refund the deducted credit before returning error response
- Response includes breach data + credit info (remaining, limit, resets_at)
- Dark Web page requires authentication -- unauthenticated users redirected to /login

### Claude's Discretion
- Exact card styling, spacing, and responsive grid layout
- Search bar transition animation (centered to top)
- Loading skeleton/spinner during search
- Toggle switch component design
- Recent queries dropdown styling
- Credit refund implementation approach (try/catch around provider call)
- Retry button behavior (re-submit same query)
- Backend validation and error response format

### Deferred Ideas (OUT OF SCOPE)
- IP Search backend wiring: IP Search page still uses mock data -- connecting it to a real API is a separate phase
- Per-module credit costs: Dark web search could cost more credits than IP search -- defer until pricing model is decided
- Export/download results: Allow users to export breach results as CSV/PDF -- future feature
- Saved searches / monitoring: Alert users when new breaches appear for a saved query -- separate phase
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DARKWEB-01 | POST /api/dark-web/search accepts email or domain query, deducts credit, proxies to provider API, returns breach results -- API key in .env never exposed to frontend | Laravel Http facade pattern, DeductCredit middleware reuse, services.php config pattern |
| DARKWEB-02 | Dark Web page (/dark-web) requires authentication -- unauthenticated users redirected to /login | Already inside ProtectedRoute in App.jsx -- no routing change needed |
| DARKWEB-03 | Dark Web page displays persistent credit badge (remaining/total) at all times, updated after each search | GET /api/credits endpoint exists, chip CSS classes exist, CreditBadge component pattern |
| DARKWEB-04 | Authenticated user can search by email or domain and see breach results in themed cards | Frontend DarkWebPage.jsx implementation with BreachCard components |
| DARKWEB-05 | When credits exhausted, search is blocked with "Daily limit reached" message and reset time | DeductCredit middleware already returns 429 with resets_at -- frontend handles this response |
| DARKWEB-06 | Error states (invalid query, provider API failure, network errors) handled with user-friendly UI feedback | Client-side validation, try/catch with credit refund on backend, error card UI |
| RATE-04 | When guest hits rate limit, show "Sign in for more lookups" upgrade CTA | DeductCredit 429 response already includes is_guest flag -- frontend handles display |
| RATE-05 | When signed-in user hits rate limit, show "Daily limit reached" message | DeductCredit 429 response already returns this message |
| FEND-05 | /ioc-search (now /ip-search) is publicly accessible but rate-limited | Already routed as public in App.jsx; credit badge addition connects it to credit system |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Laravel Http facade | 12.x built-in | Outbound HTTP to provider API | Built on Guzzle, provides retry/timeout/fake, no extra dependency |
| React 19 | existing | Frontend page components | Already in project |
| Framer Motion | existing | Search bar centered-to-top animation | Already in project, used elsewhere |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Pest | 3.8 (existing) | Backend feature tests | Testing dark web search endpoint |
| Lucide React | existing | Icons for search, toggle, badges | Already in project |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Http facade | Guzzle directly | Http facade wraps Guzzle with nicer API, retry, fake -- no reason to bypass |
| Framer Motion for transition | CSS transitions | Framer already in project and handles layout animations better |

**Installation:**
No new packages needed. All dependencies are already installed.

## Architecture Patterns

### Recommended Project Structure
```
backend/
  app/Http/Controllers/DarkWeb/
    SearchController.php       # Invokable controller for POST /api/dark-web/search
  app/Http/Requests/
    DarkWebSearchRequest.php   # Form request: query + type validation
  app/Services/
    DarkWebProviderService.php # Http call to provider API, response normalization
  config/
    services.php               # Add dark_web provider config block
  routes/
    api.php                    # Add POST route with auth:sanctum + deduct-credit middleware

frontend/src/
  api/
    dark-web.js                # API functions: searchDarkWeb()
  pages/
    DarkWebPage.jsx            # Full search page (replaces placeholder)
  components/
    shared/
      CreditBadge.jsx          # Reusable credit badge (used by DarkWeb + IpSearch)
      BreachCard.jsx            # Individual breach result card
```

### Pattern 1: Invokable Controller with Provider Service
**What:** Single-action controller delegates to a service class for the external API call
**When to use:** Any endpoint that proxies to an external API
**Example:**
```php
// DarkWeb/SearchController.php -- follows existing Ioc/SearchController pattern
class SearchController extends Controller
{
    public function __invoke(DarkWebSearchRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $credit = $request->attributes->get('credit');

        try {
            $results = app(DarkWebProviderService::class)
                ->search($validated['query'], $validated['type']);
        } catch (\Throwable $e) {
            // Refund the credit deducted by middleware
            DB::table('credits')
                ->where('id', $credit->id)
                ->increment('remaining');
            $credit->refresh();

            return response()->json([
                'message' => 'Something went wrong. No credit was deducted.',
                'credits' => [
                    'remaining' => $credit->remaining,
                    'limit' => $credit->limit,
                    'resets_at' => now('UTC')->addDay()->startOfDay()->toIso8601String(),
                ],
            ], 502);
        }

        SearchLog::create([
            'user_id' => $request->user()->id,
            'ip_address' => $request->ip(),
            'module' => 'dark_web',
            'query' => $validated['query'],
        ]);

        return response()->json([
            'data' => $results,
            'credits' => [
                'remaining' => $credit->remaining,
                'limit' => $credit->limit,
                'resets_at' => now('UTC')->addDay()->startOfDay()->toIso8601String(),
            ],
        ]);
    }
}
```

### Pattern 2: Provider Service with Http Facade
**What:** Encapsulate external API details in a service class
**When to use:** Isolating external API concerns from controller logic
**Example:**
```php
// Services/DarkWebProviderService.php
class DarkWebProviderService
{
    public function search(string $query, string $type): array
    {
        $response = Http::withHeaders([
            'X-API-Key' => config('services.dark_web.api_key'),
        ])
        ->timeout(10)
        ->retry(2, 500, fn ($e) => $e instanceof ConnectionException)
        ->get(config('services.dark_web.base_url') . '/query/' . urlencode($query), [
            'type' => $type,
        ]);

        $response->throw(); // Throws on 4xx/5xx

        $body = $response->json();

        return [
            'found' => $body['found'] ?? 0,
            'results' => $this->normalizeResults($body['result'] ?? []),
        ];
    }

    private function normalizeResults(array $results): array
    {
        return array_map(fn ($item) => [
            'email' => $item['email'] ?? null,
            'password' => $this->maskPassword($item['password'] ?? null),
            'username' => $item['username'] ?? null,
            'source' => $item['source']['name'] ?? 'Unknown',
            'breach_date' => $item['source']['breach_date'] ?? null,
            'first_name' => $item['first_name'] ?? null,
            'last_name' => $item['last_name'] ?? null,
            'phone' => $item['phone'] ?? null,
            'fields' => $item['fields'] ?? [],
        ], $results);
    }

    private function maskPassword(?string $password): ?string
    {
        if ($password === null || strlen($password) === 0) {
            return null;
        }
        $visible = min(3, strlen($password));
        return substr($password, 0, $visible) . str_repeat('*', max(0, strlen($password) - $visible));
    }
}
```

### Pattern 3: Credit Badge Component (Shared)
**What:** Reusable pill badge showing remaining/total credits with color coding
**When to use:** Any page that consumes credits
**Example:**
```jsx
// components/shared/CreditBadge.jsx
function CreditBadge({ remaining, limit }) {
  const ratio = limit > 0 ? remaining / limit : 0;
  const chipClass = remaining === 0
    ? 'chip-red'
    : ratio < 0.5
      ? 'chip-amber'
      : 'chip-cyan';

  return (
    <span className={`${chipClass} text-xs`}>
      {remaining}/{limit}
    </span>
  );
}
```

### Pattern 4: Google-Style Search Transition
**What:** Centered search on initial load, transitions to top after first search
**When to use:** DarkWebPage initial vs results state
**Example:**
```jsx
// Use Framer Motion's layout animation
import { motion, AnimatePresence } from 'framer-motion';

function DarkWebPage() {
  const [hasSearched, setHasSearched] = useState(false);

  return (
    <div className="min-h-[60vh]">
      <motion.div
        layout
        className={hasSearched ? 'pt-0' : 'flex flex-col items-center justify-center min-h-[60vh]'}
        transition={{ duration: 0.4, ease: 'easeInOut' }}
      >
        {/* Search bar, toggle, credit badge */}
      </motion.div>
      {hasSearched && (
        <AnimatePresence>
          {/* Results area */}
        </AnimatePresence>
      )}
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **Exposing provider API key to frontend:** Never pass the API key in frontend code or API responses. All provider calls go through the Laravel proxy.
- **Deducting credit after provider call:** The DeductCredit middleware runs before the controller. Refund on failure, don't try to deduct after success.
- **Auto-detecting query type:** User explicitly chose this to be a toggle. Do not add auto-detection logic.
- **Mutating credit in controller without atomic operation:** Use `DB::table()->increment()` for refunds, not `$credit->update()` which has race conditions.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP client | Raw cURL/file_get_contents | Laravel Http facade | Built-in retry, timeout, fake for tests, exception handling |
| Password masking on frontend | Mask in JS | Mask in backend service | Prevents full password from ever reaching the frontend |
| Email/domain validation | Regex from scratch | Laravel validation rules (email, regex for domain) | Battle-tested, handles edge cases |
| Credit refund race condition | `$credit->remaining += 1; $credit->save()` | `DB::table('credits')->increment('remaining')` | Atomic SQL operation, race-safe |
| Layout animation | CSS keyframes with JS class toggling | Framer Motion layout prop | Handles layout shifts smoothly, already in project |

**Key insight:** The backend is fundamentally a proxy pattern -- the complexity is in error handling and credit refund, not in the HTTP call itself. The frontend is a search page with two states (centered/results) -- the complexity is in state management and transition, not in rendering.

## Common Pitfalls

### Pitfall 1: Credit Deducted on Provider Failure
**What goes wrong:** DeductCredit middleware runs before the controller, so if the provider API call fails, the user loses a credit for nothing.
**Why it happens:** Middleware pipeline executes before controller logic.
**How to avoid:** Wrap provider call in try/catch. On failure, atomically increment the credit back and return 502 with "No credit was deducted" message.
**Warning signs:** Users reporting lost credits without seeing results.

### Pitfall 2: Provider API Key Leaking to Frontend
**What goes wrong:** API key appears in frontend bundle, network tab, or error messages.
**Why it happens:** Accidentally including key in response JSON, or using Vite env vars (VITE_* prefix exposes to frontend).
**How to avoid:** Key in backend `.env` only, accessed via `config('services.dark_web.api_key')`. Never return it in any API response. Never prefix with VITE_.
**Warning signs:** Key visible in browser dev tools.

### Pitfall 3: Provider Timeout Hanging the Request
**What goes wrong:** External API is slow, user waits 30+ seconds with no feedback.
**Why it happens:** Default Guzzle timeout is 30 seconds.
**How to avoid:** Set explicit `timeout(10)` on the Http call. Use `retry(2, 500)` for transient failures. Frontend shows loading state immediately.
**Warning signs:** Requests taking >10 seconds.

### Pitfall 4: Stale Credit Badge After Search
**What goes wrong:** Credit badge shows old count after a search completes.
**Why it happens:** Badge fetched on page load but not updated from search response.
**How to avoid:** Update badge state from the search response's `credits` object, not from a separate GET /api/credits call.
**Warning signs:** Badge shows wrong number until page refresh.

### Pitfall 5: Race Condition on Concurrent Searches
**What goes wrong:** User double-clicks search, two credits deducted, but only one search completes.
**Why it happens:** No debounce/disable on search button during pending request.
**How to avoid:** Disable search button and input while request is in flight (loading state). Use AbortController to cancel previous request if needed.
**Warning signs:** Credits decrementing faster than expected.

### Pitfall 6: Dark Web Route Already Protected but Missing Backend Auth
**What goes wrong:** Frontend ProtectedRoute blocks unauthenticated access, but the API endpoint itself is unprotected.
**Why it happens:** Forgetting `auth:sanctum` middleware on the backend route.
**How to avoid:** Add `auth:sanctum` middleware to the route group. The existing `deduct-credit` middleware does NOT enforce auth -- it handles both guest and auth users.
**Warning signs:** Direct API calls work without session cookie.

## Code Examples

### Backend Route Registration
```php
// routes/api.php -- add to existing file
use App\Http\Controllers\DarkWeb\SearchController as DarkWebSearchController;

Route::middleware('auth:sanctum')->group(function () {
    // ... existing auth routes ...

    // Dark Web search (auth required + credit gated)
    Route::post('/dark-web/search', DarkWebSearchController::class)
        ->middleware('deduct-credit');
});
```

### Form Request Validation
```php
// app/Http/Requests/DarkWebSearchRequest.php
class DarkWebSearchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // auth:sanctum middleware handles authorization
    }

    public function rules(): array
    {
        return [
            'query' => 'required|string|max:320',
            'type' => 'required|in:email,domain',
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $type = $this->input('type');
            $query = $this->input('query');

            if ($type === 'email' && !filter_var($query, FILTER_VALIDATE_EMAIL)) {
                $validator->errors()->add('query', 'Please enter a valid email address.');
            }

            if ($type === 'domain' && !preg_match('/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/', $query)) {
                $validator->errors()->add('query', 'Please enter a valid domain.');
            }
        });
    }
}
```

### Services Config Registration
```php
// config/services.php -- add to existing array
'dark_web' => [
    'api_key' => env('DARK_WEB_API_KEY'),
    'base_url' => env('DARK_WEB_API_URL', 'https://leakcheck.io/api/v2'),
],
```

### Frontend API Functions
```javascript
// api/dark-web.js
import { apiClient } from './client';

export async function searchDarkWeb({ query, type }) {
  return apiClient.post('/api/dark-web/search', { query, type });
}

export async function fetchCredits() {
  return apiClient.get('/api/credits');
}
```

### Frontend Client-Side Validation
```javascript
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOMAIN_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/;

function validateQuery(query, type) {
  if (!query.trim()) return 'Please enter a search query.';
  if (type === 'email' && !EMAIL_REGEX.test(query)) return 'Please enter a valid email address.';
  if (type === 'domain' && !DOMAIN_REGEX.test(query)) return 'Please enter a valid domain.';
  return null;
}
```

### Recent Queries (localStorage)
```javascript
const STORAGE_KEY = 'darkweb_recent_queries';
const MAX_RECENT = 5;

function getRecentQueries() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function addRecentQuery(query, type) {
  const recent = getRecentQueries().filter(r => r.query !== query || r.type !== type);
  const updated = [{ query, type, timestamp: Date.now() }, ...recent].slice(0, MAX_RECENT);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Guzzle directly | Laravel Http facade | Laravel 7+ (2020) | Cleaner API, built-in retry/timeout/fake |
| Token-based API auth | Cookie/session SPA auth (Sanctum) | Already decided | Dark web endpoint uses auth:sanctum session middleware |
| Frontend proxy via CORS bypass | Backend proxy to external API | Standard practice | API key stays server-side, no CORS issues with provider |

**Deprecated/outdated:**
- None relevant -- all patterns in use are current Laravel 12 standard

## Open Questions

1. **Which specific dark web data provider API?**
   - What we know: CONTEXT.md says "external dark web data provider API" generically. LeakCheck v2 API is used as reference pattern.
   - What's unclear: Whether the user has a specific provider in mind or wants a pluggable interface.
   - Recommendation: Build the `DarkWebProviderService` with the LeakCheck v2 API shape as default but make base_url and api_key configurable via `.env`. The service's `normalizeResults()` method acts as an adapter -- easy to swap providers later.

2. **Should RATE-04 and FEND-05 be in this phase?**
   - What we know: REQUIREMENTS.md maps them to Phase 5. RATE-04 is "guest rate limit CTA" and FEND-05 is "/ioc-search publicly accessible but rate-limited."
   - What's unclear: The CONTEXT.md doesn't mention these explicitly.
   - Recommendation: Include the credit badge on IP Search page (FEND-05 connection). RATE-04 is already handled by DeductCredit middleware's 429 response with `is_guest` flag -- just ensure the IP Search frontend renders it.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Pest 3.8 |
| Config file | `backend/phpunit.xml` |
| Quick run command | `cd backend && php artisan test --filter=DarkWeb` |
| Full suite command | `cd backend && php artisan test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DARKWEB-01 | POST endpoint proxies to provider, deducts credit, returns results | integration | `cd backend && php artisan test --filter=DarkWebSearchTest` | Wave 0 |
| DARKWEB-02 | Unauthenticated request returns 401 | integration | `cd backend && php artisan test --filter=DarkWebSearchTest::unauthenticated` | Wave 0 |
| DARKWEB-03 | Response includes credit info | integration | `cd backend && php artisan test --filter=DarkWebSearchTest::credits` | Wave 0 |
| DARKWEB-04 | Valid email/domain search returns breach cards | integration | `cd backend && php artisan test --filter=DarkWebSearchTest::search` | Wave 0 |
| DARKWEB-05 | Zero credits returns 429 with reset time | integration | `cd backend && php artisan test --filter=DarkWebSearchTest::limit` | Wave 0 |
| DARKWEB-06 | Provider failure returns 502, credit refunded | integration | `cd backend && php artisan test --filter=DarkWebSearchTest::provider_error` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd backend && php artisan test --filter=DarkWeb`
- **Per wave merge:** `cd backend && php artisan test`
- **Phase gate:** Full suite green before verification

### Wave 0 Gaps
- [ ] `tests/Feature/DarkWeb/DarkWebSearchTest.php` -- covers DARKWEB-01 through DARKWEB-06
- [ ] Http::fake() stubs for provider API responses (success, empty, error)
- [ ] No frontend tests (project has no test infrastructure for frontend)

## Sources

### Primary (HIGH confidence)
- Laravel 12.x HTTP Client docs (https://laravel.com/docs/12.x/http-client) -- Http facade API, retry, timeout, fake
- Existing codebase: `Ioc/SearchController.php`, `DeductCredit.php`, `CreditStatusController.php` -- established patterns
- Existing codebase: `App.jsx` routing -- ProtectedRoute already wraps /dark-web

### Secondary (MEDIUM confidence)
- LeakCheck API v2 docs (https://wiki.leakcheck.io/en/api/api-v2-pro) -- reference provider API shape
- Existing codebase: `styles/main.css` chip classes, `api/client.js` HTTP client -- verified available

### Tertiary (LOW confidence)
- Specific provider choice -- CONTEXT.md does not name a provider; LeakCheck used as representative example

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in project, no new dependencies
- Architecture: HIGH -- follows exact patterns from Phase 3 (IOC search + credits)
- Pitfalls: HIGH -- derived from established codebase patterns and common proxy API issues
- Provider API shape: MEDIUM -- using LeakCheck as reference, but actual provider may differ

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (stable -- no fast-moving dependencies)
