# Phase 25: Pricing, Trial Banners & Timezone Display - Research

**Researched:** 2026-03-24
**Domain:** Frontend UI -- pricing page, trial awareness banners, plan-aware credits, timezone formatting
**Confidence:** HIGH

## Summary

Phase 25 is entirely frontend work. All backend APIs are already built (Phase 23): GET /api/plans returns plan cards, POST /api/plan handles selection, GET /api/credits returns remaining/limit, and UserResource exposes plan, trial_active, trial_days_left, pending_plan, plan_change_at, and timezone. AuthContext already exposes timezone with UTC fallback for unauthenticated users.

The phase has four distinct workstreams: (1) a new PricingPage with 4-card comparison layout and confirmation modal, (2) a TrialBanner component rendered in AppLayout between topbar and content, (3) extending CreditBadge with plan name and making credit exhaustion messages plan-aware, and (4) a useFormatDate hook using native Intl.DateTimeFormat to replace 5 duplicated formatDate functions with timezone-aware formatting.

**Primary recommendation:** No new dependencies needed. Use native Intl.DateTimeFormat for timezone formatting, Lucide React icons for UI elements, and the existing glassmorphism/chip design system for all new components.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Horizontal row of 4 cards on desktop, stacking vertically on mobile. Standard SaaS pricing pattern
- D-02: Pro card highlighted with violet glow border (border-violet, shadow-violet) + "Most Popular" badge at top. Other cards use standard border-border
- D-03: User's current plan indicated by "Current Plan" muted badge replacing the selection button (non-clickable). Available plans show "Upgrade" (violet gradient button)
- D-04: Enterprise card shows "Contact Us" CTA instead of selection button (checked via slug === 'enterprise')
- D-05: Plan selection requires confirmation modal: "Switch to Pro? Daily limit: 3 -> 50. Price: $0 -> $29/mo" with Confirm/Cancel. Shows pending downgrade info if applicable
- D-06: Pricing page accessible from sidebar navigation (add to NAV_ITEMS)
- D-07: Each card shows: plan name, price, daily credit limit, feature list, and action button
- D-08: Full-width banner strip below topbar, above page content. Rendered inside AppLayout
- D-09: Color escalation by phase: 30-7 days subtle amber dismissible, 7-1 days brighter amber dismissible, expired red non-dismissible
- D-10: Banner only shows for trial users (no plan_id AND trial active or expired). Users with any plan never see the banner
- D-11: Plan-aware CreditBadge in sidebar footer (above collapse toggle). Shows "Pro: 42/50" when expanded, compact chip when collapsed
- D-12: Sidebar fetches credits independently on mount. Pages like ThreatSearch still fetch their own credits for real-time accuracy after each search. No shared state needed
- D-13: Credit exhaustion message is plan-aware with tier-specific upgrade suggestions
- D-14: Guest credit exhaustion unchanged: "Sign in for more lookups"
- D-15: Shared useFormatDate hook reads timezone from useAuth(), returns formatDate and formatDateTime functions
- D-16: Uses native Intl.DateTimeFormat with user's IANA timezone -- no new dependencies
- D-17: Absolute date format: "Mar 11, 2026" (date only) or "Mar 11, 2026 3:45 PM" (with time)
- D-18: Replace duplicated inline formatDate() in all 5 locations: ThreatSearchPage, ThreatActorsPage, ThreatNewsPage, DashboardPage, BreachCard
- D-19: Unauthenticated users default to UTC (already handled by AuthContext fallback)

