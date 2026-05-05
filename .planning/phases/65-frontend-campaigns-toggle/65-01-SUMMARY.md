---
phase: 65-frontend-campaigns-toggle
plan: 01
subsystem: frontend/threat-actors
type: execute
wave: 1
status: complete
completed: 2026-05-05
tags:
  - threat-actors
  - campaigns
  - api-client
  - card-component
  - modal-component
  - scaffold
requirements:
  - CAMP-02 (partial — components scaffolded; rendering wired in Plan 02)
  - CAMP-05 (code-complete — card renders all D-15 fields with D-21/D-22/D-23 conditionals)
  - CAMP-06 (code-complete — modal renders all D-19 sections with D-21/D-19§5 omission, D-20 enforced)
dependency_graph:
  requires:
    - frontend/src/api/client.js (apiClient.get)
    - frontend/src/hooks/useFormatDate.js (date formatting)
    - framer-motion (existing dep)
    - lucide-react (existing dep)
    - .planning/phases/60-backend-campaigns-service-endpoint/ (Phase 60 backend GET /api/threat-campaigns — shipped)
  provides:
    - fetchThreatCampaigns({ after, search, sort, order }) — named export from frontend/src/api/threat-campaigns.js
    - CampaignCard ({ campaign, onClick }) — default export from frontend/src/components/threat-actors/CampaignCard.jsx
    - CampaignDetailModal ({ campaign, onClose }) — default export from frontend/src/components/threat-actors/CampaignDetailModal.jsx
  affects: []
tech-stack:
  added: []
  patterns:
    - Thin per-resource API client mirroring threat-actors.js
    - Default-export functional component with optional-chain defensive guards
    - Framer Motion modal shell mirroring ThreatActorModal (backdrop + motion + Escape + body overflow lock)
    - Tailwind utility-only styling (no new CSS files)
    - D-15 / Phase 64 D-08 chip className verbatim shared between card + modal (inline JSX, no helper extraction)
key-files:
  created:
    - frontend/src/api/threat-campaigns.js (13 lines)
    - frontend/src/components/threat-actors/CampaignCard.jsx (64 lines)
    - frontend/src/components/threat-actors/CampaignDetailModal.jsx (146 lines)
  modified: []
