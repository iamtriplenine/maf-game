import { useCallback, useEffect, useState } from 'react';
import { myTournamentGifts, openTournamentGift, giftOwnerTournaments, scheduleTournamentGift, giftOwnerPreview } from '../api/tournamentGifts';
import '../styles/tournament-rewards-center.css';

const euro = cents => `${new Intl.NumberFormat('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(cents/100)} F CFA`;
const when = iso => iso ? new Intl.DateTimeFormat('fr-FR',{timeZone:'Africa/Abidjan',dateStyle:'medium',timeStyle:'short'}).format(new Date(iso)) : 'Non programmée';
const labels = {not_scheduled:'Remise à programmer',waiting:'Coffre verrouillé',awaiting_credits:'Résultats et crédits en attente',ready:'Cadeau prêt',opened:'Déjà ouvert'};
const nowValue = iso => iso ? new Date(iso).toISOString().slice(0,16) : '';

function GiftBox({name,releaseAt,status,reward,onOpen,busy}) {
  return <article className={`maf-gift-card maf-gift-card--${status}`}>
    <div className="maf-gift-card__symbol" aria-hidden="true">🎁</div>
    <div className="maf-gift-card__content">
      <h3>{name}</h3>
      <p>{labels[status]||'En attente'}</p>
      <small>Remise : {when(releaseAt)} · heure d'Abidjan</small>
      {status==='awaiting_credits' && <small>La remise n'est pas disponible tant que les gains ne sont pas réellement crédités.</small>}
      {status==='opened' && reward && <div className="maf-gift-card__receipt">
        <strong>{reward.place ? `Place ${reward.place}` : 'Participation'}</strong>
        <span>Gain réel : {euro(reward.realCents)}</span>
        <span>Bonus : {euro(reward.bonusCents)}</span>
        <small>Skins prévus : {reward.skinsPlanned} · attribution à l'inventaire non confirmée</small>
      </div>}
    </div>
    {status==='ready'&&<button type="button" className="maf-gift-card__open" disabled={busy} onClick={onOpen}>Ouvrir 🎁</button>}
  </article>;
}

export default function TournamentRewardsCenter({session}) {
  const owner = session?.pseudo === '999';
  const [items,setItems]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [selected,setSelected]=useState(null),[ownerTournaments,setOwnerTournaments]=useState([]);
  const [tourId,setTourId]=useState(''),[release,setRelease]=useState('');
  const [demo,setDemo]=useState(null),[demoCount,setDemoCount]=useState(10),[showGift,setShowGift]=useState(false);
  const [notice,setNotice]=useState('');
  const refresh=useCallback(async()=>{
    if(!session?.id){setItems([]);return;}
    const result=await myTournamentGifts();setItems(result.gifts||[]);
  },[session?.id]);
  useEffect(()=>{
    setError('');setSelected(null);setDemo(null);setShowGift(false);
    if(!session?.id){setItems([]);setOwnerTournaments([]);return;}
    let live=true;
    void myTournamentGifts().then(d=>{if(live)setItems(d.gifts||[]);}).catch(e=>{if(live)setError(e.message);});
    if(owner)void giftOwnerTournaments().then(d=>{if(live)setOwnerTournaments(d.tournaments||[]);}).catch(e=>{if(live)setError(e.message);});
    const timer=setInterval(()=>{if(!document.hidden)void myTournamentGifts().then(d=>{if(live)setItems(d.gifts||[]);}).catch(()=>{});},30000);
    return()=>{live=false;clearInterval(timer);};
  },[session?.id,owner]);
  const openGift=async g=>{
    if(busy)return;
    setBusy(true);setError('');
    try {const data=await openTournamentGift(g.tournamentId);setSelected(data);setShowGift(false);await refresh();}
    catch(e){setError(e.message);}finally{setBusy(false);}
  };
  const changeTournament=value=>{
    setTourId(value);
    const picked=ownerTournaments.find(t=>String(t.id)===value);
    setRelease(nowValue(picked?.releaseAt));setNotice('');
  };
  const saveSchedule=async e=>{
    e.preventDefault();if(!tourId||!release||busy)return;
    setBusy(true);setError('');setNotice('');
    try{
      // Africa/Abidjan = UTC+0 ; ne pas utiliser le fuseau du telephone.
      const iso=`${release}:00.000Z`;
      await scheduleTournamentGift(tourId,iso);
      const out=await giftOwnerTournaments();setOwnerTournaments(out.tournaments||[]);
      setNotice('Heure de remise enregistrée. Le cadeau reste verrouillé tant que les crédits ne sont pas validés.');
      await refresh();
    }catch(ex){setError(ex.message);}finally{setBusy(false);}
  };
  const loadDemo=async()=>{
    setBusy(true);setError('');setSelected(null);setShowGift(false);
    try {const d=await giftOwnerPreview(demoCount);if(d.type!=='owner_demo')throw new Error('Simulation invalide.');setDemo(d);}
    catch(e){setError(e.message);}finally{setBusy(false);}
  };
  const winning=selected?.reward;
  return <div className="maf-gifts" aria-label="Récompenses et cadeaux du tournoi">
    <header className="maf-gifts__top"><div className="maf-gifts__emblem">🎁</div>
      <div><h2>Mes récompenses</h2><p>Retrouve ici tes cadeaux et leurs heures de remise.</p></div></header>
    {!session?.id?<p className="maf-gifts__empty">Connecte-toi pour voir les récompenses de tes tournois.</p>:<>
      <div className="maf-gifts__toolbar"><h3>Mes coffres</h3><button type="button" disabled={busy} onClick={()=>void refresh().catch(e=>setError(e.message))}>↻ Actualiser</button></div>
      {error&&<p className="maf-gifts__error" role="alert">{error}</p>}
      {!items.length&&<div className="maf-gifts__empty"><span aria-hidden="true">🎀</span><p>Aucun cadeau pour le moment. Tes tournois apparaîtront ici après réservation.</p></div>}
      <div className="maf-gifts__list">{items.map(g=><GiftBox key={g.tournamentId} name={g.title} {...g} busy={busy} onOpen={()=>void openGift(g)}/>)}</div>
      {selected&&<div className="maf-gifts__reveal" role="status">
        <div className="maf-gifts__reveal-emoji" aria-hidden="true">🎉🎁✨</div>
        <h3>Cadeau ouvert !</h3>
        <p>Cette ouverture est enregistrée et ne crée pas de deuxième versement.</p>
        {winning&&<p><strong>{euro(winning.realCents)}</strong> de gain déjà crédité · <strong>{euro(winning.bonusCents)}</strong> de bonus</p>}
        <button type="button" onClick={()=>setSelected(null)}>Fermer</button>
      </div>}
    </>}
    {owner&&<section className="maf-gifts__owner" aria-label="Administration des cadeaux">
      <h3>🔒 Propriétaire 999 · Programmation et test</h3>
      <p>La vérification du propriétaire est également réalisée côté serveur.</p>
      <form onSubmit={saveSchedule}>
        <label>Tournoi <select value={tourId} onChange={e=>changeTournament(e.target.value)} required>
          <option value="">Choisir un tournoi</option>
          {ownerTournaments.map(t=><option key={t.id} value={String(t.id)}>{t.title}</option>)}
        </select></label>
        <label>Heure de remise (Abidjan, UTC+0) <input type="datetime-local" value={release} required onChange={e=>setRelease(e.target.value)}/></label>
        <button type="submit" disabled={!tourId||busy}>Enregistrer l'heure des cadeaux</button>
      </form>
      {notice&&<p className="maf-gifts__notice" role="status">{notice}</p>}
      <div className="maf-gifts__demo"><h4>Simulation de réception des récompenses</h4>
        <label>Participants fictifs <select value={demoCount} onChange={e=>{setDemoCount(Number(e.target.value));setDemo(null);}}>
          {[10,14,15,18,19,20].map(n=><option key={n} value={n}>{n} joueurs</option>)}
        </select></label>
        <button type="button" disabled={busy} onClick={()=>void loadDemo()}>Préparer mon cadeau fictif</button>
        {demo&&<div className="maf-gifts__demo-box">
          <p>{demo.players} joueurs · {demo.finalists} finalistes · compte 999 champion fictif</p>
          <button type="button" className="maf-gifts__surprise" onClick={()=>setShowGift(true)}>🎁 {showGift?'Cadeau ouvert':'Ouvrir le cadeau surprise'}</button>
          {showGift&&<div key={`${demo.players}-${showGift}`} className="maf-gifts__prize" role="status">
            <span aria-hidden="true">🏆 ✨ 🎊</span><h4>Champion du tournoi !</h4>
            <p>Gain simulé : <strong>{euro(demo.champion.realCents)}</strong></p>
            <p>Bonus simulé : <strong>{euro(demo.champion.bonusCents)}</strong></p>
            <p>Skins prévus : participation + finaliste</p>
            <small>Aucun argent ni skin réel n'a été attribué.</small>
          </div>}
        </div>}
      </div>
    </section>}
  </div>;
}
