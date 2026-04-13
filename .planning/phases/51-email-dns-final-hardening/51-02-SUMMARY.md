---
phase: 51-email-dns-final-hardening
plan: 02
subsystem: infra
tags: [email, dns, spf, dkim, dmarc, anti-spoofing]

requires:
  - phase: 51-email-dns-final-hardening
    provides: Phase context for email and DNS hardening
provides:
  - Complete DNS record documentation for SPF, DKIM, and DMARC on aquasecure.io
  - Null SPF records for non-sending subdomains (tip.aquasecure.ai, api.tip.aquasecure.ai)
  - Verification commands and rollout guidance
affects: []

tech-stack:
  added: []
  patterns: [dns-anti-spoofing-documentation]

key-files:
  created: [docs/DNS-RECORDS.md]
  modified: []

key-decisions:
  - "SPF/DKIM/DMARC records target aquasecure.io (sending domain), not aquasecure.ai (web domain)"
  - "DMARC starts at p=quarantine with documented rollout path to p=reject"
  - "Null SPF records added for tip.aquasecure.ai and api.tip.aquasecure.ai to prevent subdomain spoofing"

patterns-established:
  - "DNS documentation pattern: overview table, record tables with exact values, verification commands, rollout steps"

requirements-completed: [EMAIL-03]

duration: 1min
completed: 2026-04-13
---

# Phase 51 Plan 02: DNS Records for Email Anti-Spoofing Summary

**SPF, DKIM, and DMARC DNS record documentation for aquasecure.io with null SPF defensive records for web subdomains**

## Performance

- **Duration:** 1 min
- **Started:** 2026-04-13T14:16:08Z
- **Completed:** 2026-04-13T14:17:29Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Created comprehensive DNS record documentation at docs/DNS-RECORDS.md
- Documented SPF record with Contabo server IP authorization and hard fail policy
- Documented DKIM key generation instructions for Contabo mail server
- Documented DMARC record with quarantine policy, aggregate reporting, and rollout guidance
- Added defensive null SPF records for tip.aquasecure.ai and api.tip.aquasecure.ai
- Included dig verification commands and links to MXToolbox online validators

## Task Commits

Each task was committed atomically:

1. **Task 1: Create DNS record documentation for email anti-spoofing** - `c73896d` (docs)

## Files Created/Modified
- `docs/DNS-RECORDS.md` - Complete DNS record documentation for SPF, DKIM, and DMARC email authentication

## Decisions Made
- SPF/DKIM/DMARC records correctly target aquasecure.io (the MAIL_FROM_ADDRESS domain), not aquasecure.ai (the web platform domain)
- DMARC policy set to quarantine with documented rollout path (none -> quarantine -> reject)
- Null SPF records documented for non-sending subdomains to prevent subdomain spoofing attacks

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**DNS records require manual configuration.** The user must:
1. Add SPF TXT record to aquasecure.io DNS zone
2. Resolve Contabo server IP and substitute in SPF record
3. Optionally configure DKIM on Contabo server and add TXT record
4. Add DMARC TXT record to aquasecure.io DNS zone
5. Add null SPF records for tip.aquasecure.ai and api.tip.aquasecure.ai in aquasecure.ai zone
6. Verify with dig commands documented in docs/DNS-RECORDS.md

## Next Phase Readiness
- DNS documentation complete and ready for user to apply records
- No code changes required; this is a documentation-only deliverable

## Self-Check: PASSED

- FOUND: docs/DNS-RECORDS.md
- FOUND: 51-02-SUMMARY.md
- FOUND: commit c73896d

---
*Phase: 51-email-dns-final-hardening*
*Completed: 2026-04-13*
