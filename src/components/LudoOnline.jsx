import { useCallback,useEffect,useRef,useState } from 'react';
import { mountLudoGame } from '../games/ludo/engine';
import frame from '../games/ludo/frame.html?raw';
import '../styles/ludo-online.css';

// MAF_LUDO_STAGE4 : ne charge qu'un duel déjà accepté depuis les Salons MAF.
export default function LudoOnline({room,match,busy,error,onStart,onRoll,onMove,onForfeit,onExit}) {
  const [boardReady,setBoardReady]=useState(false);
  const disposer=useRef(null);
  const state=useRef(match);
  const busyRef=useRef(busy);
  const handlers=useRef({onRoll,onMove});
  state.current=match;busyRef.current=busy;handlers.current={onRoll,onMove};
  const cleanup=useCallback(()=>{disposer.current?.();disposer.current=null;setBoardReady(false);},[]);
  useEffect(()=>()=>{disposer.current?.();disposer.current=null;},[]);
  useEffect(()=>{disposer.current?.sync?.(match);},[match]);
  const load=useCallback((e)=>{
    disposer.current?.();
    try{
      disposer.current=mountLudoGame(e.currentTarget.contentDocument,e.currentTarget.contentWindow,{
        mode:'online',initialState:state.current,humanColor:'red',
        busy:()=>busyRef.current,onRoll:()=>handlers.current.onRoll?.(),
        onMove:index=>handlers.current.onMove?.(index),
      });
      setBoardReady(true);
    }catch(err){setBoardReady(false);console.error('Ludo 3D:',err);}
  },[]);
  const viewer=match?.viewer;
  const mine=viewer&&match?.toMove===viewer;
  const finished=room.status==='finished'||match?.finished;
  return <div className="ludo-online" role="region" aria-label="Duel Ludo 3D en ligne">
    <header className="ludo-online__header"><strong>🎲 Duel Ludo 3D · Salon {room.code}</strong><span>{room.host?.pseudo} contre {room.guest?.pseudo}</span></header>
    {room.status==='ready'? <div className="ludo-online__actions">
      <p>Les deux joueurs sont prêts. Le créateur peut lancer le duel.</p>
      {room.is_host?<button className="btn btn--primary" disabled={busy} onClick={onStart}>Commencer le duel</button>:<p>Le créateur va lancer le match.</p>}
    </div>: <>
      <div className="ludo-online__state" role="status" aria-live="polite">
        {finished?match?.winner===viewer?'🏆 Victoire !':'Partie terminée':mine?
          match?.roll!=null?`À toi : dé ${match.roll}, choisis un pion.`:'À toi de lancer le dé.':'Tour de ton adversaire.'}
        {match?.lastAction&&<small>{match.lastAction}</small>}
      </div>
      {error&&<p role="alert" className="ludo-online__error">{error}</p>}
      <iframe title="Duel Ludo 3D" srcDoc={frame} className="ludo-online__frame" onLoad={load}/>
      {!boardReady&&<p role="status">Chargement du plateau 3D…</p>}
    </>}
    <div className="ludo-online__actions">
      <button type="button" className="btn btn--ghost" disabled={busy} onClick={()=>{cleanup();onExit?.();}}>Quitter l’écran</button>
      {room.status==='playing'&&<button type="button" className="btn btn--outline" disabled={busy} onClick={()=>{
        if(window.confirm('Abandonner le duel et perdre ta mise ?'))onForfeit?.();
      }}>Abandonner</button>}
    </div>
  </div>;
}
