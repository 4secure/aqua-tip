---
phase: 65
slug: frontend-campaigns-toggle
status: human_needed
verified: 2026-05-05
code_complete: true
manual_qa_pending: true
requirements:
  - CAMP-01
  - CAMP-02
  - CAMP-03
  - CAMP-04
  - CAMP-05
  - CAMP-06
commits:
  - 06b9fbc  # docs(65): capture phase context (Frontend Campaigns Toggle)
  - 660233b  # docs(65): plan Phase 65 — 3 plans / 3 waves (Frontend Campaigns Toggle)
  - 041463e  # docs(state): record Phase 65 PLANNED (3 plans / 3 waves) — ready to execute
  - ad489fb  # feat(65-01): add threat-campaigns API client (CAMP-02 scaffold)
  - bc456a3  # feat(65-01): add CampaignCard component (CAMP-05)
  - 97cfcd9  # feat(65-01): add CampaignDetailModal component (CAMP-06)
  - 66ea66d  # docs(65-01): plan summary — 3 new files (api client + card + modal)
  - 253eb73  # feat(65-02): add view state + pill toggle + handleViewChange + selectedCampaign state (CAMP-01, CAMP-03, CAMP-04 scaffold)
  - 44759ea  # feat(65-02): view-aware loadData + silentRefresh (Campaigns branch with no sort/order per D-26)
  - 0dcf0ab  # feat(65-02): wire view-aware grid + Campaign modal portal (CAMP-02 complete, CAMP-05/CAMP-06 user-visible)
  - fd87632  # docs(65-02): plan summary — toggle + view-aware fetch + grid + modal portal wiring
  - 05232fc  # docs(65-03): flip CAMP-01..06 to code-complete + D-20 description-word cleanup in ROADMAP SC4 + REQUIREMENTS CAMP-06
  - 3704aa3  # docs(65-03): add 65-VALIDATION.md manual QA scaffold (SC1..SC5 + edge cases + sign-off)
  - 8405845  # docs(65-03): plan summary — phase 65 audit + REQUIREMENTS/ROADMAP patches + VALIDATION scaffold
overrides:
  - must_have: "Plan 01 Task 3 acceptance gate `grep -c \"description\" CampaignDetailModal.jsx` returns 0 with the spec'd verbatim file body (which itself contained the literal token `description` in the docstring)"
    reason: "Plan 01's `<action>` body for CampaignDetailModal.jsx specified a docstring line that named the forbidden D-20 token literally, which would have caused the same plan's strict `grep -c description = 0` gate to fail. Resolution applied per `<deviation_protocol>` Rule 1 (plan typo, fix code to satisfy stricter gate): docstring rephrased to `D-20 enforcement: no prose field rendered — Phase 60 payload omits that field.` The structural intent — zero JSX render, zero field access, zero string reference to `campaign.description` anywhere in the file — is fully preserved. Documented in 65-01-SUMMARY.md §Deviations (commit 97cfcd9). Re-verified: `grep -c \"description\" CampaignDetailModal.jsx` → 0."
    accepted_by: "ai@4secu.com"
    accepted_at: "2026-05-05T00:00:00Z"
  - must_have: "Plan 02 Task 1 acceptance gate `grep -qF \">Threat Actors<\" ThreatActorsPage.jsx` and the parallel `>Campaigns<` probe both pass"
    reason: "Plan 02's pill-button JSX is multi-line (label on its own indented line: `<button ...>\\n            Threat Actors\\n          </button>`), so the `>` and `<` of the JSX tags live on separate lines and the inline `grep -qF \">Threat Actors<\"` match cannot succeed regardless of correctness. Plan grep gate was over-strict for the chosen JSX formatting. Resolution applied per `<deviation_protocol>` Rule 2 (plan grep typo, satisfy structural intent): the structural intent (D-06 verbatim pill labels `Threat Actors` and `Campaigns` rendered inside the two `.tab-item` buttons) verified via `grep -c \"^            Threat Actors$\"` = 1 AND `grep -c \"^            Campaigns$\"` = 1. Documented in 65-02-SUMMARY.md §Deviations (commit fd87632). No code change was needed — the labels are correct as authored."
    accepted_by: "ai@4secu.com"
    accepted_at: "2026-05-05T00:00:00Z"
  - must_have: "Plan 03 Task 2 acceptance gate `grep -c '^- \\[x\\] \\*\\*CAMP-0' .planning/REQUIREMENTS.md` returns exactly 6"
    reason: "Plan 03's verification predicate assumed the universe of `CAMP-0X` requirements was 1..6 only, but CAMP-07 and CAMP-08 (already shipped in Phase 60 on 2026-04-19, marked `[x]`) ALSO match the regex `CAMP-0X` — actual count is 8. Resolution applied per `<deviation_protocol>` Rule 2 (plan grep typo, satisfy structural intent): replaced the over-strict universal `[x] CAMP` count with the more precise predicate `grep -c \"code-complete Phase 65 (2026-05-05)\" .planning/REQUIREMENTS.md` which returns exactly 6 (the suffix is unique to this plan; CAMP-07/08 use the different `satisfied Phase 60 (2026-04-19)` suffix). Negative side `grep -c '^- \\[ \\] \\*\\*CAMP-' .planning/REQUIREMENTS.md` returns 0 — zero CAMP requirements remain in `[ ]` state. Documented in 65-03-SUMMARY.md §Deviations (commit 8405845)."
    accepted_by: "ai@4secu.com"
    accepted_at: "2026-05-05T00:00:00Z"
---

# Phase 65 — Frontend Campaigns Toggle — Verification

**Status:** `human_needed` (2026-05-05) — all 9 machine-verifiable gate groups PASS and 6/6 in-scope CAMP requirements (CAMP-01..06) are satisfied at code level. SC1..SC5 are observable browser/network behaviors that require a human walkthrough against the live deploy at `https://tip.aquasecure.ai/threat-actors`; the manual QA checklist already exists at `.planning/phases/65-frontend-campaigns-toggle/65-VALIDATION.md` (Phase 61/62/63/64 ship pattern preserved).

