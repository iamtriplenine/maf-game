import loki from "./loki/character.json";
import bailarina from "./bailarina/character.json";
import samba from "./samba/character.json";
import messi from "./messi/character.json";
import mutant from "./mutant/character.json";

// Collection utilisee par la personnalisation du profil.
// Le Studio 3D garde ses propres mouvements internes pour tester les animations.
export const SKINS = [
  { ...loki, movement: "Marche", movementType: "walk" },
  { ...bailarina, movement: "Defile", movementType: "walk" },
  { ...samba, movement: "Danse", movementType: "dance" },
  { ...messi, movement: "Statique", movementType: "none" },
  {
    ...mutant,
    id: "mutant-swipe",
    name: "Mutant",
    movement: "Balayage",
    movementType: "swipe",
  },
];

const LEGACY_SKIN_ALIASES = {
  "mutant-run": "mutant-swipe",
  "mutant-attack": "mutant-swipe",
};

export const DEFAULT_SKIN = "loki";
export function validSkin(value) {
  const normalized = LEGACY_SKIN_ALIASES[value] || value;
  return SKINS.some((skin) => skin.id === normalized) ? normalized : DEFAULT_SKIN;
}
export function getSkin(value) {
  return SKINS.find((skin) => skin.id === validSkin(value)) || SKINS[0];
}
