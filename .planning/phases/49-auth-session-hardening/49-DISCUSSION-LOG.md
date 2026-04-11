# Phase 49: Auth & Session Hardening - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-11
**Phase:** 49-auth-session-hardening
**Areas discussed:** Forgot-password uniformity, Token invalidation on password reset, Cookie name choice

---

## Forgot-Password Uniformity

### Q1: What should the forgot-password endpoint return?

| Option | Description | Selected |
|--------|-------------|----------|
| Always 200 + generic message | Return 200 with "If an account exists, a reset link has been sent" for ALL cases. Attacker learns nothing. | ✓ |
| Always 200 but hint OAuth users | Return 200 for all, but subtle hint like "Check your email or try signing in with your social account" | |
| Keep current behavior | Accept the enumeration risk for better UX | |

**User's choice:** Always 200 + generic message (Recommended)
**Notes:** None

### Q2: Should the server still send the reset email to password users?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, send to password users only | Password users get the reset email. OAuth users and non-existent emails silently get nothing. | ✓ |
| Send a helpful email to OAuth users too | OAuth users receive "Your account uses Google/GitHub, no password to reset." | |
| You decide | Claude picks the most secure approach | |

**User's choice:** Yes, send to password users only (Recommended)
**Notes:** None

---

## Token Invalidation on Password Reset

### Q1: What should be invalidated on password reset?

| Option | Description | Selected |
|--------|-------------|----------|
| All sessions + all API tokens | Nuclear option — delete all personal_access_tokens AND flush all database sessions. Forces re-login everywhere. | ✓ |
| API tokens only, keep sessions | Revoke Sanctum tokens but leave database sessions alive. | |
| You decide | Claude picks the most secure approach | |

**User's choice:** All sessions + all API tokens (Recommended)
**Notes:** None

### Q2: After reset + token wipe, auto-login or force fresh login?

| Option | Description | Selected |
|--------|-------------|----------|
| Force fresh login | Redirect to login page. User must authenticate again with new credentials. | ✓ |
| Auto-login after reset | Create a new session immediately after successful reset. | |

**User's choice:** Force fresh login (Recommended)
**Notes:** None

---

## Cookie Name Choice

### Q1: What should the session cookie be renamed to?

| Option | Description | Selected |
|--------|-------------|----------|
| __session | Generic, widely used convention. Reveals nothing about the app. | ✓ |
| __Host-sess | Uses __Host- prefix with browser-enforced Secure/path restrictions. | |
| sid | Minimal 3-character name. Common, generic. | |
| You decide | Claude picks a non-descriptive name | |

**User's choice:** __session (Recommended)
**Notes:** None

---

## Claude's Discretion

- Exact implementation of session flush (DB query vs Laravel session methods)
- Where to hook the token/session wipe in the password reset flow
- Whether to log the invalidation event for audit purposes

## Deferred Ideas

None — discussion stayed within phase scope
