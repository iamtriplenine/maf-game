// Placement des modeles 3D d'origine sur la bande coloree des proprietes.
// Le plateau mesure 20 unites ; les cases n'ont pas toutes la meme orientation.
import { squareCenter, squarePosition } from './pawnMotion.js';

const INNER = { bottom: [0, -1], top: [0, 1], left: [1, 0], right: [-1, 0] };

export function buildingPlacement(square, houses) {
  if (!Number.isInteger(houses) || houses < 1 || houses > 5) return [];
  const c = squareCenter(square);
  const inside = INNER[c.side];
  // Ne jamais placer de batiment sur une case d'angle.
  if (!inside) return [];
  const center = squarePosition(square);
  const vertical = c.side === 'left' || c.side === 'right';
  const count = houses === 5 ? 1 : houses;
  const spacing = 0.40;
  const result = [];
  for (let k = 0; k < count; k += 1) {
    const offset = (k - (count - 1) / 2) * spacing;
    result.push({
      type: houses === 5 ? 'hotel' : 'house',
      x: center.x + inside[0] * 0.88 + (vertical ? 0 : offset),
      y: 0.055,
      z: center.z + inside[1] * 0.88 + (vertical ? offset : 0),
      rotation: vertical ? Math.PI / 2 : 0,
      scale: houses === 5 ? 0.73 : 0.33,
    });
  }
  return result;
}
