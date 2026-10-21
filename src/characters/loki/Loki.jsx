import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { AnimationMixer } from "three";
import { clone } from "three/addons/utils/SkeletonUtils.js";

export default function Loki({
  animation,
  paused,
  speed,
  onAnimations,
}) {
  const { scene, animations } = useGLTF(
    `${import.meta.env.BASE_URL}characters/loki/model.glb`,
    false,
    false
  );

  const model = useMemo(() => {
    const copy = clone(scene);

    copy.traverse((object) => {
      if (object.isMesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });

    return copy;
  }, [scene]);

  const mixer = useMemo(() => new AnimationMixer(model), [model]);

  useEffect(() => {
    onAnimations(animations.map((clip) => clip.name));
  }, [animations, onAnimations]);

  useEffect(() => {
    const clip = animations.find((item) => item.name === animation);
    if (!clip) return;

    const action = mixer.clipAction(clip);
    action.reset().setEffectiveWeight(1).fadeIn(0.25).play();

    return () => {
      action.fadeOut(0.25);
    };
  }, [animation, animations, mixer]);

  useEffect(() => {
    return () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
    };
  }, [mixer, model]);

  useFrame((_, delta) => {
    if (!paused) {
      mixer.update(Math.min(delta, 0.05) * speed);
    }
  });

  return <primitive object={model} dispose={null} />;
}