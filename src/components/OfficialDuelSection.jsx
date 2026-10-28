import {useCallback,useEffect,useState} from 'react';
import {publicDuels,ownerDuels,createDuel,editDuel,cancelDuel,reserveDuel,myDuels,duelGame,duelAction,duelNotices} from '../api/officialDuel';
import MonopolyBoard from './MonopolyBoard';
import {buildOptions,sellOptions,canBuy} from '../games/monopoly/engine';
import '../styles/monopoly.css';
import '../styles/official-duel.css';
const when=s=>new Intl.DateTimeFormat('fr-FR',{timeZone:'Africa/Abidjan',dateStyle:'medium',timeStyle:'short'}).format(new Date(s));
const timeInput=s=>s?new Date(s).toISOString().slice(0,16):'';
function DuelMatch({id,session,onClose}){
 const [state,setState]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [square,setSquare]=useState(1);
 const refresh=useCallback(async()=>{try{setState(await duelGame(id));setError('');}catch(e){setError(e.message);}},[id]);
 useEffect(()=>{void refresh();const timer=setInterval(()=>{if(!document.hidden)void refresh();},2500);return()=>clearInterval(timer);},[refresh]);
 const send=async action=>{if(!state||busy)return;setBusy(true);setError('');try{
  await duelAction(id,state.revision,action,Number(square));await refresh();
 }catch(e){setError(e.message);await refresh();}finally{setBusy(false);}};
 const game=state?.game?.game;
 const seats=state?.game?.seats||[];
 const mine=seats.findIndex(p=>Number(p.userId)===Number(session?.id));
 const yourTurn=mine>=0&&game?.current===mine&&game.phase!=='over'&&!game.players[mine]?.bankrupt;
 const builds=game&&yourTurn?buildOptions(game):[];
 const sells=game&&yourTurn?sellOptions(game):[];
 return <section className="maf-duel-match" aria-label="Finale du tournoi a deux">
  <header><h3>Finale du duel #{id}</h3><button type="button" onClick={onClose}>Fermer</button></header>
  {error&&<p role="alert" className="maf-duel-error">{error}</p>}
  {!game?<p>Partie non démarrée. Les deux joueurs doivent être inscrits et l'heure programmée doit être atteinte.</p>:<>
   <div className="mono mono--playing"><MonopolyBoard game={game} selected={null} onSelect={()=>{}} rolling={false} diceFaces={game.lastRoll?.dice||[]}/></div>
   <p><strong>{game.phase==='over'?'Partie terminée':`Au tour de ${game.players[game.current]?.name||'joueur'}`}</strong> · Tour {game.turn}</p>
   <div className="maf-duel-players">{game.players.map((p,i)=><p key={i}>{p.name}{i===mine?' (toi)':''} : {p.balance} $ · {p.bankrupt?'éliminé':`case ${p.location}`}</p>)}</div>
   {game.phase==='over'?<div role="status"><h4>🏆 {game.winner>=0?`${game.players[game.winner]?.name} gagne !`:'Duel annulé'}</h4>
     <p>Les gains (900 F / 100 F) sont programmés à l'heure des cadeaux et seront visibles dans « Cadeaux » après crédit.</p></div>:
    <><div className="maf-duel-actions">
     <button type="button" disabled={!yourTurn||busy||game.phase!=='roll'} onClick={()=>send('roll')}>🎲 Lancer les dés</button>
     <button type="button" disabled={!yourTurn||busy||!canBuy(game)} onClick={()=>send('buy')}>Acheter</button>
     <button type="button" disabled={!yourTurn||busy||game.phase!=='after'} onClick={()=>send('end')}>Fin de tour</button>
    </div>
    <label>Terrain <select value={square} onChange={e=>setSquare(e.target.value)}>
      {[...new Set([...builds,...sells].map(x=>x.square))].map(n=><option key={n} value={n}>Terrain n° {n}</option>)}
    </select></label>
    <div className="maf-duel-actions">
      <button type="button" disabled={!builds.some(x=>x.square===Number(square))||busy} onClick={()=>send('build')}>Construire</button>
      <button type="button" disabled={!sells.some(x=>x.square===Number(square))||busy} onClick={()=>send('sell')}>Vendre</button>
      <button type="button" disabled={!yourTurn||busy} onClick={()=>{if(window.confirm('Abandonner définitivement la partie ?'))void send('abandon');}}>Abandonner</button>
    </div></>}
   <details><summary>Historique de partie</summary><ol>{(game.log||[]).slice(0,30).map(l=><li key={l.n}>{l.text}</li>)}</ol></details>
  </>}
 </section>;
}
export default function OfficialDuelSection({session}){
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
 const cancel=async id=>{if(!window.confirm('Annuler ce duel et rembourser les inscrits ?'))return;setBusy(true);setError('');try{const d=await cancelDuel(id);setNote(`Duel annulé · ${d.refunded||0} remboursement(s).`);setEditing(null);await refresh();}catch(e){setError(e.message);}finally{setBusy(false);}};
 const reserve=async id=>{if(!window.confirm('Confirmer la réservation payante de 500 F CFA sur ton solde réel ?'))return;
  setBusy(true);setError('');try{await reserveDuel(id);setNote('Réservation confirmée.');await refresh();}
  catch(e){setError(e.message);}finally{setBusy(false);}};
 const mineById=id=>mine.find(x=>x.id===id);
 return <section className="maf-duels" aria-label="Tournois Monopoly a deux joueurs">
  <div className="maf-duels__title"><h3>🏆 Duels officiels · 2 joueurs</h3><p>Finale directe · mise de 500 F CFA · gagnant 900 F / deuxième 100 F.</p></div>
  {error&&<p className="maf-duel-error" role="alert">{error}</p>}{note&&<p role="status">{note}</p>}
  {isOwner&&<details className="maf-duels__owner"><summary>Programmer un duel à deux joueurs (compte 999)</summary>
   <div className="maf-duels__drafts">
      <button type="button" onClick={()=>{setEditing(null);setTitle('Duel Monopoly');setStartsAt('');setGiftsAt('');setStatus('draft');}}>＋ Nouveau duel</button>
      {ownerItems.map(d=><div key={d.id} className="maf-duels__draft-row"><button type="button" onClick={()=>{setEditing(d);setTitle(d.title);setStartsAt(timeInput(d.startsAt));setGiftsAt(timeInput(d.giftsAt));setStatus(['draft','published'].includes(d.status)?d.status:'draft');}}>{d.title} · {d.status}</button>{['draft','published'].includes(d.status)&&<button type="button" disabled={busy} onClick={()=>void cancel(d.id)}>Supprimer</button>}</div>)}
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
