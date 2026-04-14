# Phase 56: Observable Display - Research

**Researched:** 2026-04-14
**Domain:** Backend PHP / OpenCTI GraphQL entity type queries
**Confidence:** HIGH

## Summary

This phase fixes a backend data gap where only 4 of 7 STIX observable entity types are queried in `DashboardService::fetchCounts()`. The Threat Database widget on the Threat Map page already renders all 7 types via `STAT_CARD_CONFIG`, but Email-Addr, Url, and Cryptocurrency-Wallet show 0 counts because the backend never queries them.

The fix is a 3-line addition to a PHP array plus updating the existing unit test. No frontend changes, no new dependencies, no architectural changes. The existing GraphQL query structure works identically for all STIX Cyber Observable types -- the only difference is the `entity_type` filter value.

**Primary recommendation:** Add the 3 missing entity types to `$entityTypes` in `DashboardService::fetchCounts()`, update the PHPDoc, and update the existing test to expect 7 types.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Add `Email-Addr`, `Url`, and `Cryptocurrency-Wallet` to the `$entityTypes` array in `DashboardService::fetchCounts()` with labels "Email", "URL", and "Crypto Wallet" respectively
- **D-02:** No changes to the GraphQL query structure -- the existing per-type filter query works for all STIX observable types
- **D-03:** No frontend changes needed -- `STAT_CARD_CONFIG` in `dashboard-config.js` already lists all 7 types with correct colors and labels
- **D-04:** No display format changes for indicator values -- all types (including email, URL, crypto) remain as plain monospace text in the Recent Indicators list
- **D-05:** URLs are NOT clickable -- this is a threat intel context where malicious URLs should not be followed
- **D-06:** Widget ordering remains static per `STAT_CARD_CONFIG`: IP -> Domain -> Hostname -> Cert -> Email -> Crypto -> URL

### Claude's Discretion
- Whether to update the PHPDoc comment on `fetchCounts()` to reflect 7 types instead of 4
- Cache key remains unchanged (`dashboard_counts`) since the response shape is the same

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| OBS-01 | Email observable type renders with formatted display in threat search results | Backend adds `Email-Addr` to `$entityTypes` so count appears in Threat Database widget. Frontend `STAT_CARD_CONFIG` already handles display with amber color. |
| OBS-02 | URL observable type renders with clickable link in threat search results | Backend adds `Url` to `$entityTypes`. Per D-05, URLs are NOT clickable (security decision). Frontend config already has violet color mapping. |
| OBS-03 | Cryptocurrency observable type renders with formatted display in threat search results | Backend adds `Cryptocurrency-Wallet` to `$entityTypes`. Frontend `STAT_CARD_CONFIG` already has green color mapping. |
</phase_requirements>

## Standard Stack

No new libraries needed. This phase modifies existing code only.

### Core (already in use)
| Library | Version | Purpose | Relevance |
|---------|---------|---------|-----------|
| Laravel 11 | 11.x | Backend framework | DashboardService lives here |
| Pest PHP | existing | Test framework | Existing DashboardServiceTest.php uses Pest |

## Architecture Patterns

### Existing Pattern: Sequential GraphQL Queries per Entity Type

The `fetchCounts()` method iterates over `$entityTypes` array and runs one GraphQL query per type using the `stixCyberObservables` query with an `entity_type` filter. Results are cached for 5 minutes with stale-cache fallback on OpenCTI failure. [VERIFIED: codebase read of DashboardService.php lines 103-151]

**Current array (4 types):**
```php
$entityTypes = [
    'IPv4-Addr' => 'IP Addresses',
    'Domain-Name' => 'Domains',
    'Hostname' => 'Hostnames',
    'X509-Certificate' => 'Certificates',
];
```

**Target array (7 types):**
```php
$entityTypes = [
    'IPv4-Addr' => 'IP Addresses',
    'Domain-Name' => 'Domains',
    'Hostname' => 'Hostnames',
    'X509-Certificate' => 'Certificates',
    'Email-Addr' => 'Email',
    'Cryptocurrency-Wallet' => 'Crypto Wallet',
    'Url' => 'URL',
];
```

The STIX type names `Email-Addr`, `Url`, and `Cryptocurrency-Wallet` match the exact keys used in the frontend `STAT_CARD_CONFIG` and `TYPE_BADGE_COLORS`. [VERIFIED: codebase read of dashboard-config.js]

### Frontend Readiness (Verified -- No Changes Needed)

1. **STAT_CARD_CONFIG** (dashboard-config.js lines 1-9): Already lists all 7 types with labels and colors [VERIFIED: codebase read]
2. **TYPE_BADGE_COLORS** (dashboard-config.js lines 11-20): Has `Email-Addr` and `Url` entries. Missing `Cryptocurrency-Wallet` -- falls back to default purple badge. Not a problem for the Threat Database widget which uses the `color` field from `STAT_CARD_CONFIG` instead. [VERIFIED: codebase read]
3. **RightOverlayPanel.jsx** (lines 206-214): Generic `StatRow` rendering iterates over `STAT_CARD_CONFIG` and matches by `entity_type` key. Missing types show 0 count. [VERIFIED: codebase read]
4. **ThreatSearchPage.jsx**: Has `Email-Addr` in `ENTITY_COLORS` (line 25) for D3 graph node coloring. [VERIFIED: codebase read]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| STIX type names | Custom naming | OpenCTI STIX type identifiers | Must match exactly: `Email-Addr`, `Url`, `Cryptocurrency-Wallet` |

## Common Pitfalls

