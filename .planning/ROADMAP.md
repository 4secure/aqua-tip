# Roadmap: AQUA TIP

## Milestones

- ✅ **v1.0 Authentication System** — Phases 1-5 (shipped 2026-03-14)
- 🔄 **v1.1 PostgreSQL Migration & Railway Deployment** — Phases 6-7

## Phases

<details>
<summary>✅ v1.0 Authentication System (Phases 1-5) — SHIPPED 2026-03-14</summary>

- [x] Phase 1: Laravel Foundation + Core Auth (2/2 plans) — completed 2026-03-12
- [x] Phase 2: OAuth + Email Verification (2/2 plans) — completed 2026-03-13
- [x] Phase 3: Rate Limiting Backend (2/2 plans) — completed 2026-03-13
- [x] Phase 4: Frontend Auth Integration (3/3 plans) — completed 2026-03-13
- [x] Phase 4.1: Layout Redesign (2/2 plans) — completed 2026-03-13 (INSERTED)
- [x] Phase 5: Dark Web Search Backend + Frontend (2/2 plans) — completed 2026-03-13

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

### v1.1 PostgreSQL Migration & Railway Deployment

- [x] Phase 6: PostgreSQL Migration (completed 2026-03-13)
- [ ] Phase 7: Railway Production Deployment

#### Phase 6: PostgreSQL Migration
**Goal:** Replace MySQL with PostgreSQL — all migrations, configs, and tests working on PostgreSQL locally.
**Requirements:** DB-01, DB-02, DB-03, DB-04
**Plans:** 2/2 plans complete

Plans:
- [x] 06-01-PLAN.md — Switch config to PostgreSQL and remove MySQL-specific migration syntax
- [x] 06-02-PLAN.md — Create PostgreSQL database, run migrations, validate tests and local dev

**Success criteria:**
1. `DB_CONNECTION=pgsql` in `.env` with PostgreSQL driver configured
2. All migrations run cleanly on a fresh PostgreSQL database
3. All 44+ existing Pest tests pass without modification (or with minimal PostgreSQL-compatible fixes)
4. Local dev environment works end-to-end with PostgreSQL

#### Phase 7: Railway Production Deployment
**Goal:** Deploy both frontend and backend to Railway with PostgreSQL, accessible via public URLs.
**Requirements:** DEPLOY-01, DEPLOY-02, DEPLOY-03, DEPLOY-04, DEPLOY-05, DEPLOY-06
**Plans:** 2 plans

Plans:
- [ ] 07-01-PLAN.md — Fix Dockerfile for PostgreSQL, create startup script, production env template
- [ ] 07-02-PLAN.md — Deploy to Railway, configure services, verify public URLs

**Success criteria:**
1. Backend Dockerfile builds successfully on Railway
2. Backend connects to Railway PostgreSQL addon and migrations run
3. Frontend static server serves the SPA on a Railway-generated domain
4. Environment variables correctly configured (APP_KEY, CORS, session, Sanctum)
5. Both services respond on their public URLs

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Laravel Foundation + Core Auth | v1.0 | 2/2 | Complete | 2026-03-12 |
| 2. OAuth + Email Verification | v1.0 | 2/2 | Complete | 2026-03-13 |
| 3. Rate Limiting Backend | v1.0 | 2/2 | Complete | 2026-03-13 |
| 4. Frontend Auth Integration | v1.0 | 3/3 | Complete | 2026-03-13 |
| 4.1. Layout Redesign | v1.0 | 2/2 | Complete | 2026-03-13 |
| 5. Dark Web Search | v1.0 | 2/2 | Complete | 2026-03-13 |
| 6. PostgreSQL Migration | v1.1 | 2/2 | Complete | 2026-03-14 |
| 7. Railway Production Deployment | v1.1 | 0/2 | Planning | — |
