---
status: awaiting_human_verify
trigger: "globe-ping-clipping - Ping dots on the cobe globe overlay are appearing outside the globe boundary"
created: 2026-03-15T00:00:00Z
updated: 2026-03-15T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED - The 0.97 radius factor was wrong. Cobe's shader uses sqrt(0.64)=0.8 as its globe radius.
test: Read cobe shader source to determine actual globe radius
expecting: N/A - root cause found and fix applied
next_action: Await human verification that pings now stay within the globe boundary

## Symptoms

expected: Ping dots and their expanding ring animations should only render within the globe's circular boundary. Dots near the edge should disappear before reaching the silhouette.
actual: Both entire ping dots and their expanding rings appear outside the globe circle boundary. The three fixes applied (circular clip path, stricter back-face culling cosC < 0.2, ring radius clamping) are not preventing the leaking.
errors: No console errors
reproduction: Load the landing page at localhost, observe the globe — pings visibly appear outside the globe circle
started: The fixes were just applied in this session but the issue persists

## Eliminated

## Evidence

- timestamp: 2026-03-15T00:01:00Z
  checked: cobe fragment shader in node_modules/cobe/dist/index.esm.js
  found: The shader normalizes screen coordinates to [-1, 1] range, then checks `dot(a,a) <= 0.64` to determine globe boundary. sqrt(0.64) = 0.8, meaning the globe body occupies 80% of the half-width in normalized coords. In CSS pixels this is `0.8 * w/2`.
  implication: The overlay was using `radius = w/2 * 0.97 = 0.485*w` but the actual globe radius is `0.8 * w/2 = 0.4*w`. The overlay radius was 21% too large, causing both the projection coordinates AND the clip path to extend well beyond the visible globe sphere.

- timestamp: 2026-03-15T00:01:30Z
  checked: The shader's else branch for c > 0.64
  found: The else branch draws a glow effect that fades out smoothly beyond the globe edge. This glow is NOT part of the globe body.
  implication: The 0.8 factor is the correct boundary for the solid globe surface where pings should appear.

## Resolution

root_cause: The overlay radius factor (0.97) did not match cobe's actual globe radius. Cobe's fragment shader defines the globe sphere boundary as `dot(a,a) <= 0.64` in normalized screen coordinates, meaning the globe radius is `sqrt(0.64) = 0.8` of half the canvas width. The overlay was using 0.97, which is 21% too large. This caused the orthographic projection to place pings at coordinates outside the visible globe, and the clip path circle was also larger than the globe, so clipping didn't help either.
fix: Changed radius factor from 0.97 to 0.8 in Globe.jsx line 142. This single change corrects both the projection coordinates (pings land in correct positions) and the clip path (clips to actual globe boundary).
verification: Awaiting human verification on localhost
files_changed: [frontend/src/components/ui/Globe.jsx]
