# Research Summary — v6.1 Threat Map Buffer & Threat Actor Depth

**Synthesized:** 2026-04-17
**Sources:** STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md
**Confidence:** HIGH (architecture & stack), MEDIUM (OpenCTI Organization/Region runtime behavior)

---

## Milestone Overview

v6.1 transforms the live Threat Map from a transient pulse-and-fade visualization (capped at 100) into a persistent, scalable, user-configurable surface that buffers up to 2000 attack origins with smooth marker rotation (pulse-on-arrival → settle → quiet evict). It also deepens the Threat Actor surface with two new intelligence views: a Victimology tab (countries/regions/sectors/organizations targeted) replacing the thin Campaigns tab in the actor modal, and a top-level Campaigns toggle on the Threat Actors page surfacing OpenCTI Campaign entities (distinct from Intrusion Sets) with attribution back to actors. All work is feature depth on existing entitlements — no plan/credit changes.

---

## Stack Additions

**Single new dependency:** `leaflet.markercluster@1.5.3`
- Only viable option for vanilla Leaflet 1.9.4 (no react-leaflet in this project)
- Import only `MarkerCluster.css` (geometry); skip `MarkerCluster.Default.css` (light-themed)
- Custom `iconCreateFunction` with `L.divIcon` and inline styles matching design tokens (red/amber/cyan)
- Lazy-loaded via dynamic `import('leaflet.markercluster')` gated on `bufferSize > 500`

