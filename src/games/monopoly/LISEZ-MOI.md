<!-- MAF_MONOPOLY_V1_DOC -->
# Monopoly (mode entrainement)

Jeu ajoute dans l'onglet **Game**. Pour l'instant : entrainement local uniquement
(un seul ecran, aucune mise, aucun appel au backend).

## Fichiers
- `src/games/monopoly/data.js` : plateau (40 cases), groupes de couleurs, cartes Chance / Caisse de communaute, pions.
- `src/games/monopoly/engine.js` : toutes les regles. Fonctions pures : chaque action (`rollDice`, `buy`, `build`,
  `sell`, `endTurn`, `giveUp`) renvoie un NOUVEL etat JSON. Aucun React, aucun reseau.
- `src/games/monopoly/engine.test.mjs` : tests (`node src/games/monopoly/engine.test.mjs`).
- `src/components/MonopolyBoard.jsx` : plateau (image `public/games/monopoly/board.jpg`), pions, maisons.
- `src/components/SoloMonopoly.jsx` : partie d'entrainement.
- `src/styles/monopoly.css` : styles.
- Seul fichier existant modifie : `src/pages/GamePage.jsx` (import, entree `monopoly` dans `GAMES`, branche d'affichage).

## Pour le jeu en ligne plus tard
L'etat de partie est un simple objet JSON : le meme `engine.js` peut etre copie cote backend
(le serveur arbitre : il execute `rollDice` avec son propre hasard et renvoie l'etat aux deux joueurs).
Il faudra alors creer le type de salon `monopoly` dans le backend (mise, gagnant, remboursement) :
rien de cela n'est fait pour l'instant.

## Differences avec le projet Unity d'origine
- Plateau 2D (image du plateau d'origine) au lieu de la 3D ; aucun code WebGL / Unity / Photon n'est repris.
- Faute corrigee : le groupe vert etait {31, 32, 24} dans l'original, c'est {31, 32, 34}.
- Faillite : un joueur qui peut payer en vendant ses biens n'est plus declare en faillite a tort.
- Option 2 des (l'original n'avait qu'un seul de).

## Regles MAF de construction (2026-10-25)
- Une maison peut etre construite sur **n’importe quel terrain achete**, sans monopoliser une couleur.
- Construire se fait **pendant son propre tour, avant le lancer des des**, sur n’importe quel terrain possede, quel que soit l’emplacement du pion.
- **Au plus une construction par propriete et par tour** : plusieurs terrains differents peuvent chacun recevoir une maison au cours du meme tour si le joueur a l’argent necessaire.
- Les limites habituelles sont conservees : quatre maisons, puis une cinquieme construction les remplace par un hotel ; le prix depend du terrain.
- Aucune maison sur gare ou compagnie. Les compteurs `builtThisTurn` sont reinitialises lorsque le tour passe au joueur suivant ; les anciennes sauvegardes sans ce champ restent compatibles.
