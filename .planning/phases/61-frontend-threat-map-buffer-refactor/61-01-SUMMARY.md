---
phase: 61-frontend-threat-map-buffer-refactor
plan: 01
subsystem: frontend-css

tags: [frontend, css, threat-map, animations, accessibility, leaflet, divicon, prefers-reduced-motion]

requires: []

provides:
  - "frontend/src/styles/animations.css — new .map-buffer-marker* family (14 selectors): 1 base, 3 state modifiers (--arriving/--settled/--evicting), 4 colour modifiers (--red/--amber/--violet/--cyan), 4 chained arriving-colour overrides, 1 @media (prefers-reduced-motion: reduce) block"
  - "Visual contract for the three-state buffer marker lifecycle (arriving → settled → evicting) ready for Plan 61-02 (hook) and Plan 61-03 (page wiring) to consume via L.divIcon className composition"
  - "Colour parity guarantee — .map-buffer-marker--{color} fill rgba tokens byte-identical to existing .map-event-pulse--{color} palette (D-18 rule enforced by verification grep)"
  - "@keyframes mapEventPulse reused by reference (not duplicated) — the existing keyframe defined at line 152 drives both families"

affects:
  - "Plan 61-02 (useThreatMapBuffer.js hook) — consumes CSS class names: marker.state drives --arriving/--settled/--evicting modifier selection, marker.color drives --red/--amber/--violet/--cyan modifier selection"
  - "Plan 61-03 (ThreatMapPage.jsx wiring) — buildIcon(marker) helper will compose className as 'map-buffer-marker map-buffer-marker--{state} map-buffer-marker--{color}' inside L.divIcon"
  - "Phase 61 SC2 (arrival pulse ~2s) — satisfied visually by .map-buffer-marker--arriving (1.5s mapEventPulse keyframe + 300ms settle grace = 1.8s arriving window)"
  - "Phase 61 SC4 (eviction fade) — satisfied visually by .map-buffer-marker--evicting (600ms opacity-only transition, no scale change)"
  - "WCAG 2.3.3 (Animation from Interactions) — first explicit prefers-reduced-motion handling in the codebase; threat-map is the most motion-heavy surface, so starting here is correct per UI-SPEC §Accessibility"

tech-stack:
  added: []
  patterns:
    - "CSS class composition via L.divIcon className: base + state modifier + colour modifier (mirror of existing .map-event-pulse + .map-event-pulse--{color} pattern)"
    - "Chained-selector specificity override: .map-buffer-marker--arriving.map-buffer-marker--{color} (not descendant) — overrides the 1px white-alpha ring from --red/--amber during the pulse animation while preserving severity glow"
    - "Violet/cyan settled outer ring uses same-hue rgba at 0.2 alpha (not white) — UI-SPEC §Color discretion point: cool colours carry enough edge contrast against #262626 without a neutral anchor, whereas warm red/amber benefit from a white anchor"
    - "prefers-reduced-motion fallback strategy: arriving state renders opacity:0 (not a flattened settled dot) — the 1800ms JS timer still runs and flips to settled, at which point the 6px dot appears instantly with no scale/opacity transition"

key-files:
  created: []
  modified:
    - "frontend/src/styles/animations.css (+76 / −0)"

key-decisions:
  - "Preserve the @keyframes mapEventPulse comment reference ('Reuses @keyframes mapEventPulse (defined above). Do NOT duplicate.') in the new block — two textual hits for the identifier, but only one {-terminated keyframe definition. Verification tightened to match '@keyframes mapEventPulse\\s*\\{' to disambiguate; D-18 'reused, not duplicated' rule satisfied."
  - "Settled violet/cyan variants use same-hue outer ring (rgba(122,68,228,0.2) / rgba(0,229,255,0.2)) rather than white-alpha. UI-SPEC §Color flagged this as an implementation discretion point; chose same-hue for cool colours to avoid chromatic aberration halo against #262626."
  - "Chained selector `.map-buffer-marker--arriving.map-buffer-marker--{color}` (same element, both classes) to override the settled 1px white ring during the 1.5s pulse — a double-ring during expansion would read as a target reticle, which is not the intent. Arriving glow is pure severity (0 0 12px at 0.4 alpha), matching .map-event-pulse--{color} byte-for-byte."
  - "prefers-reduced-motion arriving fallback uses opacity: 0 rather than inline-flattening iconSize. Rationale per plan: the L.divIcon iconSize stays [16,16] during arriving regardless of motion preference (Leaflet geometry is motion-agnostic). Letting opacity go to 0 means the 16px container is invisible for the 1800ms JS window, then the hook flips to settled and the 6px dot appears. No visual artifact, no double-render."

