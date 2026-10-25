// Monopoly en ligne : salon et partie partages, aucune action de jeu calculee par le navigateur.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from '../auth/useSession';
import { syncWallet } from '../api/accounts';
import * as api from '../api/monopolyOnline';
import MonopolyBoard from './MonopolyBoard';
import MonopolyActivity from './MonopolyActivity';
import MonopolySheet from './MonopolySheet';
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
  const meIndex=room.players.findIndex(p=>p.id===session?.id);
  const isMyTurn=meIndex===game.current && game.phase!=='over';
  const active=game.players[game.current];
  const me=game.players[meIndex];
  const {shown,travel,walking}=usePawnTravel(game);
  const [panel,setPanel]=useState(null);
  const [selected,setSelected]=useState(null);
  const [focused,setFocused]=useState(false);
  const [cameraReady,setCameraReady]=useState(false);
  const builds=isMyTurn?buildOptions(game):[];
  const sells=isMyTurn?sellOptions(game):[];
  const canAct=isMyTurn&&!busy&&!walking;
  const allowedBuy=canAct&&canBuy(game);
  const winner=room.winnerId===session?.id;
  const hint=game.phase==='over'?'Partie terminee.'
    : !isMyTurn?`Au tour de ${active?.name || 'un autre joueur'}. La partie se met a jour automatiquement.`
    : game.phase==='debt'?`${me.name}, il faut vendre pour regler ta dette.`
    : game.phase==='roll'?'Tu peux construire sur tes terrains avant de lancer les des.'
    : allowedBuy?'Tu peux acheter ce terrain puis construire directement dessus.':'Construis, vends ou termine ton tour.';
  const onAction=async (action,square) => { const ok=await send(()=>api.action(room.id,action,square)); if(ok&&action==='build'&&game.phase==='after')setPanel(null); };
  return (
    <div className="mono mono--playing mono-online-match">
      <section className="mono-play-screen" aria-label="Monopoly multijoueur">
        <MonopolyBoard game={game} selected={selected} onSelect={setSelected}
          rolling={false} diceFaces={game.lastRoll?.dice||[]} positions={shown} travel={travel}
          cameraFocused={focused} onCameraReadyChange={setCameraReady}
          renderCenter={()=><MonopolyActivity game={game} paused={walking||!!panel}/>}/>
        <div className="mono-console">
          <div className="mono-statusline">
            <span><span className="mono-token" style={{background:active?.color}}>{PIECES[active?.piece||0].emoji}</span><strong>{active?.name}</strong></span>
            <span>{cash(active?.balance||0)} <small>· Tour {game.turn}</small></span>
          </div>
          {room.status==='finished'?<div className="mono-win">
            <h3>{winner?'🏆 Tu as gagne !':`🏆 ${room.players.find(p=>p.id===room.winnerId)?.name||'Partie terminee'}`}</h3>
            <p>{winner?`Gain : ${francs(room.payout)}`:'Merci pour la partie.'}</p>
          </div>:<>
            <p className="mono-hint">{hint}</p>
            <div className="mono-actions">
              <button type="button" className="btn btn--primary btn--sm" disabled={!canAct||game.phase!=='roll'} onClick={()=>onAction('roll')}>🎲 Lancer</button>
              <button type="button" className="btn btn--sm" disabled={!allowedBuy} onClick={()=>onAction('buy')}>🏷️ Acheter</button>
              <button type="button" className="btn btn--sm" disabled={!canAct||game.phase!=='after'} onClick={()=>onAction('end')}>⏭ Fin du tour</button>
            </div>
            <div className="mono-secondary-actions">
              <button type="button" className="btn btn--sm" disabled={!canAct||!builds.length} onClick={()=>setPanel('build')}>🏠 Construire</button>
              <button type="button" className="btn btn--sm" disabled={!canAct||!sells.length} onClick={()=>setPanel('sell')}>🏷️ Vendre</button>
              <button type="button" className="btn btn--sm" disabled={!cameraReady} onClick={()=>setFocused(f=>!f)}>{focused?'🗺️ Plateau':'🎯 Mon pion'}</button>
              <button type="button" className="btn btn--sm" onClick={()=>setPanel('more')}>••• Plus</button>
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
      </section>
      {panel&&<MonopolySheet title={panel==='build'?'Construire':panel==='sell'?'Vendre':'Options'} onClose={()=>setPanel(null)}>
        {panel==='build'&&<div className="mono-sell">{builds.map(o=>{const q=SQUARES[o.square];return <div className="mono-sell__row" key={o.square}>
          <span><span className="mono-dot" style={{background:GROUP_COLORS[q.group]}}/>{q.name} · {game.houses[o.square]===4?'Hotel':'Maison'}</span>
          <button className="btn btn--sm" type="button" disabled={!canAct} onClick={()=>onAction('build',o.square)}>−{cash(o.price)}</button>
        </div>;})}</div>}
        {panel==='sell'&&<div className="mono-sell">{sells.map(o=><div className="mono-sell__row" key={o.square}>
          <span>{SQUARES[o.square].name}</span><button type="button" className="btn btn--sm" disabled={!canAct} onClick={()=>onAction('sell',o.square)}>+{cash(o.value)}</button>
        </div>)}</div>}
        {panel==='more'&&<div className="mono-panel"><p className="mono__note">Code salon : {room.code}. La partie reste sur le serveur si tu quittes cette page.</p>
          <button type="button" className="btn btn--sm btn--outline" disabled={busy||room.status!=='playing'}
            onClick={()=>{if(window.confirm('Abandonner ? Tu perdras la partie et ta mise.'))void onAction('abandon');}}>Abandonner la partie</button>
        </div>}
      </MonopolySheet>}
    </div>
  );
}

