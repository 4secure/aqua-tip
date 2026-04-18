# Phase 60: Backend Campaigns Service & Endpoint - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-18
**Phase:** 60-backend-campaigns-service-endpoint
**Areas discussed:** Query params & sort, Field breadth, Attribution shape, GraphiQL verification

---

## Gray Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Query params & sort | Controller query params, default ordering, page size | ✓ |
| Field breadth | Beyond the 7 required fields, which extras to include | ✓ |
| Attribution shape | Array vs single object vs string; relationship direction | ✓ |
| GraphiQL verification | Mandate live verification at 192.168.251.20 before coding | ✓ |

**User's choice:** All four areas.

---

## Query params & sort

### Q1: Which query params should GET /api/threat-campaigns accept?

| Option | Description | Selected |
|--------|-------------|----------|
| Parity with actors | `after`, `search`, `sort`, `order` — no motivation filter | ✓ |
| Minimal (after only) | Just cursor pagination | |
| Parity plus date range | Add `date_start` / `date_end` like Threat News | |

**User's choice:** Parity with actors.
**Notes:** Phase 65 frontend benefits from consistent API pattern.

### Q2: What's the default ordering?

| Option | Description | Selected |
|--------|-------------|----------|
| modified desc | Matches ThreatActorService default | ✓ |
| last_seen desc | Most recently active campaigns first | |
| first_seen desc | Newest campaigns first | |

**User's choice:** modified desc.
**Notes:** Consistent with threat-actors UX; Phase 65 can diverge later if analyst feedback warrants.

### Q3: Default page size (`first` parameter)?

| Option | Description | Selected |
|--------|-------------|----------|
| 24 | Match threat-actors grid | ✓ |
| 12 | Smaller page, faster initial paint | |
| 48 | Fewer pagination clicks, heavier response | |

**User's choice:** 24.
**Notes:** Phase 65 grid layout can mirror threat-actors grid.

---

## Field breadth

### Q1: Beyond the 7 locked fields, what extras?

| Option | Description | Selected |
|--------|-------------|----------|
| aliases | Alternate campaign names | ✓ |
| modified / created | Timestamps for "Updated X ago" UI | ✓ |
| labels | STIX labels for filtering/categorizing | ✓ |
| external_references | Vendor/MITRE links | ✓ |

**User's choice:** All four extras included (multiSelect).
**Notes:** Full field set surfaces everything Phase 65 could want; OpenCTI returns campaign nodes cheaply.

### Q2: List + detail endpoint scope?

| Option | Description | Selected |
|--------|-------------|----------|
| Return everything list needs | One cached payload backs both grid (CAMP-01..05) and detail modal (CAMP-06) | ✓ |
| List + separate detail endpoint later | Keep list lean, add `GET /api/threat-campaigns/{id}` in a future phase | |

**User's choice:** Return everything list needs.
**Notes:** No separate detail endpoint in Phase 60. Detail modal reuses cached list payload.

---

## Attribution shape

### Q1: How does `attributed_to` return?

| Option | Description | Selected |
|--------|-------------|----------|
| Array of {id, name} | Future-proof for multi-attribution | ✓ |
| Single object {id, name} | Assumes 1:1; matches existing normalizeCampaigns | |
| Flat name string | Smallest payload but loses id for chip linking | |

**User's choice:** Array of {id, name}.
**Notes:** Phase 65 CAMP-05 renders first element as chip; can extend to multiple chips later without backend change.

### Q2: Relationship direction?

| Option | Description | Selected |
|--------|-------------|----------|
| From Campaign → IntrusionSet | Natural direction on the campaign node | ✓ |
| From IntrusionSet → Campaign | Mirror existing normalizeCampaigns direction | |

**User's choice:** From Campaign → IntrusionSet.
**Notes:** Queried as `stixCoreRelationships(relationship_type: "attributed-to", toTypes: ["Intrusion-Set"])` on each campaign node; extract `edge.node.to` as IntrusionSet.

---

## GraphiQL verification

### Q1: Should live GraphiQL verification be mandatory?

| Option | Description | Selected |
|--------|-------------|----------|
| Mandatory, matching Phase 59 | Verify enum, relationship direction, type fragment before coding | ✓ |
| Recommended but not blocking | Verify if reachable, otherwise fall back to docs | |
| Skip verification | Rely on test assertions to catch mismatches | |

**User's choice:** Mandatory.
**Notes:** Verify (1) CampaignsOrdering enum values, (2) attributed-to relationship traversable, (3) representative campaign returns non-empty data, (4) IntrusionSet concrete type fragment resolves. Document in code comment above heredoc.

### Q2: Where should tests live?

| Option | Description | Selected |
|--------|-------------|----------|
| New dir tests/Feature/ThreatCampaign/ | Mirrors tests/Feature/ThreatActor/ | ✓ |
| Single file in ThreatActor dir | Slightly faster but muddles semantics | |

**User's choice:** New directory.
**Notes:** Cleanest organization; future Phase 65/CAMP-GRAPH phases can add more campaign tests under same directory.

---

## Completion check

### Q1: Ready to write CONTEXT.md?

| Option | Description | Selected |
|--------|-------------|----------|
| Create context | All gray areas resolved | ✓ |
| Explore more gray areas | Additional questions (error messages, etc.) | |
| Revisit an area | Change/refine an earlier decision | |

**User's choice:** Create context.

---

## Claude's Discretion

- Exact OpenCTI field for `objective` (verify in GraphiQL)
- Whether to add `confidence` field (add only if zero-cost)
- Log level for unexpected shapes (warning vs error)
- FormRequest vs inline query param reads (match existing controller style)
- Pest assertion granularity (match existing test style)

## Deferred Ideas

- Separate `GET /api/threat-campaigns/{id}` detail endpoint — not needed in Phase 60
- Date-range filtering on campaigns — not in Phase 65 scope
- Search facets / filter dropdown on campaigns — future phase
- CAMP-GRAPH (campaign→actor navigation graph) — already deferred in REQUIREMENTS.md
