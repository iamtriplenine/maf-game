import test from 'node:test';
import assert from 'node:assert/strict';
import { PerspectiveCamera, Vector3 } from 'three';
import { readFileSync } from 'node:fs';
import { overviewHeight, renderPixelRatio } from './cameraQuality.js';
test('vue normale : les quatre coins remplissent exactement le cadre carre',()=>{
 const camera=new PerspectiveCamera(46,1,.1,150);camera.position.set(0,overviewHeight(46),.0001);camera.lookAt(0,0,0);camera.updateMatrixWorld();
 for(const x of [-10,10])for(const z of [-10,10]){const p=new Vector3(x,0,z).project(camera);assert.ok(Math.abs(Math.abs(p.x)-1)<.00002);assert.ok(Math.abs(Math.abs(p.y)-1)<.00002);}
});
test('redimensionnement : conserver toutes les cases sans recadrage',()=>{
 for(const aspect of [.7,1,1.8]){const camera=new PerspectiveCamera(46,aspect,.1,150);camera.position.set(0,overviewHeight(46,aspect),.0001);camera.lookAt(0,0,0);camera.updateMatrixWorld();for(const x of [-10,10])for(const z of [-10,10]){const p=new Vector3(x,0,z).project(camera);assert.ok(Math.abs(p.x)<=1.00002);assert.ok(Math.abs(p.y)<=1.00002);}}
});
test('ecrans haute densite : resolution accrue et bornee',()=>{assert.equal(renderPixelRatio(3),2.5);assert.equal(renderPixelRatio(2),2);assert.equal(renderPixelRatio(1),1);assert.equal(renderPixelRatio(undefined),1);});
test('le plateau utilise l image originale 1500 x 1500 du ZIP',()=>{
 const b=readFileSync(new URL('../../../public/games/monopoly/board.jpg',import.meta.url));let i=2,found=false;
 while(i<b.length){if(b[i]!==255){i++;continue;}const m=b[i+1],n=b.readUInt16BE(i+2);if([0xc0,0xc1,0xc2].includes(m)){assert.equal(b.readUInt16BE(i+5),1500);assert.equal(b.readUInt16BE(i+7),1500);found=true;break;}i+=n+2;}assert.ok(found);
});
