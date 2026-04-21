import { useState, useRef, useEffect, useCallback } from 'react';
import L from 'leaflet';
import { useLeaflet } from '../hooks/useLeaflet';
import { useThreatStream } from '../hooks/useThreatStream';
import { useThreatMapBuffer } from '../hooks/useThreatMapBuffer';
import ThreatMapStatus from '../components/threat-map/ThreatMapStatus';
import LeftOverlayPanel from '../components/threat-map/LeftOverlayPanel';
import RightOverlayPanel from '../components/threat-map/RightOverlayPanel';
import PanelToggle from '../components/threat-map/PanelToggle';
import { BUFFER_SIZE_STORAGE_KEY, readBufferSize } from '../components/threat-map/BufferSizeControl';


/**
 * buildIcon — compose the Leaflet DivIcon for a buffer marker based on its lifecycle state.
 * Pure function; CSS class composition matches frontend/src/styles/animations.css §.map-buffer-marker*.
 */
function buildIcon(marker) {
  // Arriving state uses a 16px pulse-ring bounding box; settled and evicting use a 6px dot.
  // These sizes match the UI-SPEC table exactly (spacing scale: 6 / 16 dimension tokens).
  const size = marker.state === 'arriving' ? 16 : 6;
  const color = marker.color || 'cyan';
  return L.divIcon({
    className: '',
    html: `<div class="map-buffer-marker map-buffer-marker--${marker.state} map-buffer-marker--${color}" style="width:${size}px;height:${size}px;"></div>`,
    iconSize: [size, size],
  });
}

function addHighlightPulse(map, lat, lng) {
  if (!map || lat == null || lng == null) return;
  const size = 20;
  const icon = L.divIcon({
    className: '',
    html: `<div class="map-event-pulse map-event-pulse--highlight" style="width:${size}px;height:${size}px;"></div>`,
    iconSize: [size, size],
  });
  const marker = L.marker([lat, lng], { icon, interactive: false }).addTo(map);
  setTimeout(() => {
    try { map.removeLayer(marker); } catch { /* already removed */ }
  }, 2100);
}

const STORAGE_KEY = 'aqua-tip:panels-collapsed';

