# Feature Landscape

**Domain:** Threat Intelligence Platform -- Universal Observable Search & UI Refresh (v2.1)
**Researched:** 2026-03-17
**Confidence:** HIGH (based on existing codebase analysis, OpenCTI documentation, and TIP industry patterns)

## Table Stakes

Features users expect when a TIP offers "universal search" beyond IP-only. Missing any of these makes the search feel half-built.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Multi-type observable input detection | Every TIP (VirusTotal, AbuseIPDB, Pulsedive, ANY.RUN) auto-detects whether the user typed an IP, domain, hash, email, or URL | Med | Regex-based classification on backend; determines which `entity_type` filter to send to OpenCTI `stixCyberObservables` query |
| Observable type badge on results | Users need to immediately see what type of entity was found (IPv4, Domain, File hash, etc.) | Low | Colored badge/chip next to the observable value in results header |
| Score/severity indicator | OpenCTI assigns `x_opencti_score` (0-100) to observables; users expect a visual risk gauge | Low | Already implemented for IP search; reuse the same score display |
| Labels/tags display | OpenCTI `objectLabel` provides colored tags (e.g., "malicious", "APT28"); standard in all TIPs | Low | Already implemented for IP search via `objectLabel` field |
| Relationships tab | STIX relationships (communicates-with, indicates, uses, targets) are the core value of CTI data | Med | Already implemented for IP; generalize D3 graph to work with any observable type as center node |
| External references | Links to MITRE, AlienVault, etc. attached to observables | Low | Already implemented for IP; reuse |
| "Not found" state | Clear messaging when an observable has no data in OpenCTI | Low | Already partially implemented; ensure it works for all types |
| Credit deduction on search | Consistent with existing IP search behavior | Low | Already implemented via `deduct-credit` middleware; reuse |
| Search history persistence in URL | URL params preserve search state for sharing and back-button | Low | Use query params like `?q=example.com&type=domain` |
| Unified search input with placeholder hints | Single search box showing supported types (IP, domain, hash, URL, email) | Low | UX pattern used by VirusTotal, Pulsedive, ANY.RUN TI Lookup |
| Threat Actors clean card grid | Users expect scannable actor cards without wall-of-text descriptions | Low | 4-col grid per PROJECT.md spec; already have card data from API |
| Threat News row-based layout | Reports are best scanned as rows (title + date + tags), not cards | Low | Per PROJECT.md spec; same API data, new layout |

## Differentiators

Features that set the platform apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Auto-type detection with manual override | Detect type automatically but let user correct (e.g., hostname vs domain ambiguity) | Low | Dropdown or chip selector next to search input |
| Conditional geo enrichment for IP types | ip-api.com enrichment shown only for IPv4/IPv6 searches | Low | Already built; conditionally render geo panel based on `entity_type` |
| Indicators tab with pattern display | Show STIX/YARA/Sigma patterns associated with the observable | Low | Already built for IP; generalize |
| Sightings timeline | Show when/where the observable was sighted, with count badges | Med | Already built for IP; generalize the sighting query |
| Notes/analyst annotations | Show OpenCTI notes attached to the observable | Low | Already built for IP; generalize |
| Top pagination for Threat News | Pagination above results reduces scrolling in data-heavy lists | Low | Common in data dashboards; uncommon in basic TIPs |

## Anti-Features

Features to explicitly NOT build for v2.1.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Full GraphQL proxy to OpenCTI | Security risk -- exposes schema; PROJECT.md excludes this | Curated backend endpoints per feature, same as existing pattern |
| Bulk/batch observable search | Queue processing, progress tracking, result aggregation -- premature | Single observable per request; consider bulk in future milestone |
| Multi-source enrichment (VirusTotal, Shodan, AbuseIPDB) | PROJECT.md excludes; adds N API keys, N rate limiters, N response normalizers | OpenCTI as single source; ip-api.com only for IP geo |
| STIX export/download | Read-only TIP display; no analyst workflow needs export yet | Display data in UI only |
| Separate routes per observable type | Over-engineering; all types share the same `stixCyberObservables` data shape | Single search results page with conditional panels (geo for IPs) |
| Real-time observable monitoring | Requires background jobs, notification system, watch lists | Static search only |
| Editable threat actor profiles | Write operations to OpenCTI are out of scope | Read-only display; manage via OpenCTI UI directly |
| Advanced multi-filter builder for Actors/News | Complex boolean logic UI is overkill for current user base | Keep existing simple filters (search, motivation, sort) |
| Confidence badge on Threat News | PROJECT.md says remove it; low signal-to-noise for browsing reports | Remove from UI; data still available in detail modal if needed |

