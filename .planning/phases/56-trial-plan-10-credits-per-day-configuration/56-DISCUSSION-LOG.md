# Phase 56: Observable Display - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-14
**Phase:** 56-trial-plan-10-credits-per-day-configuration
**Areas discussed:** Email rendering, URL rendering, Crypto rendering, Consistent styling

---

## Scope Clarification

| Option | Description | Selected |
|--------|-------------|----------|
| Indicator value display | Email/URL/crypto indicator values need type-specific formatting | |
| Trial plan credits config | About configuring trial plan to 10 credits/day | |
| Something else | User describes what they need | ✓ |

**User's choice:** The Threat Database widget on the Threat Map page shows 0 counts for Email, Crypto Wallet, and URL even though OpenCTI has data for those types.
**Notes:** Root cause identified as backend omission — `fetchCounts()` only queries 4 of 7 entity types.

---

## Root Cause Confirmation

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, add the 3 missing types | Add Email-Addr, Url, Cryptocurrency-Wallet to fetchCounts() | ✓ |
| Yes, but also verify OpenCTI type names | Add types AND verify exact entity_type strings | |

**User's choice:** Yes, add the 3 missing types (Recommended)

---

## URL Display

| Option | Description | Selected |
|--------|-------------|----------|
| Plain text, no link | Keep URLs as non-clickable mono text | ✓ |
| Clickable link, new tab | Make URLs clickable | |
| Truncated with tooltip | Truncate long URLs with hover tooltip | |

**User's choice:** Plain text, no link (Recommended)
**Notes:** Threat intel context — clicking malicious URLs is dangerous

---

## Crypto Display

| Option | Description | Selected |
|--------|-------------|----------|
| No changes, plain text is fine | Monospace text with entity_type badge | ✓ |
| Add wallet type label | Show BTC/ETH/etc prefix | |

**User's choice:** No changes, plain text is fine (Recommended)

---

## Widget Styling

| Option | Description | Selected |
|--------|-------------|----------|
| Keep current order and style | Static STAT_CARD_CONFIG order | ✓ |
| Reorder by count | Sort by count descending | |
| Add icons per type | Lucide icons per entity type | |

**User's choice:** Keep current order and style (Recommended)

---

## Claude's Discretion

- PHPDoc comment update on fetchCounts()
- Cache key unchanged

## Deferred Ideas

None — discussion stayed within phase scope
