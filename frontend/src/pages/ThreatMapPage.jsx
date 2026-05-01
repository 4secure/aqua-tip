import { useState, useRef, useEffect, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';                              // D-03 side-effect — attaches L.markerClusterGroup
import 'leaflet.markercluster/dist/MarkerCluster.css';       // D-02 + D-16 Option A — MarkerCluster.css ONLY (never Default.css)
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

/**
 * buildClusterIcon — compose the dark-theme cluster bubble icon for leaflet.markercluster.
 * Size scales with child count (stepped buckets); color reflects the dominant child category
 * (tiebreak: severity priority red > amber > violet > cyan). No count text rendered.
 * className: '' suppresses Leaflet's default .leaflet-marker-icon positioning so our
 * .map-cluster-icon CSS owns the visual layout (mirrors Phase 61 buildIcon pattern).
 */
const CLUSTER_COLOR_PRIORITY = ['red', 'amber', 'violet', 'cyan'];
const CLUSTER_SIZE_PX = { xs: 24, sm: 32, md: 44, lg: 56 };

function buildClusterIcon(cluster) {
  const children = cluster.getAllChildMarkers();
  const count = children.length;

  const tally = { red: 0, amber: 0, violet: 0, cyan: 0 };
  for (const child of children) {
    const c = child._color;
    if (tally[c] !== undefined) tally[c]++;
    else tally.cyan++;
  }

  let dominant = 'cyan';
  let maxCount = 0;
  for (const color of CLUSTER_COLOR_PRIORITY) {
    if (tally[color] > maxCount) {
      maxCount = tally[color];
      dominant = color;
    }
  }

  const sizeKey = count >= 201 ? 'lg' : count >= 51 ? 'md' : count >= 11 ? 'sm' : 'xs';
  const px = CLUSTER_SIZE_PX[sizeKey];

  return L.divIcon({
    className: '',
    html: `<div class="map-cluster-icon map-cluster-icon--${sizeKey} map-cluster-icon--${dominant}"></div>`,
    iconSize: [px, px],
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
const CLUSTER_THRESHOLD = 500; // D-05 / D-06 — STRICT > 500; buffer === 500 is plain mode
const CLUSTER_OPTIONS = {
  iconCreateFunction: buildClusterIcon, // D-14 — dark-theme custom bubble (MAPCLU-02)
  showCoverageOnHover: false,           // D-19 — no polygon overlay
  chunkedLoading: true,                 // D-20 — MAPCLU-04 responsiveness at 1000+ markers
  chunkProgress: null,                  // D-20 — silence default console logger
  zoomToBoundsOnClick: true,            // D-21 — MAPCLU-02 (library default, explicit)
  spiderfyOnMaxZoom: true,              // default — explicit for clarity
  zIndexOffset: -100,                   // D-22 — MAPCLU-05 (below z-1000 overlay panels)
  animate: true,                        // default — smooth spiderfy animation
};

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
  const markerGroupRef = useRef(null);          // D-08 — single container: L.layerGroup OR L.markerClusterGroup, never both
  const activeLayerModeRef = useRef(null);      // D-09 — 'plain' | 'cluster' | null (null = not yet initialised)

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

    // D-12 lazy-init: first reconciliation creates the initial container based on current bufferSize.
    // Reading bufferSize from the effect's closure is safe — React guarantees state is initialised
    // before effects run, so the value on first render reflects localStorage (MAPCFG-02 restore) (P-05).
    if (markerGroupRef.current == null) {
      const desired = bufferSize > CLUSTER_THRESHOLD ? 'cluster' : 'plain';
      const newGroup = desired === 'cluster'
        ? L.markerClusterGroup(CLUSTER_OPTIONS)
        : L.layerGroup();
      if (desired === 'cluster') {
        newGroup.on('clusterclick', (e) => {
          // D-23 / P-06 — guard against synthetic events with undefined originalEvent
          if (e.originalEvent) L.DomEvent.stopPropagation(e.originalEvent);
        });
      }
      map.addLayer(newGroup);
      markerGroupRef.current = newGroup;
      activeLayerModeRef.current = desired;
    }

    // 1. ADD + UPDATE: walk `markers`, creating new L.Markers and swapping icons on state change.
    for (const marker of markers) {
      if (marker.lat == null || marker.lng == null) continue;
      const existing = instances.get(marker.id);
      if (!existing) {
        // New marker: create L.Marker and add to the active container (markerGroupRef.current).
        const icon = buildIcon(marker);
        // D-11 — write to markerGroupRef.current (the active container) instead of map directly.
        // The lazy-init above guarantees markerGroupRef.current is non-null by this point.
        const instance = L.marker([marker.lat, marker.lng], { icon, interactive: false });
        markerGroupRef.current.addLayer(instance);
        // Tag the instance with its current visual state so we can detect changes cheaply
        // on subsequent reconciliations without a full props comparison.
        instance._bufferState = marker.state;
        instance._color = marker.color || 'cyan';
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
        // D-11 — remove from the active container, not from map directly.
        markerGroupRef.current.removeLayer(instance);
        instances.delete(id);
      }
    }
  }, [markers]);

  // D-10 layer-swap: on bufferSize threshold crossing, swap the active marker container
  // between L.layerGroup (plain) and L.markerClusterGroup (cluster) using the 8-step
  // re-init sequence. PITFALL-06 mitigation: old container is removed before new is added;
  // marker instances are re-parented, never recreated (preserves _bufferState + icon + latLng).
  // D-25 no-reconnect: this effect touches only Leaflet refs — no state change, no SSE awareness.
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map) return;

    const desired = bufferSize > CLUSTER_THRESHOLD ? 'cluster' : 'plain';
    // Bounce-guard: equal modes (e.g., 1000 ↔ 2000 both cluster) → no-op.
    if (desired === activeLayerModeRef.current) return;

    const oldGroup = markerGroupRef.current;
    const instances = markerInstancesRef.current;

    // Step 1: Detach listeners on old cluster group (plain layerGroup has no cluster events).
    if (oldGroup && activeLayerModeRef.current === 'cluster' && oldGroup.off) {
      oldGroup.off('clusterclick');
    }

    // Step 2: Remove every tracked instance from the old container.
    //         Does NOT recreate marker DOM — L.Marker detaches from parent and keeps icon/latLng.
    if (oldGroup) {
      for (const instance of instances.values()) {
        oldGroup.removeLayer(instance);
      }
      // Step 3: Remove old group from map.
      map.removeLayer(oldGroup);
    }

    // Step 4: Create new container.
    const newGroup = desired === 'cluster'
      ? L.markerClusterGroup(CLUSTER_OPTIONS)
      : L.layerGroup();

    // Step 5: Attach cluster-click handler if cluster mode (D-23 / P-06 guard).
    if (desired === 'cluster') {
      newGroup.on('clusterclick', (e) => {
        if (e.originalEvent) L.DomEvent.stopPropagation(e.originalEvent);
      });
    }

    // Step 6: Add new group to map.
    map.addLayer(newGroup);

    // Step 7: Re-add every tracked instance to new container.
    //         D-26 marker-count conservation: every instance in the Map is attached to
    //         exactly one container after this loop; none orphaned, none double-attached.
    for (const instance of instances.values()) {
      newGroup.addLayer(instance);
    }

    // Step 8: Swap refs.
    markerGroupRef.current = newGroup;
    activeLayerModeRef.current = desired;
  }, [bufferSize]);

  // Unmount cleanup (D-11 step 4 + D-13): remove every Leaflet layer on page unmount.
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
      // D-13 — tear down the marker group container AFTER per-instance removal.
      // Try/catch per Phase 61 precedent: SPA route change may have disposed the map
      // first via useLeaflet cleanup.
      if (map && markerGroupRef.current) {
        try { map.removeLayer(markerGroupRef.current); } catch { /* map disposed */ }
      }
      markerGroupRef.current = null;
      activeLayerModeRef.current = null;
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
