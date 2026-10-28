import { useEffect, useRef, useState } from 'react';
// MAF_UNIFIED_SCHEDULER_V1 : un seul accès administrateur.
import UnifiedTournamentScheduler from './UnifiedTournamentScheduler';
import OfficialDuelSection from './OfficialDuelSection';
import TournamentQualificationMatch from './TournamentQualificationMatch';
import TournamentFinalMatch from './TournamentFinalMatch';
import TournamentReference from './TournamentReference';
import { publicTournaments, ownerTournaments, saveTournament, reserveTournament, myTournamentReservations, setTournamentRegistration } from '../api/tournaments';
import { refreshSession } from '../api/accounts';
import { abidjanDate, countdown, dateFromInput, dateInput, francs, newTournament } from '../tournaments/presentation';
import '../styles/tournaments.css';
import TournamentDeletionPanel from './TournamentDeletionPanel';
import TournamentPolicy from './TournamentPolicy';
import '../styles/tournaments-reservation.css';
import '../styles/tournament-participants.css'; // MAF_TOURNOI_ETAPE2_V1

// MAF_TOURNOI_ETAPE2_V1 : action de reservation (confirmation explicite avant tout debit)
function ReserveAction({ tournament: t, reached, session, reserved, onDone }) {
  const [confirming,setConfirming] = useState(false), [busy,setBusy] = useState(false), [error,setError] = useState(''), [paid,setPaid] = useState(null);
  const alive = useRef(true);
  useEffect(() => { alive.current=true; return () => {alive.current=false;}; }, []);
  // Une place deja payee reste visible meme si les reservations ferment ensuite.
  if (reserved) return <div className="tourney-reserved" role="status"><strong>✓ Place réservée</strong>
    <span>{paid?`${francs(paid.fee)} F débités · nouveau solde ${francs(paid.balanceAfter)} F`:'Ta place est confirmée pour ce tournoi.'}</span></div>;
  if (t.publicBookingsEnabled === false) return <button type="button" className="tourney-cta" disabled>Réservations suspendues pendant les vérifications</button>;
  if (!t.registrationOpen) return <button type="button" className="tourney-cta" disabled>Inscriptions bientôt ouvertes</button>;
  if (!session) return <button type="button" className="tourney-cta" disabled>Connecte-toi pour réserver</button>;
  if (t.full) return <button type="button" className="tourney-cta" disabled>Complet · {t.capacity}/{t.capacity}</button>;
  if (reached) return <button type="button" className="tourney-cta" disabled>Inscriptions closes</button>;
  const confirm = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const data = await reserveTournament(t.id);
      if (!alive.current) return;
      setPaid(data.reservation.alreadyReserved?null:{fee:data.reservation.fee,balanceAfter:data.reservation.balanceAfter});
      setConfirming(false);
      void refreshSession();
      onDone(t.id, true);
    } catch (e) {
      if (alive.current) setError(e.message || 'La réservation a échoué. Vérifie ton solde puis réessaie.');
      onDone(t.id, false);
    } finally { if (alive.current) setBusy(false); }
  };
  return <div className="tourney-reserve">
    {!confirming
      ? <button type="button" className="tourney-cta" onClick={()=>{setError('');setConfirming(true);}}>Réserver ma place · {francs(t.entryFee)} F</button>
      : <div className="tourney-confirm" role="alertdialog" aria-label="Confirmer la réservation">
          <p><strong>Confirmer la réservation ?</strong><br/>{francs(t.entryFee)} F seront débités de ton solde réel{Number.isFinite(session.balance)?` (solde actuel : ${francs(session.balance)} F)`:''}. Une seule place par compte.</p>
          <div className="tourney-confirm__row">
            <button type="button" className="tourney-cta" onClick={confirm} disabled={busy}>{busy?'Réservation…':`Payer ${francs(t.entryFee)} F`}</button>
            <button type="button" className="tourney-cancel" onClick={()=>setConfirming(false)} disabled={busy}>Annuler</button>
          </div>
        </div>}
    {error&&<p className="tourney-error" role="alert">{error}</p>}
  </div>;
}

