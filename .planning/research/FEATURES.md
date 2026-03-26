# Feature Research: Onboarding, Trial Enforcement & Subscription Plans

**Domain:** SaaS onboarding, trial management, and credit-based subscription tiers for a threat intelligence platform
**Researched:** 2026-03-20
**Confidence:** HIGH

## Existing System Inventory

Before defining new features, here is what already exists and what the new features build on:

| Component | Current State | Relevant Detail |
|-----------|--------------|-----------------|
| Onboarding | Name + phone fields, sets `onboarding_completed_at` | No timezone, org, or role fields |
| Trial | `trial_ends_at` auto-set to 30 days on user creation | Column exists but is never checked/enforced |
| Credits table | `remaining`, `limit`, `last_reset_at` per user or IP | Hardcoded 10/day auth, 1/day guest |
| CreditBadge | Shows remaining/limit in frontend | Needs to reflect plan tier |
| Auth guard | 3-step: auth -> verified -> onboarded | Trial check would modify credit logic, not add a 4th gate |
| UserResource | Returns `onboarding_completed` boolean | Needs `plan`, `trial_active`, `timezone` fields |
| Credit model | `user_id`, `ip_address`, `remaining`, `limit`, `last_reset_at` | `limit` column already exists -- just needs plan-aware values |

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist in any SaaS with subscription tiers. Missing these creates confusion or distrust.

| Feature | Why Expected | Complexity | Dependencies |
|---------|--------------|------------|--------------|
| Trial countdown banner | Users need to know when trial expires; every SaaS with a trial shows this | LOW | `trial_ends_at` already exists on User model. Read from UserResource, display in Topbar or sidebar. Pure frontend after UserResource update. |
| Trial expiration enforcement | Without enforcement, `trial_ends_at` is meaningless; expired trial users keep getting 10 credits/day forever | MEDIUM | Modify credit lazy-reset logic: if `trial_ends_at < now()` and `plan` is still `trial`, auto-downgrade to `free` plan and set `limit` to 3. Atomic check during existing credit reset flow. |
| Plan-aware credit limits | Credits must match the user's plan tier, not a hardcoded 10 | MEDIUM | Add `plan` column to users (enum: trial/free/basic/pro/enterprise). Credit reset logic reads plan to set `limit`. Existing lazy-reset stays, only the limit source changes. |
| Pricing page with tier comparison | Users need to see what each tier provides before choosing | MEDIUM | Static page with 4 cards (Free/Basic/Pro/Enterprise), feature comparison table, highlighted "Popular" plan on Pro. No payment processing -- plan selection only. |
| Plan selection and storage | User must be able to pick a plan and have it recorded | LOW | API endpoint to set `plan` on user. For v3.0, no payment validation -- store the choice. Enterprise tier uses "Contact us" CTA. |
| Graceful trial-to-free transition | Abrupt lockout creates churn; users expect a soft landing | LOW | On trial expiry, auto-set plan to `free` if no plan chosen. Show "Trial ended" message with CTA to pricing page. No data loss, no account lockout, all features remain accessible at reduced credits. |
| Enhanced onboarding fields | Timezone needed for time display; org/role provide product context and future personalization | LOW | Add `timezone`, `organization`, `role` columns. Extend OnboardingController validation. Update frontend onboarding form. 3 fields added to existing flow. |
| Timezone-aware time display | Timestamps should respect user's chosen timezone, not browser default or UTC | MEDIUM | Store IANA timezone in user profile (e.g., `America/New_York`). Frontend reads from auth context. Apply `Intl.DateTimeFormat` with user timezone to all displayed times. |

### Differentiators (Competitive Advantage)

Features that make Aqua TIP feel more polished than competing TI platforms.