decisions:
  - D-12 verbatim — fetchThreatCampaigns body byte-faithful mirror of fetchThreatActors (only function name + URL path differ)
  - D-15/D-16/D-17/D-21/D-22/D-23 — CampaignCard renders name + date range + conditional objective + conditional attribution chips
  - D-18/D-19/D-20/D-21/D-19§5/D-23 — CampaignDetailModal renders 5 sections with D-20 zero-description enforcement
  - Modal sized as max-w-3xl max-h-[90vh] (smaller than ThreatActorModal's max-w-4xl h-[95vh]) — Claude's-discretion polish call (Campaigns have less content)
  - Shared <CampaignChip> extraction DECLINED — two callers with identical inline JSX is below the project's extraction threshold (CLAUDE.md "many small files" rule applied with judgment per CONTEXT.md "Single-caller extraction is project anti-pattern" guidance)
metrics:
  tasks: 3
  commits: 3 (task) + 1 (summary)
  files_added: 3
  files_modified: 0
  net_lines: +223 (13 + 64 + 146)
  vite_build_duration: 33.11s (Vite reported) / 35s (wall)
  vite_build_status: green (exit 0)
---

# Phase 65 Plan 01: Frontend Campaigns Toggle — Components & API Client Summary

Wave 1 of Phase 65 — three new files scaffolded with zero edits to existing source: `frontend/src/api/threat-campaigns.js` (13 lines) thin API client mirroring `threat-actors.js` byte-faithfully, `frontend/src/components/threat-actors/CampaignCard.jsx` (64 lines) clickable card with conditional objective + attribution chip rendering per D-21/D-22/D-23, and `frontend/src/components/threat-actors/CampaignDetailModal.jsx` (146 lines) Framer Motion modal mirroring ThreatActorModal's shell with 5 sections per D-19 and zero `description` field references per D-20. Plan 02 will import all three from these stable contracts.

## Files Created

| File | Lines | Purpose |
|------|-------|---------|
| `frontend/src/api/threat-campaigns.js` | 13 | Thin API client — `fetchThreatCampaigns({ after, search, sort, order })` GETs `/api/threat-campaigns` via shared `apiClient` (D-12 verbatim) |
| `frontend/src/components/threat-actors/CampaignCard.jsx` | 64 | Single Campaign card — name + date range + conditional objective + conditional attribution chips (D-15, D-16, D-17, D-21, D-22, D-23) |
| `frontend/src/components/threat-actors/CampaignDetailModal.jsx` | 146 | Full Campaign detail modal — Framer Motion backdrop + Escape + body overflow lock + 5 sections (D-18, D-19, D-20, D-21, D-19§5, D-23) |

**Total net delta:** +223 lines, 0 deletions, 0 modifications to existing files.

## Directory Created

`frontend/src/components/threat-actors/` did NOT exist pre-plan (orchestrator-verified). Writing `CampaignCard.jsx` in Task 2 implicitly created the directory; `CampaignDetailModal.jsx` in Task 3 was placed in the same directory.

```bash
$ test -d frontend/src/components/threat-actors && echo "PASS: directory exists"
PASS: directory exists
```

## Commits

| # | Hash | Message | File |
|---|------|---------|------|
| 1 | `ad489fb` | `feat(65-01): add threat-campaigns API client (CAMP-02 scaffold)` | `frontend/src/api/threat-campaigns.js` |
| 2 | `bc456a3` | `feat(65-01): add CampaignCard component (CAMP-05)` | `frontend/src/components/threat-actors/CampaignCard.jsx` |
| 3 | `97cfcd9` | `feat(65-01): add CampaignDetailModal component (CAMP-06)` | `frontend/src/components/threat-actors/CampaignDetailModal.jsx` |

Note: An unrelated infra commit `b75f272 fix(infra): raise PHP-FPM pm.max_children from 5 to 30` landed between Tasks 2 and 3. It does NOT touch any frontend file and does not affect Plan 65-01 verification gates (verified by per-file `git log` over the plan range).

## D-20 Enforcement (Critical Gate)

D-20 mandates ZERO `description` field references in `CampaignDetailModal.jsx` (Phase 60 backend payload omits the field; CAMP-06's prose is patched in Plan 03 Task 2).

```bash
$ grep -c "description" frontend/src/components/threat-actors/CampaignDetailModal.jsx
0
```

**PASS** — D-20 enforced. The modal's docstring rephrases the rule as "D-20 enforcement: no prose field rendered — Phase 60 payload omits that field" rather than naming the forbidden token literally; this is the cleanest way to keep the meta-comment without violating the grep gate. See `## Deviations` below.

## ThreatActorsPage.jsx Untouched

Plan 02 owns the page wiring; Plan 01 must NOT touch `ThreatActorsPage.jsx`.

```bash
$ git log --oneline ad489fb^..HEAD -- frontend/src/pages/ThreatActorsPage.jsx
(empty)
```

**PASS** — zero commits in the Plan 01 range modify `ThreatActorsPage.jsx`.

## D-28 No CSS Edits / D-29 No New Dependencies

```bash
$ git log --oneline ad489fb^..HEAD -- frontend/src/styles/
(empty)
$ git log --oneline ad489fb^..HEAD -- frontend/package.json frontend/package-lock.json
(empty)
```

**PASS** — D-28 (zero CSS file edits) and D-29 (zero new dependencies) both honored.

## D-15 Chip className — Present in BOTH Card and Modal

Verbatim from Phase 64 D-08, re-used per Phase 65 D-15:

```
inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-2 border border-border text-xs font-sans text-text-primary
```

```bash
$ grep -lF "inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-2 border border-border text-xs font-sans text-text-primary" \
    frontend/src/components/threat-actors/CampaignCard.jsx \
    frontend/src/components/threat-actors/CampaignDetailModal.jsx
frontend/src/components/threat-actors/CampaignCard.jsx
frontend/src/components/threat-actors/CampaignDetailModal.jsx
```

**PASS** — both files include the verbatim chip className. Helper extraction declined (see Decisions below).

## Vite Build

```bash
$ cd frontend && npm run build
...
dist/assets/ThreatActorsPage-CxVMmL28.js     26.08 kB │ gzip: 7.00 kB
...
✓ built in 33.11s
```

**PASS** — exit 0. Wall-clock duration ~35s (Vite reported 33.11s). Within the Phase 64 sampled range (~25–35s).

## Requirement Coverage

- **CAMP-02** (Campaigns view exists): **partial** — components + API client scaffolded; full satisfaction lands in Plan 02 when the page imports + renders them.
- **CAMP-05** (card fields): **code-complete at component level** — `CampaignCard` renders name, date range, conditional objective, conditional attribution chips per D-15. User-visible after Plan 02.
- **CAMP-06** (detail modal): **code-complete at component level** — `CampaignDetailModal` renders all 5 sections per D-19 with D-21/D-19§5 omission rules; D-20 grep gate returns 0 (zero `description` references). User-visible after Plan 02.

**Not addressed in this plan (Plan 02 territory):**
- CAMP-01 (toolbar pill toggle)
- CAMP-03 (URL state via `?view=campaigns`)
- CAMP-04 (refresh restoration of view state)

## Deviations

### Documented Plan-vs-Gate Reconciliation: D-20 Docstring Rephrase

**Found during:** Task 3.

**Issue:** The plan's `<action>` block for Task 3 specifies a verbatim file body that includes the docstring line `* NO \`description\` field rendered (D-20) — Phase 60 payload does not include it.`. That literal text causes `grep -c "description" CampaignDetailModal.jsx` to return 1, which violates the plan's own `<acceptance_criteria>` line: *"`grep -c "description" frontend/src/components/threat-actors/CampaignDetailModal.jsx` returns 0 (NO `description` field rendered, mentioned, or referenced anywhere — case-sensitive, all forms)"*. The acceptance gate is intentionally strict (case-sensitive, all forms — including comments).

**Resolution applied (per `<deviation_protocol>` Rule 1 — plan typo, fix code to satisfy stricter gate):** Rephrased the docstring line to `* D-20 enforcement: no prose field rendered — Phase 60 payload omits that field.` This preserves the meta-comment about the rule (developer ergonomics) while satisfying the strict grep gate. The rule itself is enforced in code: there is no JSX render, no field access, and no string reference to `campaign.description` anywhere in the file.

**Files modified:** `frontend/src/components/threat-actors/CampaignDetailModal.jsx` (docstring line 21 only — outside the structural body).

**Commit:** `97cfcd9` (single commit captures both the verbatim body and the docstring rephrase — no separate plan-amendment commit was needed since the rephrase is purely a comment).

**Verification:** `grep -c "description" CampaignDetailModal.jsx` → `0`. PASS.

## Claude's-Discretion Calls (per CONTEXT.md allowance)

1. **Shared `<CampaignChip>` helper extraction — DECLINED.** Two callers (CampaignCard attribution chip + CampaignDetailModal attribution chip) use identical inline JSX with the verbatim D-15 chip className. CONTEXT.md explicitly flags this as "borderline" but defers to project convention: "Single-caller extraction is project anti-pattern, but two callers with identical chip markup is borderline — planner's call." Decision: **inline both**. Reasoning: the chip is 4 lines of JSX; extracting to a helper would add a new file (`CampaignChip.jsx`) + 2 import lines + 2 invocations, netting more code than it removes. The Labels chips in the modal are NOT identical to attribution chips (different className: `inline-flex items-center px-2.5 py-1 rounded text-xs font-mono text-text-primary` vs the rounded-full pill), so a generic chip wrapper would need props anyway. Phase 66 polish phase can revisit if a third caller emerges.

2. **Modal size — `max-w-3xl max-h-[90vh]` (vs ThreatActorModal's `max-w-4xl h-[95vh]`).** Campaigns carry less content than enriched Threat Actors (no tabs, no TTPs, no relationships graph, no attack-pattern grid — just name + date + objective + attribution + labels). A wider modal would visually under-fill. CONTEXT.md "Subtle hover affordance variations" allowance covers this kind of polish call. The shell pattern (motion props, Escape handler, body overflow lock, X close button position) mirrors ThreatActorModal verbatim per D-18 — only the wrapper card geometry differs.

3. **Modal Objective section heading style — `text-xs font-sans text-text-muted uppercase tracking-wider mb-1.5`.** D-19 §3 specifies "render `<h3>Objective</h3>` + paragraph" but doesn't pin the className. Adopted the project's existing section-heading convention from ThreatActorModal (uppercase tracking-wider muted small-caps style — visually distinct from body copy without competing with the `<h2>` campaign name above). Same className applied to "Attributed to" and "Labels" headings for visual consistency across the three optional sections.

## Self-Check

**Files exist:**
- FOUND: `frontend/src/api/threat-campaigns.js`
- FOUND: `frontend/src/components/threat-actors/CampaignCard.jsx`
- FOUND: `frontend/src/components/threat-actors/CampaignDetailModal.jsx`

**Commits exist:**
- FOUND: `ad489fb` (Task 1 — API client)
- FOUND: `bc456a3` (Task 2 — CampaignCard)
- FOUND: `97cfcd9` (Task 3 — CampaignDetailModal)

**Critical gates:**
- D-20 `grep -c "description" CampaignDetailModal.jsx` → 0 — PASS
- ThreatActorsPage.jsx untouched (`git log ad489fb^..HEAD -- frontend/src/pages/ThreatActorsPage.jsx` empty) — PASS
- D-28 no CSS edits (`git log ad489fb^..HEAD -- frontend/src/styles/` empty) — PASS
- D-29 no new deps (`git log ad489fb^..HEAD -- frontend/package.json frontend/package-lock.json` empty) — PASS
- D-15 chip className present in BOTH card and modal — PASS
- Vite build green (33.11s, exit 0) — PASS

## Self-Check: PASSED
