import { useCallback, useEffect, useState } from 'react';
import { ownerTournaments, saveTournament, setTournamentRegistration, tournamentSkinCatalog } from '../api/tournaments';
import { ownerDuels, createDuel, editDuel, archiveDuel } from '../api/officialDuel';
import { giftOwnerTournaments, scheduleTournamentGift } from '../api/tournamentGifts';
import { walletRequest } from '../api/accounts';
import { newTournament, dateInput, dateFromInput } from '../tournaments/presentation';
import { penaltyBracketPlan } from '../tournaments/penaltyTournamentPlan';
import '../styles/unified-tournament-scheduler.css';

// L'heure d'Abidjan est UTC+0. Ne jamais interpréter datetime-local dans le fuseau du navigateur.
const toIso = value => dateFromInput(value);
const toInput = value => value ? new Date(value).toISOString().slice(0, 16) : '';
const isLater = (first, next) => Boolean(first && next && Date.parse(toIso(next)) > Date.parse(toIso(first)));
const blankDuel = () => ({ title: 'Duel Monopoly', startsAt: '', giftsAt: '', status: 'draft' });
const newPenalty = () => ({ ...newTournament(), game:'penalty', title:'Tournoi Tir-au-but',
  description:'Affrontements en duel, élimination directe jusqu’à la finale.', capacity:16, entryFee:200, penaltyShots:5 });
const statusName = {draft:'Brouillon',published:'Publié',playing:'En jeu',finished:'Terminé',paid:'Payé',cancelled:'Annulé',archived:'Archivé'};

function PenaltyCalculator({capacity,entryFee}) {
  const [registered,setRegistered] = useState(14);
  const count = Math.min(capacity,registered);
  const plan = penaltyBracketPlan(capacity,entryFee,count);
  return <div className="maf-programming__penalty-calculator">
    <label>Nombre d'inscrits au départ (prévision)
      <input type="number" min="0" max={capacity} step="1" value={count}
        onChange={e=>setRegistered(Math.min(capacity,Math.max(0,Math.floor(Number(e.target.value)||0))))}/>
    </label>
    <div className="maf-programming__penalty-stats">
      <span><small>Inscrits</small><strong>{plan.registered}/{capacity}</strong></span>
      <span><small>Joueurs retenus</small><strong>{plan.players}</strong></span>
      <span><small>Premier tour</small><strong>{plan.initialMatches} matchs</strong></span>
      <span><small>Remboursements</small><strong>{plan.refunded} · {plan.refundsAmount.toLocaleString('fr-FR')} F</strong></span>
      <span><small>Mises collectées</small><strong>{plan.gross.toLocaleString('fr-FR')} F</strong></span>
      <span><small>Cagnotte après remboursements</small><strong>{plan.pot.toLocaleString('fr-FR')} F</strong></span>
    </div>
    {plan.rounds.length>0 && <div className="maf-programming__rounds"><strong>Parcours des qualifications</strong>
      {plan.rounds.map(r=><p key={r.round}>Tour {r.round} : {r.players} joueurs · {r.matches} match(s){r.byes?` · ${r.byes} exempt`:''} · {r.qualified} qualifié(s)</p>)}
    </div>}
    <small>En cas d'effectif impair, la dernière inscription est retirée et remboursée avant le tirage. Les exemptions ultérieures évitent d'écarter un vainqueur.</small>
  </div>;
}

