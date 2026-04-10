# Phase 42: Auth Loading & Data States - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-11
**Phase:** 42-auth-loading-data-states
**Areas discussed:** Loading screen design, Loading gate scope, Error-to-loading replacement

---

## Loading Screen Design

### Q1: What should the branded loading screen look like?

| Option | Description | Selected |
|--------|-------------|----------|
| Logo + pulse ring | Centered logo.png on dark bg-primary with subtle violet pulse/glow ring. Clean, on-brand, minimal. | ✓ |
| Logo + spinning ring | Centered logo.png with violet/cyan gradient spinning ring. More dynamic. | |
| Logo + text shimmer | Centered logo.png with 'AQUA TIP' text below, shimmer animation. Premium feel. | |

**User's choice:** Logo + pulse ring
**Notes:** None

### Q2: Should the loading screen have a fade-out transition when auth resolves, or instant swap?

| Option | Description | Selected |
|--------|-------------|----------|
| Fade out | Smooth 300-400ms opacity fade when auth resolves. Polished, prevents jarring pop-in. | ✓ |
| Instant swap | Loading screen disappears immediately. Snappier but abrupt. | |
| You decide | Claude picks based on existing animation patterns. | |

**User's choice:** Fade out
**Notes:** None

### Q3: Should the loading screen be a reusable component or built directly into AuthProvider?

| Option | Description | Selected |
|--------|-------------|----------|
| Reusable component | Standalone LoadingScreen in components/ui/. Reused by ProtectedRoute, GuestRoute, AppLayout. | ✓ |
| Inline in AuthProvider | AuthProvider renders loading screen directly when loading=true. Simpler but less flexible. | |
| You decide | Claude picks based on existing auth guard structure. | |

**User's choice:** Reusable component
**Notes:** None

---

## Loading Gate Scope

### Q4: Where should the global loading gate block rendering until auth resolves?

| Option | Description | Selected |
|--------|-------------|----------|
| AppLayout + auth routes | Gate on AppLayout plus ProtectedRoute and GuestRoute. Landing and public pages render immediately. | ✓ |
| Everything except landing | Gate wraps entire app below AuthProvider. Only landing renders immediately. | |
| Only ProtectedRoute | Minimal approach. AppLayout still renders during auth check (may still FOUC). | |

**User's choice:** AppLayout + auth routes
**Notes:** None

### Q5: Should the Sidebar FOUC fix be in Sidebar itself or handled by AppLayout's gate?

| Option | Description | Selected |
|--------|-------------|----------|
| AppLayout gate handles it | AppLayout shows branded loading instead of rendering Sidebar/Topbar while loading. Clean separation. | ✓ |
| Sidebar checks loading too | Sidebar also checks auth loading with skeleton. Belt-and-suspenders, duplicates gate logic. | |

**User's choice:** AppLayout gate handles it
**Notes:** None

---

## Error-to-Loading Replacement

### Q6: Should ThreatMapStatus 'Connection lost' become a loading indicator or stay as error?

| Option | Description | Selected |
|--------|-------------|----------|
| Replace with loading indicator | Show 'Fetching data...' with spinner. SSE auto-reconnects anyway. | ✓ |
| Keep as reconnecting message | Restyle to be less alarming (subtle pulsing dot). | |
| You decide | Claude picks based on SSE reconnection behavior. | |

**User's choice:** Replace with loading indicator
**Notes:** None

### Q7: What should page-level data fetching loading indicators look like?

| Option | Description | Selected |
|--------|-------------|----------|
| Skeleton placeholders | Animated skeleton/shimmer blocks matching content shapes. Professional feel. New pattern. | ✓ |
| Inline spinners with text | 'Fetching data...' text with small spinner. Simpler, matches requirement wording. | |
| You decide | Claude picks best pattern based on existing styles. | |

**User's choice:** Skeleton placeholders
**Notes:** None

### Q8: Should skeleton loading apply to ALL data-fetching pages or just error-message pages?

| Option | Description | Selected |
|--------|-------------|----------|
| All data-fetching pages | Consistent experience across all pages that fetch data. | ✓ |
| Only error-message pages | Targeted fix: only replace Connection lost and Failed to load. | |
| You decide | Claude determines scope from requirement. | |

**User's choice:** All data-fetching pages
**Notes:** None

---

## Claude's Discretion

- Skeleton component architecture (generic vs per-page)
- Pulse ring animation CSS details
- Fade-out implementation approach (CSS vs Framer Motion)

## Deferred Ideas

None — discussion stayed within phase scope
