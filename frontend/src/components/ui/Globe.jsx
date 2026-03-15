import { useEffect, useRef, useState, memo } from "react";
import * as d3 from "d3";

// Dark-theme-only hardcoded colors
const OCEAN_BG_COLOR = "#070511";
const GLOBE_STROKE_COLOR = "#a855f7";
const LAND_DOT_COLOR = "#a78bfa";

const PING_COLORS = [
  [239, 68, 68], // red
  [249, 115, 22], // orange
  [234, 179, 8], // yellow
];

const GEOJSON_URL =
  "https://raw.githubusercontent.com/martynafford/natural-earth-geojson/refs/heads/master/110m/physical/ne_110m_land.json";

export const Globe = memo(function Globe({ width = 600, height = 700, className = "" }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) return;

    const containerWidth = Math.min(width, window.innerWidth - 40);
    const containerHeight = Math.min(height, window.innerHeight - 100);
    const radius = Math.min(containerWidth, containerHeight) / 2.5;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = containerWidth * dpr;
    canvas.height = containerHeight * dpr;
    canvas.style.width = `${containerWidth}px`;
    canvas.style.height = `${containerHeight}px`;
    context.scale(dpr, dpr);

    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;

    const projection = d3
      .geoOrthographic()
      .scale(radius)
      .translate([centerX, centerY])
      .clipAngle(90);

    const path = d3.geoPath().projection(projection).context(context);

    // Cache graticule geometry — no need to recreate every frame
    const graticuleData = d3.geoGraticule()();

    const pointInPolygon = (point, polygon) => {
      const [x, y] = point;
      let inside = false;
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, yi] = polygon[i];
        const [xj, yj] = polygon[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
          inside = !inside;
        }
      }
      return inside;
    };

    const pointInFeature = (point, feature) => {
      const geometry = feature.geometry;
      if (geometry.type === "Polygon") {
        const coordinates = geometry.coordinates;
        if (!pointInPolygon(point, coordinates[0])) return false;
        for (let i = 1; i < coordinates.length; i++) {
          if (pointInPolygon(point, coordinates[i])) return false;
        }
        return true;
      } else if (geometry.type === "MultiPolygon") {
        for (const polygon of geometry.coordinates) {
          if (pointInPolygon(point, polygon[0])) {
            let inHole = false;
            for (let i = 1; i < polygon.length; i++) {
              if (pointInPolygon(point, polygon[i])) {
                inHole = true;
                break;
              }
            }
            if (!inHole) return true;
          }
        }
        return false;
      }
      return false;
    };

    const generateDotsInPolygon = (feature, dotSpacing = 18) => {
      const dots = [];
      const bounds = d3.geoBounds(feature);
      const [[minLng, minLat], [maxLng, maxLat]] = bounds;
      const stepSize = dotSpacing * 0.08;
      for (let lng = minLng; lng <= maxLng; lng += stepSize) {
        for (let lat = minLat; lat <= maxLat; lat += stepSize) {
          const point = [lng, lat];
          if (pointInFeature(point, feature)) {
            dots.push(point);
          }
        }
      }
      return dots;
    };

    // Store dots as flat arrays for faster iteration
    let dotLngs = null;
    let dotLats = null;
    let dotCount = 0;
    const pings = [];
    let pingColorIndex = 0;
    let landFeatures;
    let isVisible = true;
    const dotRadius = 1.2;

    const render = () => {
      context.clearRect(0, 0, containerWidth, containerHeight);

      const currentScale = projection.scale();
      const scaleFactor = currentScale / radius;

      // Ocean background
      context.beginPath();
      context.arc(centerX, centerY, currentScale, 0, 2 * Math.PI);
      context.fillStyle = OCEAN_BG_COLOR;
      context.fill();
      context.strokeStyle = GLOBE_STROKE_COLOR;
      context.lineWidth = 2 * scaleFactor;
      context.stroke();

      if (!landFeatures) return;

      // Graticule (cached geometry)
      context.beginPath();
      path(graticuleData);
      context.strokeStyle = GLOBE_STROKE_COLOR;
      context.lineWidth = scaleFactor;
      context.globalAlpha = 0.15;
      context.stroke();
      context.globalAlpha = 1;

      // Land outlines
      context.beginPath();
      for (const feature of landFeatures.features) {
        path(feature);
      }
      context.strokeStyle = GLOBE_STROKE_COLOR;
      context.lineWidth = scaleFactor;
      context.stroke();

      // Halftone dots — front-face only, single batched path
      const r = dotRadius * scaleFactor;
      const twoPi = 2 * Math.PI;
      const DEG = Math.PI / 180;
      const rot = projection.rotate();
      const lambda0 = -rot[0] * DEG;
      const phi0 = -rot[1] * DEG;
      const cosPhi0 = Math.cos(phi0);
      const sinPhi0 = Math.sin(phi0);

      context.beginPath();
      for (let i = 0; i < dotCount; i++) {
        // Back-face cull: skip dots on the far side of the globe
        const lambda = dotLngs[i] * DEG;
        const phi = dotLats[i] * DEG;
        const cosC = sinPhi0 * Math.sin(phi) + cosPhi0 * Math.cos(phi) * Math.cos(lambda - lambda0);
        if (cosC < 0) continue;

        const projected = projection([dotLngs[i], dotLats[i]]);
        if (projected) {
          const px = projected[0];
          const py = projected[1];
          if (px >= 0 && px <= containerWidth && py >= 0 && py <= containerHeight) {
            context.moveTo(px + r, py);
            context.arc(px, py, r, 0, twoPi);
          }
        }
      }
      context.fillStyle = LAND_DOT_COLOR;
      context.fill();

      // Threat pings
      if (pings.length === 0) return;
      const now = Date.now();
      for (let i = pings.length - 1; i >= 0; i--) {
        const ping = pings[i];
        const elapsed = now - ping.startTime;
        const progress = elapsed / ping.duration;
        if (progress >= 1) {
          pings.splice(i, 1);
          continue;
        }

        // Back-face cull pings too
        const pLambda = ping.lng * DEG;
        const pPhi = ping.lat * DEG;
        const pCosC = sinPhi0 * Math.sin(pPhi) + cosPhi0 * Math.cos(pPhi) * Math.cos(pLambda - lambda0);
        if (pCosC < 0) continue;

        const projected = projection([ping.lng, ping.lat]);
        if (!projected) continue;

        const eased = 1 - Math.pow(1 - progress, 3);
        const [cr, cg, cb] = ping.color;
        const fade = 1 - progress;

        // Center dot
        context.beginPath();
        context.arc(projected[0], projected[1], 3 * scaleFactor, 0, twoPi);
        context.fillStyle = `rgba(${cr},${cg},${cb},${fade})`;
        context.fill();

        // Expanding ring
        context.beginPath();
        context.arc(projected[0], projected[1], eased * 20 * scaleFactor, 0, twoPi);
        context.strokeStyle = `rgba(${cr},${cg},${cb},${fade * 0.8})`;
        context.lineWidth = 1.5 * scaleFactor;
        context.stroke();
      }
    };

    const loadWorldData = async () => {
      try {
        const response = await fetch(GEOJSON_URL);
        if (!response.ok) throw new Error("Failed to load land data");

        landFeatures = await response.json();

        const tempDots = [];
        for (const feature of landFeatures.features) {
          const dots = generateDotsInPolygon(feature, 18);
          for (const [lng, lat] of dots) {
            tempDots.push(lng, lat);
          }
        }

        // Store as typed arrays for cache-friendly iteration
        dotCount = tempDots.length / 2;
        dotLngs = new Float64Array(dotCount);
        dotLats = new Float64Array(dotCount);
        for (let i = 0; i < dotCount; i++) {
          dotLngs[i] = tempDots[i * 2];
          dotLats[i] = tempDots[i * 2 + 1];
        }

        render();
      } catch (err) {
        setError("Failed to load land map data");
      }
    };

    // Rotation and interaction
    const rotation = [0, 0];
    let autoRotate = true;
    const rotationSpeed = 0.2;

    const rotationTimer = d3.timer(() => {
      if (!isVisible) return;
      if (autoRotate) {
        rotation[0] += rotationSpeed;
        projection.rotate(rotation);
        render();
      }
    });

    // Pause when off-screen to free up main thread for scroll
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
      },
      { threshold: 0 }
    );
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    const handleMouseDown = (event) => {
      autoRotate = false;
      const startX = event.clientX;
      const startRotation = [...rotation];

      const handleMouseMove = (moveEvent) => {
        const dx = moveEvent.clientX - startX;
        rotation[0] = startRotation[0] + dx * 0.5;
        projection.rotate(rotation);
        render();
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        setTimeout(() => {
          autoRotate = true;
        }, 10);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    };

    canvas.addEventListener("mousedown", handleMouseDown);

    loadWorldData();

    const pingInterval = setInterval(() => {
      if (dotCount === 0) return;
      const idx = Math.floor(Math.random() * dotCount);
      const color = PING_COLORS[pingColorIndex % PING_COLORS.length];
      pingColorIndex++;
      pings.push({
        lng: dotLngs[idx],
        lat: dotLats[idx],
        startTime: Date.now(),
        duration: 1500,
        color,
      });
    }, 300);

    return () => {
      rotationTimer.stop();
      clearInterval(pingInterval);
      observer.disconnect();
      canvas.removeEventListener("mousedown", handleMouseDown);
    };
  }, [width, height]);

  if (error) {
    return (
      <div className={className}>
        <div style={{ textAlign: "center" }}>
          <p className="text-red font-display font-semibold mb-2">
            Error loading Earth visualization
          </p>
          <p className="text-text-secondary text-sm font-mono">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: "relative", willChange: "transform" }}
    >
      <canvas
        ref={canvasRef}
        style={{
          maxWidth: "100%",
          height: "auto",
          cursor: "grab",
        }}
      />
    </div>
  );
});
