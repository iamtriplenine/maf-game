import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import Loki from "../characters/loki/Loki";

const noop = () => {};

function readAccent() {
  return (
    getComputedStyle(document.documentElement)
      .getPropertyValue("--accent")
      .trim() || "#2bb8ff"
  );
}

// Suit le theme (ciel / rose) pour teinter la lumiere de contour.
function useAccent() {
  const [accent, setAccent] = useState(readAccent);

  useEffect(() => {
    const observer = new MutationObserver(() => setAccent(readAccent()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return accent;
}

const BASE_ANGLE = Math.PI - 0.3;

// Glisser horizontalement = tourner le personnage (360 degres, rien d'autre).
function useDragRotation() {
  const angle = useRef(0);
  const lastX = useRef(null);

  const end = () => {
    lastX.current = null;
  };

  const handlers = {
    onPointerDown: (event) => {
      lastX.current = event.clientX;
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove: (event) => {
      if (lastX.current === null) return;
      angle.current += (event.clientX - lastX.current) * 0.012;
      lastX.current = event.clientX;
    },
    onPointerUp: end,
    onPointerCancel: end,
  };

  return { angle, handlers };
}

// Fait pivoter le personnage en douceur ; l'animation de marche continue.
function Turntable({ angle, children, ...props }) {
  const ref = useRef();

  useEffect(() => {
    if (ref.current) ref.current.rotation.y = BASE_ANGLE + angle.current;
  }, [angle]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const smooth = 1 - Math.exp(-delta * 12);
    const target = BASE_ANGLE + angle.current;
    ref.current.rotation.y += (target - ref.current.rotation.y) * smooth;
  });

  return (
    <group ref={ref} {...props}>
      {children}
    </group>
  );
}
export default function ProfileStage() {
  const accent = useAccent();
  const drag = useDragRotation();

  return (
    <div className="profile__canvas" {...drag.handlers}>
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0.85, 5.9], fov: 30 }}
        onCreated={({ camera }) => camera.lookAt(0, 0.47, 0)}
        fallback={<div className="notice">WebGL indisponible.</div>}
      >
        <hemisphereLight args={["#ffffff", "#334455", 1.7]} />
        <directionalLight position={[2, 4, 4]} intensity={2.6} />
        <directionalLight position={[-3, 2, -2]} intensity={3.2} color={accent} />

        <Suspense fallback={null}>
          <Turntable angle={drag.angle} position={[0, -0.05, 0]}>
            <Loki
              animation="Walk"
              paused={false}
              speed={1}
              onAnimations={noop}
            />
          </Turntable>
        </Suspense>
      </Canvas>
    </div>
  );
}