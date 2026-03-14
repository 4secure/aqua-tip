# Pitfalls Research

**Domain:** OpenCTI GraphQL API integration into existing Laravel + React threat intelligence platform
**Project:** AQUA TIP v2.0 -- OpenCTI Integration
**Researched:** 2026-03-14
**Confidence:** HIGH (based on codebase inspection, OpenCTI docs, Laravel HTTP client docs, community issue reports)

## Critical Pitfalls

### Pitfall 1: Exposing the OpenCTI Bearer Token to the Frontend

**What goes wrong:**
The OpenCTI API token (UUID v4) is stored in JavaScript code, environment variables prefixed with `VITE_`, or passed in frontend API responses. Any user can extract it from browser DevTools (Network tab, source maps, or `import.meta.env`). With this token, they bypass all credit-based rate limiting and have direct, unlimited access to the OpenCTI instance with whatever permissions that token's user has.

**Why it happens:**
Developers want to call the OpenCTI GraphQL endpoint directly from React to avoid building a backend proxy. The `VITE_` prefix in Vite exposes env vars to the browser bundle. It feels like extra work to proxy through Laravel when the API is "just a GraphQL call."

**How to avoid:**
1. Store the OpenCTI API token in Laravel's `.env` as `OPENCTI_API_TOKEN` (no `VITE_` prefix -- never exposed to frontend)
2. All OpenCTI queries go through Laravel controllers using `Http::withToken(config('services.opencti.token'))`
3. The React frontend only calls Laravel API endpoints (`/api/ip-search`, `/api/threat-actors`, etc.) -- never the OpenCTI URL directly
4. Add `OPENCTI_API_TOKEN` to `.env.example` with a placeholder, and to `.gitignore` patterns
5. The OpenCTI base URL (`http://192.168.251.20:8080`) should also be server-side only in `config/services.php`

**Warning signs:**
- Any `VITE_OPENCTI` variable in `.env` or frontend code
- Frontend code importing or referencing `192.168.251.20`
- GraphQL queries constructed in `.jsx` files
- Network tab showing requests to the OpenCTI host from the browser

**Phase to address:**
Phase 1 (Backend service layer setup). Must be the very first decision -- all subsequent code depends on this proxy architecture.

---

### Pitfall 2: OpenCTI GraphQL Over-Fetching and Response Size Explosion

**What goes wrong:**
A single GraphQL query for STIX objects returns deeply nested relationships (created_by, objectMarking, objectLabel, externalReferences, reports, indicators, observedData, etc.). A query like `stixCoreObjects(search: "8.8.8.8")` without field selection or pagination returns megabytes of nested STIX data, causing timeouts, memory exhaustion in Laravel's HTTP client, and slow frontend rendering.

**Why it happens:**
OpenCTI's schema is extremely rich -- STIX objects have deep relationship graphs. Unlike REST APIs where the server decides response shape, GraphQL returns exactly what you ask for -- but developers often copy queries from the GraphQL playground that include `... on` fragments for every possible type. OpenCTI also uses Relay-style cursor pagination, and fetching without `first` limits defaults to returning all matching objects.

**How to avoid:**
1. Write minimal GraphQL queries -- select only the fields the UI actually displays
2. Always specify `first: N` (e.g., `first: 25`) in list queries -- never query without pagination
3. Avoid deep nesting beyond 2 levels (object -> direct relations -> stop)
4. Create dedicated query files in Laravel (e.g., `app/GraphQL/Queries/`) with field selections tailored to each page
5. Set Laravel HTTP client timeout: `Http::timeout(10)` -- fail fast rather than hang
6. Log response sizes during development to catch bloat early

**Warning signs:**
- API responses > 100KB for a single search
- Laravel process memory spikes during OpenCTI calls
- Frontend takes > 2 seconds to render search results
- GraphQL queries with `... on StixDomainObject` fragments listing 20+ fields

**Phase to address:**
Phase 2 (IP Search integration). Build the first query with minimal fields and validate response sizes before expanding.

