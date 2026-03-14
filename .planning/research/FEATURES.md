# Feature Research

**Domain:** Threat Intelligence Platform -- OpenCTI Integration (IP Search, Threat Actors, Threat Map, Threat News)
**Researched:** 2026-03-14
**Confidence:** HIGH (OpenCTI API structure verified via official docs; TIP feature landscape verified across multiple sources)

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist when a TIP claims to provide IP lookup, threat actors, threat map, and threat news. Missing any of these makes the product feel broken or incomplete.

#### IP Search (renamed from IOC Search)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| IP address input with search | Core functionality -- this is the primary CTA | LOW | Already built as mock; rewire to OpenCTI `stixCyberObservables` query filtered by `entity_type: "IPv4-Addr"` |
| Threat score display | Every TIP shows a risk score; OpenCTI provides `x_opencti_score` (0-100) | LOW | Map `x_opencti_score` to the existing score ring component |
| Observable metadata (ASN, country, first/last seen) | Analysts need context to triage IPs; OpenCTI SCOs include `created_at` and can link to Location entities | MEDIUM | OpenCTI IPv4 observables may not have ASN/geo natively -- depends on enrichment connectors running on the instance |
| Related indicators and relationships | Shows what malware/campaigns/actors link to this IP; core STIX relationship graph | MEDIUM | Query `stixCoreRelationships` from the observable node; render in the existing D3 graph component |
| Related reports | Analysts expect to see intelligence reports mentioning this IP | LOW | Query reports linked to the observable via relationships |
| Raw STIX data view | Power users expect to see raw JSON/STIX; already have a "Raw" tab | LOW | Pipe OpenCTI API response directly to the existing raw tab |
| Credit gating on search | Already built for Dark Web; users expect consistency | LOW | Reuse existing `DeductCredit` middleware -- already wired |
| Rate limit CTAs (guest upgrade + daily limit) | Already partially built in frontend (RATE-04, RATE-05) | LOW | Frontend JSX already renders these; just needs real API wiring |
| Loading and error states | Users expect feedback during API calls; mock page has none | LOW | Add skeleton loaders and error boundaries |
| Empty state for no results | OpenCTI may return nothing for unknown IPs | LOW | "No intelligence found for this IP" with suggestion to try another |

#### Threat Actors Page

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Searchable/filterable list of threat actors | Basic discoverability; every TIP has this | MEDIUM | Query OpenCTI `intrusionSets` with pagination and filters; display as card grid or table |
| Actor card with name, description, aliases | Minimum information for identification | LOW | OpenCTI intrusion sets have `name`, `description`, `aliases` fields |
| Country/region attribution | Analysts need to know origin/targeting; OpenCTI links intrusion sets to Location entities | MEDIUM | Resolve `originOf` or `targets` relationships to Location SDOs |
| Linked malware and tools | "What arsenal does this actor use?" is a primary analyst question | MEDIUM | Query `stixCoreRelationships` where relationship_type is "uses" and target entity_type is "Malware" or "Tool" |
| Linked attack patterns (TTPs) | MITRE ATT&CK mapping is standard in modern TIPs | MEDIUM | Query relationships to Attack-Pattern SDOs; display as TTP tags |
| Pagination | List could be large; must paginate | LOW | OpenCTI GraphQL uses cursor-based pagination (`first`, `after`) |

#### Threat Map Page

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Geographic markers from real data | The existing map uses hardcoded mock cities; users expect real locations | MEDIUM | Query OpenCTI Location entities (type "Country") linked to threats via relationships |
| Country-level threat counts | How many indicators/intrusion sets target or originate from each country | MEDIUM | Aggregate relationship counts per country from OpenCTI |
| Click-through to details | Clicking a marker should show related threats | MEDIUM | Link markers to filtered threat actor or indicator views |
| Attack type breakdown | The existing donut chart shows categories; should reflect real data | MEDIUM | Aggregate indicator labels or relationship types from OpenCTI |

