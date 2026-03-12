# AQUA TIP - Threat Intelligence Platform

## Commands

```bash
cd frontend
npm run dev      # Vite dev server
npm run build    # Production build
npm run preview  # Preview production build
```

No backend exists yet. The `backend/` directory is empty.

## Tech Stack

- **React 19** + **Vite 7** (ESM, no TypeScript)
- **Tailwind CSS 3** with custom dark theme
- **Framer Motion** for scroll-driven animations
- **cobe** for 3D globe visualization
- **Leaflet** for threat map
- **Chart.js** for dashboard charts
- **D3** for data visualizations
- **Lucide React** for icons
- **React Router DOM 7** (BrowserRouter)

## Project Structure

```
frontend/src/
  App.jsx                  # Router: landing (index) + AppLayout wrapper
  main.jsx                 # Entry point
  pages/                   # Route pages (12 total)
    LandingPage.jsx        # Public landing with scroll-driven globe
    IocSearchPage.jsx      # IOC search (main CTA target)
    DashboardPage.jsx      # Dashboard overview
    CtiSearchPage.jsx      # CTI search
    CtiReportPage.jsx      # CTI report detail
    DomainReportPage.jsx   # Domain analysis
    CveDetailPage.jsx      # CVE detail view
    FeedsPage.jsx          # Threat feeds
    ThreatMapPage.jsx      # Leaflet threat map
    VulnScannerPage.jsx    # Vulnerability scanner
    SettingsPage.jsx       # User settings
    ComponentsPage.jsx     # UI component showcase
  components/
    landing/               # Landing page scroll sections
    layout/                # AppLayout, Sidebar, Topbar, SearchModal, NotificationDrawer
    ui/                    # Globe, GradientButton, BackgroundPaths
  data/
    mock-data.js           # All mock/sample data
    icons.jsx              # Icon components
  hooks/
    useChartJs.js          # Chart.js lazy loader
    useLeaflet.js          # Leaflet lazy loader
    useKeyboardShortcut.js # Keyboard shortcut handler
  styles/
    main.css               # Tailwind imports + base styles
    components.css         # Component-level styles
    glassmorphism.css      # Glass effect utilities
    animations.css         # Custom animation classes
```

## Routing

- `/` - LandingPage (standalone, no sidebar)
- All other routes wrapped in `AppLayout` (sidebar + topbar)
- All landing page CTAs point to `/ioc-search`

## Design System

**Dark theme only.** Colors defined in `tailwind.config.js`:

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#0A0B10` | Page background |
| `surface` | `#0F1117` | Card/section background |
| `surface-2` | `#161822` | Elevated surfaces |
| `violet` | `#7A44E4` | Primary accent |
| `cyan` | `#00E5FF` | Secondary accent |
| `red` | `#FF3B5C` | Danger/critical |
| `green` | `#00C48C` | Success/safe |
| `amber` | `#FFB020` | Warning |
| `border` | `#1E2030` | Default borders |

**Fonts** (loaded via Google Fonts in `index.html`):
- `font-display` (Syne) - headings, nav, buttons
- `font-heading` (Space Grotesk) - secondary headings
- `font-mono` (JetBrains Mono) - body text, data, descriptions
- `font-body` (Inter) - general body text

**Patterns:**
- Glassmorphism: `bg-surface/60 border border-border backdrop-blur-sm`
- Section glow: `.section-glow` class for radial gradient backgrounds
- Cards: rounded-xl with border-border, bg-surface

## Gotchas

- No TypeScript - all `.jsx`/`.js` files
- No tests exist
- No linter/formatter configured
- All data is mocked in `data/mock-data.js` - no API calls
- Custom logo at `frontend/public/logo.png` (used in navbar + footer)
- Globe component (`cobe`) is heavy - uses `memo` and DPR capping at 1.5
- CSS is split across 4 files in `styles/` - check all when debugging styles
