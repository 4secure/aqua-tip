# Phase 64: Frontend Victimology Tab — VALIDATION

**Created:** Plan 64-03 (Wave 3 verification)
**Phase:** 64-frontend-victimology-tab
**Status:** Pending manual QA against live deploy
**Live URL:** https://tip.aquasecure.ai/threat-actors

## Overview

This document is the manual QA checklist for Phase 64. Plan 64-03 Task 1 already proved the 8 VICTM requirements are satisfied at code level (grep probes + Vite build + fetch-count probe). This file is what the human follows in a real browser to confirm SC1..SC4 hold against a real OpenCTI-backed deployment.

The phase is considered SHIPPED when all 4 SC checkboxes in §Sign-off are ticked.

## Manual QA

### SC1 — Tab bar shows exactly 5 tabs (Overview, Relationships, TTPs, Tools, Victimology)

1. Visit https://tip.aquasecure.ai/threat-actors (login as a Pro plan user — feature-gated)
2. Click any actor card to open the detail modal
3. Visually confirm the tab bar:
   - Tab 1: "Overview" with Info icon
   - Tab 2: "Relationships" with GitBranch icon
   - Tab 3: "TTPs" with Swords icon
   - Tab 4: "Tools" with Bug icon
   - Tab 5: "Victimology" with Target icon
4. Confirm NO "Campaigns" tab appears anywhere
5. Default active tab is Overview (D-03 verbatim — `setActiveTab('overview')` on actor.id change)

### SC2 — Victimology tab on a major actor (e.g., APT28) renders 4 non-empty sections

1. With the modal still open from SC1, search for "APT28" in the Threat Actors page (or another well-known major actor with broad victimology data)
2. Open the APT28 detail modal
3. Click the "Victimology" tab
4. Confirm the 2x2 grid renders 4 section cards:
   - **Top-Left:** Targeted Countries — chips with flag emoji + name (e.g., 🇺🇸 United States, 🇩🇪 Germany)
   - **Top-Right:** Targeted Regions — chips with name only (e.g., Eastern Europe, North America)
   - **Bottom-Left:** Targeted Sectors — chips with name only (e.g., Government, Defense, Energy)
   - **Bottom-Right:** Targeted Organizations — chips with name only
5. Confirm at least one section has ≥ 1 chip (APT28 should have ≥ 5 countries, ≥ 1 region, ≥ 3 sectors typically)
6. Confirm chip styling is consistent: rounded-pill, dark theme, font-sans, same border across all 4 sections
7. Spot-check a country chip with a known ISO-2 alias (e.g., United States → 🇺🇸 emoji visible). Spot-check a country with `country_code: null` if any exists — chip renders name-only with no leading emoji and no whitespace gap

### SC3 — Empty section renders friendly empty state (no crash, no blank, no layout breakage)

1. Find an actor with intentionally sparse victimology — try a less-documented actor or an actor where you know one section is likely empty (e.g., search for an obscure intrusion set)
2. Open the modal, click Victimology
3. Confirm: the empty section renders its own empty state INSIDE its card:
   - Section card still present (border, padding, header)
   - Header still shows "Targeted {Label} (0)" with the section icon
   - Body shows centered: section icon at opacity 40 + caption "No {label} data available"
4. Confirm: other 3 sections in the same modal render normally (a single empty section does NOT break the 2x2 layout for the other 3)
5. Open browser DevTools Console — confirm NO red errors during the render (no React key warning, no `Cannot read property 'length' of undefined`, no other JS error)
6. Resize the modal/window to mobile width — confirm the 2x2 collapses to single-column without breaking (Tailwind `grid-cols-1 md:grid-cols-2`)

### SC4 — Tab switching does NOT trigger additional network requests

1. Open browser DevTools → Network panel → filter by `enrichment` (or `XHR`)
2. Clear the Network panel
3. Open any threat actor modal
4. **Confirm:** exactly ONE `GET /api/threat-actors/{id}/enrichment` request fires (the eager fetch on modal open)
5. Click "Victimology" tab
6. **Confirm:** NO additional network request fires (Network panel still shows 1 enrichment call)
7. Click "Overview" tab
8. **Confirm:** still 1 enrichment call total
9. Click "Victimology" tab again
10. **Confirm:** still 1 enrichment call total
11. Repeat 3 more times rapidly — Network panel should remain at 1 enrichment call

Rationale: D-01 + SC4 — the existing eager fetch on modal open returns the entire enrichment payload (including `victimology` from Phase 59). The Plan 01 `{activeTab === 'victimology' && ...}` guard means React simply renders different cached subtrees on tab switches; no fetch is triggered. VICTM-07 (lazy-fetch on tab open) is therefore satisfied at the spirit level — no rendering work happens until the user clicks the tab — without an extra network round-trip.

The machine probe Gate 14 (below) backs this up: `grep -c "fetchThreatActorEnrichment\|new EventSource\|fetch(" frontend/src/pages/ThreatActorsPage.jsx` returns exactly ONE network-fetch call site (the line-556 eager fetch). The probe also matches the line-6 import statement, so the raw count is `2` total occurrences — but disambiguating via `grep -n` confirms only one is an actual call site (and `grep -c "fetch("` returns `0`, `grep -c "new EventSource"` returns `0`).

## Machine probes (re-run anytime)

