# Phase 42: Auth Loading & Data States - Research

**Researched:** 2026-04-11
**Domain:** React loading states, auth FOUC prevention, skeleton UI
**Confidence:** HIGH

## Summary

Phase 42 eliminates two UX problems: (1) flash of unauthenticated content (FOUC) during page load, and (2) misleading "Connection lost" error messages that appear during normal data fetching. The solution is a branded loading gate in AppLayout/ProtectedRoute/GuestRoute, plus skeleton loading states across all data-fetching pages.

The codebase already has all required infrastructure. AuthContext exposes a `loading` boolean. Framer Motion is installed for fade transitions. A `.skeleton` shimmer CSS class exists in `animations.css`. The existing `SkeletonCard` component in `components/shared/` provides a reusable pattern. No new dependencies are needed.

**Primary recommendation:** Create a single `LoadingScreen` component (logo + violet pulse ring), gate it in AppLayout/ProtectedRoute/GuestRoute behind `useAuth().loading`, and replace all "Connection lost" / "Failed to load" messages with shimmer skeletons matching content shapes.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Branded loading screen: centered logo.png on bg-primary (#0A0B10) with a subtle violet pulse/glow ring around the logo
- **D-02:** Smooth 300-400ms opacity fade-out transition when auth resolves (no instant swap)
- **D-03:** Loading screen is a reusable `LoadingScreen` component in `components/ui/` -- used by ProtectedRoute, GuestRoute, and AppLayout
- **D-04:** Loading gate applies to AppLayout (blocks sidebar, topbar, and page content) plus ProtectedRoute and GuestRoute
- **D-05:** Landing page and public standalone pages (pricing, EULA, privacy, contact) render immediately without waiting for auth
- **D-06:** Sidebar FOUC fix handled by AppLayout gate -- AppLayout shows branded loading screen instead of rendering Sidebar/Topbar while auth is loading. No separate loading check needed in Sidebar.
- **D-07:** ThreatMapStatus "Connection lost -- reconnecting..." replaced with "Fetching data..." spinner/loading indicator. SSE auto-reconnects, so the error framing is misleading.
- **D-08:** All data-fetching pages get skeleton placeholder loading states -- animated shimmer blocks matching content shapes (cards, tables, stat rows)
- **D-09:** Skeleton loading applies to: ThreatMapPage (dashboard widgets, SSE status), ThreatActorsPage, ThreatNewsPage, ThreatSearchPage (history), SettingsPage, DarkWebPage
- **D-10:** "Failed to load" messages in RightOverlayPanel replaced with skeleton loading indicators

### Claude's Discretion
- Skeleton component implementation approach (single generic Skeleton component vs per-page skeletons)
- Exact pulse ring animation CSS (keyframes, timing, glow radius)
- Whether to create a shared skeleton utility or inline per component
- Fade-out implementation (CSS transition vs Framer Motion AnimatePresence)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | Global loading screen displays until auth state resolves -- no flash of login buttons or locked sidebar | LoadingScreen component gates AppLayout, ProtectedRoute, GuestRoute behind `useAuth().loading`. Fade-out transition per D-02. |
| AUTH-02 | "Connection lost" errors replaced with "Fetching data..." loading indicators across all pages | ThreatMapStatus rewritten, RightOverlayPanel error states replaced with skeletons, all 6 data-fetching pages get skeleton loading states |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **No TypeScript** -- all files are `.jsx`/`.js`
- **No tests exist** -- no test infrastructure to worry about
- **No linter/formatter** -- no pre-commit hooks
- **React 19 + Vite 7** -- standard JSX, ESM imports
- **Framer Motion** already available for animations
- **Tailwind CSS 3** with custom dark theme tokens
- **CSS split across 4 files** in `styles/` -- animations go in `animations.css`
- **Immutable patterns** per global coding rules (new objects, never mutate)
- **Files under 800 lines**, functions under 50 lines

## Standard Stack

No new dependencies required. Everything needed is already in the project.

### Core (Already Installed)
| Library | Purpose | Relevance |
|---------|---------|-----------|
| React 19 | Component framework | `useState`, `useContext` for loading state |
| Framer Motion | Animations | `AnimatePresence` + `motion.div` for fade-out transition |
| Tailwind CSS 3 | Styling | `animate-pulse`, custom keyframes for skeleton shimmer |

### Supporting (Already Available)
| Asset | Location | Relevance |
|-------|----------|-----------|
| AuthContext | `contexts/AuthContext.jsx` | Exposes `loading` boolean -- the gate signal |
| SkeletonCard | `components/shared/SkeletonCard.jsx` | Existing skeleton pattern for card grids |
| `.skeleton` CSS class | `styles/animations.css` | Shimmer animation already defined |
| `logo.png` | `public/logo.png` | Branded loading screen logo |

## Architecture Patterns

### Recommended File Structure
```
frontend/src/
  components/
    ui/
      LoadingScreen.jsx     # NEW: Branded loading gate (logo + pulse ring)
      Skeleton.jsx          # NEW: Generic skeleton building blocks
    shared/
      SkeletonCard.jsx      # EXISTING: Keep as-is (used by ThreatActorsPage)
    auth/
      ProtectedRoute.jsx    # MODIFY: Replace spinner with LoadingScreen
      GuestRoute.jsx        # MODIFY: Replace spinner with LoadingScreen
    layout/
      AppLayout.jsx         # MODIFY: Add loading gate before Sidebar/Topbar
    threat-map/
      ThreatMapStatus.jsx   # MODIFY: "Fetching data..." instead of "Connection lost"
      RightOverlayPanel.jsx # MODIFY: Replace error text with skeleton loading
  styles/
    animations.css          # MODIFY: Add pulse-ring keyframes
```

### Pattern 1: Loading Gate (AUTH-01)
**What:** AppLayout checks `useAuth().loading` and renders `LoadingScreen` instead of Sidebar/Topbar/content while auth is resolving.
**When to use:** Every authenticated layout render.
**Example:**
```jsx
// AppLayout.jsx
import { useAuth } from '../../contexts/AuthContext';
import LoadingScreen from '../ui/LoadingScreen';

export default function AppLayout() {
  const { loading } = useAuth();
  const { collapsed, toggle } = useSidebarCollapse();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <ParticleBackground />
      <Sidebar ... />
      <Topbar ... />
      ...
    </>
  );
}
```

### Pattern 2: Branded Loading Screen (D-01, D-02)
**What:** Centered logo with violet pulse ring, fades out when auth resolves.
**Implementation recommendation:** Use Framer Motion `AnimatePresence` for the fade-out (D-02 specifies 300-400ms). This is preferred over CSS transitions because AnimatePresence handles mount/unmount animation cleanly, and the project already uses it extensively.

```jsx
// LoadingScreen.jsx
import { motion } from 'framer-motion';

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 bg-primary flex items-center justify-center">
      <div className="relative">
        <div className="loading-pulse-ring" />
        <img src="/logo.png" alt="Aqua TIP" className="w-16 h-16 relative z-10" />
      </div>
    </div>
  );
}
```

For the fade-out, the parent wraps LoadingScreen in AnimatePresence:
```jsx
// In ProtectedRoute/GuestRoute/AppLayout
<AnimatePresence>
  {loading && (
    <motion.div
      key="loading-screen"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      <LoadingScreen />
    </motion.div>
  )}
</AnimatePresence>
```

### Pattern 3: Generic Skeleton Component (D-08, Claude's Discretion)
**Recommendation:** Create a small `Skeleton` component with shape variants, PLUS keep the existing `SkeletonCard` as-is. The generic Skeleton handles individual shapes (lines, circles, rectangles), while SkeletonCard handles card-grid layouts.

```jsx
// Skeleton.jsx -- generic building block
export function Skeleton({ className = '', width, height }) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height }}
    />
  );
}

export function SkeletonLine({ width = '100%' }) {
  return <div className="skeleton skeleton-text" style={{ width }} />;
}

export function SkeletonRow({ columns = 3 }) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-border animate-pulse">
      {Array.from({ length: columns }, (_, i) => (
        <div key={i} className="h-4 bg-surface-2 rounded flex-1" />
      ))}
    </div>
  );
}
```

### Pattern 4: Pulse Ring CSS Animation (D-01, Claude's Discretion)
**Recommendation:** A subtle expanding ring that fades out, using the project's violet color. Similar to the existing `threatPulse` animation but tuned for the loading screen.

```css
/* animations.css */
@keyframes loadingPulseRing {
  0% {
    transform: scale(1);
    opacity: 0.4;
    box-shadow: 0 0 0 0 rgba(122, 68, 228, 0.4);
  }
  70% {
    transform: scale(1.5);
    opacity: 0;
    box-shadow: 0 0 20px 10px rgba(122, 68, 228, 0);
  }
  100% {
    transform: scale(1);
    opacity: 0;
  }
}

.loading-pulse-ring {
  position: absolute;
  inset: -12px;
  border-radius: 50%;
  border: 2px solid rgba(122, 68, 228, 0.3);
  animation: loadingPulseRing 2s ease-out infinite;
}
```

### Anti-Patterns to Avoid
- **Checking loading in Sidebar separately:** D-06 explicitly says AppLayout gate handles this. Do NOT add loading checks to Sidebar.jsx or Topbar.jsx.
- **Showing error messages during initial load:** D-07/D-08/D-10 say loading states should NEVER show error-framed messages while data is still being fetched for the first time.
- **Blocking landing page on auth:** D-05 says landing and public standalone pages render immediately. Do NOT add auth loading checks to these routes.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fade-out animation | Custom CSS opacity timer | Framer Motion `AnimatePresence` | Already used project-wide, handles mount/unmount lifecycle |
| Shimmer animation | Custom JS shimmer | Existing `.skeleton` CSS class in `animations.css` | Already defined, matches project's surface colors |
| Skeleton card | New skeleton card component | Existing `SkeletonCard` in `components/shared/` | Already works for ThreatActorsPage grid layout |
| Auth loading state | Custom loading state management | `useAuth().loading` from AuthContext | Already implemented and reliable |

## Common Pitfalls

### Pitfall 1: Double Loading Screens
**What goes wrong:** Both AppLayout AND ProtectedRoute show LoadingScreen, causing a flicker when one resolves before the other.
**Why it happens:** AppLayout and ProtectedRoute both check `loading` -- if AppLayout renders first, ProtectedRoute sees loading again briefly.
**How to avoid:** AppLayout gates BEFORE rendering `<Outlet />`, so ProtectedRoute never mounts while loading is true. The loading check in ProtectedRoute is a safety net for direct route access -- both should use the same LoadingScreen component but only one will actually render.
**Warning signs:** Visible flicker between two loading states.

### Pitfall 2: Flash Before Loading Screen
**What goes wrong:** A brief frame of the Sidebar/Topbar renders before the loading screen appears.
**Why it happens:** React renders the component tree synchronously on first paint, and if the loading check happens after other state initialization (e.g., `useSidebarCollapse()`), the layout might flash.
**How to avoid:** Put the loading check as the FIRST conditional in AppLayout, before any other hook-dependent rendering. Since hooks cannot be conditional, the loading early-return must come after all hooks but before the JSX.
**Warning signs:** Brief flicker of sidebar on page load.

### Pitfall 3: ThreatMapStatus Connection Lost on Auth-Protected SSE
**What goes wrong:** ThreatMapStatus shows "Connection lost" because SSE hasn't connected yet when the page first loads.
**Why it happens:** `useThreatStream()` initializes with `connected: false` before the SSE connection is established.
**How to avoid:** Change ThreatMapStatus to show "Fetching data..." with a loading spinner when not connected, instead of the error-framed "Connection lost" message.
**Warning signs:** Amber warning banner visible on every page load.

### Pitfall 4: Skeleton States Not Matching Content Shape
**What goes wrong:** Generic rectangular skeleton blocks don't match the actual content layout, causing layout shift when data loads.
**Why it happens:** Using the same skeleton for different content types (cards, tables, stat rows).
**How to avoid:** Each page's loading state should match its content shape -- card grids for ThreatActorsPage, table rows for ThreatNewsPage, stat rows for RightOverlayPanel. The existing inline skeletons in ThreatNewsPage and RightOverlayPanel already do this correctly.
**Warning signs:** Visible content jump when loading completes.

### Pitfall 5: AnimatePresence Without Key Prop
**What goes wrong:** Fade-out animation doesn't play because AnimatePresence can't track the element.
**Why it happens:** Missing `key` prop on the motion component inside AnimatePresence.
**How to avoid:** Always provide a stable `key` prop on the child of AnimatePresence.
**Warning signs:** Loading screen disappears instantly instead of fading.

## Code Examples

### Current Loading Spinner (to be replaced)
The same spinner pattern exists in 3 places:
```jsx
// ProtectedRoute.jsx, GuestRoute.jsx, LazyFallback in App.jsx
<div className="min-h-screen bg-primary flex items-center justify-center">
  <div className="w-8 h-8 border-2 border-violet border-t-transparent rounded-full animate-spin" />
</div>
```

### Current ThreatMapStatus (to be modified)
```jsx
// Shows amber "Connection lost" banner when SSE disconnected
export default function ThreatMapStatus({ connected }) {
  if (connected) return null;
  return (
    <div className="absolute top-2 left-1/2 ...">
      <div className="bg-amber/20 border border-amber text-amber ...">
        Connection lost &mdash; reconnecting...
      </div>
    </div>
  );
}
```

### Current RightOverlayPanel Error State (to be replaced)
```jsx
// Line 129: Shows "Failed to load indicators" text
indicatorsError ? (
  <p className="text-xs text-text-muted text-center py-4">Failed to load indicators</p>
) : ...
```

### Existing Skeleton Patterns Already in Codebase
```jsx
// RightOverlayPanel already has skeleton for loading:
{SKELETON_WIDTHS.map((w, i) => (
  <div key={i} className="h-6 bg-surface-2 rounded animate-pulse" style={{ width: `${w}%` }} />
))}

// ThreatNewsPage already has table-row skeleton:
{Array.from({ length: 8 }, (_, i) => (
  <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border animate-pulse">
    <div className="h-8 bg-surface-2 rounded w-[100px] shrink-0" />
    <div className="h-4 bg-surface-2 rounded flex-1" />
    <div className="hidden sm:block h-4 bg-surface-2 rounded w-32" />
  </div>
))}
```

## Inventory of All Changes Required

### Files to CREATE (2)
1. `frontend/src/components/ui/LoadingScreen.jsx` -- Branded loading screen (logo + pulse ring)
2. `frontend/src/components/ui/Skeleton.jsx` -- Generic skeleton building blocks (optional, for shared utility)

### Files to MODIFY (8)
1. `frontend/src/components/auth/ProtectedRoute.jsx` -- Replace inline spinner with LoadingScreen + AnimatePresence fade
2. `frontend/src/components/auth/GuestRoute.jsx` -- Replace inline spinner with LoadingScreen + AnimatePresence fade
3. `frontend/src/components/layout/AppLayout.jsx` -- Add `useAuth().loading` gate with LoadingScreen
4. `frontend/src/App.jsx` -- Replace `LazyFallback` spinner with LoadingScreen for consistency
5. `frontend/src/components/threat-map/ThreatMapStatus.jsx` -- "Connection lost" to "Fetching data..." with spinner
6. `frontend/src/components/threat-map/RightOverlayPanel.jsx` -- Replace "Failed to load indicators" error with skeleton
7. `frontend/src/styles/animations.css` -- Add `loadingPulseRing` keyframes and `.loading-pulse-ring` class
8. `frontend/src/pages/SettingsPage.jsx` -- Add skeleton loading state (currently renders form immediately from auth context, no separate data fetch -- may only need minor adjustment)

### Files that ALREADY HAVE proper skeletons (no changes needed)
- `ThreatActorsPage.jsx` -- Already uses `<SkeletonCard count={8} />` for loading state
- `ThreatNewsPage.jsx` -- Already has inline table-row skeletons
- `ThreatSearchPage.jsx` -- Already has loading skeletons for search results and history
- `DarkWebPage.jsx` -- Already has `ScanningAnimation` component for search loading

### Pages Assessment (D-09 Compliance)

| Page | Current Loading State | Change Needed |
|------|----------------------|---------------|
| ThreatMapPage | ThreatMapStatus shows "Connection lost" | Replace with "Fetching data..." indicator (D-07) |
| ThreatActorsPage | SkeletonCard grid | Already good -- no change |
| ThreatNewsPage | Table-row shimmer skeletons | Already good -- no change |
| ThreatSearchPage | Search history has skeleton loading | Already good -- no change |
| SettingsPage | No loading state (renders from auth context) | Minimal -- form data comes from `useAuth().user`, which is gated by AppLayout loading. Once AppLayout gate is in place, Settings always has user data. |
| DarkWebPage | ScanningAnimation for search | Already good -- initial credit fetch has no visible loading indicator but is non-blocking |

### RightOverlayPanel Changes (D-10)

The panel currently shows:
- Line 129: `"Failed to load indicators"` -- replace with extended skeleton display
- Line 53: StatRow error shows `"---"` -- keep as-is (this is a reasonable fallback after data actually fails, not during initial load)

The `indicatorsLoading` skeleton (lines 119-126) already works well. The change is to the ERROR state: instead of showing "Failed to load indicators" immediately, show the skeleton for a retry period or show a gentler message.

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Spinner-only loading | Branded loading screen with logo | Premium feel, brand reinforcement |
| "Connection lost" errors | "Fetching data..." with loading indicator | Correct user expectation setting |
| Error messages during load | Skeleton placeholders | No misleading error states |
| Instant show/hide | AnimatePresence fade transitions | Smooth, polished UX |

## Open Questions

1. **SettingsPage skeleton scope**
   - What we know: SettingsPage reads user data from `useAuth().user` which will be available once AppLayout's loading gate resolves. No separate API call on mount.
   - What's unclear: Whether the "skeleton loading" requirement for SettingsPage means anything beyond what the AppLayout gate already provides.
   - Recommendation: The AppLayout gate (D-04) fully covers SettingsPage. No additional skeleton needed unless there's a future data-fetch added. Note this in the plan but skip skeleton work for SettingsPage.

2. **LazyFallback replacement scope**
   - What we know: `LazyFallback` in App.jsx is used as the Suspense fallback for lazy-loaded routes. The CONTEXT mentions it could use LoadingScreen for consistency.
   - What's unclear: Whether replacing it is in-scope for AUTH-01/AUTH-02 or a nice-to-have.
   - Recommendation: Replace it -- it's a one-line change and improves consistency. Include in plan.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None -- no tests exist per CLAUDE.md |
| Config file | None |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Loading screen displays during auth resolve | manual-only | Visual verification in browser | N/A |
| AUTH-02 | No "Connection lost" errors during loading | manual-only | Visual verification in browser | N/A |

**Justification for manual-only:** No test infrastructure exists. These are visual/UX requirements that would need E2E browser tests to validate automatically. Creating test infrastructure is out of scope for this phase.

### Sampling Rate
- **Per task commit:** Manual browser verification -- load page, observe no FOUC
- **Per wave merge:** Full page walkthrough of all affected routes
- **Phase gate:** All routes verified visually, no flash of unauthenticated content

### Wave 0 Gaps
None -- no test infrastructure exists or is being created for this phase.

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis of all canonical reference files listed in CONTEXT.md
- `AuthContext.jsx` -- confirmed `loading` state pattern (line 18, exposed via context on line 56)
- `animations.css` -- confirmed existing `.skeleton` shimmer class (lines 28-61)
- `SkeletonCard.jsx` -- confirmed existing skeleton card component
- All 6 data-fetching pages analyzed for current loading state implementation

### Secondary (MEDIUM confidence)
- Framer Motion AnimatePresence pattern -- widely documented, already used 10+ times in the codebase (ThreatActorsPage, ThreatNewsPage, DarkWebPage, ThreatSearchPage modals/animations)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, everything already installed
- Architecture: HIGH -- patterns directly observed in codebase, CONTEXT.md is highly specific
- Pitfalls: HIGH -- derived from actual code analysis of current behavior

**Research date:** 2026-04-11
**Valid until:** 2026-05-11 (stable -- no external dependencies changing)