---

### Pitfall 3: OpenCTI Instance Has No Data (Empty Results Everywhere)

**What goes wrong:**
The integration code is correct, queries work, but every search returns empty results. The Threat Map shows nothing, Threat Actors is blank, Threat News has zero reports. Developers debug the code for hours thinking the queries are wrong, when the actual problem is that the OpenCTI instance has no data ingested.

**Why it happens:**
A fresh OpenCTI instance is an empty shell. Data only appears after connectors (AlienVault OTX, MITRE ATT&CK, AbuseIPDB, etc.) are configured and have completed their initial data import, which can take hours. The instance at `192.168.251.20:8080` may or may not have active connectors. Even with connectors, specific data types (IP observables, geographical locations, intrusion sets, reports) may be sparsely populated.

**How to avoid:**
1. Before writing any integration code, manually check what data exists: open `http://192.168.251.20:8080` in a browser, navigate to Observations > Indicators, Activities > Intrusion Sets, etc.
2. Run a test GraphQL query in the playground first: `{ stixCyberObservables(first: 5) { edges { node { entity_type observable_value } } } }`
3. Design all pages with explicit empty states ("No threat data available. Configure OpenCTI connectors to populate data.")
4. Implement seed/test data as a fallback: if the OpenCTI instance returns zero results for a query, display a helpful message rather than a blank page
5. Document which OpenCTI connectors are needed for each feature (e.g., AbuseIPDB or AlienVault for IP reputation, MITRE ATT&CK for threat actors)

**Warning signs:**
- All searches return `{ edges: [] }` with `pageInfo.hasNextPage: false`
- OpenCTI dashboard shows 0 entities
- Connectors page shows no active connectors or all connectors errored

**Phase to address:**
Phase 1 (Setup and validation). Verify data availability before building any page. If the instance is empty, configure at minimum the MITRE ATT&CK connector (free, provides intrusion sets and attack patterns) and one feed connector.

---

### Pitfall 4: Credit Deduction Before OpenCTI Call Fails (No Refund Path)

**What goes wrong:**
The existing `DeductCredit` middleware runs before the controller. If the credit is deducted but the OpenCTI API call then fails (timeout, connection refused, 500 error), the user loses a credit for a failed search. With only 10 credits/day for authenticated users and 1/day for guests, this is a terrible user experience.

**Why it happens:**
The current middleware pattern (inherited from v1.0) deducts first, then passes to the controller. This was acceptable when the controller used `MockThreatDataService::generate()` which never fails. With a real external API call, failure is not just possible -- it is inevitable (network issues, OpenCTI restarts, maintenance windows).

**How to avoid:**
1. Move credit deduction to after the OpenCTI call succeeds, or implement a refund mechanism
2. Pattern A (preferred): Deduct in middleware, refund in controller's catch block:
   ```php
   try {
       $data = $this->openCtiService->searchIp($query);
   } catch (OpenCtiUnavailableException $e) {
       Credit::where('id', $credit->id)->increment('remaining');
       return response()->json(['error' => 'Threat intelligence service temporarily unavailable'], 503);
   }
   ```
3. Pattern B: Move deduction into the controller after successful response (requires removing `deduct-credit` middleware for OpenCTI routes)
4. The existing Dark Web search (`DarkWeb\SearchController`) already has a credit refund pattern -- follow that precedent
5. Always return a user-friendly error distinguishing "no results found" (valid search, zero hits) from "service unavailable" (OpenCTI down)

**Warning signs:**
- Users report credits disappearing without getting results
- Error logs show OpenCTI connection failures after credit deduction
- No `increment('remaining')` call in any catch block

**Phase to address:**
Phase 2 (IP Search integration). Must be built into the first controller that calls OpenCTI.

---

### Pitfall 5: Codebase Rename IOC -> IP Search Leaves Broken References