| Feature | Value Proposition | Complexity | Dependencies |
|---------|-------------------|------------|--------------|
| Reverse trial model | Give all new users Pro-level access (50 credits/day) during 30-day trial, then downgrade to Free (3/day). This is the highest-converting trial pattern in SaaS -- users experience full value before deciding. VirusTotal and Shodan do NOT do this; they offer weak free tiers with no trial of premium. | LOW | Already set up: `trial_ends_at` exists, credits exist. During trial, set credit limit to 50 (Pro equivalent). On expiry, drop to Free unless user selected a paid plan. No new infrastructure. |
| Credit consumption transparency | Show exactly how many credits each action costs. ThreatIntelligencePlatform.com publishes per-action credit costs (1-10 credits). Builds trust and reduces confusion. | LOW | Small info table or tooltip on pricing page and search pages. Currently all searches cost 1 credit -- simple to document. |
| Auto-detected timezone default | During onboarding, auto-detect timezone via browser `Intl.DateTimeFormat().resolvedOptions().timeZone` and pre-fill. User confirms or changes. Reduces friction vs empty dropdown. | LOW | Frontend-only: read browser timezone, set as default in onboarding form. No backend changes beyond storing the value. |
| Plan indicator in CreditBadge | Existing CreditBadge shows remaining/limit. Add plan name and color coding (e.g., "Pro: 42/50" in violet, "Free: 2/3" in amber). Users always know their tier. | LOW | Extend CreditBadge component. Requires `plan` field in auth context. |
| "Upgrade" CTA on credit exhaustion | When authenticated user hits daily limit, show plan-aware upgrade prompt: "You've used all 3 Free credits today. Upgrade to Basic for 15/day." | LOW | Modify existing "Daily limit reached" message to be plan-aware. Read current plan and show next tier suggestion. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems for this project scope.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Real payment processing (Stripe) | "Complete the subscription flow" | Premature -- no paying customers, Stripe integration is 2-3 days of work with webhooks, idempotency, error handling, PCI considerations. Railway costs near zero. Adding Stripe before validating demand wastes effort. | Store plan choice in DB. Add Stripe when users actually want to pay. "Contact us" for Enterprise is sufficient. |
| Per-feature gating (not just credits) | "Pro users get Dark Web search, Free users don't" | Creates a permission matrix that grows with every new feature. Hard to maintain, confusing for users ("Why can't I click this?"). | Credit-only gating: all users access all features, they just get fewer daily searches. This is the model VirusTotal and similar TI platforms use. Simpler, more transparent. |
| Role-based access control | "Enterprise needs admin/analyst/viewer roles" | Requires admin panel, invitation system, team management, permission middleware. Massive scope for zero enterprise customers. | Collect `role` during onboarding for analytics only. Defer RBAC to a future milestone when enterprise demand is validated. |
| Monthly/annual billing toggle | "Industry standard on pricing pages" | No payment processing exists. A toggle with no functional billing is misleading and sets false expectations. | Show credit limits per tier without prices. When Stripe is added, add the toggle with real pricing. |
| Free trial without signup | "Reduce friction to try" | Guest credits (1/day by IP) already serve this purpose. A formal "trial without account" creates ghost accounts and makes trial enforcement impossible. | Keep guest credits as the zero-commitment experience. Trial (30 days, Pro-level) starts on account creation. Clear value prop: "Sign up for 50 searches/day free for 30 days." |
| Email drip campaign for trial | "Nudge users to convert during trial" | Requires transactional email service (Mailgun/SES), template management, unsubscribe handling, scheduling. Over-engineered for current scale. | Single trial-expiring notification: email at 3 days before expiry using Laravel's existing mail config. One email, not a campaign. Even this can be deferred to v3.x. |
| Proration / mid-cycle plan changes | "Let users upgrade mid-month and pay the difference" | Without Stripe, there is no billing cycle to prorate against. And even with Stripe, proration adds significant complexity. | Immediate plan change: when user "upgrades," update `plan` column and credit limit instantly. No proration math needed since there are no charges yet. |

## Feature Dependencies

