import { useState, useRef, useEffect, useCallback } from 'react';
import L from 'leaflet';
import { useLeaflet } from '../hooks/useLeaflet';
import { useThreatStream } from '../hooks/useThreatStream';
import ThreatMapStatus from '../components/threat-map/ThreatMapStatus';
import LeftOverlayPanel from '../components/threat-map/LeftOverlayPanel';
import RightOverlayPanel from '../components/threat-map/RightOverlayPanel';
import PanelToggle from '../components/threat-map/PanelToggle';

function addPulseMarker(map, lat, lng, color, duration = 1600) {
  if (!map || lat == null || lng == null) return;
  const size = 16;
  const icon = L.divIcon({
    className: '',
    html: `<div class="map-event-pulse map-event-pulse--${color || 'cyan'}" style="width:${size}px;height:${size}px;"></div>`,
    iconSize: [size, size],
  });
  const marker = L.marker([lat, lng], { icon, interactive: false }).addTo(map);
  setTimeout(() => {
    try { map.removeLayer(marker); } catch { /* already removed */ }
  }, duration);
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

export default function ThreatMapPage() {
  const { events, counters, countryCounts, typeCounts, connected } = useThreatStream();
  const [panelsCollapsed, setPanelsCollapsed] = useState(false);
  const leafletMapRef = useRef(null);
  const prevEventIdRef = useRef(null);

  const handleMapReady = useCallback((map) => {
    leafletMapRef.current = map;
  }, []);

  const mapContainerRef = useLeaflet({
    center: [25, 10],
    zoom: 2.5,
    onReady: handleMapReady,
  });

  // Add pulse markers for new events
  useEffect(() => {
    if (!events.length || !leafletMapRef.current) return;
    const latestId = events[0]?.id;
    if (latestId && latestId !== prevEventIdRef.current) {
      prevEventIdRef.current = latestId;
      const event = events[0];
      addPulseMarker(leafletMapRef.current, event.lat, event.lng, event.color);
    }
  }, [events]);

  const handleEventClick = useCallback((event) => {
    const map = leafletMapRef.current;
    if (!map || event.lat == null || event.lng == null) return;
    map.flyTo([event.lat, event.lng], 6);
    addHighlightPulse(map, event.lat, event.lng);
  }, []);

  return (
    <div className="relative -m-6" style={{ height: 'calc(100vh - 60px)' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', background: '#262626' }}></div>

      <ThreatMapStatus connected={connected} />

      <LeftOverlayPanel
        collapsed={panelsCollapsed}
        counters={counters}
        connected={connected}
        countryCounts={countryCounts}
        typeCounts={typeCounts}
      />

      <RightOverlayPanel
        collapsed={panelsCollapsed}
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
