import { useRef, useEffect } from 'react';
import L from 'leaflet';

export function useLeaflet({ center, zoom, markers, onReady }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = L.map(containerRef.current, {
      center,
      zoom,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    // Add popup styles
    const style = document.createElement('style');
    style.textContent = `.dark-popup .leaflet-popup-content-wrapper{background:transparent;box-shadow:none;padding:0;}.dark-popup .leaflet-popup-tip{display:none;}`;
    document.head.appendChild(style);

    if (markers) {
      markers.forEach(point => {
        const size = point.size || 10;
        const marker = L.divIcon({
          className: 'threat-marker',
          html: point.html || `<div class="map-marker"><div class="threat-pulse" style="background:rgba(255,59,92,0.3);width:20px;height:20px;border-radius:50%;position:absolute;inset:-5px;"></div></div>`,
          iconSize: [size, size],
        });

        L.marker([point.lat, point.lng], { icon: marker })
          .addTo(map)
          .bindPopup(point.popup || '', { className: 'dark-popup', closeButton: false });
      });
    }

    mapRef.current = map;
    if (onReady) onReady(map);

    return () => {
      map.remove();
      mapRef.current = null;
      style.remove();
    };
  }, []);

  return containerRef;
}
