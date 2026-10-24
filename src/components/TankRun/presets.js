// Raccourcis prêts à l'emploi : <TankBattle config={NEW_LOOK} />
import { ARENAS } from './arenas';

export const NEW_LOOK = {
  arena: 'random',                                   // 'desert' | 'usine' | 'random'
  skins: ['spectre', 'titan', 'spectre', 'titan'],   // un char par joueur
  ammo: 'standard',                                  // ou ['lourd','rapide','explosif','ricochet']
};

export const DESERT = { ...NEW_LOOK, arena: ARENAS.desert };
export const USINE = { ...NEW_LOOK, arena: ARENAS.usine };
