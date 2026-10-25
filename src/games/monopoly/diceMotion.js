// Faces du modele OBJ d'origine, identifiees sur son atlas dice.png.
// L'animation montre le resultat du moteur ; elle ne tire jamais un resultat.
import { Quaternion, Vector3 } from 'three';
export const FACE_NORMALS = {
  1: [0, -1, 0], 2: [-1, 0, 0], 3: [0, 0, -1],
  4: [0, 0, 1], 5: [1, 0, 0], 6: [0, 1, 0],
};
export function faceRotation(face) {
  const normal = FACE_NORMALS[face] || FACE_NORMALS[1];
  const align = new Quaternion().setFromUnitVectors(new Vector3(...normal), new Vector3(0, 1, 0));
  const yaw = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 7);
  return yaw.multiply(align);
}
export function rollPose(seconds, index) {
  const phase = seconds * 13 + index * 1.7;
  return {
    x: Math.sin(phase * 0.63) * 0.28,
    y: 0.18 + Math.abs(Math.sin(phase)) * 0.72,
    rx: seconds * 12 + index, ry: seconds * 9, rz: seconds * 7 + index,
  };
}
