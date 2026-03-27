# Phase 27: Outfit Font Migration - Research

**Researched:** 2026-03-25
**Domain:** CSS typography, Google Fonts, Tailwind CSS font configuration
**Confidence:** HIGH

## Summary

This phase is a straightforward font migration: replace three display/body fonts (Syne, Space Grotesk, Inter) with a single font family (Outfit), while preserving JetBrains Mono for code/data. The scope covers one Google Fonts import URL, one Tailwind config file, four CSS files, and ~33 JSX files containing font class references.

The key risk is incomplete replacement -- hardcoded font-family strings in CSS and inline JS (not just Tailwind classes) must also be caught. Research identified 3 hardcoded references outside of Tailwind classes that need updating.

**Primary recommendation:** Execute as a config-first migration (Google Fonts URL + Tailwind config + CSS base rules), then bulk find-replace class names, then fix hardcoded font-family strings, then update documentation.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Load Outfit with full 100-900 weight range from Google Fonts (variable font, negligible size impact ~25KB)
- **D-02:** Remove Syne, Space Grotesk, and Inter from the Google Fonts import
- **D-03:** Keep JetBrains Mono import unchanged (400/500/600 weights)
- **D-04:** Consolidate from 4 font tokens to 2: `font-sans` (Outfit) + `font-mono` (JetBrains Mono)
- **D-05:** Remove `font-display`, `font-heading`, and `font-body` token definitions from tailwind.config.js
- **D-06:** Replace all `font-display`, `font-heading`, `font-body` class usages (135 occurrences across 33 files) with `font-sans`
- **D-07:** Weight-only hierarchy -- no letter-spacing or other differentiation techniques
- **D-08:** Headings: Outfit 600-700 (semibold/bold). Body: Outfit 400 (regular). Nav/buttons: Outfit 500 (medium)
- **D-09:** Base CSS `h1, h2, h3` rule should apply `font-sans` with appropriate font-weight instead of current `font-heading`

### Claude's Discretion
- Exact weight assignments per heading level (h1 vs h2 vs h3) -- choose what looks best with the existing size hierarchy
- Whether to update body base style from `font-body` to `font-sans` explicitly or rely on Tailwind's default sans

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TYPO-01 | Website uses Outfit font for all headings (replacing Syne and Space Grotesk) | D-01/D-04/D-09: Outfit loaded, font-sans token replaces font-display/font-heading, base CSS h1-h3 updated |
| TYPO-02 | Website uses Outfit font for all body/UI text (replacing Inter) | D-01/D-04/D-06: Outfit loaded, font-sans replaces font-body, all class usages migrated |
| TYPO-03 | JetBrains Mono retained for code/data displays | D-03: JetBrains Mono import unchanged, font-mono token preserved |
| TYPO-04 | Google Fonts import updated to load Outfit with appropriate weights | D-01/D-02: New import URL verified working with 100-900 weight range |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- No TypeScript -- all `.jsx`/`.js` files
- No tests exist -- no test suite to run for validation
- No linter/formatter configured
- CSS is split across 4 files in `styles/` -- check all when debugging styles
- Tailwind CSS 3 with custom dark theme
- React 19 + Vite 7
- Fonts loaded via CSS `@import` in `main.css` (CLAUDE.md says `index.html` but code shows `main.css`)

## Standard Stack

No new libraries needed. This phase modifies existing configuration only.

| Tool | Version | Purpose | Notes |
|------|---------|---------|-------|
| Tailwind CSS | 3.x (existing) | Font token configuration | `fontFamily` in config |
| Google Fonts | CDN | Outfit font delivery | Variable font, ~25KB |

## Architecture Patterns

