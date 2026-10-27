import { useEffect, useState } from 'react';
import { ownerTournaments } from '../api/tournaments';
import { ownerFinalistLobby, previewFinalists } from '../api/tournamentFinalists';
import '../styles/tournament-step-six.css';

const label={qualified:'Qualifié',in_progress:'Qualification en cours',not_started:'Pas encore lancé',pending_sync:'Résultat en synchronisation',review:'Résultat à vérifier'};

export default function TournamentStepSixLab() {
  const [open,setOpen]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [tourneys,setTourneys]=useState([]);
  const [selected,setSelected]=useState('');
  const [demoCount,setDemoCount]=useState(0);
  const [view,setView]=useState(null);
  const [mode,setMode]=useState('demo');
  async function unlock(){
    if(open){setOpen(false);setView(null);setSelected('');return;}
    setBusy(true);setError('');
    try{
      // Validation en base sur la route owner, pas seulement session.pseudo.
      const owner=await ownerTournaments();
      if(!Array.isArray(owner?.tournaments))throw new Error('Acces proprietaire non verifie.');
      setTourneys(owner.tournaments);setView(await previewFinalists(0));setDemoCount(0);
      setMode('demo');setOpen(true);
    }catch(e){setError(e.message||'Impossible de verifier le compte proprietaire.');}
    finally{setBusy(false);}
  }
  async function demo(count){
    setBusy(true);setError('');
    try{const response=await previewFinalists(count);
      setMode('demo');setSelected('');setDemoCount(count);setView(response);
    }catch(e){setError(e.message||'Simulation indisponible.');}
    finally{setBusy(false);}
  }
  async function getReal(id,quiet=false){
    if(!id){setSelected('');setMode('demo');return;}
    if(!quiet){setBusy(true);setError('');setSelected(id);}
    try{const response=await ownerFinalistLobby(id);
      setMode('real');setView(response);
    }catch(e){setError(e.message||'Consultation du tournoi impossible.');}
    finally{if(!quiet)setBusy(false);}
  }
  useEffect(()=>{
    if(!open||mode!=='real'||!selected)return;
    const id=setInterval(()=>{if(!document.hidden)void getReal(selected,true);},15000);
    return()=>clearInterval(id);
  },[open,mode,selected]);
  return <section className="tourney-six" aria-label="Etape six, finalistes">
    <button type="button" className="tourney-six__toggle" onClick={unlock} disabled={busy} aria-expanded={open}>
      🏆 Étape 6 · Salon d'attente des finalistes {open?'−':'+'}
    </button>
    {error&&<p className="tourney-error" role="alert">{error}</p>}
    {open&&<div className="tourney-six__body">
      <p><strong>Réservé au propriétaire 999.</strong> Observe l'arrivée d'un vainqueur par plateau. Les tests utilisent des joueurs fictifs, sans mise ni récompense.</p>
      <div className="tourney-six__actions">
        <button type="button" disabled={busy} onClick={()=>demo(0)}>↺ Recommencer</button>
        <button type="button" disabled={busy|| (mode==='demo'&&demoCount===4)} onClick={()=>demo(mode==='demo'?Math.min(4,demoCount+1):1)}>🏁 Terminer un plateau fictif</button>
      </div>
      <label htmlFor="tourney-six-select">Ou consulter un tournoi réel (lecture seule)</label>
      <select id="tourney-six-select" value={selected} disabled={busy} onChange={e=>{
        const id=e.target.value;
        if(id)void getReal(id);
        else void demo(0);
      }}>
        <option value="">Démonstration fictive</option>
        {tourneys.map(t=><option key={t.id} value={String(t.id)}>{t.title}</option>)}
      </select>
      {view&&<div aria-live="polite" className="tourney-six__status">
        <h4>Salon de finale · {view.qualifiedCount}/4 qualifiés</h4>
        <p>{view.ready?'Les quatre finalistes sont connus. Le départ de la finale reste désactivé (étape 7).':
          'En attente des autres qualifications. Aucun lancement automatique de finale.'}</p>
        <div className="tourney-six__grid">
          {view.tables?.map(t=><div className="tourney-six__seat" key={t.table}>
            <strong>Plateau {t.table}</strong>
            <span className={t.status==='qualified'?'tourney-six__ok':''}>{label[t.status]||t.status}</span>
            {t.winner&&<strong>🏆 {t.winner.name}</strong>}
          </div>)}
        </div>
      </div>}
    </div>}
  </section>;
}
