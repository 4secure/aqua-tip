# Phase 65 Manual QA — Frontend Campaigns Toggle

**Phase:** 65 — Frontend Campaigns Toggle
**Code-complete:** 2026-05-05 (commits across 65-01, 65-02, 65-03)
**Test target:** https://tip.aquasecure.ai/threat-actors (or local `npm run dev` at http://localhost:5173/threat-actors)
**Estimated walkthrough:** ~10 minutes
**Pre-requisites:** Logged-in account on a paid plan tier (Campaigns endpoint is feature-gated per CAMP-07; free tier returns 403 — confirmed in Phase 60).

This document mirrors Phase 64's `64-VALIDATION.md` structure: a snapshot of the already-passed machine gates, then per-SC user-visible walkthroughs the human verifies live, then a set of edge-case probes that exercise the D-XX decision space.

---

## Machine probes (snapshot — already PASS at code-complete commit)

Run from repo root before sign-off to confirm no regressions since the code-complete commit:

```bash
cd C:/laragon/www/aqua-tip
set -e

# File existence
test -f frontend/src/api/threat-campaigns.js
test -f frontend/src/components/threat-actors/CampaignCard.jsx
test -f frontend/src/components/threat-actors/CampaignDetailModal.jsx

# D-12 API client signature
grep -q "export function fetchThreatCampaigns({ after, search, sort, order } = {})" frontend/src/api/threat-campaigns.js

# D-15 chip className verbatim (in card AND modal)
grep -lF "inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-2 border border-border text-xs font-sans text-text-primary" frontend/src/components/threat-actors/

# CRITICAL D-20 — no `description` field rendered
test "$(grep -c 'description' frontend/src/components/threat-actors/CampaignDetailModal.jsx)" = "0"

# Page wiring — view source of truth + view-aware fetch + 2 portals
grep -qF "searchParams.get('view') === 'campaigns'" frontend/src/pages/ThreatActorsPage.jsx
test "$(grep -c 'fetchThreatCampaigns(params)' frontend/src/pages/ThreatActorsPage.jsx)" = "2"
test "$(grep -c 'createPortal(' frontend/src/pages/ThreatActorsPage.jsx)" = "2"

# No CSS or dep drift
test -z "$(git log --oneline | head -10 | xargs -I{} git diff --stat {}^ {} -- frontend/src/styles/ 2>/dev/null | head)"

# Build green
cd frontend && npm run build

echo "=== ALL PHASE 65 GATES PASS ==="
```

Expected: final line `=== ALL PHASE 65 GATES PASS ===`. If any line fails, stop the manual walkthrough and re-open the offending plan.

---

## SC1 — Pill toggle visible (CAMP-01)

**Steps:**
1. Navigate to `/threat-actors` (no `?view=` param)
2. Look at the toolbar row (immediately above the Threat Actors card grid)

**Expected:**
- A pill bar with EXACTLY two buttons labelled `Threat Actors` and `Campaigns`
- The pill bar sits inline-LEFT of the search input on `md:` screens (≥ 768px)
- On mobile (<768px), the pill bar stacks ABOVE the search row (flex-col → flex-row breakpoint)
- The `Threat Actors` button has the `.active` style (violet underline + violet-light text per main.css line 159)
- The `Campaigns` button is in default `.tab-item` style (text-text-secondary, no underline)
- Pill bar has NO bottom border underline (overridden via `!border-b-0` per D-05 toolbar context)

---

## SC2 — Campaign card fields (CAMP-02 + CAMP-05)

**Steps:**
1. From `/threat-actors`, click the `Campaigns` pill
2. Wait for the loading skeleton to clear (8 SkeletonCards in a 4-col grid, per D-24)
3. Inspect any non-empty Campaign card