### Claude's Discretion
- Exact spacing/padding in pricing cards and feature lists
- Confirmation modal animation and styling details
- Banner dismiss state management (useState vs sessionStorage)
- CreditBadge sidebar layout when collapsed (chip vs icon)
- useFormatDate hook internal memoization strategy
- Pricing page header text and any promotional copy

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PRICE-01 | Pricing page displays 4 plan tiers in a card comparison layout | GET /api/plans returns all 4 plans with sort_order; use glassmorphism card pattern |
| PRICE-02 | Each plan card shows name, daily credit limit, feature list, and selection button | Plan object has name, daily_credit_limit, features (JSON array), price_cents |
| PRICE-03 | Pro plan is highlighted as "Most Popular" | Plan object has is_popular boolean flag; apply violet glow styling |
| PRICE-04 | Enterprise plan shows "Contact Us" CTA instead of selection button | Check slug === 'enterprise'; Enterprise excluded from POST /api/plan validation |
| PRICE-05 | User's current plan is indicated on the pricing page | Compare user.plan?.slug to each card's slug; show "Current Plan" badge |
| PRICE-06 | CreditBadge shows plan name alongside remaining/limit | Extend existing CreditBadge component; sidebar fetches GET /api/credits on mount |
| PRICE-07 | Credit exhaustion message is plan-aware with upgrade suggestion to next tier | User object has plan.slug and plan.daily_credit_limit for tier-aware messaging |
| PRICE-08 | Pricing page is accessible from sidebar navigation | Add entry to NAV_ITEMS in mock-data.js; add route in App.jsx |
| TRIAL-05 | User sees a trial countdown banner showing days remaining | user.trial_active and user.trial_days_left from AuthContext |
| TRIAL-06 | User sees a "Trial expired -- upgrade" banner when trial ends without a plan | trial_active=false, trial_days_left=0, plan=null indicates expired trial |
| TZ-01 | All timestamps across the app render in user's stored timezone | useFormatDate hook with Intl.DateTimeFormat, timezone from useAuth() |
| TZ-03 | Unauthenticated users see UTC timestamps | AuthContext already returns timezone: user?.timezone ?? 'UTC' |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19 | UI framework | Already in project |
| react-router-dom | 7 | Routing (new /pricing route) | Already in project |
| lucide-react | latest | Icons (Crown, AlertTriangle, Clock, X, Check, CreditCard) | Already in project |
| Intl.DateTimeFormat | Native API | Timezone-aware date formatting | Zero-dependency, built into all modern browsers |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Framer Motion | (already installed) | Modal animation (AnimatePresence + motion.div) | Confirmation modal enter/exit |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Intl.DateTimeFormat | date-fns-tz / luxon | Overkill -- native API covers all needs, zero bundle cost |
| Custom modal | headless-ui Dialog | Extra dependency for one modal; project has no dialog library pattern |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### New Files
```
frontend/src/
  pages/
    PricingPage.jsx              # New pricing page with 4-card layout
  components/
    pricing/
      PlanCard.jsx               # Individual plan card component
      PlanConfirmModal.jsx       # Confirmation modal for plan selection
    layout/
      TrialBanner.jsx            # Trial countdown / expiry banner
  hooks/
    useFormatDate.js             # Timezone-aware date formatting hook
```

### Modified Files
```
frontend/src/
  App.jsx                        # Add /pricing route (lazy-loaded)
  data/mock-data.js              # Add Pricing entry to NAV_ITEMS
  data/icons.jsx                 # Add 'pricing' icon (CreditCard/Tag SVG)
  components/layout/AppLayout.jsx # Insert TrialBanner between Topbar and main
  components/layout/Sidebar.jsx  # Add CreditBadge to footer area
  components/shared/CreditBadge.jsx # Extend with planName prop, compact mode
  pages/ThreatSearchPage.jsx     # Replace formatDate with useFormatDate, plan-aware exhaustion
  pages/ThreatActorsPage.jsx     # Replace formatDate with useFormatDate
  pages/ThreatNewsPage.jsx       # Replace formatDate with useFormatDate
  pages/DashboardPage.jsx        # Replace formatResetDate with useFormatDate
  components/shared/BreachCard.jsx # Replace formatDate with useFormatDate
```

### Pattern 1: useFormatDate Hook
**What:** Shared hook that returns memoized formatDate and formatDateTime functions using the authenticated user's timezone
**When to use:** Every timestamp display across the app
**Example:**
```jsx
// hooks/useFormatDate.js
import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function useFormatDate() {
  const { timezone } = useAuth();

  return useMemo(() => {
    const dateFormatter = new Intl.DateTimeFormat('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      timeZone: timezone,
    });

    const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
      timeZone: timezone,
    });

    const formatDate = (dateStr) => {
      if (!dateStr) return '--';
      try {
        return dateFormatter.format(new Date(dateStr));
      } catch {
        return dateStr;
      }
    };

    const formatDateTime = (dateStr) => {
      if (!dateStr) return '--';
      try {
        return dateTimeFormatter.format(new Date(dateStr));
      } catch {
        return dateStr;
      }
    };

    return { formatDate, formatDateTime };
  }, [timezone]);
}
```

### Pattern 2: Trial Banner State Detection
**What:** Derive banner visibility and severity from user object fields
**When to use:** TrialBanner component
**Example:**
```jsx
// Derive trial state from user object
const { user, isAuthenticated } = useAuth();

// Trial user: no plan, trial still active
const isTrialActive = user?.trial_active === true;
// Expired trial: no plan, trial ended
const isTrialExpired = !user?.plan && !user?.trial_active && user?.trial_days_left === 0;
// Days left for countdown
const daysLeft = user?.trial_days_left ?? 0;

// Banner visibility: only trial users (no plan)
const showBanner = isAuthenticated && !user?.plan && (isTrialActive || isTrialExpired);
```

