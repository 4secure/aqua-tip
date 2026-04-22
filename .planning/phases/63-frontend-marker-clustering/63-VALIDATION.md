---
phase: 63
slug: frontend-marker-clustering
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-21
---

# Phase 63 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source of truth: `63-RESEARCH.md` §Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None (manual QA only) — CLAUDE.md §Gotchas + Phase 61/62 precedent |
| **Config file** | N/A |
| **Quick run command** | `cd frontend && npm run build` (Vite build is the only automated correctness gate) |
| **Full suite command** | `cd frontend && npm run build` + human manual QA walk of SC1..SC5 in this file |
| **Estimated runtime** | ~25 seconds for Vite build |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npm run build` (exit 0, no warnings)
- **After every plan wave:** Run build + load `/threat-map` in browser at default `bufferSize=100`, verify map renders with no console errors
- **Before `/gsd-verify-work`:** All SC1..SC5 manual-QA rows below must be PASS
- **Max feedback latency:** ~25 seconds (Vite build)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 63-XX-YY | XX | W | MAPCLU-01..05 | — | N/A | build+manual | `cd frontend && npm run build` | ✅ | ⬜ pending |

*Populated by planner from PLAN.md frontmatter. Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] This file (`63-VALIDATION.md`) — created with SC1..SC5 probe rows below
- [ ] No framework install required (D-30)
- [ ] `leaflet.markercluster@1.5.3` installed (D-01) before any import-level task runs

*Existing Vite + browser infrastructure covers all phase requirements.*

---

## Manual-Only Verifications (SC1..SC5)

### SC1 — Dark-Theme Cluster Icons (MAPCLU-01 + MAPCLU-02 icon styling)

**Requirement:** With buffer set to 1000 and 200+ markers on screen, nearby markers merge into cluster bubbles showing a count styled in the project's dark glassmorphism theme — no white default cluster icons visible.

**Setup:**
1. `localStorage.setItem('aqua-tip:threat-map-buffer-size', '1000')`
2. Reload `/threat-map`
3. Wait ~60s for SSE fill (≥200 markers)
4. Zoom out to global view (zoom ≈ 2)

**Probe:**
| Step | Action | Expected | Observed |
|------|--------|----------|----------|
| 1 | DevTools Elements → find any `.map-cluster-icon` → computed `background` | `rgba(15, 17, 23, 0.8)` | ☐ PASS / ☐ FAIL |
| 2 | Same element → computed `border-radius` | `50%` | ☐ PASS / ☐ FAIL |
| 3 | Visually inspect map clusters | All circular, dark, semi-transparent, monospace numeric count | ☐ PASS / ☐ FAIL |
| 4 | Visual inspection (whole map) | No white/blue default MarkerCluster icons anywhere | ☐ PASS / ☐ FAIL |
| 5 | Grep source: `grep -r "MarkerCluster.Default.css" frontend/src/` | Exit code 1 (no matches) | ☐ PASS / ☐ FAIL |

**Result:** ☐ PASS / ☐ FAIL

---

### SC2 — Click-to-Zoom + Spiderfy + PITFALL-08 (MAPCLU-02)

**Requirement:** Clicking a cluster zooms the map to show all child markers and expands them (Leaflet `clusterclick` → `zoomToBounds`).

**Setup:** Same as SC1.

**Probe:**
| Step | Action | Expected | Observed |
|------|--------|----------|----------|
| 1 | Click any cluster bubble at zoom=2 | Smooth `flyTo` animation zooms to cluster bounds; cluster splits into children | ☐ PASS / ☐ FAIL |
| 2 | Zoom to max (19) on a pair of overlapping markers | Spiderfy fires; radial SVG legs drawn; children fan out | ☐ PASS / ☐ FAIL |
| 3 | DevTools Console: `leafletMapRef.current?._events?.click` — inspect listener count before + after cluster click | Listener count unchanged; cluster click does not propagate to map click handler (PITFALL-08) | ☐ PASS / ☐ FAIL |

**Result:** ☐ PASS / ☐ FAIL

---

### SC3 — Clean Layer Swap on Threshold Crossing (MAPCLU-03)

**Requirement:** Changing the dropdown from 1000 back to 100 removes the cluster layer and reverts to individual markers — no marker rendered twice, no blank map.

**Setup:** Open `/threat-map` at default `bufferSize=100`; wait for 100 markers.

**Probe:**
| Step | Action | Expected | Observed |
|------|--------|----------|----------|
| 1 | Change dropdown: 100 → 1000 → 500 → 1000 → 100 (5 presses in ~5s) | Each press transitions cleanly | ☐ PASS / ☐ FAIL |
| 2 | DevTools Elements after each press → inspect `.leaflet-marker-pane` | At most ONE active layer container (either plain `L.layerGroup` OR `L.markerClusterGroup`, never both) | ☐ PASS / ☐ FAIL |
| 3 | DevTools Performance recording during swap | No frame shows tile layer with zero markers (no blank frame) | ☐ PASS / ☐ FAIL |
| 4 | Pick one specific marker's lat/lng before swap; verify position after | Same pixel position (no jump) | ☐ PASS / ☐ FAIL |
| 5 | DevTools Network tab → filter EventSource during the 5-press stress | Existing EventSource row stays active (green dot); zero new connections | ☐ PASS / ☐ FAIL |

**Result:** ☐ PASS / ☐ FAIL

---

### SC4 — Responsive at 1000–2000 Markers (MAPCLU-04)

**Requirement:** Loading 1000+ markers does not freeze the browser tab — chunked loading distributes computation across frames.

**Setup:**
1. `localStorage.setItem('aqua-tip:threat-map-buffer-size', '2000')`
2. Reload `/threat-map`

**Probe:**
| Step | Action | Expected | Observed |
|------|--------|----------|----------|
| 1 | DevTools Performance → start recording → wait 60s for snapshot + SSE fill | FPS graph sustains ≥40fps throughout initial burst | ☐ PASS / ☐ FAIL |
| 2 | During fill: scroll feed panel, hover `BufferSizeControl`, click panel toggle | UI responds immediately; no spinner freeze | ☐ PASS / ☐ FAIL |
| 3 | After fill: verify marker count in `markerInstancesRef` (via React DevTools or console) | ≤ 2000 (buffer cap respected) | ☐ PASS / ☐ FAIL |

**Result:** ☐ PASS / ☐ FAIL

---

### SC5 — Z-Index Hierarchy (MAPCLU-05)

**Requirement:** Cluster bubbles appear below the glassmorphism overlay panels in z-index — panels always readable, never obscured by cluster count labels.

**Setup:** `bufferSize=1000`; wait for clusters to render.

**Probe:**
| Step | Action | Expected | Observed |
|------|--------|----------|----------|
| 1 | DevTools Elements → `.map-cluster-icon` parent → computed `z-index` | < 1000 (Leaflet marker pane z-600 + zIndexOffset -100 = ~z-500) | ☐ PASS / ☐ FAIL |
| 2 | Collapse overlay panels; hover left edge to trigger peek | Panel slides in OVER cluster bubbles at every frame; no cluster pokes through | ☐ PASS / ☐ FAIL |
| 3 | Expand panels via PanelToggle | Panels fully cover their area; no cluster bubble bleeds through | ☐ PASS / ☐ FAIL |
| 4 | Scroll map so clusters are under the panel position; visual inspection | Panel always reads cleanly; cluster labels never visible through/above panel | ☐ PASS / ☐ FAIL |

**Result:** ☐ PASS / ☐ FAIL

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` Vite-build verify OR Wave 0 `63-VALIDATION.md` scaffold
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 creates `63-VALIDATION.md` scaffold (this file)
- [ ] No watch-mode flags (Vite build only)
- [ ] Feedback latency < 30s (Vite build ~25s)
- [ ] `nyquist_compliant: true` set after Wave 0

**Approval:** pending
