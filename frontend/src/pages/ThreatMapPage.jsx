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

const STORAGE_KEY = 'aqua-tip:panels-collapsed';

export default function ThreatMapPage() {
  const { events, counters, countryCounts, typeCounts, connected } = useThreatStream();

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

  // Sync panelsCollapsed to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(panelsCollapsed));
    } catch {
      // localStorage unavailable — degrade silently
    }
  }, [panelsCollapsed]);

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
    <div className="relative -m-6" style={{ height: 'calc(100vh - 60px)' }}>
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
        typeCounts={typeCounts}
        events={events}
        onEventClick={handleEventClick}
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