## Phase Goal (from ROADMAP.md)

> The Threat Actors page has a pill toggle to switch between the Threat Actors and Campaigns views; Campaigns view shows a paginated grid of OpenCTI Campaign entities with attribution chips.

## Goal-Backward Analysis

Each must-have backed by code-level evidence in the four Phase 65 source files. SC1..SC5 are user-visible behaviors deferred to manual QA per `65-VALIDATION.md` — the table notes "code-complete pending manual QA" where browser verification is required.

| Must-Have (derived from Goal + SC1..SC5 + D-XX) | Evidence at Code Level | Status |
|------------------------------------------------|------------------------|--------|
| Toolbar shows a pill toggle with two buttons labelled exactly `Threat Actors` and `Campaigns` (D-05, D-06) | `ThreatActorsPage.jsx` lines 190–205: `<div className="tab-bar !mb-0 !border-b-0 shrink-0">` wraps two `<button className={\`tab-item ${view === ...}\`}>` elements with verbatim labels `Threat Actors` (line 196) and `Campaigns` (line 203). `.tab-bar` / `.tab-item` classes exist in `frontend/src/styles/main.css` (verified). | code-complete pending manual QA (SC1) |
| Clicking the inactive pill switches the view content (CAMP-02) | Lines 295–315: grid render branches on `view === 'campaigns'` — Campaigns branch maps `items` to `<CampaignCard>`, Actors branch maps to `<ThreatActorCard>`. Click handler `handleViewChange` (line 135) writes `?view=` via setSearchParams which re-derives `view` per render, triggering `loadData` via dep array `[view, after, search]`. | code-complete pending manual QA (SC1, SC2) |
| URL reflects active view via `?view=campaigns` (or omitted/`?view=actors` for default) (CAMP-03, D-08) | Line 30: `const view = searchParams.get('view') === 'campaigns' ? 'campaigns' : 'actors';` is the single source of truth (D-08 verbatim). Line 139: `next.set('view', newView)` inside `handleViewChange`. Junk values like `?view=foo` correctly fall back to `'actors'` via the strict `=== 'campaigns'` predicate. | code-complete pending manual QA (SC3) |
| Refresh restores active view from URL (CAMP-04) | View derivation at line 30 runs on every render, reading `searchParams.get('view')` directly. Refresh re-runs the same derivation path with the URL state intact. No `useEffect`-based hydration needed. | code-complete pending manual QA (SC3) |
| CampaignCard renders name + date range + conditional objective + conditional attribution chips (CAMP-05, D-15, D-22, D-21, D-23) | `CampaignCard.jsx` lines 36–61: h3 name (line 36), date range pill (line 40 — `font-mono text-xs text-text-muted`, em-dash separator computed at lines 22–29 with D-23 null permutations), conditional objective at line 44 (`{campaign?.objective && ...}` short-circuits when null/empty per D-22), conditional chip row at line 50 (`{attributedTo.length > 0 && ...}` omits entirely when empty per D-21). | code-complete pending manual QA (SC2) |
| Each attribution chip uses the verbatim Phase 64 D-08 chip className (D-15) | `grep -lF "inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-2 border border-border text-xs font-sans text-text-primary"` matches BOTH `CampaignCard.jsx` (line 55) AND `CampaignDetailModal.jsx` (line 115). | verified |
| Card outer container uses verbatim D-16 className (`bg-surface border border-border rounded-xl p-5 hover:border-violet/40 transition-colors cursor-pointer`) | `CampaignCard.jsx` line 34 — exact byte-for-byte match against D-16. | verified |
| Card height is content-driven (D-17) — no fixed height utilities | `grep -E "h-\\d+\|min-h-\\d+\|max-h-\\d+" CampaignCard.jsx` returns 0 matches. | verified |
| Clicking a Campaign card opens a detail modal (CAMP-06, D-18) | Card `onClick` (line 33) triggers parent's `setSelectedCampaign(c)` (page line 303). Page renders second `createPortal` block (lines 331–341) with `<AnimatePresence>` + conditional `<CampaignDetailModal campaign={selectedCampaign} onClose={() => setSelectedCampaign(null)} />` mirroring the existing ThreatActorModal portal pattern verbatim. | code-complete pending manual QA (SC4) |
| Modal mirrors ThreatActorModal shell (Framer Motion backdrop + Escape + body overflow lock) (D-18) | `CampaignDetailModal.jsx` lines 26–36: `useEffect` registers Escape keydown handler + sets `document.body.style.overflow = 'hidden'` with cleanup. Lines 53–59: outer `motion.div` with opacity backdrop. Lines 64–69: inner `motion.div` with scale/y entry transition. Backdrop click handler at line 61 (`onClick={onClose}`). | code-complete |
| Modal renders 5 sections in order — Header → Date → Objective → Attribution → Labels (D-19) | `CampaignDetailModal.jsx` lines 79–142: Header h2 (lines 79–82), Date row (lines 84–87), Objective section always rendered with placeholder fallback (lines 89–103, D-22 modal variant), Attribution section guarded `{attributedTo.length > 0 && ...}` (lines 105–122, D-21), Labels section guarded `{labels.length > 0 && ...}` (lines 124–142, D-19§5). | code-complete pending manual QA (SC4) |
| **CRITICAL D-20:** Zero `description` field references anywhere in CampaignDetailModal.jsx | `grep -c "description" frontend/src/components/threat-actors/CampaignDetailModal.jsx` → **0** (re-run 2026-05-05). No JSX render, no field access, no string token. The strictest gate of the phase. | verified (override applied to plan-typo gate; intent enforced) |
| Switching from filtered Actors view back to Campaigns resets `?search=` and `?after=` (SC5, D-09) | `handleViewChange` (lines 135–147): single setSearchParams call sets `view` (line 139), deletes `search` (line 140), deletes `after` (line 141). Cursor history reset at line 144 (`setCursorHistory([])` per D-11). Search input remount via `key={view}` (line 215, D-10) clears the uncontrolled `defaultValue`. | code-complete pending manual QA (SC5) |
| Active-pill click is a no-op (D-07) | `handleViewChange` line 136: `if (newView === view) return;` early-return guard. Re-clicking the active pill triggers neither setSearchParams nor cursor reset nor refetch. | verified |
| Campaigns view sends NO sort/order params (D-26) | Lines 39 + 71: `const params = {};` (Campaigns branch) — `grep -c "const params = {};" ThreatActorsPage.jsx` = 2. Actors branch lines 48 + 78: `const params = { sort: 'modified', order: 'desc' };` — `grep -c "const params = { sort: 'modified', order: 'desc' };" ThreatActorsPage.jsx` = 2 (one per loadData/silentRefresh). Backend Phase 60 default `orderBy=modified&orderMode=desc` applies. | verified |
| API client signature is byte-faithful D-12 mirror of fetchThreatActors | `frontend/src/api/threat-campaigns.js` line 3: `export function fetchThreatCampaigns({ after, search, sort, order } = {})` — `grep -q` PASS. Body builds URLSearchParams identically (lines 4–12). Total file size 13 lines (matches the D-01 ~20 line estimate). | verified |
| No enrichment endpoint for Campaigns (D-14) — list payload is complete | `grep -c "fetchCampaignEnrichment\|/api/threat-campaigns/.+/enrichment" CampaignDetailModal.jsx` = 0. Modal renders straight from the `campaign` prop. `grep -c "fetchThreatCampaigns(params)" ThreatActorsPage.jsx` = 2 (loadData + silentRefresh) — only one fetch entry point. | verified |
| Phase scope: exactly 4 frontend source files touched (3 new + 1 modified — D-27) | `git diff --name-only ad489fb^..HEAD -- frontend/` returns exactly: `frontend/src/api/threat-campaigns.js` (new), `frontend/src/components/threat-actors/CampaignCard.jsx` (new), `frontend/src/components/threat-actors/CampaignDetailModal.jsx` (new), `frontend/src/pages/ThreatActorsPage.jsx` (modified). | verified |
| Zero CSS file edits across entire phase (D-28) | `git diff --stat ad489fb^..HEAD -- frontend/src/styles/` returns empty. | verified |
| Zero new dependencies across entire phase (D-29) | `git diff --stat ad489fb^..HEAD -- frontend/package.json frontend/package-lock.json` returns empty. | verified |
| ThreatActorsPage.jsx stays under CLAUDE.md 1500-line hard cap | `wc -l ThreatActorsPage.jsx` → 1073 (was 986 pre-Plan-02; +87 net). 1073 < 1500 PASS. | verified |
| Vite build is green | `cd frontend && npm run build` exits 0 in 11.71s on 2026-05-05; ThreatActorsPage chunk 31.03 kB / gzip 7.72 kB. | verified |

