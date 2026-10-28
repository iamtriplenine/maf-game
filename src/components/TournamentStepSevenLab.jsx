import { useEffect, useState } from 'react';
import { ownerTournaments } from '../api/tournaments';
import { ownerFinalePreview, ownerFinaleStatus } from '../api/tournamentFinale';
import '../styles/tournament-step-seven.css';

const showTime = value => value ? new Date(value).toLocaleString('fr-FR',{
  timeZone:'Africa/Abidjan',weekday:'short',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'
})+' (Abidjan)' : '—';
const STEP=5*60*1000;
function demoDate() {
  const d=new Date();d.setUTCHours(20,5,0,0);
  return d.toISOString();
}
export default function TournamentStepSevenLab(){
  const [opened,setOpened]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [items,setItems]=useState([]),[selected,setSelected]=useState('');
  const [finalAt,setFinalAt]=useState(demoDate),[count,setCount]=useState(0);
  const [offset,setOffset]=useState(0),[view,setView]=useState(null),[isReal,setIsReal]=useState(false);
  const inspect=async()=>{
    if(opened){setOpened(false);setError('');setSelected('');setView(null);return;}
    setBusy(true);setError('');
    try{
      const data=await ownerTournaments();
      if(!Array.isArray(data?.tournaments))throw Error('Vérification propriétaire impossible.');
      setItems(data.tournaments);setOpened(true);
      const date=demoDate();setFinalAt(date);setCount(0);setOffset(0);setIsReal(false);
      setView(await ownerFinalePreview({finalAt:date,now:new Date(date).getTime()-60000,qualifiedCount:0,qualificationsComplete:false}));
    }catch(e){setError(e.message||'Test indisponible.');}
    finally{setBusy(false);}
  };
  async function simulate(c=count,off=offset,date=finalAt){
    setBusy(true);setError('');
    try{
      const data=await ownerFinalePreview({finalAt:date,now:new Date(date).getTime()+off*STEP,
        qualifiedCount:c,qualificationsComplete:c===4});
      setCount(c);setOffset(off);setFinalAt(date);setIsReal(false);setView(data);
    }catch(e){setError(e.message||'Simulation impossible.');}
    finally{setBusy(false);}
  }
  async function selectTournament(id){
    if(!id){setSelected('');void simulate(0,-1,demoDate());return;}
    setBusy(true);setError('');setSelected(id);
    try{
      const tournament=items.find(t=>String(t.id)===id);
      if(!tournament)throw Error('Tournoi absent de la liste.');
      setFinalAt(tournament.finalAt);setView(await ownerFinaleStatus(id));setIsReal(true);
    }catch(e){setError(e.message||'Consultation impossible.');}
    finally{setBusy(false);}
  }
  useEffect(()=>{
    if(!opened||!isReal||!selected)return;
    const timer=setInterval(()=>{
      if(!document.hidden)void ownerFinaleStatus(selected).then(setView).catch(e=>setError(e.message));
    },15000);
    return()=>clearInterval(timer);
  },[opened,isReal,selected]);
  const headline=view?.status==='started'?'Finale lancée':view?.status==='ready'?'Prête au départ':
    view?.status==='scheduled'?'En attente de l’heure':'En attente ou reportée';
  return <section className="tourney-seven" aria-label="Etape sept, programmation finale">
    <button type="button" className="tourney-seven__toggle" onClick={()=>void inspect()} disabled={busy} aria-expanded={opened}>
      🕒 Étape 7 · Départ et report de la finale {opened?'−':'+'}
    </button>
    {error&&<p className="tourney-error" role="alert">{error}</p>}
    {opened&&<div className="tourney-seven__body">
      <p><strong>Réservé au compte 999.</strong> Tu règles déjà l'heure de finale dans « Programmer un tournoi ». Ici, vérifie le fonctionnement sans lancer de vraie partie ni déplacer de fonds.</p>
      <label>Consulter un tournoi enregistré (lecture seule)
        <select disabled={busy} value={selected} onChange={e=>void selectTournament(e.target.value)}>
          <option value="">Démonstration fictive</option>
          {items.map(t=><option key={t.id} value={String(t.id)}>{t.title}</option>)}
        </select>
      </label>
      {!isReal&&<>
        <p>Simulation des quatre qualifications :</p>
        <div className="tourney-seven__buttons">
          {[0,1,2,3,4].map(n=><button key={n} type="button" disabled={busy} aria-pressed={count===n} onClick={()=>void simulate(n,offset)}>{n}/4 qualifiés</button>)}
        </div>
        <p>Heure simulée par rapport au départ programmé :</p>
        <div className="tourney-seven__buttons">
          {[-1,0,1,2,3].map(n=><button key={n} type="button" disabled={busy} aria-pressed={offset===n} onClick={()=>void simulate(count,n)}>{n<0?'Avant':n===0?'À l’heure':`+${n*5} min`}</button>)}
        </div>
      </>}
      {view&&<div className="tourney-seven__results" aria-live="polite">
        <h4>{headline}</h4>
        {isReal&&view.reference&&<p>Référence finale : <code>{view.reference}</code></p>}
        <p>Finale programmée : <strong>{showTime(view.plannedAt)}</strong></p>
        <p>{view.status==='started'?'Départ enregistré.':`Prochain créneau : ${showTime(view.nextAt)}`}</p>
        {isReal&&<p>Finalistes enregistrés : {view.qualifiedCount}/4. Qualifications terminées : {view.qualificationsComplete?'Oui':'Non'}.</p>}
        {!isReal&&<p>{count}/4 finalistes fictifs. Aucun joueur ni solde réel n'est modifié.</p>}
        <p className="tourney-seven__note">Le départ d'une vraie finale exige quatre gagnants, les qualifications terminées et la présence des quatre finalistes. Il reste désactivé tant que les parties réelles ne sont pas ouvertes.</p>
      </div>}
    </div>}
  </section>;
}
