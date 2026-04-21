// frontend/src/components/threat-map/BufferSizeControl.jsx
//
// Phase 62 — MAPCFG-01..04 — BufferSizeControl
//
// A compact controlled <select> that lets the user pick the threat-map marker buffer cap
// from four presets (100 / 500 / 1000 / 2000). Rendered at the top of LeftOverlayPanel's
// `panelContent` fragment, above ThreatMapCounters. The state itself lives in
// ThreatMapPage.jsx (Plan 62-02 wires it); this component is a pure view +
// input-coercion layer.
//
// Design contract: 62-UI-SPEC.md §Component Contract (glass-card-static p-4 wrapper,
// text-xs muted label, monospace 14px select value, violet focus ring).
//
// Decision refs: D-01 (location), D-02 (native <select>), D-03 (controlled props),
// D-04 (shared BUFFER_SIZE_OPTIONS constant), D-05 (label "Buffer"),
// D-06 (raw integer option labels), D-10 (glass-card-static p-4 wrapper),
// D-15 (storage key), D-16/D-19 (readBufferSize validation), D-17 (default = 100),
// D-31 (Number(e.target.value) coercion on change).

/**
 * Canonical preset whitelist for the threat-map buffer cap.
 * Ascending order is required (D-04, rendered verbatim by the <select>).
 * Named export so Plan 62-02 (ThreatMapPage) and future Phase 63 (cluster threshold)
 * can import a single source of truth.
 */
export const BUFFER_SIZE_OPTIONS = [100, 500, 1000, 2000];

/**
 * localStorage key for persisting the user-selected buffer size (MAPCFG-02).
 * Exact string required by the roadmap — do not rename.
 */
export const BUFFER_SIZE_STORAGE_KEY = 'aqua-tip:threat-map-buffer-size';

/**
 * Fallback buffer size used when the localStorage value is missing, invalid,
 * or not in BUFFER_SIZE_OPTIONS (MAPCFG-04). Matches Phase 61's hardcoded 100
 * so first-ever page loads behave identically to pre-Phase-62.
 */
export const DEFAULT_BUFFER_SIZE = 100;

/**
 * readBufferSize — read + validate the persisted buffer size from localStorage.
 *
 * Silent-fallback contract (MAPCFG-04, D-19):
 *   - key absent            → DEFAULT_BUFFER_SIZE
 *   - localStorage throws   → DEFAULT_BUFFER_SIZE
 *   - non-numeric string    → DEFAULT_BUFFER_SIZE  (Number() returns NaN)
 *   - NaN / Infinity        → DEFAULT_BUFFER_SIZE  (Number.isFinite rejects)
 *   - numeric, off-whitelist → DEFAULT_BUFFER_SIZE  (includes() check)
 *   - whitelist hit         → that value
 *
 * No user-visible error on invalid input — silent fallback is the requirement.
 *
 * @returns {number} One of BUFFER_SIZE_OPTIONS.
 */
export function readBufferSize() {
  try {
    const raw = localStorage.getItem(BUFFER_SIZE_STORAGE_KEY);
    if (raw == null) return DEFAULT_BUFFER_SIZE;
    const n = Number(raw);
    if (!Number.isFinite(n)) return DEFAULT_BUFFER_SIZE;
    if (!BUFFER_SIZE_OPTIONS.includes(n)) return DEFAULT_BUFFER_SIZE;
    return n;
  } catch {
    return DEFAULT_BUFFER_SIZE;
  }
}

/**
 * BufferSizeControl — native <select> wrapped in a glass card.
 *
 * Props (D-03):
 *   value    — current buffer size (one of BUFFER_SIZE_OPTIONS)
 *   onChange — handler called with Number(e.target.value) on selection
 *
 * No internal state; fully controlled by the caller (ThreatMapPage.jsx).
 */
export default function BufferSizeControl({ value, onChange }) {
  return (
    <div className="glass-card-static p-4">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor="threat-map-buffer-size"
          className="font-sans text-xs text-text-muted"
        >Buffer</label>
        <select
          id="threat-map-buffer-size"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="bg-surface-2 border border-border rounded-lg px-2 py-1 text-sm font-mono text-text-primary focus:outline-none focus:border-violet/50 focus:ring-1 focus:ring-violet/20 transition-colors"
        >
          {BUFFER_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