## Machine-Verifiable Gates (9 from Plan 03 Task 1 audit)

All 9 gate groups re-run from repo root on 2026-05-05.

| # | Gate Group | Probe(s) | Result |
|---|------------|----------|--------|
| 1 | File existence (3 new files + threat-actors/ directory) | `test -f` on all three new files + `test -d frontend/src/components/threat-actors/` | PASS — all 4 paths exist |
| 2 | API client D-12 signature byte-exact + D-14 no enrichment helper | `grep -q "export function fetchThreatCampaigns({ after, search, sort, order } = {})" threat-campaigns.js` + `grep -c "Enrichment\\|enrichment" threat-campaigns.js` = 0 | PASS |
| 3 | CampaignCard verbatim D-15/D-16 + D-17/D-21/D-22/D-23 omission rules | D-15 chip className verbatim present (line 55) + D-16 outer className verbatim (line 34) + D-17 no fixed height (`grep -E "h-\\d+\|min-h-\\d+\|max-h-\\d+"` = 0) + D-21 chip-row guard `attributedTo.length > 0` (line 50) + D-22 objective guard `campaign?.objective &&` (line 44) + D-23 dateRange permutations (lines 22–29) | PASS — all six probes pass |
| 4 | CampaignDetailModal D-18 shell + D-19 sections + **CRITICAL D-20** zero `description` references | D-18 Escape + body overflow lock useEffect (lines 26–36) + D-19 5 sections in order (lines 79–142) + **D-20 `grep -c "description" CampaignDetailModal.jsx` = 0** + D-21 attribution-section guard (line 106) + D-19§5 labels-section guard (line 125) | PASS — all probes pass; D-20 critical gate clean (override applied to plan-typo predicate, source intent enforced verbatim) |
| 5 | Page wiring D-04..D-11 + D-26 + D-25 + view-aware grid + Campaign portal | D-04 mobile-stack toolbar `flex flex-col md:flex-row` (line 188) + D-05 `tab-bar !mb-0 !border-b-0 shrink-0` (line 190) + D-06 verbatim pill labels (lines 196 + 203) + D-07 `if (newView === view) return` (line 136) + D-08 `searchParams.get('view') === 'campaigns' ? 'campaigns' : 'actors'` (line 30) + D-09 single setSearchParams with delete-search + delete-after (lines 137–143) + D-10 `key={view}` on search input (line 215) + D-11 `setCursorHistory([])` (line 144) + D-26 Campaigns `const params = {};` count = 2 + Actors `const params = { sort: 'modified', order: 'desc' };` count = 2 + 2 `createPortal(` calls + view-aware empty-state copy (line 286) + view-aware grid (lines 295–315) | PASS — all 12 probes pass |
| 6 | D-28 — no CSS edits across entire phase | `git diff --stat ad489fb^..HEAD -- frontend/src/styles/` empty | PASS |
| 7 | D-29 — no new deps across entire phase | `git diff --stat ad489fb^..HEAD -- frontend/package.json frontend/package-lock.json` empty | PASS |
| 8 | ThreatActorsPage.jsx ≤ 1500 lines (CLAUDE.md hard cap) | `wc -l ThreatActorsPage.jsx` → 1073 < 1500 | PASS — 71% headroom |
| 9 | Vite build green | `cd frontend && npm run build` → exit 0 in 11.71s; ThreatActorsPage chunk 31.03 kB / gzip 7.72 kB | PASS |

