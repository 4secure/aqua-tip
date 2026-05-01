# Phase 64: Frontend Victimology Tab — Context

**Gathered:** 2026-05-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the thin `Campaigns` tab in the Threat Actor detail modal with a `Victimology` tab. The new tab renders four sections — Targeted Countries, Regions, Sectors, Organizations — sourced from the existing `victimology` payload that Phase 59's backend already provides inside the actor enrichment response. Tab-bar count goes from 5 (Overview, Relationships, TTPs, Tools, Campaigns) to 5 (Overview, Relationships, TTPs, Tools, Victimology) — Campaigns moves to the standalone Phase 65 toggle on the parent page.

**In scope:** VICTM-01..VICTM-08 (frontend tab swap, four-section render, country flags, empty states, fetch strategy).
**Out of scope:** VICTM-09 (backend — already shipped in Phase 59); CAMP-* (Phase 65 — standalone Campaigns view); any modification to the enrichment GraphQL query.

</domain>

<decisions>
## Implementation Decisions

### Fetch Strategy
- **D-01:** Eager + single payload. Re-use the existing `fetchThreatActorEnrichment(actor.id)` call that fires once on `actor.id` change (line 543 of `frontend/src/pages/ThreatActorsPage.jsx`). The enrichment response already contains `victimology: { countries, regions, sectors, organizations }` from Phase 59 — no extra round-trip needed. SC4 ("enrichment is fetched once on modal open and cached in component state") wins over VICTM-07 ("lazy-fetched only when the user opens the Victimology tab"). Rationale: VICTM-07 was written before the Phase 59 backend was finalized — the data is already in the modal's existing payload, so a separate lazy fetch would add a second round-trip + new state plumbing for zero user benefit. Acceptance probe for SC4 (no additional network requests when switching tabs) still holds — there's literally only one request.

### Tab Bar
- **D-02:** Replace the `'campaigns'` entry in the `TABS` array (line 555 of `ThreatActorsPage.jsx`) with `{ key: 'victimology', label: 'Victimology', icon: <see D-09> }`. Tab order becomes Overview → Relationships → TTPs → Tools → Victimology (Victimology is the last/right-most tab — same slot Campaigns occupied). Delete the entire `{activeTab === 'campaigns' && ...}` block (lines 829–862) wholesale.
- **D-03:** Reset `activeTab` to `'overview'` on `actor.id` change (existing behavior at line 542 — keep verbatim). Do NOT default to `'victimology'` even though it's the new flagship tab — Overview is the canonical entry point per existing pattern.

### Section Layout
- **D-04:** 2×2 CSS grid on desktop (`grid grid-cols-1 md:grid-cols-2 gap-4`), single column on mobile. Each cell holds one section. The four sections appear in fixed order: Countries (top-left), Regions (top-right), Sectors (bottom-left), Organizations (bottom-right). Rationale: 2×2 keeps all four sections visible above the fold for major actors at 4xl modal width and avoids accordion-click friction.
- **D-05:** Each section is its own card (`bg-surface-2/50 border border-border rounded-lg p-4`) with a section header showing label + count (e.g., `"Targeted Countries (12)"`). Header uses existing `font-sans text-sm font-medium text-text-primary` token combo seen on other tabs.

### Country Flag Rendering
- **D-06:** Emoji from ISO-2 `country_code`. Convert with the standard regional-indicator math: `String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65))`. Inline helper at module scope, ~5 lines, zero deps. Falls back to no flag (name-only chip) when `country_code` is `null` — backend already returns `null` for countries where the OpenCTI alias list contains no ISO-2 entry (per Phase 59 `extractIsoCode` contract).
- **D-07:** No flag library, no SVG sprite — keep zero-dep philosophy from CLAUDE.md.

### Item Rendering
- **D-08:** Compact chip (rounded pill) per entry. Style: `inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-2 border border-border text-xs font-sans text-text-primary`. Chips wrap inside their section card via `flex flex-wrap gap-2`.
  - **Country chip:** `<flag-emoji> <name>` (or just `<name>` when no flag)
  - **Region chip:** `<name>` only
  - **Sector chip:** `<name>` only — no per-sector icon (sticking with chip-name simplicity beats mapping every OpenCTI sector to an icon)
  - **Organization chip:** `<name>` only
