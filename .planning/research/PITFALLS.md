# Domain Pitfalls

**Domain:** Adding universal Threat Search and UI refresh to existing TIP
**Project:** AQUA TIP v2.1 -- Threat Search & UI Refresh
**Researched:** 2026-03-17
**Confidence:** HIGH (based on direct codebase analysis of all affected files + OpenCTI documentation)

---

## Critical Pitfalls

Mistakes that cause rewrites, broken user flows, or data integrity issues.

### Pitfall 1: Hardcoded IP Validation Blocks Universal Search

**What goes wrong:** The current `IpSearchRequest` validates with `'query' => ['required', 'string', 'ip']` -- the Laravel `ip` rule rejects domains, URLs, file hashes, email addresses, and every other non-IP observable type. Deploying the renamed "Threat Search" without replacing this validation rule means 100% of non-IP searches return 422.

**Why it happens:** The validation was correctly scoped for IP-only search. When renaming to Threat Search, developers focus on the GraphQL query and UI changes but forget the request validation layer sits upstream and silently blocks everything.

**Consequences:** Users see "Invalid input" for every domain, hash, or URL search. Credits are not deducted (validation happens pre-middleware), but the feature appears completely broken for its core new capability.

**Prevention:**
- Replace the `ip` validation rule with permissive string validation: `['required', 'string', 'min:2', 'max:512']`.
- Optionally add a regex-based custom rule that accepts known observable formats (IPs, domains, hashes, URLs, emails) while rejecting obvious garbage.
- Let OpenCTI's `value` filter determine if a match exists -- return "not found" for unrecognized input rather than 422.

**Detection:** Any manual test with a domain name like `example.com` immediately surfaces this.

**Phase:** Must be the first backend change in the search generalization phase.

---

### Pitfall 2: GraphQL entity_type Filter Removal Breaks Downstream Assumptions

**What goes wrong:** The current query filters `entity_type` to `['IPv4-Addr', 'IPv6-Addr']`. Removing this filter to support all observables means `stixCyberObservables` returns ANY of the 20+ STIX observable types. The entire downstream pipeline assumes IP data.

**Why it happens:** Developers remove the entity_type filter to "support everything" without tracing all the places that assume the result is an IP address.

**Consequences:**
- **Geo enrichment fires for non-IPs:** `fetchGeoFromIpApi()` calls `ip-api.com` with a domain/hash, wasting the 45 req/min free tier rate limit and returning garbage.
- **D3 graph breaks:** `D3Graph` component uses `centerIp` prop and hardcodes `type: 'IPv4-Addr'` for the center node. Non-IP center nodes get the wrong color and label.
- **Response schema is wrong:** Top-level key is `'ip'` in `buildResponse()`. A hash search returns `{ ip: "a1b2c3d4..." }` which is semantically incorrect.
- **UI copy is wrong:** "No threats found for {result.ip}" shows a hash where it says "IP." The search header says "Search any IP address."
- **Score ring context lost:** The threat score ring works for any type, but the label "Threat Score" is IP-centric.

**Prevention:**
1. Add observable type detection on the backend after the OpenCTI query returns. Check `entity_type` and skip geo enrichment for non-IP types.
2. Rename the response key from `ip` to `query` (or `value`) in the API response.
3. On the frontend, replace all `result.ip` references with `result.query`.
4. Rename D3Graph prop from `centerIp` to `centerValue`, add `centerType` prop.
5. Use `filter_var($query, FILTER_VALIDATE_IP)` in PHP to decide whether to call geo enrichment.

**Detection:** Search for a domain and observe geo section with null data, D3 graph with wrong node type, and confusing "IP" labels.

**Phase:** Must be addressed simultaneously in backend and frontend. Ship as a coordinated change -- do NOT update one without the other.

---

### Pitfall 3: Route Rename Breaks Bookmarks, CTAs, Tests, and Navigation

**What goes wrong:** The route `/ip-search` must become `/threat-search`. This URL is hardcoded in **13+ files** across the codebase. Missing even one creates a broken link, failing test, or dead navigation item.

**Affected files identified by grep:**

