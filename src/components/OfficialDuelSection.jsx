import {useCallback,useEffect,useState,useRef} from 'react';
import {publicDuels,ownerDuels,createDuel,editDuel,cancelDuel,archiveDuel,reserveDuel,myDuels,duelGame,duelAction,duelNotices} from '../api/officialDuel';
import {BoardMatch} from './MonopolyOnline';
import {createPortal} from 'react-dom';
// Le duel reprend toutes les commandes et animations de MonopolyOnline.
import '../styles/monopoly.css';
import '../styles/official-duel.css';
import '../styles/duel-fullscreen.css';
const when=s=>new Intl.DateTimeFormat('fr-FR',{timeZone:'Africa/Abidjan',dateStyle:'medium',timeStyle:'short'}).format(new Date(s));
const timeInput=s=>s?new Date(s).toISOString().slice(0,16):'';
// MAF_DUEL_SHARED_BOARD_V1 : même interface plein écran que le Monopoly en ligne.
function DuelMatch({id,session,onClose}){
 const [state,setState]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const busyRef=useRef(false);
 const refresh=useCallback(async()=>{try{setState(await duelGame(id));setError('');}catch(e){setError(e.message);}},[id]);
 useEffect(()=>{void refresh();const timer=setInterval(()=>{if(!document.hidden)void refresh();},2500);return()=>clearInterval(timer);},[refresh]);
 useEffect(()=>{const prior=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=prior;};},[]);
 const send=async run=>{
  if(busyRef.current)return false;
  busyRef.current=true;setBusy(true);setError('');
  try{await run();await refresh();return true;}
  catch(e){setError(e.message);await refresh();return false;}
  finally{busyRef.current=false;setBusy(false);}
 };
 const match=state?.game;
 const game=match?.game;
 const seats=match?.seats||[];
 const winnerSeat=Number.isInteger(game?.winner)&&game.winner>=0?game.winner:-1;
 const room=game&&seats.length===2?{
  id:'tournoi-'+id,code:'#'+id,
  status:game.phase==='over'||['finished','paid'].includes(state.status)?'finished':'playing',
  players:seats.map((p,i)=>({id:Number(p.userId),name:p.name,seat:i})),
  game,stake:500,payout:900,winModeAvailable:false,
  winnerId:winnerSeat>=0?Number(seats[winnerSeat]?.userId):state.winnerId||null,
 }:null;
 return createPortal(<div className="maf-duel-fullscreen mono-online mono-online--playing" role="dialog" aria-modal="true" aria-label="Finale du tournoi Monopoly">
   <header className="maf-duel-fullscreen__head"><strong>🎩 Finale Monopoly · Duel #{id}</strong>
    <button type="button" className="btn btn--sm" onClick={onClose}>✕ Quitter l'écran</button></header>
   {error&&<p role="alert" className="maf-duel-error">{error}</p>}
   {room?<BoardMatch room={room} session={session} busy={busy} send={send}
      tournamentAction={(action,square)=>duelAction(id,state.revision,action,square)}/>
    :<p className="maf-duel-fullscreen__waiting">Partie non démarrée. Les deux réservations doivent être confirmées et l'heure prévue atteinte.</p>}
  </div>,document.body);
}

