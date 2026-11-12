// Voitures du Studio 3D et du World.
// access : "public"    = chaque joueur la possede (voiture par defaut)
//          "exclusive" = cadeau / gain de tournoi (le compte proprietaire y a acces d'office)
//          "npc"       = voiture de la ville (police), jamais attribuee a un joueur
// Le Studio 3D les montre toutes pour que chacun puisse les visiter.
export const CARS = [
  {
    id: "porsche-911-gt3-rs",
    name: "Porsche 911 GT3 RS",
    description: "Voiture personnelle de chaque joueur dans le World",
    access: "public",
    badge: "VOITURE PUBLIQUE",
    eyebrow: "DISPONIBLE POUR TOUS",
    file: "cars/porsche-911-gt3-rs.glb",
  },
  {
    id: "lamborghini-veneno-roadster",
    name: "Lamborghini Veneno Roadster",
    description: "Voiture exclusive : a gagner en tournoi ou a recevoir en cadeau",
    access: "exclusive",
    badge: "VOITURE EXCLUSIVE",
    eyebrow: "CADEAU DE TOURNOI",
    file: "cars/lamborghini-veneno-roadster.glb",
  },
  {
    id: "ford-shelby-gt500-patrol",
    name: "Ford Shelby GT500 Police",
    description: "Voiture de police du World : patrouille en ville, non attribuable",
    access: "npc",
    badge: "VOITURE DE POLICE",
    eyebrow: "POLICE DU WORLD",
    file: "cars/ford-shelby-gt500-patrol.glb",
  },
];

export const DEFAULT_CAR = CARS[0].id;
export const getCar = (id) => CARS.find((c) => c.id === id) || CARS[0];
// Une voiture peut-elle etre possedee par un joueur ? (la police, non)
export const isPlayerCar = (car) => car.access !== "npc";
