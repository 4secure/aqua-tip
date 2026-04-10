# Phase 42: Auth Loading & Data States - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Eliminate auth FOUC (flash of unauthenticated content) with a global branded loading gate, and replace all misleading error messages with proper skeleton/loading indicators across all data-fetching pages.

</domain>

<decisions>
## Implementation Decisions

### Loading Screen Design
- **D-01:** Branded loading screen: centered logo.png on bg-primary (#0A0B10) with a subtle violet pulse/glow ring around the logo
- **D-02:** Smooth 300-400ms opacity fade-out transition when auth resolves (no instant swap)
- **D-03:** Loading screen is a reusable `LoadingScreen` component in `components/ui/` — used by ProtectedRoute, GuestRoute, and AppLayout

### Loading Gate Scope
- **D-04:** Loading gate applies to AppLayout (blocks sidebar, topbar, and page content) plus ProtectedRoute and GuestRoute
- **D-05:** Landing page and public standalone pages (pricing, EULA, privacy, contact) render immediately without waiting for auth
- **D-06:** Sidebar FOUC fix handled by AppLayout gate — AppLayout shows branded loading screen instead of rendering Sidebar/Topbar while auth is loading. No separate loading check needed in Sidebar.

### Error-to-Loading Replacement
- **D-07:** ThreatMapStatus "Connection lost — reconnecting..." replaced with "Fetching data..." spinner/loading indicator. SSE auto-reconnects, so the error framing is misleading.
- **D-08:** All data-fetching pages get skeleton placeholder loading states — animated shimmer blocks matching content shapes (cards, tables, stat rows)
- **D-09:** Skeleton loading applies to: ThreatMapPage (dashboard widgets, SSE status), ThreatActorsPage, ThreatNewsPage, ThreatSearchPage (history), SettingsPage, DarkWebPage
- **D-10:** "Failed to load" messages in RightOverlayPanel replaced with skeleton loading indicators

### Claude's Discretion
- Skeleton component implementation approach (single generic Skeleton component vs per-page skeletons)
- Exact pulse ring animation CSS (keyframes, timing, glow radius)
- Whether to create a shared skeleton utility or inline per component
- Fade-out implementation (CSS transition vs Framer Motion AnimatePresence)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Auth System
- `frontend/src/contexts/AuthContext.jsx` — Auth provider with `loading` state that gates the entire flow
- `frontend/src/components/auth/ProtectedRoute.jsx` — Current auth guard with plain spinner (to be replaced)
- `frontend/src/components/auth/GuestRoute.jsx` — Current guest guard with plain spinner (to be replaced)

### Layout
- `frontend/src/components/layout/AppLayout.jsx` — Layout wrapper that needs loading gate added
- `frontend/src/components/layout/Sidebar.jsx` — Reads isAuthenticated without loading check (fixed by AppLayout gate)
- `frontend/src/components/layout/Topbar.jsx` — Also renders auth-dependent UI

### Error States to Replace
- `frontend/src/components/threat-map/ThreatMapStatus.jsx` — "Connection lost" message to replace
- `frontend/src/components/threat-map/RightOverlayPanel.jsx` — "Failed to load indicators" and error states
- `frontend/src/pages/ThreatMapPage.jsx` — Dashboard widget loading states
- `frontend/src/pages/ThreatActorsPage.jsx` — Page-level data loading
- `frontend/src/pages/ThreatNewsPage.jsx` — Page-level data loading
- `frontend/src/pages/ThreatSearchPage.jsx` — Search history loading
- `frontend/src/pages/SettingsPage.jsx` — Profile data loading
- `frontend/src/pages/DarkWebPage.jsx` — Search/status loading

### Existing Assets
- `frontend/public/logo.png` — Logo for branded loading screen
- `frontend/src/App.jsx` — Router structure, LazyFallback component (similar pattern)

### Requirements
- `.planning/REQUIREMENTS.md` — AUTH-01, AUTH-02

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `LazyFallback` in App.jsx — existing plain spinner pattern, can be replaced with new LoadingScreen
- `AuthContext` already exposes `loading` boolean — no backend changes needed
- Framer Motion already in the project — available for fade-out transitions

### Established Patterns
- Independent widget loading states (Phase v2.2) — each widget loads independently, skeleton approach aligns
- Glassmorphism styling: `bg-surface/60 border border-border backdrop-blur-sm`
- Existing spinner: `w-8 h-8 border-2 border-violet border-t-transparent rounded-full animate-spin`

### Integration Points
- AppLayout needs to check `useAuth().loading` before rendering children
- ProtectedRoute and GuestRoute both need their inline spinners replaced with LoadingScreen
- LazyFallback in App.jsx could also use the new LoadingScreen for consistency
- Each data-fetching page needs skeleton states added to their loading branches

</code_context>

<specifics>
## Specific Ideas

- The loading screen should feel premium — logo + violet pulse, not just a spinner
- The fade-out creates a smooth handoff from loading to content
- Skeletons should match the shape of actual content (card skeletons for card layouts, table row skeletons for tables)
- "Connection lost" messaging should never appear — it's a backend loading state, not a user-facing error

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 42-auth-loading-data-states*
*Context gathered: 2026-04-11*