Backend (5+ files):
- `routes/api.php` -- route definition
- `app/Http/Controllers/IpSearch/SearchController.php` -- namespace/class name
- `tests/Feature/IpSearch/IpSearchTest.php` -- route path in test assertions
- `tests/Feature/IpSearch/IpSearchRefundTest.php` -- route path in test assertions
- `tests/Feature/Credit/CreditStatusTest.php`, `CreditResetTest.php`, `AuthCreditLimitTest.php`, `GuestCreditLimitTest.php` -- all POST to `/api/ip-search`

Frontend (8 files):
- `App.jsx` -- route definition + import
- `components/layout/Sidebar.jsx` -- nav item
- `components/layout/Topbar.jsx` -- search reference
- `components/landing/LandingScroll.jsx` -- CTA link
- `pages/LandingPage.jsx` -- CTA link
- `pages/DashboardPage.jsx` -- quick action link
- `pages/IpSearchPage.jsx` -- file name + content
- `api/ip-search.js` -- API endpoint + function name
- `data/mock-data.js` -- references

**Why it happens:** String-based route references scattered across the codebase with no centralized route constants. A find-and-replace on "ip-search" misses variations: "IP Search" (display name), `IpSearchPage` (component name), `searchIpAddress` (API function), `ip_search:` (cache key).

**Prevention:**
1. Compile full grep list before starting: `ip-search`, `ip_search`, `IpSearch`, `ipSearch`, `IP Search`, `Ip Search`.
2. Rename in dependency order: backend route first, then API client, then page component, then all referencing components, then tests.
3. Run the full 92-test Pest suite after backend rename.
4. Manually verify: landing page CTA, sidebar link, topbar reference, dashboard quick-action.

**Phase:** This MUST be the first task in the milestone. Everything depends on naming being settled.

---

### Pitfall 4: Breaking the Public Access Pattern

**What goes wrong:** IP Search is the ONLY public route inside AppLayout. In `App.jsx`:

```jsx
<Route element={<AppLayout />}>
  {/* Public route -- accessible without auth */}
  <Route path="/ip-search" element={<IpSearchPage />} />

  {/* Protected routes -- auth + verified + onboarded */}
  <Route element={<ProtectedRoute />}>
    ...
  </Route>
</Route>
```

When renaming to Threat Search, the new route may accidentally be placed inside the `<ProtectedRoute />` wrapper.

**Consequences:** The entire landing page funnels users to `/threat-search`. If it requires auth, unauthenticated users hit a redirect to `/login`, making the product's primary conversion flow broken. This is the #1 CTA on the landing page.

**Prevention:**
- Keep the threat search route at the same nesting level (sibling to ProtectedRoute, child of AppLayout).
- Add a smoke test: visit `/threat-search` in an incognito window without logging in.
- Consider adding a comment in App.jsx: `{/* PUBLIC -- must remain outside ProtectedRoute */}`

**Phase:** Address during route rename. Verify immediately with unauthenticated browser test.

---

## Moderate Pitfalls

### Pitfall 5: Cache Key Collision and Staleness After Rename

**What goes wrong:** The current cache key is `'ip_search:' . md5($ip)`. After generalization, the same query value could be searched as different types. More importantly, stale cache entries from old IP searches persist under the old key prefix, creating inconsistency during rollout.

**Prevention:**
- Change cache key to `'threat_search:' . md5($query)`.
- Old `ip_search:*` cache entries expire naturally (15 min TTL), so no cache flush needed.
- If adding type-aware search later, include type in cache key: `'threat_search:' . md5($type . ':' . $query)`.

---

### Pitfall 6: Geo Enrichment Rate Limit Exhaustion for Non-IP Searches

**What goes wrong:** `ip-api.com` free tier allows 45 requests/minute. If universal search sends every query through geo enrichment regardless of type, non-IP searches waste rate limit quota. Under moderate usage, legitimate IP geo lookups start failing.

**Prevention:**
- Add a type guard before the geo call in the search service:
  ```php
  $isIp = filter_var($query, FILTER_VALIDATE_IP) !== false;
  $geo = $isIp ? $this->fetchGeoFromIpApi($query) : null;
  ```
- This is a one-line change but prevents a subtle production degradation.

---

### Pitfall 7: OpenCTI Value Search is Exact-Match -- Users Expect Fuzzy

**What goes wrong:** The current filter uses `operator: 'eq'` for the `value` field. This works for IPs (users type exact addresses). For domains, users might type `example.com` when OpenCTI stores `www.example.com`. For hashes, a partial paste returns nothing. Users think the platform has no data.

