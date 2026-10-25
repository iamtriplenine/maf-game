import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SQUARES, PIECES } from './data.js';
import { squarePosition, pickSquare, planTravel, sampleTravel, CAMERA_LEAD, CAMERA_HOLD, CAMERA_RETURN } from './pawnMotion.js';
test('les 40 cases sont selectionnables au bon emplacement',()=>{
 for(const q of SQUARES){const p=squarePosition(q.id);assert.equal(pickSquare(p.x,p.z),q.id);}
 assert.equal(pickSquare(0,0),null);assert.equal(pickSquare(100,100),null);
});
test('passage de GO : suivre le bord sans couper le plateau',()=>{
 const p=planTravel(39,1,2);assert.deepEqual(p.points,[39,0,1].map(squarePosition));
});
test('cartes et prison : arriver a la vraie destination apres le lancer',()=>{
 const p=planTravel(28,10,2);assert.deepEqual(p.points,[28,29,30,10].map(squarePosition));
 const back=planTravel(0,0,7);assert.equal(back.points.length,9);assert.deepEqual(back.points.at(-1),squarePosition(0));
});
test('camera : approche avant le glissement puis retour exact a la normale',()=>{
 const p=planTravel(0,1,1);assert.equal(sampleTravel(p,0).focus,0);
 assert.equal(sampleTravel(p,CAMERA_LEAD).focus,1);assert.equal(sampleTravel(p,CAMERA_LEAD-1).moving,false);
 const landed=sampleTravel(p,CAMERA_LEAD+p.moveDuration);assert.deepEqual({x:landed.x,z:landed.z},squarePosition(1));assert.equal(landed.tilt,0);
 const end=sampleTravel(p,p.duration);assert.equal(end.focus,0);assert.equal(end.done,true);assert.equal(p.duration,CAMERA_LEAD+p.moveDuration+CAMERA_HOLD+CAMERA_RETURN);
});
test('aucun saut numerique pour les trajets courts, longs et les teleports',()=>{
 for(const [a,b,n] of [[0,6,6],[38,2,4],[28,10,2],[7,0,null]]){
  const p=planTravel(a,b,n);for(let t=0;t<=p.duration+16;t+=16){const v=sampleTravel(p,t);for(const k of ['x','z','focus','tilt'])assert.ok(Number.isFinite(v[k]));assert.ok(v.focus>=0&&v.focus<=1);}
 }
});
test('sept vrais modeles GLB autonomes, taille reduite et geometrie presente',()=>{
 let size=0;
 for(const p of PIECES){
  const b=readFileSync(new URL(`../../../public/games/monopoly/pawns/${p.id}.glb`,import.meta.url));size+=b.length;
  assert.equal(b.readUInt32LE(0),0x46546c67);assert.equal(b.readUInt32LE(4),2);
  const n=b.readUInt32LE(12),doc=JSON.parse(b.subarray(20,20+n).toString());
  assert.ok(doc.meshes.length>0);assert.ok(doc.buffers.every(v=>!v.uri));assert.ok(!doc.images?.length);
 }
 assert.ok(size<600000);
});
