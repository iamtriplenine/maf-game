import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { TANK_WEAPONS, tankSurface } from '../api/tankEngine';
import { WeaponIcon, WeaponShape, WEAPON_INFO } from './TankWeaponArt';
import '../styles/tank-arena.css';

const clamp = (n, a, b) => Math.max(a, Math.min(b,n));
const FLIGHT = .7;          // part de l'animation consacree au vol (le reste = explosion)
const SHOT_MS = 1900;       // duree totale de l'animation d'un tir
const VIEW = '0 6 100 90';  // zone visible de la scene (sans deformation)
const timeLeft = (deadline, serverNow, receivedAt, now) => deadline == null ? null
  : Math.max(0, Math.ceil((deadline - serverNow - (now - receivedAt)) / 1000));
const other = side => side === 'host' ? 'guest' : 'host';
const EMOTES = [['laugh','😂'],['smirk','😏'],['clap','👏']];
const sideName = (room,side) => side === 'host' ? room?.host?.pseudo || 'Blanc' : room?.guest?.pseudo || 'Noir';
const terrainPath = terrain => !Array.isArray(terrain) ? ''
  : `M 0 ${terrain[0]} ` + terrain.slice(1).map((y,x)=>`L ${x+1} ${y}`).join(' ')+ ' L 100 101 L 0 101 Z';

function Blast({x,y,radius,t}) {
  const ease = 1 - (1 - t) ** 3;
  const r = radius * (.35 + .75 * ease);
  const fade = Math.max(0, 1 - t * t);
  return <g pointerEvents="none" opacity={fade}>
    <circle cx={x} cy={y} r={r * 1.15} fill="#ff6a2b" opacity=".55"/>
    <circle cx={x} cy={y} r={r * .8} fill="#ffb13d"/>
    <circle cx={x} cy={y} r={r * .45} fill="#fff1a8"/>
    {Array.from({length:10},(_,k)=>{const a=k*Math.PI/5;
      return <line key={k} x1={x+Math.cos(a)*r*.9} y1={y+Math.sin(a)*r*.9}
        x2={x+Math.cos(a)*r*(1.3+.35*(k%2))} y2={y+Math.sin(a)*r*(1.3+.35*(k%2))}
        stroke="#ffd36a" strokeWidth=".6" strokeLinecap="round"/>;})}
    <circle cx={x} cy={y - r * ease * .9} r={r * .5 * ease} fill="#3a3f45" opacity={.35 * fade}/>
  </g>;
}

function TankDrawing({tank,terrain,side,isMe,angle=20}) {
  if (!tank || !terrain) return null;
  const x = tank.x, y = tankSurface(terrain,x)-3.6;
  const direction = side === 'host' ? 1 : -1;
  const cannonAngle = clamp(angle,0,89) * Math.PI / 180;
  const cx = direction * 6.8 * Math.cos(cannonAngle);
  const cy = -1.7 - 6.8 * Math.sin(cannonAngle);
  return <g className={`tank-tank ${side}`} transform={`translate(${x},${y})`}>
    <ellipse cx="0" cy="2" rx="4.8" ry="1.3" fill="#18242c" opacity=".4"/>
    <rect x="-4.5" y="-.5" width="9" height="2.8" rx="1.2" fill={side === 'host' ? '#338f81' : '#bd654d'} stroke="#16242b" strokeWidth=".5"/>
    {[-2.7,0,2.7].map(n=><circle key={n} cx={n} cy="1.7" r=".95" fill="#222e36" stroke="#d9d3a5" strokeWidth=".4"/>)}
    <rect x="-2.2" y="-2.7" width="4.4" height="2.5" rx="1" fill={side === 'host' ? '#67dbb4' : '#f2a471'} stroke="#17363b" strokeWidth=".5"/>
    <line x1={direction*.3} y1="-1.7" x2={cx} y2={cy} stroke="#192a32" strokeWidth="2.2" strokeLinecap="round"/>
    <line x1={direction*.3} y1="-1.7" x2={cx} y2={cy} stroke={side==='host'?'#86e8bf':'#f7ba8c'} strokeWidth="1"/>
    {isMe && <path d="M -2 -8 L 0 -5.5 L 2 -8" fill="none" stroke="#fff2a1" strokeWidth=".8"/>}
  </g>;
}

