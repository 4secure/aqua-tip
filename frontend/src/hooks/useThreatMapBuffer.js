import { useState, useRef, useEffect } from 'react';

/**
 * useThreatMapBuffer — persistent marker buffer with three-state lifecycle.
 *
 * Phase 61: MAPBUF-01, MAPBUF-02, MAPBUF-03, MAPBUF-04, MAPBUF-05.
 *
 * Consumes the `events` array from `useThreatStream` (newest-first, capped at 100
 * by useThreatStream itself in Phase 61). Produces a lifecycle-annotated `markers`
 * array (oldest-first) where each marker carries a `state` of 'arriving', 'settled',
 * or 'evicting'. Plan 03 wires `markers` into Leaflet via diff-reconciliation.
 *
 * CONTRACT (do not change without updating 61-CONTEXT.md D-02..D-17):
 * - Pure state management: NO Leaflet imports, NO DOM access.
 * - On first `events` update after mount (first hydration), all IDs enter the
 *   buffer as `state: 'settled'` directly — snapshot events skip the pulse (D-09).
 * - On subsequent updates, any ID not already tracked enters as `state: 'arriving'`.
 * - `arriving → settled` after 1800ms (D-06).
 * - Eviction: when markers.length > bufferLimitRef.current, mark the oldest
 *   non-evicting marker as 'evicting'; remove it 600ms later. Strict FIFO by
 *   arrivedAt (D-07).
 * - `bufferLimitRef` pattern (D-16) keeps the eviction code stale-closure-safe
 *   so Phase 62 can turn `bufferSize` into a live-tunable value with a one-line
 *   change (no SSE reconnect — PITFALL-01 safe).
 *
 * USAGE:
 *   const { events } = useThreatStream();
 *   const { markers } = useThreatMapBuffer(events, 100);
 *
 * @param {Array<Object>} events  Newest-first event stream from useThreatStream.
 * @param {number}        [bufferSize=100]  Max retained markers.
 * @returns {{ markers: Array<Object>, arrivingId: string|null, evictingId: string|null }}
 */
export function useThreatMapBuffer(events, bufferSize = 100) {
  const [markers, setMarkers] = useState([]);
  const [arrivingId, setArrivingId] = useState(null);
  const [evictingId, setEvictingId] = useState(null);

  // Keep bufferLimit in a ref so the events-effect closure reads the current
  // value (D-16, PITFALL-01-safe — matters when Phase 62 makes bufferSize dynamic).
  const bufferLimitRef = useRef(bufferSize);
  useEffect(() => {
    bufferLimitRef.current = bufferSize;
  }, [bufferSize]);

  // First-hydration guard (D-09): on the first non-empty `events` update, treat
  // all IDs as snapshot-settled (no pulse).
  const firstHydrationRef = useRef(true);

  // Scheduled timers, keyed by marker id, so we can cancel them on unmount.
  // Map<id, { settleTimer: number|null, evictTimer: number|null }>
  const timersRef = useRef(new Map());

  // Event diff effect (Task 2 completes the live-arrival + eviction path).
  useEffect(() => {
    if (!events || events.length === 0) return;

    if (firstHydrationRef.current) {
      firstHydrationRef.current = false;
      // events is newest-first; reverse to insertion order (oldest-first)
      // so the oldest marker sits at markers[0] — FIFO eviction reads [0].
      const settled = [...events].reverse().map((e) => ({
        id: e.id,
        lat: e.lat,
        lng: e.lng,
        color: e.color,
        type: e.type,
        ip: e.ip,
        country: e.country,
        countryCode: e.countryCode,
        timestamp: e.timestamp,
        state: 'settled',
        arrivedAt: Date.now(),
      }));
      setMarkers(settled);
      return;
    }

    // TODO(Task 2): diff new IDs vs current markers; append 'arriving' entries;
    // schedule settle + eviction timers.
  }, [events]);

  // Cleanup all pending timers on unmount (D-06).
  useEffect(() => {
    return () => {
      for (const { settleTimer, evictTimer } of timersRef.current.values()) {
        if (settleTimer) clearTimeout(settleTimer);
        if (evictTimer) clearTimeout(evictTimer);
      }
      timersRef.current.clear();
    };
  }, []);

  return { markers, arrivingId, evictingId };
}

export default useThreatMapBuffer;