## Feature Dependencies

```
Auto-type detection --> Backend ThreatSearchService (resolves input to entity_type)
ThreatSearchService --> OpenCtiService (already exists, no changes needed)
ThreatSearchService --> IpSearchService patterns (reuse relationship/indicator/sighting queries)
ThreatSearchPage.jsx --> ThreatSearchService backend endpoint
ThreatSearchPage.jsx --> Existing D3Graph component (generalize center node)
ThreatSearchPage.jsx --> Existing score/labels/tabs UI (already built for IP)
Geo panel conditional --> entity_type check in frontend (show only for IPv4/IPv6)
Threat Actors UI refresh --> No backend changes (same /threat-actors API)
Threat News UI refresh --> No backend changes (same /threat-news API)
Route rename /ip-search --> /threat-search (frontend router + sidebar + CTAs)
```

## Observable Types to Support

Based on OpenCTI documentation and the Elastic OpenCTI integration reference, these are the entity_type values for `stixCyberObservables`. The existing query pattern (filter by `value` + `entity_type`) works for all types.

### Priority 1: High-value types (cover 90%+ of analyst searches)

| Observable Type | `entity_type` Value | Input Pattern | Example |
|----------------|--------------------|--------------|---------|
| IPv4 Address | `IPv4-Addr` | `^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$` | `8.8.8.8` |
| IPv6 Address | `IPv6-Addr` | Standard IPv6 regex | `2001:4860:4860::8888` |
| Domain Name | `Domain-Name` | FQDN with valid TLD | `evil-domain.com` |
| URL | `Url` | Starts with `http://` or `https://` | `https://evil.com/payload` |
| Email Address | `Email-Addr` | Contains `@` with domain | `attacker@evil.com` |
| File Hash (MD5) | `StixFile` | 32 hex chars | `d41d8cd98f00b204e9800998ecf8427e` |
| File Hash (SHA-1) | `StixFile` | 40 hex chars | `da39a3ee5e6b4b0d3255bfef95601890afd80709` |
| File Hash (SHA-256) | `StixFile` | 64 hex chars | `e3b0c44298fc1c149afbf4c8996fb924...` |
| Hostname | `Hostname` | Single-label or non-TLD host | `mail-server-01` |

### Priority 2: Useful but less commonly searched (defer)

| Observable Type | `entity_type` Value | When Relevant |
|----------------|--------------------|--------------|
| Autonomous System | `Autonomous-System` | Network infrastructure analysis |
| MAC Address | `Mac-Addr` | Forensic investigations |
| User Account | `User-Account` | Identity-based threat hunting |
| Cryptocurrency Wallet | `Cryptocurrency-Wallet` | Ransomware investigations |

### Priority 3: Niche types (future milestones)

Process, Mutex, Windows Registry, Network Traffic, X.509 Certificate, Software -- endpoint/forensic-specific, low search volume.

## Input Type Detection Logic

Backend should resolve input to observable type using this priority order (first match wins):

1. **URL**: Starts with `http://` or `https://` --> `Url`
2. **Email**: Contains `@` with valid domain part --> `Email-Addr`
3. **IPv4**: Matches `^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$` --> `IPv4-Addr`
4. **IPv6**: Contains `:` and matches IPv6 patterns --> `IPv6-Addr`
5. **SHA-256**: Exactly 64 hex characters --> `StixFile`
6. **SHA-1**: Exactly 40 hex characters --> `StixFile`
7. **MD5**: Exactly 32 hex characters --> `StixFile`
8. **Domain**: Contains `.` with valid TLD --> `Domain-Name`
9. **Hostname**: Alphanumeric with hyphens, no dots --> `Hostname`
10. **Fallback**: Search by `observable_value` across all types (omit `entity_type` filter)

**Key implementation note**: For file hashes, OpenCTI stores the hash as the `observable_value` on `StixFile` entities. The same `stixCyberObservables` query with `value` filter works -- just change `entity_type` to `StixFile`. No need to query specific hash algorithm fields.

**Key implementation note**: The existing `IpSearchService.queryObservable()` method already uses the correct pattern: filter by `value` (matches `observable_value`) + `entity_type`. The universal search service just needs to resolve the appropriate `entity_type` values array based on detected input type.

## Threat Actors UI Refresh Specification