export default function MonopolyOnline({onPlayingChange}) {
  const {session}=useSession();
  const [rooms,setRooms]=useState([]),[room,setRoom]=useState(null);
  const [maxPlayers,setMaxPlayers]=useState(4),[stake,setStake]=useState('100');
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[note,setNote]=useState('');
  const busyRef=useRef(false),roomRef=useRef(null),refreshRef=useRef(false);
  roomRef.current=room;
  const refresh=useCallback(async()=>{
    if(!session?.id||refreshRef.current)return;
    refreshRef.current=true;
    try {
      const [list,mine]=await Promise.all([api.publicRooms(),api.mine()]);
      setRooms(list);
      const current=roomRef.current;
      if(mine){setRoom(mine);} else if(current?.status==='finished'||current?.status==='closed'){
        const detail=await api.detail(current.id).catch(()=>null);if(detail)setRoom(detail);else setRoom(null);
      } else setRoom(null);
    }catch(e){setError(e.message);}finally{refreshRef.current=false;}
  },[session?.id]);
  useEffect(()=>{setRoom(null);setRooms([]);setNote('');setError('');if(session?.id)void refresh();
    const id=window.setInterval(()=>{if(!document.hidden)void refresh();},2500);
    return()=>window.clearInterval(id);
  },[session?.id,refresh]);
  useEffect(()=>{onPlayingChange?.(room?.status==='playing'||room?.status==='finished');return()=>onPlayingChange?.(false);},[room?.status,onPlayingChange]);
  useEffect(()=>{if(room?.status==='playing'||room?.status==='finished')void syncWallet().catch(()=>{});},[room?.status,room?.payout]);
  const update=async fn=>{
    if(busyRef.current)return false;
    busyRef.current=true;setBusy(true);setError('');setNote('');
    try{const next=await fn();if(next)setRoom(next);await refresh();return true;}
    catch(e){setError(e.message);void refresh();return false;}
    finally{busyRef.current=false;setBusy(false);}
  };
  const watchRoom=async id=>{const ok=await update(()=>api.join(id));if(ok)setNote('Tu as rejoint le salon.');};
  const onCreate=e=>{e.preventDefault();void update(()=>api.create(maxPlayers,Number(stake)));};
  const members=room?.players||[];
  const isHost=room?.hostId===session?.id;
  const vote=room?.proposal?.votes?.[session?.id];
  const votesCount=room?.proposal?Object.values(room.proposal.votes||{}).filter(Boolean).length:0;
  const isPlaying=room?.status==='playing'||room?.status==='finished';
  return <section className={`mono-online${isPlaying?' mono-online--playing':''}`} aria-label="Salons Monopoly en ligne">
    {!isPlaying&&<header className="mono-online-head"><h3>🎩 Monopoly en ligne</h3>
      <p>Salons de 2 a 4 joueurs. La mise est retiree uniquement quand tous acceptent le depart.</p></header>}
    {error&&<p className="game-hub__error" role="alert">{error}</p>}
    {note&&<p className="game-hub__notice" role="status">{note}</p>}
    {!session?<p className="mono-panel">Connecte-toi dans Profil pour creer ou rejoindre un salon.</p>:isPlaying?
      <><div className="mono-online-roomtop"><span>Monopoly #{room.code} · {room.players.length} joueurs</span>
        {room.status==='finished'&&<button type="button" className="btn btn--sm" onClick={()=>{setRoom(null);void refresh();}}>Retour aux salons</button>}</div>
        <BoardMatch key={room.id} room={room} session={session} busy={busy} send={update}/></>:
    room&&['waiting','proposed'].includes(room.status)?<div className="mono-online-lobby">
      <div className="mono-online-heading"><span>Salon #{room.code}</span><strong>{members.length}/{room.maxPlayers} joueurs</strong></div>
      <p>Mise : <strong>{francs(room.stake)} par joueur</strong> · Pot a {members.length} : {francs(room.stake*members.length)}</p>
      <div className="mono-online-players">{Array.from({length:room.maxPlayers},(_,i)=>{
        const p=members.find(m=>m.seat===i);return <div className="mono-online-player" key={i}>
          <i style={{background:p?['#ef6262','#36a9ec','#f2b443','#9d7df0'][i]:'#67636a'}}/>
          {p?<>{p.name} <small>#{p.id}{p.id===session.id?' · Toi':''}</small></>:<span>En attente d'un joueur...</span>}
        </div>;})}</div>
      {room.status==='proposed'?<div className="mono-online-vote" role="status">
        <strong>🔔 Proposition : commencer a {room.proposal.count} joueurs</strong>
        <p>{votesCount}/{members.length} accords. Tu peux accepter ou continuer d'attendre.</p>
        {vote===true?<p>Ton accord est enregistre. En attente des autres joueurs.</p>:<div className="mono-online-actions">
          <button type="button" className="btn btn--primary" disabled={busy} onClick={()=>update(()=>api.vote(room.id,true))}>✓ Commencer</button>
          <button type="button" className="btn" disabled={busy} onClick={()=>update(()=>api.vote(room.id,false))}>Attendre d'autres joueurs</button>
        </div>}
        {isHost&&<button type="button" className="btn btn--sm" disabled={busy} onClick={()=>update(()=>api.vote(room.id,false))}>Annuler la proposition</button>}
      </div>:<>
        <p>{members.length===room.maxPlayers?'Salon complet : le createur peut proposer le depart.':`Encore ${room.maxPlayers-members.length} place(s) possible(s).`}</p>
        {isHost&&members.length>=minPlayers&&<button type="button" className="btn btn--primary" disabled={busy}
          onClick={()=>update(()=>api.propose(room.id,members.length))}>Proposer de commencer a {members.length}</button>}
      </>}
      <div className="mono-online-actions"><button type="button" className="btn" disabled={busy} onClick={()=>update(()=>api.leave(room.id))}>{isHost?'Fermer le salon':'Quitter le salon'}</button></div>
    </div>:<>
      <form className="mono-online-create" onSubmit={onCreate}>
        <h4>Creer un salon</h4><label>Places maximum
          <select value={maxPlayers} onChange={e=>setMaxPlayers(Number(e.target.value))}>
            <option value={2}>2 joueurs</option><option value={3}>3 joueurs</option><option value={4}>4 joueurs</option>
          </select></label>
        <label>Mise par joueur (F CFA)<input type="text" inputMode="numeric" required pattern="[0-9]+"
          value={stake} maxLength={7} onChange={e=>setStake(e.target.value.replace(/\D/g,'').slice(0,7))}/></label>
        <p>La partie demarre seulement avec l'accord des joueurs. Le gagnant recoit les mises du salon.</p>
        <button type="submit" className="btn btn--primary" disabled={busy}>Creer mon salon</button>
      </form>
      <div className="mono-online-directory"><div className="mono-online-heading"><h4>Salons disponibles</h4>
        <button className="btn btn--sm" type="button" onClick={()=>void refresh()}>Actualiser</button></div>
        {rooms.length===0?<p>Aucun salon ouvert pour l'instant.</p>:rooms.map(r=><div className="mono-online-listitem" key={r.id}>
          <span><strong>#{r.code} · {r.host}</strong><small>{r.present}/{r.maxPlayers} joueurs · {francs(r.stake)}</small></span>
          <button type="button" className="btn btn--sm" disabled={busy||r.status!=='waiting'||r.present>=r.maxPlayers}
            onClick={()=>void watchRoom(r.id)}>Rejoindre</button>
        </div>)}
      </div>
    </>}
  </section>;
}