```
[Enhanced Onboarding Fields]
    |
    +-- timezone, organization, role columns added to users
    |
    +--enables--> [Timezone-Aware Time Display]
    |                 (requires timezone stored in user profile)
    |
    +--enables--> [Auto-Detected Timezone Default]
                      (frontend pre-fills, backend stores)

[Plan Column + Credit Tier Mapping]
    |
    +-- plan column on users, config map of plan -> daily limit
    |
    +--enables--> [Trial Expiration Enforcement]
    |                 (enforcement sets plan to 'free' on expiry)
    |
    +--enables--> [Plan-Aware Credit Limits]
    |                 (credit reset reads plan to determine limit)
    |
    +--enables--> [Pricing Page]
    |                 (displays tier info from same config)
    |
    +--enables--> [Plan Selection API]
    |                 (writes to plan column)
    |
    +--enables--> [Plan Indicator in CreditBadge]
    |                 (reads plan from auth context)
    |
    +--enables--> [Upgrade CTA on Exhaustion]
                      (reads current plan, suggests next tier)

[Trial Countdown Banner]
    +--requires--> UserResource exposes trial_ends_at (trivial change)
    +--independent of--> plan system (just reads a date)

[Graceful Trial-to-Free Transition]
    +--requires--> [Trial Expiration Enforcement]
    +--requires--> [Plan-Aware Credit Limits]

[Reverse Trial Model]
    +--requires--> [Plan Column + Credit Tier Mapping]
    +--decision--> During trial, limit = 50 (Pro equivalent)
```

### Dependency Notes

- **Plan column must exist before enforcement:** The enforcement logic needs to know what plan to downgrade to. Migration first, logic second.
- **Onboarding before timezone display:** The timezone value must be collected/stored before it can be applied to time rendering. Ship onboarding changes in an early phase.
- **Trial countdown is independent:** Only reads `trial_ends_at` which already exists. Can ship immediately after UserResource exposes it.
- **Pricing page requires plan definitions:** The tier names, credit limits, and descriptions must be defined in config before the pricing page can render them. Backend config first, frontend page second.
- **Credit reset modification is the critical path:** The existing lazy-reset in CreditService is where plan-awareness must be injected. This is the most sensitive change -- it touches the core rate limiting system.

## MVP Definition (v3.0 Scope)

### Launch With (v3.0)

- [x] Enhanced onboarding: timezone (auto-detect + dropdown), organization (text, optional), role (select, optional) -- extends existing controller
- [x] Plan column on users: enum `trial`/`free`/`basic`/`pro`/`enterprise` with `trial` as default for new users
- [x] Plan-to-credit config map: `{ trial: 50, free: 3, basic: 15, pro: 50, enterprise: 200 }`
- [x] Trial enforcement: on credit reset, check `trial_ends_at`; if expired and plan is `trial`, set plan to `free`
- [x] Credit reset respects plan: existing lazy-reset reads `plan` column to set `limit` value
- [x] Trial countdown in Topbar: "X days left" badge with link to pricing page
- [x] Pricing page: 4-tier card layout, feature comparison table, "Current plan" indicator, plan selection buttons
- [x] Plan selection API: `POST /api/plan` sets plan column (no payment validation in v3.0)
- [x] Timezone-aware time display: apply user timezone to all rendered timestamps
- [x] UserResource updates: expose `plan`, `trial_ends_at`, `trial_active` (computed), `timezone`
- [x] Plan indicator in CreditBadge: show plan name alongside remaining/limit
- [x] Upgrade CTA on credit exhaustion: plan-aware messaging

### Add After Validation (v3.x)

- [ ] Trial extension for active users (7 days if profile complete + 5+ searches) -- trigger: retention metric analysis
- [ ] Single trial-expiry email at 3 days before expiration -- trigger: when email deliverability is confirmed reliable
- [ ] Plan usage trend widget on dashboard -- trigger: after core subscription is stable

### Future Consideration (v4+)

