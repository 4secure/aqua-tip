---
phase: 7
slug: railway-production-deployment
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual validation (smoke tests via curl/browser) |
| **Config file** | None — deployment validation is manual |
| **Quick run command** | `curl -s https://BACKEND_URL/api/health` |
| **Full suite command** | Check both service URLs respond with 200 |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `curl -s https://BACKEND_URL/api/health`
- **After every plan wave:** Check both service URLs respond with 200
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 7-01-01 | 01 | 1 | DEPLOY-01 | smoke | Railway build log shows success | N/A | ⬜ pending |
| 7-01-02 | 01 | 1 | DEPLOY-02 | smoke | `curl https://BACKEND_URL` returns non-500 | N/A | ⬜ pending |
| 7-01-03 | 01 | 1 | DEPLOY-03 | smoke | Railway deploy log shows migration output | N/A | ⬜ pending |
| 7-01-04 | 01 | 1 | DEPLOY-06 | smoke | No 500 errors, APP_KEY present | N/A | ⬜ pending |
| 7-02-01 | 02 | 1 | DEPLOY-04 | smoke | `curl https://FRONTEND_URL` returns HTML | N/A | ⬜ pending |
| 7-02-02 | 02 | 1 | DEPLOY-05 | smoke | Both URLs respond with 200 | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements — deployment validation is inherently manual/smoke-test based.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Backend Dockerfile builds on Railway | DEPLOY-01 | Railway build is external CI | Check Railway build log for success |
| Backend connects to PostgreSQL | DEPLOY-02 | Requires live Railway PostgreSQL | `curl https://BACKEND_URL` returns non-500 |
| Migrations run on Railway | DEPLOY-03 | Requires live Railway env | Check Railway deploy log for migration output |
| Frontend serves SPA | DEPLOY-04 | Requires live Railway service | `curl https://FRONTEND_URL` returns HTML with `<div id="root">` |
| Both services have public URLs | DEPLOY-05 | External infrastructure | Both `.up.railway.app` URLs respond with 200 |
| Env vars correctly configured | DEPLOY-06 | External config | No 500 errors, APP_KEY present in Railway variables |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
