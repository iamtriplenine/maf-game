import {useEffect,useState} from 'react';
import {penaltyTournamentRewardPreview,penaltyTournamentAwards,penaltyTournamentAwardHistory} from '../api/tournaments';
import '../styles/tournament-penalty-awards.css';
const francs=n=>Number(n||0).toLocaleString('fr-FR');
const label=r=>r==='champion'?'Champion':r==='finaliste'?'Finaliste':r==='demi_finaliste'?'Demi-finaliste':r;
export default function TournamentPenaltyRewards({tournament,session}) {
 const t=tournament;
 const defaultPlayers=Math.max(2,Math.min(t.capacity,Math.floor((t.registered||0)/2)*2||Math.min(t.capacity,8)));
 const [players,setPlayers]=useState(defaultPlayers),[open,setOpen]=useState(false),[preview,setPreview]=useState(null);
 const [award,setAward]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>setPlayers(defaultPlayers),[t.id,t.capacity,t.registered]);
 useEffect(()=>{
  if(!open)return undefined;
  let live=true;setBusy(true);setError('');setPreview(null);setAward(null);
  Promise.all([penaltyTournamentRewardPreview(players,t.entryFee),session?penaltyTournamentAwards(t.id):Promise.resolve(null)])
   .then(([a,b])=>{if(live){setPreview(a);setAward(b);}})
   .catch(e=>{if(live)setError(e.message);})
   .finally(()=>{if(live)setBusy(false);});
  return ()=>{live=false;};
 },[open,players,t.id,t.entryFee,session?.id]);
 return <details className="penalty-awards" open={open} onToggle={e=>setOpen(e.currentTarget.open)}>
   <summary><span>04</span> Récompenses et historique <b aria-hidden="true">＋</b></summary>
   <div className="tourney-detail-body">
    <label>Effectif retenu <select value={players} onChange={e=>setPlayers(Number(e.target.value))}>
      {Array.from({length:t.capacity/2},(_,i)=>2*(i+1)).map(n=><option key={n} value={n}>{n} joueurs</option>)}
    </select></label>
    {busy&&<p role="status">Calcul des récompenses…</p>}
    {error&&<p role="alert" className="tourney-error">{error}</p>}
    {preview&&<><p>Inscriptions retenues : <strong>{francs(preview.potFranc)} F CFA</strong> · Part organisateur : <strong>{francs(preview.organizerFranc)} F</strong>.</p>
      <div className="tourney-table-wrap"><table><thead><tr><th>Classement</th><th>Gain</th></tr></thead><tbody>
        {preview.prizes.map((r,i)=><tr key={i}><td>{label(r.role)}{r.place===3?` ${i-1}`:''}</td><td>{francs(r.amountFranc)} F</td></tr>)}
      </tbody></table></div>
      <p>Les montants définitifs sont calculés sur les joueurs effectivement retenus. La distribution est enregistrée après certification de la finale.</p>
    </>}
    {award?.status==='credited'&&<div className="penalty-awards__paid" role="status">
      <strong>🏆 Résultats officiels · Récompenses distribuées</strong>
      {award.winners.map((r,i)=><p key={i}>{label(r.role)} — {r.name} : <strong>{francs(r.amountFranc)} F</strong></p>)}
      {award.myAward&&<p><strong>Ton gain : {francs(award.myAward.amountFranc)} F</strong></p>}
    </div>}
    {award?.status==='pending'&&<p>Les récompenses seront confirmées après la finale.</p>}
    {!session&&<p>Connecte-toi pour consulter les récompenses distribuées.</p>}
   </div>
 </details>;
}
export function PenaltyAwardHistory(){
 const [open,setOpen]=useState(false),[rows,setRows]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{
  if(!open)return undefined;
  let live=true;setBusy(true);setError('');setPreview(null);setAward(null);
  penaltyTournamentAwardHistory().then(x=>{if(live)setRows(x.awards||[]);})
   .catch(e=>{if(live)setError(e.message);})
   .finally(()=>{if(live)setBusy(false);});
  return ()=>{live=false;};
 },[open]);
 return <details className="penalty-awards penalty-awards__history" open={open} onToggle={e=>setOpen(e.currentTarget.open)}>
   <summary>🏆 Mes gains Tir-au-but</summary>
   {busy&&<p>Chargement…</p>}{error&&<p role="alert">{error}</p>}
   {!busy&&!error&&!rows.length&&<p>Aucun gain enregistré pour le moment.</p>}
   {rows.map(x=><p key={x.tournamentId}><strong>{x.title}</strong> · {label(x.role)} · {francs(x.amountFranc)} F</p>)}
 </details>;
}
