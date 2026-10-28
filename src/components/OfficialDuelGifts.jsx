import {useCallback,useEffect,useState} from 'react';
import {duelGifts,openDuelGift} from '../api/officialDuel';
import GiftCompactRow from './GiftCompactRow';
const when=s=>s?new Intl.DateTimeFormat('fr-FR',{timeZone:'Africa/Abidjan',dateStyle:'medium',timeStyle:'short'}).format(new Date(s)):'Non programmée';
export default function OfficialDuelGifts({session,onReveal}){
 const [gifts,setGifts]=useState([]),[error,setError]=useState('');
 const refresh=useCallback(async()=>{if(!session?.id)return;const x=await duelGifts();setGifts(x.gifts||[]);},[session?.id]);
 useEffect(()=>{void refresh().catch(e=>setError(e.message));const timer=setInterval(()=>{if(!document.hidden)void refresh().catch(()=>{});},15000);return()=>clearInterval(timer);},[refresh]);
 if(!session?.id || (!gifts.length && !error))return null;
 return <section className="maf-gift-lines" aria-label="Cadeaux des duels">
  <h3 className="maf-gift-lines__heading">Duels <span>{gifts.length}</span></h3>
  {error&&<p role="alert">{error}</p>}
  {gifts.map(g=><GiftCompactRow key={g.duelId} title={g.title} subtitle={`Remise : ${when(g.releaseAt)}`}
   status={g.status==='opened'?'opened':g.status==='ready'?'ready':g.status==='cancelled'?'cancelled':'locked'}
   detail={<p>{g.status==='opened'?`Place ${g.place} · ${g.amount} F déjà crédités`:g.status==='cancelled'?'Duel annulé':'Les cadeaux se débloquent après validation.'}</p>}
   onOpen={()=>onReveal?.({title:g.title,
     existing:g.status==='opened'?{lots:[{kind:'balance',amount:Number(g.amount)||0}]}:null,
     claim:async()=>{const result=await openDuelGift(g.duelId);await refresh();return {lots:[{kind:'balance',amount:Number(result.amount)||0}]};}
   })}/>) }
 </section>;
}
