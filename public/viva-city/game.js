/* Viva City - client uniquement. Aucune API, WebSocket, compte, CDN ou connexion backend.
 * Compatible Chrome/Edge/Firefox avec WebGL2, via fichier local ou serveur statique Vite. */
(function(){'use strict';
 const C=window.VIVA_CONFIG,V3=window.Viva3D,W=window.VivaWorld;
 const $=id=>document.getElementById(id),limit=V3.clamp;
 const canvas=$('world3d'),overlay=$('modalOverlay'),modal=$('modalInner');
 let renderer,world;
 try{renderer=new V3.Renderer(canvas);world=W.buildWorld();renderer.uploadStatic(world.mesh)}
 catch(err){$('errorOverlay').classList.remove('hidden');$('welcome').classList.add('hidden');$('errorMessage').textContent=String(err.message||err);console.error(err);return}
 const saved=(key,fallback)=>{try{let v=localStorage.getItem('vivacity_'+key);return v===null?fallback:JSON.parse(v)}catch{return fallback}};
 const store=(key,v)=>{try{localStorage.setItem('vivacity_'+key,JSON.stringify(v))}catch{}};
 const avatar={x:C.startX,z:C.startZ,angle:0,skin:'#b77c58',shirt:saved('shirt','#50c8ab')};
 const camera={yaw:-.42,pitch:.32,distance:16};
 const state={running:false,coins:saved('coins',C.initialCoins),mission:saved('mission',0),time:0,mode:'walk',carIndex:-1,carSpeed:0,active:false,sound:false,toastUntil:0,theme:'day'};
 const keys=new Set();let touchAxis={x:0,y:0},touchRun=false,lastFrame=performance.now(),nextHud=0,frame=0,audioCtx;
 function toast(message){const el=$('toast');el.textContent=message;el.classList.add('visible');state.toastUntil=performance.now()+2800}
 function beep(freq=550,duration=.12){if(!state.sound)return;try{audioCtx ||= new(window.AudioContext||window.webkitAudioContext)();const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();osc.type='sine';osc.frequency.value=freq;gain.gain.setValueAtTime(.035,audioCtx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);osc.connect(gain);gain.connect(audioCtx.destination);osc.start();osc.stop(audioCtx.currentTime+duration)}catch{}}
 function showModal(content){modal.innerHTML=content;overlay.classList.remove('hidden');state.active=true;keys.clear()}
 function hideModal(){overlay.classList.add('hidden');state.active=false}
 function currentMission(){return C.missions[state.mission%C.missions.length]}
 function nearActivity(){let best=null,d=15;for(const a of C.activities){let dist=Math.hypot(a.x-avatar.x,a.z-avatar.z);if(dist<d){d=dist;best=a}}return best}
 function nearCar(){let idx=-1,d=6;for(let i=0;i<world.parked.length;i++){let p=world.parked[i],dist=Math.hypot(avatar.x-p.x,avatar.z-p.z);if(dist<d&&i!==state.carIndex){idx=i;d=dist}}return idx}
 function enterCar(i){state.carIndex=i;state.mode='drive';state.carSpeed=0;avatar.x=world.parked[i].x;avatar.z=world.parked[i].z;avatar.angle=world.parked[i].angle;$('drivingHud').classList.remove('hidden');beep(670);toast('🚗 Tu conduis ! Z/W pour avancer, Q/A et D pour tourner, E pour sortir.')}
 function leaveCar(){state.mode='walk';const c=world.parked[state.carIndex];if(c){c.x=avatar.x;c.z=avatar.z;c.angle=avatar.angle}avatar.x=limit(avatar.x+3,-177,192);avatar.z=limit(avatar.z+3,-174,173);state.carIndex=-1;state.carSpeed=0;$('drivingHud').classList.add('hidden');toast('🚶 Retour à pied.')}
 function interact(){if(state.active||!state.running)return;if(state.mode==='drive'){leaveCar();return}let carIndex=nearCar();if(carIndex>=0){enterCar(carIndex);return}const a=nearActivity();if(a){openActivity(a);return}toast('Approche-toi d’un véhicule ou d’un lieu signalé pour interagir.')}
 function openActivity(a){
  showModal(`<div class="eyebrow">ACTIVITÉ • ${a.emoji}</div><h2>${a.name}</h2><p>${a.description}</p><div id="activityBody"></div>`);
  const area=$('activityBody');
  if(a.action==='shop'){
   area.innerHTML='<p>Change la tenue de ton personnage. Les achats sont fictifs et enregistrés localement.</p><button class="choice" data-color="#f2b66d">🟠 Tenue sable — 50 Viva Coins</button><button class="choice" data-color="#8f99e5">🟣 Tenue indigo — 50 Viva Coins</button><button class="choice" data-color="#69c696">🟢 Tenue menthe — 50 Viva Coins</button>';
   area.querySelectorAll('[data-color]').forEach(btn=>btn.onclick=()=>{if(state.coins<50){toast('Tu as besoin de 50 Viva Coins.');return}state.coins-=50;avatar.shirt=btn.dataset.color;store('shirt',avatar.shirt);store('coins',state.coins);beep(880);toast('Nouvelle tenue équipée !');hideModal()});
  }else if(a.action==='arcade'){
   area.innerHTML='<p>Mini-jeu local : retrouve le coffre qui contient les 30 Viva Coins !</p><div class="row"><button class="choice">🎁 Coffre 1</button><button class="choice">🎁 Coffre 2</button><button class="choice">🎁 Coffre 3</button></div><small>Une seule tentative par visite. Tu peux revenir.</small>';
   const winner=Math.floor(Math.random()*3);area.querySelectorAll('.choice').forEach((btn,i)=>btn.onclick=()=>{area.querySelectorAll('button').forEach(b=>b.disabled=true);if(i===winner){state.coins+=30;store('coins',state.coins);toast('🎉 Bravo ! +30 Viva Coins !');beep(900)}else{toast('Pas cette fois ! Le coffre était le '+(winner+1)+'.');beep(280)}hideModal()});
  }else{area.innerHTML='<p>Ce lieu est prêt pour tes futures activités multijoueurs. Pour le moment, tu peux le visiter sans inscription ni serveur.</p><button class="secondary" id="enjoyBtn">Explorer cet endroit</button>';$('enjoyBtn').onclick=hideModal}
 }
 function showMap(){showModal('<div class="eyebrow">DÉCOUVRIR VIVA CITY</div><h2>Carte & destinations</h2><p>Choisis un lieu. Le téléporteur est une fonction locale utile pour tester les quartiers.</p><div id="places"></div>');const list=$('places');for(const a of C.activities){const button=document.createElement('button');button.className='choice';button.textContent=`${a.emoji}  ${a.name} — aller sur place`;button.onclick=()=>{avatar.x=a.x;avatar.z=a.z;hideModal();toast('📍 Bienvenue à '+a.name);beep(700)};list.appendChild(button)}}
 function showHelp(){showModal('<div class="eyebrow">GUIDE DE VIVA CITY</div><h2>Comment jouer ?</h2><p><b>Z / Q / S / D</b> ou <b>W / A / S / D</b> : marcher<br><b>Maj / Shift</b> : courir<br><b>Souris glissée</b> : tourner la caméra<br><b>Molette</b> : zoomer / dézoomer<br><b>E</b> : conduire, sortir ou interagir<br><b>M</b> : ouvrir la carte<br><b>Échap</b> : fermer les fenêtres</p><p>Sur téléphone : joystick à gauche, glisser à droite pour orienter la caméra et utiliser les deux boutons.</p><button class="primary" id="returnBtn">RETOURNER EN VILLE</button>');$('returnBtn').onclick=hideModal}
 function showSettings(){showModal('<div class="eyebrow">CONFIGURATION LOCALE</div><h2>Paramètres</h2><p>Aucun paramètre n’est envoyé à un serveur. Tout reste sur cet appareil.</p><button class="choice" id="nightBtn">☀ / 🌙 Alterner jour et nuit</button><button class="choice" id="resetBtn">♻ Réinitialiser les missions et Viva Coins</button><button class="choice" id="backBtn">← Reprendre le jeu</button>');$('nightBtn').onclick=()=>{state.time+=C.daySeconds/2;toast('Cycle jour/nuit modifié');hideModal()};$('resetBtn').onclick=()=>{state.coins=C.initialCoins;state.mission=0;store('coins',state.coins);store('mission',0);hideModal();toast('Progression locale réinitialisée.')};$('backBtn').onclick=hideModal}
 function collide(x,z,r=1.1){if(x<-180||x>193||z<-176||z>177)return true;for(const o of world.obstacles)if(Math.abs(x-o.x)<o.hw+r&&Math.abs(z-o.z)<o.hd+r)return true;return false}
 function moveAvatar(x,z){if(!collide(x,avatar.z))avatar.x=x;if(!collide(avatar.x,z))avatar.z=z}
 function handleMovement(dt){
  if(!state.running||state.active)return;
  const up=keys.has('w')||keys.has('z')||keys.has('arrowup'),down=keys.has('s')||keys.has('arrowdown'),left=keys.has('a')||keys.has('q')||keys.has('arrowleft'),right=keys.has('d')||keys.has('arrowright');
  const v=limit((up?1:0)-(down?1:0)-touchAxis.y,-1,1),h=limit((right?1:0)-(left?1:0)+touchAxis.x,-1,1);
  if(state.mode==='drive'){
   let gas=v;if(gas!==0)state.carSpeed+=gas*14*dt;else state.carSpeed*=Math.exp(-2.0*dt);
   state.carSpeed=limit(state.carSpeed,-10,29);if(Math.abs(state.carSpeed)<.06)state.carSpeed=0;
   avatar.angle+=h*dt*1.25*limit(Math.abs(state.carSpeed)/6,.08,1.3)*Math.sign(state.carSpeed||1);
   let dx=-Math.sin(avatar.angle)*state.carSpeed*dt,dz=-Math.cos(avatar.angle)*state.carSpeed*dt;
   if(!collide(avatar.x+dx,avatar.z+dz,2))moveAvatar(avatar.x+dx,avatar.z+dz);else state.carSpeed=0;
   return;
  }
  let speed=(keys.has('shift')||touchRun)?11:6.7;let mag=Math.hypot(v,h);if(mag<.08)return;
  const fx=-Math.sin(camera.yaw),fz=-Math.cos(camera.yaw),rx=-fz,rz=fx;
  let dx=(fx*v+rx*h)*speed*dt/Math.max(mag,1),dz=(fz*v+rz*h)*speed*dt/Math.max(mag,1);
  moveAvatar(avatar.x+dx,avatar.z+dz);avatar.angle=Math.atan2(-dx,-dz);avatar.walkPhase=(avatar.walkPhase||0)+dt*speed*2;
 }
 function updateNPCs(dt){for(let c of world.traffic){let val=c.axis==='x'?'x':'z',delta=c.speed*dt*c.direction;c[val]+=delta;if(c[val]>182)c[val]=-176;if(c[val]<-176)c[val]=182}for(let p of world.pedestrians){let val=p.axis==='x'?'x':'z';p[val]+=p.dir*dt*p.speed;if(p[val]>181)p[val]=-176;if(p[val]<-176)p[val]=181;p.phase+=dt*5}}
 function checkMission(){if(!state.running||state.active)return;let m=currentMission(),dist=Math.hypot(avatar.x-m.x,avatar.z-m.z);if(dist<7){state.coins+=m.reward;state.mission++;store('coins',state.coins);store('mission',state.mission);beep(880);toast('🎯 Mission terminée : +'+m.reward+' Viva Coins !')}}
 function hud(t){let m=currentMission(),d=Math.hypot(avatar.x-m.x,avatar.z-m.z);$('missionName').textContent=m.name;$('missionDetail').textContent=m.detail;$('missionDistance').textContent=d<10?'Tu es arrivé !':`À ${Math.round(d)} m de l'objectif`;$('progressBar').style.width=limit((1-d/220)*100,0,100)+'%';$('coins').textContent=state.coins.toLocaleString('fr-FR');let phase=(.5+state.time/C.daySeconds)%1;let hr=Math.floor(phase*24),mi=Math.floor(phase*1440)%60;$('clock').textContent=String(hr).padStart(2,'0')+':'+String(mi).padStart(2,'0');
  const x=avatar.x,z=avatar.z;let district=x<-163?'Front de mer':x>90?'Quartier commercial':z>37?'Quartier des parcs':z< -44?'Quartier loisirs':'Centre-ville';$('district').textContent=district;$('placeName').textContent=district;$('placeSubtitle').textContent=state.mode==='drive'?'🚗 En voiture':'🚶 En promenade';$('weather').textContent=(hr>=7&&hr<19?'☀ Temps ensoleillé':'🌙 Ciel étoilé');
  let car=state.mode==='walk'?nearCar():-1,a=state.mode==='walk'?nearActivity():null;
  const action=state.mode==='drive'?'Appuie sur E pour sortir du véhicule':car>=0?'Appuie sur E pour conduire la voiture':a?`Appuie sur E pour visiter ${a.name}`:'';$('hint').classList.toggle('hidden',!action||!state.running||state.active);$('hintText').textContent=action;$('speed').textContent=Math.round(Math.abs(state.carSpeed)*3.6);
  if(t>state.toastUntil)$('toast').classList.remove('visible');
  drawMinimap(m);
 }
 function drawMinimap(m){let cv=$('minimap'),ctx=cv.getContext('2d'),s=cv.width;
  const mx=x=>(x+205)/410*s,mz=z=>(z+185)/370*s;
  ctx.fillStyle='#4b7e6e';ctx.fillRect(0,0,s,s);ctx.fillStyle='#327d9c';ctx.fillRect(0,0,mx(-200),s);ctx.fillStyle='#edcb99';ctx.fillRect(mx(-200),0,mx(-182)-mx(-200),s);
  ctx.strokeStyle='#566e74';ctx.lineWidth=5;for(let x of C.cityX){ctx.beginPath();ctx.moveTo(mx(x),0);ctx.lineTo(mx(x),s);ctx.stroke()}for(let z of C.cityZ){ctx.beginPath();ctx.moveTo(0,mz(z));ctx.lineTo(s,mz(z));ctx.stroke()}
  ctx.fillStyle='#335663';for(const o of world.obstacles)ctx.fillRect(mx(o.x-o.hw),mz(o.z-o.hd),o.hw*2/410*s,o.hd*2/370*s);
  ctx.fillStyle='#81c396';ctx.fillRect(mx(40),mz(52),13,13);ctx.strokeStyle='#f8df7f';ctx.lineWidth=1.3;ctx.setLineDash([3,4]);ctx.beginPath();ctx.moveTo(mx(avatar.x),mz(avatar.z));ctx.lineTo(mx(m.x),mz(m.z));ctx.stroke();ctx.setLineDash([]);
  for(const a of C.activities){ctx.fillStyle='#eacb86';ctx.beginPath();ctx.arc(mx(a.x),mz(a.z),2.2,0,Math.PI*2);ctx.fill()}
  ctx.fillStyle='#ffe477';ctx.beginPath();ctx.arc(mx(m.x),mz(m.z),4,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#8bffda';ctx.strokeStyle='#17313a';ctx.lineWidth=1.3;ctx.beginPath();ctx.arc(mx(avatar.x),mz(avatar.z),4.2,0,Math.PI*2);ctx.fill();ctx.stroke();
 }
 function drawActors(t){let mesh=new V3.Mesh();
  for(const c of world.parked){if(world.parked.indexOf(c)===state.carIndex)continue;W.car(mesh,c.x,c.z,c.angle,c.color)}
  for(const c of world.traffic){const angle=c.axis==='z'?(c.direction===1?Math.PI:0):(c.direction===1? -Math.PI/2:Math.PI/2);W.car(mesh,c.x,c.z,angle,c.color)}
  for(const p of world.pedestrians){const angle=p.axis==='z'?(p.dir>0?Math.PI:0):(p.dir>0? -Math.PI/2:Math.PI/2);W.person(mesh,p.x,p.z,angle,p.shirt,p.skin,p.phase)}
  if(state.mode==='walk')W.person(mesh,avatar.x,avatar.z,avatar.angle,avatar.shirt,avatar.skin,avatar.walkPhase||0,1);
  else W.car(mesh,avatar.x,avatar.z,avatar.angle,world.parked[state.carIndex]?.color||'#ffcb75');
  let m=currentMission();W.marker(mesh,m.x,m.z,t,'#ffe289');
  for(const a of C.activities)W.marker(mesh,a.x,a.z,t,'#6ceace');
  return mesh
 }
 function animate(now){requestAnimationFrame(animate);const dt=Math.min((now-lastFrame)/1000,.06);lastFrame=now;frame++;
  if(state.running&&!state.active){handleMovement(dt);updateNPCs(dt);state.time+=dt;checkMission()}
  let phase=(.5+state.time/C.daySeconds)%1;
  const sunlight=Math.max(0,Math.cos((phase-.5)*2*Math.PI)),light=.37+.63*sunlight;
  const px=avatar.x,pz=avatar.z,y=state.mode==='drive'?3.7:2.9;
  const dist=state.mode==='drive'?camera.distance*1.45:camera.distance;
  const eye=[px+Math.sin(camera.yaw)*dist*Math.cos(camera.pitch),y+2+dist*Math.sin(camera.pitch),pz+Math.cos(camera.yaw)*dist*Math.cos(camera.pitch)];
  renderer.draw(drawActors(now/1000),eye,[px,y,pz],phase,light);
  if(now>nextHud){hud(now);nextHud=now+110}
 }
 // Keyboard
 window.addEventListener('keydown',e=>{let key=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(key))e.preventDefault();keys.add(key);if(e.repeat)return;if(key==='escape')hideModal();if(key==='e')interact();if(key==='m'&&state.running&&!state.active)showMap()});
 window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>{keys.clear();touchAxis={x:0,y:0}});
 // Souris / rotation de caméra (aussi mobile avec le doigt sur la zone 3D).
 let drag=false,prevX=0,prevY=0,dragId;
 // MAF_TOUCH_V1 : au doigt, n'importe ou sur l'ecran = joystick invisible (l'origine est ou le doigt se pose).
 let joyPtr=null,joyOx=0,joyOy=0;const JOY_R=55,JOY_DEAD=.12,JOY_FOLLOW=1.6;
 canvas.addEventListener('pointerdown',e=>{if(state.active||!state.running)return;
  if(e.pointerType==='touch'){if(joyPtr!==null)return;joyPtr=e.pointerId;joyOx=e.clientX;joyOy=e.clientY;touchAxis={x:0,y:0};try{canvas.setPointerCapture(e.pointerId)}catch{}return}
  drag=true;dragId=e.pointerId;prevX=e.clientX;prevY=e.clientY;canvas.setPointerCapture(e.pointerId)});
 canvas.addEventListener('pointermove',e=>{
  if(e.pointerId===joyPtr){let dx=e.clientX-joyOx,dy=e.clientY-joyOy,mag=Math.hypot(dx,dy);
   if(mag>JOY_R*JOY_FOLLOW){const over=mag-JOY_R*JOY_FOLLOW;joyOx+=dx/mag*over;joyOy+=dy/mag*over;dx=e.clientX-joyOx;dy=e.clientY-joyOy;mag=Math.hypot(dx,dy)}
   const k=Math.min(mag,JOY_R)/JOY_R;touchAxis=k<JOY_DEAD?{x:0,y:0}:{x:dx/mag*k,y:dy/mag*k};return}
  if(!drag||e.pointerId!==dragId)return;let dx=e.clientX-prevX,dy=e.clientY-prevY;prevX=e.clientX;prevY=e.clientY;camera.yaw-=dx*.006;camera.pitch=limit(camera.pitch+dy*.003,-.05,.89)});
 const stopDrag=e=>{if(e.pointerId===joyPtr){joyPtr=null;touchAxis={x:0,y:0};return}if(e.pointerId===dragId)drag=false};canvas.addEventListener('pointerup',stopDrag);canvas.addEventListener('pointercancel',stopDrag);
 canvas.addEventListener('wheel',e=>{e.preventDefault();camera.distance=limit(camera.distance+Math.sign(e.deltaY)*1.6,7,34)},{passive:false});
 // Joystick tactile, accessible sans moteur externe.
 const joy=$('joyZone'),knob=$('joyKnob');let joyId=null;const resetJoy=()=>{touchAxis={x:0,y:0};knob.style.transform='translate(0px,0px)';joyId=null};
 joy.addEventListener('pointerdown',e=>{joyId=e.pointerId;joy.setPointerCapture(e.pointerId);updateJoy(e)});
 joy.addEventListener('pointermove',e=>{if(e.pointerId===joyId)updateJoy(e)});
 joy.addEventListener('pointerup',resetJoy);joy.addEventListener('pointercancel',resetJoy);
 function updateJoy(e){const r=joy.getBoundingClientRect(),x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2,mag=Math.max(1,Math.hypot(x,y)),k=Math.min(mag,44);touchAxis={x:x/mag*k/44,y:y/mag*k/44};knob.style.transform=`translate(${touchAxis.x*34}px,${touchAxis.y*34}px)`}
 $('touchRun').addEventListener('pointerdown',()=>touchRun=true);$('touchRun').addEventListener('pointerup',()=>touchRun=false);$('touchRun').addEventListener('pointercancel',()=>touchRun=false);
 $('touchAction').onclick=interact;
 // UI
 $('startBtn').onclick=()=>{state.running=true;$('welcome').classList.add('hidden');toast('Bienvenue ! Suis le point jaune et découvre la ville.');beep(640)};
 $('closeModal').onclick=hideModal;overlay.addEventListener('click',e=>{if(e.target===overlay)hideModal()});$('mapBtn').onclick=showMap;$('helpBtn').onclick=showHelp;$('settingsBtn').onclick=showSettings;
 $('soundBtn').onclick=()=>{state.sound=!state.sound;$('soundBtn').style.color=state.sound?'#51efbe':'white';if(state.sound)beep(550);toast(state.sound?'Son activé':'Son désactivé')};
 // MAF_EPURE_V1 : on entre directement dans la ville, sans ecran de bienvenue.
 $('startBtn').onclick();
 // MAF_FINITIONS_V1 : ecran qui reste allume, pas de menu au appui long du doigt.
 canvas.addEventListener('contextmenu',e=>e.preventDefault());
 let wake=null;const keepAwake=async()=>{try{if(navigator.wakeLock&&document.visibilityState==='visible')wake=await navigator.wakeLock.request('screen')}catch{}};
 keepAwake();document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')keepAwake()});
 requestAnimationFrame(animate);
})();