**Score:** 9/9 machine gate groups PASS at the code-complete commit (8405845, 2026-05-05).

## REQ Coverage (CAMP-01..06)

| Requirement | Description | Source Plan(s) | Code Location | Status |
|-------------|-------------|----------------|---------------|--------|
| CAMP-01 | Threat Actors page toolbar shows a pill toggle with "Threat Actors" and "Campaigns" buttons | 65-02 | `ThreatActorsPage.jsx` lines 190–205 (pill bar with two `.tab-item` buttons + D-06 verbatim labels) | code-complete (2026-05-05) — manual QA pending |
| CAMP-02 | Selecting "Campaigns" switches the page content to a paginated list of OpenCTI Campaign entities | 65-01 + 65-02 | API client `frontend/src/api/threat-campaigns.js` (Plan 01) + view-aware loadData/silentRefresh (page lines 32–89) + view-aware grid (page lines 295–315) | code-complete (2026-05-05) — manual QA pending |
| CAMP-03 | Active view reflected in URL via `?view=campaigns` query param (default `?view=actors` or no param) | 65-02 | View derivation at page line 30 (D-08 strict predicate) + handleViewChange writes `?view=` via setSearchParams (lines 137–143) | code-complete (2026-05-05) — manual QA pending |
| CAMP-04 | Refreshing the page restores the active view from the URL | 65-02 | View derivation at page line 30 runs every render — reads `searchParams.get('view')` directly; refresh re-runs the same derivation path | code-complete (2026-05-05) — manual QA pending |
| CAMP-05 | Each Campaign card displays: name, first_seen/last_seen date range, objective (if available), attributed_to chip(s) | 65-01 + 65-02 | `CampaignCard.jsx` lines 36–61 (4 fields with D-15/D-21/D-22/D-23 conditionals) + page Plan 02 grid wiring (line 300) | code-complete (2026-05-05) — manual QA pending |
| CAMP-06 | Clicking a Campaign card opens a detail modal with full campaign metadata (name, dates, objective, attribution, labels — no description per D-20) | 65-01 + 65-02 | `CampaignDetailModal.jsx` lines 23–146 (D-18 shell + D-19 5 sections + **D-20 zero description**) + page Plan 02 second `createPortal` (lines 331–341) | code-complete (2026-05-05) — manual QA pending |

**Score:** 6/6 in-scope CAMP requirements satisfied at code level. (CAMP-07/08 unchanged — Phase 60 backend, satisfied 2026-04-19.)

## SC1..SC5 Status

Each SC is annotated with verifier mode (code-verifiable now vs browser-only) and the exact probe used. Browser-only SCs route to `65-VALIDATION.md` for human walkthrough at `https://tip.aquasecure.ai/threat-actors`.

### SC1 — Toolbar shows pill toggle; clicking Campaigns switches content

**Verifier mode:** browser-only (visual confirmation of pill rendering + click-driven content swap requires DevTools / live page).

**Code-side probes (all PASS):**
- Toolbar contains two `.tab-item` buttons inside a `.tab-bar`: `grep -n "tab-bar !mb-0 !border-b-0 shrink-0" ThreatActorsPage.jsx` → line 190; `grep -c "className=\`tab-item " ThreatActorsPage.jsx` → 2 (active-state interpolation literal at lines 193 + 200).
- Pill labels are exactly `Threat Actors` and `Campaigns` (D-06 verbatim): `grep -c "^            Threat Actors$" ThreatActorsPage.jsx` = 1; `grep -c "^            Campaigns$" ThreatActorsPage.jsx` = 1.
- Click handler wired: `onClick={() => handleViewChange('campaigns')}` (line 201) + `handleViewChange` defined (line 135) + grid branches on `view === 'campaigns'` (line 298).
- `.tab-bar` and `.tab-item` classes exist in `frontend/src/styles/main.css` (verified — D-05 reuse is real, not a fake class reference).

**Status:** HUMAN_NEEDED — `65-VALIDATION.md §SC1`. Code-side every wire is intact; visual + interaction confirmation deferred.

### SC2 — Each Campaign card displays name + date range + objective + attributed-to chip

**Verifier mode:** browser-only (visual confirmation of chip layout + flag emoji absence + line-clamp behavior on objective requires the rendered DOM).

**Code-side probes (all PASS):**
- Name: `CampaignCard.jsx` line 36–38 (h3 with `font-sans text-base font-semibold text-text-primary` + `{campaign?.name}`).
- Date range: lines 22–29 (D-23 permutations: `Unknown date range` when both null, `?` for left null, `ongoing` for right null) + line 40–42 render (`font-mono text-xs text-text-muted`, em-dash `\u2014`).
- Objective conditional: line 44 `{campaign?.objective && ...}` short-circuits when null/empty — D-22 card variant (omits entirely, no placeholder).
- Attributed-to chips conditional: line 50 `{attributedTo.length > 0 && ...}` omits entire chip row when empty — D-21.
- Chip className verbatim D-15: line 55 byte-exact `inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-2 border border-border text-xs font-sans text-text-primary` (also present in CampaignDetailModal.jsx line 115 — same Phase 64 D-08 chip class).

**Status:** HUMAN_NEEDED — `65-VALIDATION.md §SC2`.

### SC3 — Refreshing `/threat-actors?view=campaigns` restores Campaigns view

**Verifier mode:** browser-only (URL state + browser refresh interaction requires the live page).

**Code-side probes (all PASS):**
- `view` derivation reads URL on every render: page line 30 `const view = searchParams.get('view') === 'campaigns' ? 'campaigns' : 'actors';` (D-08 strict predicate; junk values fall back to `actors`).
- Toggle writes URL: page line 139 `next.set('view', newView);` inside handleViewChange.
- No `useEffect` hydration step needed — `useSearchParams` from react-router-dom returns the current URL state synchronously on first render, so refresh trivially restores the view via the same derivation path.

**Status:** HUMAN_NEEDED — `65-VALIDATION.md §SC3` (includes the `?view=foo` junk-fallback edge probe).

### SC4 — Clicking a Campaign card opens detail modal with full metadata