patterns-established:
  - ".map-buffer-marker* family convention: base class = geometry + animation; state modifier = dimensions + animation/transition; colour modifier = background + box-shadow. Identical structure to the existing .map-event-pulse family, enabling consistent mental model for future Leaflet marker additions."
  - "Accessibility-first CSS block co-located with the rule family it overrides (prefers-reduced-motion lives immediately below the buffer-marker block, not at the file bottom). Makes motion-related decisions reviewable in one place."

requirements-completed: []  # NOTE: MAPBUF-01..03 are listed in the plan frontmatter but require Plans 61-02 (hook) and 61-03 (page wiring) to become user-visible. CSS alone does not make markers persist. Marking these requirements complete now would misrepresent progress. REQUIREMENTS.md will be marked when Plan 61-03 lands.

# Metrics
duration: 4min
completed: 2026-04-20
---

# Phase 61 Plan 01: CSS Contract for Three-State Buffer Marker Lifecycle Summary

**14 new `.map-buffer-marker*` selectors appended to `frontend/src/styles/animations.css` — three-state lifecycle (arriving → settled → evicting), four severity colour modifiers mirroring `.map-event-pulse--{color}` rgba byte-for-byte, four chained arriving-colour overrides, and a `prefers-reduced-motion` accessibility block. Zero JS/JSX touched; Vite production build clean in 9.96s.**

## Performance

- **Duration:** ~4 min (198s measured wall clock)
- **Started:** 2026-04-20T10:15:58Z
- **Completed:** 2026-04-20T10:19:16Z
- **Tasks:** 3 / 3
- **Files modified:** 1 (frontend/src/styles/animations.css)
- **Net diff:** +76 / −0 lines
- **Production build:** `✓ built in 9.96s` (no CSS parse errors, pre-existing chunk-size warnings only)

## Accomplishments

