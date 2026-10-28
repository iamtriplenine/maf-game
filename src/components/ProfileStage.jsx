import { Component, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { AnimationMixer, Box3, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import Loki from "../characters/loki/Loki";
import { getSkin } from "../characters/skins";

const noop = () => {};

function readAccent() {
  return (
    getComputedStyle(document.documentElement)
      .getPropertyValue("--accent")
      .trim() || "#2bb8ff"
  );
}

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

// Glisser horizontalement : rotation 360 degres, sans interrompre la marche.
function useDragRotation() {
  const angle = useRef(0);
  const lastX = useRef(null);
  const end = () => { lastX.current = null; };
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

function Turntable({ angle, baseAngle, children }) {
  const ref = useRef();
  useEffect(() => {
    if (ref.current) ref.current.rotation.y = baseAngle + angle.current;
  }, [angle, baseAngle]);
  useFrame((_, delta) => {
    if (!ref.current) return;
    const target = baseAngle + angle.current;
    ref.current.rotation.y += (target - ref.current.rotation.y) * (1 - Math.exp(-delta * 12));
  });
  return <group ref={ref} position={[0, -0.05, 0]}>{children}</group>;
}

class SkinError extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? (
      <div className="profile__model-error" role="alert">
        Impossible de charger ce skin. Choisis un autre personnage dans Personnalisation.
      </div>
    ) : this.props.children;
  }
}

function chooseAnimation(clips, skin) {
  if (skin.movementType === "none") return null;
  const valid = clips.filter((clip) => clip.duration > 0 && clip.tracks.length > 0);
  if (!valid.length) return null;
  if (skin.movementType === "run" || skin.movementType === "attack" || skin.movementType === "swipe") {
    // Certains exports Mixamo contiennent un Take vide en plus du vrai mouvement.
    const main = valid.reduce((best, clip) => (
      clip.tracks.length > best.tracks.length ? clip : best
    ));
    const copy = main.clone();
    // Garder le personnage visible sur le profil meme si sa course avance.
    for (const track of copy.tracks) {
      if (!/mixamorigHips\.position$/.test(track.name)) continue;
      const x = track.values[0];
      const z = track.values[2];
      for (let index = 0; index < track.values.length; index += 3) {
        track.values[index] = x;
        track.values[index + 2] = z;
      }
    }
    return copy;
  }
  if (skin.movementType === "dance") {
    return valid.find((clip) => /danc|samba|danse/i.test(clip.name)) || valid[0];
  }
  return valid.find((clip) => /walk|marche|defile|catwalk|strut/i.test(clip.name)) || valid[0];
}

function AnimatedSkin({ source, clips, skin }) {
  // Clone avec squelette independant : ne jamais manipuler l'original en cache.
  const model = useMemo(() => clone(source), [source]);
  const positionAndScale = useMemo(() => {
    model.updateMatrixWorld(true);
    const box = new Box3().setFromObject(model);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const scale = 2.0 / Math.max(size.y, 0.01);
    return {
      scale,
      position: [-center.x * scale, -box.min.y * scale, -center.z * scale],
    };
  }, [model]);
  const mixer = useMemo(() => new AnimationMixer(model), [model]);
  const clip = useMemo(() => chooseAnimation(clips, skin), [clips, skin]);

  useEffect(() => {
    if (!clip) return undefined;
    const action = mixer.clipAction(clip);
    action.reset().setEffectiveWeight(1).play();
    return () => action.stop();
  }, [clip, mixer]);

  useEffect(() => () => {
    mixer.stopAllAction();
    mixer.uncacheRoot(model);
  }, [mixer, model]);

  useFrame((_, delta) => {
    if (clip) mixer.update(Math.min(delta, 0.05));
  });

  return (
    <group position={positionAndScale.position} scale={positionAndScale.scale}>
      <primitive object={model} dispose={null} />
    </group>
  );
}

function GlbSkin({ skin }) {
  const data = useLoader(GLTFLoader, `${import.meta.env.BASE_URL}${skin.file}`);
  return <AnimatedSkin source={data.scene} clips={data.animations} skin={skin} />;
}

function FbxMotionSkin({ skin, source }) {
  // On charge le FBX de mouvement uniquement pour le skin qui le demande.
  // Le corps affiche reste toujours le vrai mutant, jamais Beta_Surface.
  const motion = useLoader(FBXLoader, `${import.meta.env.BASE_URL}${skin.animationFile}`);
  return <AnimatedSkin source={source} clips={motion.animations} skin={skin} />;
}

// Le Profil joue la marche de Bailarina sur le MODELE Ladybug.
// La translation des hanches est retiree pour ne pas importer l'echelle GLB.
function FbxBorrowedWalkSkin({ skin, source }) {
  const walk = useLoader(GLTFLoader, `${import.meta.env.BASE_URL}${skin.walkFile}`);
  const clips = useMemo(() => walk.animations
    .filter((clip) => clip.duration > 0 && clip.tracks.length > 0)
    .slice(0, 1)
    .map((clip) => {
      const copy = clip.clone();
      copy.name = "Marcher";
      copy.tracks = copy.tracks.filter((track) => !/mixamorigHips\.position$/i.test(track.name));
      return copy;
    }), [walk]);
  return <AnimatedSkin source={source} clips={clips} skin={skin} />;
}

function FbxSkin({ skin }) {
  const data = useLoader(FBXLoader, `${import.meta.env.BASE_URL}${skin.file}`);
  if (skin.walkFile) return <FbxBorrowedWalkSkin skin={skin} source={data} />;
  if (skin.animationFile) {
    return <FbxMotionSkin skin={skin} source={data} />;
  }
  return <AnimatedSkin source={data} clips={data.animations} skin={skin} />;
}

function SkinModel({ skin }) {
  if (skin.id === "loki") {
    // Garder exactement le rendu et la marche du profil d'origine.
    return <Loki animation="Walk" paused={false} speed={1} onAnimations={noop} />;
  }
  if (skin.format === "fbx") return <FbxSkin skin={skin} />;
  return <GlbSkin skin={skin} />;
}

export default function ProfileStage({ skinId, compact = false }) {
  const accent = useAccent();
  const drag = useDragRotation();
  const skin = getSkin(skinId);
  return (
    <div className={compact ? "skin-card__preview-canvas" : "profile__canvas"} {...(compact ? {} : drag.handlers)}>
      <SkinError key={skin.id}>
        <Canvas
          dpr={compact ? [1, 1] : [1, 1.75]}
          camera={compact ? { position: [0, 0.85, 6], fov: 38 } : { position: [0, 0.85, 5.9], fov: 30 }}
          onCreated={({ camera }) => camera.lookAt(0, 0.47, 0)}
          fallback={<div className="notice">WebGL indisponible.</div>}
        >
          <hemisphereLight args={["#ffffff", "#334455", 1.7]} />
          <directionalLight position={[2, 4, 4]} intensity={2.6} />
          <directionalLight position={[-3, 2, -2]} intensity={3.2} color={accent} />
          <Suspense fallback={null}>
            <Turntable
              angle={drag.angle}
              baseAngle={skin.id === "loki" ? Math.PI - 0.3 : (skin.rotation || 0)}
            >
              <SkinModel key={skin.id} skin={skin} />
            </Turntable>
          </Suspense>
        </Canvas>
      </SkinError>
    </div>
  );
}