**What goes wrong:**
Renaming "IOC" to "IP Search" across the codebase (16 files identified) breaks routes, test expectations, database values, or search logs. A partial rename creates a confusing mix where backend says "ioc" and frontend says "ip-search," or existing `SearchLog` records with `module: 'ioc_search'` become orphaned/inconsistent.

**Why it happens:**
"IOC" appears in: file names (`IocSearchPage.jsx`, `IocSearchTest.php`, `IocSearchRequest.php`, `IocDetectorService.php`), route paths (`/api/ioc/search`), namespaces (`App\Http\Controllers\Ioc`), class names, test assertions, mock data, the sidebar component, and `SearchLog` entries. A find-and-replace misses contextual differences (the route path format differs from the class name format differs from the display text).

**How to avoid:**
1. Create a rename checklist organized by layer:
   - **Routes**: `/api/ioc/search` -> `/api/ip-search` (update `api.php` + frontend API calls)
   - **Controllers**: `Ioc\SearchController` -> `IpSearch\SearchController` (move file + update namespace)
   - **Requests**: `IocSearchRequest` -> `IpSearchRequest`
   - **Services**: `IocDetectorService` -- keep this name, it still detects IOC types (IP, domain, hash) even though the page is renamed
   - **Tests**: `Ioc\IocSearchTest` -> `IpSearch\IpSearchTest` (update all route references in assertions)
   - **Frontend**: File rename `IocSearchPage.jsx` -> `IpSearchPage.jsx` (already imported as `IpSearchPage` in App.jsx)
   - **SearchLog**: Keep `module: 'ioc_search'` in existing records, use `module: 'ip_search'` for new records. Do NOT run a migration to update old records -- it provides no value and risks data loss
   - **Sidebar/Nav**: Update display text "IOC Search" -> "IP Search"
2. Run the full test suite after rename (`php artisan test`) -- all 92 tests must pass
3. Test the frontend route `/ip-search` still works (it already does based on App.jsx)

**Warning signs:**
- 404 on API calls after rename (route path mismatch)
- Test failures referencing old route paths
- Mixed terminology in UI ("IOC" in some places, "IP Search" in others)
- Import errors from renamed files

**Phase to address:**
Phase 1 (Preparation). Do the rename as a standalone commit before any OpenCTI integration work. This keeps the rename diff clean and reviewable.

---

### Pitfall 6: OpenCTI Server-to-Server CORS / Network Connectivity from Railway

**What goes wrong:**
The Laravel backend on Railway (cloud) cannot reach the OpenCTI instance at `http://192.168.251.20:8080` (local/private network). The IP `192.168.x.x` is a private RFC 1918 address, unreachable from the public internet. Integration works in local development (Laragon can reach the local network) but completely fails in production.

**Why it happens:**
The OpenCTI instance is on a private network. Railway containers run on public cloud infrastructure with no VPN or tunnel to the private network. Developers test locally where everything works, then deploy and discover the architecture is fundamentally broken for production.

**How to avoid:**
1. Acknowledge this constraint upfront: local OpenCTI + cloud Laravel requires a tunnel or public exposure
2. Options (pick one):
   - **Option A**: Expose OpenCTI via a reverse proxy with a public domain (e.g., Cloudflare Tunnel, ngrok) -- adds security risk, requires IP allowlisting
   - **Option B**: Move OpenCTI to a cloud instance (Railway addon, Docker on VPS)
   - **Option C**: Keep backend local too (Laragon for both dev and "production") -- acceptable for a portfolio/demo project
   - **Option D**: Environment-conditional: local OpenCTI URL for dev, cloud OpenCTI URL for production (requires two instances)
3. Configure `OPENCTI_BASE_URL` in `.env` so the URL is environment-specific
4. Add a health check endpoint that verifies OpenCTI connectivity: `GET /api/health/opencti`

**Warning signs:**
- `cURL error 7: Failed to connect` in Laravel logs on Railway
- Integration tests pass locally but fail in CI/CD
- OpenCTI calls timeout after 30 seconds on deployed backend

