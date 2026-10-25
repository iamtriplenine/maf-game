// Modeles GLB convertis du ZIP d'origine. Scene locale, sans Unity ni serveur tiers.
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PIECES } from '../games/monopoly/data';
import { overviewHeight, renderPixelRatio } from '../games/monopoly/cameraQuality';
import { BOARD_SIZE, squareCenter, squarePosition, pickSquare, sampleTravel, smooth } from '../games/monopoly/pawnMotion';
import { buildingPlacement } from '../games/monopoly/buildingPlacement';

const OFFSETS=[[-.6,-.6],[.6,-.6],[-.6,.6],[.6,.6],[0,0],[-.6,0],[.6,0]];
export default function MonopolyBoard3D({ game, positions, travel, selected, cameraFocused, onCameraViewChange, onSelect, onReady, onFail }) {
 const host=useRef(null),latest=useRef(null);
 latest.current={game,positions,travel,selected,cameraFocused,onCameraViewChange,onSelect,onReady,onFail};
 useEffect(()=>{
  const el=host.current;if(!el)return undefined;
  let stopped=false,renderer,observer,raf=0,dirty=true,textureReady=false,failed=false;
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(46,1,.1,150);
  const overview=new THREE.Vector3(0,overviewHeight(camera.fov),.0001),look=new THREE.Vector3(0,0,0);
  camera.position.copy(overview);camera.lookAt(look);
  const resources=new Set(),loaded=new Map(),pawns=new Map(),pending=new Set();
  const keep=o=>{resources.add(o);return o;};
  const fail=()=>{if(!stopped&&!failed){failed=true;latest.current.onFail?.();}};
  const material=(color,extra={})=>keep(new THREE.MeshStandardMaterial({color,roughness:.55,...extra}));
  const board=new THREE.Mesh(keep(new THREE.PlaneGeometry(BOARD_SIZE,BOARD_SIZE)),keep(new THREE.MeshBasicMaterial({color:0xffffff})));
  board.rotation.x=-Math.PI/2;scene.add(board);
  const base=new THREE.Mesh(keep(new THREE.BoxGeometry(BOARD_SIZE,.24,BOARD_SIZE)),material(0x375746));
  base.position.y=-.14;scene.add(base);
  scene.add(new THREE.HemisphereLight(0xffffff,0x61766c,2.3));
  const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(-6,18,10);scene.add(light);
  const marks=new THREE.Group();scene.add(marks);
  const buildings=new THREE.Group();scene.add(buildings);
  const buildingModels=new Map();
  const ringGeo=keep(new THREE.RingGeometry(.38,.45,32));
  const selectedMat=keep(new THREE.MeshBasicMaterial({color:0xffd35c,transparent:true,opacity:.45,depthWrite:false}));
  const selection=new THREE.Mesh(keep(new THREE.PlaneGeometry(1,1)),selectedMat);
  selection.rotation.x=-Math.PI/2;selection.position.y=.045;selection.visible=false;scene.add(selection);
  const texture=new THREE.TextureLoader().load('/games/monopoly/board.jpg',()=>{if(stopped)return;texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,renderer?.capabilities.getMaxAnisotropy()||1);board.material.map=texture;board.material.needsUpdate=true;textureReady=true;dirty=true;},undefined,fail);keep(texture);
  // Camera manuelle : le meme angle que le travelling d'un lancer, sans deplacer le pion.
  // La transition est fluide dans les deux sens et la vue reste verrouillee sur le pion actif.
  let focusAmount=0,focusTween=null,focusRequested=false,perspective=false;
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ray=new THREE.Raycaster(),point=new THREE.Vector2();
  const click=e=>{
   const rect=el.getBoundingClientRect();point.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);
   ray.setFromCamera(point,camera);const hit=ray.intersectObject(board)[0];
   if(hit){const id=pickSquare(hit.point.x,hit.point.z);if(id!==null)latest.current.onSelect?.(id);}
  };
  const resize=()=>{const w=el.clientWidth,h=el.clientHeight;if(!w||!h||!renderer)return;renderer.setPixelRatio(renderPixelRatio(window.devicePixelRatio));renderer.setSize(w,h,false);camera.aspect=w/h;overview.y=overviewHeight(camera.fov,camera.aspect);if(!latest.current.travel&&!latest.current.cameraFocused&&focusAmount===0){camera.position.copy(overview);camera.lookAt(0,0,0);}camera.updateProjectionMatrix();dirty=true;};
  const lost=e=>{e.preventDefault();fail();};
  try{
   renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});renderer.setClearColor(0,0);
   renderer.domElement.setAttribute('aria-label','Plateau et pions en 3D');el.appendChild(renderer.domElement);
   renderer.domElement.addEventListener('click',click);renderer.domElement.addEventListener('webglcontextlost',lost);
   observer=new ResizeObserver(resize);observer.observe(el);resize();
  }catch{renderer?.dispose();renderer?.domElement.remove();resources.forEach(r=>r.dispose?.());fail();return undefined;}
  const loader=new GLTFLoader();
  const load=id=>{
   if(loaded.has(id)||pending.has(id))return;pending.add(id);
   loader.load(`/games/monopoly/pawns/${id}.glb`,g=>{
    if(stopped){g.scene.traverse(o=>{o.geometry?.dispose();o.material?.dispose?.();});return;}
    loaded.set(id,g.scene);pending.delete(id);g.scene.traverse(o=>{if(o.geometry)keep(o.geometry);if(o.material)keep(o.material);});dirty=true;
   },undefined,fail);
  };
  // Les vrais maillages proviennent de House.fbx / Hotel.fbx du ZIP Monopoly-Local.
  // Ils ont ete convertis une fois en GLB, puis charges localement sans Unity.
  // Une meme geometrie est reutilisee pour toutes les maisons d'une case.
  for(const type of ['house','hotel']){
   loader.load(`/games/monopoly/buildings/${type}.glb`,g=>{
    if(stopped){g.scene.traverse(o=>{o.geometry?.dispose();o.material?.dispose?.();});return;}
    buildingModels.set(type,g.scene);
    g.scene.traverse(o=>{if(o.geometry)keep(o.geometry);if(o.material){const materials=Array.isArray(o.material)?o.material:[o.material];materials.forEach(keep);}});
    previousBuildings=null;dirty=true;
   },undefined,()=>{ /* Ne pas faire echouer les pions si un batiment manque. */ });
  }
  let notified=false,previousGame=null,previousBuildings=null,previousSelected=null,previousMotion=null,wasTravelling=false;
  const rebuildBuildings=g=>{
   buildings.clear();
   for(let i=0;i<40;i++){
    const n=g.houses[i]||0;
    if(!n)continue;
    for(const spot of buildingPlacement(i,n)){
     const original=buildingModels.get(spot.type);
     if(!original)continue;
     const mesh=original.clone(true);
     mesh.position.set(spot.x,spot.y,spot.z);
     mesh.rotation.y=spot.rotation;
     mesh.scale.setScalar(spot.scale);
     buildings.add(mesh);
    }
   }
  };
  const rebuildMarks=g=>{
   marks.children.slice().forEach(o=>{marks.remove(o);o.material.dispose();resources.delete(o.material);});
   for(let i=0;i<40;i++){
    const p=squarePosition(i),c=squareCenter(i),inner={bottom:[0,-1],top:[0,1],left:[1,0],right:[-1,0],corner:[0,0]}[c.side];
    if(g.owners[i]!==null&&!g.houses[i]){const marker=new THREE.Mesh(ringGeo,keep(new THREE.MeshBasicMaterial({color:g.players[g.owners[i]].color})));marker.rotation.x=-Math.PI/2;marker.position.set(p.x-inner[0]*.9,.03,p.z-inner[1]*.9);marker.scale.setScalar(.4);marks.add(marker);}
   }
  };
  const draw=now=>{
   if(stopped||failed)return;raf=requestAnimationFrame(draw);
   const props=latest.current,g=props.game;
   for(const p of g.players)if(!p.bankrupt)load(PIECES[p.piece]?.id||'cannon');
   const canShow=textureReady&&g.players.every(p=>p.bankrupt||loaded.has(PIECES[p.piece]?.id||'cannon'));
   if(canShow&&!notified){notified=true;props.onReady?.();}
   if(g!==previousGame){rebuildMarks(g);previousGame=g;dirty=true;}
   if(g!==previousBuildings){rebuildBuildings(g);previousBuildings=g;dirty=true;}
   if(props.selected!==previousSelected){
    previousSelected=props.selected;selection.visible=props.selected!==null;
    if(selection.visible){const p=squarePosition(props.selected),c=squareCenter(props.selected);selection.position.set(p.x,.045,p.z);selection.scale.set((c.side==='left'||c.side==='right'||c.side==='corner'? .1328:(1-2*.1328)/9)*BOARD_SIZE,(c.side==='bottom'||c.side==='top'||c.side==='corner'?.1328:(1-2*.1328)/9)*BOARD_SIZE,1);}dirty=true;
   }
   const motion=props.travel,sample=motion?sampleTravel(motion,now-motion.start):null;
   const active=!!sample&&!sample.done;
   const changedMotion=motion!==previousMotion;previousMotion=motion;
   if(!!props.cameraFocused!==focusRequested){
    focusRequested=!!props.cameraFocused;
    focusTween=reducedMotion?null:{from:focusAmount,to:focusRequested?1:0,start:now,duration:700};
    if(reducedMotion)focusAmount=focusRequested?1:0;
    dirty=true;
   }
   if(focusTween){
    const progress=(now-focusTween.start)/focusTween.duration;
    focusAmount=focusTween.from+(focusTween.to-focusTween.from)*smooth(progress);
    if(progress>=1){focusAmount=focusTween.to;focusTween=null;}
    dirty=true;
   }
   // En vue fixe : image 2D nette. En deplacement ou mode repere : vrai plateau 3D.
   // Garder la perspective pendant le retour anime pour eviter un double plateau.
   const showPerspective=!!motion||focusRequested||focusAmount>0.0001;
   if(showPerspective!==perspective){
    perspective=showPerspective;props.onCameraViewChange?.(perspective);dirty=true;
   }
   if(board.material.colorWrite!==showPerspective){board.material.colorWrite=showPerspective;board.material.needsUpdate=true;dirty=true;}
   base.visible=showPerspective;
   for(let i=0;i<g.players.length;i++){
    const p=g.players[i],id=PIECES[p.piece]?.id||'cannon';let pawn=pawns.get(p.id);
    if(!pawn&&loaded.has(id)){
     pawn=new THREE.Group();const model=loaded.get(id).clone(true);
     model.traverse(o=>{if(o.isMesh){o.material=material(new THREE.Color(p.color).lerp(new THREE.Color(0xd8dce4),.45),{metalness:.32,roughness:.38});}});
     pawn.add(model);pawns.set(p.id,pawn);scene.add(pawn);dirty=true;
    }
    if(!pawn)continue;pawn.visible=!p.bankrupt||!!(sample&&motion.index===i&&!sample.done);
    const loc=props.positions?.[i]??p.location,pos=squarePosition(loc);
    const same=g.players.filter((q,j)=>!q.bankrupt&&(props.positions?.[j]??q.location)===loc),offset=same.length>1?OFFSETS[same.indexOf(p)%OFFSETS.length]:[0,0];
    const isMoving=!!sample&&motion.index===i;
    pawn.position.set(isMoving?sample.x:pos.x+offset[0],.04,isMoving?sample.z:pos.z+offset[1]);
    pawn.rotation.z=isMoving?sample.tilt:0;
   }
   // Le lancer garde son travelling normal. Si le bouton est actif, la camera
   // continue a suivre le pion et ne revient pas automatiquement en haut.
   const focusPlayer=g.players[g.current];
   const focusPawn=focusPlayer&&pawns.get(focusPlayer.id);
   const fallback=focusPlayer?squarePosition(props.positions?.[g.current]??focusPlayer.location):{x:0,z:0};
   const targetX=sample?sample.x:(focusPawn?.position.x??fallback.x);
   const targetZ=sample?sample.z:(focusPawn?.position.z??fallback.z);
   const focus=sample?Math.max(sample.focus,focusAmount):focusAmount;
   camera.position.copy(overview).lerp(new THREE.Vector3(targetX+2.5,6.3,targetZ+4.4),focus);
   look.set(0,0,0).lerp(new THREE.Vector3(targetX,.3,targetZ),focus);
   camera.lookAt(look);
   el.dataset.view=focus>.02?'suivi':'ensemble';
   if(active||wasTravelling||dirty||changedMotion){renderer.render(scene,camera);dirty=false;}
   wasTravelling=active;
  };
  raf=requestAnimationFrame(draw);
  return()=>{
   stopped=true;cancelAnimationFrame(raf);observer?.disconnect();renderer.domElement.removeEventListener('click',click);renderer.domElement.removeEventListener('webglcontextlost',lost);
   resources.forEach(r=>r.dispose?.());renderer.dispose();renderer.domElement.remove();
  };
 },[]);
 return <div className="mono-scene3d" ref={host} />;
}