**Prevention:**
- Use the `search` parameter on `stixCyberObservables` (full-text search) instead of or in addition to the exact filter.
- Or use `operator: 'search'` in the filter for broader matching.
- Display a helpful message: "No exact match found. Try the full observable value."
- Consider a two-pass strategy: try exact match first, fall back to search if no results.

---

### Pitfall 8: Threat Actors 4-Column Grid Overflow

**What goes wrong:** Switching from 3-column (`xl:grid-cols-3`) to 4-column grid means cards become ~25% narrower. Current card content includes name, date, aliases (chips), description (3-line clamp), countries, sectors, and motivation badge. In 4 columns, long names like "UNC2452 (Dark Halo / SolarStorm)" overflow, and alias chip rows wrap badly.

**Prevention:**
- The milestone spec removes descriptions from cards, which helps significantly.
- Use `xl:grid-cols-4` (1280px+), NOT `lg:grid-cols-4` or `md:grid-cols-4`.
- Keep `md:grid-cols-2` and `lg:grid-cols-3` as intermediate breakpoints.
- Test with the actual longest actor names from the OpenCTI dataset.
- Apply `truncate` or `line-clamp-1` to actor names in the card.

---

### Pitfall 9: Threat News Row Layout Click Propagation Conflicts

**What goes wrong:** The current card layout has entity chips that use `e.stopPropagation()` to prevent card click from firing when a chip is clicked. In a row layout, click targets are smaller and denser. The interaction model (click row to open modal vs. click chip to filter) becomes confusing.

**Prevention:**
- Verify `e.stopPropagation()` survives the layout change (it likely does, but test).
- Consider whether modals still make sense for rows. Rows often use expand-in-place or navigate-to-detail patterns.
- Ensure touch targets are at least 44px on mobile for both the row and the chips within it.

---

### Pitfall 10: Removing Confidence Badge vs. Confidence Filter -- Scope Confusion

**What goes wrong:** The milestone says "no confidence" on the Threat News layout. If developers interpret this as removing both the per-card badge AND the toolbar confidence filter dropdown, users lose the ability to filter low-confidence noise.

**Prevention:**
- Clarify: remove the per-card/per-row confidence badge. KEEP the confidence filter dropdown in the toolbar.
- The filter is valuable for data quality; the badge was visual noise on every card.

---

### Pitfall 11: Pagination Position Change Breaks Scroll UX

**What goes wrong:** Moving pagination from bottom to top means the `PaginationControls` component needs different spacing (`pt-6` was designed for bottom placement). Also, after clicking "Next" to load page 2, the user's scroll position may be mid-page rather than at the top of results.

**Prevention:**
- Change spacing from `pt-6` to `pb-4` for top placement.
- Add `window.scrollTo({ top: 0, behavior: 'smooth' })` in the page navigation handlers.
- Consider rendering pagination at both top and bottom for longer result lists.

---

### Pitfall 12: Frontend D3 Graph IP-Specific Assumptions

**What goes wrong:** The `D3Graph` component has IP-specific logic throughout:
- Prop named `centerIp`
- Center node hardcoded as `type: 'IPv4-Addr'`
- `ENTITY_COLORS` map only covers IPv4/IPv6 + threat types (no Domain-Name, File, URL, etc.)
- `uuidToCanonical` check compares `entity.name === centerIp` and checks `entity_type === 'IPv4-Addr'`

For a domain search, the center node gets `DEFAULT_ENTITY_COLOR` (gray) instead of a distinctive color, and the canonical ID resolution fails.

**Prevention:**
- Pass `centerType` alongside `centerValue` from the parent.
- Expand `ENTITY_COLORS` to include `'Domain-Name'`, `'Url'`, `'StixFile'`, `'Email-Addr'`, etc.
- Update the canonical ID check to match on `entity_type` dynamically.

---

### Pitfall 13: Subheading Change on Threat Actors -- "Browse known intrusion sets" Mismatch

**What goes wrong:** The current subheading says "Browse known threat actor profiles from OpenCTI." The milestone specifies a clean subheading change. If the subheading references "intrusion sets" (the actual OpenCTI entity type), it creates jargon confusion. If it says "threat actors" but the backend still queries `intrusionSets`, there is a terminology mismatch that could confuse developers maintaining the code.

