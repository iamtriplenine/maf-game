/* Création procédurale des routes, bâtiments, arbres, magasins, plage, véhicules et habitants.
   Les objets statiques sont réunis en un seul maillage GPU pour réduire les draw calls. */
(function(){'use strict';
 const C=window.VIVA_CONFIG, {Mesh,shade}=window.Viva3D;
 let seed=63502026;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296};
 const between=(a,b)=>a+random()*(b-a);
 const pick=a=>a[Math.floor(random()*a.length)];
 const buildingColors=['#e7d6bb','#e2a58b','#b8d5d5','#f8e7be','#aebfc6','#d1c1d8','#e6bba1','#f5d4aa','#d6dfc2','#e3c5c2'];
 const carColors=['#f3ac5f','#73c7bf','#e9e5df','#db646a','#85a9dd','#d9a3c3','#faf0b2'];
 const world={mesh:null,obstacles:[],parked:[],traffic:[],pedestrians:[],trees:[],activityDecor:[]};
 function tree(m,x,z,palm=false){
  if(palm){let h=between(5,8.5);m.cylinder(x,h*.5,z,.38,h,'#997457',7,.23);m.sphere(x,h+.2,z,1.7,'#3c9365',4,7);
   for(let i=0;i<7;i++){let a=i*Math.PI*2/7;m.box(x+Math.cos(a)*1.5,h+.15,z+Math.sin(a)*1.5,3,.20,.72,'#288c64',a+.45)}
  }else{let h=between(3.7,6.7);m.cylinder(x,h*.5,z,.36,h,'#7d6954',7,.28);m.sphere(x,h+.85,z,between(2.4,3.8),pick(['#4a986a','#64ad72','#6da961','#3f8b65']),5,8)}
  world.trees.push({x,z});
 }
 function lamp(m,x,z){m.cylinder(x,3.6,z,.13,7.2,'#3b525d',8);m.box(x,7.15,z,.85,.28,.85,'#e7e9c6');m.box(x,7.42,z,1.2,.18,1.2,'#29424a')}
 function bench(m,x,z,angle=0){m.box(x,1.1,z,3.8,.28,1.05,'#9a614a',angle);m.box(x,1.9,z-0.4,3.8,1.5,.23,'#ab7558',angle);m.box(x-1.5,.6,z,.15,1.1,.8,'#364e58');m.box(x+1.5,.6,z,.15,1.1,.8,'#364e58')}
 function building(m,x,z,w,d,height,color,shop=false){
  m.box(x,height/2+.1,z,w,height,d,color);
  m.box(x,height+.22,z,w+.8,.45,d+.8,'#4c6476');
  m.box(x,height+.51,z,w*.8,.14,d*.8,shade(color,1.22));
  const front=z+d/2+.06,windowRows=Math.max(1,Math.floor((height-3)/4.8)),windowCols=Math.max(1,Math.floor((w-1)/3.7));
  const sideCols=Math.max(1,Math.floor((d-1)/4));
  for(let j=0;j<windowRows;j++)for(let i=0;i<windowCols;i++){
   let wx=x+(i-(windowCols-1)/2)*3.65,wy=4.9+j*4.5;
   if(wy+1.3>=height)continue;
   m.box(wx,wy,front,.9,1.8,.08,pick(['#9ac8d6','#85afbc','#cae0df','#568f9c']));
   m.box(wx,wy-1.05,front+.08,1.2,.18,.3,'#f2eee2');
   m.box(wx,wy,front+.10,.07,1.7,.08,'#496c79');
  }
  for(let j=0;j<windowRows;j++)for(let i=0;i<sideCols;i++){
   let zz=z+(i-(sideCols-1)/2)*3.65,wy=4.9+j*4.5;
   if(wy+1.2>=height)continue;
   m.box(x+w/2+.08,wy,zz,.12,1.65,.95,'#96c5d2');
  }
  if(shop){
   m.box(x,2.05,z+d/2+.12,w-1,3.75,.22,'#559ba5');
   m.box(x,3.95,z+d/2+1.05,w+.2,.33,2.25,pick(['#e88b86','#ffd78b','#8fca9e','#87cdd9']));
   m.box(x,1.45,z+d/2+.36,1.35,2.85,.3,'#bfe3e4');
   m.box(x,4.45,z+d/2+1.11,4,.42,.21,'#2c5c6b');
  }
  world.obstacles.push({x,z,hw:w/2+.4,hd:d/2+.4});
 }
 function square(m,x,z,w,d,color){m.box(x,-.03,z,w,.1,d,color)}
 function buildWorld(){
  seed=63502026;const m=new Mesh(),R=C.cityX,Z=C.cityZ;
  // Plancher, océan, sable et esplanade du bord de mer.
  m.box(4,-1.25,0,396,2.5,380,'#a4c68a');
  m.box(-290,-.6,0,198,1.4,480,'#3b9ac0');
  m.box(-186,-.46,0,19,.85,365,'#f3d5a0');
  m.box(-198,-.45,0,5,.8,365,'#dbc69b');
  for(let z=-180;z<=180;z+=14){m.box(-200,-.12,z,3,.05,6,'#f7e6bd');m.box(-266,-.09,z,80,.025,1.0,'#48a9cb')}
  m.box(-184,-.01,0,3,.23,365,'#a5bcaa');
  // Routes et trottoirs.
  for(const x of R){m.box(x,-.075,0,14,.17,374,'#687580');m.box(x,-.015,0,10,.16,374,'#394a56');m.box(x+4.93,.065,0,.13,.06,368,'#d8d5c2');m.box(x-4.93,.065,0,.13,.06,368,'#d8d5c2');for(let z=-174;z<177;z+=16)m.box(x,.092,z,.22,.025,5.7,'#ebcc83')}
  for(const z of Z){m.box(5,-.058,z,385,.21,14,'#687580');m.box(5,.014,z,385,.15,10,'#394a56');m.box(5,.094,z+4.96,380,.035,.14,'#dedbd4');m.box(5,.094,z-4.96,380,.035,.14,'#dedbd4');for(let x=-178;x<199;x+=16)m.box(x,.102,z,5.5,.027,.22,'#efd084')}
  // Passages piétons sur les intersections.
  for(const x of R)for(const z of Z)for(let i=0;i<5;i++){
   m.box(x-3.6+i*1.8,.119,z+7,1.0,.026,2.8,'#d7e2de');m.box(x-3.6+i*1.8,.119,z-7,1.0,.026,2.8,'#d7e2de');
  }
  // Ilots, parcs, boutiques et bâtiments.
  for(let xi=0;xi<R.length-1;xi++)for(let zi=0;zi<Z.length-1;zi++){
   const x=(R[xi]+R[xi+1])/2,z=(Z[zi]+Z[zi+1])/2;
   m.box(x,.05,z,37,.18,37,'#bdc4af');
   const isPark=xi===4&&zi===4,isPlaza=xi===3&&zi===3;
   if(isPark){
    square(m,x,z,35,35,'#7ab87b');m.box(x,.12,z,3,.14,36,'#e1d9c5');m.box(x,.12,z,36,.14,3,'#e1d9c5');
    for(let i=0;i<13;i++){let tx=x+between(-15,15),tz=z+between(-15,15);if(Math.abs(tx-x)<3||Math.abs(tz-z)<3)continue;tree(m,tx,tz)}
    m.cylinder(x,.58,z,5.2,1.0,'#d3ddd0',16);m.cylinder(x,.94,z,4.4,.16,'#72bed3',16);m.cylinder(x,2.2,z,.56,3.5,'#e1d1af',8);m.sphere(x,4.1,z,.9,'#8addf0',5,8);
    bench(m,x-10,z+12);bench(m,x+10,z-12);continue;
   }
   if(isPlaza){
    square(m,x,z,34,34,'#c9c1a4');m.cylinder(x,1.0,z,6.8,1.8,'#f3ece1',12);m.cylinder(x,1.15,z,5.5,.3,'#63b8d1',12);m.cylinder(x,2.1,z,.6,2.0,'#f6e8ca',10);m.sphere(x,3.35,z,1.15,'#f9dfac',6,10);
    for(let i=0;i<8;i++){let a=i*Math.PI/4;tree(m,x+Math.sin(a)*13,z+Math.cos(a)*13)}continue;
   }
   // Lots en quadrillage : chaque bâtiment est un simple maillage optimisé.
   for(let bx=-1;bx<=1;bx+=2)for(let bz=-1;bz<=1;bz+=2){
    if(random()<.23){tree(m,x+bx*between(6,12),z+bz*between(6,12));continue}
    let xx=x+bx*9.0,zz=z+bz*9.0,w=between(11,15.5),d=between(11,15.5),h=between(9,42);
    building(m,xx,zz,w,d,h,pick(buildingColors),random()<.55);
   }
   if(random()<.35){lamp(m,x-16,z-16);lamp(m,x+16,z+16)}
  }
  // Alignements de végétation, lampadaires et petits équipements urbains.
  for(let i=0;i<R.length;i++)for(let j=0;j<Z.length;j++){
   const x=R[i],z=Z[j];if((i+j)%2===0)lamp(m,x+7.8,z+7.8);
   if((i+j)%3===0){tree(m,x+10,z-12);tree(m,x-11,z+12)}
  }
  // Promenade au bord de l'eau.
  for(let z=-163;z<172;z+=22){tree(m,-183,z,true);if(Math.abs(z)%2<1)m.box(-192,.55,z,1.2,1.1,2.7,'#e1b07e')}
  for(let i=0;i<10;i++){let z=-160+i*34;m.cylinder(-191,2.0,z,.11,4,'#986a4e',7);m.cylinder(-191,4.05,z,2,.22,pick(['#ed998b','#f6d66e','#9bcbd0']),8)}
  // Promenade maritime, jetée, quai.
  m.box(-213,.12,-92,39,.65,9,'#b4a18a');for(let x=-229;x<-195;x+=7){m.box(x,-1.3,-95,1.3,3.3,1.3,'#9b8062');m.box(x,-1.3,-89,1.3,3.3,1.3,'#9b8062')}
  // Voitures stationnées accessibles (pour conduire en appuyant sur E).
  for(let i=0;i<9;i++){
   const x=R[(i+2)%R.length]+(i%2?3.1:-3.1),z=Z[(i*2+1)%Z.length]+(i%2?13:-13),angle=0;
   world.parked.push({x,z,angle,color:carColors[i%carColors.length],available:true});
  }
  // Trafic et personnages : données de simulation en RAM, aucune connexion réseau.
  for(let i=0;i<C.trafficCount;i++){
   const vertical=i%2===0,row=i%R.length,zrow=i%Z.length;
   world.traffic.push({axis:vertical?'z':'x',x:vertical?R[row]+(i%4<2?-2.35:2.35):between(-180,182),z:vertical?between(-174,175):Z[zrow]+(i%4<2?-2.35:2.35),direction:i%4<2?1:-1,speed:between(5,10),color:carColors[i%carColors.length]});
  }
  for(let i=0;i<C.pedestrianCount;i++){
   const axis=i%2===0?'x':'z',roadI=i%R.length,roadJ=i%Z.length;
   world.pedestrians.push({axis,x:axis==='x'?between(-180,187):R[roadI]+(i%3===0?7:-7),z:axis==='z'?between(-168,170):Z[roadJ]+(i%3===0?7:-7),dir:i%4<2?1:-1,speed:between(.8,1.9),shirt:pick(['#db806b','#d6d9c9','#8cbed2','#e1ba6e','#74b794','#ba93c2']),skin:pick(['#7d4931','#b97854','#e2af81','#d0a17a','#583524']),phase:between(0,7)});
  }
  world.mesh=m;return world;
 }
 function car(m,x,z,a,color){
  const sx=Math.sin(a),cz=Math.cos(a),p=(dx,dz)=>[x+dx*cz+dz*sx,z-dx*sx+dz*cz];
  m.box(x,1.0,z,2.55,1.03,5.5,color,a);
  m.box(x,1.83,z-.2,2.24,1.22,3.0,shade(color,.88),a);
  const front=p(0,-2.78),rear=p(0,2.78);
  m.box(front[0],.96,front[1],2.10,.30,.13,'#f6e9c2',a);m.box(rear[0],.96,rear[1],1.9,.20,.13,'#bd5d63',a);
  m.box(x,2.07,z-.2,1.65,.53,2.2,'#6aadb8',a);
  for(let side of [-1,1])for(let off of [-1.55,1.45]){let q=p(side*1.28,off);m.box(q[0],.48,q[1],.32,.87,1.03,'#243b47',a)}
 }
 function person(m,x,z,angle,shirt='#66a8ad',skin='#bd896a',phase=0,walking=1){
  const co=Math.cos(angle),si=Math.sin(angle),p=(a,b)=>[x+a*co+b*si,z-a*si+b*co],s=Math.sin(phase)*.26*walking;
  m.box(x,1.73,z,1.0,1.25,.61,shirt,angle);
  m.sphere(x,2.78,z,.49,skin,5,7);
  m.box(x,3.18,z-.01,.84,.19,.84,'#2f333a',angle);
  for(let side of [-1,1]){
   let a=p(side*.68,0);m.box(a[0],1.72+side*s,a[1],.33,1.1,.34,skin,angle);
   let b=p(side*.28,side*s*.55);m.box(b[0],.62,b[1],.38,1.12,.45,'#2e536a',angle);
   let foot=p(side*.29,side*s);m.box(foot[0],.16,foot[1],.45,.29,.72,'#2e3546',angle);
  }
 }
 function marker(m,x,z,t,color='#f5d475'){
  const h=2.4+Math.sin(t*2.5)*.42;m.ring(x,.12,z,2.2,2.62,color,24);m.cylinder(x,h,z,.13,2.6,color,7);m.sphere(x,h+1.45,z,.67,color,5,8);
 }
 window.VivaWorld={buildWorld,world,person,car,marker};
})();
