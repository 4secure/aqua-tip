# Phase 59: Backend Snapshot Resize + Victimology Endpoint - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-17
**Phase:** 59-backend-snapshot-resize-victimology-endpoint
**Areas discussed:** Limit validation, Victimology shape, Cache key strategy, Victimology failure mode, Country shape (ISO-2)

---

## Gray Area Selection

**Question:** Which gray areas do you want to discuss for Phase 59?

| Option | Description | Selected |
|--------|-------------|----------|
| Limit validation | Whitelist presets (100/500/1000/2000) matching frontend dropdown vs. clamp-to-range [1-2000]. | ✓ |
| Victimology shape | Array of name strings (matches existing targeted_countries pattern) vs. array of {id, name} objects. | ✓ |
| Cache key strategy | Semantic keys (threat_map:snapshot:100 / :500) vs. hash pattern matching ThreatActorService. | ✓ |
| Victimology failure mode | Fail whole enrichment (502) vs. graceful degradation with empty victimology arrays. | ✓ |

**User's choice:** All of the above

---

## Limit Validation

| Option | Description | Selected |
|--------|-------------|----------|
| Whitelist presets (Rec) | Accept only 100/500/1000/2000. Other values → default 100. Max 4 cache entries. | ✓ |
| Clamp to range | Accept any int in [1, 2000]. Out-of-range clamped; non-numeric → default 100. | |

**User's choice:** Whitelist presets (Recommended)
**Notes:** Matches MAPCFG-01 frontend dropdown exactly. Bounds cache footprint and eliminates cache fragmentation from arbitrary values.

---

## Victimology Shape

| Option | Description | Selected |
|--------|-------------|----------|
| Objects {id, name} (Rec) | Each entry is {id, name}. Phase 64 VICTM-03 needs country codes for flags. Consistent with tools/malware shape. | ✓ |
| Strings only | Plain array of names, matches existing targeted_countries pattern in ThreatActorService::list(). | |
| Objects with count | Each entry is {id, name, count}. OpenCTI may not expose relationship counts directly. | |

**User's choice:** Objects {id, name} (Recommended)
**Notes:** Prevents Phase 64 backend refactor. Aligns with existing enrichment sub-array shapes (tools, malware, campaigns all use {id, name, ...}).

---

## Cache Key Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Semantic: threat_map:snapshot:{limit} (Rec) | Human-readable keys, easy artisan cache:forget per size. | ✓ |
| Hash pattern (like ThreatActorService) | md5(json_encode(args)). Consistent with ThreatActor, opaque for single-int param. | |

**User's choice:** Semantic: threat_map:snapshot:{limit} (Recommended)
**Notes:** Single int param — no hashing value. Easier cache debugging during dev.

---

## Victimology Failure Mode

| Option | Description | Selected |
|--------|-------------|----------|
| Graceful: return empty victimology (Rec) | Log error, return empty sub-arrays. Other enrichment sections still succeed. Matches SC3. | ✓ |
| Fail whole enrichment (502) | Bubble up to OpenCtiConnectionException. Simpler but breaks Phase 58 tabs too. | |

**User's choice:** Graceful: return empty victimology (Recommended)
**Notes:** Preserves UX — ttps/tools/malware/campaigns still render in frontend even if victimology sub-query fails. Failed fetches are NOT cached (retry naturally on next request).

---

## Country Shape (Flag Support)

| Option | Description | Selected |
|--------|-------------|----------|
| Add country_code field (Rec) | {id, name, country_code: 'US'}. Phase 64 uses ISO-2 for flag icons. Fall back to null when unavailable. | ✓ |
| Just {id, name} — let frontend map | Frontend maintains name→ISO-2 lookup table. Brittle if OpenCTI name spellings vary. | |
| Defer to Phase 64 research | Ship {id, name} baseline, let Phase 64 resolve. Risk: Phase 64 blocks on Phase 59 rework. | |

**User's choice:** Add country_code field (Recommended)
**Notes:** Future-proofs the Phase 64 Victimology tab. Exact OpenCTI Country field (x_opencti_aliases or similar) resolved during mandatory GraphiQL verification in D-08.

---

## Claude's Discretion

- Exact OpenCTI Country field for ISO-2 code — planner resolves during live GraphiQL verification at 192.168.251.20.
- Validation helper placement (inline controller vs. FormRequest) — planner picks lighter option.
- Log level (warning vs. error) for partial victimology failure — planner matches existing ThreatActorService conventions.
- Pest assertion granularity — planner mirrors ThreatActorIndexTest.php style.

## Deferred Ideas

None — discussion stayed tight to backend scope. Related future capabilities already listed in REQUIREMENTS.md §Future Requirements.