export function TournamentCard({ tournament: t, now, session = null, reserved = false, onDone = () => {} }) {
  const remaining = countdown(t.startsAt, now), reached = Date.parse(t.startsAt) <= now;
  const [requestedFormat, setRequestedFormat] = useState(null);
  const formats = Array.isArray(t.rewardScenarios) ? t.rewardScenarios : [];
  const predicted = formats.filter(s=>s.players<=t.registered).at(-1)?.players ?? 20;
  const format = formats.find(s=>s.players === (requestedFormat ?? predicted));
  const awardRange = format && (format.eliminatedMinFranc===format.eliminatedMaxFranc
    ? francs(format.eliminatedMinFranc)
    : `${francs(format.eliminatedMinFranc)} à ${francs(format.eliminatedMaxFranc)}`);
  const names = ['Jours', 'Heures', 'Minutes', 'Secondes'];
  return <article className="tourney-card">
    <div className="tourney-card__hero">
      <div className="tourney-card__top"><span className="tourney-tag">ÉVÉNEMENT MONOPOLY</span><span className="tourney-tag tourney-tag--gold">20 PLACES MAX</span></div>
      <div className="tourney-card__art" aria-hidden="true"><span>🎩</span><i>✦</i><b>◆</b></div>
      <p className="tourney-card__eyebrow">LE RENDEZ-VOUS DES STRATÈGES</p>
      <h3>{t.title}</h3>
      <p className="tourney-card__date">{abidjanDate(t.startsAt)} · Abidjan</p>
      <div className="tourney-card__reference"><TournamentReference value={t.reference} label="Référence tournoi"/></div>
      <div className="tourney-countdown" role="timer" aria-label={reached ? 'Heure prévue atteinte' : 'Temps avant les qualifications'}>
        {remaining.map((n,i) => <div key={names[i]}><strong>{String(n).padStart(2,'0')}</strong><span>{names[i]}</span></div>)}
      </div>
      {reached && <p className="tourney-card__waiting" role="status">Heure prévue atteinte · en attente du lancement</p>}
      <div className="tourney-card__places"><span><strong>{t.registered}</strong> / {t.capacity} inscrits</span><span>Entrée <strong>{francs(t.entryFee)} CFA</strong></span></div>
      <progress max={t.capacity} value={t.registered} aria-label="Places réservées" />
      <ReserveAction tournament={t} reached={reached} session={session} reserved={reserved} onDone={onDone}/>
      <p className="tourney-card__note">{t.publicBookingsEnabled===false?'Réservations payantes suspendues pendant les vérifications du tournoi.':`Jusqu’à ${t.capacity} places · tournoi possible dès 10 joueurs (formats admissibles). Une seule place par compte.`}</p>
    </div>
    <div className="tourney-card__details">
      <details className="tourney-card__participants"><summary><span>◉</span> Participants inscrits · {t.participants?.length ?? t.registered}/{t.capacity} <b aria-hidden="true">＋</b></summary>
        <div className="tourney-participants-grid">{(t.participants||[]).map((pseudo,i)=><div className="tourney-participant" key={`${pseudo}-${i}`} title={pseudo}>
          <span className="tourney-participant__avatar" aria-hidden="true">◌</span><strong>{pseudo.length>8?`${pseudo.slice(0,7)}…`:pseudo}</strong>
        </div>)}</div>
        {!(t.participants||[]).length&&<p className="tourney-participants-empty">Aucun participant pour le moment.</p>}
      </details>
      {t.description && <p className="tourney-description">{t.description === '20 joueurs. Quatre plateaux. Une finale pour devenir champion.' ? 'De 10 à 20 inscriptions · de 2 à 4 plateaux de qualification · une grande finale.' : t.description}</p>}
      <details><summary><span>01</span> Déroulement & horaires <b aria-hidden="true">＋</b></summary><div className="tourney-detail-body">
        <p><strong>Qualifications :</strong> de deux à quatre plateaux de quatre ou cinq joueurs, selon les inscriptions. Chaque vainqueur rejoint la finale.</p>
        <p><strong>Finale prévue :</strong> {abidjanDate(t.finalAt)} (Abidjan), avec les deux à quatre qualifiés.</p>
        <p>Si une qualification se prolonge, le départ de la finale sera décalé par tranches de cinq minutes. Les joueurs ont cinq minutes pour rejoindre leur plateau et deux minutes pour revenir après une déconnexion.</p>
        {t.registrationOpen?<p>Les réservations sont ouvertes jusqu’au début des qualifications, dans la limite des places disponibles.</p>:<p>Les horaires annoncent le programme du tournoi. Les inscriptions sont encore fermées ou suspendues pour vérification.</p>}
      </div></details>
      <details><summary><span>02</span> Les récompenses <b aria-hidden="true">＋</b></summary><div className="tourney-detail-body">
        <p>Les gains sont calculés en francs entiers à partir des joueurs effectivement retenus au tirage. La mise est incluse ; les montants ne seront crédités qu’après la finale certifiée.</p>
        {format ? <>
          <label className="tourney-reward-choice">Effectif à simuler
            <select value={format.players} onChange={e=>setRequestedFormat(Number(e.target.value))} aria-label="Simuler les récompenses selon le nombre de joueurs">
              {formats.map(s=><option value={s.players} key={s.players}>{s.players} joueurs · {s.groupSizes.length} plateaux</option>)}
            </select>
          </label>
          <p className="tourney-reward-hint">{format.groupSizes.join(' + ')} joueurs par plateau · {format.finalists.length} finalistes. Simulation, pas un paiement effectué.</p>
          <div className="tourney-table-wrap"><table><caption>Prévision pour {format.players} joueurs retenus</caption><thead><tr><th>Classement</th><th>Réel</th><th>Bonus</th><th>Skins prévus</th></tr></thead><tbody>
            {format.finalists.map(p=><tr key={p.place}><th>{p.place===1?'1er':`${p.place}e`}</th><td>{francs(p.realFranc)} F</td><td>{francs(p.bonusFranc)} F</td><td>2</td></tr>)}
            <tr><th>{format.eliminatedCount} éliminés (chacun)</th><td>{awardRange} F</td><td>{francs(format.eliminatedBonusFranc)} F</td><td>1</td></tr>
          </tbody></table></div>
          <p className="tourney-reward-hint">La part de l'organisateur est de {francs(format.organizerFranc)} F ; les écarts de 1 F entre éliminés sont liés aux arrondis des francs entiers.</p>
        </> : <p className="tourney-reward-hint">Prévisions indisponibles : actualise l'application après la mise à jour du serveur.</p>}
      </div></details>
      <details><summary><span>03</span> Les skins prévus <b aria-hidden="true">＋</b></summary><div className="tourney-detail-body tourney-skins">
        <div className="tourney-skin"><span aria-hidden="true">◇</span><small>POUR CHAQUE JOUEUR RETENU</small><h4>Skin de participation</h4><p>Droit prévu après validation des résultats ; visuel et inventaire à finaliser.</p></div>
        <div className="tourney-skin tourney-skin--winner"><span aria-hidden="true">♛</span><small>POUR LES {format?.finalists.length ?? '2 À 4'} FINALISTES</small><h4>Skin des finalistes</h4><p>En plus du skin de participation. Attribution visuelle à finaliser.</p></div>
      </div></details>
      <details><summary><span>04</span> Réservation & règles <b aria-hidden="true">＋</b></summary><div className="tourney-detail-body">
        <p>Inscription individuelle : 500 F par joueur, 20 places au maximum. Si moins de 10 joueurs sont inscrits, le tournoi est annulé et les mises remboursées. Avec 11 à 13 inscrits, les 10 premiers jouent ; avec 16 à 17 inscrits, les 15 premiers jouent. Les derniers inscrits en surplus sont remboursés. Les groupes sont ensuite tirés au sort.</p>
        {t.registrationOpen?<p>Réservation : 500 F sont débités de ton solde réel à la confirmation, pour une place unique par compte.</p>:<p>Les conditions de paiement et de remboursement figurent ci-dessous ; les réservations ne sont pas actuellement ouvertes.</p>}
        <TournamentPolicy/>
      </div></details>
    </div>
  </article>;
}

export function TournamentManager({ onSaved, onClose }) {
  const [items,setItems] = useState([]), [form,setForm] = useState(newTournament), [id,setId] = useState(null);
  const [busy,setBusy] = useState(false), [error,setError] = useState(''), [notice,setNotice] = useState('');
  const alive = useRef(true);
  useEffect(() => { alive.current=true; return () => {alive.current=false;}; }, []);
  const load = async () => { const data=await ownerTournaments(); if(alive.current)setItems(data.tournaments); };
  useEffect(() => { void load().catch(e=>{if(alive.current)setError(e.message);}); }, []);
  const edit = t => { setError('');setNotice('');setId(t.id);setForm({title:t.title,description:t.description,startsAt:dateInput(t.startsAt),finalAt:dateInput(t.finalAt),status:t.status,revision:t.revision}); };
  const change = e => setForm(f=>({...f,[e.target.name]:e.target.value}));
  const submit = async e => {
    e.preventDefault();if(busy)return;setBusy(true);setError('');setNotice('');
    try {
      const data=await saveTournament(id,{...form,startsAt:dateFromInput(form.startsAt),finalAt:dateFromInput(form.finalAt)});
      if(!alive.current)return;
      edit(data.tournament);
      setNotice(data.tournament.status==='published'?'Annonce publiée dans Tournoi.':'Tournoi enregistré.');
      onSaved();
      await load();
    } catch(e) { if(alive.current)setError(e.message); }
    finally { if(alive.current)setBusy(false); }
  };
  const toggleRegistration = async t => {
    if (busy) return;
    if (!(t.registrationConfigured ?? t.registrationOpen) && !window.confirm('Ouvrir les réservations ? Chaque joueur qui réserve est débité de 500 F sur son solde réel.')) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const data = await setTournamentRegistration(t.id, !(t.registrationConfigured ?? t.registrationOpen), t.revision);
      if (!alive.current) return;
      setForm(f => (id === t.id ? { ...f, revision: data.tournament.revision } : f));
      setNotice(data.tournament.registrationOpen ? 'Réservations ouvertes.' : 'Réservations fermées.');
      onSaved(); await load();
    } catch (e) { if (alive.current) setError(e.message); }
    finally { if (alive.current) setBusy(false); }
  };
  const current = items.find(t => t.id === id);
  return <section className="tourney-manager" aria-label="Gestion des tournois">
    <div className="tourney-manager__head"><h3>Programmer un tournoi</h3><button type="button" onClick={onClose} disabled={busy}>Fermer</button></div>
    <p>Heures d’Abidjan. Monopoly : 20 places maximum ; 10, 14, 15, 18, 19 ou 20 joueurs retenus ; entrée 500 F.</p>
    <div className="tourney-manager__list"><button type="button" disabled={busy} onClick={()=>{setId(null);setForm(newTournament());setError('');setNotice('');}}>＋ Nouveau tournoi</button>
      {items.map(t=><button key={t.id} type="button" disabled={busy} onClick={()=>edit(t)} aria-pressed={id===t.id}>{t.title} · {{draft:'Brouillon',published:'Publié',archived:'Archivé'}[t.status]}</button>)}
    </div>
    {current&&current.status==='published'&&<div className="tourney-registration">
      <p>Réservations : <strong>{current.registrationConfigured?'CONFIGURÉES':'fermées'}</strong> · {current.registered}/{current.capacity} places prises.</p>
      <button type="button" disabled={busy} onClick={()=>toggleRegistration(current)}>{current.registrationConfigured?'Fermer les réservations':'Ouvrir les réservations (500 F débités)'}</button>
    </div>}
    <form onSubmit={submit}><fieldset disabled={busy}>
      <label>Titre<input name="title" maxLength={80} required value={form.title} onChange={change}/></label>
      <label>Présentation<textarea name="description" maxLength={1500} rows={3} value={form.description} onChange={change}/></label>
      <label>Qualifications — heure d’Abidjan<input name="startsAt" type="datetime-local" required value={form.startsAt} onChange={change}/></label>
      <label>Finale — heure d’Abidjan<input name="finalAt" type="datetime-local" required value={form.finalAt} onChange={change}/></label>
      <label>Visibilité<select name="status" value={form.status} onChange={change}><option value="draft">Brouillon — visible uniquement ici</option><option value="published">Publié — visible par tous</option><option value="archived">Archivé — masqué au public</option></select></label>
      <p>Enregistrer ne prélève aucune mise. Les réservations s’ouvrent avec le bouton ci-dessus, une fois l’annonce publiée.</p>
      <button type="submit" className="tourney-cta">{busy?'Enregistrement…':id?'Enregistrer les modifications':'Créer le tournoi'}</button>
    </fieldset></form>
    {error&&<p className="tourney-error" role="alert">{error}</p>}
    {notice&&<p className="tourney-success" role="status">{notice}</p>}
  </section>;
}

