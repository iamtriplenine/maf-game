import {useCallback,useEffect,useState} from 'react';
import {duelGifts,openDuelGift} from '../api/officialDuel';
import '../styles/official-duel.css';
const when=s=>new Intl.DateTimeFormat('fr-FR',{timeZone:'Africa/Abidjan',dateStyle:'medium',timeStyle:'short'}).format(new Date(s));
export default function OfficialDuelGifts({session}){
 const [gifts,setGifts]=useState([]),[error,setError]=useState(''),[revealed,setRevealed]=useState(null),[busy,setBusy]=useState(false);
 const refresh=useCallback(async()=>{if(!session?.id)return;const x=await duelGifts();setGifts(x.gifts||[]);},[session?.id]);
 useEffect(()=>{void refresh().catch(e=>setError(e.message));const timer=setInterval(()=>{if(!document.hidden)void refresh().catch(()=>{});},15000);return()=>clearInterval(timer);},[refresh]);
 const open=async id=>{setBusy(true);setError('');try{const x=await openDuelGift(id);setRevealed({...x,duelId:id});await refresh();}catch(e){setError(e.message);}finally{setBusy(false);}};
 if(!session?.id)return null;
 return <section className="maf-duels__gifts"><h3>🎁 Cadeaux des duels à deux joueurs</h3>
  {error&&<p role="alert">{error}</p>}
  {gifts.length===0&&<p>Pas encore de cadeau de duel.</p>}
  {gifts.map(g=><article key={g.duelId} className="maf-duels__card">
   <h4>{g.title}</h4><p>Remise programmée : {when(g.releaseAt)}</p>
   <p>{g.status==='ready'?'🎉 Ton coffre est prêt':g.status==='opened'?'Coffre déjà ouvert':g.status==='cancelled'?'Tournoi annulé':'Coffre verrouillé'}</p>
   {g.status==='ready'&&<button type="button" disabled={busy} onClick={()=>void open(g.duelId)}>🎁 Ouvrir mon cadeau</button>}
   {g.status==='opened'&&<p>Récompense : {g.amount} F CFA déjà crédités · place {g.place}. Skins en attente d’intégration.</p>}
   {revealed?.duelId===g.duelId&&<div role="status" className="maf-duels__reveal"><span aria-hidden="true">🎉🏆🎁✨</span><h4>Félicitations !</h4>
    <p>Place {revealed.place} · {revealed.amount} F CFA déjà crédités.</p><p>Aucun second versement à l'ouverture.</p></div>}
  </article>)}
 </section>;
}
