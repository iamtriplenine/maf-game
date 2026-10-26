import {useEffect,useRef,useState} from 'react';
import {CAMERA_LEAD,planTravel} from './pawnMotion';
import {playSound,soundForEvent,soundIsMuted,setSoundMuted,unlockSound} from './sounds';
export default function useMonopolySounds(game,travel){
 const [muted,setMuted]=useState(soundIsMuted);
 const moneyTimers=useRef(new Set());
 const seen=useRef({seq:game?.seq||0,positions:game?.players.map(p=>p.location)||[]});
 useEffect(()=>{
  const unlock=()=>unlockSound();
  document.addEventListener('pointerdown',unlock,true);document.addEventListener('keydown',unlock,true);
  if(navigator.userActivation?.hasBeenActive)unlock();
  return()=>{document.removeEventListener('pointerdown',unlock,true);document.removeEventListener('keydown',unlock,true);};
 },[]);
 useEffect(()=>{
  if(!travel||muted)return undefined;
  let elapsed=CAMERA_LEAD;const timers=[];
  for(const duration of travel.durations){
   const delay=Math.max(0,travel.start+elapsed-performance.now());
   timers.push(setTimeout(()=>playSound('step'),delay));elapsed+=duration;
  }
  return()=>timers.forEach(clearTimeout);
 },[travel,muted]);
 useEffect(()=>{
  if(muted){moneyTimers.current.forEach(clearTimeout);moneyTimers.current.clear();}
  return()=>{moneyTimers.current.forEach(clearTimeout);moneyTimers.current.clear();};
 },[muted]);
 useEffect(()=>{
  if(!game)return undefined;
  const previous=seen.current;
  const fresh=game.log.filter(e=>e.n>previous.seq).sort((a,b)=>a.n-b.n);
  seen.current={seq:game.seq,positions:game.players.map(p=>p.location)};
  if(muted)return undefined;
  const roll=fresh.find(e=>e.kind==='roll');
  const moving=roll&&game.lastRoll&&previous.positions[roll.player]!==undefined;
  const delay=moving?CAMERA_LEAD+planTravel(previous.positions[roll.player],game.players[roll.player].location,game.lastRoll.total).moveDuration:0;
  const kinds=fresh.map(soundForEvent).filter(Boolean);
  kinds.forEach((kind,index)=>{const timer=setTimeout(()=>{moneyTimers.current.delete(timer);playSound(kind);},delay+index*320);moneyTimers.current.add(timer);});
 },[game?.seq,muted]);
 return {muted,toggle:()=>{const next=!soundIsMuted();setSoundMuted(next);setMuted(next);if(!next)unlockSound();}};
}
