# Phase 34: Enriched Threat Actor Modal - Research

**Researched:** 2026-03-31
**Domain:** OpenCTI GraphQL enrichment + React tabbed modal UI
**Confidence:** HIGH

## Summary

This phase adds enrichment tabs (TTPs, Tools, Campaigns, Relationships) to the existing ThreatActorModal. The backend requires a new endpoint that queries OpenCTI's GraphQL API for intrusion set relationships (attack patterns via "uses", tools/malware via "uses", campaigns via "attributed-to") and returns them in a single response. The frontend refactors the existing modal to a tabbed layout with a fixed header, moving current content to an Overview tab and adding four enrichment tabs that render data fetched on modal open.

The project already has established patterns for every building block: `stixCoreRelationships` queries (used for countries/sectors), tab UI (`.tab-bar` / `.tab-item` CSS classes used in 4+ pages), D3 force-directed graphs (ThreatSearchPage), skeleton loading (animate-pulse), and the API client pattern.

**Primary recommendation:** Build one new backend method + controller for enrichment, one new frontend API function, and refactor the modal into a tabbed component. Reuse existing tab CSS classes, skeleton pattern, and adapt the D3Graph component for the Relationships tab.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Tabbed sections inside the modal. Header area (name, aliases, motivation badge, resource_level badge, modified date) stays fixed above the tabs. Tabs: Overview, TTPs, Tools, Campaigns, Relationships.
- **D-02:** Overview tab contains the current modal content: description, goals, targeted countries, targeted sectors, external references.
- **D-03:** Each enrichment tab (TTPs, Tools, Campaigns, Relationships) shows data fetched from a new enrichment endpoint (fetch-on-open pattern).
- **D-04:** TTPs grouped by MITRE ATT&CK tactic headers (e.g. Initial Access, Execution, Persistence). Each technique shows name + ATT&CK ID (e.g. T1566). Techniques listed as bullet points under their tactic group.
- **D-05:** Tactic ordering follows MITRE ATT&CK kill chain order when possible.
- **D-06:** Tools and malware displayed as chips/badges with names. These come from "uses" relationships to Tool and Malware entity types in OpenCTI.
- **D-07:** Campaigns listed with name and date range (first_seen/last_seen if available). These come from "attributed-to" relationships from Campaign entities.
- **D-08:** D3 force-directed relationship graph matching the existing D3Graph component pattern from ThreatSearchPage. Threat actor is the center node, connected entities radiate outward with entity-type-based coloring and labeled edges.
- **D-09:** Tab bar renders immediately when modal opens. Active tab shows pulsing skeleton lines (animate-pulse pattern) while enrichment data fetches.
- **D-10:** Each tab has its own empty state message with a muted icon. Tabs with no data are NOT hidden.
- **D-11:** New enrichment endpoint cached 15 minutes server-side (matching existing ThreatActorService cache pattern). Every modal open hits the API; server serves cached response. No client-side cache.
- **D-12:** New endpoint `GET /api/threat-actors/{id}/enrichment` returns TTPs, tools, malware, campaigns, and relationships.
- **D-13:** New method on ThreatActorService querying OpenCTI for enrichment relationships.
- **D-14:** New API function `fetchThreatActorEnrichment(id)` in `threat-actors.js`.
- **D-15:** Modal refactored to include tab state management. Enrichment fetch triggered on modal open (not on tab switch).

