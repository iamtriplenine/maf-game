import { useCallback,useEffect,useState } from 'react';
import { myOwnerGifts,openOwnerGift } from '../api/ownerGifts';
import { refreshSession } from '../api/accounts';
import GiftCompactRow from './GiftCompactRow';
import '../styles/owner-gifts.css';
const NAMES={coupon:'Coupon',skin:'Skin exclusif',background:'Arrière-plan',image:'Image',balance:'Solde réel',bonus:'Solde bonus',bundle:'Coffre multi-lots'};
export default function ManualGiftsPanel({session,onVisibility,onReveal}){
 const [gifts,setGifts]=useState([]),[error,setError]=useState('');
 const refresh=useCallback(async()=>{
  if(!session?.id){setGifts([]);return;}
  const response=await myOwnerGifts();setGifts(response.gifts||[]);onVisibility?.(response.legacyHiddenBefore||0);
 },[session?.id,onVisibility]);
 useEffect(()=>{let live=true; if(!session?.id)return;
  myOwnerGifts().then(d=>{if(live){setGifts(d.gifts||[]);onVisibility?.(d.legacyHiddenBefore||0);}}).catch(e=>{if(live)setError(e.message);});
  const t=window.setInterval(()=>{if(!document.hidden)void myOwnerGifts().then(d=>{if(live){setGifts(d.gifts||[]);onVisibility?.(d.legacyHiddenBefore||0);}}).catch(()=>{});},30000);
  return()=>{live=false;clearInterval(t);};
 },[session?.id,onVisibility]);
 if(!session?.id || (!gifts.length && !error))return null;
 return <section className="maf-gift-lines" aria-label="Cadeaux personnels">
  <h3 className="maf-gift-lines__heading">Cadeaux personnels <span>{gifts.length}</span></h3>
  {error&&<p role="alert">{error}</p>}
  {!gifts.length&&<p>Aucun cadeau personnel pour le moment.</p>}
  {gifts.map(g=><GiftCompactRow key={g.id} title={g.title}
    subtitle={`${NAMES[g.kind]||'Cadeau'}${g.lotCount>1?` · ${g.lotCount} lots`:''}`}
    status={g.openedAt?'opened':'ready'}
    detail={<>{g.message&&<p>{g.message}</p>}{g.lots?.length>1&&<p>{g.lots.map(l=>NAMES[l.kind]||l.kind).join(' · ')}</p>}{g.openedAt&&<small>Déjà ouvert — tu peux revoir sa présentation sans second crédit.</small>}</>}
    onOpen={()=>onReveal?.({title:g.title,existing:g.openedAt?g.receipt:null,claim:async()=>{
      const result=await openOwnerGift(g.id);
      if(['balance','bonus','background','bundle'].includes(result.receipt?.kind))await refreshSession();
      await refresh();return result.receipt;
    }})}/>) }
 </section>;
}
