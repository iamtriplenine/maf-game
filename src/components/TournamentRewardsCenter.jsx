import { useCallback, useEffect, useState } from 'react';
import OfficialDuelGifts from './OfficialDuelGifts';
import ManualGiftsPanel from './ManualGiftsPanel';
import GiftCompactRow from './GiftCompactRow';
import GiftRevealOverlay from './GiftRevealOverlay';
import { myTournamentGifts, openTournamentGift, giftOwnerTournaments, scheduleTournamentGift } from '../api/tournamentGifts';
import '../styles/tournament-rewards-center.css';

const euro = cents => `${new Intl.NumberFormat('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(cents/100)} F CFA`;
const when = iso => iso ? new Intl.DateTimeFormat('fr-FR',{timeZone:'Africa/Abidjan',dateStyle:'medium',timeStyle:'short'}).format(new Date(iso)) : 'Non programmée';
const labels = {not_scheduled:'Remise à programmer',waiting:'Coffre verrouillé',awaiting_credits:'Résultats et crédits en attente',ready:'Cadeau prêt',opened:'Déjà ouvert'};
const nowValue = iso => iso ? new Date(iso).toISOString().slice(0,16) : '';

function GiftBox({name,releaseAt,status,reward,onOpen,busy}) {
 return <GiftCompactRow title={name} subtitle={`Remise : ${when(releaseAt)}`}
   status={status==='opened'?'opened':status==='ready'?'ready':'locked'} disabled={busy} onOpen={onOpen}
   detail={<><p>{labels[status]||'En attente'}</p>
    {status==='awaiting_credits'&&<small>Les crédits doivent être certifiés avant l'ouverture.</small>}
    {status==='opened'&&reward&&<p>Place {reward.place||'Participation'} · Gains : {euro(reward.realCents)} · Bonus : {euro(reward.bonusCents)}</p>}
   </>}/>;
}

export default function TournamentRewardsCenter({session}) {
  const owner = session?.pseudo === '999';
  const [items,setItems]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [revealGift,setRevealGift]=useState(null),[ownerTournaments,setOwnerTournaments]=useState([]);
  const [tourId,setTourId]=useState(''),[release,setRelease]=useState('');
  const [notice,setNotice]=useState('');
  const [legacyHiddenBefore,setLegacyHiddenBefore]=useState(0);
  const refresh=useCallback(async()=>{
    if(!session?.id){setItems([]);return;}
    const result=await myTournamentGifts();setItems(result.gifts||[]);
  },[session?.id]);
  useEffect(()=>{
    setError('');setRevealGift(null);
    if(!session?.id){setItems([]);setOwnerTournaments([]);return;}
    let live=true;
    void myTournamentGifts().then(d=>{if(live)setItems(d.gifts||[]);}).catch(e=>{if(live)setError(e.message);});
    if(owner)void giftOwnerTournaments().then(d=>{if(live)setOwnerTournaments(d.tournaments||[]);}).catch(e=>{if(live)setError(e.message);});
    const timer=setInterval(()=>{if(!document.hidden)void myTournamentGifts().then(d=>{if(live)setItems(d.gifts||[]);}).catch(()=>{});},30000);
    return()=>{live=false;clearInterval(timer);};
  },[session?.id,owner]);
  const openGift=g=>setRevealGift({title:g.title,
    existing:g.status==='opened'?{reward:g.reward}:null,
    claim:async()=>{const result=await openTournamentGift(g.tournamentId);await refresh();return result;}
  });
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
  return <div className="maf-gifts" aria-label="Récompenses et cadeaux du tournoi">
    <header className="maf-gifts__top"><div className="maf-gifts__emblem">🎁</div>
      <div><h2>Mes récompenses</h2><p>Retrouve ici tes cadeaux et leurs heures de remise.</p></div></header>
    <ManualGiftsPanel session={session} onVisibility={setLegacyHiddenBefore} onReveal={setRevealGift}/>
    <OfficialDuelGifts session={session} onReveal={setRevealGift}/>
    {!session?.id?<p className="maf-gifts__empty">Connecte-toi pour voir les récompenses de tes tournois.</p>:<>
      <div className="maf-gifts__toolbar"><h3>Mes coffres</h3><button type="button" disabled={busy} onClick={()=>void refresh().catch(e=>setError(e.message))}>↻ Actualiser</button></div>
      {error&&<p className="maf-gifts__error" role="alert">{error}</p>}
      {!items.length&&<div className="maf-gifts__empty"><span aria-hidden="true">🎀</span><p>Aucun cadeau pour le moment.</p></div>}
      <div className="maf-gifts__list">{items.map(g=><GiftBox key={g.tournamentId} name={g.title} {...g} busy={busy} onOpen={()=>openGift(g)}/>)}</div>
      {revealGift&&<GiftRevealOverlay key={revealGift.title} gift={revealGift} onClose={()=>setRevealGift(null)}/>}
    </>}
    {/* MAF_GIFT_SCHEDULE_IN_OWNER_V1 : programmation faite au moment de créer le tournoi. */}
    {false&&owner&&<section className="maf-gifts__owner" aria-label="Administration des cadeaux">
      <h3>🔒 Propriétaire 999 · Programmation des cadeaux</h3>
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

    </section>}
  </div>;
}