### Pattern 3: Plan Selection with Confirmation
**What:** POST /api/plan with optimistic UI update via refreshUser
**When to use:** PricingPage plan selection flow
**Example:**
```jsx
// Plan selection flow
const handleSelectPlan = async (planSlug) => {
  await apiClient.post('/api/plan', { plan: planSlug });
  await refreshUser(); // Re-fetch user to get updated plan data
};
```

### Anti-Patterns to Avoid
- **Shared credit state between sidebar and pages:** D-12 explicitly says no shared state. Sidebar fetches independently; pages fetch their own.
- **Hardcoding plan data:** Always fetch from GET /api/plans; the backend controls plan features and pricing.
- **Timezone string manipulation:** Never parse timezone offsets manually. Always use Intl.DateTimeFormat with IANA timezone string.
- **Dismissing expired banner:** D-09 says expired banner is NOT dismissible. Only active trial banners (>0 days left) can be dismissed.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Timezone conversion | Manual UTC offset math | `Intl.DateTimeFormat` with `timeZone` option | Handles DST, edge cases, locale formatting natively |
| Date formatting | Custom format strings | `Intl.DateTimeFormat` with 'en-US' locale | Consistent, handles all date edge cases |
| Price formatting | String concatenation | `(plan.price_cents / 100).toFixed(0)` or `Intl.NumberFormat` | Handles currency display correctly |
| Modal backdrop/focus trap | Custom div with z-index | Portal + backdrop click + escape key handler | Accessibility, scroll lock, z-index management |

**Key insight:** This phase is entirely UI composition using existing backend APIs and native browser APIs. Zero new dependencies are needed.

## Common Pitfalls

### Pitfall 1: Trial State Edge Cases
**What goes wrong:** Incorrect banner display when user has a plan but trial_ends_at is still in the future (e.g., user selected a plan during trial)
**Why it happens:** Backend sets trial_active based on BOTH trial_ends_at being future AND plan_id being null. But frontend might check these independently.
**How to avoid:** Use the computed `trial_active` boolean from UserResource, NOT raw trial_ends_at comparison. The backend already handles the compound logic.
**Warning signs:** Banner shows for users who selected a plan during their trial period.

### Pitfall 2: Enterprise Plan Selection
**What goes wrong:** Attempting to POST /api/plan with slug 'enterprise' fails with 422 validation error
**Why it happens:** Backend validates plan slug with `in:free,basic,pro` -- enterprise is excluded
**How to avoid:** Enterprise card must show "Contact Us" CTA (mailto link or similar), never a selection button. Check `slug === 'enterprise'` before rendering the action.
**Warning signs:** 422 errors in console when clicking Enterprise card.

### Pitfall 3: Null Plan Object
**What goes wrong:** `user.plan.name` throws when user has no plan (trial or expired-trial user)
**Why it happens:** UserResource returns `plan` conditionally -- it's `undefined` when plan_id is null
**How to avoid:** Always use optional chaining: `user?.plan?.name`. For display purposes, show "Trial" or "Free" based on trial_active status when plan is null.
**Warning signs:** TypeError: Cannot read properties of undefined (reading 'name').

### Pitfall 4: CreditBadge Plan Name When Not Authenticated
**What goes wrong:** CreditBadge crashes when user is not authenticated and plan data is unavailable
**Why it happens:** Sidebar renders for all users (authenticated and not), but plan data only exists for authenticated users
**How to avoid:** CreditBadge should only render when isAuthenticated is true. Guard with conditional rendering in Sidebar.
**Warning signs:** Blank or error in sidebar footer for guest users.

### Pitfall 5: Stale User Data After Plan Change
**What goes wrong:** After selecting a plan, the pricing page still shows old plan as current
**Why it happens:** POST /api/plan succeeds but AuthContext user state is not refreshed
**How to avoid:** Call `refreshUser()` from useAuth() after successful plan selection. The modal should close and page should reflect the new plan.
**Warning signs:** "Current Plan" badge stays on old plan after switching.

