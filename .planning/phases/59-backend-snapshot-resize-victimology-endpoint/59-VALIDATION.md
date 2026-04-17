---
phase: 59
slug: backend-snapshot-resize-victimology-endpoint
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-17
---

# Phase 59 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Pest (PHPUnit under the hood) |
| **Config file** | `backend/phpunit.xml` |
| **Quick run command** | `cd backend && php artisan test --filter=Snapshot --filter=Enrichment` |
| **Full suite command** | `cd backend && php artisan test` |
| **Estimated runtime** | ~30 seconds (targeted) / ~120 seconds (full suite) |

---

## Sampling Rate

- **After every task commit:** Run targeted filter for the feature under change (`--filter=Snapshot` or `--filter=Enrichment`)
- **After every plan wave:** Run full ThreatMap + ThreatActor feature subset (`php artisan test tests/Feature/ThreatMap tests/Feature/ThreatActor`)
- **Before `/gsd-verify-work`:** Full suite (`php artisan test`) must be green
- **Max feedback latency:** 30 seconds per task

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| (Populated by planner — every task must map to a row) | | | | | | | | | |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Verify `backend/tests/Feature/ThreatMap/SnapshotTest.php` current state — investigate the latent 401 assertion (Research Open Question #1). Either fix to assert 200 for public route or document the hidden auth middleware.
- [ ] Confirm Pest `Http::fake()` pattern from `backend/tests/Feature/ThreatActor/ThreatActorIndexTest.php` — will be mirrored in new `EnrichmentTest.php`.
- [ ] OpenCTI GraphiQL D-08 verification session (external, pre-coding) — document verified query shape as code comment above heredoc.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| OpenCTI Organization `toTypes` filter returns correct entities | VICTM-09 SC5 | Requires live OpenCTI at 192.168.251.20 — cannot be mocked for SC5 documentation purpose | Open `http://192.168.251.20:8080/graphql`, run `stixCoreRelationships(relationship_type: "targets", toTypes: ["Identity"], first: 5)` against APT28, confirm Organization-typed entities returned, document query in code comment per PITFALL-12. |
| Country ISO-2 code field identification | VICTM-09 (D-09) | D-08 requires probing live Country entities for `x_opencti_aliases` vs direct `code` scalar | While in GraphiQL, query `country(id: ...)` on a representative Country node; inspect which field carries the ISO-2 value; document choice in `extractIsoCode()` comment. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
