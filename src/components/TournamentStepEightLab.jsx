import { useState } from 'react';
import { ownerTournaments } from '../api/tournaments';
import { ownerAwardPreview, ownerAwardStatus } from '../api/tournamentAwards';
import '../styles/tournament-step-eight.css';

export default function TournamentStepEightLab() {
  const [open,setOpen]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [tournaments,setTournaments]=useState([]);
  const [selection,setSelection]=useState('');
  const [view,setView]=useState(null);
  async function toggle() {
    if(open) {setOpen(false);setError('');return;}
    setBusy(true);setError('');
    try {
      const data=await ownerTournaments();
      if(!Array.isArray(data?.tournaments)) throw new Error('Verification proprietaire impossible.');
      const simulated=await ownerAwardPreview();
      setTournaments(data.tournaments);setView(simulated);setOpen(true);setSelection('');
    } catch(e){setError(e.message||'Simulation indisponible.');}
    finally{setBusy(false);}
  }
  async function change(value) {
    setSelection(value);setBusy(true);setError('');
    try {setView(value ? await ownerAwardStatus(value) : await ownerAwardPreview());}
    catch(e){setView(null);setError(e.message||'Inspection indisponible.');}
    finally{setBusy(false);}
  }
  const demo=view?.type==='demo';
  const finalists=demo?view.lines.filter(l=>l.place).sort((a,b)=>a.place-b.place):[];
  return <section className="tourney-eight" aria-label="Etape huit, recompenses du tournoi">
    <button type="button" className="tourney-eight__toggle" onClick={()=>void toggle()} disabled={busy} aria-expanded={open}>
      🏆 Étape 8 · Classement, gains et historique {open?'−':'+'}
    </button>
    {error&&<p role="alert" className="tourney-error">{error}</p>}
    {open&&<div className="tourney-eight__body">
      <p><strong>Compte propriétaire 999 uniquement.</strong> Démonstration des récompenses : aucun crédit et aucun bonus versé.</p>
      <label>Consulter un tournoi existant (lecture seule)
        <select value={selection} onChange={e=>void change(e.target.value)} disabled={busy}>
          <option value="">Simulation avec 20 joueurs fictifs</option>
          {tournaments.map(t=><option value={String(t.id)} key={t.id}>{t.title}</option>)}
        </select>
      </label>
      {view&&demo&&<div className="tourney-eight__results" aria-live="polite">
        <h4>Classement fictif des finalistes</h4>
        <div className="tourney-eight__table-wrap"><table><thead><tr><th>Rang</th><th>Réel (F)</th><th>Bonus (F)</th></tr></thead>
          <tbody>{finalists.map(l=><tr key={l.userId}><td>{l.place}{l.place===1?'er':'e'}</td><td>{l.real}</td><td>{l.bonus}</td></tr>)}</tbody>
        </table></div>
        <p>16 éliminés : <strong>62,50 F réels</strong> et <strong>100 F bonus</strong> chacun.</p>
        <div className="tourney-eight__figures"><span>Mises : <b>{view.stakes} F</b></span>
          <span>Gains réels : <b>{view.totalReal} F</b></span><span>Bonus : <b>{view.totalBonus} F</b></span>
          <span>Reste avant frais : <b>{view.remaining} F</b></span></div>
        <p className="tourney-eight__note">Les gains comprennent la mise initiale : ne pas ajouter 500 F en plus du montant indiqué.</p>
      </div>}
      {view&&!demo&&<div className="tourney-eight__results" aria-live="polite">
        <h4>{view.title}</h4>
        <p>Inscrits : {view.registeredCount}/20 · Qualifiés : {view.qualifiedCount}/4.</p>
        <p>Finale terminée : {view.finalOver?'Oui':'Non'} · Classement complet certifié : {view.rankingCertified?'Oui':'Non'}.</p>
        <p>Lignes d’historique préparées : {view.preparedCount}/20.</p>
        <p>Montants préparés, non versés : {view.preparedReal} F réels, {view.preparedBonus} F bonus.</p>
        <p className="tourney-eight__note">Aucun paiement automatique n'est activé. Cette consultation ne peut pas modifier les soldes.</p>
      </div>}
      <p className="tourney-eight__warning">Les places 2, 3 et 4 devront être établies à partir d’événements de jeu certifiés. Le portefeuille actuel utilise un solde réel entier : les 62,50 F seront bloqués jusqu’à l’adaptation sûre des soldes.</p>
    </div>}
  </section>;
}
