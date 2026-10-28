import loki from "./loki/character.json";
import bailarina from "./bailarina/character.json";
import samba from "./samba/character.json";
import messi from "./messi/character.json";
import mutant from "./mutant/character.json";
import kushina from "./kushina/character.json";
import taunt from "./taunt-mixamo/character.json";
import ladybug from "./ladybug/character.json";

// Collection utilisee par la personnalisation du profil.
// Le Studio 3D garde ses propres mouvements internes pour tester les animations.
export const SKINS = [
  { ...loki, access: "public", movement: "Marche", movementType: "walk" },
  { ...bailarina, access: "public", movement: "Defile", movementType: "walk" },
  { ...samba, access: "public", movement: "Danse", movementType: "dance" },
  { ...messi, access: "public", movement: "Statique", movementType: "none" },
  { ...kushina, access: "public", movement: "Defile", movementType: "walk" },
  { ...taunt, access: "exclusive", movement: "Provocation", movementType: "taunt" },
  { ...ladybug, access: "exclusive", movement: "Défilé", movementType: "walk" },
  {
    ...mutant,
    id: "mutant-swipe",
    access: "public",
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

// Les prochains skins sont ajoutes ici avec access: "exclusive", un identifiant
// unique et leur modele 3D importe. Le Studio les presentera mais les profils
// ne pourront les equiper que si le serveur confirme leur deblocage.
export const PUBLIC_SKINS = SKINS.filter(s=>s.access==='public');