**Phase to address:**
Phase 1 (Architecture decision). This is a deployment topology question that must be answered before writing integration code. If the answer is "local only for now," document it explicitly.

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcoding GraphQL queries as strings in controllers | Fast to implement, easy to read | No reuse, no type safety, copy-paste drift between controllers | Never -- extract to a dedicated query class/file from day one |
| Skipping OpenCTI response caching | Simpler code, always fresh data | Repeated identical queries waste OpenCTI resources and credits | MVP only -- add Redis/database caching by Phase 3 |
| Using `Http::get()` without timeout/retry | Fewer lines of code | Silent hangs when OpenCTI is slow, user stares at spinner | Never -- always set `timeout(10)->retry(2, 100)` |
| Mixing OpenCTI data shapes with frontend display shapes | No transformation layer needed | Frontend breaks when OpenCTI schema changes; STIX field names leak into UI | Never -- always transform in a service/resource layer |
| Not logging OpenCTI queries/responses | Less log noise | Impossible to debug production issues, no visibility into what queries are slow | Only in very early prototyping |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| OpenCTI GraphQL | Sending queries as GET requests with query params | Always POST to `/graphql` with JSON body `{ query, variables }` |
| OpenCTI GraphQL | Expecting REST-style HTTP error codes (404, 500) | GraphQL returns 200 with `{ errors: [...] }` -- check the `errors` array, not HTTP status |
| OpenCTI Auth | Using the admin token for API calls | Create a dedicated API user with read-only permissions in OpenCTI; admin tokens can modify/delete data |
| OpenCTI Pagination | Using `offset` pagination (skip/take) | OpenCTI uses Relay cursor pagination: `first`, `after`, `edges`, `pageInfo.endCursor`, `pageInfo.hasNextPage` |
| OpenCTI Filters | Passing filter values as plain strings | OpenCTI filter format is structured: `{ key: "entity_type", values: ["IPv4-Addr"], operator: "eq", mode: "or" }` |
| Laravel HTTP Client | Not setting `Accept: application/json` header | OpenCTI may return HTML error pages instead of JSON on some error paths |
| Laravel -> OpenCTI | Trusting response data without validation | Validate that expected fields exist before passing to frontend; OpenCTI schema can change between versions |
| Credit System | Applying same credit cost to all OpenCTI features | IP Search, Threat Actors (listing), Threat Map (read-only) have different value -- consider free listing pages vs. credit-gated deep searches |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Unbounded GraphQL queries (no `first` limit) | Timeout on large datasets, memory spike | Always specify `first: 25` or similar limit | When OpenCTI has > 1,000 objects of that type |
| No response caching for repeated searches | Same IP searched 10 times = 10 OpenCTI calls | Cache responses in Laravel (15-60 min TTL) with query hash as key | Immediately -- even with 10 users |
| Fetching full STIX objects when only summary needed | 500ms+ API response times, large JSON payloads | Create "list" queries (name, type, date only) vs. "detail" queries (full object) | When displaying lists of 25+ items |
| Synchronous OpenCTI calls blocking Laravel workers | All web workers stuck waiting on slow OpenCTI responses | Set aggressive timeouts (5-10s), consider queue-based processing for heavy queries | When OpenCTI response time > 3 seconds |
| Loading entire threat map dataset on page load | Browser freezes rendering thousands of geo markers | Paginate or cluster map data server-side, load by region/viewport | When OpenCTI has > 500 location-tagged objects |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| OpenCTI token in frontend code or `VITE_` env var | Full unauthenticated access to OpenCTI instance | Store in Laravel `.env` only, proxy all requests through backend |
| Using OpenCTI admin user token | API calls can modify/delete threat intelligence data | Create a read-only API user in OpenCTI specifically for AQUA TIP |
| Not sanitizing OpenCTI response data before rendering | XSS via malicious STIX object names/descriptions (threat actors can have arbitrary names) | Sanitize all OpenCTI string fields before rendering in React; use `textContent` not `innerHTML` |
| Exposing OpenCTI internal IDs in frontend URLs | Information disclosure about internal data structure | Map OpenCTI UUIDs to opaque identifiers or use them only server-side |
| No rate limiting on OpenCTI proxy endpoints (Threat Actors, Threat News) | Authenticated users can make unlimited OpenCTI calls, exhausting instance resources | Apply credit system or separate rate limiting to all OpenCTI-backed endpoints |
| OpenCTI instance on HTTP (not HTTPS) | Token transmitted in cleartext over the network | Acceptable on local network (`192.168.x.x`); must use HTTPS if exposed to internet |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing raw STIX field names in UI | Users see `IPv4-Addr`, `intrusion-set`, `observable_value` -- meaningless jargon | Map STIX types to human labels: "IP Address", "Threat Group", "Observable" |
| No loading state during OpenCTI calls | User clicks search, nothing happens for 2-5 seconds, clicks again (double search, double credit) | Show immediate loading spinner, disable search button during request |
| Empty page with no explanation when OpenCTI has no data | User thinks the feature is broken | Show contextual empty states: "No threat intelligence data found for this IP address" with explanation |
| Showing "0 results" the same as "service unavailable" | User cannot distinguish "clean IP" from "system error" | Separate states: "No threats found" (green, reassuring) vs. "Service unavailable, try again later" (orange, warning) |
| Credit deducted for empty results | User pays a credit to learn nothing | Consider: should searches that return zero results still cost a credit? Document the decision either way |
| Search input accepts any text but only IPs work with OpenCTI | User searches for a domain name, gets confusing error or empty results | Validate input type client-side, show which search types are supported (IPv4, IPv6) |

