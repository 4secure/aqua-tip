# Requirements: AQUA TIP — Security Hardening

**Defined:** 2026-04-11
**Core Value:** Secure the platform against confirmed vulnerabilities — LFI, IDOR, information disclosure, missing headers, and frontend attack vectors.

## v5.0 Requirements

Requirements for security hardening release. Each maps to roadmap phases.

### Infrastructure (INFRA)

- [ ] **INFRA-01**: Nginx rejects all requests containing `..` path sequences (returns 403)
- [ ] **INFRA-02**: Nginx restricts fastcgi_script_name to /index.php only
- [ ] **INFRA-03**: Nginx hides server version header (server_tokens off)
- [ ] **INFRA-04**: Nginx restricts HTTP methods to GET, POST, PUT, DELETE, OPTIONS, PATCH
- [ ] **INFRA-05**: Nginx adds HSTS header (max-age=31536000, includeSubDomains)
- [ ] **INFRA-06**: Nginx client_max_body_size reduced from 20M to 2M (no file uploads exist)
- [ ] **INFRA-07**: Content-Security-Policy header configured for API backend
- [ ] **INFRA-08**: Debug routes /my-ip and /debug-opencti removed from routes/web.php

### API Security (API)

- [ ] **API-01**: Dark-web task status endpoint validates user ownership (IDOR fix)
- [ ] **API-02**: Rate limiting middleware on /ip-search, /threat-search, /credits (30/min)
- [ ] **API-03**: EnrichmentController returns generic error, logs OpenCTI details server-side
- [ ] **API-04**: HealthController returns generic 503 on failure, logs details server-side
- [ ] **API-05**: Raw OpenCTI observable data removed from search API responses
- [ ] **API-06**: Rate limiting on OAuth redirect endpoint
- [ ] **API-07**: Rate limiting on email verification resend (per-day cap)

### Authentication & Session (AUTH)

- [ ] **AUTH-01**: SESSION_SECURE_COOKIE defaults to true in config/session.php
- [ ] **AUTH-02**: Sanctum token expiration shortened from 7 days to 24 hours
- [ ] **AUTH-03**: All existing tokens invalidated on password reset
- [ ] **AUTH-04**: Forgot-password returns uniform response regardless of email/provider status
- [ ] **AUTH-05**: Session cookie name changed to non-descriptive value

### Frontend Security (FRONT)

- [ ] **FRONT-01**: OAuth error parameter whitelisted to known error codes on LoginPage
- [ ] **FRONT-02**: OAuth redirect URL validated against allowed provider domains before redirect
- [ ] **FRONT-03**: DOMPurify config removes target from ALLOWED_ATTR, enforces rel=noopener noreferrer via hook
- [ ] **FRONT-04**: External Leaflet CSS bundled locally (eliminates CDN dependency and SRI need)
- [ ] **FRONT-05**: Google Tag Manager gated behind consent check (GDPR compliance)

### Email & DNS (EMAIL)

- [ ] **EMAIL-01**: SMTP MAIL_VERIFY_PEER enabled in production environment
- [ ] **EMAIL-02**: Geolocation API calls switched from HTTP to HTTPS
- [ ] **EMAIL-03**: SPF/DKIM/DMARC DNS record configurations documented for tip.aquasecure.ai and api.tip.aquasecure.ai

## Future Requirements

### Monitoring & Alerting

- **MON-01**: WAF or request-level logging for blocked path traversal attempts
- **MON-02**: Automated security scanning in CI/CD pipeline
- **MON-03**: Intrusion detection alerting for suspicious request patterns

### Advanced Auth

- **ADV-01**: Refresh token rotation with sliding window
- **ADV-02**: Device/session management UI for users
- **ADV-03**: Brute-force lockout on login attempts

## Out of Scope

| Feature | Reason |
|---------|--------|
| Full WAF deployment | Overkill for current traffic; Nginx rules sufficient |
| Penetration testing engagement | Manual pentest is a separate engagement, not code work |
| SAST/DAST pipeline integration | Requires CI/CD pipeline (out of scope per project constraints) |
| Certificate pinning | Railway manages TLS termination |
| IP-based blocklisting | No admin panel exists to manage blocklists |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | TBD | Pending |
| INFRA-02 | TBD | Pending |
| INFRA-03 | TBD | Pending |
| INFRA-04 | TBD | Pending |
| INFRA-05 | TBD | Pending |
| INFRA-06 | TBD | Pending |
| INFRA-07 | TBD | Pending |
| INFRA-08 | TBD | Pending |
| API-01 | TBD | Pending |
| API-02 | TBD | Pending |
| API-03 | TBD | Pending |
| API-04 | TBD | Pending |
| API-05 | TBD | Pending |
| API-06 | TBD | Pending |
| API-07 | TBD | Pending |
| AUTH-01 | TBD | Pending |
| AUTH-02 | TBD | Pending |
| AUTH-03 | TBD | Pending |
| AUTH-04 | TBD | Pending |
| AUTH-05 | TBD | Pending |
| FRONT-01 | TBD | Pending |
| FRONT-02 | TBD | Pending |
| FRONT-03 | TBD | Pending |
| FRONT-04 | TBD | Pending |
| FRONT-05 | TBD | Pending |
| EMAIL-01 | TBD | Pending |
| EMAIL-02 | TBD | Pending |
| EMAIL-03 | TBD | Pending |

**Coverage:**
- v5.0 requirements: 28 total
- Mapped to phases: 0
- Unmapped: 28 (pending roadmap)

---
*Requirements defined: 2026-04-11*
*Last updated: 2026-04-11 after initial definition*