Per PROJECT.md: "4-col grid, no descriptions, clean subheading"

| Aspect | Current State | Target State |
|--------|--------------|-------------|
| Layout | Cards with name + description text | Cards with name only, no description paragraph |
| Card height | Variable (descriptions differ in length) | Uniform (consistent card sizing) |
| Grid | Unspecified column count | 4-column grid (responsive: 1/2/3/4 at sm/md/lg/xl) |
| Header area | Filters inline | Clean subheading: title + result count left, filters right |
| Detail view | Modal with all info | Modal unchanged (keeps descriptions, aliases, etc.) |

Data points per card:
- Actor name (primary, bold)
- Aliases (secondary, muted, comma-separated or first 2 as chips)
- Primary motivation (colored badge)
- Country/region of origin (if available, flag or text)
- Last modified date (subtle, bottom of card)

No backend changes required. Same `GET /threat-actors` endpoint, same response shape.

## Threat News UI Refresh Specification

Per PROJECT.md: "row-based layout, tags, pagination on top, no confidence"

| Aspect | Current State | Target State |
|--------|--------------|-------------|
| Layout | Grid cards (3-col) | Horizontal rows (one report per row, full width) |
| Confidence | Badge shown per report | Remove entirely |
| Pagination | Bottom only | Top AND bottom |
| Entity tags | Shown (max 4 visible) | Keep tags, possibly show more per row |
| Interaction | Card click opens modal | Row click opens modal (same behavior) |

Data points per row:
- Report name (primary text, left-aligned, takes most width)
- Published date (fixed-width column)
- Entity tags (colored chips for threat actors, malware, etc.)
- Created by (source organization, right side)
- External link icon (if references exist)

No backend changes required. Same `GET /threat-news` endpoint, same response shape.

## MVP Recommendation

Prioritize for v2.1 in this order:

1. **Universal search backend** (`ThreatSearchService`) -- Resolve input type via regex, query `stixCyberObservables` with appropriate `entity_type` filter. Reuse all relationship/indicator/sighting/note queries from existing `IpSearchService`. Conditionally include ip-api.com geo enrichment only when type is `IPv4-Addr` or `IPv6-Addr`. New route `POST /threat-search` (keep `/ip-search` as redirect or alias for backward compat).

2. **Universal search frontend** (`ThreatSearchPage.jsx`) -- Rename from `IpSearchPage`, update route to `/threat-search`. Add observable type badge to results header. Show type-detection hint below search input. Conditionally render geo panel only for IP types. Generalize D3Graph center node label.

3. **Threat Actors UI refresh** -- Frontend-only. New 4-col grid layout without description text. Clean header row with count and filters.

4. **Threat News UI refresh** -- Frontend-only. Row-based layout replacing card grid. Remove confidence. Pagination at top.

**Defer:**
- Priority 2/3 observable types: validate Priority 1 types work first
- Bulk search: needs queue infrastructure
- Search history/analytics page: not core to v2.1
- Multi-source enrichment: explicitly out of scope per PROJECT.md

## Sources

- [OpenCTI Data Model Documentation](https://docs.opencti.io/latest/usage/data-model/) -- STIX Cyber Observable types, extended model
- [OpenCTI Observations Documentation](https://docs.opencti.io/latest/usage/exploring-observations/) -- Observable vs Indicator distinction
- [OpenCTI Exclusion Lists](https://docs.opencti.io/latest/administration/exclusion-lists/) -- Supported indicator observable types
- [Elastic OpenCTI Integration](https://docs.elastic.co/integrations/ti_opencti) -- Full enumeration of 25+ observable types
- [Filigran Blog - Observables and Indicators](https://filigran.io/observables-indicators-and-infrastructure-in-cti/) -- CTI concept reference
- [ANY.RUN Threat Intelligence Lookup](https://any.run/threat-intelligence-lookup/) -- Universal search UI reference
- [Pulsedive](https://pulsedive.com/) -- Multi-type observable search patterns
- [AufaitUX Cybersecurity Dashboard Design](https://www.aufaitux.com/blog/cybersecurity-dashboard-ui-ux-design/) -- Card grid and dark theme patterns
- Existing codebase: `IpSearchService.php`, `OpenCtiService.php`, `IpSearchPage.jsx`, `ThreatActorsPage.jsx`, `ThreatNewsPage.jsx`

---
*Feature research for: AQUA TIP v2.1 Threat Search & UI Refresh*
*Researched: 2026-03-17*