## "Looks Done But Isn't" Checklist

- [ ] **IP Search:** Returns data but no error handling -- verify behavior when OpenCTI is unreachable (connection refused, timeout, 500)
- [ ] **IP Search:** Works for IPv4 but untested with IPv6, domains, hashes -- verify all `IocDetectorService` types work or show clear "not supported" messages
- [ ] **Threat Map:** Shows markers but no clustering -- verify with 500+ locations that the map remains usable (not a blob of overlapping markers)
- [ ] **Threat Actors:** Lists intrusion sets but no pagination controls -- verify "Load More" or infinite scroll works with cursor-based pagination
- [ ] **Threat News:** Displays reports but no date filtering -- verify reports are sorted by recency, not by internal ID
- [ ] **Credit refund:** Controller catches errors but verify the `increment('remaining')` actually restores the credit (race condition with concurrent requests)
- [ ] **Empty states:** All four OpenCTI pages show appropriate empty states -- verify with a real empty OpenCTI instance, not just by mocking empty responses
- [ ] **Token rotation:** OpenCTI token works today but verify behavior when token is expired/revoked -- should return 401 error message, not a generic 500
- [ ] **Rate limit CTA:** Guest sees "Sign in for more lookups" but verify the CTA actually links to the registration page and preserves the search query

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Token exposed in frontend | MEDIUM | 1. Revoke token in OpenCTI admin. 2. Create new API user with read-only perms. 3. Store new token in Laravel `.env` only. 4. Audit OpenCTI logs for unauthorized access. |
| Credits lost to failed API calls | LOW | 1. Query `search_logs` for failed searches. 2. Manually restore credits via `credits` table UPDATE. 3. Implement refund logic in controller. |
| Rename left broken references | LOW | 1. Run full test suite to find all failures. 2. Global search for old term ("ioc", "IOC"). 3. Fix one layer at a time (routes, then controllers, then tests, then frontend). |
| Over-fetching causing timeouts | MEDIUM | 1. Identify slow queries via Laravel logs. 2. Reduce field selection in GraphQL queries. 3. Add `first` limits. 4. Add response caching. |
| Production cannot reach OpenCTI | HIGH | 1. Decision point: expose OpenCTI publicly or move backend local. 2. If exposing: set up Cloudflare Tunnel + IP allowlist. 3. If local: document that production deployment requires VPN. |
| OpenCTI instance has no data | LOW | 1. Configure MITRE ATT&CK connector (free, provides intrusion sets). 2. Configure AlienVault OTX connector (free, provides IP/domain observables). 3. Wait 1-2 hours for initial import. |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Token exposure (Pitfall 1) | Phase 1: Backend service layer | Grep codebase for `VITE_OPENCTI`; verify no frontend code references OpenCTI URL |
| Over-fetching (Pitfall 2) | Phase 2: IP Search | Measure response size of first query; must be < 50KB for a single IP search |
| Empty data (Pitfall 3) | Phase 1: Setup | Run test query against OpenCTI instance; document available data types |
| Credit refund (Pitfall 4) | Phase 2: IP Search | Write test: mock OpenCTI timeout, assert credit is refunded |
| Rename breakage (Pitfall 5) | Phase 1: Preparation | All 92 existing tests pass after rename; frontend route `/ip-search` loads |
| Network connectivity (Pitfall 6) | Phase 1: Architecture | Document deployment topology; add `/api/health/opencti` endpoint |
| GraphQL 200-with-errors (Integration table) | Phase 2: IP Search | Write test: mock GraphQL error response, assert proper error returned to frontend |
| No caching (Performance table) | Phase 3: Optimization | Verify repeated identical search hits cache, not OpenCTI |
| STIX jargon in UI (UX table) | Phase 2-4: All feature pages | Visual review: no raw STIX type names visible in any page |
| Listing pages consuming credits (Security table) | Phase 3-4: Threat Actors, News | Decide and document: which endpoints are free (listings) vs. credit-gated (searches) |