export default function TankArena({room,match,busy=false,error='',onExit,onBack,onStart,onFire,onForfeit,onDraw,onReact}) {
  const viewer=match?.viewer || (room?.is_host ? 'host':'guest');
  const finished=match?.finished || room?.status==='finished';
  const [angle,setAngle]=useState(48);
  const [power,setPower]=useState(75);
  const [drive,setDrive]=useState(0);
  const [weapon,setWeapon]=useState('shell');
  const [confirmExit,setConfirmExit]=useState(false);
  const [drawConfirm,setDrawConfirm]=useState(false);
  const [now,setNow]=useState(Date.now);
  const [receivedAt,setReceivedAt]=useState(Date.now);
  const [animation,setAnimation]=useState(null);
  const [reaction,setReaction]=useState(null);
  const timers=useRef([]);
  const started=useRef(null);
  const svgRef=useRef(null);
  const solo=room?.id===0;
  const active=room?.status==='playing' && !!match;
  const canPlay=active && match.myTurn && !busy && !finished && !match.returnDeadline && !animation;
  const motion=animation?.progress ?? null;
  const shot=animation?.shot;
  const flight=motion==null?0:Math.min(1,motion/FLIGHT);
  const boom=motion==null?0:clamp((motion-FLIGHT)/(1-FLIGHT),0,1);
  const exploded=!!animation && motion>=FLIGHT;
  const displayTerrain=animation && !exploded ? animation.beforeTerrain : match?.terrain;
  const displayTanks=animation?.beforeTanks || match?.tanks;
  const shotIndex=shot?Math.min(shot.points.length-1,Math.floor(flight*(shot.points.length-1))):0;
  const shotPoint=shot?.points?.[shotIndex];
  const shotPrev=shot?.points?.[Math.max(0,shotIndex-1)];
  const shotDeg=shotPoint&&shotPrev&&(shotPoint.x!==shotPrev.x||shotPoint.y!==shotPrev.y)
    ?Math.atan2(shotPoint.y-shotPrev.y,shotPoint.x-shotPrev.x)*180/Math.PI:(viewer==='host'?-30:-150);
  const players=useMemo(()=>[['host',room?.host?.pseudo||'Joueur 1'],['guest',room?.guest?.pseudo||'Joueur 2']], [room?.host?.pseudo,room?.guest?.pseudo]);
  const ownName=sideName(room,viewer);
  const drawOffer=match?.drawOffer;
  const ownDeadline=timeLeft(match?.returnDeadline,match?.serverNow,receivedAt,now);
  const rivalDeadline=timeLeft(match?.opponentReturnDeadline,match?.serverNow,receivedAt,now);
  const moveDeadline=timeLeft(match?.moveDeadline,match?.serverNow,receivedAt,now);
  useEffect(()=> {const id=setInterval(()=>setNow(Date.now()),500);return ()=>clearInterval(id);},[]);
  useEffect(()=> {setReceivedAt(Date.now());},[match?.serverNow]);
  useEffect(()=> {setDrive(0);setDrawConfirm(false);},[match?.round,match?.drawOffer]);
  const weaponLeft=match?.tanks?.[viewer]?.ammo?.[weapon];
  useEffect(()=> {if(weaponLeft===0)setWeapon('shell');},[weaponLeft]);
  useEffect(()=> {
    if(!match?.lastShot || match?.round == null) return;
    const key = `${room?.id}:${match.round}`;
    if (started.current === null) {started.current=key;return;}
    if(started.current===key) return;
    started.current=key;
    const last=match.lastShot;
    if(!last.beforeTerrain || !last.beforeTanks) return;
    setAnimation({beforeTerrain:last.beforeTerrain,beforeTanks:last.beforeTanks,shot:last,progress:0});
    let frame=0;
    const start=performance.now();
    const tick=(time)=>{
      const p=Math.min(1,(time-start)/SHOT_MS);
      setAnimation(current=> current?.shot?.at===last.at ? {...current,progress:p}:current);
      if(p<1) frame=requestAnimationFrame(tick);
      else setAnimation(current=>current?.shot?.at===last.at?null:current);
    };
    frame=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(frame);
  },[match?.round,match?.lastShot?.at,room?.id]);
  useEffect(()=>{
    const emote=match?.emote;
    if(!emote?.id || Date.now()-(emote.at||0)>4800)return;
    setReaction({id:emote.id,side:emote.side,icon:EMOTES.find(([kind])=>kind===emote.kind)?.[1]||'✨'});
    const id=setTimeout(()=>setReaction(old=>old?.id===emote.id?null:old),1750);
    timers.current.push(id);
    return ()=>clearTimeout(id);
  },[match?.emote?.id]);
  useEffect(()=>()=>timers.current.forEach(clearTimeout),[]);
  const aimWithPointer=e=>{
    if(!canPlay || !svgRef.current || !match.tanks?.[viewer])return;
    const ctm=svgRef.current.getScreenCTM();
    if(!ctm)return;
    const pt=svgRef.current.createSVGPoint();
    pt.x=e.clientX;pt.y=e.clientY;
    const local=pt.matrixTransform(ctm.inverse());
    const px=local.x;
    const py=local.y;
    const x=match.tanks[viewer].x+drive;
    const y=tankSurface(match.terrain,x)-4;
    const dir=viewer==='host'?1:-1;
    const dx=(px-x)*dir;
    const dy=y-py;
    setAngle(Math.round(clamp(Math.atan2(Math.max(0,dy),Math.max(.2,dx))*180/Math.PI,0,89)));
    setPower(Math.round(clamp(Math.hypot(dx,dy)*1.5,20,100)));
  };
  const sendEmote=kind=>{
    if(!active || finished)return;
    if(solo){const id='local-'+Date.now();setReaction({id,side:viewer,icon:EMOTES.find(x=>x[0]===kind)?.[1]});
      timers.current.push(setTimeout(()=>setReaction(old=>old?.id===id?null:old),1700));}
    else onReact?.(kind);
  };
  const fire=()=>{if(canPlay)onFire?.({weapon,angle,power,drive});};
  if(room?.status==='ready')return <div className="tank-ready">
    <strong>🚀 TANK BATTLE</strong><p>Deux chars, des missiles et un terrain destructible. Le créateur lance le combat.</p>
    {room.is_host ? <button className="btn btn--primary" type="button" disabled={busy} onClick={onStart}>Démarrer le combat</button> : <p>En attente du créateur...</p>}
    <button className="btn btn--sm" type="button" onClick={onBack}>Retour au salon</button>
  </div>;
  if(!match || !['playing','finished'].includes(room?.status))return <p>Chargement de Tank Battle...</p>;
  return createPortal(<div className="tank-overlay" role="dialog" aria-modal="true" aria-label="Combat de chars">
    <div className="tank-shell">
      <header className="tank-top"><button type="button" onClick={onExit} disabled={busy}>← Quitter</button><strong>🚀 TANK BATTLE</strong><small>#{room.code}</small></header>
      <div className="tank-scores">{players.map(([side,pseudo])=><div key={side} className={`tank-score ${match.toMove===side&&!finished?'is-turn':''}`}>
        <div className="tank-score__name">{pseudo} {side===viewer?'(toi)':''}</div>
        <div className="tank-hp"><span style={{width:`${match.tanks?.[side]?.hp??0}%`,background:side==='host'?'#63dfb0':'#ef997a'}} /></div>
        <small>❤️ {match.tanks?.[side]?.hp ?? 0} PV · ⛽ {match.tanks?.[side]?.fuel ?? 0}</small>
      </div>)}</div>
      <div className="tank-turn" role="status">{finished ? (match.draw?'🤝 Match nul — mises remboursées':match.winner===viewer?'🏆 Victoire !':'Défaite.')
        : match.toMove===viewer ? `À toi de jouer · ${moveDeadline ?? 120} s` : `Au tour de ${sideName(room,match.toMove)} · ${moveDeadline??120} s`}</div>
      <div className="tank-scene"><svg ref={svgRef} viewBox={VIEW} role="img" aria-label="Terrain destructible et deux chars" preserveAspectRatio="xMidYMax slice"
        onPointerDown={e=>{if(canPlay){e.currentTarget.setPointerCapture?.(e.pointerId);aimWithPointer(e);}}}
        onPointerMove={e=>{if(e.buttons && canPlay) aimWithPointer(e);}}>
        <defs><linearGradient id="tank-sky" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#152b52"/><stop offset="1" stopColor="#478f9e"/></linearGradient>
          <linearGradient id="tank-ground" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#9ac86e"/><stop offset=".08" stopColor="#6e9551"/><stop offset="1" stopColor="#4c392e"/></linearGradient></defs>
        <rect x="0" y="0" width="100" height="100" fill="url(#tank-sky)"/>
        <circle cx="75" cy="17" r="7" fill="#f5d994" opacity=".82"/>
        <path d="M 0 53 Q 14 22 28 48 T 54 47 T 100 45 L 100 100 L 0 100 Z" fill="#264d5b" opacity=".45"/>
        <path d={terrainPath(displayTerrain)} fill="url(#tank-ground)" stroke="#b4cf83" strokeWidth=".5"/>
        {players.map(([side])=><TankDrawing key={side} tank={displayTanks?.[side]} terrain={displayTerrain} side={side} isMe={viewer===side}
          angle={viewer===side && canPlay ? angle : match?.lastShot?.side===side ? match.lastShot.angle : 20}/>)}
        {canPlay && (()=>{const dir=viewer==='host'?1:-1;const x=match.tanks[viewer].x+drive;const y=tankSurface(match.terrain,x)-4;const r=angle*Math.PI/180;
          return <g pointerEvents="none"><path d={`M${x},${y} l${dir*Math.cos(r)*14},${-Math.sin(r)*14}`} stroke="#fff3b0" strokeDasharray="1.3 1" strokeWidth=".5" fill="none"/></g>;})()}
        {animation && shotPoint && !exploded && <g pointerEvents="none">
          {shot.points.slice(Math.max(0,shotIndex-6),shotIndex).map((pt,k,arr)=>
            <circle key={k} cx={pt.x} cy={pt.y} r={.35+k/arr.length*.8} fill="#e8eef3" opacity={k/arr.length*.5}/>)}
          <g transform={`translate(${shotPoint.x} ${shotPoint.y}) rotate(${shotDeg}) scale(.11) translate(-24 -12)`}>
            <WeaponShape kind={shot.weapon}/>
          </g>
        </g>}
        {exploded && shot && <>
          <Blast x={shot.impact.x} y={shot.impact.y} radius={TANK_WEAPONS[shot.weapon]?.radius||8} t={boom}/>
          {shot.weapon==='cluster' && [-4,4].map(o=><Blast key={o} x={clamp(shot.impact.x+o,0,100)} y={shot.impact.y} radius={4} t={boom}/>)}
          {['host','guest'].map(side=>shot.damage?.[side]>0 && displayTanks?.[side] && displayTerrain &&
            <text key={side} x={displayTanks[side].x} y={tankSurface(displayTerrain,displayTanks[side].x)-9-boom*6}
              textAnchor="middle" fontSize="4.4" fontWeight="800" fill="#ffe08a" stroke="#6b2a12" strokeWidth=".5" paintOrder="stroke"
              opacity={Math.max(0,1.4-boom)} pointerEvents="none">-{shot.damage[side]}</text>)}
        </>}
      </svg><div className="tank-scene__hint">Glisse sur le terrain pour viser</div></div>
      {error && <p className="tank-error" role="alert">{error}</p>}
      {rivalDeadline!=null&&!finished && <p className="tank-alert">⚠️ L'adversaire est sorti : {rivalDeadline} s avant forfait.</p>}
      {ownDeadline!=null&&!finished && <p className="tank-alert">⚠️ Retour nécessaire dans {ownDeadline} s.</p>}
      {!finished && <div className="tank-controls">
        <div className="tank-weapon-list" role="radiogroup" aria-label="Munitions">{Object.entries(TANK_WEAPONS).map(([key,w])=>{
          const left=match.tanks[viewer].ammo[key];const empty=left===0;
          return <button type="button" key={key} role="radio" aria-checked={weapon===key} disabled={!canPlay || empty}
            onClick={()=>setWeapon(key)} className={`${weapon===key?'selected':''}${empty?' is-empty':''}`}>
            <WeaponIcon kind={key}/><span className="tank-weapon-name">{WEAPON_INFO[key]?.short||w.label}</span>
            <small>{w.ammo===null?'∞':`×${left}`}</small></button>;})}</div>
        <p className="tank-weapon-hint"><strong>{TANK_WEAPONS[weapon].label}</strong> · dégâts {TANK_WEAPONS[weapon].damage} · zone {TANK_WEAPONS[weapon].radius}
          {WEAPON_INFO[weapon]?` — ${WEAPON_INFO[weapon].hint}`:''}</p>
        <label>↗️ Angle : <strong>{angle}°</strong><input type="range" min="0" max="89" value={angle} disabled={!canPlay} onChange={e=>setAngle(Number(e.target.value))}/></label>
        <label>💥 Puissance : <strong>{power}%</strong><input type="range" min="20" max="100" value={power} disabled={!canPlay} onChange={e=>setPower(Number(e.target.value))}/></label>
        <label>⛽ Déplacement : <strong>{drive>0?'+':''}{drive} m</strong><input type="range" min="-8" max="8" step="1" value={drive} disabled={!canPlay} onChange={e=>setDrive(Number(e.target.value))}/></label>
        <button className="tank-fire" type="button" disabled={!canPlay} onClick={fire}>🚀 TIRER</button>
      </div>}
      {!finished && <div className="tank-foot">
        <div className="tank-reactions">{EMOTES.map(([kind,icon])=><button type="button" key={kind} onClick={()=>sendEmote(kind)}>{icon}</button>)}</div>
        {!solo && <button type="button" onClick={()=>setDrawConfirm(true)} disabled={busy || !!drawOffer && drawOffer!==viewer}>🤝 {drawOffer===viewer?'Annuler nul':'Proposer nul'}</button>}
        <button type="button" onClick={()=>setConfirmExit(true)} disabled={busy}>Abandonner</button>
      </div>}
      {!finished && drawOffer && drawOffer!==viewer && <div className="tank-dialog">L'adversaire propose un nul.
        <button type="button" onClick={()=>onDraw?.('respond',true)}>Accepter</button><button type="button" onClick={()=>onDraw?.('respond',false)}>Refuser</button>
      </div>}
      {drawConfirm && !finished && <div className="tank-dialog">{drawOffer===viewer?'Annuler ta proposition de match nul ?':'Proposer un match nul ?'}
        <button type="button" onClick={()=>{onDraw?.(drawOffer===viewer?'cancel':'offer');setDrawConfirm(false);}}>Confirmer</button>
        <button type="button" onClick={()=>setDrawConfirm(false)}>Retour</button></div>}
      {confirmExit && !finished && <div className="tank-dialog">Abandonner donne la victoire à l'adversaire.
        <button type="button" onClick={()=>{setConfirmExit(false);onForfeit?.();}}>Confirmer</button><button type="button" onClick={()=>setConfirmExit(false)}>Annuler</button></div>}
      {finished && <button className="tank-fire" type="button" onClick={onBack}>Terminer · Retour aux salons</button>}
    </div>
    {reaction && <div key={reaction.id} className={`tank-reaction-float ${reaction.side===viewer?'mine':'their'}`} aria-hidden="true">{reaction.icon}</div>}
  </div>,document.body);
}