**Verifier mode:** browser-only (modal open animation + Escape close + backdrop click + section rendering requires the live page).

**Code-side probes (all PASS):**
- Card onClick: `CampaignCard.jsx` line 33 `onClick={onClick}` on outer div, parent passes `() => setSelectedCampaign(c)` (page line 303).
- Modal portal: page lines 331–341 — second `createPortal(...document.body)` block (the first is for ThreatActorModal at lines 318–328) wraps `<AnimatePresence>` + conditional `<CampaignDetailModal campaign={selectedCampaign} onClose={() => setSelectedCampaign(null)} />`. `grep -c "createPortal(" ThreatActorsPage.jsx` = 2.
- Modal shell D-18: `CampaignDetailModal.jsx` lines 26–36 (Escape keydown + body overflow lock useEffect with cleanup) + lines 53–69 (Framer Motion backdrop + scale entry).
- Modal sections D-19: Header h2 (line 80) → Date row (line 84) → Objective always rendered with D-22 modal placeholder (lines 89–103) → Attribution section guarded by D-21 (lines 105–122) → Labels section guarded by D-19§5 (lines 124–142).
- **CRITICAL D-20:** `grep -c "description" frontend/src/components/threat-actors/CampaignDetailModal.jsx` → 0. No JSX render, no field access, no string token. Plan-typo override applied to the originally spec'd docstring text (which would have leaked the literal token); structural intent verified intact.

**Status:** HUMAN_NEEDED — `65-VALIDATION.md §SC4` (includes D-20 critical-gate manual visual check + Escape/backdrop close + empty-attribution section omission).

### SC5 — Toggle from filtered Actors view back to Campaigns resets search + pagination