### Pitfall 6: Dismiss State Lost on Navigation
**What goes wrong:** User dismisses trial banner, navigates to another page, banner reappears
**Why it happens:** useState resets when AppLayout re-renders (it doesn't -- AppLayout is stable, but worth considering)
**How to avoid:** Use sessionStorage for dismiss state so it persists across the session but resets on new browser session. Key: `trial-banner-dismissed`.
**Warning signs:** Banner keeps reappearing after dismissal.

## Code Examples

### Backend API Contracts (Already Built)

#### GET /api/plans (Public)
```json
[
  {
    "id": 1,
    "slug": "free",
    "name": "Free",
    "daily_credit_limit": 3,
    "price_cents": 0,
    "features": ["Basic IOC lookups", "3 searches per day"],
    "description": "...",
    "is_popular": false
  },
  {
    "id": 2,
    "slug": "basic",
    "name": "Basic",
    "daily_credit_limit": 15,
    "price_cents": 900,
    "features": ["All IOC types", "15 searches per day", "Search history"],
    "description": "...",
    "is_popular": false
  },
  {
    "id": 3,
    "slug": "pro",
    "name": "Pro",
    "daily_credit_limit": 50,
    "price_cents": 2900,
    "features": ["All IOC types", "50 searches per day", "Search history", "Dark web monitoring", "Priority support"],
    "description": "...",
    "is_popular": true
  },
  {
    "id": 4,
    "slug": "enterprise",
    "name": "Enterprise",
    "daily_credit_limit": 200,
    "price_cents": 0,
    "features": ["Unlimited IOC types", "200 searches per day", "Full API access", "Dedicated support", "Custom integrations"],
    "description": "...",
    "is_popular": false
  }
]
```

#### POST /api/plan (Authenticated)
```json
// Request
{ "plan": "pro" }

// Response (upgrade)
{ "message": "Plan upgraded", "plan": { "id": 3, "slug": "pro", "name": "Pro", "daily_credit_limit": 50 } }

// Response (downgrade)
{ "message": "Downgrade scheduled", "pending_plan": { "id": 1, "slug": "free", "name": "Free" }, "plan_change_at": "2026-04-23T..." }
```

#### GET /api/credits (Authenticated or Guest)
```json
{ "remaining": 42, "limit": 50, "resets_at": "2026-03-25T00:00:00+00:00", "is_guest": false }
```

#### UserResource Shape (from AuthContext user)
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "timezone": "America/New_York",
  "plan": { "id": 3, "slug": "pro", "name": "Pro", "daily_credit_limit": 50, "features": [...] },
  "trial_active": false,
  "trial_days_left": 0,
  "pending_plan": null,
  "plan_change_at": null
}
```

### Existing CreditBadge (extend, don't rewrite)
```jsx
// Current: <CreditBadge remaining={42} limit={50} />
// New:     <CreditBadge remaining={42} limit={50} planName="Pro" compact={false} />
```

### NAV_ITEMS Addition
```jsx
// Add to NAV_ITEMS array in mock-data.js (after Threat News, before the closing bracket)
{ label: 'Pricing', icon: 'pricing', href: '/pricing', public: true },
```

### Pricing Card Price Display
```jsx
// price_cents is integer cents from backend
const displayPrice = plan.price_cents === 0
  ? 'Free'
  : `$${plan.price_cents / 100}/mo`;
