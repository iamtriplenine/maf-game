// Salon final prive, visible seulement apres la certification de la victoire du plateau.
import {useCallback,useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {BoardMatch} from './MonopolyOnline';
import {myFinale,finalePresence,finaleAction} from '../api/tournamentLive';
import '../styles/duel-fullscreen.css';
import '../styles/tournament-finale.css';
export default function TournamentFinalMatch({session}){
 const [finale,setFinale]=useState(null),[open,setOpen]=useState(false),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const busyRef=useRef(false);
 const refresh=useCallback(async()=>{
   try{const r=await myFinale();setFinale(r.finale||null);}
   catch(e){setError(e.message);}
 },[]);
 useEffect(()=>{if(!session?.id){setFinale(null);setOpen(false);setReady(false);return;}
   void refresh();const t=setInterval(()=>{if(!document.hidden)void refresh();},3000);
   return()=>clearInterval(t);
 },[session?.id,refresh]);
 useEffect(()=>{
   if((!open&&!ready)||!finale?.tournamentId)return;
   const id=finale.tournamentId;
   const heartbeat=()=>{if(!document.hidden)void finalePresence(id,'here').then(refresh).catch(e=>setError(e.message));};
   heartbeat();const t=setInterval(heartbeat,10000);
   const resume=()=>{if(!document.hidden)heartbeat();};document.addEventListener('visibilitychange',resume);
   return()=>{clearInterval(t);document.removeEventListener('visibilitychange',resume);
     void finalePresence(id,'away').catch(()=>{});};
 },[open,ready,finale?.tournamentId,refresh]);
 useEffect(()=>{if(!open)return;const old=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=old;};},[open]);
 if(!session?.id||!finale)return null;
 const state=finale.state,game=state?.game;
 const winnerSeat=Number.isInteger(game?.winner)?game.winner:-1;
 const room=state?{id:`finale-${finale.tournamentId}`,code:'Finale',
   status:game.phase==='over'?'finished':'playing',
   players:state.seats.map(p=>({id:p.clientId,name:p.name,seat:p.seat})),game,
   stake:500,payout:0,winModeAvailable:false,
   winnerId:winnerSeat>=0?state.seats[winnerSeat]?.clientId:null}:null;
 const send=async task=>{if(busyRef.current||!room)return false;
   busyRef.current=true;setBusy(true);setError('');try{await task();await refresh();return true;}
   catch(e){setError(e.message);await refresh();return false;}finally{setBusy(false);busyRef.current=false;}};
 return <>
  <section className="maf-finale-invite" aria-label="Ton salon de finale" role="status">
   <div className="maf-finale-invite__crown" aria-hidden="true">♛</div>
   <div className="maf-finale-invite__content"><span className="maf-finale-invite__kicker">ACCÈS FINALISTE DÉBLOQUÉ</span>
    <h3>🏆 Finale · {finale.title}</h3>
    <strong>Déjà inscrit à la finale</strong>
    <p>{finale.status==='waiting'?'Attends les autres participants pour participer.':finale.status==='finished'?'La finale est terminée.':'La finale est en cours : rejoins ton plateau !'}</p>
    <div className="maf-finale-invite__progress">{finale.finalistCount} / {finale.expectedFinalists} qualifiés
     {finale.status==='waiting'&&finale.nextAt&&<span> · Rendez-vous : {new Date(finale.nextAt).toLocaleString('fr-FR',{timeZone:'Africa/Abidjan',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</span>}</div>
    <div className="maf-finale-invite__members">{finale.finalists.map(p=><span key={p.table}>♛ {p.name}</span>)}</div>
    {!finale.enabled&&<small>Ouverture officielle de la finale en attente de validation.</small>}
    {ready&&finale.status==='waiting'&&<small role="status">✓ Tu es présent dans le salon final. Le serveur attend les autres qualifiés.</small>}
    {error&&<small role="alert" className="tourney-error">{error}</small>}
   </div>
   {room?<button type="button" className="maf-finale-invite__button" onClick={()=>{setOpen(true);setError('');}}>🎲 Entrer dans la finale</button>:
     <button type="button" className="maf-finale-invite__button" disabled={!finale.enabled||ready} onClick={()=>{setReady(true);void finalePresence(finale.tournamentId,'here').catch(e=>setError(e.message));}}>{ready?'✓ Présence confirmée':'Je suis prêt pour la finale'}</button>}
  </section>
  {open&&room&&createPortal(<div className="maf-duel-fullscreen mono-online mono-online--playing maf-finale-fullscreen" role="dialog" aria-modal="true" aria-label="Monopoly : finale du tournoi">
   <header className="maf-duel-fullscreen__head"><strong>♛ FINALE · {finale.title}</strong><button type="button" className="btn btn--sm" onClick={()=>setOpen(false)}>✕ Fermer</button></header>
   {error&&<p className="tourney-error" role="alert">{error}</p>}
   <BoardMatch room={room} session={session} busy={busy} send={send} tournamentKind="finale" tournamentAction={(action,square)=>finaleAction(finale.tournamentId,finale.revision,action,square)}/>
  </div>,document.body)}
 </>;
}
