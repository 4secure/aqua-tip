# Phase 34: Enriched Threat Actor Modal - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can access deep intelligence about a threat actor by opening their modal. The modal uses a tabbed layout with an Overview tab (existing data) and enrichment tabs (TTPs, Tools & Malware, Campaigns, Relationships) fetched on demand via a new backend endpoint. The enrichment data comes from OpenCTI's intrusion set relationships.

</domain>

<decisions>
## Implementation Decisions

### Modal Layout
- **D-01:** Tabbed sections inside the modal. Header area (name, aliases, motivation badge, resource_level badge, modified date) stays fixed above the tabs. Tabs: Overview, TTPs, Tools, Campaigns, Relationships.
- **D-02:** Overview tab contains the current modal content: description, goals, targeted countries, targeted sectors, external references.
- **D-03:** Each enrichment tab (TTPs, Tools, Campaigns, Relationships) shows data fetched from a new enrichment endpoint (fetch-on-open pattern).

### TTP Display
- **D-04:** TTPs grouped by MITRE ATT&CK tactic headers (e.g. Initial Access, Execution, Persistence). Each technique shows name + ATT&CK ID (e.g. T1566). Techniques listed as bullet points under their tactic group.
- **D-05:** Tactic ordering follows MITRE ATT&CK kill chain order when possible.

### Tools & Malware Tab
- **D-06:** Tools and malware displayed as chips/badges with names. These come from "uses" relationships to Tool and Malware entity types in OpenCTI.

### Campaigns Tab
- **D-07:** Campaigns listed with name and date range (first_seen/last_seen if available). These come from "attributed-to" relationships from Campaign entities.

### Relationships Tab
- **D-08:** D3 force-directed relationship graph matching the existing `D3Graph` component pattern from ThreatSearchPage. Threat actor is the center node, connected entities (other actors, malware, tools, campaigns, identities) radiate outward with entity-type-based coloring and labeled edges.

### Loading & Empty States
- **D-09:** Tab bar renders immediately when modal opens. Active tab shows pulsing skeleton lines (animate-pulse pattern) while enrichment data fetches.
- **D-10:** Each tab has its own empty state message (e.g. "No TTPs found for this actor") with a muted icon. Tabs with no data are NOT hidden — they remain clickable and show the empty state.

### Data Freshness
- **D-11:** New enrichment endpoint cached 15 minutes server-side (matching existing ThreatActorService cache pattern). Every modal open hits the API; server serves cached response. No client-side cache.

### Backend
- **D-12:** New endpoint `GET /api/threat-actors/{id}/enrichment` returns TTPs, tools, malware, campaigns, and relationships for a single intrusion set by ID.
- **D-13:** New method on ThreatActorService that queries OpenCTI for the enrichment relationships (attack patterns via "uses", tools/malware via "uses", campaigns via "attributed-to", plus general stixCoreRelationships for the graph).

### Frontend
- **D-14:** New API function `fetchThreatActorEnrichment(id)` in `threat-actors.js`.
- **D-15:** Modal refactored to include tab state management. Enrichment fetch triggered on modal open (not on tab switch — fetch all enrichment data once).

### Claude's Discretion
- Tab bar styling (underline, pill, or segment style — should match dark theme)
- Whether to extract the D3 graph into a shared component or duplicate with adaptations
- Graph height inside the modal tab (may need to be smaller than ThreatSearchPage's 450px)
- How to extract ATT&CK tactic grouping from OpenCTI kill_chain_phases field
- Skeleton shape per tab (how many lines, widths)
- Whether the enrichment endpoint returns a flat structure or nested by relationship type

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` -- ACTOR-01 (enriched threat actor modal with TTPs, tools, campaigns, targeted sectors)

### Target Page & Modal
- `frontend/src/pages/ThreatActorsPage.jsx` -- Current ThreatActorModal (line 345-539), ThreatActorCard (line 257-341), page state management
- `frontend/src/api/threat-actors.js` -- API client for threat actors (needs new enrichment function)

### Backend Service & Controller
- `backend/app/Services/ThreatActorService.php` -- GraphQL queries for intrusion sets, normalizeResponse, relationship flattening helpers
- `backend/app/Http/Controllers/ThreatActor/IndexController.php` -- Existing list endpoint pattern
- `backend/app/Services/OpenCtiService.php` -- GraphQL query method used by all services
- `backend/routes/api.php` -- Route registration

### D3 Graph Reference
- `frontend/src/pages/ThreatSearchPage.jsx` lines 14-56 (entityColor map) and 58-162 (D3Graph component) -- Force-directed graph to replicate in Relationships tab

### Design System
- `frontend/tailwind.config.js` -- Color tokens (violet, cyan, amber, red, surface, border)
- `frontend/src/styles/glassmorphism.css` -- Glass effect utilities

### Prior Phase Context
- `.planning/phases/30-quick-wins/30-CONTEXT.md` -- D-05 (animate-pulse skeleton pattern)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `D3Graph` component (ThreatSearchPage:59-162): Force-directed graph with entity-type coloring, drag support, edge labels. Can be extracted or adapted for the Relationships tab.
- `entityColor()` function (ThreatSearchPage:15-55): Maps entity types to hex colors for graph nodes.
- `useFormatDate` hook: Already used in ThreatActorModal for modified date.
- `useAutoRefresh` hook: Already wired on ThreatActorsPage — no changes needed.
- `SkeletonCard` component: Used for grid loading, but tab skeletons will need custom skeleton lines.
- `AnimatePresence` + `motion.div`: Already used for modal open/close animation.

### Established Patterns
- Modal pattern: Fixed overlay with backdrop blur, motion animations, Escape key handler, body scroll lock (ThreatActorsPage:345-539)
- Backend service pattern: GraphQL query method + normalizeResponse + Cache::remember with 15-min TTL
- API client pattern: `apiClient.get()` calls in `frontend/src/api/` modules
- Glassmorphism cards: `bg-surface/60 border border-border backdrop-blur-sm rounded-xl`

### Integration Points
- New route: `GET /api/threat-actors/{id}/enrichment` registered in `backend/routes/api.php`
- New controller or method for enrichment endpoint
- New `fetchThreatActorEnrichment(id)` in `frontend/src/api/threat-actors.js`
- ThreatActorModal refactored to manage tab state and call enrichment API on open
- D3 graph needs dynamic import (`import('d3')`) matching existing pattern

</code_context>

<specifics>
## Specific Ideas

- Tabbed layout with fixed header above tabs — user wants Overview, TTPs, Tools, Campaigns, Relationships as separate tabs
- TTPs must show MITRE ATT&CK IDs (T-codes) grouped by tactic in kill chain order
- Relationships tab must have a D3 force-directed graph identical in style to the ThreatSearchPage relationship graph — actor as center node, connected entities around it
- The existing modal content (description, goals, countries, sectors, external refs) moves to the Overview tab

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 34-enriched-threat-actor-modal*
*Context gathered: 2026-03-31*
