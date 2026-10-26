// Monopoly en ligne : salon et partie partages, aucune action de jeu calculee par le navigateur.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from '../auth/useSession';
import { syncWallet } from '../api/accounts';
import * as api from '../api/monopolyOnline';
import MonopolyBoard from './MonopolyBoard';
import WinDicePicker, { useWinDice } from './WinDicePicker';
import { finishWinRoomMatch, winModeIsEnabled } from '../utils/winMode';
import MonopolyActionIcon from './MonopolyActionIcon';
import MonopolyActivity from './MonopolyActivity';
import MonopolySheet from './MonopolySheet';
import MonopolyVoices from './MonopolyVoices';
import EliminationRules from './MonopolyEliminationRules'; // MAF_MONOPOLY_ELIM_V1
import usePawnTravel from '../games/monopoly/usePawnTravel';
import { SQUARES, GROUP_COLORS, PIECES } from '../games/monopoly/data';
import { buildOptions, sellOptions, canBuy, ownedBy } from '../games/monopoly/engine';
import '../styles/monopoly.css';
import '../styles/monopoly-online.css';

const francs = n => `${new Intl.NumberFormat('fr-FR').format(n)} F CFA`;
const cash = n => `${new Intl.NumberFormat('fr-FR').format(n)} $`;
const WAIT_LABEL = {waiting:'En attente',proposed:'Proposition de depart',playing:'Partie en cours',finished:'Partie terminee',closed:'Salon ferme'};
const minPlayers = 2;