### Pitfall 1: Wrong STIX Type Name Casing
**What goes wrong:** OpenCTI STIX types are case-sensitive. `email-addr` or `EMAIL-ADDR` would return 0 results.
**Why it happens:** Developer guesses the type name instead of checking existing frontend code.
**How to avoid:** Use exact strings from `STAT_CARD_CONFIG`: `Email-Addr`, `Url`, `Cryptocurrency-Wallet` [VERIFIED: codebase read]
**Warning signs:** New types return 0 counts in production while old types work fine.

### Pitfall 2: Forgetting to Update the Unit Test
**What goes wrong:** The existing test `getCounts returns 4 entity type counts from OpenCTI` asserts `->times(4)` and `->toHaveCount(4)`. After adding 3 types, the mock must provide 7 responses and the assertion must expect 7 results.
**Why it happens:** Developer changes production code but skips test update.
**How to avoid:** Update `DashboardServiceTest.php` line 36 to `->times(7)`, add 3 more `makeCountsResponse()` calls, and update assertions on lines 46-51 to verify all 7 types.
**Warning signs:** `php artisan test` fails immediately.

### Pitfall 3: Query Count Performance
**What goes wrong:** Going from 4 to 7 sequential GraphQL queries adds ~3 more round trips to OpenCTI per uncached request.
**Why it happens:** Each entity type requires a separate query.
**How to avoid:** This is acceptable per CONTEXT.md D-02 ("No changes to the GraphQL query structure"). The 5-minute cache means this only happens once every 5 minutes. [VERIFIED: codebase read -- cache TTL on line 30]
**Warning signs:** None expected -- 7 sequential queries is still fast with caching.

## Code Examples

### The Complete Fix (DashboardService.php)

```php
// Source: Codebase analysis of DashboardService.php lines 105-110
// BEFORE (4 types):
$entityTypes = [
    'IPv4-Addr' => 'IP Addresses',
    'Domain-Name' => 'Domains',
    'Hostname' => 'Hostnames',
    'X509-Certificate' => 'Certificates',
];

// AFTER (7 types):
$entityTypes = [
    'IPv4-Addr' => 'IP Addresses',
    'Domain-Name' => 'Domains',
    'Hostname' => 'Hostnames',
    'X509-Certificate' => 'Certificates',
    'Email-Addr' => 'Email',
    'Cryptocurrency-Wallet' => 'Crypto Wallet',
    'Url' => 'URL',
];
```

### PHPDoc Update (Lines 14-15, 99)

```php
// Line 15 currently says: "Get observable counts by entity type (IPv4-Addr, Domain-Name, Hostname, X509-Certificate)."
// Should say: "Get observable counts by entity type (IPv4-Addr, Domain-Name, Hostname, X509-Certificate, Email-Addr, Cryptocurrency-Wallet, Url)."

// Line 99 currently says: "Fetch entity type counts from OpenCTI via 4 sequential GraphQL queries."
// Should say: "Fetch entity type counts from OpenCTI via 7 sequential GraphQL queries."
```

### Test Update (DashboardServiceTest.php)

```php
// Source: Codebase analysis of DashboardServiceTest.php lines 32-52
// Key changes needed:
// 1. Test name: '7 entity type counts' instead of '4 entity type counts'
// 2. Mock: ->times(7) instead of ->times(4)
// 3. Add 3 more makeCountsResponse() calls
// 4. Assertions: ->toHaveCount(7) and 3 new expect() lines
// 5. Cache test (line 194): ->times(7) instead of ->times(4)
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Pest PHP (already installed) |
| Config file | `backend/phpunit.xml` |
| Quick run command | `cd backend && php artisan test --filter=DashboardServiceTest` |
| Full suite command | `cd backend && php artisan test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| OBS-01 | Email-Addr count returned from getCounts() | unit | `cd backend && php artisan test --filter="getCounts returns 7"` | Needs update (currently tests 4 types) |
| OBS-02 | Url count returned from getCounts() | unit | Same test as above | Needs update |
| OBS-03 | Cryptocurrency-Wallet count returned from getCounts() | unit | Same test as above | Needs update |

### Sampling Rate
- **Per task commit:** `cd backend && php artisan test --filter=DashboardServiceTest`
- **Per wave merge:** `cd backend && php artisan test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
None -- existing test infrastructure covers all phase requirements. The existing test at `backend/tests/Unit/Services/DashboardServiceTest.php` just needs its assertions updated from 4 to 7 types.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | N/A |
| V3 Session Management | no | N/A |
| V4 Access Control | no | N/A -- endpoint already gated |
| V5 Input Validation | no | N/A -- no user input involved |
| V6 Cryptography | no | N/A |

No security concerns. This change adds hardcoded strings to a server-side array. No user input is involved. The existing endpoint authentication and caching remain unchanged.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| (none) | | | |

All claims in this research were verified via codebase reads. No assumed knowledge.

## Open Questions

None. The scope is fully defined by CONTEXT.md decisions and verified against the codebase.

## Sources

### Primary (HIGH confidence)
- `backend/app/Services/DashboardService.php` lines 103-151 -- current `fetchCounts()` implementation
- `frontend/src/data/dashboard-config.js` lines 1-20 -- STAT_CARD_CONFIG and TYPE_BADGE_COLORS
- `frontend/src/components/threat-map/RightOverlayPanel.jsx` lines 201-217 -- Threat Database widget rendering
- `frontend/src/pages/ThreatSearchPage.jsx` lines 16-28 -- ENTITY_COLORS for D3 graph
- `backend/tests/Unit/Services/DashboardServiceTest.php` -- existing test assertions for getCounts()

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, verified existing code
- Architecture: HIGH -- adding entries to existing array, pattern already proven for 4 types
- Pitfalls: HIGH -- verified test file and exact assertion lines that need updating

**Research date:** 2026-04-14
**Valid until:** 2026-05-14 (stable -- no external dependencies)
