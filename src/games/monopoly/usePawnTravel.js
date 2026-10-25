import { useEffect, useRef, useState } from 'react';
import { planTravel } from './pawnMotion';
const rollKey=g=>g?.lastRoll?`${g.turn}:${g.current}:${g.lastRoll.dice.join(',')}`:'';
export default function usePawnTravel(game) {
 const players=game?.players||[],target=players.map(p=>p.location).join(',');
 const [shown,setShown]=useState(()=>players.map(p=>p.location));
 const [travel,setTravel]=useState(null);
 const current=useRef(shown),seenRoll=useRef(rollKey(game));
 const key=rollKey(game);
 useEffect(()=>{
  const goal=target?target.split(',').map(Number):[];
  if(current.current.length!==goal.length||(game?.turn===1&&!game?.lastRoll&&goal.every(p=>p===0))){current.current=goal;setShown(goal);setTravel(null);seenRoll.current=key;return undefined;}
  const newRoll=!!key&&key!==seenRoll.current;seenRoll.current=key;
  let index=goal.findIndex((p,i)=>p!==current.current[i]);
  if(index<0&&newRoll)index=game.current;
  if(index<0)return undefined;
  const before=current.current.slice();
  const plan=planTravel(before[index],goal[index],newRoll?game.lastRoll.total:null);
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){current.current=goal;setShown(goal);setTravel(null);return undefined;}
  const next={...plan,index,start:performance.now(),key:`${target}:${key}`};
  setShown(before);setTravel(next);
  const timeout=setTimeout(()=>{current.current=goal;setShown(goal);setTravel(null);},plan.duration);
  return()=>clearTimeout(timeout);
 },[target,key,players.length]); // presentation declenchee par deplacement/lancer uniquement
 const pending=shown.length===players.length&&players.some((p,i)=>p.location!==shown[i]);
 return{shown:shown.length===players.length?shown:players.map(p=>p.location),travel,walking:!!travel||pending};
}
