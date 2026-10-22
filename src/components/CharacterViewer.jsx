import { createLokiRun } from "../characters/samba/lokiRun";
import { createFootballKick } from "../characters/samba/footballKick";
import {
  Component, Suspense, useEffect, useMemo, useState,
} from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { AnimationMixer, Box3, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";

class ViewerError extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? (
      <div className="notice" role="alert">
        Impossible de charger ce personnage.
        Verifie son fichier dans public/characters, puis recharge la page.
      </div>
    ) : this.props.children;
  }
}

function AnimatedModel({
  source, clips, character, active, paused, speed, onClips,
}) {
  const model = useMemo(() => {
    const copy = clone(source);
    copy.traverse((object) => {
      if (object.isMesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
    return copy;
  }, [source]);

  const framing = useMemo(() => {
    model.updateMatrixWorld(true);
    const box = new Box3().setFromObject(model);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());

    return {
      scale: 1.85 / Math.max(size.y, 0.01),
      offset: [-center.x, -box.min.y, -center.z],
    };
  }, [model]);

  const mixer = useMemo(() => new AnimationMixer(model), [model]);

  useEffect(() => {
    onClips(clips.map((clip, index) => ({
      index,
      name: clip.name || `Animation ${index + 1}`,
    })));
  }, [clips, onClips]);

  useEffect(() => {
    const clip = clips[active];
    if (!clip) return;

    const action = mixer.clipAction(clip);
    action.reset().setEffectiveWeight(1).fadeIn(0.25).play();

    return () => {
      action.fadeOut(0.25);
    };
  }, [active, clips, mixer]);

  useEffect(() => {
    return () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
    };
  }, [mixer, model]);

  useFrame((_, delta) => {
    if (!paused) mixer.update(Math.min(delta, 0.05) * speed);
  });

  return (
    <group rotation={[0, character.rotation || 0, 0]}>
      <group scale={framing.scale}>
        <group position={framing.offset}>
          <primitive object={model} dispose={null} />
        </group>
      </group>
    </group>
  );
}

function GlbCharacter(props) {
  const data = useLoader(
    GLTFLoader,
    `${import.meta.env.BASE_URL}${props.character.file}`
  );
  return (
    <AnimatedModel
      {...props}
      source={data.scene}
      clips={data.animations}
    />
  );
}

function FbxCharacter(props) {
  const data = useLoader(
    FBXLoader,
    `${import.meta.env.BASE_URL}${props.character.file}`
  );

  const loki = useLoader(
    GLTFLoader,
    `${import.meta.env.BASE_URL}characters/loki/model.glb`
  );

  const clips = useMemo(() => {
    if (props.character.id !== "samba") return data.animations;

    const original = data.animations
      .filter((clip) => clip.duration > 0 && clip.tracks.length > 0)
      .map((clip, index) => {
        const copy = clip.clone();
        if (index === 0) copy.name = "Danser";
        return copy;
      });

    const kick = createFootballKick(data);
    const run = createLokiRun(data, loki);

    return [
      ...original,
      ...(kick ? [kick] : []),
      run,
    ];
  }, [data, loki, props.character.id]);

  return (
    <AnimatedModel
      {...props}
      source={data}
      clips={clips}
    />
  );
}

function label(name, character, count) {
  if (character.id === "samba" && count === 1) return "Danser";
  const key = name.toLowerCase().replace(/[^a-z]/g, "");
  return {
    idle: "Repos",
    walk: "Marcher",
    run: "Courir",
    tpose: "Pose en T",
  }[key] || name;
}

export default function CharacterViewer({ character }) {
  const [clips, setClips] = useState([]);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [autoRotate, setAutoRotate] = useState(false);
  const [viewKey, setViewKey] = useState(0);

  const Character = character.format === "fbx"
    ? FbxCharacter
    : GlbCharacter;

  return (
    <section className="viewer-panel">
      <header className="viewer-header">
        <div>
          <span className="eyebrow">PERSONNAGE SELECTIONNE</span>
          <h2>{character.name}</h2>
        </div>
        <span className="local-badge">Fichier local</span>
      </header>

      <div className="stage">
        <ViewerError>
          <Canvas
            shadows
            dpr={[1, 1.5]}
            camera={{ position: [2.6, 1.8, 4], fov: 38 }}
            fallback={<div className="notice">WebGL indisponible.</div>}
          >
            <color attach="background" args={["#151e2b"]} />
            <hemisphereLight args={["#dceaff", "#444036", 2.2]} />

            <directionalLight
              position={[3, 5, 4]}
              intensity={3}
              castShadow
              shadow-mapSize={[1024, 1024]}
              shadow-normalBias={0.03}
            />
            <directionalLight
              position={[-3, 3, -3]}
              intensity={2}
              color="#a4baff"
            />

            <Suspense fallback={
              <Html center>
                <div className="loading">Chargement du personnage...</div>
              </Html>
            }>
              <Character
                character={character}
                active={active}
                paused={paused}
                speed={speed}
                onClips={setClips}
              />
            </Suspense>

            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              position={[0, -0.02, 0]}
              receiveShadow
            >
              <planeGeometry args={[200, 200]} />
              <meshStandardMaterial color="#253044" roughness={0.95} />
            </mesh>

            <OrbitControls
              key={viewKey}
              makeDefault
              target={[0, 0.95, 0]}
              minDistance={1.5}
              maxDistance={9}
              maxPolarAngle={Math.PI / 2 - 0.02}
              enablePan={false}
              autoRotate={autoRotate}
              autoRotateSpeed={1.5}
              onStart={() => setAutoRotate(false)}
            />
          </Canvas>
        </ViewerError>
      </div>

      <div className="controls">
        <div className="button-row">
          {clips.map((clip) => (
            <button
              key={clip.index}
              aria-pressed={active === clip.index}
              className={active === clip.index ? "active" : ""}
              onClick={() => {
                setActive(clip.index);
                setPaused(false);
              }}
            >
              {label(clip.name, character, clips.length)}
            </button>
          ))}

          <button
            disabled={!clips.length}
            onClick={() => setPaused((value) => !value)}
          >
            {paused ? "Reprendre" : "Pause"}
          </button>

          <button
            aria-pressed={autoRotate}
            onClick={() => setAutoRotate((value) => !value)}
          >
            {autoRotate ? "Arreter la rotation" : "Rotation 360"}
          </button>

          <button onClick={() => setViewKey((value) => value + 1)}>
            Recentrer
          </button>
        </div>

        <label className="speed">
          Vitesse x{speed.toFixed(1)}
          <input
            type="range"
            min="0.2"
            max="2"
            step="0.1"
            value={speed}
            onChange={(event) => setSpeed(Number(event.target.value))}
          />
        </label>
      </div>

      <p className="help">
        Glisser : tourner autour du personnage.
        Molette ou pincement : zoomer.
        Les animations sont celles incluses dans le modele.
      </p>
    </section>
  );
}