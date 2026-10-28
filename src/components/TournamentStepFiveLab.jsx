// Demonstration sur le site reel, toujours protegee par la session proprietaire
// verifiee dans le backend. Aucune ecriture dans les tournois ou portefeuilles.
import { useState } from 'react';
import { ownerTournaments } from '../api/tournaments';
import { previewQualificationDraw, qualificationGroupsOwner } from '../api/tournamentQualifications';
import '../styles/tournament-step-five.css';

export default function TournamentStepFiveLab() {
  const [open,setOpen]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [groups,setGroups]=useState([]);
  const [items,setItems]=useState([]);
  const [selected,setSelected]=useState('');
  const [enabled,setEnabled]=useState(false);
  async function show() {
    if(open){setOpen(false);setGroups([]);setSelected('');return;}
    setBusy(true);setError('');setMessage('');
    try {
      // Le frontend n'est pas la barriere d'acces : route protegee cote serveur.
      const response=await ownerTournaments();
      if(!Array.isArray(response?.tournaments))throw new Error('Session proprietaire non verifiee.');
      setItems(response.tournaments);setOpen(true);
    }catch(e){setError(e.message||'Acces refuse.');}
    finally{setBusy(false);}
  }
  async function preview(){
    setBusy(true);setError('');
    try{
      const data=await previewQualificationDraw();
      setGroups(data.groups||[]);setEnabled(Boolean(data.realStartEnabled));setSelected('');
      setMessage('Tirage fictif effectue : aucun joueur ni tournoi reel touche.');
    }catch(e){setError(e.message||'Tirage impossible.');}
    finally{setBusy(false);}
  }
  async function checkReal(id){
    setSelected(id);setGroups([]);setBusy(true);setError('');setMessage('');
    try{
      const data=await qualificationGroupsOwner(id);
      setGroups(data.groups||[]);setEnabled(Boolean(data.realStartEnabled));
      setMessage(data.groups?.length ? 'Groupes enregistres sur le serveur (lecture seule).'
        : 'Aucun groupe lance pour ce tournoi. Les vrais departs sont desactives tant que les tests ne sont pas termines.');
    }catch(e){setError(e.message||'Consultation impossible.');}
    finally{setBusy(false);}
  }
  return <section className="tourney-five-draw" aria-label="Etape cinq - tirage des qualifications">
    <button type="button" className="tourney-five-draw__toggle" disabled={busy} onClick={show} aria-expanded={open}>
      🎲 Étape 5 · Tirage des 4 plateaux {open?'−':'+'}
    </button>
    {error&&<p role="alert" className="tourney-error">{error}</p>}
    {open&&<div className="tourney-five-draw__content">
      <p><strong>Réservé au propriétaire 999.</strong> Simule un tirage aléatoire de 20 joueurs fictifs sur quatre plateaux de cinq. Le test ne débite aucun compte.</p>
      <button type="button" disabled={busy} onClick={preview}>↻ Simuler le tirage des 20 joueurs</button>
      <label htmlFor="tourney-five-select">Consulter les groupes d'un tournoi réel (lecture seule)</label>
      <select id="tourney-five-select" disabled={busy} value={selected} onChange={e=>{
        if(e.target.value)void checkReal(e.target.value);else{setSelected('');setGroups([]);setMessage('');}
      }}>
        <option value="">Choisir un tournoi</option>
        {items.map(t=><option value={String(t.id)} key={t.id}>{t.title} · {t.registered}/20</option>)}
      </select>
      {message&&<p role="status">{message}</p>}
      {enabled&&<p role="alert">Attention : lancement reel active sur ce serveur. Verifie la disponibilite des parcours joueurs.</p>}
      {groups.length>0&&<div className="tourney-five-draw__grid">
        {groups.map(g=><article key={g.table} className="tourney-five-draw__table">
          <h4>Plateau {g.table} <small>· {g.players.length}/5</small></h4>
          {g.reference&&<p className="tourney-five-draw__reference">Référence : <code>{g.reference}</code></p>}
          <ol>{g.players.map((p,i)=><li key={p.userId ?? i}><span>Place {i+1}</span><strong>{p.name}</strong></li>)}</ol>
        </article>)}
      </div>}
    </div>}
  </section>;
}