**No other deps:**
- Buffer state: existing React `useState` + `useRef` patterns scale cleanly; no Zustand/Redux
- localStorage: reuse the inline try/catch + `useState` initializer pattern from `aqua-tip:panels-collapsed`; new key `aqua-tip:threat-map-buffer-size`
- Backend Campaigns + Victimology: pure additive GraphQL queries via existing `OpenCtiService` (zero-dep raw GraphQL)
- SSE backend: stateless per-connection — `MAP_EVENT_BUFFER` env var does not exist; configurable buffer is a frontend-only concern (snapshot is fixed at OpenCTI's `first: 100`, larger buffers fill incrementally via live SSE)

---

## Feature Categories

### 1. Persistent Map Buffer + Marker Lifecycle
**Table stakes:**
- Static settled markers persist on map (today they vanish in 1.6s)
- New arrivals: pulse ring for ~2s, then settle as static dot
- Oldest marker fades out quietly when buffer fills
- Buffer survives SSE reconnects within session

**Differentiators:**
- Configurable buffer size (100/500/1000/2000) via dropdown
- localStorage-persisted choice
- Country counter aggregation respects buffer size

**Anti-features:**
- No backend buffer scaling beyond initial snapshot (fills incrementally — accepted UX)
- No multi-tab buffer sync (per-tab state)

### 2. Marker Clustering at Scale
**Table stakes:**
- Auto-enable when `bufferSize > 500`
- Cluster icons styled to dark glassmorphism theme
- Click to expand, zoom-to-bounds

**Differentiators:**
- `chunkedLoading: true` — distributes cluster computation across animation frames
- Threshold-based, not always-on (preserves attack-origin detail at 100–500)

**Anti-features:**
- No spider-leg expansion at max zoom (default cluster behavior is fine)
- No cluster-level filtering

### 3. Threat Actor Modal — Victimology Tab
**Table stakes:**
- Replaces the existing Campaigns tab
- Shows targeted **countries** (with flags + counts)
- Shows targeted **regions** (continents/geo regions)
- Shows targeted **sectors** (industries)
- Shows targeted **organizations** (named victim entities)

**Differentiators:**
- Visual layout mirrors OpenCTI victimology view (grouped, scannable)
- Lazy-fetched on tab open (not on modal open) — avoids overfetch

**Anti-features:**
- No interactive victimology map (list view only for v6.1)
- No relationship export

### 4. Threat Actors Page — Campaigns Toggle
**Table stakes:**
- Toolbar pill toggle: **Threat Actors** ↔ **Campaigns** (left of search input)
- Campaigns view: paginated list of OpenCTI Campaign entities (NOT Intrusion Sets)
- Campaign card shows `name`, `first_seen`/`last_seen`, `objective`, `attributed_to` (links back to Intrusion Set)
- Detail modal for Campaigns (similar pattern to actor modal)
- URL-state preserved via `?view=campaigns` query param (existing `useSearchParams` pattern)

**Differentiators:**
- Attribution chip on card (`attributed_to` Intrusion Set name) — key visual signal
- Refresh-safe view selection via URL

**Anti-features:**
- No cross-view filtering (filter state isolated per view)
- No Campaign-to-Actor navigation graph (chip is informational only for v6.1)

---

## Build Order (synthesized from ARCHITECTURE.md)

Backend phases first (unblock frontend consumers), then frontend refactor before extension:

| Order | Phase | Scope | Depends On |
|-------|-------|-------|------------|
| 1 | Backend: Victimology query extension | Extend `executeEnrichmentQuery()` with 4 new `stixCoreRelationships` blocks (Country/Region/Sector/Organization), normalize response | — |
| 2 | Backend: Campaigns service + endpoint | New `ThreatCampaignService.php`, `ThreatCampaign/IndexController.php`, `GET /api/threat-campaigns`, 15-min cache | — |
| 3 | Frontend: Buffer refactor (foundational) | Extract `useThreatMapBuffer` hook, parameterize `MAX_EVENTS`, settled-marker layer, pulse-then-settle lifecycle, eviction, marker registry ref | — |
| 4 | Frontend: Buffer-size dropdown | Selector in overlay panel, localStorage persistence, wire to buffer hook | Phase 3 |
| 5 | Frontend: Marker clustering | Add `leaflet.markercluster` dep, conditional layer swap when `bufferSize > 500`, dark-theme `iconCreateFunction` | Phase 3, 4 |
| 6 | Frontend: Victimology tab | Modal tab swap (remove Campaigns, add Victimology), 4-section layout (countries/regions/sectors/orgs), lazy fetch on tab open | Phase 1 |
| 7 | Frontend: Campaigns toggle | Pill toggle in toolbar, `?view=campaigns` URL state, Campaigns card grid + detail modal | Phase 2 |
| 8 | Integration validation | E2E walk-through, performance check at 2000 markers, cluster behavior at boundaries | Phases 3–7 |

Phases 1+2 can run in parallel (backend). Phase 3 is largest and most complex frontend phase — keep it standalone, do not bundle. Phases 4+5 sequential after 3. Phases 6+7 independent of map work and can run in parallel after 1+2.

---

## Top Pitfalls

| # | Tag | Risk | Prevention |
|---|-----|------|------------|
| PITFALL-01 | Buffer | SSE `onmessage` closure captures `MAX_EVENTS` at module scope — dropdown change doesn't propagate, or causes SSE reconnect storm if added to deps | Use `useRef` synced via separate effect; closure reads from ref |
| PITFALL-02 | Buffer | React `events` array eviction does NOT auto-remove `L.Marker` — Leaflet DOM grows unbounded | `markerInstancesRef` (Map keyed by event ID) with diff-reconciliation on every buffer change |
| PITFALL-06 | Cluster | Toggling MarkerCluster on/off without `map.removeLayer(oldGroup)` first → double-render of every marker | Single `markerGroupRef`, explicit layer swap on cross-threshold transitions |
| PITFALL-09 | Campaigns | `Campaign` STIX type does NOT share fields with `IntrusionSet` (no aliases, primary_motivation, resource_level, goals); ordering enum is `CampaignsOrdering` not `IntrusionSetsOrdering` — copy-paste of `ThreatActorService` will fail | Standalone `ThreatCampaignService.php`, do not subclass or share base |
| PITFALL-12 | Victimology | OpenCTI `Organization` lives under `Identity` abstract type — `toTypes: ["Organization"]` may silently return zero results on some OpenCTI versions | Use `toTypes: ["Identity"]` + filter by `entity_type` in normalization; verify against live OpenCTI playground at `192.168.251.20` first |

Full pitfall catalog (24 items) in PITFALLS.md.

---

## Open Questions (resolve in early phases)

1. **OpenCTI Region data availability** — Does the instance at `192.168.251.20:8080` have Region entities populated? `targetedRegions` returns empty (not error) if not — surface as N/A in UI, don't crash. *Verify in Phase 1.*
2. **`Organization` vs `Identity` STIX type resolution** — Which `toTypes` filter actually works on this OpenCTI version? Schema probe needed in GraphiQL playground. *Verify in Phase 1.*
3. **`leaflet.markercluster` + `useLeaflet` lazy-import compat** — markercluster mutates `L` namespace as side effect; confirm dynamic import works with the existing lazy-load pattern. *Verify in Phase 5 spike.*
4. **`countryCounts` aggregation perf at 2000 events** — currently O(n) on every SSE message. May need memoization or debouncing at large buffers. *Address in Phase 3 if observed.*
5. **`CampaignsOrdering` enum field names** — verify against live GraphiQL (likely `published`, `first_seen`, `last_seen`, `created_at`). *Verify in Phase 2.*

---

## What This Milestone Is NOT

- ❌ Backend MAP_EVENT_BUFFER scaling — backend is stateless, snapshot stays at 100, larger buffers fill via live SSE
- ❌ react-leaflet adoption — vanilla Leaflet stays
- ❌ New state library (Zustand/Redux) — existing React state suffices
- ❌ Backend payment/credit/plan changes — no new pricing or gating
- ❌ Interactive victimology world map — list view only
- ❌ Campaign-to-Actor navigation graph — attribution chip is informational
- ❌ Cross-view filter sharing on Threat Actors page — view-isolated state
- ❌ Multi-tab buffer sync — per-tab state
- ❌ STIX import/export, OpenCTI admin UI, real-time WebSocket push (still out of scope from PROJECT.md)

---

*Single source of truth for downstream phases. See STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md for full detail.*
