# Phase 27: Outfit Font Migration - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace Syne, Space Grotesk, and Inter with Outfit across all pages. JetBrains Mono preserved for code/data displays. This is a pure frontend typography migration — no backend changes, no new pages, no new features.

</domain>

<decisions>
## Implementation Decisions

### Font Loading
- **D-01:** Load Outfit with full 100-900 weight range from Google Fonts (variable font, negligible size impact ~25KB)
- **D-02:** Remove Syne, Space Grotesk, and Inter from the Google Fonts import
- **D-03:** Keep JetBrains Mono import unchanged (400/500/600 weights)

### Tailwind Token Consolidation
- **D-04:** Consolidate from 4 font tokens to 2: `font-sans` (Outfit) + `font-mono` (JetBrains Mono)
- **D-05:** Remove `font-display`, `font-heading`, and `font-body` token definitions from tailwind.config.js
- **D-06:** Replace all `font-display`, `font-heading`, `font-body` class usages (345 occurrences across 41 files) with `font-sans`

### Visual Hierarchy
- **D-07:** Weight-only hierarchy — no letter-spacing or other differentiation techniques
- **D-08:** Headings: Outfit 600-700 (semibold/bold). Body: Outfit 400 (regular). Nav/buttons: Outfit 500 (medium)
- **D-09:** Base CSS `h1, h2, h3` rule should apply `font-sans` with appropriate font-weight instead of current `font-heading`

### Claude's Discretion
- Exact weight assignments per heading level (h1 vs h2 vs h3) — choose what looks best with the existing size hierarchy
- Whether to update body base style from `font-body` to `font-sans` explicitly or rely on Tailwind's default sans

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §Typography — TYPO-01 through TYPO-04 define the acceptance criteria

### Existing Font Configuration
- `frontend/tailwind.config.js` lines 46-50 — current fontFamily definitions to replace
- `frontend/src/styles/main.css` line 1 — Google Fonts @import to update
- `frontend/src/styles/main.css` lines 31-42 — base layer font-body and font-heading rules to update

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- No reusable assets — this phase modifies existing config and class names only

### Established Patterns
- Google Fonts loaded via CSS `@import` in `main.css` (not in `index.html`)
- Tailwind `fontFamily` config defines semantic tokens used throughout JSX files
- Base layer in `main.css` sets default body font and heading font
- Component-level font overrides use Tailwind classes (`font-display`, `font-heading`, `font-mono`, `font-body`)

### Integration Points
- `tailwind.config.js` — font token definitions
- `main.css` — @import URL and base layer rules
- 41 JSX/CSS files — class name replacements (font-display → font-sans, font-heading → font-sans, font-body → font-sans)
- `CLAUDE.md` — font documentation in Design System section needs updating

</code_context>

<specifics>
## Specific Ideas

No specific requirements — standard font migration approach with token consolidation.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 27-outfit-font-migration*
*Context gathered: 2026-03-25*
