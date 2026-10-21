import {
  AnimationMixer,
  AnimationClip,
  Quaternion,
  QuaternionKeyframeTrack,
  VectorKeyframeTrack,
  Vector3,
} from "three";
import { clone } from "three/addons/utils/SkeletonUtils.js";

export function createLokiRun(targetSource, loki) {
  const run = loki.animations.find((clip) => /^run$/i.test(clip.name));
  const rest = loki.animations.find((clip) => /tpose/i.test(clip.name));

  if (!run || !rest) {
    throw new Error("Animations Run ou TPose absentes de Loki.");
  }

  const source = clone(loki.scene);
  const target = clone(targetSource);

  const key = (name) =>
    name.replace(/^mixamorig[:_]?/i, "").toLowerCase();

  function collect(root) {
    const map = new Map();

    root.traverse((bone) => {
      // Le FBX contient certains noms en double.
      // Conserver le premier noeud, comme le lecteur d'animation.
      if (bone.isBone && !map.has(key(bone.name))) {
        map.set(key(bone.name), bone);
      }
    });

    return map;
  }

  const sourceBones = collect(source);
  const targetBones = collect(target);

  if (!sourceBones.has("hips") || !targetBones.has("hips")) {
    throw new Error("Squelette incompatible avec cette course.");
  }

  // Lire la pose de reference de Loki sans toucher au modele affiche.
  const mixer = new AnimationMixer(source);
  mixer.clipAction(rest).play();
  mixer.update(0);

  source.updateMatrixWorld(true);
  target.updateMatrixWorld(true);

  const sourceRest = new Map();
  const targetRest = new Map();

  sourceBones.forEach((bone, name) => {
    sourceRest.set(name, bone.getWorldQuaternion(new Quaternion()));
  });

  targetBones.forEach((bone, name) => {
    targetRest.set(name, bone.getWorldQuaternion(new Quaternion()));
  });

  // Les deux fichiers n'utilisent pas la meme orientation.
  const alignment = targetRest.get("hips").clone().multiply(
    sourceRest.get("hips").clone().invert()
  );
  const inverseAlignment = alignment.clone().invert();

  function legLength(bones) {
    const thigh = bones.get("leftupleg");
    const shin = bones.get("leftleg");
    const foot = bones.get("leftfoot");

    if (!thigh || !shin || !foot) {
      throw new Error("Os de jambe manquants.");
    }

    return (
      thigh.getWorldPosition(new Vector3()).distanceTo(
        shin.getWorldPosition(new Vector3())
      ) +
      shin.getWorldPosition(new Vector3()).distanceTo(
        foot.getWorldPosition(new Vector3())
      )
    );
  }

  // Adapter uniquement le rebond vertical a la taille de Samba.
  const ratio = legLength(targetBones) / legLength(sourceBones);
  const parentScale = targetBones.get("hips").parent
    .getWorldScale(new Vector3()).y;

  const samples = Math.max(2, Math.ceil(run.duration * 30));
  const times = [];
  const heights = [];

  const entries = [...targetBones].map(([name, bone]) => ({
    name,
    bone,
    rotations: [],
    position: bone.position.toArray(),
    scale: bone.scale.toArray(),
  }));

  mixer.stopAllAction();
  mixer.clipAction(run).play();

  for (let frame = 0; frame <= samples; frame++) {
    const time = frame * run.duration / samples;
    times.push(time);

    // Fermer la boucle exactement sur la premiere pose.
    mixer.setTime(frame === samples ? 0 : time);
    source.updateMatrixWorld(true);

    const desired = new Map();

    for (const entry of entries) {
      const { name, bone, rotations } = entry;
      let world = targetRest.get(name).clone();

      if (sourceBones.has(name)) {
        world = alignment.clone()
          .multiply(
            sourceBones.get(name).getWorldQuaternion(new Quaternion())
          )
          .multiply(sourceRest.get(name).clone().invert())
          .multiply(inverseAlignment)
          .multiply(targetRest.get(name));
      }

      const parentWorld =
        desired.get(bone.parent?.uuid) ||
        bone.parent?.getWorldQuaternion(new Quaternion()) ||
        new Quaternion();

      const local = parentWorld.clone().invert()
        .multiply(world)
        .normalize();

      desired.set(bone.uuid, world);

      rotations.push(local.x, local.y, local.z, local.w);
    }

    heights.push(
      sourceBones.get("hips").getWorldPosition(new Vector3()).y
    );
  }

  const meanHeight =
    heights.slice(0, -1).reduce((sum, value) => sum + value, 0) /
    samples;

  const tracks = [];

  for (const entry of entries) {
    const { name, bone, rotations, position, scale } = entry;

    tracks.push(
      new QuaternionKeyframeTrack(
        `${bone.name}.quaternion`,
        times,
        rotations
      )
    );

    if (name === "hips") {
      const positions = [];

      for (const height of heights) {
        positions.push(
          position[0],
          position[1] + (height - meanHeight) * ratio / parentScale,
          position[2]
        );
      }

      tracks.push(
        new VectorKeyframeTrack(
          `${bone.name}.position`,
          times,
          positions
        )
      );
    } else {
      // Garder les longueurs d'os originales de Samba.
      tracks.push(
        new VectorKeyframeTrack(
          `${bone.name}.position`,
          [0, run.duration],
          [...position, ...position]
        )
      );
    }

    // Ne jamais appliquer les echelles de Loki a Samba.
    tracks.push(
      new VectorKeyframeTrack(
        `${bone.name}.scale`,
        [0, run.duration],
        [...scale, ...scale]
      )
    );
  }

  mixer.stopAllAction();
  mixer.uncacheRoot(source);

  return new AnimationClip(
    "Courir comme Loki",
    run.duration,
    tracks
  );
}