**Expected:**
- Page content swaps from Threat Actor cards to Campaign cards (D-02)
- Card layout: 1-col mobile, 2-col md, 3-col lg, 4-col xl (matches existing Threat Actors grid — D-15 doesn't override grid)
- Each card shows:
  - **Name** as a bold h3 (font-sans text-base font-semibold)
  - **Date range** in font-mono text-xs text-text-muted, format `<first_seen> — <last_seen>` (em-dash separator)
  - **Objective** paragraph (if present) — font-sans text-sm, truncated to 2 lines via `line-clamp-2` (D-22)
  - **Attribution chip(s)** at the bottom — pill-shaped, `bg-surface-2 border border-border` per D-15 (Phase 64 D-08 chip style verbatim)
- Hovering a card brightens the border to `violet/40` (D-16 hover state)
- The entire card is clickable (cursor-pointer; clicking opens the detail modal — verify in SC4)

---

## SC3 — URL refresh restores view (CAMP-03 + CAMP-04)

**Steps:**
1. From the Campaigns view (after SC2), check the browser URL — it should contain `?view=campaigns`
2. Press F5 / Cmd+R to refresh the page
3. Wait for the page to reload

**Expected:**
- URL is `?view=campaigns` immediately after clicking the Campaigns pill (CAMP-03)
- After refresh, the Campaigns view is restored (NOT the default Actors view) — `view` is computed from `?view=` URL param on every render, so refresh works trivially (CAMP-04)
- Cursor history is empty after refresh (pagination chip resets to "1-24 of N")
- Manual probe: navigate directly to `/threat-actors?view=campaigns` in a new tab — should land on Campaigns view immediately
- Manual probe: navigate to `/threat-actors?view=foo` (junk value) — should fall back to Actors view (D-08 — `view === 'campaigns'` is the strict predicate)

---

## SC4 — Campaign detail modal (CAMP-06, D-19, D-20)

**Steps:**
1. From the Campaigns view, click any non-empty Campaign card
2. Inspect the opened modal

**Expected:**
- A full-screen modal opens with backdrop blur + Framer Motion fade/scale animation (D-18 mirrors ThreatActorModal shell)
- Modal sections render in order (D-19):
  1. **Header**: campaign name as h2 (font-sans text-2xl font-bold)
  2. **Date range row**: `<first_seen> — <last_seen>` in font-mono text-xs text-text-muted
  3. **Objective section**: `<h3>Objective</h3>` followed by either the objective text OR `No objective specified.` in muted text (D-22 — section structure preserved even when null)
  4. **Attributed to section** (when non-empty): `<h3>Attributed to</h3>` + chip(s) per Intrusion Set name. **OMITTED entirely when `attributed_to` array is empty** (D-21)
  5. **Labels section** (when non-empty): `<h3>Labels</h3>` + small chips with each label's OpenCTI color as inline-style background. **OMITTED entirely when `labels` array is empty** (D-19 §5)
- **CRITICAL D-20 GATE**: NO field labelled or rendered as `description` anywhere in the modal — the Phase 60 backend payload does not include `description`; this is intentional
- Press `Escape` — modal closes (D-18)
- Click outside the modal (on the backdrop) — modal closes
- Open a campaign with `attributed_to: []` (find one via the empty-attribution probe in Edge Cases) — the entire `Attributed to` section is GONE, NOT replaced with a placeholder

---

## SC5 — Toggle resets search and pagination (D-09, D-11)

**Steps:**
1. From the default `/threat-actors` view, type `apt` into the search input
2. Wait for the debounced search to fire (~300ms) — URL becomes `?search=apt`
3. Click `Next` to paginate forward — URL becomes `?search=apt&after=<cursor>`
4. Click the `Campaigns` pill

**Expected:**
- URL changes to EXACTLY `?view=campaigns` — both `?search=` and `?after=` are removed (D-09)
- The search input is empty (D-10 — `key={view}` remount cleared the uncontrolled defaultValue)
- Pagination chip shows `1-24 of N` — cursor history was cleared (D-11 — `setCursorHistory([])`)
- Network tab shows the Campaigns fetch was made WITHOUT `?after=` and WITHOUT `?search=` (D-26 — also no `sort` or `order` params — backend defaults)
- Click the `Threat Actors` pill (now the active view) again — NO additional network request fires (D-07 active-pill click is a no-op)
- Click the `Campaigns` pill again — same fetch fires (going back to Campaigns from Actors counts as an inactive-pill click)

---

## Edge case probes

**Date null permutations (D-23):**
- Find a campaign with both `first_seen` and `last_seen` null — card + modal date row should show literal `Unknown date range`
- Find a campaign with only `first_seen` null — card + modal show `? — <last_seen>`
- Find a campaign with only `last_seen` null — card + modal show `<first_seen> — ongoing`

**Empty attribution (D-21):**
- Find a campaign with `attributed_to: []` — card omits the entire chip row, modal omits the entire `Attributed to` section (no heading, no placeholder text)

**Empty objective (D-22):**
- Find a campaign with `objective: null` (or empty string) — card omits the objective paragraph entirely, modal renders `No objective specified.` in muted text under the Objective heading

**Empty labels (D-19 §5):**
- Find a campaign with `labels: []` — modal omits the entire `Labels` section (no heading)

**Active-pill click no-op (D-07):**
- With Campaigns active, click the `Campaigns` pill — open Network tab; NO new fetch should fire. URL should not change.

**Refresh deep-link (CAMP-04):**
- Open `/threat-actors?view=campaigns&search=apt&after=<cursor>` directly — Campaigns view loads with the search and cursor honored

---

## Sign-off

- [ ] SC1 verified — initials/date: ____________
- [ ] SC2 verified — initials/date: ____________
- [ ] SC3 verified — initials/date: ____________
- [ ] SC4 verified — initials/date: ____________
- [ ] SC5 verified — initials/date: ____________
- [ ] Edge cases verified — initials/date: ____________
- [ ] Final approval — Phase 65 ships — initials/date: ____________

Once all sign-off boxes are checked, update `.planning/STATE.md` to mark Phase 65 verified-live and proceed to `/gsd-discuss-phase 66` (Integration Validation & Polish — final v6.1 phase).
