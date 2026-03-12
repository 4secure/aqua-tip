# Feature Landscape

**Domain:** Authentication system for a threat intelligence platform (SPA + Laravel API)
**Researched:** 2026-03-12

## Table Stakes

Features users expect. Missing = product feels incomplete or untrustworthy.

For a security-focused platform, the bar is higher than generic SaaS. Users are security professionals who will judge your auth implementation.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Email/password registration | Universal baseline auth method | Low | Bcrypt hashing via Laravel's `Hash` facade. Already in PROJECT.md scope. |
| OAuth social login (Google, GitHub) | Security practitioners live on GitHub; Google is universal. Reduces friction massively. | Medium | Laravel Socialite handles the heavy lifting. GitHub is especially important for this audience. |
| Email verification | Security platform without email verification = zero credibility. VirusTotal, Shodan, OTX all require it. | Low | Laravel ships `MustVerifyEmail` trait out of the box. Already in scope. |
| Secure session management | Users expect persistent login without re-entering credentials constantly | Low | Sanctum cookie-based SPA auth with 7-day expiry. CSRF protection via `/sanctum/csrf-cookie` endpoint. |
| Password hashing (bcrypt/argon2) | Non-negotiable for any auth system in 2026 | Low | Laravel defaults to bcrypt. No custom work needed. |
| CSRF protection | SPA auth without CSRF = exploitable. Security-savvy users will notice. | Low | Sanctum SPA mode provides this automatically via XSRF-TOKEN cookie. |
| Rate limiting (tiered by auth status) | Every major TI platform (VirusTotal: 4/min free, Shodan: tiered by plan) gates access by auth tier. Users expect this pattern. | Medium | IP-based for guests, user-ID-based for authenticated. Already scoped: 1/day guest, 10/day authenticated. |
| Protected routes with redirect | Standard SPA pattern. Unauthenticated users hitting protected pages must be sent to login. | Low | React auth context + route guards. Already in scope. |
| Logout (with token/session invalidation) | Must actually destroy the session server-side, not just clear local state | Low | Sanctum handles session destruction. Frontend clears auth context. |
| CORS configuration | SPA on different port/domain from API requires proper CORS or nothing works | Low | Laravel CORS middleware. Already noted in PROJECT.md constraints. |
| Password strength requirements | Security platform with weak password policy = embarrassing | Low | Minimum 8 chars, require mixed case + number. Laravel validation rules. |
| Themed auth pages matching the app | Auth pages that look like a different app destroy trust and feel amateur | Medium | Standalone pages using existing design system (glassmorphism, violet/cyan, Syne/JetBrains Mono). Already scoped. |

## Differentiators

Features that set the product apart. Not expected in v1, but valued and worth considering for near-term phases.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| API key generation for authenticated users | Every TI platform (VirusTotal, OTX, Shodan) provides API keys. Users expect programmatic access. This is the #1 differentiator to prioritize after v1. | Medium | Generate unique API keys per user, stored hashed. Sanctum supports API token auth natively. |
| Rate limit upgrade CTA | Converts guest users to registered users. VirusTotal uses this pattern effectively ("Sign up for more requests"). | Low | Show contextual CTA when rate limit is hit. Already scoped. |
| Session activity display (active sessions) | Security users want to see where they're logged in and revoke sessions. Builds trust. | Medium | Track sessions in DB with IP, user-agent, last active timestamp. Sanctum tokens can be listed/revoked. |
| Account lockout after failed attempts | Prevents brute-force attacks. Expected by security-conscious users. | Low | Laravel's `ThrottlesLogins` trait. Lock after 5 failed attempts for 15 minutes. |
| Password reset via email | Users forget passwords. Without this, they're locked out permanently. Could be argued as table stakes, but given OAuth is primary flow, it's a strong differentiator for email/password users. | Low | Laravel ships `Password::sendResetLink()` and reset flow out of the box. |
| Audit log of login events | Security professionals want to see login history (IP, timestamp, method). Standard in enterprise security tools. | Medium | Log auth events to a `login_audits` table. Display in settings page. |
| Two-factor authentication (TOTP) | MFA is becoming standard for security platforms. Listed as out-of-scope for v1 but should be phase 2. | High | Use `pragmarx/google2fa-laravel` or similar. Adds TOTP setup flow, backup codes, recovery. |
| Role-based access control (RBAC) | Different permission levels (admin, analyst, viewer). Critical for team use cases. | High | Laravel policies + roles table. Not needed for single-user v1 but essential for growth. |
| Remember me / extended sessions | Checkbox on login to extend session beyond default 7 days (e.g., 30 days) | Low | Sanctum token with configurable expiry. Simple toggle. |
| Dark/light mode auth pages | Current app is dark-only, but offering theme choice on auth pages shows polish | Low | Already dark-only by design decision. Defer unless user feedback demands it. |

## Anti-Features

