import { useEffect, useRef, useCallback, memo } from "react";
import createGlobe from "cobe";

export const Globe = memo(function Globe({ className }) {
  const canvasRef = useRef(null);
  const pointerInteracting = useRef(null);
  const pointerInteractionMovement = useRef(0);
  const phiRef = useRef(0);
  const widthRef = useRef(0);

  const onResize = useCallback(() => {
    if (canvasRef.current) {
      widthRef.current = canvasRef.current.offsetWidth;
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    window.addEventListener("resize", onResize);
    onResize();

    const dpr = Math.min(window.devicePixelRatio, 1.5);

    const globe = createGlobe(canvas, {
      devicePixelRatio: dpr,
      width: widthRef.current * dpr,
      height: widthRef.current * dpr,
      phi: 0,
      theta: 0.25,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 20000,
      mapBrightness: 12,
      baseColor: [0.039, 0.043, 0.063],
      markerColor: [0.478, 0.267, 0.894],
      glowColor: [0.608, 0.420, 0.969],
      markers: [
        { location: [37.7749, -122.4194], size: 0.06 },
        { location: [51.5074, -0.1278], size: 0.06 },
        { location: [35.6762, 139.6503], size: 0.06 },
        { location: [-33.8688, 151.2093], size: 0.05 },
        { location: [1.3521, 103.8198], size: 0.05 },
        { location: [55.7558, 37.6173], size: 0.06 },
        { location: [48.8566, 2.3522], size: 0.05 },
        { location: [-23.5505, -46.6333], size: 0.05 },
      ],
      onRender: (state) => {
        if (!pointerInteracting.current) {
          phiRef.current += 0.005;
        }
        state.phi = phiRef.current + pointerInteractionMovement.current;
        state.width = widthRef.current * dpr;
        state.height = widthRef.current * dpr;
      },
    });

    const handlePointerDown = (e) => {
      pointerInteracting.current =
        e.clientX - pointerInteractionMovement.current;
      canvas.style.cursor = "grabbing";
    };

    const handlePointerUp = () => {
      pointerInteracting.current = null;
      canvas.style.cursor = "grab";
    };

    const handlePointerOut = () => {
      pointerInteracting.current = null;
      canvas.style.cursor = "grab";
    };

    const handlePointerMove = (e) => {
      if (pointerInteracting.current !== null) {
        const delta = e.clientX - pointerInteracting.current;
        pointerInteractionMovement.current = delta / 200;
      }
    };

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointerout", handlePointerOut);
    canvas.addEventListener("pointermove", handlePointerMove);

    return () => {
      globe.destroy();
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointerout", handlePointerOut);
      canvas.removeEventListener("pointermove", handlePointerMove);
    };
  }, [onResize]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        width: "100%",
        height: "100%",
        cursor: "grab",
        contain: "layout paint size",
        aspectRatio: "1 / 1",
        willChange: "transform",
      }}
    />
  );
});