### Claude's Discretion
- Tab bar styling (underline, pill, or segment style -- should match dark theme)
- Whether to extract the D3 graph into a shared component or duplicate with adaptations
- Graph height inside the modal tab (may need to be smaller than ThreatSearchPage's 450px)
- How to extract ATT&CK tactic grouping from OpenCTI kill_chain_phases field
- Skeleton shape per tab (how many lines, widths)
- Whether the enrichment endpoint returns a flat structure or nested by relationship type

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ACTOR-01 | User sees enriched threat actor modal with TTPs, tools, campaigns, and targeted sectors | Full stack: backend enrichment endpoint querying OpenCTI stixCoreRelationships + frontend tabbed modal with Overview (existing data) and 4 enrichment tabs |

</phase_requirements>

## Architecture Patterns

### Recommended Approach

```
Backend:
  backend/app/Http/Controllers/ThreatActor/EnrichmentController.php  (new)
  backend/app/Services/ThreatActorService.php                        (add enrichment method)
  backend/routes/api.php                                              (add route)

Frontend:
  frontend/src/api/threat-actors.js              (add fetchThreatActorEnrichment)
  frontend/src/pages/ThreatActorsPage.jsx        (refactor ThreatActorModal to tabbed layout)
```

### Pattern 1: Backend Enrichment Endpoint

**What:** Single GraphQL query fetching all enrichment relationships for an intrusion set, normalized into a structured response.

**OpenCTI GraphQL query structure:**

```graphql
query ($id: String!) {
  intrusionSet(id: $id) {
    # TTPs (attack patterns via "uses")
    attackPatterns: stixCoreRelationships(
      relationship_type: "uses"
      toTypes: ["Attack-Pattern"]
      first: 100
    ) {
      edges {
        node {
          to {
            ... on AttackPattern {
              id
              name
              x_mitre_id
              killChainPhases {
                edges {
                  node {
                    kill_chain_name
                    phase_name
                    x_opencti_order
                  }
                }
              }
            }
          }
        }
      }
    }
    # Tools
    tools: stixCoreRelationships(
      relationship_type: "uses"
      toTypes: ["Tool"]
      first: 50
    ) {
      edges {
        node {
          to {
            ... on Tool {
              id
              name
            }
          }
        }
      }
    }
    # Malware
    malware: stixCoreRelationships(
      relationship_type: "uses"
      toTypes: ["Malware"]
      first: 50
    ) {
      edges {
        node {
          to {
            ... on Malware {
              id
              name
            }
          }
        }
      }
    }
    # Campaigns (attributed-to, reversed direction)
    campaigns: stixCoreRelationships(
      relationship_type: "attributed-to"
      fromTypes: ["Campaign"]
      first: 50
    ) {
      edges {
        node {
          from {
            ... on Campaign {
              id
              name
              first_seen
              last_seen
            }
          }
        }
      }
    }
    # General relationships for the graph
    allRelationships: stixCoreRelationships(first: 100) {
      edges {
        node {
          id
          relationship_type
          from {
            ... on BasicObject {
              id
              entity_type
            }
            ... on StixDomainObject {
              name
            }
            ... on StixCyberObservable {
              observable_value
            }
          }
          to {
            ... on BasicObject {
              id
              entity_type
            }
            ... on StixDomainObject {
              name
            }
            ... on StixCyberObservable {
              observable_value
            }
          }
        }
      }
    }
  }
}
```

**Key notes on this query:**
- `stixCoreRelationships` is already used in the existing list query for countries/sectors -- same pattern, different `toTypes`
- `killChainPhases` is a connection type with edges/node pattern (not a flat array)
- `x_mitre_id` is a direct field on AttackPattern (e.g. "T1566")
- `kill_chain_name` value is `"mitre-attack"` for MITRE ATT&CK techniques
- `phase_name` is the tactic slug (e.g. `"initial-access"`, `"execution"`, `"persistence"`)
- `x_opencti_order` provides OpenCTI's ordering for kill chain phases
- Campaigns use `fromTypes: ["Campaign"]` because the relationship direction is Campaign --attributed-to--> IntrusionSet

**Confidence:** MEDIUM -- query structure follows established patterns in the codebase but specific field availability (x_mitre_id, killChainPhases edges structure) derived from OpenCTI schema analysis, not tested against the live instance.

### Pattern 2: Backend Response Normalization

**Recommendation:** Return nested structure grouped by relationship type (easier for frontend to consume directly per tab).

```json
{
  "data": {
    "ttps": [
      {
        "tactic": "initial-access",
        "tactic_label": "Initial Access",
        "techniques": [
          { "id": "...", "name": "Phishing", "mitre_id": "T1566" }
        ]
      }
    ],
    "tools": [
      { "id": "...", "name": "Cobalt Strike", "type": "tool" }
    ],
    "malware": [
      { "id": "...", "name": "Emotet", "type": "malware" }
    ],
    "campaigns": [
      { "id": "...", "name": "Operation X", "first_seen": "2024-01-15", "last_seen": "2024-06-30" }
    ],
    "relationships": [
      {
        "id": "...",
        "relationship_type": "uses",
        "from": { "id": "...", "entity_type": "Intrusion-Set", "name": "APT28" },
        "to": { "id": "...", "entity_type": "Malware", "name": "Emotet" }
      }
    ]
  }
}
```

### Pattern 3: MITRE ATT&CK Tactic Ordering

**What:** Static ordering constant for grouping TTPs by tactic in kill chain order.

The MITRE ATT&CK Enterprise matrix defines 14 tactics in this order:

```javascript
const TACTIC_ORDER = [
  'reconnaissance',
  'resource-development',
  'initial-access',
  'execution',
  'persistence',
  'privilege-escalation',
  'defense-evasion',
  'credential-access',
  'discovery',
  'lateral-movement',
  'collection',
  'command-and-control',
  'exfiltration',
  'impact',
];

const TACTIC_LABELS = {
  'reconnaissance': 'Reconnaissance',
  'resource-development': 'Resource Development',
  'initial-access': 'Initial Access',
  'execution': 'Execution',
  'persistence': 'Persistence',
  'privilege-escalation': 'Privilege Escalation',
  'defense-evasion': 'Defense Evasion',
  'credential-access': 'Credential Access',
  'discovery': 'Discovery',
  'lateral-movement': 'Lateral Movement',
  'collection': 'Collection',
  'command-and-control': 'Command & Control',
  'exfiltration': 'Exfiltration',
  'impact': 'Impact',
};
```

**How tactic grouping works:** Each AttackPattern has `killChainPhases` containing objects with `kill_chain_name` and `phase_name`. Filter for `kill_chain_name === "mitre-attack"`, then group techniques by `phase_name` and sort groups using `TACTIC_ORDER`. Techniques with no matching kill chain phase go into an "Other" group at the end.

**Confidence:** HIGH -- MITRE ATT&CK tactic ordering is stable and well-documented.

### Pattern 4: Tabbed Modal with Fetch-on-Open

**What:** Modal opens, immediately renders tab bar + skeleton. Enrichment API called once on open. Tab switching is local state only.

```jsx
function ThreatActorModal({ actor, onClose }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [enrichment, setEnrichment] = useState(null);
  const [enrichLoading, setEnrichLoading] = useState(true);
  const [enrichError, setEnrichError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setEnrichLoading(true);
    fetchThreatActorEnrichment(actor.id)
      .then(res => { if (!cancelled) setEnrichment(res.data); })
      .catch(err => { if (!cancelled) setEnrichError(err.message); })
      .finally(() => { if (!cancelled) setEnrichLoading(false); });
    return () => { cancelled = true; };
  }, [actor.id]);

  // Render: fixed header + tab-bar + active tab content
}
```

### Pattern 5: Existing Tab CSS

The project already has `.tab-bar` and `.tab-item` / `.tab-item.active` classes in `main.css`:

```css
.tab-bar { @apply flex gap-1 border-b border-border mb-6; }
.tab-item { @apply px-4 py-2.5 text-sm text-text-secondary cursor-pointer
            border-b-2 border-transparent hover:text-text-primary
            transition-all duration-200; }
.tab-item.active { @apply text-violet-light border-violet; }
```

**Recommendation:** Use these existing classes. The underline style is the established pattern across CveDetailPage, CtiReportPage, DomainReportPage, and SettingsPage. Inside the modal, reduce `mb-6` to `mb-4` via an inline override since modal space is tighter.

### Anti-Patterns to Avoid
- **Fetching per-tab:** Decision D-15 locks fetch-all-on-open. Do NOT lazy-load per tab switch.
- **Hiding empty tabs:** Decision D-10 says tabs with no data remain clickable showing empty state.
- **Client-side caching:** Decision D-11 explicitly says no client-side cache; rely on server 15-min cache.
- **Mutating actor prop:** Never modify the actor object passed to the modal; enrichment is separate state.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tab UI | Custom tab component | Existing `.tab-bar` / `.tab-item` CSS classes | Already used in 4+ pages, consistent styling |
| Force-directed graph | New graph library | D3 dynamic import (existing D3Graph pattern from ThreatSearchPage) | Same project, same visual style |
| Skeleton loading | Custom loading spinner | `animate-pulse` + `bg-surface-2 rounded` divs | Established skeleton pattern (SkeletonCard, Phase 30) |
| Kill chain ordering | API-derived ordering | Static `TACTIC_ORDER` constant | MITRE ordering is stable, avoids extra API call |
| Entity color mapping | New color scheme | Existing `ENTITY_COLORS` map from ThreatSearchPage | Must match the visual identity |

## Common Pitfalls

### Pitfall 1: Campaign Relationship Direction
**What goes wrong:** Querying `toTypes: ["Campaign"]` returns nothing because the relationship is Campaign --attributed-to--> IntrusionSet, not the reverse.
**Why it happens:** OpenCTI stores directional relationships. "attributed-to" goes FROM Campaign TO IntrusionSet.
**How to avoid:** Use `fromTypes: ["Campaign"]` with `relationship_type: "attributed-to"` and read from `node.from` (not `node.to`).
**Warning signs:** Empty campaigns array despite known campaign associations.

### Pitfall 2: Kill Chain Phase Edge Structure
**What goes wrong:** Treating `killChainPhases` as a flat array when it uses OpenCTI's connection pattern with edges/node.
**Why it happens:** Some OpenCTI fields are flat, others use the GraphQL connection pattern.
**How to avoid:** Always access as `killChainPhases.edges[].node.phase_name`.
**Warning signs:** "Cannot read property 'phase_name' of undefined" errors.

### Pitfall 3: Attack Patterns Without Kill Chain Phases
**What goes wrong:** Some attack patterns lack `killChainPhases` data, causing grouping logic to fail.
**Why it happens:** Not all attack patterns in OpenCTI have MITRE ATT&CK kill chain phase assignments (custom or incomplete data).
**How to avoid:** Add an "Other / Ungrouped" tactic category as fallback. Filter `kill_chain_name === "mitre-attack"` to exclude non-ATT&CK kill chains.
**Warning signs:** Techniques appearing in unexpected groups or disappearing entirely.

### Pitfall 4: D3 Graph Sizing in Modal
**What goes wrong:** The 450px graph height from ThreatSearchPage makes the modal scroll excessively or the graph feels cramped.
**Why it happens:** Modal has `max-h-[85vh]` with padding and header consuming space.
**How to avoid:** Use 320px height for the in-modal graph. Account for header (~120px) + tab bar (~40px) + padding (48px) = ~208px overhead. 320px graph fits well in 85vh on 1080p screens.
**Warning signs:** Graph nodes clipping at edges, excessive scrolling needed.

### Pitfall 5: Race Condition on Quick Modal Open/Close
**What goes wrong:** Opening modal, closing immediately, opening another actor -- stale enrichment data appears.
**Why it happens:** The first fetch resolves after the second modal opens.
**How to avoid:** Use cleanup function pattern (`cancelled` flag in useEffect) to discard stale responses. Reset enrichment state when actor.id changes.
**Warning signs:** Wrong enrichment data displayed for the current actor.

### Pitfall 6: Empty allRelationships for Graph
**What goes wrong:** The relationships tab shows an empty graph even when TTPs/tools exist.
**Why it happens:** The `allRelationships` query may return different results than the typed queries if pagination limits are hit.
**How to avoid:** Build graph nodes from the combined typed data (ttps + tools + malware + campaigns) as a fallback, not solely from allRelationships.
**Warning signs:** Other tabs have data but Relationships tab is empty.

## Code Examples

### Backend Controller Pattern (follows IndexController)

```php
// backend/app/Http/Controllers/ThreatActor/EnrichmentController.php
class EnrichmentController extends Controller
{
    public function __invoke(string $id): JsonResponse
    {
        try {
            $data = app(ThreatActorService::class)->enrichment($id);
        } catch (OpenCtiConnectionException) {
            return response()->json([
                'message' => 'Unable to load enrichment data. Please try again.',
            ], 502);
        }

        return response()->json(['data' => $data]);
    }
}
```

### Route Registration

```php
// In the auth:sanctum group, near existing threat-actors route
Route::get('/threat-actors/{id}/enrichment', ThreatActorEnrichmentController::class);
```

### Frontend API Function

```javascript
export function fetchThreatActorEnrichment(id) {
  return apiClient.get(`/api/threat-actors/${encodeURIComponent(id)}/enrichment`);
}
```

### Tab Skeleton Pattern (per-tab custom shapes)

```jsx
function TabSkeleton({ variant }) {
  if (variant === 'ttps') {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i}>
            <div className="h-4 bg-surface-2 rounded w-1/3 mb-2" />
            <div className="space-y-1.5 ml-4">
              <div className="h-3 bg-surface-2 rounded w-3/4" />
              <div className="h-3 bg-surface-2 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (variant === 'chips') {
    return (
      <div className="animate-pulse flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-7 bg-surface-2 rounded-full w-24" />
        ))}
      </div>
    );
  }
  // campaigns, relationships variants...
}
```

### TTP Grouping Logic

```javascript
function groupTtpsByTactic(ttps) {
  const TACTIC_ORDER = [
    'reconnaissance', 'resource-development', 'initial-access',
    'execution', 'persistence', 'privilege-escalation',
    'defense-evasion', 'credential-access', 'discovery',
    'lateral-movement', 'collection', 'command-and-control',
    'exfiltration', 'impact',
  ];

  const groups = {};
  for (const ttp of ttps) {
    const tactic = ttp.tactic || 'other';
    if (!groups[tactic]) groups[tactic] = [];
    groups[tactic].push(ttp);
  }

  return TACTIC_ORDER
    .filter(t => groups[t])
    .map(t => ({ tactic: t, label: TACTIC_LABELS[t], techniques: groups[t] }))
    .concat(groups['other'] ? [{ tactic: 'other', label: 'Other', techniques: groups['other'] }] : []);
}
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None (no tests exist per CLAUDE.md) |
| Config file | none -- see Wave 0 |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ACTOR-01 | Enrichment data (TTPs, tools, campaigns, sectors) visible in modal | manual | Open threat actor modal, verify tabs render | N/A |
| ACTOR-01 | Loading skeleton while fetching | manual | Open modal, observe skeleton | N/A |
| ACTOR-01 | Empty state for actors with no relationships | manual | Find actor with no enrichment data | N/A |

### Sampling Rate
- **Per task commit:** Manual browser verification
- **Per wave merge:** Full manual walkthrough of all 5 tabs
- **Phase gate:** Visual confirmation of all 3 success criteria

### Wave 0 Gaps
No test infrastructure exists (per CLAUDE.md "No tests exist"). Testing is manual-only for this phase. Setting up a test framework is out of scope for this phase.

## Open Questions

1. **AttackPattern x_mitre_id availability**
   - What we know: OpenCTI schema defines `x_mitre_id` on AttackPattern type. MITRE ATT&CK connector populates it.
   - What's unclear: Whether the project's OpenCTI instance has this field populated on all attack patterns.
   - Recommendation: Display x_mitre_id when present, gracefully omit when null (show just the technique name).

2. **Campaign relationship direction confirmation**
   - What we know: STIX standard defines Campaign --attributed-to--> IntrusionSet. Existing service uses `relationship_type` + `toTypes` pattern.
   - What's unclear: Whether OpenCTI stores it as `fromTypes: ["Campaign"]` or requires a different query approach.
   - Recommendation: Try `fromTypes: ["Campaign"]` first. If empty, fall back to querying campaigns separately and filtering by intrusion set ID.

3. **allRelationships query performance**
   - What we know: Fetching 100 general relationships could be slow for heavily-connected actors.
   - What's unclear: Typical relationship count for intrusion sets in this OpenCTI instance.
   - Recommendation: Set `first: 100` as the initial limit. If performance is an issue, reduce to 50 or build the graph from typed data only.

## Sources

### Primary (HIGH confidence)
- `backend/app/Services/ThreatActorService.php` -- Existing stixCoreRelationships query pattern for countries/sectors
- `frontend/src/pages/ThreatSearchPage.jsx` lines 14-162 -- D3Graph component, entityColor map
- `frontend/src/pages/ThreatActorsPage.jsx` lines 345-539 -- Current ThreatActorModal
- `frontend/src/styles/main.css` lines 141-153 -- tab-bar/tab-item CSS classes
- `frontend/src/components/shared/SkeletonCard.jsx` -- animate-pulse skeleton pattern
- OpenCTI GraphQL schema (`opencti.graphql`) -- AttackPattern, KillChainPhase type definitions

### Secondary (MEDIUM confidence)
- [OpenCTI GraphQL schema on GitHub](https://github.com/OpenCTI-Platform/opencti/blob/master/opencti-platform/opencti-graphql/config/schema/opencti.graphql) -- Verified AttackPattern has x_mitre_id, KillChainPhase has kill_chain_name/phase_name/x_opencti_order
- [OpenCTI Issue #8963](https://github.com/OpenCTI-Platform/opencti/issues/8963) -- stixCoreRelationships query pattern with toTypes filtering
- [OpenCTI Data Model docs](https://docs.opencti.io/latest/usage/data-model/) -- STIX relationship types (uses, attributed-to, targets)

### Tertiary (LOW confidence)
- Campaign query direction (fromTypes vs toTypes for attributed-to) -- needs validation against live instance

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- No new dependencies, all patterns exist in codebase
- Architecture: HIGH -- Follows established service/controller/API patterns exactly
- OpenCTI query fields: MEDIUM -- Schema verified but not tested against live instance
- Pitfalls: HIGH -- Derived from actual codebase patterns and STIX data model knowledge

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (stable -- no dependency changes, OpenCTI schema is versioned)

## Project Constraints (from CLAUDE.md)

- **No TypeScript** -- all files are `.jsx` / `.js`
- **No tests exist** -- no test infrastructure to maintain
- **No linter/formatter** configured
- **All new code must follow existing patterns** -- glassmorphism cards, font-sans/font-mono conventions, Tailwind color tokens
- **Dark theme only** -- all UI must use the defined color system
- **React 19 + Vite 7** -- ESM imports, no CommonJS
- **D3 must use dynamic import** -- `import('d3')` pattern matching ThreatSearchPage
- **Backend is Laravel 11 PHP** -- follow controller/service patterns
- **15-minute server-side cache** -- matching ThreatActorService existing pattern
