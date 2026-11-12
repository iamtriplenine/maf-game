import { Component, Suspense, useEffect, useMemo, useState } from "react";
import { Canvas, useLoader, useThree } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { Box3, PMREMGenerator, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import ProfileBackground from "./ProfileBackground";

// Affiche la vraie raison de l'erreur (utile pour comprendre un probleme sur un appareil) + bouton Reessayer.
class CarError extends Component {
  state = { failed: false, msg: "" };
  static getDerivedStateFromError(error) {
    return { failed: true, msg: String((error && error.message) || error || "") };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="notice" role="alert">
        Impossible de charger cette voiture.
        <br /><small>{this.state.msg}</small>
        <br />
        <button type="button" onClick={() => { this.props.onRetry?.(); this.setState({ failed: false, msg: "" }); }}>
          Reessayer
        </button>
      </div>
    );
  }
}

// Reflets de studio generes localement (aucun telechargement) : la carrosserie reste lisible.
function StudioReflections() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04);
    const previous = scene.environment;
    scene.environment = env.texture;
    return () => { scene.environment = previous; env.dispose(); pmrem.dispose(); };
  }, [gl, scene]);
  return null;
}

// Longueur 4.4 u, voiture centree, roues posees sur le sol.
const CAR_LENGTH = 4.4;

function CarModel({ url }) {
  const gltf = useLoader(GLTFLoader, url);
  const fit = useMemo(() => {
    gltf.scene.updateMatrixWorld(true);
    const box = new Box3().setFromObject(gltf.scene);
    const size = box.getSize(new Vector3());
    const ctr = box.getCenter(new Vector3());
    const s = CAR_LENGTH / Math.max(size.x, size.z, 0.01);
    return { s, pos: [-ctr.x * s, -box.min.y * s, -ctr.z * s] };
  }, [gltf]);
  return <group scale={fit.s} position={fit.pos}><primitive object={gltf.scene} /></group>;
}

export default function CarViewer({ car, backgroundId }) {
  const [autoRotate, setAutoRotate] = useState(true);
  const [viewKey, setViewKey] = useState(0);
  const [tryKey, setTryKey] = useState(0);
  const url = `${import.meta.env.BASE_URL}${car.file}`;
  const retry = () => { try { useLoader.clear(GLTFLoader, url); } catch { /* pas grave */ } setTryKey((v) => v + 1); };

  return (
    <section className="viewer-panel">
      <header className="viewer-header">
        <div>
          <span className="eyebrow">VOITURE · {car.eyebrow || "DISPONIBLE POUR TOUS"}</span>
          <h2>{car.name}</h2>
        </div>
        <span className="local-badge">Fichier local</span>
      </header>

      <div className="stage">
        <ProfileBackground id={backgroundId} />
        <CarError key={tryKey} onRetry={retry}>
          <Canvas
            gl={{ alpha: true, antialias: true }}
            dpr={[1, 1.5]}
            camera={{ position: [5.2, 1.9, 6.2], fov: 36 }}
            fallback={<div className="notice">WebGL indisponible.</div>}
          >
            <hemisphereLight args={["#dceaff", "#444036", 1.2]} />
            <directionalLight position={[4, 6, 5]} intensity={2.2} />
            <directionalLight position={[-4, 3, -3]} intensity={1.2} color="#a4baff" />
            <StudioReflections />
            <Suspense fallback={<Html center><div className="loading">Chargement de la voiture...</div></Html>}>
              <CarModel url={url} />
            </Suspense>
            <OrbitControls
              key={viewKey}
              makeDefault
              target={[0, 0.6, 0]}
              minDistance={3.5}
              maxDistance={12}
              maxPolarAngle={Math.PI / 2 - 0.02}
              enablePan={false}
              autoRotate={autoRotate}
              autoRotateSpeed={1.2}
              onStart={() => setAutoRotate(false)}
            />
          </Canvas>
        </CarError>
      </div>

      <div className="controls">
        <div className="button-row">
          <button aria-pressed={autoRotate} onClick={() => setAutoRotate((v) => !v)}>
            {autoRotate ? "Arreter la rotation" : "Rotation 360"}
          </button>
          <button onClick={() => setViewKey((v) => v + 1)}>Recentrer</button>
        </div>
      </div>

      <p className="help">Glisser : tourner autour de la voiture. Molette ou pincement : zoomer. Chaque joueur recoit cette voiture dans le World.</p>
    </section>
  );
}
