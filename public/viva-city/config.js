/* Toute la configuration de la ville est ici. Pas de clés API ni d'adresse serveur. */
window.VIVA_CONFIG = {
  title: 'Viva City',
  initialCoins: 100,
  daySeconds: 260,
  renderScale: 1,
  cityX: [-160,-112,-64,-16,32,80,128,176],
  cityZ: [-144,-96,-48,0,48,96,144],
  startX: -16,
  startZ: 0,
  pedestrianCount: 34,
  trafficCount: 22,
  missions: [
    { name:'Découvre la place centrale', detail:'Rejoins le point lumineux de la grande place.', x:32,z:0, reward:50 },
    { name:'Visite le parc Viva', detail:'Rends-toi au jardin et profite des arbres.', x:56,z:76, reward:70 },
    { name:'Direction la salle d’arcade', detail:'Découvre le quartier des jeux.', x:-64,z:-96, reward:80 },
    { name:'Promenade sur la plage', detail:'Découvre la côte et l’océan.', x:-178,z:-48, reward:100 },
    { name:'Découvre le quartier shopping', detail:'Explore les boutiques de Viva City.', x:128,z:48, reward:100 }
  ],
  activities: [
    {name:'Viva Arcade', emoji:'🎮', x:-64,z:-96, description:'Défis et mini-jeux à venir dans ton Viva Center.', action:'arcade'},
    {name:'Centre commercial', emoji:'🛍', x:128,z:48, description:'Un espace pour personnaliser les avatars et acheter des objets virtuels.', action:'shop'},
    {name:'Café Viva', emoji:'☕', x:32,z:-48, description:'Un lieu pour discuter et se retrouver.', action:'cafe'},
    {name:'Parc Viva', emoji:'🌳', x:56,z:76, description:'Un jardin ouvert à la promenade et aux quêtes.', action:'park'},
    {name:'Plage', emoji:'🏖', x:-178,z:-48, description:'Du sable, des palmiers et un magnifique océan.', action:'beach'}
  ]
};