// MAF_OWNER_DUEL_MOVED_V1 : le formulaire est dans la gestion commune.
export default function OfficialDuelSection({session,hideAdmin=false}){
 const isOwner=session?.pseudo==='999';
 const [duels,setDuels]=useState([]),[mine,setMine]=useState([]),[notices,setNotices]=useState([]),[ownerItems,setOwnerItems]=useState([]),[editing,setEditing]=useState(null);
 const [selected,setSelected]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[note,setNote]=useState('');
 const [title,setTitle]=useState('Duel Monopoly'),[startsAt,setStartsAt]=useState(''),[giftsAt,setGiftsAt]=useState(''),[status,setStatus]=useState('draft');
 const refresh=useCallback(async()=>{
  const [pub,my,nt]=await Promise.all([publicDuels(),session?.id?myDuels():Promise.resolve({duels:[]}),session?.id?duelNotices():Promise.resolve({notices:[]})]);
  setDuels(pub);setMine(my.duels||[]);setNotices(nt.notices||[]);
  if(isOwner){const own=await ownerDuels();setOwnerItems(own.duels||[]);}
 },[session?.id,isOwner]);
 useEffect(()=>{void refresh().catch(e=>setError(e.message));const timer=setInterval(()=>{if(!document.hidden)void refresh().catch(()=>{});},12000);return()=>clearInterval(timer);},[refresh]);
 const save=async e=>{e.preventDefault();setError('');setBusy(true);
  try{const payload={title,startsAt:`${startsAt}:00.000Z`,giftsAt:`${giftsAt}:00.000Z`,status,...(editing?{revision:editing.revision}:{})};
    const data=editing?await editDuel(editing.id,payload):await createDuel(payload);
    setNote(`Duel #${data.duel.id} enregistré.`);setEditing(data.duel);await refresh();}
  catch(e){setError(e.message);}finally{setBusy(false);}};
 const cancel=async id=>{if(!window.confirm('Annuler ce duel et rembourser les inscrits ?'))return;setBusy(true);setError('');try{const d=await cancelDuel(id);await archiveDuel(id);setNote(`Duel annulé et retiré · ${d.refunded||0} remboursement(s).`);setEditing(null);await refresh();}catch(e){setError(e.message);}finally{setBusy(false);}};
 // MAF_DUEL_OWNER_REMOVE_V1 : masquer une partie terminée, sans supprimer ses crédits.
 const archive=async id=>{
  if(!window.confirm('Retirer ce duel de la liste ? Les gains, reservations et cadeaux restent conserves.'))return;
  setBusy(true);setError('');
  try{await archiveDuel(id);setNote('Duel retire. Tu peux programmer le suivant.');
   setEditing(null);setSelected(null);setTitle('Duel Monopoly');setStartsAt('');setGiftsAt('');setStatus('draft');
   await refresh();}
  catch(e){setError(e.message);}finally{setBusy(false);}
 };
 const reserve=async id=>{if(!window.confirm('Confirmer la réservation payante de 500 F CFA sur ton solde réel ?'))return;
  setBusy(true);setError('');try{await reserveDuel(id);setNote('Réservation confirmée.');await refresh();}
  catch(e){setError(e.message);}finally{setBusy(false);}};
 const mineById=id=>mine.find(x=>x.id===id);
 if (hideAdmin && !error && duels.length === 0 && notices.length === 0 && selected == null) return null;
 return <section className="maf-duels" aria-label="Tournois Monopoly a deux joueurs">
  <div className="maf-duels__title"><h3>🏆 Duels officiels · 2 joueurs</h3><p>Finale directe · mise de 500 F CFA · gagnant 900 F / deuxième 100 F.</p></div>
  {error&&<p className="maf-duel-error" role="alert">{error}</p>}{note&&<p role="status">{note}</p>}
  {isOwner&&!hideAdmin&&<details className="maf-duels__owner"><summary>Programmer un duel à deux joueurs (compte 999)</summary>
   <div className="maf-duels__drafts">
      <button type="button" onClick={()=>{setEditing(null);setTitle('Duel Monopoly');setStartsAt('');setGiftsAt('');setStatus('draft');}}>＋ Nouveau duel</button>
      {ownerItems.map(d=><div key={d.id} className="maf-duels__draft-row"><button type="button" onClick={()=>{setEditing(d);setTitle(d.title);setStartsAt(timeInput(d.startsAt));setGiftsAt(timeInput(d.giftsAt));setStatus(['draft','published'].includes(d.status)?d.status:'draft');}}>{d.title} · {d.status}</button>{['draft','published'].includes(d.status)&&<button type="button" disabled={busy} onClick={()=>void cancel(d.id)}>Supprimer / annuler</button>}{['finished','paid','cancelled'].includes(d.status)&&<button type="button" disabled={busy} onClick={()=>void archive(d.id)}>Supprimer</button>}</div>)}
    </div>
   <form onSubmit={save}>
    <label>Titre<input required maxLength={80} value={title} onChange={e=>setTitle(e.target.value)}/></label>
    <label>Début de la finale — heure d'Abidjan<input required type="datetime-local" value={startsAt} onChange={e=>setStartsAt(e.target.value)}/></label>
    <label>Remise des cadeaux — heure d'Abidjan<input required type="datetime-local" value={giftsAt} min={startsAt} onChange={e=>setGiftsAt(e.target.value)}/></label>
    <label>Visibilité<select value={status} onChange={e=>setStatus(e.target.value)}><option value="draft">Brouillon</option><option value="published">Publier</option></select></label>
    <p>Les inscriptions ne sont ouvertes que lorsque la mise en service du duel est validée côté serveur.</p>
    <button type="submit" disabled={busy}>{editing?"Enregistrer / publier":"Créer ce duel"}</button>
   </form></details>}
  {isOwner&&<p className="maf-duels__hint">Les brouillons sont conservés dans l'administration : <button type="button" onClick={async()=>{try{const x=await ownerDuels();setNote(`${x.duels.length} duels dans l'administration, dont les brouillons.`);}catch(e){setError(e.message);}}}>Voir le total</button></p>}
  {duels.map(d=>{const enrolled=mineById(d.id);return <article className="maf-duels__card" key={d.id}>
    <header><strong>{d.title}</strong><span>{d.registered}/2 places</span></header>
    <p>Début : {when(d.startsAt)} · Cadeaux : {when(d.giftsAt)}.</p>
    {enrolled&&<p className="maf-duels__hint">Ton inscription : {enrolled.entryStatus} · {enrolled.status}</p>}
    {d.status==='published'&&d.enabled&&d.registered<2&&!enrolled&&session?.id&&<button disabled={busy} type="button" onClick={()=>reserve(d.id)}>Réserver ma place · 500 F</button>}
    {!d.enabled&&<p>Les réservations de ce duel ne sont pas encore ouvertes.</p>}
    {enrolled&&['playing','finished','paid'].includes(d.status)&&<button type="button" onClick={()=>setSelected(d.id)}>Ouvrir le plateau du duel</button>}
    {enrolled&&d.status==='cancelled'&&<p>Tournoi annulé : réservation remboursée.</p>}
  </article>;})}
  {!duels.length&&<p>Aucun duel officiel publié pour le moment.</p>}
  {selected&&<DuelMatch id={selected} session={session} onClose={()=>setSelected(null)}/>}
  {notices.length>0&&<details className="maf-duels__notices"><summary>🔔 Notifications de tournoi ({notices.length})</summary>
   <ul>{notices.slice(0,12).map(n=><li key={n.id}>{n.title} · {{reserved:'Inscription confirmée',full:'Tournoi complet',started:'Duel commencé',results_ready:'Résultats prêts',gift_available:'Cadeau disponible',cancelled_refunded:'Tournoi annulé et remboursé'}[n.kind]||n.kind}</li>)}</ul></details>}
 </section>;
}
