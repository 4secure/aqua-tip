# Phase 29: Home Page Fixes - Context

**Gathered:** 2026-03-27
**Status:** Implementation complete (pre-committed)

<domain>
## Phase Boundary

Fix landing page content, broken links, and make Pricing/Contact standalone public pages outside AppLayout.

</domain>

<decisions>
## Implementation Decisions

### Landing Page Content
- **D-01:** Updated feature cards — "Real-Time IP Lookup" → "Real-Time Threat Lookup", "Threat Classification" → "Dark Web Monitoring" with incognito icon
- **D-02:** Updated CTA copy — "1 free search per day" → "free trial credits"
- **D-03:** Updated footer description to mention IPs, domains, CVEs, and threat actors
- **D-04:** Footer uses `bg-primary` class instead of inline hex style

### Link Fixes
- **D-05:** All "View Pricing" buttons now link to `/pricing` (were incorrectly pointing to `/threat-search`)
- **D-06:** Footer "Pricing Plan" link now points to `/pricing`

### Standalone Public Pages
- **D-07:** PricingPage moved outside AppLayout — standalone page with its own navbar
- **D-08:** ContactUsPage created as new standalone public page
- **D-09:** Both `/pricing` and `/contact` routes moved to public (no auth required, no sidebar)

### Feature Card Icons
- **D-10:** FeatureCard component updated to support both Lucide icons and custom string-based icons (CustomIcon from data/icons)

</decisions>

<canonical_refs>
## Canonical References

No external specs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Modified Files
- `frontend/src/pages/LandingPage.jsx` — CTA copy, footer, link fixes
- `frontend/src/components/landing/LandingScroll.jsx` — Feature cards, icons, pricing links
- `frontend/src/pages/PricingPage.jsx` — Standalone with navbar
- `frontend/src/App.jsx` — Route restructuring for public pages
- `frontend/src/pages/ContactUsPage.jsx` — New file

### Patterns Used
- Navbar pattern duplicated from LandingPage into PricingPage (logo + auth-conditional buttons)
- ContactUsPage uses ParticleBackground + glassmorphism card pattern
- Custom icon rendering via `Icon` component from `data/icons.jsx`

</code_context>

<specifics>
## Specific Ideas

No specific requirements — all changes already implemented in working tree.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 29-home-page-fixes*
*Context gathered: 2026-03-27*