**Verifier mode:** browser-only (URL transition + DevTools Network panel inspection of the new fetch's missing `?after=` and `?search=` params requires the live page).

**Code-side probes (all PASS):**
- handleViewChange resets URL: page lines 137–143 — single setSearchParams call sets `view` (line 139), deletes `search` (line 140), deletes `after` (line 141).
- Cursor history reset: page line 144 `setCursorHistory([])` (D-11).
- Search input remount: page line 215 `key={view}` on the `<input>` (D-10) — toggling unmounts/remounts, clearing the uncontrolled `defaultValue={search}`.
- Open modals closed on toggle (defensive UX): page lines 145–146 `setSelectedActor(null); setSelectedCampaign(null);` after the cursor reset.
- Active-pill click is a no-op: page line 136 `if (newView === view) return;` early return — `D-07`.
- Campaigns branch sends NO sort/order: page lines 39 + 71 `const params = {};` (D-26 — backend default `orderBy=modified&orderMode=desc` applies). `grep -c "const params = {};" ThreatActorsPage.jsx` = 2.

**Status:** HUMAN_NEEDED — `65-VALIDATION.md §SC5` (includes Network panel verification that the Campaigns fetch carries no stale Intrusion-Set cursor).

## Decision Honored Audit (load-bearing D-XX)

All 29 D-XX decisions from `65-CONTEXT.md` re-checked at code level. Load-bearing decisions called out by the verification objective listed first, then the rest as a tally.

| Decision | Probe | Status |
|----------|-------|--------|
| **D-12** verbatim API client body | `grep -q "export function fetchThreatCampaigns({ after, search, sort, order } = {})" threat-campaigns.js` PASS; body builds URLSearchParams identically with conditional sets for after/search/sort/order; total 13 lines | PASS |
| **D-15** chip className verbatim shared | `grep -lF "inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-2 border border-border text-xs font-sans text-text-primary"` returns BOTH `CampaignCard.jsx` (line 55) AND `CampaignDetailModal.jsx` (line 115) | PASS |
| **D-16** card outer container className verbatim | `CampaignCard.jsx` line 34: byte-exact `bg-surface border border-border rounded-xl p-5 hover:border-violet/40 transition-colors cursor-pointer` | PASS |
| **D-20** zero `description` field references in CampaignDetailModal.jsx | `grep -c "description" frontend/src/components/threat-actors/CampaignDetailModal.jsx` = 0 (verified 2026-05-05) | PASS (override applied to Plan 01 typo gate; source intent enforced verbatim) |
| **D-26** Campaigns sends NO sort/order params (Actors does) | `grep -c "const params = {};" ThreatActorsPage.jsx` = 2 (Campaigns loadData + silentRefresh); `grep -c "const params = { sort: 'modified', order: 'desc' };" ThreatActorsPage.jsx` = 2 (Actors loadData + silentRefresh) | PASS |
| **D-28** zero CSS edits across phase | `git diff --stat ad489fb^..HEAD -- frontend/src/styles/` empty | PASS |
| **D-29** zero new deps across phase | `git diff --stat ad489fb^..HEAD -- frontend/package.json frontend/package-lock.json` empty | PASS |
| D-01 (extract Campaign UI to separate files — 3 new files) | All 3 files exist (`threat-campaigns.js` 13 lines, `CampaignCard.jsx` 64 lines, `CampaignDetailModal.jsx` 146 lines) | PASS |
| D-02 (ThreatActorsPage.jsx becomes parent route, post-edit ≤1500) | 1073 lines, 71% headroom under hard cap | PASS |
| D-03 (no new route, query-param only) | No new entries in App.jsx routes; `useSearchParams` reads/writes `?view=` only | PASS |
| D-04 (mobile stack via flex-col → md:flex-row) | Page line 188: `flex flex-col md:flex-row md:items-center gap-3` | PASS |
| D-05 (`.tab-bar` / `.tab-item` reuse with overrides) | Page line 190: `tab-bar !mb-0 !border-b-0 shrink-0` (overrides preserve flex layout, suppress underline + bottom margin); main.css contains both classes | PASS |
| D-06 (pill labels exact strings) | `grep -c "^            Threat Actors$"` = 1; `grep -c "^            Campaigns$"` = 1 | PASS (override applied to Plan 02 multi-line JSX grep gate; structural intent verified) |
| D-07 (active-pill no-op) | Page line 136: `if (newView === view) return;` | PASS |
| D-08 (`view === 'campaigns'` strict predicate single source of truth) | Page line 30: byte-exact predicate; junk values fall back to `'actors'` | PASS |
| D-09 (handleViewChange single setSearchParams sets view + deletes search/after) | Page lines 137–143: 3 mutations inside one updater closure | PASS |
| D-10 (search input `key={view}` remount) | Page line 215: `key={view}` on `<input>` | PASS |
| D-11 (cursorHistory reset to []) | Page line 144: `setCursorHistory([])` | PASS |
| D-13 (Phase 60 response shape consumed verbatim) | Page line 44 + 75: `setItems(response.data || [])` + `setPagination(response.pagination || null)` — Phase 60 envelope `{data, pagination}` parsed without adapter | PASS |
| D-14 (no enrichment endpoint for Campaigns) | `grep -c "fetchCampaignEnrichment\|/api/threat-campaigns/.+/enrichment" CampaignDetailModal.jsx` = 0; modal renders straight from prop | PASS |
| D-17 (content-driven card height) | `grep -E "h-\\d+\|min-h-\\d+\|max-h-\\d+" CampaignCard.jsx` = 0 | PASS |
| D-18 (modal shell mirrors ThreatActorModal) | Escape useEffect (lines 26–36) + Framer Motion shell (lines 53–69) + body overflow lock (line 31) + cleanup (lines 33–34) | PASS |
| D-19 (5 modal sections in order) | Lines 79–142: Header → Date → Objective → Attribution → Labels (verified by section comment markers) | PASS |
| D-21 (omit attribution when empty — card AND modal) | CampaignCard.jsx line 50 (`{attributedTo.length > 0 && ...}`); CampaignDetailModal.jsx line 106 (`{attributedTo.length > 0 && ...}`) | PASS |
| D-22 (objective null handling differs card vs modal) | Card omits paragraph entirely (line 44 short-circuit); Modal renders `No objective specified.` placeholder (line 99–101) | PASS |
| D-23 (date null permutations) | Both files lines 22–29 / 43–50: `Unknown date range` / `?` / `ongoing` permutations | PASS |
| D-24 (loading skeleton reuse) | Page lines 275–279: `<SkeletonCard count={8} />` shared across both views | PASS |
| D-25 (error fallback reuse with contextual copy) | Page lines 57–60: `view === 'campaigns' ? 'Unable to load campaigns...' : 'Unable to load threat actors...'` | PASS |
| D-27 (file boundaries — 3 new + 1 modified + REQUIREMENTS prose patch) | `git diff --name-only ad489fb^..HEAD -- frontend/` = exactly the 4 specified files; REQUIREMENTS.md patched in commit 05232fc per D-20 | PASS |

**Score:** 29/29 decisions honored (3 with documented overrides accepted in frontmatter — see §Documented Deviations).

## Documented Deviations

### Plan 01 Task 3 docstring rephrase (D-20 grep gate vs verbatim file body)

**Disposition:** Accepted — override entry recorded in frontmatter.

Plan 01's `<action>` body for `CampaignDetailModal.jsx` (Task 3) specified a verbatim file body that included a docstring line literally mentioning the forbidden D-20 token. That literal text would have caused the same plan's strict acceptance gate `grep -c "description" CampaignDetailModal.jsx = 0` to fail (returning `1` for the docstring match), even though the rule itself — no JSX render of `description`, no field access, no user-visible reference — was perfectly enforced by the structural body.

- Resolution applied per `<deviation_protocol>` Rule 1 (plan typo, fix code to satisfy stricter gate): docstring rephrased to `D-20 enforcement: no prose field rendered — Phase 60 payload omits that field.` (line 21 of the file)
- Documented in `65-01-SUMMARY.md` §Deviations (commit `97cfcd9`)
- Re-verified at code-complete commit + at this verification timestamp: `grep -c "description" CampaignDetailModal.jsx` → **0**
- Zero impact on user-visible behavior; comment-only edit outside the JSX/JS structural body
- Same posture as Phase 64's `Map → MapIcon` documented Rule 1 deviation — both are mechanical reconciliations between an over-strict plan grep gate and the spec'd file body, not behavioral compromises

### Plan 02 Task 1 multi-line JSX vs `>Threat Actors<` inline-grep gate

**Disposition:** Accepted — override entry recorded in frontmatter.

Plan 02's `<action>` Edit 5 spec formats the toolbar pill buttons across multiple lines (`<button ...>` open tag, label on its own indented line, `</button>` close on the next line). The plan's parallel acceptance gate `grep -qF ">Threat Actors<" ThreatActorsPage.jsx` (and the matching `>Campaigns<`) was written assuming inline JSX (`<button>Threat Actors</button>`) and cannot match across lines.

- Resolution applied per `<deviation_protocol>` Rule 2 (plan grep typo, satisfy structural intent): structural intent (D-06 verbatim pill labels rendered inside the two `.tab-item` buttons) verified via `grep -c "^            Threat Actors$"` = 1 + `grep -c "^            Campaigns$"` = 1 (matching the labels at the expected JSX nesting depth)
- Documented in `65-02-SUMMARY.md` §Deviations (commit `fd87632`)
- No source code change needed — the labels are correct as authored by the plan's `<action>` block
- Same nature as the Plan 03 `[x] CAMP-0` over-strict regex deviation (below) — gate-vs-source mismatch, not a behavior gap

### Plan 03 Task 2 `[x] CAMP-0` regex over-strict (CAMP-07/08 also match)

**Disposition:** Accepted — override entry recorded in frontmatter.

Plan 03's verification predicate `grep -c '^- \[x\] \*\*CAMP-0' .planning/REQUIREMENTS.md = 6` assumed the universe of `CAMP-0X` requirements was 1..6 only. Actual count is **8** because CAMP-07/CAMP-08 (already shipped Phase 60 on 2026-04-19, also marked `[x]`) ALSO match the regex.

- Resolution applied per `<deviation_protocol>` Rule 2: replaced the over-strict universal `[x] CAMP` count with the more precise predicate `grep -c "code-complete Phase 65 (2026-05-05)" .planning/REQUIREMENTS.md` returning exactly **6** (the suffix is unique to this plan; CAMP-07/08 use a different `satisfied Phase 60 (2026-04-19)` suffix)
- Negative-side check: `grep -c '^- \[ \] \*\*CAMP-' .planning/REQUIREMENTS.md` = 0 (zero CAMP requirements remain unchecked)
- Traceability table check: `grep -c "| CAMP-0[1-6] | Phase 65 | Code-complete" .planning/REQUIREMENTS.md` = 6
- Documented in `65-03-SUMMARY.md` §Deviations (commit `8405845`)
- Phase 64 VICTM rows untouched (verified via per-line diff)

## Anti-Pattern Scan

Ran on the four Phase 65 source files (the only files modified by this phase):

| Pattern | Files Scanned | Result | Notes |
|---------|---------------|--------|-------|
| TODO/FIXME/XXX/HACK/PLACEHOLDER comments | All 4 | None inside Phase 65-added blocks | No outstanding stub markers in API client, card, modal, or page edits |
| Empty implementations (`return null`, `=> {}`) | All 4 | None inside Phase 65-added blocks | All conditionals return real JSX (chip list / section card / view-aware grid branch) |
| Hardcoded empty data | All 4 | None inside Phase 65-added blocks | All chip lists map over `attributedTo` / `labels` arrays sourced from Phase 60 backend payload via `apiClient.get('/api/threat-campaigns')` |
| Hardcoded empty props | All 4 | None | No `<CampaignCard campaign={[]} />` or `<CampaignDetailModal campaign={null} />` style hollow-prop pattern; `selectedCampaign` populated from a real `setSelectedCampaign(c)` call wired to a click handler over `items` (page line 303) |
| Console.log only handlers | All 4 | None | No `console.log` in any of the Phase 65 inserted blocks |
| `description` field references in CampaignDetailModal | CampaignDetailModal.jsx | 0 matches | D-20 critical gate — verified 2026-05-05 |

All clean. The card, modal, and page wiring all consume real backend data via the established `items` / `selectedCampaign` state populated by `fetchThreatCampaigns()` calls (page lines 42 + 74).

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Real Data | Status |
|----------|---------------|--------|-----------|--------|
| Campaigns grid (`ThreatActorsPage.jsx` lines 295–315) | `items` + `view === 'campaigns'` branch | `fetchThreatCampaigns(params)` (page lines 42 + 74) → `setItems(response.data \|\| [])` (lines 44 + 75) | Yes — Phase 60 `IndexController` returns the live OpenCTI Campaigns payload via `ThreatCampaignService::list()` (15-min cached, satisfied 2026-04-19) | FLOWING |
| `<CampaignCard campaign={c} />` (page line 300) | `c` (each item from `items`) | Same upstream as above | Yes — each card is fed a real OpenCTI Campaign object with `id`, `name`, `objective`, `first_seen`, `last_seen`, `attributed_to`, `labels` per D-13 / Phase 60 contract | FLOWING |
| `<CampaignDetailModal campaign={selectedCampaign} />` (page line 334) | `selectedCampaign` | `setSelectedCampaign(c)` triggered by `<CampaignCard onClick>` (page line 303) — `c` is the same real-data item from `items` | Yes — modal renders straight from prop per D-14 (no second fetch); the prop is the same Phase 60 payload object | FLOWING |
| Pagination state | `pagination` | `setPagination(response.pagination \|\| null)` (page lines 45 + 76) — Phase 60 envelope `{ has_next, has_previous, end_cursor, page_size, total }` | Yes — pagination chip drives `handleNext` / `handlePrevious` against `pagination.end_cursor` (page lines 149 + 156) | FLOWING |
| Loading skeleton | `loading` | `setLoading(true)` (line 33) → `setLoading(false)` (line 64) wrapping the real fetch | Yes — actual loading state from real fetch promise chain | FLOWING |

No hollow-prop or static-fallback patterns. Data path is `Phase 60 backend (/api/threat-campaigns) → fetchThreatCampaigns → response.data → items state → <CampaignCard> grid → setSelectedCampaign onClick → <CampaignDetailModal>`.

## Behavioral Spot-Checks

Phase 65 is a frontend-only React/JSX phase against an already-shipped backend (Phase 60). The only runnable entry point inside this phase's scope is the Vite build itself, which is covered by Gate 9 of the machine audit.

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Vite build exits 0 | `cd frontend && npm run build` | exit 0, 11.71s, ThreatActorsPage chunk 31.03 kB / gzip 7.72 kB | PASS |
| API client module is importable + exports `fetchThreatCampaigns` | (deferred — running an isolated Node import would require ESM tooling beyond the project's no-test-suite scope) | n/a | SKIP — covered structurally by Vite build resolving the import at page line 7 with no error |
| Page module renders without crashing | (deferred — no test framework configured per CLAUDE.md "No tests exist") | n/a | SKIP — covered structurally by Vite build resolving the page module without unresolved imports / syntax errors |
| Campaigns endpoint returns non-empty data | (deferred — would require live backend + paid-plan auth cookie; backend is feature-gated per CAMP-07) | n/a | SKIP — routes to manual QA (`65-VALIDATION.md §SC2` Network-panel inspection on live deploy) |

## File-Size Hygiene (CLAUDE.md Caps)

CLAUDE.md soft cap: 800 lines. Hard cap: 1500 lines.

| File | Lines | Cap Headroom | Status |
|------|-------|--------------|--------|
| `frontend/src/pages/ThreatActorsPage.jsx` | 1073 | 427 lines under hard cap (71% utilization) | OK — within the planning estimate of "1100–1150 lines (well under 1500-line hard cap)" from CONTEXT.md D-02; over soft cap by 273 lines, but the page is the parent route hosting BOTH ThreatActorCard + ThreatActorModal + the new CampaignCard wiring — D-02 explicitly accepts this trade-off |
| `frontend/src/components/threat-actors/CampaignCard.jsx` | 64 | 1436 lines under hard cap | OK — well under soft cap |
| `frontend/src/components/threat-actors/CampaignDetailModal.jsx` | 146 | 1354 lines under hard cap | OK — well under soft cap |
| `frontend/src/api/threat-campaigns.js` | 13 | 1487 lines under hard cap | OK — minimal API client per D-12 |

**Total Phase 65 source-line delta:** +310 lines (+223 new files Plan 01 + +87 net Plan 02 page edit), zero deletions of existing files.

## Manual QA Handoff

The 5 ROADMAP success criteria require browser/DevTools verification against the live deploy. Per Phase 61/62/63/64 ship pattern, manual QA is captured in a sibling `*-VALIDATION.md` file with reproducible scenarios + a 7-checkbox sign-off section.

**Manual QA checklist:** `.planning/phases/65-frontend-campaigns-toggle/65-VALIDATION.md` (178 lines, committed in `3704aa3`)

| SC | Scenario | QA Doc Section |
|----|----------|----------------|
| SC1 | Pill toggle visible with exactly two `.tab-item` buttons labelled `Threat Actors` and `Campaigns`; clicking Campaigns swaps the page content | `65-VALIDATION.md §SC1` |
| SC2 | Each Campaign card displays name + date range + (optional) objective + (optional) attribution chip(s) per D-15 / D-22 / D-23 | `65-VALIDATION.md §SC2` |
| SC3 | URL reflects active view via `?view=campaigns`; refreshing the page restores the active view; junk `?view=foo` falls back to Actors view per D-08 | `65-VALIDATION.md §SC3` |
| SC4 | Clicking a Campaign card opens a detail modal with all 5 D-19 sections (with D-21/D-22/D-19§5 omission rules); **D-20 critical gate**: NO `description` field anywhere; Escape + backdrop click both close the modal | `65-VALIDATION.md §SC4` |
| SC5 | Toggling from `?search=apt&after=<cursor>` Actors view to Campaigns resets URL to `?view=campaigns` (no stale Intrusion-Set cursor sent to Campaigns API); Network panel confirms Campaigns fetch carries no `?after=` / `?search=` / `?sort=` / `?order=` params | `65-VALIDATION.md §SC5` |

**Live URL:** https://tip.aquasecure.ai/threat-actors

**Pre-requisites:** Logged-in account on a paid plan tier (Campaigns endpoint is feature-gated per CAMP-07; free tier returns 403 — confirmed in Phase 60).

The phase is considered SHIPPED when all 7 sign-off checkboxes in `65-VALIDATION.md §Sign-off` are ticked (5 SCs + edge cases + final approval) and the human commits the updated VALIDATION.md.

## Phase-Wide Git Scope Summary

| # | Commit | Plan | Type | Files Touched |
|---|--------|------|------|----------------|
| 1 | `06b9fbc` | — | docs | `.planning/phases/65-frontend-campaigns-toggle/65-CONTEXT.md` |
| 2 | `660233b` | — | docs | `.planning/phases/65-frontend-campaigns-toggle/65-0{1,2,3}-PLAN.md` |
| 3 | `041463e` | — | docs | `.planning/STATE.md` |
| 4 | `ad489fb` | 65-01 | feat | `frontend/src/api/threat-campaigns.js` (new, 13 lines) |
| 5 | `bc456a3` | 65-01 | feat | `frontend/src/components/threat-actors/CampaignCard.jsx` (new, 64 lines) |
| 6 | `97cfcd9` | 65-01 | feat | `frontend/src/components/threat-actors/CampaignDetailModal.jsx` (new, 146 lines) |
| 7 | `66ea66d` | 65-01 | docs | `.planning/phases/65-frontend-campaigns-toggle/65-01-SUMMARY.md` |
| 8 | `253eb73` | 65-02 | feat | `frontend/src/pages/ThreatActorsPage.jsx` (+58/-15) |
| 9 | `44759ea` | 65-02 | feat | `frontend/src/pages/ThreatActorsPage.jsx` (+41/-18) |
| 10 | `0dcf0ab` | 65-02 | feat | `frontend/src/pages/ThreatActorsPage.jsx` (+31/-10) |
| 11 | `fd87632` | 65-02 | docs | `.planning/phases/65-frontend-campaigns-toggle/65-02-SUMMARY.md` |
| 12 | `05232fc` | 65-03 | docs | `.planning/REQUIREMENTS.md` + `.planning/ROADMAP.md` (CAMP-01..06 [x] flip + D-20 prose patches) |
| 13 | `3704aa3` | 65-03 | docs | `.planning/phases/65-frontend-campaigns-toggle/65-VALIDATION.md` (new, 178 lines) |
| 14 | `8405845` | 65-03 | docs | `.planning/phases/65-frontend-campaigns-toggle/65-03-SUMMARY.md` |

**Frontend source files touched across the entire phase:** exactly 4 (3 new + 1 modified) — D-27 honored.
**CSS file edits:** 0 — D-28 honored.
**New deps:** 0 — D-29 honored (`package.json` + `package-lock.json` byte-identical pre/post phase).
**Page line count:** 1073 < 1500 — CLAUDE.md hard cap honored.

(Note: An unrelated infra commit `b75f272 fix(infra): raise PHP-FPM pm.max_children from 5 to 30` landed between 65-01 Tasks 2 and 3. It does NOT touch any frontend file and does not affect Phase 65 verification gates.)

## Verdict

- **Code completeness:** verified — 9/9 machine gate groups PASS, 6/6 in-scope CAMP requirements satisfied at code level, 29/29 D-XX decisions honored (3 with documented overrides accepted via frontmatter for plan-vs-gate typos).
- **Manual QA:** pending — SC1..SC5 require browser/DevTools verification against live deploy per `65-VALIDATION.md`.
- **Architectural constraints:** verified — 4-file scope (D-27), zero CSS edits (D-28), zero new deps (D-29), file-size cap honored (1073 < 1500), v6.1 hook-lock preserved, Phase 60 backend contract consumed verbatim.
- **Status:** `human_needed` — same posture as Phase 61/62/63/64 at code-complete time. Phase ships when the human ticks the 7 sign-off boxes in `65-VALIDATION.md`.

---

_Verified: 2026-05-05_
_Verifier: Claude (gsd-verifier, Opus 4.7 1M context)_
