# Technology Stack: v2.1 Threat Search & UI Refresh

**Project:** Aqua TIP — Universal Observable Search + UI Refresh
**Researched:** 2026-03-17
**Scope:** NEW capabilities only (existing stack validated in v2.0)

## Verdict: Zero New Dependencies

The existing stack handles everything needed for v2.1. No new npm packages, no new Composer packages, no new infrastructure. This milestone is a feature expansion and UI refactor within the current architecture.

## What Already Exists (DO NOT ADD)

| Technology | Version | Already Used For | Reuse For v2.1 |
|------------|---------|------------------|-----------------|
| React 19 | ^19.2.4 | All pages | Threat Search page, UI refresh |
| Vite 7 | ^7.3.1 | Build tooling | No changes needed |
| Tailwind CSS 3 | ^3.4.19 | All styling | Card/table layout refresh |
| Framer Motion | ^12.35.2 | Landing animations, modals | Detail modals, list transitions |
| D3 | ^7.9.0 | IP Search relationship graph | Relationship graph for all observable types |
| Lucide React | ^0.577.0 | Icons throughout | Type-specific observable icons |
| React Router DOM 7 | ^7.13.1 | All routing | Route rename /ip-search -> /threat-search |
| Chart.js | ^4.5.1 | Dashboard charts | Not needed for v2.1 |
| Laravel HTTP Client | Built-in | OpenCTI GraphQL proxy | Observable search for all types |
| Laravel Cache | Built-in | 15-min search cache | Same caching for all observable types |

## What v2.1 Needs (Built Without New Deps)

### 1. Observable Type Detection (Frontend — Pure JavaScript)

**Purpose:** Auto-detect what type of observable the user typed in the search box.
**Approach:** A utility module with regex patterns. No library needed.

Observable types to support and their detection patterns:

| Observable Type | OpenCTI entity_type | Detection Method | Confidence |
|----------------|---------------------|------------------|------------|
| IPv4 Address | `IPv4-Addr` | Regex: `^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$` + octet validation | HIGH |
| IPv6 Address | `IPv6-Addr` | Regex: colon-hex groups, `::` shorthand | HIGH |
| Domain Name | `Domain-Name` | Regex: valid hostname with TLD, not an IP | HIGH |
| URL | `Url` | Regex: starts with `http://` or `https://` | HIGH |
| Email Address | `Email-Addr` | Regex: standard email format | HIGH |
| MD5 Hash | `StixFile` | Regex: `^[a-fA-F0-9]{32}$` | HIGH |
| SHA-1 Hash | `StixFile` | Regex: `^[a-fA-F0-9]{40}$` | HIGH |
| SHA-256 Hash | `StixFile` | Regex: `^[a-fA-F0-9]{64}$` | HIGH |
| SHA-512 Hash | `StixFile` | Regex: `^[a-fA-F0-9]{128}$` | HIGH |
| Hostname | `Hostname` | Regex: valid hostname without TLD dots (single label) | MEDIUM |
| MAC Address | `Mac-Addr` | Regex: colon/dash separated hex pairs | HIGH |

**Why no `ioc-extractor` npm package:** The ioc-extractor library (github.com/ninoseki/ioc-extractor) extracts IOCs from freeform text blocks. We need single-input type detection, which is ~50 lines of regex. Adding a dependency for this is over-engineering. The library also pulls in TypeScript types and handles defanging/refanging, which are irrelevant for a search input field.

### 2. Universal Observable GraphQL Query (Backend — PHP)

**Purpose:** Expand `IpSearchService` into a `ThreatSearchService` that queries any observable type.
**Approach:** The existing `stixCyberObservables` GraphQL query already supports filtering by `entity_type`. The current code hardcodes `['IPv4-Addr', 'IPv6-Addr']` in the filter. Changing this to accept a dynamic type is a one-line change.

Key OpenCTI GraphQL details (verified from existing codebase):
- Query: `stixCyberObservables(filters: $filters, first: 1)` — already works for ALL observable types
- Filter key: `entity_type` with `values` array — just pass the detected type
- Filter key: `value` for exact match on `observable_value` — works for all types
- For file hashes: filter by `hashes.MD5`, `hashes.SHA-1`, `hashes.SHA-256`, or use `value` filter on the hash string

### 3. Type-Specific Enrichment (Backend — PHP)

**Purpose:** Different observable types need different enrichment beyond OpenCTI.
**Approach:** Conditional enrichment in the service layer.

| Observable Type | Enrichment | Source | Already Exists |
|----------------|------------|--------|----------------|
| IPv4-Addr, IPv6-Addr | Geo (ASN, country, city, ISP) | ip-api.com | YES — `fetchGeoFromIpApi()` |
| Domain-Name | WHOIS-like data | None for now | NO — out of scope |
| Email-Addr | None | N/A | N/A |
| StixFile (hashes) | None | N/A | N/A |
| Url | None | N/A | N/A |

Geo enrichment only applies to IP types. Other observable types return OpenCTI data only (score, labels, relationships, indicators, sightings, notes). This is sufficient for v2.1.

### 4. UI Refresh (Frontend — Tailwind CSS Only)

**Purpose:** Refresh Threat Actors (4-col grid, no descriptions) and Threat News (row-based, tags, no confidence).
**Approach:** Tailwind utility classes. No new CSS framework or component library.