## Sources

- [OpenCTI GraphQL API Documentation](https://docs.opencti.io/latest/reference/api/) -- HIGH confidence, official docs
- [OpenCTI GraphQL Playground Usage](https://docs.opencti.io/latest/development/api-usage/) -- HIGH confidence, official docs
- [OpenCTI Data Model (SDOs, SCOs, SROs)](https://docs.opencti.io/latest/usage/data-model/) -- HIGH confidence, official docs
- [OpenCTI Connectors Documentation](https://docs.opencti.io/latest/deployment/connectors/) -- HIGH confidence, official docs
- [OpenCTI Authentication Configuration](https://docs.opencti.io/latest/deployment/authentication/) -- HIGH confidence, official docs
- [OpenCTI Introspection Disabled by Default (Issue #8598)](https://github.com/OpenCTI-Platform/opencti/issues/8598) -- HIGH confidence, confirms playground config pitfall
- [OpenCTI Pagination Cursor Bug (Issue #1879)](https://github.com/OpenCTI-Platform/opencti/issues/1879) -- MEDIUM confidence, documents cursor pagination edge cases
- [OpenCTI Practical API Usage Guide](https://www.mickaelwalter.fr/opencti-use-the-api/) -- MEDIUM confidence, community walkthrough with working examples
- [Laravel 12.x HTTP Client Documentation](https://laravel.com/docs/12.x/http-client) -- HIGH confidence, official docs for timeout/retry patterns
- [OpenCTI GraphQL Schema (GitHub)](https://github.com/OpenCTI-Platform/opencti/blob/master/opencti-platform/opencti-graphql/config/schema/opencti.graphql) -- HIGH confidence, authoritative schema reference
- [OpenCTI Empty Instance / No Data Issues (Issue #7463)](https://github.com/OpenCTI-Platform/opencti/issues/7463) -- MEDIUM confidence, confirms empty data problem
- AQUA TIP codebase inspection (v1.1) -- HIGH confidence, direct code review of `DeductCredit` middleware, `SearchController`, `api.php` routes, `App.jsx` routing

---
*Pitfalls research for: OpenCTI GraphQL integration into AQUA TIP v2.0*
*Researched: 2026-03-14*
