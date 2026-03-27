# Phase 27: Outfit Font Migration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-25
**Phase:** 27-outfit-font-migration
**Areas discussed:** Font weight range, Tailwind token consolidation, Visual differentiation strategy

---

## Font Weight Range

| Option | Description | Selected |
|--------|-------------|----------|
| 100-900 full range (Recommended) | Variable font, full range, ~25KB, maximum flexibility | ✓ |
| 300-700 practical range | Light through bold, skips thin/heavy | |
| 400-700 minimal range | Regular through bold, matches current combined usage | |

**User's choice:** 100-900 full range
**Notes:** None — straightforward selection of recommended option.

---

## Tailwind Token Consolidation

| Option | Description | Selected |
|--------|-------------|----------|
| Consolidate to 2 tokens (Recommended) | font-sans (Outfit) + font-mono (JetBrains Mono). Remove display/heading/body. Clean and simple. | ✓ |
| Keep 4 tokens, all point to Outfit | Zero file changes beyond config, but misleading aliases | |
| Keep 3 tokens with meaning | font-heading + font-body + font-mono. Drop font-display. Preserves semantic intent. | |

**User's choice:** Consolidate to 2 tokens
**Notes:** All 345 usages of font-display/heading/body across 41 files will be replaced with font-sans.

---

## Visual Differentiation Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Weight-only hierarchy (Recommended) | Headings 600-700, body 400, nav/buttons 500. Modern clean look. | ✓ |
| Weight + letter-spacing | Same weights plus tracking differences for subtle extra differentiation | |
| You decide | Claude picks based on existing patterns | |

**User's choice:** Weight-only hierarchy
**Notes:** Relies on weight + size for visual hierarchy. Outfit was designed for this approach.

---

## Claude's Discretion

- Exact weight assignments per heading level (h1 vs h2 vs h3)
- Whether body base uses explicit font-sans or Tailwind default

## Deferred Ideas

None — discussion stayed within phase scope