#### Threat News Page

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| List of intelligence reports | Primary purpose of the page | MEDIUM | Query OpenCTI `reports` with pagination; display as card list |
| Report title, date, description | Minimum viable report listing | LOW | OpenCTI reports have `name`, `description`, `published`, `created` |
| Report source/author | Attribution matters for credibility | LOW | `createdBy` field on reports provides the source organization |
| Filter by date range | Analysts need to find recent reports | LOW | Use OpenCTI filter on `published` field with `gt`/`lt` operators |
| Search/filter by keyword | Finding specific topics | LOW | OpenCTI supports text search on `name` and `description` |
| Click-through to report detail | Users need to read full report content | MEDIUM | Navigate to a report detail page showing entities, observables, and content |

### Differentiators (Competitive Advantage)

Features that go beyond what a basic OpenCTI frontend provides and add value specific to AQUA TIP.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Unified search across all entity types | Most TIPs silo search by type; a single search bar that detects IP vs domain vs hash and routes accordingly | LOW | Already partially built -- the IOC detector service handles type detection; extend to query different OpenCTI entity types |
| Relationship graph visualization (D3) | OpenCTI's built-in graph is complex; a simplified, focused graph for a single observable is more accessible to non-CTI-experts | LOW | Already built as D3 force graph; populate with real relationship data |
| Credit-gated access model | OpenCTI is typically all-or-nothing access; credit-based metering enables freemium/tiered access | LOW | Already built; unique differentiator vs raw OpenCTI |
| Glassmorphism dark theme | Polished, modern UI vs OpenCTI's utilitarian interface | LOW | Already built; just needs real data |
| Threat actor "profile cards" with visual summary | OpenCTI shows raw data; a curated card with country flags, kill chain stage badges, and malware logos is more digestible | MEDIUM | Design card component pulling from intrusion set + relationships |
| Animated threat map with real-time feel | Static dots on a map are boring; animated arcs between source and target countries create engagement | HIGH | Significant frontend work; would need attack flow data (source country -> target country) which may not be directly available from OpenCTI |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Full OpenCTI GraphQL proxy | "Just expose the whole API" | Security nightmare -- exposes internal schema, enables data exfiltration, no rate limiting per query; also makes frontend tightly coupled to OpenCTI schema | Build specific Laravel endpoints per feature (IP search, threat actors, reports, locations) that proxy specific GraphQL queries server-side |
| Real-time WebSocket threat feed | "Show attacks happening now" | OpenCTI doesn't provide real-time attack streams; faking it misleads users; WebSocket infrastructure adds complexity | Use polling with reasonable intervals (5-15 min) for "recent" data; remove the "LIVE" badge from threat map unless data is genuinely live |
| STIX bundle import/export | "Let users upload their own STIX data" | Requires STIX validation, deduplication, and conflict resolution -- essentially rebuilding OpenCTI's ingestion pipeline | Link to the OpenCTI instance for data management; AQUA TIP is a consumer/viewer, not a STIX management tool |
| Full MITRE ATT&CK matrix view | "Show the whole matrix with coverage" | Massive UI complexity; OpenCTI already does this well; duplicating it is wasted effort | Show ATT&CK technique tags on threat actors/reports as simple badges; link to MITRE for full matrix |
| Multi-source enrichment (VirusTotal, AbuseIPDB, Shodan) | "Show data from all sources at once" | Each external API needs its own key, rate limits, error handling, and cost management; scope creep from 1 data source to N | Defer to a future milestone; focus v2.0 on OpenCTI as the single source of truth; the mock UI shows these sources but real integration is a separate effort |
| User-submitted IOCs / community features | "Let users contribute indicators" | Moderation, quality control, abuse prevention, STIX validation -- all hard problems | Read-only consumer of OpenCTI data for v2.0 |

## Feature Dependencies

```
[OpenCTI GraphQL Service in Laravel]
    |
    +-- [IP Search Backend] -- requires OpenCTI service
    |       +-- [IP Search Frontend] -- requires IP Search Backend
    |
    +-- [Threat Actors Backend] -- requires OpenCTI service
    |       +-- [Threat Actors Frontend] -- requires Threat Actors Backend
    |
    +-- [Threat Map Backend] -- requires OpenCTI service + Location queries
    |       +-- [Threat Map Frontend] -- requires Threat Map Backend
    |
    +-- [Threat News Backend] -- requires OpenCTI service
    |       +-- [Threat News Frontend] -- requires Threat News Backend
    |
    [Credit Middleware] -- already exists, reused by all search endpoints
    |
    [Rate Limit CTAs] -- already partially built, depends on credit API response
```

