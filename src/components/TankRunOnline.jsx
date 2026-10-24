import { useEffect, useRef, useState } from 'react';
import { render, buildBackground } from './TankRun/render';
import { getTankRunSnapshot, sendTankRunInput, setTankRunSetup } from '../api/tankrun';
import './TankRun/TankBattle.css';
import './TankRunOnline.css';

const AMMUNITION = ['standard','rapide','lourd','explosif','ricochet'];
const LAND = ['original','desert','usine'];
const LABELS = {original:'Original',desert:'Désert',usine:'Usine'};
const SKINS = ['origine','spectre','titan'];
const SKIN_LABELS = {origine:'Classique',spectre:'Spectre',titan:'Titan'};

export default function TankRunOnline({room,match,onStart,onExit,onForfeit,busy}){
  const [terrain,setTerrain] = useState('original');
  const [skin,setSkin] = useState('origine');
  const [saving,setSaving] = useState(false);
  const [message,setMessage] = useState('');
  const [orientation,setOrientation] = useState('portrait');
  const [ammo,setAmmo] = useState('standard');
  const [state,setState] = useState(null);
  const snapshotRef=useRef(null);
  const prevRef=useRef(null);
  const canvasRef=useRef(null);
  const wrapRef=useRef(null);
  const pointer=useRef(null);
  const pressed=useRef(false);
  const busyPoll=useRef(false);
  const viewer=room.is_host?'host':'guest';
  const own=(room.tankrun_setup||{})[viewer];
  const opponent=(room.tankrun_setup||{})[viewer==='host'?'guest':'host'];
  const latestAmmo=useRef(ammo);
  const sequence=useRef(0);
  const epoch=useRef('tankrun-'+Date.now()+'-'+Math.random().toString(36).slice(2));
  latestAmmo.current=ammo;
  const active=room.status==='playing' || room.status==='finished';
  const finishedWinner=room.status==='finished'?match?.winner:state?.winner;

  useEffect(()=>{
    if(!active || room.status==='finished')return undefined;
    let running=true;
    const poll=async()=>{
      if(busyPoll.current)return;
      busyPoll.current=true;
      try{
        const next=await getTankRunSnapshot(room.id);
        if(!running)return;
        if(next.finished){setState(next);return}
        prevRef.current=snapshotRef.current;
        snapshotRef.current={...next,at:performance.now()};
        setState({phase:next.phase,winner:next.winner});
        setMessage('');
      }catch(e){if(running)setMessage(e.message)}
      finally{busyPoll.current=false}
    };
    void poll(); const interval=window.setInterval(poll,100);
    return ()=>{running=false;clearInterval(interval)};
  },[room.id,room.status,active]);

  useEffect(()=>{
    if(!active || !canvasRef.current || !wrapRef.current)return undefined;
    const canvas=canvasRef.current,wrap=wrapRef.current,ctx=canvas.getContext('2d');
    if(!ctx)return undefined;
    const view={W:0,H:0,dpr:1,scale:1,ox:0,oy:0,bg:null,humans:0};
    let oldArena='';
    const resize=()=>{
      const b=wrap.getBoundingClientRect();if(!b.width||!b.height)return;
      view.W=b.width;view.H=b.height;view.dpr=Math.min(window.devicePixelRatio||1,2.5);
      canvas.width=Math.round(b.width*view.dpr);canvas.height=Math.round(b.height*view.dpr);
      view.scale=Math.min(b.width/800,b.height/480)*0.97;
      view.ox=(b.width-800*view.scale)/2;view.oy=(b.height-480*view.scale)/2;
      oldArena='';
    };
    const obs=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;
    obs?.observe(wrap);window.addEventListener('resize',resize);resize();
    let raf=0;
    const frame=()=>{
      const snap=snapshotRef.current;
      if(snap&&view.W){
        const prev=prevRef.current;
        const delay=Math.min(1,Math.max(0,(performance.now()-snap.at)/120));
        // Interpolation de l'affichage uniquement; seul le serveur calcule les collisions.
        let scene=snap;
        if(prev?.tanks?.length===snap.tanks?.length){
          scene={...snap,tanks:snap.tanks.map((t,i)=>{
            const old=prev.tanks[i];
            return {...t,px:old.x,py:old.y,pangle:old.angle,
              x:old.x+(t.x-old.x)*delay,y:old.y+(t.y-old.y)*delay,
              angle:old.angle+Math.atan2(Math.sin(t.angle-old.angle),Math.cos(t.angle-old.angle))*delay};
          })};
        }
        const arenaId=scene.arena?.id||'original';
        if(arenaId!==oldArena){view.bg=buildBackground(scene,view.scale,view.dpr);oldArena=arenaId}
        render(ctx,scene,view,1);
      }
      raf=requestAnimationFrame(frame);
    };
    raf=requestAnimationFrame(frame);
    return ()=>{cancelAnimationFrame(raf);obs?.disconnect();window.removeEventListener('resize',resize)};
  },[active,room.id]);

  const send=(down,selected=latestAmmo.current)=>{
    void sendTankRunInput(room.id,{down,ammo:selected,seq:++sequence.current,epoch:epoch.current}).catch(e=>setMessage(e.message));
  };
  const handleDown=e=>{
    if(room.status!=='playing'||pointer.current!==null||e.target.closest?.('[data-ui]'))return;
    pointer.current=e.pointerId;pressed.current=true;
    try{e.currentTarget.setPointerCapture(e.pointerId)}catch{/* pass */}
    send(true);
  };
  const handleUp=e=>{
    if(pointer.current!==e.pointerId)return;
    pointer.current=null;pressed.current=false;send(false);
  };
  useEffect(()=>{
    const stop=()=>{if(pressed.current){pressed.current=false;pointer.current=null;send(false)}};
    window.addEventListener('blur',stop);
    const visibility=()=>{if(document.hidden)stop()};
    document.addEventListener('visibilitychange',visibility);
    return ()=>{stop();window.removeEventListener('blur',stop);document.removeEventListener('visibilitychange',visibility)};
  },[room.id]);

  if(room.status==='ready')return (
    <section className="tr-prep" aria-label="Préparation du duel Tank Run">
      <h3>Tank Run · préparation</h3>
      <p>Choisis ton char et propose un terrain. Chaque joueur décide pour lui-même.</p>
      <label>Mon char
        <select value={skin} onChange={e=>setSkin(e.target.value)}>{SKINS.map(k=><option key={k} value={k}>{SKIN_LABELS[k]}</option>)}</select>
      </label>
      <label>Terrain proposé
        <select value={terrain} onChange={e=>setTerrain(e.target.value)}>{LAND.map(k=><option key={k} value={k}>{LABELS[k]}</option>)}</select>
      </label>
      <button disabled={saving||busy} onClick={async()=>{
        setSaving(true);setMessage('');
        try{await setTankRunSetup(room.id,{arena:terrain,skin});setMessage('Choix envoyé. Attends la confirmation de ton adversaire.');}
        catch(e){setMessage(e.message)}finally{setSaving(false)}
      }}>Enregistrer mon choix</button>
      <p>Toi : {own?`${SKIN_LABELS[own.skin]} · ${LABELS[own.arena]}`:'en attente'}<br/>
         Adversaire : {opponent?`${SKIN_LABELS[opponent.skin]} · ${LABELS[opponent.arena]}`:'en attente'}.</p>
      {own&&opponent&&room.is_host&&<button disabled={busy} onClick={onStart}>Lancer le duel</button>}
      {own&&opponent&&!room.is_host&&<p>Le créateur peut lancer le duel.</p>}
      {message&&<p role="status">{message}</p>}
      <button onClick={onExit}>Retour au salon</button>
    </section>
  );

  return <div className={`tb-root tb-fixed tr-root tr-${orientation}`} ref={wrapRef}
    onPointerDown={handleDown} onPointerUp={handleUp} onPointerCancel={handleUp}
    onContextMenu={e=>e.preventDefault()}>
    <canvas ref={canvasRef} className="tb-canvas" />
    <button data-ui className="tr-rotate" onClick={()=>setOrientation(o=>o==='portrait'?'landscape':'portrait')}>⤾ {orientation==='portrait'?'Horizontal':'Vertical'}</button>
    <div data-ui className="tr-hud">
      <button className="tr-exit" onClick={onExit}>← Sortir</button>
      <div className="tr-ammo">{AMMUNITION.map(a=><button type="button" key={a} className={ammo===a?'is-active':''}
        onClick={()=>{setAmmo(a);if(!pressed.current)send(false,a)}}>{a}</button>)}</div>
      {room.status==='playing'&&<button data-ui className="tr-forfeit" onClick={()=>{
        if(window.confirm('Abandonner le match ?'))onForfeit();
      }}>Abandonner</button>}
    </div>
    {message&&<p className="tr-net-status" role="status">{message}</p>}
    {(room.status==='finished'||state?.finished) && <div data-ui className="tb-overlay tb-over"><div className="tb-card">
      <h2 className="tb-win">{finishedWinner===viewer?'Victoire !':finishedWinner==null?'Égalité':'Défaite'}</h2>
      <button className="tb-play" onClick={onExit}>Retour au salon</button>
    </div></div>}

  </div>;
}
