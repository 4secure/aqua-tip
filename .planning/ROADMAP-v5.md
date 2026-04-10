# Roadmap: AQUA TIP v5.0 Security Hardening

## Overview

Fix all critical, high, and medium security vulnerabilities identified in comprehensive audit. Five phases progress from critical infrastructure fixes (confirmed LFI, debug routes) through API protection, auth hardening, frontend security, and finally email/DNS hardening. Every phase delivers independently verifiable security improvements.

## Milestones

- 🚧 **v5.0 Security Hardening** - Phases 47-51 (in progress)

## Phases

**Phase Numbering:**
- Continues from v4.0 (ended at Phase 46)
- Integer phases (47, 48, 49): Planned milestone work
- Decimal phases (47.1, 47.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 47: Infrastructure Hardening** - Block LFI, remove debug routes, lock down Nginx, add security headers
- [ ] **Phase 48: API Security** - Fix IDOR, add rate limiting, sanitize error responses, strip raw data
- [ ] **Phase 49: Auth & Session Hardening** - Secure cookies, shorten tokens, fix enumeration, harden password reset
- [ ] **Phase 50: Frontend Security** - Whitelist OAuth errors, validate redirects, fix DOMPurify, bundle Leaflet CSS, gate GTM
- [ ] **Phase 51: Email, DNS & Final Hardening** - Enable SMTP TLS, switch to HTTPS geo calls, document DNS records

## Phase Details

### Phase 47: Infrastructure Hardening
**Goal**: The platform's Nginx layer blocks all path traversal attacks, exposes no debug endpoints, and enforces security headers on every response
**Depends on**: Nothing (first phase -- critical vulnerabilities)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, INFRA-06, INFRA-07, INFRA-08
**Success Criteria** (what must be TRUE):
  1. Requesting any URL containing `..` returns 403 Forbidden (confirmed LFI patched)
  2. Nginx only passes `/index.php` to PHP-FPM -- no arbitrary script execution
  3. Server version header is absent from all responses and only GET/POST/PUT/DELETE/OPTIONS/PATCH methods are accepted
  4. HSTS header with max-age=31536000 and includeSubDomains appears on every response
  5. Content-Security-Policy header is present on API responses, and request body size is capped at 2M
**Plans**: TBD

### Phase 48: API Security
**Goal**: API endpoints are protected against unauthorized access, abuse, and information leakage
**Depends on**: Phase 47
**Requirements**: API-01, API-02, API-03, API-04, API-05, API-06, API-07
**Success Criteria** (what must be TRUE):
  1. Dark-web task status endpoint returns 403 when accessed by a user who does not own the task (IDOR fixed)
  2. Search and credit endpoints return 429 after 30 requests per minute from same source
  3. OpenCTI failures return a generic "Service unavailable" message -- no internal URLs, stack traces, or provider details in response body
  4. Search API responses contain only curated fields -- no raw OpenCTI observable payloads
  5. OAuth redirect and email verification resend endpoints are rate-limited
**Plans**: TBD

### Phase 49: Auth & Session Hardening
**Goal**: Authentication and session management follow security best practices with no information leakage
**Depends on**: Phase 47
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05
**Success Criteria** (what must be TRUE):
  1. Session cookie has Secure flag set and uses a non-descriptive cookie name
  2. Sanctum tokens expire after 24 hours (not 7 days) and all tokens are invalidated on password reset
  3. Forgot-password endpoint returns identical response regardless of whether email exists or which OAuth provider was used
**Plans**: TBD

### Phase 50: Frontend Security
**Goal**: Frontend code does not expose users to XSS, open redirect, or tab-nabbing attacks
**Depends on**: Phase 48, Phase 49
**Requirements**: FRONT-01, FRONT-02, FRONT-03, FRONT-04, FRONT-05
**Success Criteria** (what must be TRUE):
  1. OAuth error parameter on login page only renders known error codes -- arbitrary strings are ignored
  2. OAuth redirect URLs are validated against an allowlist of provider domains before browser navigation
  3. DOMPurify-sanitized HTML never contains target="_blank" without rel="noopener noreferrer"
  4. Leaflet CSS is served from local bundle -- no external CDN requests for map styles
  5. Google Tag Manager script only loads after user consent is confirmed
**Plans**: TBD
**UI hint**: yes

### Phase 51: Email, DNS & Final Hardening
**Goal**: Email transport is encrypted, external API calls use HTTPS, and DNS records prevent email spoofing
**Depends on**: Phase 47
**Requirements**: EMAIL-01, EMAIL-02, EMAIL-03
**Success Criteria** (what must be TRUE):
  1. SMTP connections verify peer TLS certificates in production (MAIL_VERIFY_PEER enabled)
  2. All geolocation API calls use HTTPS -- no plaintext HTTP requests to ip-api.com or similar
  3. SPF, DKIM, and DMARC DNS record configurations are documented with exact values for tip.aquasecure.ai
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 47 → 48 → 49 → 50 → 51
(Phases 48 and 49 can run in parallel after 47; Phase 50 depends on both 48 and 49)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 47. Infrastructure Hardening | 0/0 | Not started | - |
| 48. API Security | 0/0 | Not started | - |
| 49. Auth & Session Hardening | 0/0 | Not started | - |
| 50. Frontend Security | 0/0 | Not started | - |
| 51. Email, DNS & Final Hardening | 0/0 | Not started | - |