### Dependency Notes

- **All features require OpenCTI GraphQL service**: A shared Laravel service class that handles GraphQL query execution, Bearer token auth, error handling, and response normalization. This is the foundational dependency -- build it first.
- **IP Search is the simplest integration**: The existing `SearchController` already has the structure (credit deduction, search logging); replace `MockThreatDataService` with an OpenCTI query service.
- **Threat Map depends on Location entities**: OpenCTI must have Location (Country) entities with relationships to indicators/intrusion sets. If the OpenCTI instance lacks geographic data, the map will be empty.
- **Threat News depends on Report entities**: If no reports are ingested into OpenCTI, this page shows nothing. Need to verify report availability on the instance.
- **Rate limit CTAs (RATE-04, RATE-05)**: Frontend JSX already exists in `IocSearchPage.jsx` (lines 125-143). These are independent of OpenCTI -- they just need the credit API response which already works.

## MVP Definition

### Launch With (v2.0)

Minimum viable OpenCTI integration -- what's needed to replace mock data with real intelligence.

- [ ] **OpenCTI GraphQL service class** -- Shared Laravel service with query execution, auth, error handling, response caching
- [ ] **IP Search backend** -- Laravel endpoint querying `stixCyberObservables` by IPv4 value, returning score, relationships, and metadata
- [ ] **IP Search frontend wired to real API** -- Replace mock data rendering with API responses; keep existing D3 graph, tabs, and score ring
- [ ] **Threat Actors listing** -- Backend querying `intrusionSets` with pagination; frontend rendering card grid with name, description, aliases, and country
- [ ] **Threat News listing** -- Backend querying `reports` with pagination and date filtering; frontend rendering report cards with title, date, source
- [ ] **Threat Map with real locations** -- Backend querying Location entities and their threat relationships; frontend rendering Leaflet markers from real country data
- [ ] **Rate limit CTAs wired** -- RATE-04 (guest upgrade) and RATE-05 (daily limit) already in JSX; ensure they display correctly with real credit responses
- [ ] **Rename IOC Search to IP Search** -- Codebase-wide rename (routes, components, page titles, sidebar nav)

### Add After Validation (v2.x)

Features to add once the core OpenCTI integration is stable and data quality is confirmed.

- [ ] **Report detail page** -- Click-through from Threat News to a full report view with entities, observables, and STIX content
- [ ] **Threat actor detail page** -- Click-through from listing to a full profile with arsenal, TTPs, victimology
- [ ] **Search suggestions/autocomplete** -- As user types, suggest matching observables from OpenCTI
- [ ] **Threat map click-through** -- Clicking a country marker shows related threats filtered to that location
- [ ] **Domain and hash search** -- Extend IP search to support domain names (`Domain-Name`) and file hashes (`StixFile`) as observable types

### Future Consideration (v3+)

- [ ] **Multi-source enrichment** -- VirusTotal, AbuseIPDB, Shodan alongside OpenCTI data
- [ ] **MITRE ATT&CK matrix visualization** -- Full matrix view with technique coverage from OpenCTI data
- [ ] **Animated threat map arcs** -- Source-to-target country attack flow animations
- [ ] **Alert/notification system** -- Subscribe to threat actors or indicators for updates
- [ ] **Export/sharing** -- PDF report generation, STIX bundle export for sharing

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority | Depends On |
|---------|------------|---------------------|----------|------------|
| OpenCTI GraphQL service class | HIGH | LOW | P1 | Nothing (foundational) |
| Rename IOC to IP Search | MEDIUM | LOW | P1 | Nothing |
| IP Search backend (OpenCTI) | HIGH | MEDIUM | P1 | GraphQL service |
| IP Search frontend wiring | HIGH | MEDIUM | P1 | IP Search backend |
| Rate limit CTAs (RATE-04/05) | MEDIUM | LOW | P1 | Credit API (exists) |
| Threat Actors listing | HIGH | MEDIUM | P1 | GraphQL service |
| Threat News listing | HIGH | MEDIUM | P1 | GraphQL service |
| Threat Map real data | MEDIUM | MEDIUM | P1 | GraphQL service + Locations |
| Report detail page | MEDIUM | MEDIUM | P2 | Threat News listing |
| Threat actor detail page | MEDIUM | MEDIUM | P2 | Threat Actors listing |
| Domain/hash search | MEDIUM | LOW | P2 | IP Search pattern |
| Search autocomplete | LOW | MEDIUM | P3 | Any search endpoint |
| Multi-source enrichment | HIGH | HIGH | P3 | Separate API integrations |

