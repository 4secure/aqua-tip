# Phase 48: API Security - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-11
**Phase:** 48-api-security
**Areas discussed:** IDOR fix strategy, Rate limiting design, Error sanitization, Response stripping

---

## IDOR Fix Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Database tracking | Create dark_web_tasks table storing task_id + user_id. Status endpoint checks ownership. | ✓ |
| Session-scoped tracking | Store task_id in user's session/cache. Simpler but lost on session expiry. | |
| You decide | Claude picks based on codebase patterns | |

**User's choice:** Database tracking
**Notes:** None

### Follow-up: Non-owner response

| Option | Description | Selected |
|--------|-------------|----------|
| 403 Forbidden | Return 403 with generic message — confirms task exists but user doesn't own it | ✓ |
| 404 Not Found | Return 404 — hides task existence entirely (prevents enumeration) | |

**User's choice:** 403 Forbidden
**Notes:** None

---

## Rate Limiting Design

### Limiter structure

| Option | Description | Selected |
|--------|-------------|----------|
| Single named limiter | One 'api-search' RateLimiter (30/min per user or IP) for /ip-search, /threat-search, /credits | ✓ |
| Per-endpoint limiters | Separate limiters per endpoint with different thresholds | |
| You decide | Claude picks based on codebase patterns | |

**User's choice:** Single named limiter
**Notes:** None

### Requester identification

| Option | Description | Selected |
|--------|-------------|----------|
| User ID or IP fallback | Auth users by user ID, guests by IP. Matches credit system pattern. | ✓ |
| IP only | Always by IP regardless of auth state | |
| You decide | Claude picks | |

**User's choice:** User ID or IP fallback
**Notes:** None

### OAuth & email rate limits

| Option | Description | Selected |
|--------|-------------|----------|
| Tighter limits | OAuth redirect: 10/min per IP. Email resend: keep 6/min + add 20/day cap. | ✓ |
| Same 30/min | Apply api-search limiter to OAuth and email for simplicity | |
| You decide | Claude picks appropriate limits | |

**User's choice:** Tighter limits
**Notes:** None

---

## Error Sanitization

| Option | Description | Selected |
|--------|-------------|----------|
| Generic message + server log | Return fixed generic message, log full exception via Log::error() | ✓ |
| Error codes | Return machine-readable error codes alongside generic message | |
| You decide | Claude picks simplest secure approach | |

**User's choice:** Generic message + server log
**Notes:** None

---

## Response Stripping

| Option | Description | Selected |
|--------|-------------|----------|
| Whitelist fields in controller | Controller explicitly picks only needed fields before returning | ✓ |
| API Resource class | Create ThreatSearchResource for formal transformation | |
| Strip in service layer | ThreatSearchService returns curated fields only | |
| You decide | Claude picks based on codebase patterns | |

**User's choice:** Whitelist fields in controller
**Notes:** None

---

## Claude's Discretion

- Migration schema details for dark_web_tasks table
- Exact fields to whitelist in threat search responses
- Log::error() context payload structure
- Rate limiter definition organization in AppServiceProvider

## Deferred Ideas

None — discussion stayed within phase scope
