import {useCallback,useEffect,useRef,useState} from 'react';
import {myPenaltyTournamentDuel,penaltyTournamentMatch,startPenaltyTournamentMatch,
  choosePenaltyTournamentMatch,forfeitPenaltyTournamentMatch,pingPenaltyTournamentMatch} from '../api/tournaments';
import {PenaltyArena} from './PenaltyArena';
import {penaltyJoinWindow,penaltyClock} from '../tournaments/penaltyJoinWindow';
import '../styles/tournament-penalty-presence.css';
import '../styles/tournament-penalty-draw.css';

// Une seule carte personnelle et un seul terrain : aucun autre duel n'est accessible.
export default function TournamentPenaltyDuel({session}){
  const [duel,setDuel]=useState(null),[refunded,setRefunded]=useState(null),[bye,setBye]=useState(null),[champion,setChampion]=useState(null),[error,setError]=useState('');
  const [open,setOpen]=useState(false),[room,setRoom]=useState(null),[match,setMatch]=useState(null);
  const [busy,setBusy]=useState(false),[arenaError,setArenaError]=useState('');
  const [clock,setClock]=useState(Date.now());
  const clockOffset=useRef(0);
  useEffect(()=>{
    const timer=setInterval(()=>setClock(Date.now()+clockOffset.current),1000);
    return()=>clearInterval(timer);
  },[]);
  const refresh=useCallback(async()=>{
    try{const data=await myPenaltyTournamentDuel();if(Number.isFinite(data.serverNow))clockOffset.current=data.serverNow-Date.now();setClock(Date.now()+clockOffset.current);setDuel(data.match||null);setRefunded(data.refunded||null);setBye(data.bye||null);setChampion(data.champion||null);setError('');}
    catch(e){setError(e.message||'Impossible de charger ton affrontement.');}
  },[]);
  useEffect(()=>{
    if(!session){setDuel(null);setOpen(false);return;}
    void refresh();
    const timer=setInterval(()=>{if(!document.hidden)void refresh();},15000);
    return()=>clearInterval(timer);
  },[session,refresh]);
  const duelId=duel?.id;
  const arrival=penaltyJoinWindow(duel,clock);
  const starts=duel?.scheduledAt ? new Date(duel.scheduledAt).toLocaleString('fr-FR',{
    timeZone:'Africa/Abidjan',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'
  }) : null;
  useEffect(()=>{
    if(!open||!duelId)return undefined;
    let active=true;
    const poll=async()=>{
      if(document.hidden||busy)return;
      try{
        const data=await penaltyTournamentMatch(duelId);
        if(active){setRoom(data.room);setMatch(data.match);setArenaError('');}
      }catch(e){if(active)setArenaError(e.message||'Connexion interrompue.');}
    };
    void poll();
    const timer=setInterval(()=>{void poll();},2500);
    // Presence uniquement tant que le salon est ouvert. Aucun polling d ecriture hors salon.
    const ping=async()=>{
      if(document.hidden||busy||!active)return;
      try{const data=await pingPenaltyTournamentMatch(duelId);
        if(active){setRoom(data.room);setMatch(data.match);setArenaError('');}}
      catch(e){if(active)setArenaError(e.message||'Presence non confirmee.');}
    };
    const presenceTimer=setInterval(()=>void ping(),15000);
    return()=>{active=false;clearInterval(timer);clearInterval(presenceTimer);};
  },[open,duelId,busy]);
  const enter=async()=>{
    if(!duelId||!arrival?.canEnter)return;
    setBusy(true);setArenaError('');
    try{const data=await pingPenaltyTournamentMatch(duelId);setRoom(data.room);setMatch(data.match);setOpen(true);}
    catch(e){setError(e.message||'Salon indisponible.');}
    finally{setBusy(false);}
  };
  const action=async(fn)=>{
    if(busy||!duelId)return;
    setBusy(true);setArenaError('');
    try{
      const data=await fn(duelId);
      setRoom(data.room);setMatch(data.match);
      if(data.match?.finished)void refresh();
    }catch(e){setArenaError(e.message||'Action refusée.');}
    finally{setBusy(false);}
  };
  if(!session||(!duel&&!error&&!refunded&&!bye&&!champion))return null;
  return <section className="penalty-draw-my" aria-label="Mon salon Tir-au-but">
    <header><span>⚽ Ton prochain affrontement</span><button type="button" onClick={()=>void refresh()}>Actualiser</button></header>
    {refunded&&!duel&&<p role="status">{refunded.title} : ta mise de {refunded.amount} F a été remboursée, car tu étais le dernier inscrit et l'effectif était impair.</p>}
    {error&&<p role="alert">{error}</p>}
    {bye&&(!duel || duel.round<bye.round)&&<p role="status">Tour {bye.round} : tu es exempté de ce tour. Tu es qualifié pour le suivant.</p>}
    {champion&&<p role="status" className="penalty-draw-my__state">🏆 Champion Tir-au-but : {champion.title}. Résultat certifié.</p>}
    {duel&&<>
      <h3>{duel.title}</h3>
      <p><strong>{duel.host}</strong> <span>contre</span> <strong>{duel.guest}</strong></p>
      <p>Tour {duel.round} · Duel {duel.matchNo} · Référence {duel.reference}</p>
      <p className="penalty-draw-my__state">{duel.status==='finished'?'Résultat enregistré':duel.status==='playing'?'Affrontement en cours':duel.status==='attention'?'Affrontement en attente de décision':'Affrontement programmé'}</p>
      {starts&&<p className="penalty-presence__time">Heure du duel : <strong>{starts} (Abidjan)</strong></p>}
      {arrival?.phase==='closed'&&<p className="penalty-presence__message">Ton salon ouvrira cinq minutes avant le début du duel.</p>}
      {['closed','early'].includes(arrival?.phase)&&<p className="penalty-presence__message">Un duel ne démarre jamais avant son heure officielle, même si les deux joueurs sont déjà présents. Pour la finale, l'heure « Finale » annoncée sur la carte du tournoi fait foi.</p>}
      {arrival?.phase==='early'&&<p className="penalty-presence__message">Salle d'attente ouverte. Le match commence dans <strong>{penaltyClock(arrival.startSeconds)}</strong>.</p>}
      {arrival?.phase==='waiting'&&!open&&<div className="penalty-presence__notice" role="alert">
        <strong>🔔 C'est l'heure de ton duel !</strong>
        <p>Rejoins ton salon maintenant. Il reste <strong>{penaltyClock(arrival.deadlineSeconds)}</strong> avant la décision de forfait.</p>
      </div>}
      {arrival?.phase==='waiting'&&open&&room?.status==='ready'&&<p className="penalty-presence__message" role="status">Tu es dans ton salon. {room.waitingForOpponent?'Nous attendons ton adversaire.':'Les deux joueurs sont présents.'} Temps restant : <strong>{penaltyClock(arrival.deadlineSeconds)}</strong>.</p>}
      {arrival?.phase==='decision'&&<p className="penalty-presence__message" role="status">Le délai initial de cinq minutes est terminé. Le serveur vérifie la présence et confirme le résultat. Aucun joueur ne peut rejoindre tardivement.</p>}
      {arrival?.phase==='attention'&&<p className="penalty-presence__message" role="status">Le duel nécessite une décision du propriétaire. Aucun vainqueur n'a été désigné.</p>}
      {duel.winner&&<p>Vainqueur : <strong>{duel.winner}</strong></p>}
      <button type="button" disabled={busy||!arrival?.canEnter} onClick={()=>void enter()}>{busy?'Ouverture…':arrival?.phase==='finished'?'Voir le résultat':arrival?.phase==='closed'?'Salon pas encore ouvert':arrival?.phase==='decision'?'Vérification du forfait…':arrival?.phase==='attention'?'Décision en attente':'Rejoindre mon salon'}</button>
      {open&&<button type="button" className="penalty-draw-my__close" onClick={()=>{setOpen(false);setRoom(null);setMatch(null);void refresh();}}>← Fermer le salon et revenir au tournoi</button>}
      {open&&room?.attentionReason&&<p role="status">Ce duel nécessite une nouvelle programmation. Aucun vainqueur n’a été attribué.</p>}
      {open&&room&&room.status!=='attention'&&<PenaltyArena tournament room={room} match={match} busy={busy}
        onStart={()=>void action(startPenaltyTournamentMatch)}
        onChoose={direction=>void action(id=>choosePenaltyTournamentMatch(id,direction))}
        onForfeit={()=>void action(forfeitPenaltyTournamentMatch)}
        onBack={()=>{setOpen(false);void refresh();}}
        onExit={()=>{setOpen(false);void refresh();}}
        error={arenaError}/>} 
    </>}
  </section>;
}
