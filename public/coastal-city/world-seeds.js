// MAF-WORLD-SEEDS-V3 — DOM holograms anchored in the existing island, no GLB edits.
const products=[
 {id:'wheat',name:'Blé',x:99.75,z:39,y:2.0,color:'#ffd56b',svg:'<path d="M12 29V5m0 7C3 12 3 5 4 3c5 1 8 4 8 9Zm0 7c9 0 9-7 8-9-5 1-8 4-8 9Zm0 7C3 26 3 19 4 17c5 1 8 4 8 9Z"/>'},
 {id:'corn',name:'Maïs',x:99.75,z:35,y:2.35,color:'#ffe16b',svg:'<ellipse cx="12" cy="13" rx="7" ry="11"/><path d="M8 5v16m8-16v16M5 10h14M5 15h14M4 20l8 10 8-10"/>'},
 {id:'tomato',name:'Tomate',x:99.75,z:31.9,y:2.7,color:'#ff777d',svg:'<path d="M12 9C-1 1-2 27 12 28 26 27 25 1 12 9Z"/><path d="m12 9-6-5 6 2 3-5 1 6 5-2-5 5"/>'}
];
const icon=p=>`<svg viewBox="0 0 24 32" width="27" height="34" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p.svg}</svg>`;
export function createSeedMarket(ctx){
 const style=document.createElement('style');style.textContent=`.maf-seed-marker{position:fixed;z-index:25;transform:translate(-50%,-50%);animation:none!important;transition:none!important;display:grid;justify-items:center;gap:2px;padding:5px 8px;border:1px solid currentColor;border-radius:18px;background:#122b26c9;box-shadow:0 0 18px #72ffe855;backdrop-filter:blur(9px);font:600 12px system-ui;cursor:pointer;touch-action:manipulation}.maf-seed-marker[hidden]{display:none!important}#mafSeedShop{color:#fff;background:#14251fee;border:1px solid #ffffff44;border-radius:24px;padding:20px;width:min(360px,85vw);box-shadow:0 16px 70px #0009;font:15px system-ui}#mafSeedShop::backdrop{background:#0008}#mafSeedShop button,#mafSeedShop input{font:inherit;color:white;background:#ffffff12;border:1px solid #ffffff45;border-radius:12px;padding:10px}#mafSeedShop button{cursor:pointer}#mafSeedShop button:disabled{opacity:.45}#mafSeedShop input{width:75px;text-align:center}#mafSeedShop .seed-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:12px 0}#mafSeedShop .seed-buy{width:100%;background:#197b4a;font-weight:700}#mafSeedShop p{margin:10px 0}#mafSeedShop [data-error]{min-height:22px;color:#ffdc9d}`;document.head.append(style);
 const dialog=document.createElement('dialog');dialog.id='mafSeedShop';dialog.innerHTML=`<div class="seed-row"><strong data-title></strong><button type="button" data-close>✕</button></div><p>Marché des semences · lot de 10</p><p data-balance></p><div class="seed-row"><button type="button" data-minus>−</button><input type="number" min="1" max="1000" step="1" value="1" aria-label="Nombre de lots"><button type="button" data-plus>+</button></div><p data-total></p><p data-owned></p><button type="button" class="seed-buy">Acheter</button><p data-error role="status"></p>`;document.body.append(dialog);
 const q=s=>dialog.querySelector(s), input=q('input'), buy=q('.seed-buy');let crop=null,data=null,busy=false,pending=null,opening=0;
 const fmt=n=>Number(n).toLocaleString('fr-FR');
 const lots=()=>Number(input.value);
 async function call(path,body){const auth=ctx.auth();if(!auth.api||!auth.token)throw new Error('Connecte-toi pour acheter.');const r=await fetch(auth.api+'/api/world/seeds'+path,{method:body?'POST':'GET',cache:'no-store',headers:{Authorization:'Bearer '+auth.token,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});const d=await r.json();if(!r.ok){const e=new Error(d.error||'Erreur serveur');e.status=r.status;throw e;}return d;}
 function render(){const n=lots(),valid=Number.isInteger(n)&&n>=1&&n<=1000;const price=data?.catalog?.[crop?.id];q('[data-balance]').textContent=data?'Solde : $'+fmt(data.world_cash):'Chargement du solde…';q('[data-total]').textContent=valid&&price!=null?`${fmt(n*10)} graines · $${fmt(n*price)}`:'Choisis un nombre de lots valide.';q('[data-owned]').textContent=data?'Déjà possédées : '+fmt(data.inventory[crop.id]):'';buy.disabled=busy||!valid||!data||(!pending&&n*price>data.world_cash);input.disabled=busy||!!pending;q('[data-minus]').disabled=q('[data-plus]').disabled=busy||!!pending;q('[data-close]').disabled=busy||!!pending;buy.textContent=pending?'Réessayer le même achat':'Acheter';}
 async function open(p){if(dialog.open||busy||pending)return;crop=p;data=null;input.value='1';q('[data-title]').innerHTML=icon(p)+' Graines de '+p.name.toLowerCase();q('[data-error]').textContent='';ctx.release();dialog.showModal();render();const id=++opening;try{const d=await call('');if(id===opening){data=d;render();}}catch(e){if(id===opening)q('[data-error]').textContent=e.message;}}
 q('[data-close]').onclick=()=>dialog.close();dialog.addEventListener('cancel',e=>{if(busy||pending)e.preventDefault();});
 input.oninput=render;q('[data-minus]').onclick=()=>{input.value=Math.max(1,(lots()||1)-1);render();};q('[data-plus]').onclick=()=>{input.value=Math.min(1000,(lots()||1)+1);render();};
 buy.onclick=async()=>{if(buy.disabled)return;pending=pending||{crop:crop.id,lots:lots(),request_key:ctx.uuid()};busy=true;q('[data-error]').textContent='Achat en cours…';render();try{data=await call('/buy',pending);pending=null;ctx.cash(data.world_cash);q('[data-error]').textContent=fmt(data.receipt.quantity)+' graines ajoutées à tes possessions.';}catch(e){if(e.status&&e.status<500)pending=null;q('[data-error]').textContent=e.message+(pending?' — Réessaie le même achat.':'');}finally{busy=false;render();}};
 const markers=products.map(p=>{const b=document.createElement('button');b.type='button';b.className='maf-seed-marker';b.style.color=p.color;b.innerHTML=icon(p)+p.name;b.hidden=true;b.onclick=()=>open(p);b.addEventListener('pointerdown',e=>e.stopPropagation());document.body.append(b);return {p,b};});
 // Each marker is permanently anchored to the centre of its own crop terrace.
 // Only the camera projection changes; there is no screen-space fallback or animation.
 return {tick(){
  const near=!dialog.open&&ctx.near();
  markers.forEach(({p,b})=>{
   const w=ctx.world(p.x,p.z);
   const pos=near?ctx.project(w.x,p.y,w.z):null;
   b.hidden=!pos;
   if(pos){b.style.left=pos.x+'px';b.style.top=pos.y+'px';}
  });
 }};
}
