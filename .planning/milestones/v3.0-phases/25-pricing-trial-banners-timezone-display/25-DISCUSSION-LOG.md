# Phase 25: Pricing, Trial Banners & Timezone Display - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-24
**Phase:** 25-pricing-trial-banners-timezone-display
**Areas discussed:** Pricing page layout, Trial banners placement, Credit badge & exhaustion, Timezone formatting

---

## Pricing Page Layout

### Card arrangement

| Option | Description | Selected |
|--------|-------------|----------|
| Horizontal row | 4 cards side-by-side on desktop, stacking on mobile. Standard SaaS pattern. | ✓ |
| 2x2 grid | Two rows of two cards. More compact. | |
| You decide | Claude picks. | |

**User's choice:** Horizontal row
**Notes:** None

### Pro plan highlight

| Option | Description | Selected |
|--------|-------------|----------|
| Violet glow border | Violet border glow + "Most Popular" badge at top. Matches violet accent system. | ✓ |
| Scaled up card | Slightly larger (scale-105) with gradient background. | |
| Cyan accent instead | Use cyan for differentiation from violet nav. | |

**User's choice:** Violet glow border
**Notes:** None

### Current plan indicator

| Option | Description | Selected |
|--------|-------------|----------|
| "Current Plan" badge + disabled button | Button changes to muted "Current Plan", non-clickable. | ✓ |
| Checkmark overlay | Green checkmark in corner, disabled button. | |
| You decide | Claude picks. | |

**User's choice:** "Current Plan" badge + disabled button
**Notes:** None

### Plan selection UX

| Option | Description | Selected |
|--------|-------------|----------|
| Click + confirmation modal | Modal shows before/after comparison with Confirm/Cancel. | ✓ |
| Immediate with toast | API fires immediately, success toast. | |
| You decide | Claude picks. | |

**User's choice:** Click + confirmation modal
**Notes:** None

---

## Trial Banners Placement

### Banner location

| Option | Description | Selected |
|--------|-------------|----------|
| Below topbar, full-width | Persistent strip between topbar and page content. Dismissible per session. | ✓ |
| Inside sidebar bottom | Small card at sidebar bottom. | |
| Dashboard-only card | Widget on dashboard page only. | |

**User's choice:** Below topbar, full-width
**Notes:** None

### Urgency escalation

| Option | Description | Selected |
|--------|-------------|----------|
| Color shift by phase | 30-7d: subtle amber. 7-1d: brighter amber. Expired: red, non-dismissible. | ✓ |
| Same style throughout | Consistent amber, only red when expired. | |
| You decide | Claude picks. | |

**User's choice:** Color shift by phase
**Notes:** None

### Banner audience

| Option | Description | Selected |
|--------|-------------|----------|
| Trial users only | No plan AND trial active/expired. Users with plans never see it. | ✓ |
| Free plan too | Also show subtle upgrade banner to Free plan users. | |
| You decide | Claude picks. | |

**User's choice:** Trial users only
**Notes:** None

---

## Credit Badge & Exhaustion

### Badge location

| Option | Description | Selected |
|--------|-------------|----------|
| Sidebar bottom | Always visible in sidebar footer. "Pro: 42/50" expanded, chip collapsed. | ✓ |
| Topbar right side | Next to user avatar/notifications. | |
| Keep inline only | Only on credit-consuming pages. | |

**User's choice:** Sidebar bottom
**Notes:** None

### Exhaustion message

| Option | Description | Selected |
|--------|-------------|----------|
| Plan-aware upgrade nudge | Varies by plan: Free→Basic, Basic→Pro, Pro→"resets tomorrow". | ✓ |
| Generic message | Same for all: "Daily limit reached. Resets at midnight." | |
| You decide | Claude picks. | |

**User's choice:** Plan-aware upgrade nudge
**Notes:** None

### Credit state management

| Option | Description | Selected |
|--------|-------------|----------|
| Sidebar fetches on mount | Independent fetch. Pages still fetch their own. No shared state. | ✓ |
| Shared credit context | CreditContext provider consumed by sidebar and pages. | |
| You decide | Claude picks. | |

**User's choice:** Sidebar fetches on mount
**Notes:** None

---

## Timezone Formatting

### Date format style

| Option | Description | Selected |
|--------|-------------|----------|
| Absolute dates with user TZ | Same style as existing but TZ-aware via Intl.DateTimeFormat. No new deps. | ✓ |
| Relative dates ("2h ago") | Casual timestamps, fallback to absolute > 7 days. | |
| You decide | Claude picks. | |

**User's choice:** Absolute dates with user TZ
**Notes:** None

### Utility shape

| Option | Description | Selected |
|--------|-------------|----------|
| Hook: useFormatDate | Custom hook reads TZ from useAuth(), returns formatDate function. | ✓ |
| Plain utility with TZ param | Function takes timezone as argument. More boilerplate. | |
| You decide | Claude picks. | |

**User's choice:** Hook: useFormatDate
**Notes:** None

### Pages to update

| Option | Description | Selected |
|--------|-------------|----------|
| All 5 pages + Dashboard | Replace formatDate in all 5 locations. Complete TZ-01 coverage. | ✓ |
| Search + Actors + News only | Only 3 main data pages. Less scope. | |
| You decide | Claude decides. | |

**User's choice:** All 5 pages + Dashboard
**Notes:** None

---

## Claude's Discretion

- Exact spacing/padding in pricing cards
- Confirmation modal animation
- Banner dismiss state management
- CreditBadge collapsed layout
- useFormatDate internal memoization
- Pricing page header copy

## Deferred Ideas

None — discussion stayed within phase scope
