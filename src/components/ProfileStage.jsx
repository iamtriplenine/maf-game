import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
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

export default function ProfileStage() {
  const accent = useAccent();

  return (
    <div className="profile__canvas">
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
          <group rotation={[0, Math.PI - 0.3, 0]} position={[0, -0.05, 0]}>
            <Loki
              animation="Walk"
              paused={false}
              speed={1}
              onAnimations={noop}
            />
          </group>
        </Suspense>
      </Canvas>
    </div>
  );
}