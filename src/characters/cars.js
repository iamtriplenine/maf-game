// Voitures du Studio 3D et du World. Toutes sont publiques : chaque joueur,
// ancien ou nouveau, y a acces (pas d'exclusivite comme certains skins).
export const CARS = [
  {
    id: "porsche-911-gt3-rs",
    name: "Porsche 911 GT3 RS",
    description: "Voiture personnelle de chaque joueur dans le World",
    access: "public",
    file: "cars/porsche-911-gt3-rs.glb",
  },
];

export const DEFAULT_CAR = CARS[0].id;
export const getCar = (id) => CARS.find((c) => c.id === id) || CARS[0];