export default function TournamentHub({ session }) {
  const owner = session?.pseudo === '999';
  const [manager,setManager] = useState(false), [pressing,setPressing] = useState(false);
  const [items,setItems] = useState([]), [loading,setLoading] = useState(true), [error,setError] = useState('');
  const [now,setNow] = useState(Date.now), [generation,setGeneration] = useState(0);
  const [deleteGeneration,setDeleteGeneration] = useState(0);
  const [mine,setMine] = useState([]);
  const hold = useRef(null), origin = useRef(null), serverClock = useRef(null);
  const cancel = () => {clearTimeout(hold.current);hold.current=null;setPressing(false);};
  useEffect(()=>()=>clearTimeout(hold.current),[]);
  useEffect(()=>{if(!owner){setManager(false);cancel();}},[owner]);
  useEffect(()=>{
    let live=true,pending=false,controller;
    async function load() {
      if(pending||document.hidden)return;pending=true;controller=new AbortController();
      const requestStart=performance.now();
      const timeout=setTimeout(()=>controller.abort(),15000);
      try {
        const data=await publicTournaments(controller.signal);
        if(live){
          if(!Array.isArray(data.tournaments)||!Number.isFinite(data.serverNow))throw new Error('Réponse du serveur invalide.');
          const received=performance.now();
          serverClock.current={server:data.serverNow+(received-requestStart)/2,local:received};
          setNow(serverClock.current.server);setItems(data.tournaments);setError('');
          if(session){try{const m=await myTournamentReservations();if(live)setMine(Array.isArray(m.reserved)?m.reserved:[]);}catch{/* l'annonce publique reste affichee */}}
        }
      } catch(e){if(live)setError(e.name==='AbortError'?'Le serveur met du temps à répondre. Réessaie.':e.message);}
      finally{clearTimeout(timeout);pending=false;if(live)setLoading(false);}
    }
    void load();const poll=setInterval(()=>void load(),15000);
    const visible=()=>{if(!document.hidden)void load();};document.addEventListener('visibilitychange',visible);
    return()=>{live=false;clearInterval(poll);controller?.abort();document.removeEventListener('visibilitychange',visible);};
  },[generation]);
  useEffect(()=>{const tick=setInterval(()=>{if(!document.hidden){const c=serverClock.current;setNow(c?c.server+performance.now()-c.local:Date.now());}},1000);return()=>clearInterval(tick);},[]);
  const start = e => {if(!owner||(e.pointerType==='mouse'&&e.button!==0))return;cancel();origin.current={x:e.clientX,y:e.clientY};setPressing(true);hold.current=setTimeout(()=>{cancel();setManager(true);},1500);};
  return <div className="tourney-hub">
    <div className="game-hub__line"><h2><button type="button" className={`tourney-heading${pressing?' is-holding':''}`} onPointerDown={start} onPointerUp={cancel} onPointerLeave={cancel} onPointerCancel={cancel}
      onPointerMove={e=>{if(origin.current&&Math.hypot(e.clientX-origin.current.x,e.clientY-origin.current.y)>12)cancel();}}
      onContextMenu={e=>{if(owner)e.preventDefault();}}
      onKeyDown={e=>{if(owner&&!e.repeat&&(e.key==='Enter'||e.key===' ')){e.preventDefault();start({clientX:0,clientY:0});}}}
      onKeyUp={cancel} onBlur={cancel} aria-label={owner?'Tournoi. Maintenir pour gérer les tournois.':'Tournoi'}>Tournoi</button></h2>
      <span className="tourney-section-note">LES GRANDS RENDEZ-VOUS</span></div>
    {manager&&owner&&<UnifiedTournamentScheduler key={deleteGeneration} onClose={()=>setManager(false)} onSaved={()=>setGeneration(n=>n+1)}/>}

{manager&&owner&&<TournamentDeletionPanel refreshKey={generation} onDeleted={()=>{setDeleteGeneration(n=>n+1);setGeneration(n=>n+1);}}/>}
    {loading&&<p role="status" className="tourney-empty">Chargement des tournois…</p>}
    {error&&<div className="tourney-error" role="alert">{error}<button type="button" onClick={()=>setGeneration(n=>n+1)}>Réessayer</button></div>}
    {!loading&&!error&&!items.length&&<div className="tourney-empty"><span aria-hidden="true">🏆</span><h3>Le prochain rendez-vous se prépare</h3><p>Les tournois programmés apparaîtront ici.</p></div>}
    <TournamentQualificationMatch session={session}/>
    <TournamentFinalMatch session={session}/>
    <OfficialDuelSection session={session} hideAdmin/>
    <div className="tourney-grid">{items.map(t=><TournamentCard key={t.id} tournament={t} now={now} session={session} reserved={mine.includes(t.id)} onDone={(id,ok)=>{if(ok)setMine(m=>m.includes(id)?m:[...m,id]);setGeneration(n=>n+1);}}/>)}</div>
  </div>;
}
