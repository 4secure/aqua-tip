---
status: investigating
trigger: "Ping dots on the cobe globe overlay canvas are not moving in sync with the globe's rotation"
created: 2026-03-15T00:00:00Z
updated: 2026-03-15T00:00:00Z
---

## Current Focus

hypothesis: The orthoProject function's coordinate transform does not match cobe's internal shader projection — specifically, cobe's J(A,z) rotation matrix uses (theta, phi) in a particular order/sign convention that differs from the standard orthographic projection formula used in orthoProject.
test: Reverse-engineer cobe's shader math to determine exact projection and compare with orthoProject
expecting: Find a mismatch in how phi/theta are applied
next_action: Analyze cobe shader's J() matrix and projection pipeline

## Symptoms

expected: Ping dots should stay pinned to their geographic coordinates on the globe surface as it rotates
actual: Dots drift relative to the globe surface during rotation
errors: No console errors
reproduction: Load landing page, watch the globe rotate — dots visibly slide relative to land
started: After fixing the radius to 0.8 and negating lambda0

## Eliminated

## Evidence

## Resolution

root_cause:
fix:
verification:
files_changed: []