- [ ] Stripe payment processing -- trigger: validated demand from real users
- [ ] Monthly/annual billing toggle -- trigger: Stripe integration
- [ ] RBAC / team management -- trigger: enterprise customer requests
- [ ] Email drip campaigns -- trigger: marketing automation need
- [ ] Proration on plan changes -- trigger: Stripe billing cycles exist

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority | Phase |
|---------|------------|---------------------|----------|-------|
| Plan column + credit tier mapping | HIGH | LOW | P1 | 1 (Backend schema) |
| Enhanced onboarding fields | MEDIUM | LOW | P1 | 1 (Backend schema) |
| Trial enforcement in credit reset | HIGH | MEDIUM | P1 | 2 (Backend logic) |
| Plan-aware credit limits | HIGH | MEDIUM | P1 | 2 (Backend logic) |
| UserResource updates | HIGH | LOW | P1 | 2 (Backend logic) |
| Trial countdown banner | MEDIUM | LOW | P1 | 3 (Frontend) |
| Onboarding form update | MEDIUM | LOW | P1 | 3 (Frontend) |
| Pricing page | HIGH | MEDIUM | P1 | 3 (Frontend) |
| Plan selection API + UI | HIGH | LOW | P1 | 3 (Frontend) |
| Timezone-aware display | MEDIUM | MEDIUM | P1 | 4 (Frontend polish) |
| Plan indicator in CreditBadge | MEDIUM | LOW | P2 | 3 (Frontend) |
| Upgrade CTA on exhaustion | MEDIUM | LOW | P2 | 3 (Frontend) |
| Credit consumption transparency | LOW | LOW | P2 | 3 (Frontend) |
| Trial extension for engagement | LOW | LOW | P3 | Future |
| Plan usage dashboard widget | MEDIUM | MEDIUM | P3 | Future |

**Priority key:**
- P1: Must have for v3.0 launch
- P2: Should have, include if time allows
- P3: Nice to have, defer to v3.x+

## Competitor Feature Analysis

| Feature | VirusTotal | Shodan | ThreatIntelligencePlatform.com | Our Approach (Aqua TIP) |
|---------|------------|--------|-------------------------------|------------------------|
| Free tier | 4 lookups/min, 500/day, 15.5K/month | Limited free searches | 100 free credits on signup (one-time) | 3/day Free, daily reset, unlimited features |
| Credit model | Rate-limited API calls (requests/min + daily cap) | Credit-based monthly allotments | Per-request credit deduction (1-10 per action type) | 1 credit per search, daily lazy reset at midnight UTC |
| Trial | No trial -- freemium only | No trial -- freemium only | 100 credits trial (one-time, no expiration) | 30-day reverse trial at Pro level (50/day) |
| Paid tiers | Premium API with custom pricing (enterprise sales) | Membership $69/mo, Small Business, Corporate, Enterprise | Credit bundles (custom amounts, volume pricing) | 4 fixed tiers: Free (3), Basic (15), Pro (50), Enterprise (200) |
| Pricing transparency | Public rate limits, hidden pricing for premium | Public pricing page with clear tiers | Per-action credit costs published | Public pricing page with daily credit limits per tier |
| Onboarding | Minimal (email signup only) | Minimal (email signup only) | Minimal | Enhanced: timezone, org, role for personalization |
| Trial-to-free transition | N/A | N/A | Credits deplete, no auto-renewal | Automatic soft downgrade to Free tier, all features remain |

**Key insight:** Most TI platforms do NOT offer reverse trials. They either have weak free tiers (VirusTotal) or one-time credit allotments (ThreatIntelligencePlatform.com). A 30-day reverse trial at Pro level is a genuine differentiator in this space.

## Subscription Tier Specification

| Tier | Plan Value | Daily Credits | During Trial | Target User | CTA |
|------|-----------|--------------|-------------|-------------|-----|
| Trial | `trial` | 50 (Pro equivalent) | Yes, 30 days | All new signups | Auto-assigned |
| Free | `free` | 3 | Post-trial default | Casual researchers, students | "Current Plan" or "Downgraded" |
| Basic | `basic` | 15 | N/A | Individual analysts, freelancers | "Get Started" |
| Pro | `pro` | 50 | N/A | Security teams, regular users | "Most Popular" (highlighted) |
| Enterprise | `enterprise` | 200 | N/A | SOC teams, MSSPs, organizations | "Contact Us" |

**Pricing:** Intentionally TBD for v3.0. The milestone scope is plan structure and credit enforcement, not monetization. Prices will be defined when Stripe is integrated.

## Onboarding Field Specification

