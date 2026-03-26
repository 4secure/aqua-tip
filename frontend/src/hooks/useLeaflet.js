import { useRef, useEffect } from 'react';
import L from 'leaflet';

export function useLeaflet({ center, zoom, markers, onReady }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerLayerRef = useRef(null);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current) return;

    containerRef.current.style.background = '#262626';

    const map = L.map(containerRef.current, {
      center,
      zoom: Math.max(zoom, 2),
      zoomControl: false,
      attributionControl: false,
      maxBounds: [[-90, -200], [90, 200]],
      maxBoundsViscosity: 1.0,
      minZoom: 2,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
      noWrap: true,
      bounds: [[-90, -180], [90, 180]],
    }).addTo(map);

    // Add popup styles
    const style = document.createElement('style');
    style.textContent = `.dark-popup .leaflet-popup-content-wrapper{background:transparent;box-shadow:none;padding:0;}.dark-popup .leaflet-popup-tip{display:none;}`;
    document.head.appendChild(style);

    markerLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    if (onReady) onReady(map);

    return () => {
      map.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
      style.remove();
    };
  }, []);

  // Update markers when they change
  useEffect(() => {
    if (!markerLayerRef.current) return;
    markerLayerRef.current.clearLayers();

    if (markers) {
      markers.forEach(point => {
        if (point.lat == null || point.lng == null) return;
        const size = point.size || 10;
        const icon = L.divIcon({
          className: 'threat-marker',
          html: point.html || `<div class="map-marker"><div class="threat-pulse" style="background:rgba(255,59,92,0.3);width:20px;height:20px;border-radius:50%;position:absolute;inset:-5px;"></div></div>`,
          iconSize: [size, size],
        });

        L.marker([point.lat, point.lng], { icon })
          .addTo(markerLayerRef.current)
          .bindPopup(point.popup || '', { className: 'dark-popup', closeButton: false });
      });
    }
  }, [markers]);

  return containerRef;
}