### Current Font Architecture (BEFORE)
```
Google Fonts @import (main.css line 1)
  -> Inter (300-700), JetBrains Mono (400-600), Space Grotesk (400-700), Syne (600-800)

tailwind.config.js fontFamily:
  -> font-display: Syne
  -> font-heading: Space Grotesk
  -> font-mono: JetBrains Mono
  -> font-body: Inter

main.css base layer:
  -> body: font-body (Inter)
  -> h1, h2, h3: font-heading (Space Grotesk)
  -> code, .mono: font-mono (JetBrains Mono)

main.css components layer:
  -> .section-title: font-heading

components.css:
  -> .score-ring .score-value: font-family: 'Space Grotesk' (HARDCODED)

DashboardPage.jsx:
  -> Chart.js tick font: family: 'Space Grotesk' (HARDCODED in JS)
  -> Leaflet popup: font-family: 'Space Grotesk' (HARDCODED in inline style)

ComponentsPage.jsx:
  -> Font showcase labels reference "Syne Display" and "Space Grotesk" (TEXT CONTENT)
```

### Target Font Architecture (AFTER)
```
Google Fonts @import (main.css line 1)
  -> Outfit (100-900), JetBrains Mono (400-600)

tailwind.config.js fontFamily:
  -> font-sans: Outfit        (NEW - replaces display/heading/body)
  -> font-mono: JetBrains Mono (UNCHANGED)

main.css base layer:
  -> body: font-sans (Outfit 400)
  -> h1, h2, h3: font-sans with font-weight 600-700
  -> code, .mono: font-mono (unchanged)

All JSX files:
  -> font-display -> font-sans
  -> font-heading -> font-sans
  -> font-body -> font-sans
```

### Migration Sequence (Critical Order)
1. **Config first** -- Update Google Fonts URL and Tailwind config. Until Tailwind config changes, `font-sans` does not resolve to Outfit.
2. **Base CSS** -- Update `main.css` base and component layer rules.
3. **Hardcoded CSS** -- Fix `components.css` hardcoded `font-family`.
4. **Hardcoded JS** -- Fix Chart.js and Leaflet popup font references in `DashboardPage.jsx`.
5. **Bulk class replacement** -- Replace `font-display`, `font-heading`, `font-body` with `font-sans` across all JSX files.
6. **ComponentsPage text** -- Update font showcase section text content (shows font names as display text).
7. **Documentation** -- Update CLAUDE.md Fonts section.

This order ensures the font is available before references point to it, and config changes are testable immediately.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Font loading | Self-hosted font files | Google Fonts CDN | Caching, CDN delivery, no build config |
| Class replacement | Manual file-by-file editing | Bulk search-and-replace | 135 occurrences across 33 files -- error-prone manually |

## Common Pitfalls

### Pitfall 1: Missed Hardcoded font-family Strings
**What goes wrong:** Tailwind class replacements are complete but hardcoded CSS `font-family` properties still reference old fonts.
**Why it happens:** Grep for class names misses raw CSS property values and JS inline styles.
**How to avoid:** Search for raw font names (`Syne`, `Space Grotesk`, `Inter`) in addition to Tailwind class names.
**Found instances:**
- `components.css` line 32: `font-family: 'Space Grotesk', sans-serif` (in `.score-ring .score-value`)
- `DashboardPage.jsx` line 126: Chart.js axis tick font `family: 'Space Grotesk'`
- `DashboardPage.jsx` line 452: Leaflet popup inline style `font-family:'Space Grotesk'`

### Pitfall 2: ComponentsPage Font Showcase Content
**What goes wrong:** The font showcase on ComponentsPage still displays "Syne Display" and "Space Grotesk Heading" as demo text.
**Why it happens:** These are text content strings, not class names -- bulk class replacement does not touch them.
**How to avoid:** Explicitly update `ComponentsPage.jsx` lines 213-214 text content to reflect Outfit.
**Lines affected:**
- Line 213: `"Syne Display -- AquaSecure Threat Intel"` -> update to Outfit reference
- Line 214: `"Space Grotesk Heading -- Dashboard Overview"` -> update to Outfit reference

### Pitfall 3: Tailwind `font-sans` Default Conflict
**What goes wrong:** Tailwind has a built-in `font-sans` utility that maps to a system font stack. Overriding it in config changes the default sans-serif for the entire project.
**Why it happens:** `font-sans` is a Tailwind default, not a custom token.
**How to avoid:** This is actually the desired behavior per D-04. By setting `fontFamily.sans` in the config, `font-sans` becomes `Outfit, sans-serif`. Since the body base style already needs to use Outfit, overriding Tailwind's default sans is correct. Additionally, any element without an explicit font class will inherit the body's `font-sans`, which means less manual class replacement needed.
**Recommendation:** Set body to `font-sans` explicitly. Since Tailwind's `preflight` (base reset) sets `body { font-family: theme('fontFamily.sans') }` by default, once config is updated, the body inherits Outfit automatically. The explicit `@apply font-sans` in the base layer is a belt-and-suspenders approach that is harmless and makes intent clear.