**Prevention:**
- Keep user-facing text as "threat actors" (human-friendly).
- Keep code-level naming as `intrusionSets` (matches OpenCTI API).
- Add a code comment: `// OpenCTI calls these "intrusionSets"; we display them as "Threat Actors"`.

---

## Minor Pitfalls

### Pitfall 14: Sidebar Navigation Label Width

**What goes wrong:** "IP Search" (9 chars) becomes "Threat Search" (13 chars). May overflow sidebar tooltip in collapsed state or text area in expanded state if sidebar has a fixed width.

**Prevention:** Check Sidebar.jsx width constraints. Test both collapsed and expanded states.

---

### Pitfall 15: Test Coverage Gap for New Observable Types

**What goes wrong:** The existing Pest tests only cover IP search. After generalization, there are zero tests for domain, hash, URL, or email searches. Regressions in non-IP paths have no safety net.

**Prevention:**
- Add at minimum one test per observable type (domain, hash, URL) using mocked OpenCTI responses.
- Test that geo enrichment is skipped for non-IP types.
- Test that the response schema shape is consistent regardless of input type.

---

### Pitfall 16: Loading Skeleton Mismatch After Layout Change

**What goes wrong:** Both pages currently show `<SkeletonCard count={6} />` in a 3-column grid during loading. After switching Threat Actors to 4-column and Threat News to rows, the skeleton still renders as 3-column cards, creating a visual jank when real content loads.

**Prevention:**
- Update Threat Actors skeleton to 4-column grid.
- Create a `SkeletonRow` component for Threat News row layout.
- Match skeleton dimensions to actual content dimensions.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Route rename (IP -> Threat Search) | References in 13+ files (Pitfall 3) | Comprehensive grep + full test suite run |
| Route rename | Public access broken (Pitfall 4) | Keep route outside ProtectedRoute |
| Backend search generalization | Validation blocks non-IP (Pitfall 1) | Replace `ip` rule with string validation |
| Backend search generalization | Geo enrichment waste (Pitfall 6) | Type-guard before ip-api.com call |
| Backend search generalization | Response key `ip` is wrong (Pitfall 2) | Rename to `query` or `value` |
| Backend search generalization | Cache key prefix stale (Pitfall 5) | New prefix `threat_search:` |
| GraphQL query changes | entity_type filter removal cascades (Pitfall 2) | Add type detection, conditional enrichment |
| GraphQL query changes | Exact match misses (Pitfall 7) | Use `search` param or `operator: search` |
| Frontend search page update | D3 graph IP assumptions (Pitfall 12) | Rename props, expand entity colors |
| Frontend search page update | All `result.ip` references break (Pitfall 2) | Systematic rename to `result.query` |
| Threat Actors UI refresh | 4-col grid overflow (Pitfall 8) | Use xl breakpoint, test with real data |
| Threat Actors UI refresh | Loading skeleton mismatch (Pitfall 16) | Update skeleton to 4-col |
| Threat News UI refresh | Row layout click conflicts (Pitfall 9) | Verify stopPropagation |
| Threat News UI refresh | Confidence scope confusion (Pitfall 10) | Remove badge, keep filter |
| Threat News UI refresh | Pagination position (Pitfall 11) | Adjust spacing, add scroll-to-top |
| Testing | No coverage for new types (Pitfall 15) | Add mocked tests per observable type |

## Sources

- Direct codebase analysis of: `IpSearchService.php`, `IpSearchRequest.php`, `IpSearchPage.jsx`, `ThreatActorsPage.jsx`, `ThreatNewsPage.jsx`, `App.jsx`, `api.php`, `PaginationControls.jsx`
- [OpenCTI Filters Documentation](https://docs.opencti.io/latest/reference/filters/)
- [OpenCTI Data Model](https://docs.opencti.io/latest/usage/data-model/)
- [OpenCTI GraphQL API Reference](https://docs.opencti.io/latest/reference/api/)
- [OpenCTI entity_type filter discussion (GitHub #7637)](https://github.com/OpenCTI-Platform/opencti/issues/7637)

---
*Pitfalls research for: AQUA TIP v2.1 -- Threat Search & UI Refresh*
*Researched: 2026-03-17*