export default function ThreatMapPage() {
  const { events, counters, countryCounts, typeCounts, connected } = useThreatStream();
  const [bufferSize, setBufferSize] = useState(readBufferSize);
  const { markers } = useThreatMapBuffer(events, bufferSize);

  const [panelsCollapsed, setPanelsCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false; // default: expanded
    }
  });

  const [leftPeeking, setLeftPeeking] = useState(false);
  const [rightPeeking, setRightPeeking] = useState(false);

  const leftEntryTimer = useRef(null);
  const leftExitTimer = useRef(null);
  const rightEntryTimer = useRef(null);
  const rightExitTimer = useRef(null);

  const leafletMapRef = useRef(null);
  const markerInstancesRef = useRef(new Map()); // Map<id, L.Marker>

  const handleMapReady = useCallback((map) => {
    leafletMapRef.current = map;
  }, []);

  const mapContainerRef = useLeaflet({
    center: [25, 10],
    zoom: 2.5,
    onReady: handleMapReady,
  });

  // MAPBUF-05 diff-reconciliation: sync buffer state → Leaflet marker layer.
  // Single source of truth is `markerInstancesRef`; React state eviction does NOT
  // auto-remove Leaflet layers, so we explicitly add / setIcon / removeLayer here.
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map) return;

    const instances = markerInstancesRef.current;
    const nextIds = new Set(markers.map((m) => m.id));

    // 1. ADD + UPDATE: walk `markers`, creating new L.Markers and swapping icons on state change.
    for (const marker of markers) {
      if (marker.lat == null || marker.lng == null) continue;
      const existing = instances.get(marker.id);
      if (!existing) {
        // New marker: create L.Marker and add to map.
        const icon = buildIcon(marker);
        const instance = L.marker([marker.lat, marker.lng], { icon, interactive: false }).addTo(map);
        // Tag the instance with its current visual state so we can detect changes cheaply
        // on subsequent reconciliations without a full props comparison.
        instance._bufferState = marker.state;
        instances.set(marker.id, instance);
      } else if (existing._bufferState !== marker.state) {
        // State changed (e.g., arriving → settled, settled → evicting): swap icon in place.
        // setIcon is idempotent and does NOT remove/re-add the DOM node — the CSS transition
        // on .map-buffer-marker--evicting fires cleanly because the same element stays mounted.
        existing.setIcon(buildIcon(marker));
        existing._bufferState = marker.state;
      }
    }

    // 2. REMOVE: any id in the registry but not in nextIds — evicted past 600ms, remove layer.
    for (const [id, instance] of instances) {
      if (!nextIds.has(id)) {
        map.removeLayer(instance);
        instances.delete(id);
      }
    }
  }, [markers]);

  // Unmount cleanup (D-11 step 4): remove every Leaflet layer on page unmount.
  // The hook clears its timers; this effect clears the Leaflet DOM it created.
  useEffect(() => {
    return () => {
      const map = leafletMapRef.current;
      const instances = markerInstancesRef.current;
      if (map) {
        for (const instance of instances.values()) {
          try { map.removeLayer(instance); } catch { /* map already disposed */ }
        }
      }
      instances.clear();
    };
  }, []);

  // Sync panelsCollapsed to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(panelsCollapsed));
    } catch {
      // localStorage unavailable — degrade silently
    }
  }, [panelsCollapsed]);

  // Sync bufferSize to localStorage (MAPCFG-02)
  useEffect(() => {
    try {
      localStorage.setItem(BUFFER_SIZE_STORAGE_KEY, String(bufferSize));
    } catch {
      // localStorage unavailable — degrade silently
    }
  }, [bufferSize]);

  // Clear peek state and timers when expanding
  useEffect(() => {
    if (!panelsCollapsed) {
      setLeftPeeking(false);
      setRightPeeking(false);
      clearTimeout(leftEntryTimer.current);
      clearTimeout(leftExitTimer.current);
      clearTimeout(rightEntryTimer.current);
      clearTimeout(rightExitTimer.current);
    }
  }, [panelsCollapsed]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      clearTimeout(leftEntryTimer.current);
      clearTimeout(leftExitTimer.current);
      clearTimeout(rightEntryTimer.current);
      clearTimeout(rightExitTimer.current);
    };
  }, []);

  const handlePeekStart = useCallback((side) => {
    if (side === 'left') {
      clearTimeout(leftExitTimer.current);
      leftExitTimer.current = null;
      leftEntryTimer.current = setTimeout(() => setLeftPeeking(true), 150);
    } else {
      clearTimeout(rightExitTimer.current);
      rightExitTimer.current = null;
      rightEntryTimer.current = setTimeout(() => setRightPeeking(true), 150);
    }
  }, []);

  const handlePeekEnd = useCallback((side) => {
    if (side === 'left') {
      clearTimeout(leftEntryTimer.current);
      leftEntryTimer.current = null;
      leftExitTimer.current = setTimeout(() => setLeftPeeking(false), 250);
    } else {
      clearTimeout(rightEntryTimer.current);
      rightEntryTimer.current = null;
      rightExitTimer.current = setTimeout(() => setRightPeeking(false), 250);
    }
  }, []);

  const handleEventClick = useCallback((event) => {
    const map = leafletMapRef.current;
    if (!map || event.lat == null || event.lng == null) return;
    map.flyTo([event.lat, event.lng], 6);
    addHighlightPulse(map, event.lat, event.lng);
  }, []);

  return (
    <div className="relative -m-6" style={{ height: 'calc(100vh - 60px)', position: 'relative', zIndex: 0 }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', background: '#262626' }}></div>

      <ThreatMapStatus connected={connected} />

      <LeftOverlayPanel
        collapsed={panelsCollapsed}
        peeking={leftPeeking}
        onPeekStart={handlePeekStart}
        onPeekEnd={handlePeekEnd}
        counters={counters}
        connected={connected}
        countryCounts={countryCounts}
        events={events}
        onEventClick={handleEventClick}
        bufferSize={bufferSize}
        onBufferSizeChange={setBufferSize}
      />

      <RightOverlayPanel
        collapsed={panelsCollapsed}
        peeking={rightPeeking}
        onPeekStart={handlePeekStart}
        onPeekEnd={handlePeekEnd}
        events={events}
        onEventClick={handleEventClick}
      />

      <PanelToggle
        collapsed={panelsCollapsed}
        onToggle={() => setPanelsCollapsed((prev) => !prev)}
      />
    </div>
  );
}