**Priority key:**
- P1: Must have for v2.0 launch
- P2: Should have, add in v2.x once core is stable
- P3: Nice to have, future milestone

## Competitor Feature Analysis

| Feature | OpenCTI Native UI | MISP | VirusTotal | AQUA TIP Approach |
|---------|-------------------|------|------------|-------------------|
| IP lookup | Full observable view with all relationships, complex UI | IOC search with correlations | Comprehensive multi-engine scan results | Simplified, focused view with score ring, key relationships, and credit gating |
| Threat actors | Full intrusion set management with knowledge graph | Galaxy clusters for threat actors | Not a focus | Card-based listing with visual summary, country attribution |
| Reports/news | Full report management with entities, observables, STIX content | Event-based with attributes | Community reports | Curated card listing focused on readability, date-sorted |
| Threat map | Basic geographic view if Location entities exist | Geolocation via attributes | Not available | Leaflet map with glassmorphism overlay cards, attack type donut |
| Access control | Role-based, organization-level | API key or session-based | API key with quotas | Credit-based metering enabling freemium model |
| UI/UX | Utilitarian, data-dense, steep learning curve | Functional but dated | Clean but information-dense | Dark glassmorphism, accessible to non-CTI-experts |

## OpenCTI Data Availability Risks

These features depend on what data exists in the OpenCTI instance at `http://192.168.251.20:8080`:

| Data Type | GraphQL Query | Risk if Empty | Mitigation |
|-----------|---------------|---------------|------------|
| IPv4 observables | `stixCyberObservables(filters: {key: "entity_type", values: ["IPv4-Addr"]})` | IP Search returns nothing | Show "No data found" with clear messaging; consider seeding test data |
| Intrusion sets | `intrusionSets(first: 20)` | Threat Actors page is empty | Verify data exists before building page; show placeholder if empty |
| Reports | `reports(first: 20, orderBy: published, orderMode: desc)` | Threat News page is empty | Same -- verify and handle gracefully |
| Locations (Country) | `locations(filters: {key: "entity_type", values: ["Country"]})` | Threat Map has no markers | Fall back to existing mock data with a "demo data" badge, or show empty map |
| Relationships | `stixCoreRelationships(...)` | IP graph and actor details are sparse | Show available data; don't fake relationships |

## Sources

- [OpenCTI GraphQL API Documentation](https://docs.opencti.io/latest/reference/api/)
- [OpenCTI Data Model (STIX)](https://docs.opencti.io/latest/usage/data-model/)
- [OpenCTI Threats (Intrusion Sets, Threat Actors)](https://docs.opencti.io/latest/usage/exploring-threats/)
- [OpenCTI Analysis (Reports)](https://docs.opencti.io/latest/usage/exploring-analysis/)
- [OpenCTI GraphQL Playground Guide](https://docs.opencti.io/latest/development/api-usage/)
- [OpenCTI Filter Syntax](https://docs.opencti.io/latest/reference/filters/)
- [Filigran Blog: Threat Actors vs Intrusion Sets](https://filigran.io/cti-concepts-threat-actors-vs-intrusion-sets/)
- [Top TIP Features 2026 - Stellar Cyber](https://stellarcyber.ai/learn/top-threat-intelligence-platforms/)
- [Palo Alto Networks - What is a TIP](https://www.paloaltonetworks.com/cyberpedia/what-is-a-threat-intelligence-platform)
- [Top Cyber Threat Maps 2026](https://cybersecuritynews.com/cyber-attack-maps/)
- [Global Threat Map open-source project](https://www.helpnetsecurity.com/2026/02/04/global-threat-map-open-source-osint/)

---
*Feature research for: AQUA TIP v2.0 OpenCTI Integration*
*Researched: 2026-03-14*
