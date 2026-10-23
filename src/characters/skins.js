import loki from "./loki/character.json";
import bailarina from "./bailarina/character.json";
import samba from "./samba/character.json";
import messi from "./messi/character.json";
import mutant from "./mutant/character.json";

// Collection commune au Studio 3D et a la personnalisation du profil.
// Les skins sont gratuits pour cette premiere version.
export const SKINS = [
  { ...loki, movement: "Marche", movementType: "walk" },
  { ...bailarina, movement: "Defile", movementType: "walk" },
  { ...samba, movement: "Danse", movementType: "dance" },
  { ...messi, movement: "Statique", movementType: "none" },
  {
    ...mutant,
    id: "mutant-run",
    name: "Mutant - Course",
    movement: "Courir",
    movementType: "run",
  },
  {
    ...mutant,
    id: "mutant-attack",
    name: "Mutant - Saut-attaque",
    file: mutant.attackFile,
    movement: "Sauter et attaquer",
    movementType: "attack",
  },
];

export const DEFAULT_SKIN = "loki";
export function validSkin(value) {
  return SKINS.some((skin) => skin.id === value) ? value : DEFAULT_SKIN;
}
export function getSkin(value) {
  return SKINS.find((skin) => skin.id === validSkin(value)) || SKINS[0];
}