Existing patterns to reuse:
- `bg-surface/60 border border-border backdrop-blur-sm` — glassmorphism cards
- `rounded-xl` — card corners
- Framer Motion `AnimatePresence` — already used in both pages for modals
- `PaginationControls` component — already shared between pages
- `SkeletonCard` component — already shared for loading states

## Alternatives Considered and Rejected

| What | Alternative | Why Rejected |
|------|-------------|--------------|
| IOC type detection | `ioc-extractor` npm package | Over-engineered for single-input detection; 50 lines of regex suffice |
| UI component library | shadcn/ui, Radix UI | Project uses custom Tailwind components; adding a component library mid-project creates inconsistency |
| Form validation | Zod, Yup | Single search input with regex detection; no complex form state |
| Table component | TanStack Table | Threat News "row layout" is a styled card list, not a data table with sorting/filtering |
| State management | Zustand, Redux | Page-local state with `useState` + `useCallback` is sufficient; no cross-page state needed |
| GraphQL client | Apollo, urql | Backend proxies GraphQL; frontend sends REST POST to Laravel, not direct GraphQL |

## Backend Changes (No New Packages)

### New Service: ThreatSearchService

Replaces `IpSearchService`. Key differences:
- Accepts `{ query, type }` instead of just `{ ip }`
- `type` is validated against allowed OpenCTI entity types
- Conditional geo enrichment (IP types only)
- Same caching strategy (15-min, keyed by `threat_search:{type}:{hash}`)
- Same credit gating, same refund-on-failure pattern

### New Controller Endpoint

- `POST /api/threat-search` replaces `POST /api/ip-search`
- Request body: `{ query: string, type?: string }` (type auto-detected on backend if omitted)
- Keep `/api/ip-search` as deprecated alias for backwards compatibility during transition

### Validation Rules (Laravel)

```php
// No new package needed — Laravel's built-in validation
'query' => ['required', 'string', 'max:255'],
'type'  => ['sometimes', 'string', 'in:IPv4-Addr,IPv6-Addr,Domain-Name,Url,Email-Addr,StixFile,Hostname,Mac-Addr'],
```

## Frontend Changes (No New Packages)

### New Utility: `src/utils/observable-type.js`

~50 lines. Pure functions:
- `detectObservableType(input)` — returns `{ type, label, icon }` or `null`
- `getObservableIcon(type)` — maps type to Lucide icon component
- `getObservableColor(type)` — maps type to design system color

### Page Changes

| Page | Change | Complexity |
|------|--------|------------|
| `IpSearchPage.jsx` | Rename to `ThreatSearchPage.jsx`, add type dropdown, adapt result display | Medium |
| `ThreatActorsPage.jsx` | 4-col grid, remove descriptions, clean subheading | Low |
| `ThreatNewsPage.jsx` | Row-based layout, add tags, move pagination to top, remove confidence | Low |
| `App.jsx` | Route `/ip-search` -> `/threat-search`, add redirect for old URL | Low |
| `api/ip-search.js` | Rename to `api/threat-search.js`, update endpoint | Low |

## Installation

```bash
# No installation needed. Zero new dependencies.
# Existing package.json and composer.json are unchanged.
```

## OpenCTI Observable Type Reference

Confirmed entity_type values used in OpenCTI GraphQL API (from existing codebase analysis + OpenCTI documentation):

| entity_type | STIX Type | Example Value |
|-------------|-----------|---------------|
| `IPv4-Addr` | ipv4-addr | `192.168.1.1` |
| `IPv6-Addr` | ipv6-addr | `2001:db8::1` |
| `Domain-Name` | domain-name | `example.com` |
| `Url` | url | `https://evil.com/payload` |
| `Email-Addr` | email-addr | `attacker@evil.com` |
| `StixFile` | file | MD5/SHA-1/SHA-256/SHA-512 hash |
| `Hostname` | hostname | `webserver01` |
| `Mac-Addr` | mac-addr | `00:1B:44:11:3A:B7` |
| `Cryptocurrency-Wallet` | cryptocurrency-wallet | Bitcoin/Ethereum address |
| `User-Account` | user-account | Username or account ID |
| `Software` | software | Software name + version |

**Priority for v2.1:** IPv4-Addr, IPv6-Addr, Domain-Name, Url, Email-Addr, StixFile (hashes). Others are stretch goals.

## Sources

- [OpenCTI Data Model](https://docs.opencti.io/latest/usage/data-model/) — entity type taxonomy
- [OpenCTI Observations](https://docs.opencti.io/latest/usage/exploring-observations/) — observable types overview
- [OpenCTI Entity Types](https://docs.opencti.io/latest/administration/entities/) — entity type configuration
- [OpenCTI GraphQL API](https://docs.opencti.io/latest/reference/api/) — API reference
- [STIX 2.1 Cyber Observable Objects](https://docs.oasis-open.org/cti/stix/v2.1/cs01/stix-v2.1-cs01.html) — STIX SCO specification
- [OpenCTI Python Client - Observable Types](https://github.com/OpenCTI-Platform/client-python/blob/master/pycti/entities/opencti_stix_cyber_observable.py) — entity_type mapping
- [Elastic OpenCTI Integration](https://docs.elastic.co/integrations/ti_opencti) — confirmed observable type list
- [ioc-extractor npm](https://www.npmjs.com/package/ioc-extractor) — evaluated and rejected
- Existing codebase: `IpSearchService.php` — confirmed `stixCyberObservables` query works with `entity_type` filter