| Field | Input Type | Required | Validation | How Used |
|-------|-----------|----------|------------|----------|
| Name | text | Yes (existing) | min:2, max:255 | Display in sidebar, topbar |
| Phone | text | Yes (existing) | min:5, max:20 | Future contact/notifications |
| Timezone | select dropdown | Yes (new) | Must be valid IANA timezone | All timestamp rendering across app |
| Organization | text | No (new) | max:255 | Analytics, future team features |
| Role | select dropdown | No (new) | Must be from allowed list | Analytics, onboarding personalization |

**Role options:** Security Analyst, SOC Analyst, Threat Hunter, Incident Responder, CISO/Manager, Researcher, Student, Other

**Timezone implementation:**
- Auto-detect via `Intl.DateTimeFormat().resolvedOptions().timeZone` as pre-filled default
- Populate dropdown with `Intl.supportedValuesOf('timeZone')` (returns ~400 IANA zones)
- Group by region (America, Europe, Asia, etc.) for usability
- Store raw IANA string (e.g., `Asia/Riyadh`, `America/New_York`)
- Frontend applies via `new Date().toLocaleString('en-US', { timeZone: userTimezone })`

## Credit System Modification Plan

The existing credit system needs minimal changes. The core mechanism (lazy reset at midnight UTC, atomic deduction) stays identical. Only the `limit` source changes.

**Current flow:**
1. Request comes in -> CreditService checks credit row
2. If `last_reset_at` is before midnight UTC today -> reset `remaining` to `limit` (hardcoded 10)
3. Deduct 1 credit atomically

**New flow:**
1. Request comes in -> CreditService checks credit row
2. Load user's `plan` column
3. If plan is `trial` and `trial_ends_at < now()` -> set plan to `free`, save user
4. Look up daily limit from plan config: `{ trial: 50, free: 3, basic: 15, pro: 50, enterprise: 200 }`
5. If `last_reset_at` is before midnight UTC today -> reset `remaining` to plan limit, update `limit` column
6. Deduct 1 credit atomically

**Key change:** Step 2-4 are new. Step 5 changes from hardcoded 10 to plan-derived value. Step 6 is unchanged. The `limit` column on the credits table gets updated on each reset to match the current plan, so CreditBadge always shows the correct denominator.

## Sources

- [SaaS Onboarding Best Practices 2026 - DesignRevision](https://designrevision.com/blog/saas-onboarding-best-practices)
- [SaaS Onboarding Best Practices 2025 - Insaim](https://www.insaim.design/blog/saas-onboarding-best-practices-for-2025-examples)
- [Reverse Trial Method - UserPilot](https://userpilot.com/blog/saas-reverse-trial/)
- [SaaS Trial Strategies - Chargebee](https://www.chargebee.com/resources/guides/subscription-pricing-trial-strategy/saas-trial-plans/)
- [Credit-Based SaaS Models - PricingSaaS Newsletter](https://newsletter.pricingsaas.com/p/how-to-use-credit-models-12-examples)
- [Credit vs Time Trials - Inflection.io](https://www.inflection.io/post/time-based-trial-or-free-credits-choosing-the-right-trial-strategy)
- [SaaS Pricing Page Design - Eleken](https://www.eleken.co/blog-posts/saas-pricing-page-design-8-best-practices-with-examples)
- [SaaS Pricing Page Examples - Webstacks](https://www.webstacks.com/blog/saas-pricing-page-design)
- [ThreatIntelligencePlatform.com Pricing](https://threatintelligenceplatform.com/pricing)
- [VirusTotal Public vs Premium API](https://docs.virustotal.com/reference/public-vs-premium-api)
- [Cancellation Flow Examples - UserPilot](https://userpilot.com/blog/cancellation-flow-examples/)
- [SaaS Trial Expiration UX - Chargebee](https://www.chargebee.com/resources/guides/subscription-pricing-trial-strategy/saas-trial-plans/)
- [Tiered Pricing Examples - Orb](https://www.withorb.com/blog/tiered-pricing-examples)

---
*Feature research for: Aqua TIP v3.0 Onboarding, Trial Enforcement & Subscription Plans*
*Researched: 2026-03-20*
