# Requirements: AQUA TIP

**Defined:** 2026-03-14
**Core Value:** Users can securely sign up, log in, and access the platform — with rate-limited IOC search for guests (1/day) and authenticated users (10/day).

## v1.1 Requirements

Requirements for PostgreSQL migration and Railway deployment.

### Database Migration

- [x] **DB-01**: All MySQL-specific syntax in migrations replaced with PostgreSQL-compatible equivalents
- [x] **DB-02**: Laravel `DB_CONNECTION` switched to `pgsql` with PostgreSQL driver configured
- [ ] **DB-03**: All 44+ existing Pest tests pass against PostgreSQL
- [ ] **DB-04**: Local development works with PostgreSQL

### Deployment

- [ ] **DEPLOY-01**: Backend Dockerfile builds and runs Laravel with PHP-FPM + Nginx
- [ ] **DEPLOY-02**: Backend connects to Railway PostgreSQL addon via environment variables
- [ ] **DEPLOY-03**: Migrations run successfully on Railway PostgreSQL
- [ ] **DEPLOY-04**: Frontend static server deploys and serves SPA on Railway
- [ ] **DEPLOY-05**: Both services accessible via Railway-generated public URLs
- [ ] **DEPLOY-06**: Environment variables configured for production (APP_KEY, CORS, session domain, Sanctum stateful domains)

## v2 Requirements

Deferred to future milestones.

### Frontend API Integration

- **FEND-05**: IP Search page wired to backend API
- **RATE-04**: Guest "Sign in for more lookups" upgrade CTA on rate limit
- **RATE-05**: Signed-in "Daily limit reached" message for IOC search

## Out of Scope

| Feature | Reason |
|---------|--------|
| Wiring frontend to real backend API | Separate milestone — deploy as-is with mock data |
| Custom domain setup | Can be done later in Railway dashboard |
| CI/CD pipeline | Railway auto-deploys from GitHub, sufficient for now |
| SSL/TLS configuration | Railway handles this automatically |
| Admin panel | Future milestone |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DB-01 | Phase 6 | Complete |
| DB-02 | Phase 6 | Complete |
| DB-03 | Phase 6 | Pending |
| DB-04 | Phase 6 | Pending |
| DEPLOY-01 | Phase 7 | Pending |
| DEPLOY-02 | Phase 7 | Pending |
| DEPLOY-03 | Phase 7 | Pending |
| DEPLOY-04 | Phase 7 | Pending |
| DEPLOY-05 | Phase 7 | Pending |
| DEPLOY-06 | Phase 7 | Pending |

**Coverage:**
- v1.1 requirements: 10 total
- Mapped to phases: 10
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-14*
*Last updated: 2026-03-14 after initial definition*
