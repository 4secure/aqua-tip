# Phase 28: Sidebar & Topbar Polish - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Declutter sidebar and topbar: remove Pricing nav item and notification bell, replace hardcoded PRO badge with real plan chip, add Upgrade button linking to /pricing. Pure frontend changes — no backend modifications.

</domain>

<decisions>
## Implementation Decisions

### Sidebar Cleanup
- **D-01:** Remove the entire "Account" category from `NAV_CATEGORIES` in mock-data.js (it only contains Pricing, which is being removed)
- **D-02:** No empty-category-hiding logic needed — just delete the data entry

### Plan Chip
- **D-03:** Replace the hardcoded "PRO" badge in Topbar with a real plan chip showing the user's actual plan name
- **D-04:** Single violet style for all tiers — `bg-violet/10` background with violet text, swap the label (Free, Basic, Pro, Enterprise, Trial)
- **D-05:** Plan name sourced from `user.plan.name` (or "Trial" if `user.trial_active`, or "Free" as fallback) — same logic as CreditBadge in Sidebar

### Notification Bell Removal
- **D-06:** Remove the notification bell button from Topbar
- **D-07:** Full dead code cleanup: remove `onNotifClick` prop from Topbar and its parent (AppLayout), remove `NotificationDrawer` component file, remove `NOTIFICATIONS` export from mock-data.js
- **D-08:** Remove the `NOTIFICATIONS` import in Topbar.jsx and `unreadCount` derived state

### Upgrade Button
- **D-09:** Use existing `GradientButton` component at `size="sm"` — violet-to-cyan gradient, consistent with Sign Up button
- **D-10:** Button links to `/pricing` via React Router `Link`
- **D-11:** Hide Upgrade button for Enterprise users only — show for Free, Basic, Pro, and Trial users
- **D-12:** Plan chip and Upgrade button only visible to authenticated users (requirement TOP-04)

### Claude's Discretion
- Exact spacing/gap between plan chip and Upgrade button in the topbar
- Whether to wrap plan chip + Upgrade button in a flex container or keep them as siblings in the existing flex layout
- Cleanup of any unused imports after removing notification-related code

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §Sidebar — SIDE-01
- `.planning/REQUIREMENTS.md` §Topbar — TOP-01 through TOP-04

### Key Source Files
- `frontend/src/components/layout/Topbar.jsx` — main file to modify (PRO badge lines 74-78, notification bell lines 80-91)
- `frontend/src/components/layout/Sidebar.jsx` — no changes needed (Pricing is in NAV_CATEGORIES, not hardcoded here)
- `frontend/src/data/mock-data.js` lines 144-172 — NAV_CATEGORIES with "Account" category to remove
- `frontend/src/data/mock-data.js` — NOTIFICATIONS export to remove
- `frontend/src/components/layout/AppLayout.jsx` — passes onNotifClick prop to Topbar, will need cleanup
- `frontend/src/components/layout/NotificationDrawer.jsx` — component file to delete
- `frontend/src/components/ui/GradientButton.jsx` — existing component to reuse for Upgrade button
- `frontend/src/components/shared/CreditBadge.jsx` — reference for plan name resolution logic
- `frontend/src/contexts/AuthContext.jsx` — provides user object with plan data

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `GradientButton` component (size="sm" variant) — reuse for Upgrade button
- `CreditBadge` plan name logic (`user?.plan?.name ?? (user?.trial_active ? 'Trial' : 'Free')`) — reuse same pattern for topbar plan chip
- `useAuth` hook — already imported in Topbar, provides user object with plan data

### Established Patterns
- Topbar right-side actions use `flex items-center gap-3` layout
- Badge styling uses small pill-shaped elements (see existing PRO badge `.premium-badge` class)
- Navigation data is centralized in `NAV_CATEGORIES` in mock-data.js — sidebar renders from this data, not hardcoded
- Auth-conditional rendering uses `{isAuthenticated ? (...) : (...)}` pattern in Topbar

### Integration Points
- `AppLayout.jsx` — orchestrates Sidebar + Topbar + NotificationDrawer, passes props between them
- `mock-data.js` — centralized nav and notification data, sidebar reads NAV_CATEGORIES
- `Topbar.jsx` — receives `onNotifClick` prop from AppLayout, this prop chain needs cleanup

</code_context>

<specifics>
## Specific Ideas

No specific requirements — standard UI declutter and plan visibility addition.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 28-sidebar-topbar-polish*
*Context gathered: 2026-03-25*
