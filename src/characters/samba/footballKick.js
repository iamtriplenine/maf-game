import {
  AnimationClip,
  AnimationMixer,
  Quaternion,
  QuaternionKeyframeTrack,
  Vector3,
} from "three";
import { clone } from "three/addons/utils/SkeletonUtils.js";

export function createFootballKick(source) {
  const reference = source.animations.find(
    (clip) =>
      clip.name !== "Tir au pied" &&
      clip.tracks.some((track) =>
        track.name.endsWith(".quaternion")
      )
  );

  if (!reference) {
    console.warn("Tir indisponible : animation de reference absente.");
    return null;
  }

  // Echantillonner l'animation originale.
  // Ne pas appeler skeleton.pose() : sa pose de liaison
  // ne correspond pas necessairement aux transformations animees.
  const model = clone(source);
  const sampler = new AnimationMixer(model);
  sampler.clipAction(reference).play();
  sampler.update(0);
  model.updateMatrixWorld(true);

  const bones = [];
  model.traverse((object) => {
    if (object.isBone) bones.push(object);
  });

  const clean = (name) =>
    name.toLowerCase().replace(/[^a-z]/g, "");

  const find = (suffix) =>
    bones.find((bone) => clean(bone.name).endsWith(suffix));

  if (!find("rightupleg") || !find("rightleg")) {
    sampler.stopAllAction();
    sampler.uncacheRoot(model);
    console.warn("Squelette non reconnu : tir non ajoute.");
    return null;
  }

  const duration = 1.8;
  const times = [0, 0.22, 0.48, 0.64, 0.82, 1.12, 1.5, duration];

  // Conserver les valeurs originales de chaque piste a l'instant 0.
  // Aucune nouvelle echelle ou longueur d'os n'est inventee.
  const tracks = reference.tracks.map((track) => {
    const copy = track.clone();
    const sample = Array.from(
      track.createInterpolant().evaluate(0)
    );

    copy.times = new Float32Array([0, duration]);
    copy.values = new Float32Array([...sample, ...sample]);

    return copy;
  });

  const rootWorld = model.getWorldQuaternion(new Quaternion());

  function rotateBone(suffix, direction, angles) {
    const bone = find(suffix);
    if (!bone) return;

    // Modifier seulement une piste de rotation deja presente.
    const index = tracks.findIndex((track) =>
      track.name === `${bone.name}.quaternion` ||
      track.name === `.bones[${bone.name}].quaternion`
    );

    if (index < 0) return;

    const parentWorld = bone.parent
      ? bone.parent.getWorldQuaternion(new Quaternion())
      : new Quaternion();

    const axis = new Vector3(...direction)
      .applyQuaternion(rootWorld)
      .applyQuaternion(parentWorld.invert())
      .normalize();

    const original = bone.quaternion.clone();
    const values = [];

    for (const angle of angles) {
      const offset = new Quaternion().setFromAxisAngle(axis, angle);
      const result = original.clone().premultiply(offset).normalize();

      values.push(result.x, result.y, result.z, result.w);
    }

    tracks[index] = new QuaternionKeyframeTrack(
      tracks[index].name,
      times,
      values
    );
  }

  // Depart et arrivee : pose originale, sans changement de proportions.
  // Preparation, frappe puis retour de la jambe droite.
  rotateBone("rightupleg", [1, 0, 0],
    [0, 0.10, 0.35, -0.55, -0.80, -0.32, 0, 0]);

  rotateBone("rightleg", [1, 0, 0],
    [0, 0.10, 0.85, 0.22, 0.03, 0.22, 0, 0]);

  rotateBone("rightfoot", [1, 0, 0],
    [0, 0, 0.08, 0.17, 0.18, 0.06, 0, 0]);

  // Appui et accompagnement moderes.
  rotateBone("leftupleg", [1, 0, 0],
    [0, -0.02, -0.05, -0.04, -0.03, -0.02, 0, 0]);

  rotateBone("leftleg", [1, 0, 0],
    [0, 0.04, 0.09, 0.07, 0.05, 0.03, 0, 0]);

  rotateBone("spine", [1, 0, 0],
    [0, 0.02, 0.05, 0.10, 0.08, 0.04, 0, 0]);

  rotateBone("leftarm", [0, 0, 1],
    [0, 0.04, 0.15, 0.23, 0.16, 0.07, 0, 0]);

  rotateBone("rightarm", [0, 0, 1],
    [0, -0.04, -0.12, -0.18, -0.13, -0.06, 0, 0]);

  const kick = new AnimationClip("Tir au pied", duration, tracks);

  sampler.stopAllAction();
  sampler.uncacheRoot(model);

  return kick;
}