- **D-09:** Section-level icon next to the section header — re-use existing Lucide icons from the project: `Globe` (Countries), `Map` (Regions), `Building2` (Sectors), `Users` (Organizations). The Victimology tab itself uses `Target` from Lucide (already imported elsewhere; if not, add to existing icon import block at top of `ThreatActorsPage.jsx`).

### Overflow
- **D-10:** Show ALL items in each section. No truncation, no "show more". The modal body is already `overflow-y-auto h-[95vh]` (line 575) — let the existing scroll handle it. Major actors with 30+ targeted countries will produce a long Countries section; that's information density users want, not noise to hide.

### Empty States (VICTM-08)
- **D-11:** Per-section empty state, not tab-wide. When a section's array is empty (e.g., `enrichment.victimology.regions.length === 0`), render the section card with the header (count = 0) plus a centered empty-state body: `<SectionIcon size={20} className="opacity-40" /> <p class="text-xs text-text-muted">No regions data available</p>`. Each section is independent — Countries can have 30 entries while Regions shows the empty state, and the layout remains the 2×2 grid.
- **D-12:** When `enrichment` is null AND `enrichLoading === true`: render four skeleton cards in the 2×2 grid (`bg-surface-2 rounded-lg animate-pulse h-32`). Mirrors the existing TTPs/Tools skeleton patterns.
- **D-13:** When `enrichError` is set: re-use the existing global error fallback at line 640 (`{enrichError && activeTab !== 'overview' && ...}`) — no Victimology-specific error state. The shared error path applies.

### File Boundaries
- **D-14:** All Phase 64 code edits land in `frontend/src/pages/ThreatActorsPage.jsx` (single file). No new component files. Rationale: project's "many small files" rule from CLAUDE.md applies when extraction earns its keep — here the four section renderers are tightly coupled to the modal's layout/state and have exactly one caller. If the chip rendering grows past ~30 lines, the planner can extract `<VictimologyChip>` to `frontend/src/components/threat-actors/VictimologyChip.jsx` — flagged as Claude's discretion below.
- **D-15:** No CSS file changes. All styling via Tailwind utility classes inline. The chip and section-card patterns above re-use existing tokens (`bg-surface-2`, `border-border`, `text-text-primary`, `text-text-muted`, `font-sans`, `font-mono`).

