// MAF-STUDIO-WEAPONS-V1 : armes du jeu (modeles 3D). Etape 1 : visibles dans le Studio 3D (rubrique Armes).
// Etape 2 (plus tard) : utilisables dans le World. Les fichiers sont dans public/weapons/.
export const WEAPONS = [
  { id: "ak47", name: "AK-47", category: "Fusil d'assaut", file: "weapons/AK47.fbx" },
  { id: "m16", name: "M16", category: "Fusil d'assaut", file: "weapons/M16.fbx" },
  { id: "g36c", name: "G36C", category: "Fusil d'assaut", file: "weapons/G36C.fbx" },
  { id: "scar-h", name: "SCAR-H", category: "Fusil d'assaut", file: "weapons/SCAR-H.fbx" },
  { id: "steyr-aug", name: "Steyr AUG", category: "Fusil d'assaut", file: "weapons/SteyrAUG_M1.fbx" },
  { id: "mp5", name: "MP5", category: "Pistolet-mitrailleur", file: "weapons/MP5.fbx" },
  { id: "p90", name: "P90", category: "Pistolet-mitrailleur", file: "weapons/P90.fbx" },
  { id: "vector", name: "Vector", category: "Pistolet-mitrailleur", file: "weapons/VectorSMG.fbx" },
  { id: "desert-eagle", name: "Desert Eagle", category: "Pistolet", file: "weapons/DesertEagle.fbx" },
  { id: "m1911", name: "M1911", category: "Pistolet", file: "weapons/M1911.fbx" }
];
export const getWeapon = (id) => WEAPONS.find((w) => w.id === id) || WEAPONS[0];
