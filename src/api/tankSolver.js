// Mode Win (proprietaire 999) : calcule le tir exact vers l'adversaire.
// L'etat du terrain et des chars est public : rien de secret n'est lu, le serveur
// valide le tir comme n'importe quel autre.
import { TANK_WEAPONS, tankSimulate } from './tankEngine';

const scoreOf = (result, side) => {
  const foe = side === 'host' ? 'guest' : 'host';
  return result.damage[foe] - 1.5 * result.damage[side];
};

export function tankSolve(state, side, weapon) {
  const config = TANK_WEAPONS[weapon];
  if (!config || !state?.tanks || !state.terrain) return null;
  const minAngle = config.minAngle || 0;
  let best = null;
  const consider = (angle, power) => {
    const result = tankSimulate(state, side, { weapon, angle, power, drive: 0 });
    if (!result) return;
    const score = scoreOf(result, side);
    if (!best || score > best.score + 1e-9 || (Math.abs(score - best.score) < 1e-9 && power < best.power)) {
      best = { angle, power, score, result };
    }
  };
  // Passe 1 : tous les angles, puissance par pas de 3. Passe 2 : affinage autour du meilleur.
  for (let angle = minAngle; angle <= 89; angle++) for (let power = 20; power <= 100; power += 3) consider(angle, power);
  if (!best) return null;
  const { angle: a0, power: p0 } = best;
  for (let angle = Math.max(minAngle, a0 - 1); angle <= Math.min(89, a0 + 1); angle++) {
    for (let power = Math.max(20, p0 - 2); power <= Math.min(100, p0 + 2); power++) consider(angle, power);
  }
  const foe = side === 'host' ? 'guest' : 'host';
  if (best.result.damage[foe] <= 0) return null;
  return { angle: best.angle, power: best.power, damage: best.result.damage[foe] };
}