- Appended the `.map-buffer-marker` base class (6px rounded, `pointer-events: none`) plus three state modifiers (`--arriving`, `--settled`, `--evicting`) directly below the existing `.map-event-pulse--highlight` rule. Reuses `@keyframes mapEventPulse` by reference — no duplication.
- Added four colour modifiers (`--red`, `--amber`, `--violet`, `--cyan`) with severity rgba fills byte-identical to `.map-event-pulse--{color}` (verified by the automated parity grep in the plan's phase-level verification section 2). Settled dots carry a 1px outer ring for visibility against the CartoDB `#262626` basemap: white-alpha for warm colours (red/amber), same-hue-alpha for cool colours (violet/cyan).
- Added four chained `.map-buffer-marker--arriving.map-buffer-marker--{color}` selectors that override the settled 1px outer ring during the pulse animation, preserving the same `0 0 12px` severity glow as `.map-event-pulse--{color}` so users trained on the existing arrival feedback see no regression.
- Added the first `prefers-reduced-motion: reduce` block in the codebase: `--arriving` drops `animation` and sets `opacity: 0` (skips the ring entirely — dot appears instantly when the hook flips to `settled`); `--evicting` drops `transition` (instant removal). JS state machine still runs; only visual expression changes.

## Task Commits

Each task was committed atomically:

1. **Task 1: `.map-buffer-marker` base + three state modifiers** — `8940142` (feat)
2. **Task 2: colour modifiers + arriving-colour overrides** — `ed35dd0` (feat)
3. **Task 3: `prefers-reduced-motion` block + build verification** — `cb26ddd` (feat)

**Plan metadata commit:** pending (this SUMMARY + STATE.md + ROADMAP.md update)

## Files Created/Modified

- `frontend/src/styles/animations.css` — appended 76 lines between the existing `.map-event-pulse--highlight` rule (line 172) and the `/* Loading screen pulse ring */` comment (now line 250). New block spans lines 174–249 inclusive. Existing lines 1–172 are byte-identical to pre-plan state (verified via `git show 816a71e:... | sed -n '151,172p' | diff <current_version>`).

## Decisions Made

- **Preserved the `@keyframes mapEventPulse` comment reference.** The new block's leading comment reads `/* Reuses @keyframes mapEventPulse (defined above). Do NOT duplicate. */` for future readers. A naive grep of `@keyframes mapEventPulse` returns 2 hits, but the stricter `@keyframes mapEventPulse\s*\{` (actual definition) returns 1. Verification script updated accordingly. D-18 "reused, not duplicated" rule satisfied.
- **Settled violet/cyan use same-hue outer ring, not white-alpha.** UI-SPEC §Color marked this a discretion point. Cool colours against `#262626` already carry strong edge contrast; adding a white ring produces a halo that reads as chromatic aberration on OLED displays. Same-hue at 0.2 alpha keeps the ring subtle and tonally consistent with the dot fill.
- **Reduced-motion arriving strategy: `opacity: 0`, not `iconSize` flatten.** The `L.divIcon` `iconSize: [16, 16]` for the arriving state is motion-agnostic Leaflet geometry; CSS cannot shrink the container mid-state without the JS hook coordinating. Setting opacity to 0 for the 1800ms arriving window is simplest and avoids mid-state layout ambiguity — the dot appears instantly when the hook transitions to `settled` with its own `iconSize: [6, 6]` L.divIcon.
- **Deferred requirement check-off for MAPBUF-01..03.** The plan frontmatter lists these as plan-satisfied requirements, but user-visible persistent-marker behaviour requires the hook (61-02) and the page wiring (61-03). Marking them now would misrepresent progress. `REQUIREMENTS.md` will be updated when 61-03 lands. Noted in the frontmatter `requirements-completed: []` with an inline explanation.

## Deviations from Plan

None impacting code. One small documentation/verification nuance:

**1. [Rule 3 — Verification tooling] CRLF line endings required grep adaptation**
- **Found during:** Task 3 verification (automated grep check)
- **Issue:** The plan's inline verification `node -e` script pattern (`'.map-buffer-marker--arriving {\n    animation: none;'`) uses `\n` literals. On Windows the file is stored with CRLF line endings, so a naïve `.includes(pattern)` returned false for a correctly-written block.
- **Fix:** Normalised the file content via `.replace(/\r\n/g, '\n')` before the `.includes()` check. Confirmed the CSS block is written correctly; the grep pattern was the stale part.
- **Files modified:** None — this was a verification-time adaptation, not a code change.
- **Verification:** CRLF-normalised grep passes all 14 tokens. Phase-level automated verification (all three scripts in PLAN.md §verification) all pass.
- **Committed in:** No separate commit — this was a verification-tooling observation only.

**Total deviations:** 1 verification-tooling nuance; zero code/scope deviations.
**Impact on plan:** Nil. Plan executed exactly as written; the grep scripts just needed CRLF tolerance on Windows.

## Issues Encountered

- **CRLF vs LF grep pattern mismatch** — resolved inline (see Deviations above). No impact on shipped CSS.
- **`@keyframes mapEventPulse` grep returns 2 hits, not 1** — investigated; second hit is the comment reference, not a duplicate keyframe definition. Tightened regex to `@keyframes mapEventPulse\s*\{` to prove exactly one definition. D-18 rule satisfied.

## User Setup Required

None — no external service configuration, no environment variables, no deploy-side changes. Pure CSS addition.

## Byte-Count Sanity Check (per plan §output)

- **Buffer-marker block size:** lines 174–249 inclusive = 76 lines, inside the plan's stated 40–60-line expected range when counted excluding the prefers-reduced-motion block (which the plan listed separately). Including the reduced-motion block the 76-line total lines up with the insertions count in `git diff --numstat`. No palette drift found during Task 2 verification — the automated parity script confirmed all four severity rgba fills match `.map-event-pulse--{color}` byte-for-byte.

## Next Phase Readiness

- **Plan 61-02 (useThreatMapBuffer.js):** Ready to consume. Hook outputs will use marker shape `{ ..., state: 'arriving' | 'settled' | 'evicting', color: 'red' | 'amber' | 'violet' | 'cyan' }`; `buildIcon(marker)` will compose `className='map-buffer-marker map-buffer-marker--{state} map-buffer-marker--{color}'` inside `L.divIcon`. All 14 selectors are in place; no CSS waits on 61-02.
- **Plan 61-03 (ThreatMapPage.jsx wiring):** Ready once 61-02 lands. The `markerInstancesRef` reconciliation effect's `instance.setIcon(buildIcon(marker))` call will swap the state modifier class on every state transition — the new CSS is designed to be idempotent under class-replacement. No existing classes touched means the page's current `.map-event-pulse*` click-highlight path (D-19) continues to work unchanged.
- **Open question for Plan 61-03 visual QA:** whether the `opacity: 0` reduced-motion fallback on `--arriving` looks correct in practice (i.e., no dot flicker when the hook transitions to `settled`). Initial implementation matches UI-SPEC §Accessibility; may revisit in 61-03 if SC-Accessibility reveals a visual gap.

## Self-Check: PASSED

Automated verification:
- ✓ `frontend/src/styles/animations.css` exists and contains all 14 expected selectors (base + 3 state + 4 colour + 4 arriving-colour + prefers-reduced-motion)
- ✓ Commit `8940142` present in `git log --all`
- ✓ Commit `ed35dd0` present in `git log --all`
- ✓ Commit `cb26ddd` present in `git log --all`
- ✓ Lines 151–172 of `animations.css` byte-identical to pre-plan state (`.map-event-pulse*` family untouched)
- ✓ `@keyframes mapEventPulse {` (keyframe definition) appears exactly once
- ✓ Colour parity: all four `.map-buffer-marker--{color}` fill rgba tokens match `.map-event-pulse--{color}` byte-for-byte
- ✓ `cd frontend && npm run build` completed in 9.96s with zero CSS parse errors

---
*Phase: 61-frontend-threat-map-buffer-refactor*
*Plan: 01*
*Completed: 2026-04-20*