### Pitfall 4: font-body Removal Breaks Existing Styles
**What goes wrong:** Removing `font-body` from Tailwind config before replacing all `font-body` class usages causes Tailwind to silently generate no CSS for those classes, leaving elements unstyled.
**Why it happens:** Tailwind does not error on unknown utility classes -- it just skips them.
**How to avoid:** Replace ALL class usages BEFORE removing the old token definitions. Or: add the new tokens first, replace classes, then remove old tokens. The safest order is: (1) add `sans` token, (2) replace all classes, (3) remove old tokens.

## Code Examples

### Google Fonts Import (AFTER)
```css
/* main.css line 1 -- replace entire @import */
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Outfit:wght@100..900&display=swap');
```
**Verified:** This URL returns valid CSS with Outfit variable font in 100-900 range (confirmed via WebFetch 2026-03-25).

### Tailwind Config (AFTER)
```javascript
// tailwind.config.js fontFamily section
fontFamily: {
  sans: ['Outfit', 'sans-serif'],
  mono: ['JetBrains Mono', 'monospace'],
},
```

### Base CSS Rules (AFTER)
```css
/* main.css base layer */
body {
  @apply bg-primary text-text-primary font-sans antialiased;
  min-height: 100vh;
}

h1, h2, h3 {
  @apply font-sans font-semibold;
}

code, .mono {
  @apply font-mono;
}
```

### components.css Fix
```css
/* components.css line 32 -- .score-ring .score-value */
font-family: 'Outfit', sans-serif;
```

### DashboardPage.jsx Chart.js Fix
```javascript
// line 126 -- Chart.js axis ticks
y: { grid: { display: false }, ticks: { color: '#9AA0AD', font: { size: 12, family: 'Outfit' } } },
```

### DashboardPage.jsx Leaflet Popup Fix
```javascript
// line 452 -- inline style in template literal
popup: `<div style="font-family:'Outfit',sans-serif;...">...`
```

### Class Replacement Pattern
```
// In all JSX files:
font-display  ->  font-sans
font-heading  ->  font-sans
font-body     ->  font-sans

// In main.css components layer:
.section-title: font-heading  ->  font-sans
```

## Exact Scope Inventory

### Files Requiring Class Replacement (font-display/font-heading/font-body -> font-sans)

**Occurrence count by file (135 total across 33 files):**

| File | Count | Tokens Used |
|------|-------|-------------|
| `styles/main.css` | 3 | font-body, font-heading (x2) |
| `pages/ThreatSearchPage.jsx` | 14 | mixed |
| `pages/ThreatActorsPage.jsx` | 10 | mixed |
| `pages/DashboardPage.jsx` | 8 | mixed |
| `pages/ThreatNewsPage.jsx` | 8 | mixed |
| `pages/FeedsPage.jsx` | 7 | mixed |
| `components/landing/LandingScroll.jsx` | 7 | mixed |
| `pages/ComponentsPage.jsx` | 6 | mixed |
| `pages/CtiReportPage.jsx` | 6 | mixed |
| `pages/VulnScannerPage.jsx` | 6 | mixed |
| `pages/LandingPage.jsx` | 6 | mixed |
| `pages/SettingsPage.jsx` | 5 | mixed |
| `components/pricing/PlanCard.jsx` | 5 | mixed |
| `pages/CveDetailPage.jsx` | 4 | mixed |
| `pages/DarkWebPage.jsx` | 4 | mixed |
| `pages/DomainReportPage.jsx` | 4 | mixed |
| `components/threat-map/ThreatMapCounters.jsx` | 4 | mixed |
| `components/pricing/PlanConfirmModal.jsx` | 3 | mixed |
| `pages/ResetPasswordPage.jsx` | 3 | mixed |
| `pages/EulaPage.jsx` | 2 | mixed |
| `pages/PrivacyPolicyPage.jsx` | 2 | mixed |
| `pages/ForgotPasswordPage.jsx` | 2 | mixed |
| `pages/PricingPage.jsx` | 2 | mixed |
| `pages/RegisterPage.jsx` | 2 | mixed |
| `pages/LoginPage.jsx` | 2 | mixed |
| `pages/GetStartedPage.jsx` | 2 | mixed |
| `pages/VerifyEmailPage.jsx` | 2 | mixed |
| `pages/CtiSearchPage.jsx` | 1 | mixed |
| `components/ui/GradientButton.jsx` | 1 | mixed |
| `components/ui/Globe.jsx` | 1 | mixed |
| `components/layout/NotificationDrawer.jsx` | 1 | mixed |
| `components/layout/Sidebar.jsx` | 1 | mixed |
| `components/layout/Topbar.jsx` | 1 | mixed |