```

### Sidebar CreditBadge Integration Point
```jsx
// In Sidebar.jsx, add between </nav> and the collapse toggle div
// The collapse toggle is at line 188: <div className="p-3 border-t border-border/50 max-lg:hidden">
// CreditBadge goes ABOVE that, inside a new div with border-t
{isAuthenticated && (
  <div className="px-3 py-2 border-t border-border/50">
    <CreditBadge remaining={credits.remaining} limit={credits.limit} planName={user?.plan?.name} compact={collapsed && !hovered} />
  </div>
)}
```

### Plan-Aware Exhaustion Messages
```jsx
// Determine next tier suggestion based on current plan
const getExhaustionMessage = (planSlug, limit) => {
  switch (planSlug) {
    case 'free': return `Daily limit reached (0/${limit}). Upgrade to Basic for 15/day`;
    case 'basic': return `Daily limit reached (0/${limit}). Upgrade to Pro for 50/day`;
    case 'pro': return `Daily limit reached (0/${limit}). Resets tomorrow at midnight`;
    case 'enterprise': return `Daily limit reached (0/${limit}). Resets tomorrow at midnight`;
    default: return `Daily limit reached (0/${limit}). View plans for more searches`;
  }
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded "10 searches" in exhaustion text | Plan-aware dynamic limits from user.plan | Phase 23 backend | Exhaustion messages must read from plan data, not hardcode |
| No timezone awareness | Intl.DateTimeFormat with IANA timezone | Native since ES2015 | All browsers support it; no polyfill needed |
| Inline formatDate per file | Shared useFormatDate hook | This phase | Single source of truth for date formatting |

**Deprecated/outdated:**
- The 5 duplicated `formatDate()` functions across pages will be removed and replaced by the shared hook
- The hardcoded "Daily limit reached. Your 10 searches refuel at midnight UTC" message in ThreatSearchPage needs replacement with plan-aware version

## Open Questions

1. **Enterprise "Contact Us" destination**
   - What we know: Enterprise shows "Contact Us" CTA instead of selection
   - What's unclear: Should it be a mailto link, a form, or just link to an external page?
   - Recommendation: Use `mailto:sales@aquasecure.ai` as simplest implementation; can be changed later

2. **Plan prices (dollar values)**
   - What we know: price_cents exists in DB but actual values are TBD (noted in STATE.md blockers)
   - What's unclear: Final pricing amounts
   - Recommendation: Use whatever the seeder has; prices display from API response, not hardcoded

3. **Trial user with no plan -- what plan name to show in CreditBadge?**
   - What we know: Trial users have plan=null, trial_active=true
   - What's unclear: Display label
   - Recommendation: Show "Trial" when trial_active=true, "Free" when expired trial (no plan, not trial)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None (no tests exist per CLAUDE.md) |
| Config file | none -- see Wave 0 |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PRICE-01 | Pricing page renders 4 plan cards | manual-only | Visual inspection in browser | N/A |
| PRICE-02 | Each card shows name, limit, features, button | manual-only | Visual inspection | N/A |
| PRICE-03 | Pro card has "Most Popular" highlight | manual-only | Visual inspection | N/A |
| PRICE-04 | Enterprise shows "Contact Us" | manual-only | Visual inspection | N/A |
| PRICE-05 | Current plan indicated | manual-only | Login, check pricing page | N/A |
| PRICE-06 | CreditBadge shows plan name | manual-only | Login, check sidebar | N/A |
| PRICE-07 | Plan-aware exhaustion message | manual-only | Exhaust credits, check message | N/A |
| PRICE-08 | Pricing page in sidebar nav | manual-only | Visual inspection | N/A |
| TRIAL-05 | Trial countdown banner | manual-only | Login as trial user | N/A |
| TRIAL-06 | Expired trial upgrade banner | manual-only | Login as expired trial user | N/A |
| TZ-01 | Timestamps in user timezone | manual-only | Login with non-UTC timezone, check dates | N/A |
| TZ-03 | Unauthenticated users see UTC | manual-only | View as guest | N/A |

**Justification for manual-only:** Project has no test infrastructure (CLAUDE.md: "No tests exist"). All requirements are UI/visual. Setting up a test framework is out of scope for this phase.

### Sampling Rate
- **Per task commit:** Visual inspection in dev server
- **Per wave merge:** Full manual walkthrough of pricing, trial banner, credits, and dates
- **Phase gate:** All 12 requirements verified via manual browser testing

### Wave 0 Gaps
None -- manual testing only; no test infrastructure to set up for this phase.

## Sources

### Primary (HIGH confidence)
- `backend/app/Http/Resources/UserResource.php` -- verified user shape with plan, trial_active, trial_days_left, pending_plan, plan_change_at, timezone
- `backend/app/Http/Controllers/Plan/PlanIndexController.php` -- verified GET /api/plans returns id, slug, name, daily_credit_limit, price_cents, features, description, is_popular
- `backend/app/Http/Controllers/Plan/PlanSelectionController.php` -- verified POST /api/plan validates in:free,basic,pro (enterprise excluded)
- `backend/app/Http/Controllers/Credit/CreditStatusController.php` -- verified GET /api/credits returns remaining, limit, resets_at, is_guest
- `frontend/src/contexts/AuthContext.jsx` -- verified timezone: user?.timezone ?? 'UTC', refreshUser function available
- `frontend/src/components/shared/CreditBadge.jsx` -- verified current implementation (remaining/limit only)
- `frontend/src/components/layout/Sidebar.jsx` -- verified footer collapse toggle placement for CreditBadge insertion
- `frontend/src/components/layout/AppLayout.jsx` -- verified Topbar + main structure for banner insertion
- `frontend/src/App.jsx` -- verified route structure and lazy-loading pattern
- Native Intl.DateTimeFormat -- verified working with IANA timezone strings in Node.js (same V8 engine)

### Secondary (MEDIUM confidence)
- `frontend/src/data/mock-data.js` NAV_ITEMS array -- verified structure and icon reference pattern
- 5 duplicated formatDate locations -- verified via grep across ThreatSearchPage, ThreatActorsPage, ThreatNewsPage, DashboardPage, BreachCard

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies, all existing
- Architecture: HIGH - all integration points verified in actual source code
- Pitfalls: HIGH - derived from reading actual backend validation rules and frontend patterns
- API contracts: HIGH - read directly from PHP controller source code

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (stable -- no dependency changes expected)