Run from repo root. All must pass for the phase to be considered code-complete (Plan 03 Task 1 already runs these once; this section is for re-validation after follow-up changes).

```
cd C:/laragon/www/aqua-tip

# Vite build clean
cd frontend && npm run build && cd ..

# VICTM-01: Campaigns + Flag fully purged
grep -c "campaigns" frontend/src/pages/ThreatActorsPage.jsx          # Expected: 0
grep -c "Campaigns" frontend/src/pages/ThreatActorsPage.jsx          # Expected: 0
grep -c "\bFlag\b" frontend/src/pages/ThreatActorsPage.jsx           # Expected: 0

# VICTM-02: Victimology tab in TABS + content block
grep -q "label: 'Victimology'" frontend/src/pages/ThreatActorsPage.jsx
grep -q "icon: Target" frontend/src/pages/ThreatActorsPage.jsx
grep -q "activeTab === 'victimology'" frontend/src/pages/ThreatActorsPage.jsx

# VICTM-03: Countries section + flag helper
# Use -F fixed-string mode so '?' / '.' in optional-chaining / member-access are literal
grep -q "function countryCodeToFlag" frontend/src/pages/ThreatActorsPage.jsx
grep -q "0x1F1E6" frontend/src/pages/ThreatActorsPage.jsx
grep -qF "countryCodeToFlag(country.country_code)" frontend/src/pages/ThreatActorsPage.jsx
grep -q "Targeted Countries (" frontend/src/pages/ThreatActorsPage.jsx

# VICTM-04..06: Regions / Sectors / Organizations sections
grep -q "Targeted Regions (" frontend/src/pages/ThreatActorsPage.jsx
grep -q "Targeted Sectors (" frontend/src/pages/ThreatActorsPage.jsx
grep -q "Targeted Organizations (" frontend/src/pages/ThreatActorsPage.jsx

# Section header icons (note: lucide Map is aliased to MapIcon in Plan 02 to avoid
# shadowing the global Map constructor at line 381 — see 64-02-SUMMARY Rule 1 deviation)
grep -q "<Globe size={16}" frontend/src/pages/ThreatActorsPage.jsx
grep -q "<MapIcon size={16}" frontend/src/pages/ThreatActorsPage.jsx
grep -q "<Building2 size={16}" frontend/src/pages/ThreatActorsPage.jsx
grep -q "<Users size={16}" frontend/src/pages/ThreatActorsPage.jsx

# VICTM-07 spirit: render guard
grep -q "activeTab === 'victimology' && !enrichError" frontend/src/pages/ThreatActorsPage.jsx

# VICTM-08: per-section empty-state captions
grep -q "No countries data available" frontend/src/pages/ThreatActorsPage.jsx
grep -q "No regions data available" frontend/src/pages/ThreatActorsPage.jsx
grep -q "No sectors data available" frontend/src/pages/ThreatActorsPage.jsx
grep -q "No organizations data available" frontend/src/pages/ThreatActorsPage.jsx

# SC4 fetch-count probe (Gate 14): exactly ONE network-fetch call site.
# Note: a naive `grep -c "fetchThreatActorEnrichment\|new EventSource\|fetch("` returns 2
# because the import statement on line 6 also matches `fetchThreatActorEnrichment`.
# To disambiguate the actual call sites, use:
grep -c "fetch(" frontend/src/pages/ThreatActorsPage.jsx                         # Expected: 0
grep -c "new EventSource" frontend/src/pages/ThreatActorsPage.jsx                # Expected: 0
grep -n "fetchThreatActorEnrichment(" frontend/src/pages/ThreatActorsPage.jsx
# Expected: exactly ONE match — the line-556 eager fetch inside the actor.id-keyed useEffect.
# ≥ 2 indicates a regression added a second fetch (e.g., useEffect on activeTab).
# 0 indicates the existing eager fetch was accidentally removed.

# D-14 single-file scope (5 task commits in Plan 01 + Plan 02; HEAD~6 from Plan 03 commit)
git diff --name-only HEAD~6 HEAD -- frontend/src/ | sort -u
# Expected: exactly "frontend/src/pages/ThreatActorsPage.jsx"

# D-15 no CSS edits
git diff --stat HEAD~6 HEAD -- frontend/src/styles/
# Expected: empty

# D-07 zero new deps
git diff HEAD~6 HEAD -- frontend/package.json frontend/package-lock.json
# Expected: empty
```

## Sign-off

Tick each checkbox after the corresponding manual QA scenario passes against the live deployment. The phase is SHIPPED when all 4 are ticked + the human commits the updated VALIDATION.md with the ticks.

- [ ] **SC1**: Tab bar shows exactly 5 tabs (Overview, Relationships, TTPs, Tools, Victimology) with no Campaigns tab — verified against `https://tip.aquasecure.ai/threat-actors`
- [ ] **SC2**: Victimology tab renders 4 non-empty sections for a major actor (e.g., APT28) with country flag emojis on countries and chip-only rendering on regions/sectors/organizations
- [ ] **SC3**: Empty section renders friendly empty state inside its card without crashing or breaking the 2x2 layout — verified by selecting an actor with a sparse victimology
- [ ] **SC4**: Switching between Overview and Victimology tabs multiple times triggers EXACTLY ONE `/api/threat-actors/{id}/enrichment` request total — verified via DevTools Network panel
