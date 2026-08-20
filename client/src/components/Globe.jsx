import { useEffect, useRef } from "react";
import createGlobe from "cobe";

export default function Globe() {
  const canvasRef = useRef(null);
  const pointerInteracting = useRef(null);
  const pointerInteractionStart = useRef(0);
  const phiRef = useRef(0);

  useEffect(() => {
    let phi = 0;
    let animationFrameId = null;

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: 500 * 2,
      height: 500 * 2,
      phi: 0,
      theta: 0, // front facing tilt
      dark: 1,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6.0,
      baseColor: [1, 1, 1], // Pure white dots for maximum contrast
      markerColor: [0.1, 0.8, 1], // Cyan markers
      glowColor: [1.0, 1.0, 1.0], // White atmosphere and light reflections
      markers: [
        { location: [37.7595, -122.4367], size: 0.03 },
        { location: [40.7128, -74.0060], size: 0.04 },
        { location: [51.5074, -0.1278], size: 0.03 },
        { location: [35.6762, 139.6503], size: 0.03 },
        { location: [12.9716, 77.5946], size: 0.04 },
        { location: [28.6139, 77.2090], size: 0.04 },
        { location: [-33.8688, 151.2093], size: 0.03 },
      ],
    });

    const animate = () => {
      // Continuous constant rotation
      phi += 0.008;
      
      // Update the globe state
      globe.update({ phi: phi + phiRef.current });
      
      animationFrameId = requestAnimationFrame(animate);
    };

    // Start rendering loop
    animate();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      globe.destroy();
    };
  }, []);

  return (
    <div className="relative flex aspect-square w-full max-w-[450px] lg:max-w-[500px] items-center justify-center overflow-hidden bg-transparent mx-auto">
      {/* Visual background glows to replicate the premium feel of greynext */}
      <div className="absolute h-[380px] w-[380px] rounded-full bg-blue-500/5 blur-3xl pointer-events-none" />
      <div className="absolute h-[300px] w-[300px] rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
      
      {/* Globe glow outline */}
      <div className="absolute h-[280px] w-[280px] rounded-full border border-white/[0.04] bg-slate-900/20 shadow-[inset_0_0_50px_rgba(255,255,255,0.02),0_0_80px_rgba(59,130,246,0.08)] pointer-events-none z-0" />
      
      <canvas
        ref={canvasRef}
        onPointerDown={(e) => {
          pointerInteracting.current = e.clientX - pointerInteractionStart.current;
          canvasRef.current.style.cursor = "grabbing";
        }}
        onPointerUp={() => {
          pointerInteracting.current = null;
          canvasRef.current.style.cursor = "grab";
        }}
        onPointerOut={() => {
          pointerInteracting.current = null;
          canvasRef.current.style.cursor = "grab";
        }}
        onPointerMove={(e) => {
          if (pointerInteracting.current !== null) {
            const delta = e.clientX - pointerInteracting.current;
            pointerInteractionStart.current = delta;
            phiRef.current = delta / 200;
          }
        }}
        style={{
          width: 500,
          height: 500,
          maxWidth: "100%",
          aspectRatio: "1/1",
          cursor: "grab",
        }}
        className="z-10"
      />
    </div>
  );
}
