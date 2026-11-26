import { Component, Suspense, useEffect, useMemo, useState } from "react";
import { Canvas, useLoader, useThree } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { Box3, DoubleSide, Group, Matrix4, MeshStandardMaterial, PMREMGenerator, Vector3 } from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import ProfileBackground from "./ProfileBackground";

// MAF-STUDIO-WEAPONS-V1 : visionneur d'armes (FBX). Meme esprit que CarViewer.
class WeaponError extends Component {
  state = { failed: false, msg: "" };
  static getDerivedStateFromError(error) {
    return { failed: true, msg: String((error && error.message) || error || "") };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="notice" role="alert">
        Impossible de charger cette arme.
        <br /><small>{this.state.msg}</small>
        <br />
        <button type="button" onClick={() => { this.props.onRetry?.(); this.setState({ failed: false, msg: "" }); }}>
          Reessayer
        </button>
      </div>
    );
  }
}

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

const WEAPON_LENGTH = 3.4;
const AXES = ["x", "y", "z"];

// Les fichiers sont sans texture, en repere Z-haut et orientes differemment : on redresse chaque arme
// (canon vers la droite, dessus en haut, flanc vers la camera) a partir de sa forme et de sa masse.
function prepareWeapon(src) {
  const root = src.clone(true);
  root.traverse((o) => {
    if (!o.isMesh) return;
    const list = Array.isArray(o.material) ? o.material : [o.material];
    const out = list.map((m) => {
      const s = new MeshStandardMaterial({ color: m && m.color ? m.color.clone() : 0x8a8f98, metalness: 0.55, roughness: 0.42, side: DoubleSide });
      if (m && m.map) s.map = m.map;
      if (m && m.name) s.name = m.name;
      return s;
    });
    o.material = Array.isArray(o.material) ? out : out[0];
  });
  root.updateMatrixWorld(true);

  const v = new Vector3();
  const box = new Box3();
  const sum = new Vector3();
  let count = 0;
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry.attributes.position) return;
    const pos = o.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
      box.expandByPoint(v); sum.add(v); count++;
    }
  });
  const size = box.getSize(new Vector3());
  const ctr = box.getCenter(new Vector3());
  const mass = count ? sum.multiplyScalar(1 / count) : ctr.clone();

  const order = [0, 1, 2].sort((a, b) => size[AXES[b]] - size[AXES[a]]);   // du plus long au plus fin
  const iLen = order[0], iHei = order[1], iDep = order[2];
  const unit = (i, sign) => { const d = new Vector3(); d[AXES[i]] = sign; return d; };
  const sLen = mass[AXES[iLen]] - ctr[AXES[iLen]] > 0 ? -1 : 1;             // le canon est du cote le moins charge
  const sHei = mass[AXES[iHei]] - ctr[AXES[iHei]] >= 0 ? 1 : -1;            // le dessus porte la masse, le chargeur pend dessous
  const X = unit(iLen, sLen), Y = unit(iHei, sHei);
  const Z = new Vector3().crossVectors(X, Y);                               // repere direct garanti
  const orient = new Matrix4().set(X.x, X.y, X.z, 0, Y.x, Y.y, Y.z, 0, Z.x, Z.y, Z.z, 0, 0, 0, 0, 1);

  const oriented = new Group();
  oriented.matrixAutoUpdate = false;
  oriented.matrix.copy(orient);
  oriented.add(root);
  oriented.updateMatrixWorld(true);
  const fitBox = new Box3().setFromObject(oriented, true);
  const fs = fitBox.getSize(new Vector3());
  const fc = fitBox.getCenter(new Vector3());
  const s = WEAPON_LENGTH / Math.max(fs.x, fs.y, fs.z, 0.0001);
  return { object: oriented, scale: s, pos: [-fc.x * s, -fc.y * s, -fc.z * s] };
}

function WeaponModel({ url }) {
  const fbx = useLoader(FBXLoader, url);
  const fit = useMemo(() => prepareWeapon(fbx), [fbx]);
  return <group scale={fit.scale} position={fit.pos}><primitive object={fit.object} /></group>;
}

export default function WeaponViewer({ weapon, backgroundId }) {
  const [autoRotate, setAutoRotate] = useState(true);
  const [viewKey, setViewKey] = useState(0);
  const [tryKey, setTryKey] = useState(0);
  const url = `${import.meta.env.BASE_URL}${weapon.file}`;
  const retry = () => { try { useLoader.clear(FBXLoader, url); } catch { /* pas grave */ } setTryKey((v) => v + 1); };

  return (
    <section className="viewer-panel">
      <header className="viewer-header">
        <div>
          <span className="eyebrow">ARME · {weapon.category.toUpperCase()}</span>
          <h2>{weapon.name}</h2>
        </div>
        <span className="local-badge">Fichier local</span>
      </header>

      <div className="stage">
        <ProfileBackground id={backgroundId} />
        <WeaponError key={tryKey} onRetry={retry}>
          <Canvas
            gl={{ alpha: true, antialias: true }}
            dpr={[1, 1.5]}
            camera={{ position: [0.8, 0.9, 4.6], fov: 36 }}
            fallback={<div className="notice">WebGL indisponible.</div>}
          >
            <hemisphereLight args={["#dceaff", "#444036", 1.2]} />
            <directionalLight position={[4, 6, 5]} intensity={2.2} />
            <directionalLight position={[-4, 3, -3]} intensity={1.2} color="#a4baff" />
            <StudioReflections />
            <Suspense fallback={<Html center><div className="loading">Chargement de l'arme...</div></Html>}>
              <WeaponModel url={url} />
            </Suspense>
            <OrbitControls
              key={viewKey}
              makeDefault
              target={[0, 0, 0]}
              minDistance={2.2}
              maxDistance={9}
              enablePan={false}
              autoRotate={autoRotate}
              autoRotateSpeed={1.2}
              onStart={() => setAutoRotate(false)}
            />
          </Canvas>
        </WeaponError>
      </div>

      <div className="controls">
        <div className="button-row">
          <button aria-pressed={autoRotate} onClick={() => setAutoRotate((v) => !v)}>
            {autoRotate ? "Arreter la rotation" : "Rotation 360"}
          </button>
          <button onClick={() => setViewKey((v) => v + 1)}>Recentrer</button>
        </div>
      </div>

      <p className="help">Glisser : tourner autour de l'arme. Molette ou pincement : zoomer. Ces armes sont pour l'instant visibles ici, dans le Studio 3D.</p>
    </section>
  );
}
