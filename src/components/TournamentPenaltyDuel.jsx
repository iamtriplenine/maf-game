import {useCallback,useEffect,useState} from 'react';
import {myPenaltyTournamentDuel} from '../api/tournaments';
import '../styles/tournament-penalty-draw.css';

// Une seule carte personnelle : aucun salon etranger n'apparait dans cet espace.
export default function TournamentPenaltyDuel({session}){
  const [duel,setDuel]=useState(null),[refunded,setRefunded]=useState(null),[error,setError]=useState('');
  const refresh=useCallback(async()=>{
    try{const data=await myPenaltyTournamentDuel();setDuel(data.match||null);setRefunded(data.refunded||null);setError('');}
    catch(e){setError(e.message||'Impossible de charger ton affrontement.');}
  },[]);
  useEffect(()=>{
    if(!session){setDuel(null);return;}
    void refresh();
    const timer=setInterval(()=>{if(!document.hidden)void refresh();},15000);
    return()=>clearInterval(timer);
  },[session,refresh]);
  if(!session||(!duel&&!error&&!refunded))return null;
  return <section className="penalty-draw-my" aria-label="Mon salon Tir-au-but">
    <header><span>⚽ MON SALON TIR-AU-BUT</span><button type="button" onClick={()=>void refresh()}>Actualiser</button></header>
    {refunded&&!duel&&<p role="status">{refunded.title} : ta mise de {refunded.amount} F a été remboursée, car tu étais le dernier inscrit et l'effectif était impair.</p>}
    {error?<p role="alert">{error}</p>:duel?<>
      <h3>{duel.title}</h3>
      <p><strong>{duel.host}</strong> <span>contre</span> <strong>{duel.guest}</strong></p>
      <p>Tour {duel.round} · Duel {duel.matchNo} · Référence {duel.reference}</p>
      <p className="penalty-draw-my__state">{duel.status==='finished'?'Résultat enregistré':duel.status==='playing'?'Affrontement en cours':'Affrontement programmé'}</p>
      <small>Les commandes de tirs seront disponibles dans ce salon lors de l'ouverture des matchs.</small>
    </>:null}
  </section>;
}