### Claude's Discretion
- Whether to extract `<VictimologyChip>` and/or `<VictimologySection>` sub-components if the inline JSX grows unwieldy during implementation (planner's call based on final line count).
- Exact icon choices among the Lucide set if the suggested ones (`Globe`/`Map`/`Building2`/`Users`/`Target`) aren't already imported — pick visually adjacent alternatives without re-asking.
- Section card padding and gap exact values within the Tailwind scale — visual polish, not a contract.
- Whether to add subtle hover affordance on chips (e.g., `hover:bg-surface-3`) — design polish, no behavioral implication.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap & Requirements
- `.planning/ROADMAP.md` §"Phase 64: Frontend Victimology Tab" — phase goal, success criteria SC1..SC4, dependency on Phase 59
- `.planning/REQUIREMENTS.md` — VICTM-01..VICTM-08 (Phase 64 requirements); VICTM-09 (Phase 59, already satisfied)
- `.planning/STATE.md` — current milestone state, prior decisions
- `.planning/PROJECT.md` — project-level constraints (zero-dep philosophy, dark theme, no TypeScript)
- `CLAUDE.md` — design tokens, font conventions, project gotchas

### Backend Contract (Phase 59)
- `backend/app/Services/ThreatActorService.php:712` — `normalizeVictimology()` produces the exact shape the frontend consumes (`{ countries: [{ id, name, country_code }], regions: [{ id, name }], sectors: [{ id, name }], organizations: [{ id, name }] }`)
- `backend/app/Services/ThreatActorService.php:769` — `extractIsoCode()` contract: `country_code` is ISO-2 uppercase or `null`; never throws
- `.planning/phases/59-backend-snapshot-resize-victimology-endpoint/` — Phase 59 plans + summaries, including the toTypes:["Identity"] + entity_type === 'Organization' filter pitfall (PITFALL-12)

### Existing Frontend Patterns (re-use)
- `frontend/src/pages/ThreatActorsPage.jsx:514..888` — full modal component (`ThreatActorDetailModal`); D-14 says all edits land here
- `frontend/src/pages/ThreatActorsPage.jsx:543` — existing eager-fetch enrichment effect (D-01 piggybacks on this)
- `frontend/src/pages/ThreatActorsPage.jsx:550..556` — `TABS` array (D-02 modifies this)
- `frontend/src/pages/ThreatActorsPage.jsx:829..862` — old Campaigns tab block to delete wholesale (D-02)
- `frontend/src/pages/ThreatActorsPage.jsx:797..827` — Tools tab as the structural template for the new Victimology tab (skeleton + non-empty render + per-section empty state)
- `frontend/src/api/threat-actors.js` — `fetchThreatActorEnrichment()` API client (no changes, already returns victimology)

### Design System
- `frontend/tailwind.config.js` — design tokens (surface, border, text-primary, text-muted, font-sans, font-mono)
- `frontend/src/styles/main.css` — Outfit + JetBrains Mono font imports

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`fetchThreatActorEnrichment(actor.id)`** — already returns `victimology` (Phase 59); single network call covers all five tabs.
- **Enrichment state pattern** — `enrichment / enrichLoading / enrichError` triplet at lines 516–518; cancellation via `cancelled` flag at 538/547. Drop-in for the new tab; no new state.
- **Lucide icons** — `Globe`, `Map`, `Building2`, `Users`, `Target` available from the existing `lucide-react` package; check the existing import block at top of `ThreatActorsPage.jsx` and add only what isn't already imported.
- **Tailwind tokens** — `bg-surface-2/50 border border-border rounded-lg`, `text-xs font-mono text-text-muted`, `text-sm font-sans font-medium text-text-primary` already in heavy use across the file — reuse verbatim.

### Established Patterns
- **Tab content block structure (Tools/TTPs/Campaigns):** `{activeTab === 'X' && !enrichError && (<div>{loading skeleton} {non-empty render} {empty state}</div>)}` — copy this shape for Victimology.
- **Empty state:** `<flex flex-col items-center justify-center py-8 text-text-muted><Icon size={32} opacity-40><p text-sm>` — use this PER SECTION inside the 2×2 grid (D-11), NOT tab-wide.
- **Skeleton:** `animate-pulse` + `bg-surface-2` rectangles. Existing TTPs uses `h-5 ... w-2/3`; Victimology will use `h-32` cards in the 2×2 grid (D-12).
- **Tab key reset:** `setActiveTab('overview')` on `actor.id` change (line 542) — keep this behavior verbatim.

### Integration Points
- `TABS` array (line 550–556) — add Victimology, remove Campaigns.
- Tab content blocks region (lines 647–884) — delete Campaigns block (829–862), insert Victimology block in its place or at end (order is purely textual; tab routing is by `activeTab` key, not block position).
- Top-of-file Lucide import block — add any of `Globe / Map / Building2 / Users / Target` not already imported.

</code_context>

<specifics>
## Specific Ideas

- User explicitly chose `2×2 grid` over stacked or accordion: "all four sections visible above the fold" was the deciding factor.
- User preferred emoji flags over a CSS lib because it honors the project's zero-dep convention from CLAUDE.md (matches Phase 63's roadmap-lock posture: only one new dep per phase, only when essential).
- VICTM-07 is acknowledged in the requirements list but consciously superseded by SC4 + the reality that Phase 59's payload already includes victimology — codified in D-01 so future audits see the rationale rather than treating it as a missed requirement.

</specifics>

<deferred>
## Deferred Ideas

- **Per-sector iconography** — mapping OpenCTI sector strings (e.g., "Healthcare", "Financial Services", "Energy") to Lucide icons. Considered briefly during Item Rendering discussion; deferred. Sector chips stay name-only for v6.1. If the visual scan benefit becomes clear, revisit as a polish phase post-v6.1.
- **External OpenCTI deep-link** — chip click → open the entity in OpenCTI in a new tab. Not in v6.1 scope (no auth bridge, no URL scheme decided). Note for v6.2 candidate phase.
- **Show top-N + collapse** — overflow strategy was discussed; we chose "show all" (D-10). Revisit if real-world data shows actors with 100+ targeted entities in one section degrade scroll UX.
- **Per-tab analytics** — counting how often Victimology is opened vs other tabs. Useful telemetry, no infrastructure for it yet. Roadmap backlog.

</deferred>

---

*Phase: 64-frontend-victimology-tab*
*Context gathered: 2026-05-01*