### Files Requiring Hardcoded Font-Family Updates (3 total)
1. `styles/components.css` line 32 -- `'Space Grotesk'` -> `'Outfit'`
2. `pages/DashboardPage.jsx` line 126 -- Chart.js font family
3. `pages/DashboardPage.jsx` line 452 -- Leaflet popup inline style

### Files Requiring Text Content Updates (1 total)
1. `pages/ComponentsPage.jsx` lines 213-214 -- font showcase demo text

### Files Requiring Documentation Updates (1 total)
1. `CLAUDE.md` -- Fonts section in Design System

### Config Files (2 total)
1. `tailwind.config.js` lines 45-50 -- fontFamily definition
2. `styles/main.css` line 1 -- Google Fonts @import URL

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None -- no tests exist in this project |
| Config file | None |
| Quick run command | `cd frontend && npm run build` (build succeeds = no broken classes) |
| Full suite command | `cd frontend && npm run build` (same -- no test suite) |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TYPO-01 | All headings render in Outfit | manual-only | Visual inspection in browser | N/A |
| TYPO-02 | All body/UI text renders in Outfit | manual-only | Visual inspection in browser | N/A |
| TYPO-03 | Code/data displays still render in JetBrains Mono | manual-only | Visual inspection in browser | N/A |
| TYPO-04 | Google Fonts import loads Outfit with correct weights | smoke | `cd frontend && npm run build` + check main.css output | N/A |

**Justification for manual-only:** Font rendering is a visual property. The project has no test infrastructure. The build command validates that Tailwind classes resolve without errors. Visual verification in the dev server confirms correct font rendering.

### Sampling Rate
- **Per task commit:** `cd frontend && npm run build` (must succeed)
- **Per wave merge:** Visual spot-check of landing page, dashboard, and threat search
- **Phase gate:** Full visual walkthrough of all 12+ pages

### Wave 0 Gaps
None -- no test infrastructure to create for a visual-only migration. Build success is the automated gate.

### Supplementary Verification
After all changes, run these grep commands to confirm no old font references remain:
```bash
# Must return 0 results (excluding RESEARCH.md/CONTEXT.md/CLAUDE.md git history):
grep -r "font-display\|font-heading\|font-body" frontend/src/ --include="*.jsx" --include="*.js" --include="*.css"
grep -r "Syne\|Space Grotesk" frontend/src/ --include="*.jsx" --include="*.js" --include="*.css"
grep -r "'Inter'" frontend/src/ --include="*.jsx" --include="*.js" --include="*.css"
```

## Sources

### Primary (HIGH confidence)
- Direct code inspection of `tailwind.config.js`, `main.css`, `components.css`, `index.html`
- Grep audit of all `frontend/src/` files for font-related classes and strings
- Google Fonts CDN verification: `https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap` confirmed working

### Secondary (MEDIUM confidence)
- Tailwind CSS 3 `fontFamily` configuration behavior (well-documented, stable API)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new libraries, just config changes to existing stack
- Architecture: HIGH - complete file inventory verified via grep, all touch points identified
- Pitfalls: HIGH - all hardcoded references found via comprehensive string search

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (stable -- Google Fonts and Tailwind CSS 3 APIs do not change)