function BoardMatch({room, session, busy, send}) {
  const game=room.game;
  const win=useWinDice('monopoly',false,`${room.id}:${game.turn}:${game.current}`,game.dice);
  const winAvailable=win.enabled && !!room.winModeAvailable;
  useEffect(()=>{if(room.status==='finished'||room.status==='closed')finishWinRoomMatch('monopoly');},[room.id,room.status]);
  const meIndex=room.players.findIndex(p=>Number(p.id)===Number(session?.id));
  const isMyTurn=meIndex===game.current && game.phase!=='over';
  const active=game.players[game.current];
  const me=game.players[meIndex];
  const {shown,travel,walking}=usePawnTravel(game);
  const [panel,setPanel]=useState(null);
  const [selected,setSelected]=useState(null);
  const [focused,setFocused]=useState(false);
  const [cameraReady,setCameraReady]=useState(false);
  const [micSlot,setMicSlot]=useState(null);
  const builds=isMyTurn?buildOptions(game):[];
  const sells=isMyTurn?sellOptions(game):[];
  const canAct=isMyTurn&&!busy&&!walking;
  const allowedBuy=canAct&&canBuy(game);
  const awayPlayers=room.players.filter(p=>game.presence?.away?.[String(p.id)]!==undefined&&!game.players[room.players.indexOf(p)]?.bankrupt);
  const [clockNow,setClockNow]=useState(Date.now());
  const rollRemaining=Math.max(0,Math.min(100,((Number(game.turnClock?.dueAt)||clockNow)-clockNow)/500));
  const endProgress=Math.max(0,Math.min(100,((clockNow-Number(game.turnClock?.startedAt||clockNow))/600)));
  useEffect(()=>{const timer=window.setInterval(()=>setClockNow(Date.now()),1000);return()=>window.clearInterval(timer);},[]);
  const winner=room.winnerId===session?.id;
  const hint=game.phase==='over'?'Partie terminee.'
    : me?.bankrupt?'Tu es éliminé : ta mise est perdue. Tu peux continuer à regarder la partie.'
    : !isMyTurn?`Au tour de ${active?.name || 'un autre joueur'}. La partie se met a jour automatiquement.`
    : game.phase==='debt'?`${me.name}, il faut vendre pour regler ta dette.`
    : game.phase==='roll'?'Tu peux construire sur tes terrains avant de lancer les des.'
    : allowedBuy?'Tu peux acheter ce terrain puis construire directement dessus.':'Construis, vends ou termine ton tour.';
  const onAction=async (action,square) => { const ok=await send(()=>api.action(room.id,action,square,action==='roll'&&winAvailable&&winModeIsEnabled('monopoly')?win.faces:undefined)); if(ok&&action==='build'&&game.phase==='after')setPanel(null); };
  return (
    <div className="mono mono--playing mono-online-match">
      <section className="mono-play-screen" aria-label="Monopoly multijoueur">
        <div className="mono-voice-board-wrap">
          <MonopolyBoard game={game} selected={selected} onSelect={setSelected}
            rolling={false} diceFaces={game.lastRoll?.dice||[]} positions={shown} travel={travel}
            cameraFocused={focused} onCameraReadyChange={setCameraReady}
            renderCenter={()=><MonopolyActivity game={game} paused={walking||!!panel}/>}/>
          {room.status==='playing'&&micSlot&&<MonopolyVoices roomId={room.id} userId={session?.id} slot={micSlot}/>}
        </div>
        <div className="mono-console">
          {awayPlayers.map(p=><p className="mono-online-absence" role="status" key={p.id}>
            {p.name} a quitté le plateau · retour sous {Math.max(0,Math.ceil((Number(game.presence.away[String(p.id)])+120000-clockNow)/1000))} s, sinon élimination.
          </p>)}
          <div className="mono-statusline">
            <span><span className="mono-token" style={{background:active?.color}}>{PIECES[active?.piece||0].emoji}</span><strong>{active?.name}</strong></span>
            <span>{cash(active?.balance||0)} <small>· Tour {game.turn}</small></span>
          </div>
          {room.status==='finished'?<div className="mono-win">
            <h3>{winner?'🏆 Tu as gagné !':!room.winnerId?'Partie annulée':`🏆 ${room.players.find(p=>p.id===room.winnerId)?.name||'Partie terminée'} gagne la partie`}</h3>
            <p>{winner?`Gain : ${francs(room.payout)}`:!room.winnerId?'Les mises ont été remboursées.':`Tu as perdu ta mise de ${francs(room.stake)}.`}</p>
          </div>:<>
            <p className="mono-hint">{hint}</p>
            {winAvailable&&isMyTurn&&game.phase==='roll'&&<WinDicePicker count={game.dice} value={win.value} onChange={win.choose} disabled={!canAct}/>}
            <div className="mono-actions">
              <button type="button" className={`btn btn--primary btn--sm${isMyTurn&&game.phase==='roll'?' mono-roll-timed':''}`} style={{'--mono-roll-width':`${rollRemaining}%`}} disabled={!canAct||game.phase!=='roll'||(winAvailable&&win.incomplete)} onClick={()=>onAction('roll')}><MonopolyActionIcon name="roll"/><span>Lancer</span></button>
              <button type="button" className="btn btn--sm" disabled={!allowedBuy} onClick={()=>onAction('buy')}><MonopolyActionIcon name="buy"/><span>Acheter</span></button>
              <button type="button" className={`btn btn--sm${isMyTurn&&['after','debt'].includes(game.phase)?' mono-end-timed':''}`} style={{'--mono-end-width':`${endProgress}%`}} disabled={!canAct||game.phase!=='after'} onClick={()=>onAction('end')}><MonopolyActionIcon name="end"/><span>Fin</span></button>
            </div>
            <div className="mono-secondary-actions">
              <button type="button" className="btn btn--sm" aria-haspopup="dialog" onClick={()=>setPanel('build')}><MonopolyActionIcon name="build"/><span>Maison</span></button>
              <button type="button" className="btn btn--sm" aria-haspopup="dialog" onClick={()=>setPanel('sell')}><MonopolyActionIcon name="sell"/><span>Vendre</span></button>
              <button type="button" className="btn btn--sm" disabled={!cameraReady} onClick={()=>setFocused(f=>!f)}><MonopolyActionIcon name={focused?"map":"target"}/><span>{focused?"Plateau":"Mon pion"}</span></button>
              <div className="mono-mic-slot" ref={setMicSlot}/>
            </div>
          </>}
        </div>
      </section>
      <section className="mono-panel mono-history"><h3>Joueurs · {room.players.length}</h3>
        <div className="mono-online-players">{game.players.map((p,i)=><div key={i} className="mono-online-player">
          <i style={{background:p.color}}/>{p.name} {room.players[i]?.id===session?.id?'(toi)':''}
          <span>{p.bankrupt?'Faillite':`${cash(p.balance)} · ${ownedBy(game,i).length} terrain(s)`}</span>
        </div>)}</div>
        <h3>Activites</h3><ul className="mono-log">{game.log.slice(0,35).map(l=><li key={l.n}>{l.player!==null?`${game.players[l.player]?.name||''} `:''}{l.text}</li>)}</ul>
        <button type="button" className="btn btn--sm btn--outline mono-more-bottom" aria-haspopup="dialog" onClick={()=>setPanel('more')}><MonopolyActionIcon name="more"/><span>Plus · conditions · abandon</span></button>
      </section>
      {panel&&<MonopolySheet title={panel==='build'?'Construire':panel==='sell'?'Vendre':'Options'} onClose={()=>setPanel(null)}>
        {panel==='build'&&<div className="mono-sell">
          {!isMyTurn?<p className="mono__note">Ce n'est pas ton tour. Tu pourras construire quand ce sera à toi de jouer.</p>
            : walking?<p className="mono__note">Déplacement du pion en cours. La construction sera disponible après l'animation.</p>
            : !builds.length?<p className="mono__note">Aucune maison disponible maintenant : il faut posséder un terrain constructible, avoir assez d'argent et construire avant de lancer les dés (ou juste après son achat). Une construction par terrain et par tour.</p>:null}
          {builds.map(o=>{const q=SQUARES[o.square];return <div className="mono-sell__row" key={o.square}>
          <span><span className="mono-dot" style={{background:GROUP_COLORS[q.group]}}/>{q.name} · {game.houses[o.square]===4?'Hotel':'Maison'}</span>
          <button className="btn btn--sm" type="button" disabled={!canAct} onClick={()=>onAction('build',o.square)}>−{cash(o.price)}</button>
        </div>;})}</div>}
        {panel==='sell'&&<div className="mono-sell">
          {!isMyTurn?<p className="mono__note">Ce n'est pas ton tour. Tu pourras vendre quand ce sera à toi de jouer.</p>
            : !sells.length?<p className="mono__note">Tu n'as pas encore de propriété à vendre.</p>:null}
          {sells.map(o=><div className="mono-sell__row" key={o.square}>
          <span>{SQUARES[o.square].name}</span><button type="button" className="btn btn--sm" disabled={!canAct} onClick={()=>onAction('sell',o.square)}>+{cash(o.value)}</button>
        </div>)}</div>}
        {panel==='more'&&<div className="mono-panel"><EliminationRules stake={room.stake} open/><p className="mono__note">Code salon : {room.code}. La partie reste sur le serveur si tu quittes cette page.</p>
          <button type="button" className="btn btn--sm btn--outline" disabled={busy||room.status!=='playing'||!!me?.bankrupt}
            onClick={()=>{if(window.confirm('Abandonner ? Tu perdras la partie et ta mise.'))void onAction('abandon');}}>Abandonner la partie</button>
        </div>}
      </MonopolySheet>}
    </div>
  );
}

export default function MonopolyOnline({onPlayingChange,mode='create',selectedRoomId=null,previewRoom=null,onCreated,onOpenRoom}) {
  const {session}=useSession();
  const [room,setRoom]=useState(null);
  const [maxPlayers,setMaxPlayers]=useState(4),[stake,setStake]=useState('100');
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[note,setNote]=useState('');
  const busyRef=useRef(false),refreshRef=useRef(false);
  const refresh=useCallback(async()=>{
    if(!session?.id||refreshRef.current)return;
    refreshRef.current=true;
    try {
      const mine=await api.mine();
      if(mode==='detail') {
        if(Number(mine?.id)===Number(selectedRoomId))setRoom(mine);
        else if(previewRoom?.status==='finished'||previewRoom?.status==='closed') {
          // Seul un ancien participant peut retrouver les details d'une partie terminee.
          setRoom(await api.detail(selectedRoomId).catch(()=>null));
        } else setRoom(null);
      } else setRoom(mine);
    } catch(e) {setError(e.message);} finally {refreshRef.current=false;}
  },[session?.id,mode,selectedRoomId,previewRoom?.status]);
  useEffect(()=>{
    setRoom(null);setNote('');setError('');if(session?.id)void refresh();
    const id=window.setInterval(()=>{if(!document.hidden)void refresh();},2500);
    return()=>window.clearInterval(id);
  },[session?.id,refresh]);
  // La presence est maintenue uniquement quand le plateau est ouvert.
  // Quitter vers Salons arrete ce signal et lance le delai de reconnexion.
  useEffect(()=>{
    if(mode!=='detail'||room?.status!=='playing'||!session?.id)return undefined;
    const id=room.id;
    const ping=()=>{if(!document.hidden)void api.presence(id,'here').catch(()=>{});};
    ping();
    const timer=window.setInterval(ping,10000);
    const resume=()=>{if(!document.hidden)ping();};
    document.addEventListener('visibilitychange',resume);
    return()=>{window.clearInterval(timer);document.removeEventListener('visibilitychange',resume);};
  },[mode,room?.id,room?.status,session?.id]);
  useEffect(()=>{onPlayingChange?.(mode==='detail'&&(room?.status==='playing'||room?.status==='finished'));
    return()=>onPlayingChange?.(false);},[mode,room?.status,onPlayingChange]);
  useEffect(()=>{if(room?.status==='playing'||room?.status==='finished')void syncWallet().catch(()=>{});},[room?.status,room?.payout]);
  const update=async fn=>{
    if(busyRef.current)return false;
    busyRef.current=true;setBusy(true);setError('');setNote('');
    try{const next=await fn();if(next)setRoom(next);await refresh();return true;}
    catch(e){setError(e.message);void refresh();return false;}
    finally{busyRef.current=false;setBusy(false);}
  };
  const watchRoom=async id=>{const ok=await update(()=>api.join(id));if(ok)setNote('Tu as rejoint le salon.');};
  const onCreate=e=>{e.preventDefault();void (async()=>{
    let created=null;
    const ok=await update(async()=>{created=await api.create(maxPlayers,Number(stake));return created;});
    if(ok)onCreated?.(created);
  })();};
  const members=room?.players||[];
  const isHost=room?.hostId===session?.id;
  const canPropose=members.some(p=>Number(p.id)===Number(session?.id));
  const vote=room?.proposal?.votes?.[session?.id];
  const votesCount=room?.proposal?Object.values(room.proposal.votes||{}).filter(Boolean).length:0;
  const isPlaying=mode==='detail'&&(room?.status==='playing'||room?.status==='finished');
  return <section className={`mono-online${isPlaying?' mono-online--playing':''}`} aria-label="Salons Monopoly en ligne">
    {mode==='create'&&<header className="mono-online-head"><h3>🎩 Monopoly en ligne</h3>
      <p>Crée un salon de 2 à 4 joueurs. Les salons disponibles et les détails sont dans l'onglet Salon.</p></header>}
    {error&&<p className="game-hub__error" role="alert">{error}</p>}
    {note&&<p className="game-hub__notice" role="status">{note}</p>}
    {!session?<p className="mono-panel">Connecte-toi dans Profil pour créer ou rejoindre un salon.</p>:
    mode==='detail' ? (isPlaying?
      <><div className="mono-online-roomtop"><span>Monopoly #{room.code} · {room.players.length} joueurs</span></div>
        <BoardMatch key={room.id} room={room} session={session} busy={busy} send={update}/></>:
      room&&['waiting','proposed'].includes(room.status)?<div className="mono-online-lobby">
        <div className="mono-online-heading"><span>Salon #{room.code}</span><strong>{members.length}/{room.maxPlayers} joueurs</strong></div>
        <p>Mise : <strong>{francs(room.stake)} par joueur</strong> · Pot à {members.length} : {francs(room.stake*members.length)}</p>
        <EliminationRules stake={room.stake} open/>
        <div className="mono-online-players">{Array.from({length:room.maxPlayers},(_,i)=>{
          const p=members.find(m=>m.seat===i);return <div className="mono-online-player" key={i}>
            <i style={{background:p?['#ef6262','#36a9ec','#f2b443','#9d7df0'][i]:'#67636a'}}/>
            {p?<>{p.name} <small>#{p.id}{p.id===session.id?' · Toi':''}</small></>:<span>En attente d'un joueur...</span>}
          </div>;})}</div>
        {room.status==='proposed'?<div className="mono-online-vote" role="status">
          <strong>🔔 {members.find(p=>Number(p.id)===Number(room.proposal.proposedBy))?.name || 'Un joueur'} propose de commencer à {room.proposal.count} joueurs</strong>
          <p>{votesCount}/{members.length} accords. Tu peux accepter ou continuer d'attendre.</p>
          {vote===true?<p>Ton accord est enregistré. En attente des autres joueurs.</p>:null}
          <div className="mono-online-actions">
            {vote!==true&&<button type="button" className="btn btn--primary" disabled={busy} onClick={()=>update(()=>api.vote(room.id,true))}>✓ Commencer</button>}
            <button type="button" className="btn" disabled={busy} onClick={()=>update(()=>api.vote(room.id,false))}>Attendre d'autres joueurs</button>
          </div>
        </div>:<>
          <p>{members.length===room.maxPlayers?'Salon complet : chaque participant peut proposer le départ.':`Encore ${room.maxPlayers-members.length} place(s) possible(s).`}</p>
          {canPropose&&members.length>=minPlayers&&<button type="button" className="btn btn--primary" disabled={busy}
            onClick={()=>update(()=>api.propose(room.id,members.length))}>Proposer de commencer à {members.length}</button>}
        </>}
        <div className="mono-online-actions"><button type="button" className="btn" disabled={busy} onClick={()=>update(()=>api.leave(room.id))}>{isHost?'Fermer le salon':'Quitter le salon'}</button></div>
      </div>:<div className="mono-online-lobby">
        <div className="mono-online-heading"><strong>Salon #{previewRoom?.code||''}</strong><span>{previewRoom?.present??previewRoom?.players?.length??0}/{previewRoom?.maxPlayers||4} joueurs</span></div>
        <p>Mise : {francs(previewRoom?.stake||0)} par joueur. Rejoins ce salon pour voir les participants et proposer le départ.</p>
        {previewRoom?.status==='waiting' && previewRoom?.present<previewRoom?.maxPlayers &&
          <button type="button" className="btn btn--primary" disabled={busy} onClick={()=>void watchRoom(selectedRoomId)}>Rejoindre ce salon</button>}
        {previewRoom?.status==='proposed'&&<p>Une proposition de départ est en cours : les nouvelles inscriptions sont suspendues.</p>}
      </div>) :
    room&&['waiting','proposed','playing'].includes(room.status)?<div className="mono-online-create">
      <p>Tu as déjà un salon Monopoly #{room.code}. Il est accessible dans l'onglet Salon.</p>
      <button type="button" className="btn btn--primary" onClick={()=>onOpenRoom?.(room)}>Voir mon salon</button>
    </div>:<form className="mono-online-create" onSubmit={onCreate}>
      <h4>Créer un salon</h4><label>Places maximum
        <select value={maxPlayers} onChange={e=>setMaxPlayers(Number(e.target.value))}>
          <option value={2}>2 joueurs</option><option value={3}>3 joueurs</option><option value={4}>4 joueurs</option>
        </select></label>
      <label>Mise par joueur (F CFA)<input type="text" inputMode="numeric" required pattern="[0-9]+"
        value={stake} maxLength={7} onChange={e=>setStake(e.target.value.replace(/\D/g,'').slice(0,7))}/></label>
      <p>Les joueurs sont visibles dans l'onglet Salon. La mise est retenue après leur accord unanime.</p>
      <button type="submit" className="btn btn--primary" disabled={busy}>Créer mon salon</button>
    </form>}
  </section>;
}
