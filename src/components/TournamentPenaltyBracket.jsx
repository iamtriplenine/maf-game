import {useState} from 'react';
import {penaltyTournamentBracket,reschedulePenaltyTournamentMatch} from '../api/tournaments';
import '../styles/tournament-penalty-draw.css';
export default function TournamentPenaltyBracket({tournamentId,isOwner=false}){
  const [open,setOpen]=useState(false),[info,setInfo]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function refresh(){setBusy(true);setError('');try{setInfo(await penaltyTournamentBracket(tournamentId));}catch(e){setError(e.message);}finally{setBusy(false);}}
  async function reschedule(id){setBusy(true);setError('');try{await reschedulePenaltyTournamentMatch(id);setInfo(await penaltyTournamentBracket(tournamentId));}catch(e){setError(e.message);}finally{setBusy(false);}}
  function toggle(){if(open){setOpen(false);return;}setOpen(true);void refresh();}
  return <div className="penalty-bracket">
    <button type="button" onClick={toggle} aria-expanded={open}>{open?'Masquer le tableau':'Voir les affrontements'}</button>
    {open&&<div className="penalty-bracket__body">
      <button type="button" disabled={busy} onClick={()=>void refresh()}>{busy?'Chargement…':'Actualiser'}</button>
      {error&&<p role="alert">{error}</p>}
      {info&&!info.started&&<p>Le tirage au sort sera effectué à l’heure du tournoi.</p>}
      {info?.started&&<><p>{info.participants} joueurs retenus · {info.matches.length} duel(s) créés</p>
        {info.champion&&<p className="penalty-bracket__champion">🏆 Champion : <strong>{info.champion.name}</strong></p>}
        {(info.byes||[]).map((b,i)=><p key={i} className="penalty-bracket__bye">Tour {b.round} · {b.name} qualifié sans affrontement (exempté)</p>)}
        <ol>{info.matches.map(m=><li key={m.reference}><strong>{m.host} — {m.guest}</strong><span>Tour {m.round} · duel {m.matchNo} · {m.reference}</span><span>{m.status==='finished' ? `✅ Vainqueur : ${m.winner || 'en cours de validation'}` : m.status==='attention' ? '⚠️ À reprogrammer — aucun vainqueur' : m.status==='playing' ? '⚽ Match en cours' : 'À jouer'}{isOwner&&m.status==='attention'&&<button type="button" disabled={busy} onClick={()=>void reschedule(m.id)}>Reprogrammer le duel</button>}</span></li>)}</ol></>}
    </div>}
  </div>;
}
