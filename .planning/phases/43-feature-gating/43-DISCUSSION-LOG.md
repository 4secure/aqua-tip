# Phase 43: Feature Gating - Discussion Log

**Date:** 2026-04-11
**Mode:** Auto (--auto flag)
**Duration:** Auto-resolved

## Gray Areas Identified

1. Upgrade CTA design
2. Sidebar lock behavior
3. Backend gating strategy
4. Gated page list

## Auto-Selected Decisions

### 1. Gated Page List
**Q:** Which pages are free vs gated?
**Selected:** Only Threat Search is free; Dashboard/Threat Map, Threat Actors, Threat News, Dark Web are gated (matches PLAN-04 exactly)

### 2. Upgrade CTA Design
**Q:** What do free users see on gated pages?
**Selected:** Full-page upgrade CTA replacing content (recommended — clean UX, no partial content confusion)

### 3. Sidebar Lock Behavior
**Q:** How should plan-restricted items appear in sidebar?
**Selected:** Same Lock icon pattern as unauthenticated, clicking navigates to gated page showing UpgradeCTA (recommended — reuses existing pattern)

### 4. Backend Gating Strategy
**Q:** How to enforce gating on backend?
**Selected:** New FeatureGate middleware checking user plan tier (recommended — separation of concerns from DeductCredit)

## Prior Decisions Applied

- Phase 41 D-05: All plans share same features — differentiator is credit volume
- Phase 41 D-12: Trial users get full access, gating only after trial expires
- Phase 41 D-01-D-04: Plan tiers (Free=5, Basic=30, Pro=100, Enterprise=500)

## Deferred Ideas

None — all discussion stayed within phase scope.
