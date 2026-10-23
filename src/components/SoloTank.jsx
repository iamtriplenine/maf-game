import { useEffect, useMemo, useState } from 'react';
import TankArena from './TankArena';
import { beginWinSoloMatch, finishWinSoloMatch } from '../utils/winMode';
import { tankInitial, tankFire } from '../api/tankEngine';

const cloned = x => JSON.parse(JSON.stringify(x));
function chooseBotShot(state) {
  // Cherche un tir balistique pertinent, sans tricher ni lire les touches du joueur.
  let best = {weapon:'shell',angle:47,power:70,drive:0};
  let bestScore=-Infinity;
  for(const weapon of ['shell','heavy','stone','direct','sky']) {
    if(state.tanks.guest.ammo[weapon]===0) continue;
    for(const angle of [18,26,36,44,52,60,70]) for(const power of [40,55,70,85,100]) {
      const copy=cloned(state);
      try {
        tankFire(copy,'guest',{weapon,angle,power,drive:0});
        const score = (state.tanks.host.hp-copy.tanks.host.hp) - .7*(state.tanks.guest.hp-copy.tanks.guest.hp);
        if(score>bestScore) {bestScore=score;best={weapon,angle,power,drive:0};}
      } catch { /* tir candidat invalide */ }
    }
  }
  return best;
}
export default function SoloTank() {
  const [started,setStarted]=useState(false);
  const [game,setGame]=useState(()=>tankInitial(217));
  const [busy,setBusy]=useState(false);
  const [launching,setLaunching]=useState(false);
  useEffect(()=>()=>finishWinSoloMatch('tank'),[]);
  useEffect(()=>{if(game.finished)finishWinSoloMatch('tank');},[game.finished]);
  useEffect(()=> {
    if(!started || game.finished || game.toMove!=='guest')return undefined;
    setBusy(true);
    const id=setTimeout(()=>{
      setGame(previous=>{
        if(previous.finished || previous.toMove!=='guest')return previous;
        const next=cloned(previous);
        tankFire(next,'guest',chooseBotShot(next));
        return next;
      });
      setBusy(false);
    },1300);
    return ()=>{clearTimeout(id);setBusy(false);};
  },[started,game]);
  const match=useMemo(()=>({...game,viewer:'host',myTurn:game.toMove==='host'&&!game.finished,
    serverNow:Date.now(),moveDeadline:null,returnDeadline:null,opponentReturnDeadline:null}),[game]);
  const room=useMemo(()=>({id:0,code:'SOLO',game:'tank',is_host:true,
    status:game.finished?'finished':'playing',host:{pseudo:'Toi'},guest:{pseudo:'Robot'}}),[game.finished]);
  const reset=async()=>{
    if (launching) return;
    setLaunching(true);
    try {
      finishWinSoloMatch('tank');
      await beginWinSoloMatch('tank');
      setGame(tankInitial(Math.floor(Date.now()/1000)));
      setStarted(true);setBusy(false);
    } finally {setLaunching(false);}
  };
  if(!started)return <button className="btn btn--sm btn--block" type="button" disabled={launching} onClick={()=>{void reset();}}>{launching?'Ouverture…':'🚀 Jouer contre le robot'}</button>;
  return <TankArena room={room} match={match} busy={busy}
    onFire={shot=>{setGame(previous=>{if(previous.finished || previous.toMove!=='host')return previous;
      const next=cloned(previous);tankFire(next,'host',shot);return next;});}}
    onForfeit={()=>{finishWinSoloMatch('tank');setStarted(false);}} onExit={()=>{finishWinSoloMatch('tank');setStarted(false);}} onBack={()=>{finishWinSoloMatch('tank');setStarted(false);}}/>;
}
