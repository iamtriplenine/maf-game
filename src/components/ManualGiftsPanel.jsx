import { useCallback,useEffect,useState } from 'react';
import { myOwnerGifts,openOwnerGift } from '../api/ownerGifts';
import { refreshSession } from '../api/accounts';
import '../styles/owner-gifts.css';
const NAMES={coupon:'Coupon',skin:'Skin exclusif',background:'Arrière-plan',image:'Image',balance:'Solde réel',bonus:'Solde bonus'};
function Receipt({receipt}){
 if(!receipt)return null;
 return <div className="maf-manual-gift__receipt">
  {receipt.amount&&<strong>{receipt.amount.toLocaleString('fr-FR')} {receipt.currency==='V'?'bonus':'F CFA'}</strong>}
  {receipt.code&&<><span>Code coupon : <strong>{receipt.code}</strong></span><button type="button" onClick={()=>navigator.clipboard?.writeText(receipt.code)}>Copier le code</button><small>Utilise ce code dans la rubrique Coupons du profil.</small></>}
  {receipt.skinId&&<span>Skin débloqué : {receipt.skinId} · disponible dans le Studio 3D</span>}
  {receipt.backgroundId&&<span>Arrière-plan appliqué : {receipt.backgroundId}</span>}
  {receipt.imageData&&<img src={receipt.imageData} alt="Cadeau reçu"/>}
 </div>;
}
export default function ManualGiftsPanel({session,onVisibility}){
 const [gifts,setGifts]=useState([]),[busy,setBusy]=useState(null),[error,setError]=useState('');
 const refresh=useCallback(async()=>{
  if(!session?.id){setGifts([]);return;}
  const response=await myOwnerGifts();setGifts(response.gifts||[]);onVisibility?.(response.legacyHiddenBefore||0);
 },[session?.id,onVisibility]);
 useEffect(()=>{let live=true; if(!session?.id)return;
  myOwnerGifts().then(d=>{if(live){setGifts(d.gifts||[]);onVisibility?.(d.legacyHiddenBefore||0);}}).catch(e=>{if(live)setError(e.message);});
  const t=window.setInterval(()=>{if(!document.hidden)void myOwnerGifts().then(d=>{if(live){setGifts(d.gifts||[]);onVisibility?.(d.legacyHiddenBefore||0);}}).catch(()=>{});},30000);
  return()=>{live=false;clearInterval(t);};
 },[session?.id,onVisibility]);
 const open=async id=>{if(busy!==null)return;setBusy(id);setError('');try{const result=await openOwnerGift(id);if(['balance','bonus','background'].includes(result.receipt?.kind))await refreshSession();await refresh();}catch(e){setError(e.message);}finally{setBusy(null);}};
 if(!session?.id || (!gifts.length && !error))return null;
 return <section className="maf-manual-gifts" aria-label="Cadeaux personnels"><h3>Mes cadeaux personnels</h3>
  {error&&<p role="alert">{error}</p>}
  {!gifts.length&&<p>Aucun cadeau personnel pour le moment.</p>}
  {gifts.map(g=><article key={g.id} className="maf-manual-gift"><div className="maf-manual-gift__head"><span aria-hidden="true">🎁</span><div><h4>{g.title}</h4><small>{NAMES[g.kind]||'Cadeau'}</small></div></div>
    {g.message&&<p>{g.message}</p>}
    {g.openedAt?<Receipt receipt={g.receipt}/>:<button type="button" disabled={busy!==null} onClick={()=>void open(g.id)}>{busy===g.id?'Ouverture…':'Ouvrir mon cadeau'}</button>}
   </article>)}
 </section>;
}