export default function UnifiedTournamentScheduler({onClose, onSaved}) {
  const [format, setFormat] = useState('tournament');
  const [normal, setNormal] = useState(newTournament);
  const [duel, setDuel] = useState(blankDuel);
  const [giftAt, setGiftAt] = useState('');
  const [normalId, setNormalId] = useState(null);
  const [duelId, setDuelId] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [duels, setDuels] = useState([]);
  const [giftSchedule, setGiftSchedule] = useState([]);
  const [catalog,setCatalog] = useState([]);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');

  const refresh = useCallback(async () => {
    // Les trois API sont protégées par la session propriétaire côté serveur.
    const [ts, ds, gs, sc] = await Promise.all([ownerTournaments(),ownerDuels(),giftOwnerTournaments(),tournamentSkinCatalog()]);
    setTournaments(ts.tournaments || []);
    setDuels(ds.duels || []);
    setGiftSchedule(gs.tournaments || []);
    setCatalog(sc.skins || []);
  }, []);
  useEffect(() => { void refresh().catch(e => setError(e.message)); }, [refresh]);

  const newEntry = nextFormat => {
    setFormat(nextFormat);setError('');setNotice('');
    if(nextFormat === 'duel') {setDuelId(null);setDuel(blankDuel());}
    else {setNormalId(null);setNormal(nextFormat==='penalty'?newPenalty():newTournament());setGiftAt('');}
  };
  const editTournament = t => {
    setFormat(t.game==='penalty'?'penalty':'tournament');setNormalId(t.id);setError('');
    setNormal({title:t.title,description:t.description,startsAt:dateInput(t.startsAt),finalAt:dateInput(t.finalAt),status:t.status,revision:t.revision,participantSkinId:t.participantSkinId||'',winnerSkinId:t.winnerSkinId||'',...(t.game==='penalty'?{game:'penalty',capacity:t.capacity,entryFee:t.entryFee,penaltyShots:t.penaltyShots||5}:{})});
    const gift = giftSchedule.find(g => Number(g.id) === Number(t.id));
    setGiftAt(gift?.releaseAt ? toInput(gift.releaseAt) : '');
  };
  const editOneDuel = d => {
    setFormat('duel');setDuelId(d.id);setError('');
    setDuel({title:d.title,startsAt:toInput(d.startsAt),giftsAt:toInput(d.giftsAt),status:['draft','published'].includes(d.status)?d.status:'draft',revision:d.revision});
  };
  async function run(action) {
    if(busy) return;
    setError('');setNotice('');setBusy(true);
    try { await action();await refresh();onSaved?.(); }
    catch(e) {setError(e.message || 'Action impossible.');}
    finally {setBusy(false);}
  }
  const saveNormal = event => {event.preventDefault();void run(async()=>{
    if(!isLater(normal.finalAt,giftAt))throw Error('La remise des cadeaux doit être après la finale.');
    const payload = {...normal,startsAt:toIso(normal.startsAt),finalAt:toIso(normal.finalAt)};
    if(normal.game!=='penalty') {delete payload.game;delete payload.capacity;delete payload.entryFee;delete payload.penaltyShots;}
    const releaseAt = toIso(giftAt);
    let result;
    if(!normalId && normal.status === 'published') {
      // Publication en deux phases : pas d'annonce publique avant la programmation des cadeaux.
      const created = await saveTournament(null,{...payload,status:'draft'});
      await scheduleTournamentGift(created.tournament.id,releaseAt);
      result = await saveTournament(created.tournament.id,{...payload,status:'published',revision:created.tournament.revision});
    } else if(normalId && normal.status === 'published') {
      // Programmer les cadeaux d'abord, avant de rendre un brouillon public.
      await scheduleTournamentGift(normalId,releaseAt);
      result = await saveTournament(normalId,payload);
    } else {
      result = await saveTournament(normalId,payload);
      await scheduleTournamentGift(result.tournament.id,releaseAt);
    }
    setNormalId(result.tournament.id);
    setNormal({...normal,revision:result.tournament.revision});
    setNotice('Tournoi enregistré avec l’heure des cadeaux.');
  });};
  const saveDuel = event => {event.preventDefault();void run(async()=>{
    if(!isLater(duel.startsAt,duel.giftsAt))throw Error('La remise des cadeaux doit suivre le duel.');
    const payload = {...duel,startsAt:toIso(duel.startsAt),giftsAt:toIso(duel.giftsAt)};
    const result = duelId ? await editDuel(duelId,payload) : await createDuel(payload);
    setDuelId(result.duel.id);
    setDuel({...duel,revision:result.duel.revision});
    setNotice('Duel enregistré : 2 places, 500 F chacune, 900 F / 100 F.');
  });};
  const toggleRegistration = t => {
    const open = !(t.registrationConfigured ?? t.registrationOpen);
    if(t.game==='penalty')return;
    if(open && !window.confirm('Ouvrir les inscriptions publiques ? Chaque réservation prélèvera réellement 500 F CFA. Le serveur refusera toute ouverture tant que qualifications, finale et paiements ne sont pas autorisés.'))return;
    void run(async()=>{
      await setTournamentRegistration(t.id,open,t.revision);
      setNotice(open?'Inscriptions ouvertes. Vérifie la préparation des parties réelles.':'Inscriptions fermées.');
    });
  };
  const removeNormal = t => {
    if(!window.confirm(`Retirer « ${t.title} » ? Les inscriptions existantes seront remboursées conformément aux règles du serveur.`))return;
    void run(async()=>{
      await walletRequest(`/api/tournaments/owner/${t.id}`,{method:'DELETE',body:{revision:t.revision}});
      if(Number(normalId)===Number(t.id)) {setNormalId(null);setNormal(newTournament());setGiftAt('');}
      setNotice('Tournoi retiré. L’historique financier est conservé.');
    });
  };
  const removeDuel = d => {
    const active = ['published','playing'].includes(d.status);
    const details = active
      ? `Ce duel sera arrêté. Les ${d.registered} participant(s) encore inscrits seront remboursés de 500 F CFA chacun.`
      : d.status === 'finished'
        ? 'Le paiement des récompenses déjà prévues sera conservé et effectué à la date programmée.'
        : 'Les gains déjà versés et les opérations financières seront conservés.';
    if (!window.confirm(`Supprimer « ${d.title} » de la liste des tournois ?\n\n${details}\n\nCette suppression de la liste est définitive.`)) return;
    void run(async()=>{
      const result = await archiveDuel(d.id, d.revision);
      if(Number(duelId)===Number(d.id)) {setDuelId(null);setDuel(blankDuel());}
      setNotice(result.refunded ? `Duel retiré. ${result.refunded} joueur(s) remboursé(s) (${result.refundTotal} F CFA).` : 'Duel retiré des listes. Historique financier conservé.');
    });
  };

  const exclusiveSkins=catalog.filter(s=>s.access==='exclusive');
  const giftTitle=id=>catalog.find(s=>s.id===id)?.name||'Aucun';
  return <section className="maf-programming" aria-label="Programmation des tournois, propriétaire 999">
    <header className="maf-programming__hero">
      <div><span className="maf-programming__eyebrow">PROPRIÉTAIRE 999 · ESPACE PRIVÉ</span><h3>Centre de programmation</h3>
        <p>Programme les compétitions Monopoly et Tir-au-but, les horaires et les récompenses. Heure d'Abidjan (UTC+0).</p></div>
      <button type="button" className="maf-programming__close" onClick={onClose}>✕ Fermer</button>
    </header>
    <div className="maf-programming__formats" role="group" aria-label="Format de compétition">
      <button type="button" aria-pressed={format==='tournament'} onClick={()=>newEntry('tournament')} disabled={busy}><span aria-hidden="true">🏆</span><strong>Grand tournoi</strong><small>10 à 20 joueurs · qualifications + finale</small></button>
      <button type="button" aria-pressed={format==='penalty'} onClick={()=>newEntry('penalty')} disabled={busy}><span aria-hidden="true">⚽</span><strong>Tournoi Tir-au-but</strong><small>8, 16 ou 32 places · élimination directe</small></button>
      <button type="button" aria-pressed={format==='duel'} onClick={()=>newEntry('duel')} disabled={busy}><span aria-hidden="true">🎲</span><strong>Duel Monopoly</strong><small>2 joueurs · finale directe</small></button>
    </div>
    {error && <p className="tourney-error" role="alert">{error}</p>}
    {notice && <p className="tourney-success" role="status">{notice}</p>}
    <details className="maf-programming__cleanup">
      <summary>🧹 Nettoyer les anciens duels ({duels.length})</summary>
      <p>Compte 999 uniquement. Supprime les anciens duels un par un. Un duel en cours sera interrompu avec remboursement des mises ; les récompenses déjà acquises et l'historique financier restent conservés.</p>
      {duels.length === 0 ? <p>Aucun ancien duel à supprimer.</p> : <div className="maf-programming__list">
        {duels.map(d => <div className="maf-programming__item" key={d.id}>
          <span className="maf-programming__duel-name">{d.title} · {statusName[d.status] || d.status} · {d.registered}/2</span>
          {format === 'duel' && ['draft','published'].includes(d.status) && <button type="button" disabled={busy} onClick={()=>editOneDuel(d)}>Modifier</button>}
          <button type="button" className="maf-programming__delete" onClick={()=>removeDuel(d)} disabled={busy}>Supprimer</button>
        </div>)}
      </div>}
    </details>
    {format !== 'duel' ? <>
      <div className="maf-programming__list"><strong>{format==='penalty'?'Tournois Tir-au-but programmés':'Tournois Monopoly programmés'}</strong>
        <button type="button" onClick={()=>newEntry(format)} disabled={busy}>＋ Nouveau</button>
        {tournaments.filter(t=>!t.deletedAt && (format==='penalty'?t.game==='penalty':t.game!=='penalty')).map(t=><div className="maf-programming__item" key={t.id}>
          <button type="button" onClick={()=>editTournament(t)} disabled={busy}>{t.title} · {statusName[t.status]||t.status} · {t.registered}/{t.capacity}</button>
          {t.game!=='penalty' && t.status==='published' && <button type="button" disabled={busy} onClick={()=>toggleRegistration(t)}>{(t.registrationConfigured ?? t.registrationOpen)?'Fermer inscriptions':'Ouvrir inscriptions'}</button>}
          <button type="button" onClick={()=>removeNormal(t)} disabled={busy}>Supprimer</button>
        </div>)}
      </div>
      <form onSubmit={saveNormal}><fieldset disabled={busy}>
        <label>Titre <input required maxLength={80} value={normal.title} onChange={e=>setNormal(f=>({...f,title:e.target.value}))}/></label>
        <label>Présentation <textarea maxLength={1500} rows={3} value={normal.description} onChange={e=>setNormal(f=>({...f,description:e.target.value}))}/></label>
        {format==='penalty' && <section className="maf-programming__times" aria-label="Paramètres et calculateur Tir-au-but">
          <div className="maf-programming__section-title"><span aria-hidden="true">⚽</span><div><h4>Format de la compétition</h4><p>Les duels sont formés au départ selon les inscriptions confirmées.</p></div></div>
          <div className="maf-programming__penalty-fields">
            <label>Capacité maximale <select value={normal.capacity} onChange={e=>setNormal(f=>({...f,capacity:Number(e.target.value)}))}>
              {[8,16,32].map(n=><option key={n} value={n}>{n} places</option>)}
            </select></label>
            <label>Mise par participant <select value={normal.entryFee} onChange={e=>setNormal(f=>({...f,entryFee:Number(e.target.value)}))}>
              {[200,500].map(n=><option key={n} value={n}>{n} F CFA</option>)}
            </select></label>
            <label>Tirs par joueur et par match <select value={normal.penaltyShots} onChange={e=>setNormal(f=>({...f,penaltyShots:Number(e.target.value)}))}>
              {[3,5,10].map(n=><option key={n} value={n}>{n} tirs</option>)}
            </select></label>
          </div>
          <PenaltyCalculator capacity={normal.capacity} entryFee={normal.entryFee}/>
        </section>}
        <div className="maf-programming__times">
          <div className="maf-programming__section-title"><span aria-hidden="true">🕒</span><div><h4>Calendrier de l'évènement</h4><p>Tous les horaires sont en heure d'Abidjan.</p></div></div>
          <div className="maf-programming__time-grid">
            <label>Qualifications <input required type="datetime-local" value={normal.startsAt} onChange={e=>setNormal(f=>({...f,startsAt:e.target.value}))}/></label>
            <label>Finale <input required type="datetime-local" value={normal.finalAt} onChange={e=>setNormal(f=>({...f,finalAt:e.target.value}))}/></label>
            <label>Remise des cadeaux <input required type="datetime-local" min={normal.finalAt} value={giftAt} onChange={e=>setGiftAt(e.target.value)}/></label>
          </div>
        </div>
        <section className="maf-programming__gifts" aria-label="Skins cadeaux du tournoi">
          <div className="maf-programming__section-title"><span aria-hidden="true">🎁</span><div><h4>Skins offerts en récompense</h4><p>Choisis des personnages exclusifs du Studio 3D. Les six skins actuels restent publics.</p></div></div>
          <div className="maf-programming__gift-grid">
            <label>Skin participant
              <select value={normal.participantSkinId||''} onChange={e=>setNormal(f=>({...f,participantSkinId:e.target.value}))}>
                <option value="">Aucun skin sélectionné</option>
                {exclusiveSkins.map(s=><option key={s.id} value={s.id}>{s.name} · {s.id}</option>)}
              </select>
              <small>Attribué à chaque participant retenu au tournoi.</small>
            </label>
            <label>Skin gagnant
              <select value={normal.winnerSkinId||''} onChange={e=>setNormal(f=>({...f,winnerSkinId:e.target.value}))}>
                <option value="">Aucun skin sélectionné</option>
                {exclusiveSkins.map(s=><option key={s.id} value={s.id}>{s.name} · {s.id}</option>)}
              </select>
              <small>Attribué uniquement au champion de la finale.</small>
            </label>
          </div>
          <div className="maf-programming__gift-preview"><span>Prévisualisation des prix</span>
            <strong>Participation : {giftTitle(normal.participantSkinId)}</strong>
            <strong>Champion : {giftTitle(normal.winnerSkinId)}</strong>
          </div>
          {!exclusiveSkins.length && <p className="maf-programming__hint">Aucun skin exclusif n'a encore été importé et déclaré dans le Studio 3D. Les champs sont prêts pour tes prochains personnages ; aucun cadeau de skin n'est promis tant qu'ils restent vides.</p>}
        </section>
        <label>Visibilité <select value={normal.status} onChange={e=>setNormal(f=>({...f,status:e.target.value}))}>
          <option value="draft">Brouillon</option><option value="published">Publié</option><option value="archived">Archivé</option>
        </select></label>
        {format==='penalty' ? <p>Si l’effectif est impair au départ, la dernière inscription est remboursée. Les participants retenus s’affrontent deux à deux ; un qualifié peut être exempt d'un tour ultérieur. Les inscriptions ouvrent à l’activation du parcours Tir-au-but.</p> : <p>Une annonce publiée n'ouvre pas automatiquement les réservations. Après enregistrement, tu peux les ouvrir dans la liste ci-dessus. Capacité maximale : 20 inscrits. Les formats jouables sont 10, 14, 15, 18, 19 ou 20 ; surplus remboursé. Les réservations payantes restent verrouillées tant que la validation de production n'est pas terminée.</p>}
        <button type="submit">{busy?'Enregistrement…':normalId?'Enregistrer le tournoi':'Créer le tournoi'}</button>
      </fieldset></form>
    </> : <>
      <div className="maf-programming__list"><strong>Programmer un duel</strong>
        <button type="button" onClick={()=>newEntry('duel')} disabled={busy}>＋ Nouveau</button>
        <small>Pour modifier un duel existant, utilise la liste « Nettoyer les anciens duels » ci-dessus.</small>
      </div>
      <form onSubmit={saveDuel}><fieldset disabled={busy}>
        <label>Titre <input required maxLength={80} value={duel.title} onChange={e=>setDuel(d=>({...d,title:e.target.value}))}/></label>
        <label>Début du duel — Abidjan <input required type="datetime-local" value={duel.startsAt} onChange={e=>setDuel(d=>({...d,startsAt:e.target.value}))}/></label>
        <label>Remise des cadeaux — Abidjan <input required type="datetime-local" min={duel.startsAt} value={duel.giftsAt} onChange={e=>setDuel(d=>({...d,giftsAt:e.target.value}))}/></label>
        <label>Visibilité <select value={duel.status} onChange={e=>setDuel(d=>({...d,status:e.target.value}))}>
          <option value="draft">Brouillon</option><option value="published">Publié</option>
        </select></label>
        <p>Deux réservations de 500 F CFA, 900 F au premier et 100 F au second. Une seule partie directement en finale.</p>
        <button type="submit">{busy?'Enregistrement…':duelId?'Enregistrer le duel':'Créer le duel'}</button>
      </fieldset></form>
    </>}
  </section>;
}
