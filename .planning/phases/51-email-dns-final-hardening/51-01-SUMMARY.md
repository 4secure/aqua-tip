---
phase: 51-email-dns-final-hardening
plan: 01
subsystem: backend-security
tags: [smtp, tls, https, geolocation, hardening]
dependency_graph:
  requires: []
  provides: [smtp-tls-verification, https-geolocation]
  affects: [IpSearchService, ThreatMapService, ThreatSearchService, mail-config]
tech_stack:
  added: []
  patterns: [env-driven-tls-config, ipapi-co-https-geolocation]
key_files:
  created: []
  modified:
    - backend/.env.production
    - backend/.env.example
    - backend/config/mail.php
    - backend/app/Services/IpSearchService.php
    - backend/app/Services/ThreatMapService.php
    - backend/app/Services/ThreatSearchService.php
decisions:
  - Used .env.production instead of .env.railway (file was renamed in prior phase)
  - ipapi.co chosen over ip-api.com for free HTTPS support (1000 req/day)
metrics:
  duration: 2min 45s
  completed: 2026-04-13
---

# Phase 51 Plan 01: Email & DNS Final Hardening - SMTP TLS & HTTPS Geolocation Summary

SMTP TLS peer verification enabled in production via env-driven stream context; all 3 geolocation service files migrated from plaintext HTTP ip-api.com to HTTPS ipapi.co with field mapping.

## What Was Done

### Task 1: Enable SMTP TLS peer verification in production
- Added `MAIL_VERIFY_PEER=true` and `MAIL_VERIFY_PEER_NAME=true` to `backend/.env.production`
- Added `MAIL_VERIFY_PEER=false` and `MAIL_VERIFY_PEER_NAME=false` to `backend/.env.example` for documentation
- Added `stream.ssl.verify_peer` and `stream.ssl.verify_peer_name` config to smtp mailer in `backend/config/mail.php`, driven by env vars with false defaults
- Dev environment unchanged (tolerates self-signed certs)

### Task 2: Replace HTTP geolocation calls with HTTPS ipapi.co
- Replaced `http://ip-api.com/json/{$ip}` with `https://ipapi.co/{$ip}/json/` in all 3 service files
- Mapped response fields: `country` -> `country_name`, `countryCode` -> `country_code`, `lat` -> `latitude`, `lon` -> `longitude`, `regionName` -> `region`, `as` -> `asn`, `asname`/`isp` -> `org`
- Updated error detection from `status === 'success'` check to `isset($body['error'])` check
- Updated PHPDoc comments from ip-api.com to ipapi.co

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | 612b90a | feat(51-01): enable SMTP TLS peer verification in production |
| 2 | 9236850 | fix(51-01): replace HTTP geolocation calls with HTTPS ipapi.co |

## Verification Results

1. Zero occurrences of `http://ip-api.com` in `backend/app/`
2. `MAIL_VERIFY_PEER=true` present in `.env.production`
3. `verify_peer` stream config present in `config/mail.php`
4. 3 service files contain `https://ipapi.co`
5. All PHP files pass syntax check (`php -l`)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] .env.railway renamed to .env.production**
- **Found during:** Task 1
- **Issue:** Plan references `backend/.env.railway` but the file was renamed to `backend/.env.production` in a prior phase
- **Fix:** Applied all changes to `.env.production` instead
- **Files modified:** backend/.env.production

## Known Stubs

None.

## Self-Check: PASSED

All 6 modified files verified on disk. Both commits (612b90a, 9236850) verified in git log.
