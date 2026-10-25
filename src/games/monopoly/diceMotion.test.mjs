import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { FACE_NORMALS, faceRotation, rollPose } from './diceMotion.js';
test('les six resultats orientent la vraie face du modele vers le haut', () => {
 for(let n=1;n<=6;n++)assert.ok(new Vector3(...FACE_NORMALS[n]).applyQuaternion(faceRotation(n)).distanceTo(new Vector3(0,1,0))<1e-8);
});
test('le modele conserve six faces distinctes et les normales de l atlas',()=>{
 const obj=readFileSync(new URL('../../../public/games/monopoly/dice/dice.obj',import.meta.url),'utf8');
 assert.equal(obj.split('\n').filter(l=>l.startsWith('f ')).length,6);
 for(const normal of Object.values(FACE_NORMALS))assert.ok(obj.includes('vn '+normal.map(v=>v.toFixed(6)).join(' ')));
});
test('animation bornee et finie pour un ou deux des',()=>{
 for(let i=0;i<2;i++)for(let t=0;t<30;t+=0.013){const p=rollPose(t,i);for(const v of Object.values(p))assert.ok(Number.isFinite(v));assert.ok(Math.abs(p.x)<=0.28);assert.ok(p.y>=0&&p.y<=0.91);}
});
