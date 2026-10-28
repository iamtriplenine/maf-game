// Qualifications : reutilisation du plateau, des commandes, des cameras et des animations Monopoly.
// La preuve de presence est un POST serveur ; consulter une annonce n'inscrit personne comme present.
import {useCallback,useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {BoardMatch} from './MonopolyOnline';
import {myQualification,qualificationAction,qualificationPresence} from '../api/tournamentLive';
import '../styles/duel-fullscreen.css';
import '../styles/tournament-qualification.css';
const formatSeconds=s=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
export default function TournamentQualificationMatch({session}){
 const [info,setInfo]=useState(null),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[now,setNow]=useState(Date.now());
 const [notified,setNotified]=useState(false),[clockOffset,setClockOffset]=useState(0);
 const busyRef=useRef(false),noticeRef=useRef(null);
 const refresh=useCallback(async()=>{
  try{
   const next=await myQualification();
   setInfo(next.match||null);
   if(Number.isFinite(next.serverNow))setClockOffset(next.serverNow-Date.now());
   if(next.match && next.match.id!==noticeRef.current){
    noticeRef.current=next.match.id;
    setNotified(true);
    if(next.match.lobbyStatus==='waiting' && document.visibilityState==='visible' && 'Notification' in window && Notification.permission==='granted'){
      try{new Notification('Tournoi Monopoly : ton plateau est pret',{body:`${next.match.title} - plateau ${next.match.table}. Rejoins les joueurs sous cinq minutes.`});}catch{/* navigateur sans notifications */}
    }
   }
  }catch(e){if(e.status!==403)setError(e.message);}
 },[]);
 useEffect(()=>{if(!session?.id){setInfo(null);return;}void refresh();const timer=setInterval(()=>{if(!document.hidden)void refresh();},3000);return()=>clearInterval(timer);},[session?.id,refresh]);
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 useEffect(()=>{
   if(!open||!info?.id)return;
   const id=info.id;
   const ping=()=>{if(!document.hidden)void qualificationPresence(id,'here').then(refresh).catch(e=>setError(e.message));};
   ping();const timer=setInterval(ping,10000);
   const resume=()=>{if(!document.hidden)ping();};
   document.addEventListener('visibilitychange',resume);
   return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',resume);
     // Le serveur constatera l'absence meme si ce message n'arrive pas.
     void qualificationPresence(id,'away').catch(()=>{});};
 },[open,info?.id,refresh]);
 useEffect(()=>{if(!open)return;const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=previous;};},[open]);
 const match=info?.state;
 const game=match?.game;
 const winnerSeat=Number.isInteger(game?.winner)?game.winner:-1;
 const room=game?{
  id:`qualification-${info.id}`,code:`Plateau ${info.table}`,
  status:game.phase==='over'?'finished':'playing',
  players:match.seats.map((p,i)=>({id:Number(p.clientId),name:p.name,seat:i})),
  game,stake:500,payout:0,winModeAvailable:false,
  winnerId:winnerSeat>=0?Number(match.seats[winnerSeat]?.clientId):null,
 }:null;
 const deadline=Date.parse(info?.deadlineAt||'');
 const seconds=Number.isFinite(deadline)?Math.max(0,Math.ceil((deadline-now-clockOffset)/1000)):0;
 const waiting=info?.lobbyStatus==='waiting';
 const attention=info?.lobbyStatus==='attention';
 const send=async run=>{
  if(busyRef.current||waiting||attention)return false;
  busyRef.current=true;setBusy(true);setError('');
  try{await run();await refresh();return true;}catch(e){setError(e.message);await refresh();return false;}
  finally{busyRef.current=false;setBusy(false);}
 };
 if(!session?.id||!info)return null;
 return <>
  <div className="tourney-qualification-invite" role="status">
    <strong>{notified?'🔔 ':''}{info.title} · Plateau {info.table}</strong>
    <span>{waiting?`Départ en préparation · ${info.joinedCount}/${info.totalCount} joueurs présents`:
      attention?'Aucun joueur arrivé dans le délai : intervention nécessaire':
      game?.phase==='over'?'Qualification terminée':'Ta qualification est en cours'}</span>
    {typeof window!=='undefined' && 'Notification' in window && Notification.permission==='default'&&<button type="button" className="tourney-notifications" onClick={()=>void Notification.requestPermission()}>Activer les alertes du navigateur</button>}
    <button type="button" className="tourney-cta" onClick={()=>{setOpen(true);setNotified(false);setError('');}}>🎲 {waiting?'Rejoindre mon plateau':'Ouvrir mon plateau'}</button>
  </div>
  {open&&createPortal(<div className="maf-duel-fullscreen mono-online mono-online--playing maf-qualification-fullscreen" role="dialog" aria-modal="true" aria-label="Monopoly - qualification de tournoi">
    <header className="maf-duel-fullscreen__head"><strong>🏆 {info.title} · Qualification, plateau {info.table}</strong>
      <button type="button" className="btn btn--sm" onClick={()=>setOpen(false)}>✕ Quitter l'écran</button></header>
    {error&&<p role="alert" className="tourney-error">{error}</p>}
    {room?<div className="maf-qualification-board">
      <BoardMatch room={room} session={session} busy={busy||waiting||attention} send={send}
        tournamentKind="qualification"
        tournamentAction={(action,square)=>qualificationAction(info.id,info.revision,action,square)}/>
      {(waiting||attention)&&<div className="maf-qualification-countdown" role="status" aria-live="polite">
        <div className="maf-qualification-countdown__inner"><strong>En attente des participants</strong>
          <span className="maf-qualification-countdown__time">{attention?'—':formatSeconds(seconds)}</span>
          <p>{info.joinedCount} / {info.totalCount} joueurs présents</p>
          <p>{attention?'Aucun joueur ne s’est présenté : le tournoi nécessite une intervention.':
            info.waitingFor?.length?`En attente de : ${info.waitingFor.join(', ')}`:'Tous les joueurs sont arrivés. Le plateau démarre.'}</p>
          <small>{attention?'Aucune récompense attribuée automatiquement.':'À 00:00, les absents déclarent forfait. Les autres pourront jouer.'}</small>
        </div>
      </div>}
    </div>:<p className="maf-duel-fullscreen__waiting">Chargement du plateau…</p>}
  </div>,document.body)}
 </>;
}
