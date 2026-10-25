import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildingPlacement } from './buildingPlacement.js';
import { squareCenter, squarePosition } from './pawnMotion.js';

for (const i of [1, 3, 6, 11, 16, 21, 26, 31, 37, 39]) {
  const c = squareCenter(i);
  const p = squarePosition(i);
  for (let n = 1; n <= 5; n += 1) {
    const instances = buildingPlacement(i, n);
    assert.equal(instances.length, n === 5 ? 1 : n);
    assert(instances.every(b => b.type === (n === 5 ? 'hotel' : 'house')));
    const isVertical = c.side === 'left' || c.side === 'right';
    // Les batiments restent dans les limites de la case, cote bande coloree.
    assert(instances.every(b => isVertical
      ? Math.abs(b.x - p.x) <= 1.33 && Math.abs(b.z - p.z) <= 0.82
      : Math.abs(b.x - p.x) <= 0.82 && Math.abs(b.z - p.z) <= 1.33));
    assert(instances.every(b => isVertical ? b.rotation === Math.PI / 2 : b.rotation === 0));
  }
}
assert.equal(buildingPlacement(0, 1).length, 0);
assert.equal(buildingPlacement(10, 5).length, 0);
assert.equal(buildingPlacement(1, 0).length, 0);
for (const name of ['house', 'hotel']) {
  const file = new URL(`../../../public/games/monopoly/buildings/${name}.glb`, import.meta.url);
  const data = readFileSync(file);
  assert.equal(data.toString('ascii', 0, 4), 'glTF', `${name} : entete GLB valide`);
  assert.equal(data.readUInt32LE(4), 2, `${name} : format glTF 2`);
  assert.equal(data.readUInt32LE(8), data.length, `${name} : taille conforme`);
}
console.log('OK - batiments originaux House/Hotel convertis et placement sur les 4 cotes du plateau');
