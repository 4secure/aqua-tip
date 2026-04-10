---
phase: 47
slug: infrastructure-hardening
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-11
---

# Phase 47 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None (no test infrastructure exists — manual curl smoke tests) |
| **Config file** | None |
| **Quick run command** | `curl -sI https://api.tip.aquasecure.ai/` |
| **Full suite command** | Manual curl verification script (8 checks) |
| **Estimated runtime** | ~15 seconds (all 8 curl checks) |

---

## Sampling Rate

- **After every task commit:** Visual diff review of nginx.conf changes
- **After every plan wave:** Full curl verification against production after Railway deploy
- **Before `/gsd:verify-work`:** All 8 curl checks pass on production URL
- **Max feedback latency:** 30 seconds (deploy + curl round-trips)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 47-01-01 | 01 | 1 | INFRA-01 | smoke | `curl -s -o /dev/null -w "%{http_code}" https://api.tip.aquasecure.ai/../../etc/passwd` | N/A - manual | ⬜ pending |
| 47-01-02 | 01 | 1 | INFRA-02 | smoke | `curl -s -o /dev/null -w "%{http_code}" https://api.tip.aquasecure.ai/test.php` | N/A - manual | ⬜ pending |
| 47-01-03 | 01 | 1 | INFRA-03 | smoke | `curl -sI https://api.tip.aquasecure.ai/ \| grep -ic "^server:"` (expect 0) | N/A - manual | ⬜ pending |
| 47-01-04 | 01 | 1 | INFRA-04 | smoke | `curl -s -o /dev/null -w "%{http_code}" -X TRACE https://api.tip.aquasecure.ai/` | N/A - manual | ⬜ pending |
| 47-01-05 | 01 | 1 | INFRA-05 | smoke | `curl -sI https://api.tip.aquasecure.ai/ \| grep -i strict-transport` | N/A - manual | ⬜ pending |
| 47-01-06 | 01 | 1 | INFRA-06 | smoke | `curl -s -o /dev/null -w "%{http_code}" -X POST -d @/dev/zero --max-time 5 https://api.tip.aquasecure.ai/api/test` | N/A - manual | ⬜ pending |
| 47-01-07 | 01 | 1 | INFRA-07 | smoke | `curl -sI https://api.tip.aquasecure.ai/ \| grep -i content-security-policy` | N/A - manual | ⬜ pending |
| 47-01-08 | 01 | 1 | INFRA-08 | smoke | `curl -s -o /dev/null -w "%{http_code}" https://api.tip.aquasecure.ai/my-ip` | N/A - manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.* No test framework to set up — all verification is manual curl-based smoke testing against the deployed service. This is appropriate because: (1) Nginx config changes cannot be tested locally without Docker, (2) the project has no existing test infrastructure, and (3) these are infrastructure-level checks that require a running server.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Path traversal returns 403 | INFRA-01 | Requires running Nginx server | `curl -s -o /dev/null -w "%{http_code}" https://api.tip.aquasecure.ai/../../etc/passwd` → expect 403 |
| Arbitrary PHP returns 404 | INFRA-02 | Requires running Nginx server | `curl -s -o /dev/null -w "%{http_code}" https://api.tip.aquasecure.ai/test.php` → expect 404 |
| No Server header | INFRA-03 | Requires running Nginx server | `curl -sI https://api.tip.aquasecure.ai/` → no `Server:` line |
| TRACE method rejected | INFRA-04 | Requires running Nginx server | `curl -s -o /dev/null -w "%{http_code}" -X TRACE https://api.tip.aquasecure.ai/` → expect 405 |
| HSTS header present | INFRA-05 | Requires running Nginx server | `curl -sI https://api.tip.aquasecure.ai/` → has `Strict-Transport-Security: max-age=31536000; includeSubDomains` |
| Body size capped at 2M | INFRA-06 | Requires running Nginx server | POST >2MB → expect 413 |
| CSP header present | INFRA-07 | Requires running Nginx server | `curl -sI https://api.tip.aquasecure.ai/` → has `Content-Security-Policy` |
| Debug routes removed | INFRA-08 | Requires running Nginx server | `curl -s -o /dev/null -w "%{http_code}" https://api.tip.aquasecure.ai/my-ip` → expect 404 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
