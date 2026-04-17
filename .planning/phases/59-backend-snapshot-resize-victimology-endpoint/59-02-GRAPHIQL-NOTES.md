# Task 0 Resume Signal: deferred, using assumed shape from research

**Phase:** 59 — Backend Snapshot Resize + Victimology Endpoint
**Plan:** 02
**Date:** 2026-04-17

## Resume Signal

`deferred, using assumed shape from research (x_opencti_aliases + "Organization")`

Task 1 proceeds with the research-assumed shape:
- Country ISO-2 code is extracted from `x_opencti_aliases` via `extractIsoCode` helper (first 2-char uppercase-alpha match).
- `entity_type` values for Identity sub-types: `"Organization"`, `"Individual"`, `"System"` (literal, case-sensitive).
- Consolidated `stixCoreRelationships` block with `toTypes: ["Country", "Region", "Sector", "Identity"]` (PITFALL-13).

## Rationale

The executor is running in a parallel worktree environment without network access to the OpenCTI
lab at `http://192.168.251.20:8080/graphql`. Per the plan's resume-signal contract:

> If off-network, reply `deferred, using assumed shape from research (x_opencti_aliases + "Organization")`
> — this is a fallback that accepts the research-assumed values as provisional and flags a follow-up
> verification task in the phase retrospective. Task 1 proceeds with the assumed values.

## Follow-up Task (Phase 59 Retrospective)

Before merging to main (or as part of the Phase 59 verification gate), an on-network engineer MUST:

1. Run Verifications A, B, C, and D from Task 0 in `59-02-PLAN.md` against
   `http://192.168.251.20:8080/graphql`.
2. Confirm the GraphQL heredoc shape works against the live instance.
3. Confirm `x_opencti_aliases` actually carries ISO-2 codes for representative countries.
4. If a direct scalar (`country_code` / `code`) exists on `Country`, swap the heredoc fragment and
   remove the `extractIsoCode` helper in a follow-up.
5. If `entity_type` literals differ (e.g. different casing), update the `match` arm in
   `normalizeVictimology`.

This fallback is acceptable for parallel wave execution because:
- The PITFALL-12 mitigation (explicit `match` with `default => null`) is robust to unknown types:
  any unexpected `entity_type` string silently falls through, so a casing mismatch only degrades to
  "no organizations shown" — never a crash or data leak.
- The `extractIsoCode` helper treats `x_opencti_aliases` as optional input and returns `null` on no
  match, so missing-ISO-2 scenarios degrade gracefully to "no flag shown" rather than erroring.
- D-10 `safeNormalizeVictimology` wrapper catches any parse-level failure, logs via
  `Log::warning`, and returns empty arrays — the rest of enrichment keeps serving.
