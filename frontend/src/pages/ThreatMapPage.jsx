import { useRef, useEffect, useCallback } from 'react';
import L from 'leaflet';
import { useLeaflet } from '../hooks/useLeaflet';
import { useThreatStream } from '../hooks/useThreatStream';
import ThreatMapCounters from '../components/threat-map/ThreatMapCounters';
import ThreatMapCountries from '../components/threat-map/ThreatMapCountries';
import ThreatMapDonut from '../components/threat-map/ThreatMapDonut';
import ThreatMapFeed from '../components/threat-map/ThreatMapFeed';
import ThreatMapStatus from '../components/threat-map/ThreatMapStatus';

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
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }}></div>

      <ThreatMapStatus connected={connected} />

      {/* Left sidebar overlay */}
      <div className="absolute top-4 left-4 z-[1000] w-[340px] space-y-4">
        <ThreatMapCounters counters={counters} connected={connected} />
        <ThreatMapCountries countryCounts={countryCounts} />
        <ThreatMapDonut typeCounts={typeCounts} />
      </div>

      {/* Bottom-right feed */}
      <div className="absolute bottom-4 right-4 z-[1000] w-[380px]">
        <ThreatMapFeed events={events} onEventClick={handleEventClick} />
      </div>
    </div>
  );
}
