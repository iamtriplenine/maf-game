import test from 'node:test';
import assert from 'node:assert/strict';
import { SnapshotBuffer } from './netInterp.js';
const statics={w:800,h:480,cfg:{hp:3,holdThreshold:0.25},arena:null,rects:[]};
const snap=(t,extra={})=>({t,serverNow:10000+t*1000,phase:'playing',countdown:0,goTimer:0,shake:0,winner:null,tanks:[{x:100+t,y:100,angle:t,tread:0,alive:true}],bullets:[],particles:[],flashes:[],...extra});
function buffer(a,b){const x=new SnapshotBuffer();x.push(a,1000);x.push(b,1300);return x;}
test('GO reste eteint entre deux snapshots',()=>{
 const x=buffer(snap(4),snap(4.3));for(let t=4;t<=4.3;t+=0.001)assert.equal(x.sceneAt(t,statics).goTimer,0);
});
test('compte a rebours : transition causale',()=>{
 const x=buffer(snap(2.9,{phase:'countdown',countdown:0.1}),snap(3.1,{goTimer:0.7}));
 assert.equal(x.sceneAt(2.95,statics).phase,'countdown');
 assert.ok(Math.abs(x.sceneAt(2.95,statics).countdown-0.05)<1e-8);
 assert.equal(x.sceneAt(3.09,statics).goTimer,0);assert.equal(x.sceneAt(3.1,statics).phase,'playing');
});
test('anneaux : aucun effet futur ni rayon negatif',()=>{
 const ring={k:'ring',x:200,y:200,vx:0,vy:0,rot:0,vr:0,life:0.22,max:0.22,size:70};
 const x=buffer(snap(5),snap(5.3,{particles:[ring]}));
 for(let t=5;t<5.3;t+=0.001){const s=x.sceneAt(t,statics);for(const p of s.particles)assert.ok(4+p.size*(1-p.life/p.max)>=0);assert.equal(s.particles.length,0);}
 assert.equal(x.sceneAt(5.3,statics).particles.length,1);
});
test('reponses desordonnees ignorees et restauration recente acceptee',()=>{
 const x=buffer(snap(10),snap(10.1));assert.equal(x.push(snap(9.9),1400),false);
 assert.equal(x.push(snap(8.5,{serverNow:30000}),1500),true);assert.equal(x.snaps.length,1);assert.equal(x.renderTime(1500),8.5);
 assert.equal(x.push(snap(10,{serverNow:20000}),1600),false);
});
test('horloge monotone apres interruption reseau',()=>{
 const x=buffer(snap(5),snap(5.1));let last=0;
 for(let now=1300;now<5000;now+=8){const rt=x.renderTime(now);assert.ok(rt>=last);assert.ok(rt<=5.1);last=rt;}
 x.push(snap(5.2),5010);assert.ok(x.renderTime(5020)>=last);
});
test('munitions animees sans NaN et conservation du viseur',()=>{
 const b={id:1,x:200,y:100,vx:100,vy:0,ammo:'explosif'};
 const x=buffer(snap(5,{bullets:[b]}),snap(5.1,{bullets:[{...b,x:210}]}));const s=x.sceneAt(5.05,statics,0,1.23);
 assert.equal(s.tanks[0].angle,1.23);assert.equal(s.tanks[0].pangle,1.23);assert.ok(Number.isFinite(s.bullets[0].life));assert.ok(Math.abs(s.bullets[0].x-205)<1e-8);
});