Features to explicitly NOT build. These add complexity without proportional value, or actively harm the product.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Magic link / passwordless login | Adds complexity to email infrastructure without clear user demand. OAuth already reduces password friction. Scoped out in PROJECT.md. | Keep OAuth as the low-friction option. Revisit only if email/password adoption is high and users request it. |
| SMS-based 2FA | SIM swapping attacks make SMS 2FA actively insecure (IBM X-Force 2026 report highlights this). Security-savvy users will judge you for offering it. | When adding 2FA, use TOTP (authenticator app) only. Never SMS. |
| Admin panel / user management dashboard | Massive scope creep for v1. No multi-tenant or team features exist yet. Explicitly out of scope. | Manage users via database/tinker in v1. Build admin panel when RBAC is added. |
| Custom OAuth provider (be an identity provider) | You are consuming OAuth, not providing it. Building an OAuth server is a different product. | Use Socialite to consume Google/GitHub. Never roll your own OAuth server. |
| SAML/LDAP enterprise SSO | Enterprise feature that requires sales-driven development. Premature for a platform with no paying customers. | Defer until enterprise tier exists. When ready, use a service like WorkOS rather than implementing SAML yourself. |
| Username-based login (separate from email) | Adds a redundant identifier. Email is the canonical identity. Usernames create confusion about "which one do I log in with?" | Use email as the sole identifier. Display name is separate from login credential. |
| Session storage in JWT claims | Storing session data in JWT tokens leads to stale data, token bloat, and inability to revoke. Sanctum's cookie-based SPA auth is superior. | Use Sanctum's cookie-based session auth for SPA. Use Sanctum API tokens only for programmatic/API access. |
| CAPTCHA on login | Adds friction for legitimate users. Account lockout after failed attempts is more effective and less annoying. | Implement account lockout (5 attempts / 15 min). Add CAPTCHA only if bot traffic becomes a measured problem. |
| Social login with many providers (Facebook, Twitter, Apple, LinkedIn...) | Each provider adds maintenance burden, OAuth flow testing, and edge cases. Google + GitHub covers 95%+ of this audience. | Stick with Google + GitHub. Add more only if analytics show significant demand. |

## Feature Dependencies

```
Email/password registration --> Email verification (verification requires working email flow)
Email verification --> Password reset (shares email sending infrastructure)
OAuth setup (Google, GitHub) --> Socialite configuration (shared dependency)
CSRF cookie endpoint --> All authenticated SPA requests (must be called first)
Auth context/provider --> Route protection (guards depend on auth state)
Rate limiting --> Rate limit CTA (CTA triggers when limit is hit)
Rate limiting --> Tiered limits (guest vs auth requires knowing auth state)
Auth context/provider --> Tiered rate limits (need to send auth token with requests)
Login/registration pages --> Themed auth pages (pages must exist before styling)
API key generation --> API token auth middleware (Sanctum token guard)
Session tracking --> Session activity display (need data before UI)
Account lockout --> Login audit log (lockout events are a subset of audit events)
```

## MVP Recommendation

Prioritize for v1 (this milestone):

1. **Email/password registration + login** - Universal fallback auth method
2. **Google + GitHub OAuth** - Primary low-friction auth for this audience
3. **Email verification** - Non-negotiable for a security platform
4. **Sanctum cookie-based SPA session** - Secure, CSRF-protected, handles 7-day expiry
5. **Rate limiting (IP for guests, user ID for authenticated)** - Core product differentiator already scoped
6. **Route protection + auth context** - Makes the SPA actually secure
7. **Rate limit upgrade CTA** - Converts guests to users, low effort
8. **Themed auth pages** - Match existing design system
9. **Password strength validation** - Minimum bar for credibility
10. **Account lockout after failed attempts** - Low effort, high security value

Defer to phase 2:
- **Password reset flow**: Low complexity but requires email infrastructure to be proven reliable first. Ship immediately after v1 stabilizes.
- **API key generation**: High value for power users but not blocking initial launch. Phase 2 priority #1.
- **Login audit log**: Important for trust but not blocking. Phase 2.
- **Session activity display**: Depends on audit infrastructure. Phase 2-3.
- **TOTP 2FA**: High complexity, explicitly out of v1 scope. Phase 3.
- **RBAC**: Only needed when teams/multi-user scenarios emerge. Phase 3-4.

## Sources

- [VirusTotal Public vs Premium API](https://docs.virustotal.com/reference/public-vs-premium-api) - Rate limit tiers and API key patterns
- [Shodan Account Billing](https://account.shodan.io/billing) - Tiered access model
- [AlienVault OTX API](https://otx.alienvault.com/api) - API key authentication pattern
- [Laravel Sanctum Docs (12.x)](https://laravel.com/docs/12.x/sanctum) - SPA authentication, CSRF, token management
- [IBM 2026 X-Force Threat Index](https://newsroom.ibm.com/2026-02-25-ibm-2026-x-force-threat-index-ai-driven-attacks-are-escalating-as-basic-security-gaps-leave-enterprises-exposed) - SIM swapping risks, identity-based attacks
- [SaaS Authentication Best Practices (Descope)](https://www.descope.com/blog/post/saas-auth) - MFA, SSO, rate limiting as table stakes
- [API Rate Limiting Best Practices (Tyk)](https://tyk.io/learning-center/api-rate-limiting-explained-from-basics-to-best-practices/) - Tiered rate limiting patterns
- [Free Cybersecurity APIs for IOCs (Upskilld)](https://upskilld.com/article/free-cybersecurity-apis/) - API key patterns across TI platforms
