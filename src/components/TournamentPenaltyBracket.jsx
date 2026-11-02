import {useState} from 'react';
import {penaltyTournamentBracket} from '../api/tournaments';
import '../styles/tournament-penalty-draw.css';
export default function TournamentPenaltyBracket({tournamentId}){
  const [open,setOpen]=useState(false),[info,setInfo]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function refresh(){setBusy(true);setError('');try{setInfo(await penaltyTournamentBracket(tournamentId));}catch(e){setError(e.message);}finally{setBusy(false);}}
  function toggle(){if(open){setOpen(false);return;}setOpen(true);void refresh();}
  return <div className="penalty-bracket">
    <button type="button" onClick={toggle} aria-expanded={open}>{open?'Masquer le tableau':'Voir les affrontements'}</button>
    {open&&<div className="penalty-bracket__body">
      <button type="button" disabled={busy} onClick={()=>void refresh()}>{busy?'Chargement…':'Actualiser'}</button>
      {error&&<p role="alert">{error}</p>}
      {info&&!info.started&&<p>Le tirage au sort sera effectué à l’heure du tournoi.</p>}
      {info?.started&&<><p>{info.participants} joueurs qualifiés · {info.matches.length} duels programmés</p>
        <ol>{info.matches.map(m=><li key={m.reference}><strong>{m.host} — {m.guest}</strong><span>Tour {m.round} · duel {m.matchNo} · {m.reference}</span></li>)}</ol></>}
    </div>}
  </div>;
}
