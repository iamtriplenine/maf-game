import { useEffect, useRef, useState } from 'react';
import { render, buildBackground } from './TankRun/render';
import { SnapshotBuffer } from './TankRun/netInterp'; // MAF_TANKRUN_LAG_V1
import { getTankRunSnapshot, sendTankRunInput, setTankRunSetup } from '../api/tankrun';
import './TankRun/TankBattle.css';
import './TankRunOnline.css';

const AMMUNITION = ['standard','rapide','lourd','explosif','ricochet'];
const LAND = ['original','desert','usine'];
const LABELS = {original:'Terrain d\'origine',desert:'Désert',usine:'Usine'};
const TERRAIN_META = {
  original: { title: 'Terrain d\'origine', caption: 'Piste équilibrée, idéale pour les duels classiques.' },
  desert: { title: 'Désert', caption: 'Grande visibilité, longues lignes de tir et conduite nerveuse.' },
  usine: { title: 'Usine', caption: 'Couloirs plus serrés, ambiance industrielle et affrontements rapprochés.' }
};
const SKINS = ['origine','spectre','titan'];
const SKIN_LABELS = {origine:'Origine',spectre:'Spectre',titan:'Titan'};
const SKIN_META = {
  origine: { title: 'Origine', subtitle: 'Classique' },
  spectre: { title: 'Spectre', subtitle: 'Néon' },
  titan: { title: 'Titan', subtitle: 'Blindé' }
};

const getTerrainData = (key) => TERRAIN_META[key] || { title: LABELS[key] || 'Terrain', caption: 'Terrain sélectionné pour le duel.' };
const getSkinData = (key) => SKIN_META[key] || { title: SKIN_LABELS[key] || 'Char', subtitle: 'Configuration' };

export default function TankRunOnline({room,match,onStart,onExit,onForfeit,busy}){
  const [terrain,setTerrain] = useState('original');
  const [skin,setSkin] = useState('origine');
  const [saving,setSaving] = useState(false);
  const [message,setMessage] = useState('');
  const [orientation,setOrientation] = useState('portrait');
  const [ammo,setAmmo] = useState('standard');
  const [state,setState] = useState(null);
  const [netBuffer]=useState(()=>new SnapshotBuffer());
  const bufRef=useRef(netBuffer);
  const staticsRef=useRef(null);
  const lockRef=useRef(null);      // angle fige du char pendant que le serveur confirme l'appui
  const viewRef=useRef({rt:0,ownAngle:null}); // ce que le joueur voit en ce moment
  const pressStart=useRef(0);
  const canvasRef=useRef(null);
  const wrapRef=useRef(null);
  const pointer=useRef(null);
  const pressed=useRef(false);
  const viewer=room.is_host?'host':'guest';
  const viewerRole = room.is_host ? 'Joueur 1' : 'Joueur 2';
  const own=(room.tankrun_setup||{})[viewer];
  const opponent=(room.tankrun_setup||{})[viewer==='host'?'guest':'host'];
  const ownPseudo = room.is_host ? room.host?.pseudo : room.guest?.pseudo;
  const opponentPseudo = room.is_host ? room.guest?.pseudo : room.host?.pseudo;
  const latestAmmo=useRef(ammo);
  const sequence=useRef(0);
  const epoch=useRef('tankrun-'+Date.now()+'-'+Math.random().toString(36).slice(2));
  latestAmmo.current=ammo;
  const active=room.status==='playing' || room.status==='finished';
  const finishedWinner=room.status==='finished'?match?.winner:state?.winner;
  const terrainInfo = getTerrainData(terrain);
  const opponentSkinKey = opponent?.skin || 'origine';
  const primaryDisabled = !room.is_host || !(own&&opponent) || busy;

  useEffect(()=>{
    if(own?.arena) setTerrain(own.arena);
    if(own?.skin) setSkin(own.skin);
  },[own?.arena, own?.skin]);

  // MAF_TANKRUN_LAG_V1 : images legeres ~20/s, plusieurs requetes possibles en meme temps
  // (une reponse lente ne bloque plus les suivantes), terrain demande une seule fois.
  useEffect(()=>{
    if(!active || room.status==='finished')return undefined;
    let running=true,inflight=0;
    bufRef.current.reset();staticsRef.current=null;lockRef.current=null;
    const poll=async()=>{
      if(inflight>=4)return;
      inflight++;
      try{
        const next=await getTankRunSnapshot(room.id,{full:!staticsRef.current});
        if(!running)return;
        if(next.finished){setState(next);return}
        if(next.rects){staticsRef.current={w:next.w,h:next.h,cfg:next.cfg,arena:next.arena,rects:next.rects}}
        if(!next.lite&&typeof next.time==='number'){ // ancien serveur (pas encore mis a jour) : image complete sans identifiants
          next.t=next.time;next.ack=[];next.ackEpoch=[];
          next.bullets=(next.bullets||[]).map((b,i)=>({...b,id:b.id??`${b.owner}:${i}`}));
        }
        if(!staticsRef.current||typeof next.t!=='number')return;
        bufRef.current.push(next,performance.now());
        setState(old=>old&&old.phase===next.phase&&old.winner===next.winner?old:{phase:next.phase,winner:next.winner});
        setMessage(m=>m?'':m);
      }catch(e){if(running)setMessage(e.message)}
      finally{inflight--}
    };
    void poll(); const interval=window.setInterval(poll,50);
    return ()=>{running=false;clearInterval(interval)};
  },[room.id,room.status,active]);

  useEffect(()=>{
    if(!active || !canvasRef.current || !wrapRef.current)return undefined;
    const canvas=canvasRef.current,wrap=wrapRef.current,ctx=canvas.getContext('2d');
    if(!ctx)return undefined;
    const view={W:0,H:0,dpr:1,scale:1,ox:0,oy:0,bg:null,humans:0};
    let oldArena='';
    const resize=()=>{
      const width=wrap.clientWidth,height=wrap.clientHeight;
      if(!width||!height)return;
      view.W=width;view.H=height;view.dpr=Math.min(window.devicePixelRatio||1,2.5);
      canvas.width=Math.round(width*view.dpr);canvas.height=Math.round(height*view.dpr);
      view.scale=Math.min(width/800,height/480)*0.99;
      view.ox=(width-800*view.scale)/2;view.oy=(height-480*view.scale)/2;
      oldArena='';
    };
    const obs=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;
    obs?.observe(wrap);window.addEventListener('resize',resize);resize();
    let raf=0;
    const me=viewer==='host'?0:1;
    const frame=()=>{
      const buf=bufRef.current,statics=staticsRef.current;
      const rt=view.W&&statics?buf.renderTime(performance.now()):null;
      if(rt!=null){
        // Le serveur a-t-il deja pris en compte mon dernier appui ? Alors je lache l'angle fige.
        const lock=lockRef.current;
        if(lock){
          const low=buf.lower(rt);
          const confirmed=low&&low.ackEpoch?.[me]===epoch.current&&low.ack?.[me]>=lock.seq;
          if(confirmed||performance.now()-lock.at>1500||low?.phase==='over')lockRef.current=null;
        }
        const scene=buf.sceneAt(rt,statics,me,lockRef.current?lockRef.current.angle:null);
        if(scene){
          viewRef.current={rt,ownAngle:scene.tanks[me]?scene.tanks[me].angle:null};
          const arenaId=scene.arena?.id||'original';
          if(arenaId!==oldArena){view.bg=buildBackground(scene,view.scale,view.dpr);oldArena=arenaId}
          render(ctx,scene,view,1);
        }
      }
      raf=requestAnimationFrame(frame);
    };
    raf=requestAnimationFrame(frame);
    return ()=>{cancelAnimationFrame(raf);obs?.disconnect();window.removeEventListener('resize',resize)};
  },[active,room.id,viewer]);

  const send=(down,selected=latestAmmo.current,extra)=>{
    const seq=++sequence.current;
    void sendTankRunInput(room.id,{down,ammo:selected,seq,epoch:epoch.current,...extra}).catch(e=>setMessage(e.message));
    return seq;
  };
  const handleDown=e=>{
    if(room.status!=='playing'||pointer.current!==null||e.target.closest?.('[data-ui]'))return;
    pointer.current=e.pointerId;pressed.current=true;pressStart.current=performance.now();
    try{e.currentTarget.setPointerCapture(e.pointerId)}catch{/* pass */}
    // On dit au serveur QUEL angle je vois (et a quel instant) : le tir part la ou je vise,
    // meme si le reseau a pris du retard. Mon char reste fige a cet angle en attendant.
    const view=viewRef.current;
    const lock=lockRef.current;
    const aim=lock?lock.angle:view.ownAngle;
    const seq=send(true,latestAmmo.current,aim!=null?{vt:view.rt,aim}:undefined);
    if(aim!=null)lockRef.current={seq,angle:aim,at:performance.now()};
  };
  const handleUp=e=>{
    if(pointer.current!==e.pointerId)return;
    pointer.current=null;pressed.current=false;
    send(false,latestAmmo.current,{held:(performance.now()-pressStart.current)/1000});
  };
  useEffect(()=>{
    const stop=()=>{if(pressed.current){pressed.current=false;pointer.current=null;send(false,latestAmmo.current,{held:(performance.now()-pressStart.current)/1000})}};
    window.addEventListener('blur',stop);
    const visibility=()=>{if(document.hidden)stop()};
    document.addEventListener('visibilitychange',visibility);
    return ()=>{stop();window.removeEventListener('blur',stop);document.removeEventListener('visibilitychange',visibility)};
  },[room.id]);

  const saveSetup = async()=>{
    setSaving(true);
    setMessage('');
    try{
      await setTankRunSetup(room.id,{arena:terrain,skin});
      setMessage('Configuration enregistrée.');
    }catch(e){
      setMessage(e.message);
    }finally{
      setSaving(false);
    }
  };

  if(room.status==='ready')return (
    <section className="tr-setup" aria-label="Préparation du duel Tank Run">
      <div className="tr-setup__hero">
        <div>
          <p className="tr-setup__eyebrow">Tank Run · salon privé</p>
          <h3>Configure ton duel</h3>
          <p className="tr-setup__lede">Choisis ton char, confirme le terrain et garde toutes les commandes visibles sans faire défiler l'écran.</p>
        </div>
        <div className={`tr-setup__state ${own && opponent ? 'is-ready' : 'is-waiting'}`}>
          {own && opponent ? 'Prêt à lancer' : 'Préparation'}
        </div>
      </div>

      <div className="tr-setup__topbar">
        <article className="tr-stat-card">
          <span className="tr-stat-card__label">Joueurs</span>
          <div className="tr-stat-card__choices">
            <span className="is-active">2</span>
            <span>3</span>
            <span>4</span>
          </div>
        </article>
        <article className="tr-stat-card">
          <span className="tr-stat-card__label">Humains</span>
          <div className="tr-stat-card__choices">
            <span>1</span>
            <span className="is-active">2</span>
          </div>
          <small>Salon à deux joueurs humains.</small>
        </article>
      </div>

      <article className="tr-surface-card tr-surface-card--terrain">
        <div className="tr-surface-card__header">
          <div>
            <strong>Terrain</strong>
            <p>{terrainInfo.caption}</p>
          </div>
          <span className="tr-surface-card__badge">{terrainInfo.title}</span>
        </div>
        <div className="tr-terrain-row">
          <label className="tr-field tr-field--compact">
            <span>Terrain choisi</span>
            <select value={terrain} onChange={e=>setTerrain(e.target.value)}>
              {LAND.map(k=><option key={k} value={k}>{LABELS[k]}</option>)}
            </select>
          </label>
          <div className={`tr-terrain-preview tr-terrain-preview--${terrain}`} aria-hidden="true">
            <span>{terrainInfo.title}</span>
          </div>
        </div>
      </article>

      <article className="tr-surface-card">
        <div className="tr-surface-card__header">
          <div>
            <strong>Chars et effets des tirs</strong>
            <p>Réglages visibles pour les deux joueurs.</p>
          </div>
        </div>
        <div className="tr-player-grid">
          <article className={`tr-player-card tr-player-card--self tr-player-card--${skin}`}>
            <div className="tr-player-card__head">
              <span>{viewerRole} · {ownPseudo || 'Toi'}</span>
              <strong>Humain</strong>
            </div>
            <div className={`tr-tank-preview tr-tank-preview--${skin}`} aria-hidden="true" />
            <label className="tr-field tr-field--compact">
              <span>Char</span>
              <select value={skin} onChange={e=>setSkin(e.target.value)}>
                {SKINS.map(k=><option key={k} value={k}>{SKIN_META[k].title} · {SKIN_META[k].subtitle}</option>)}
              </select>
            </label>
          </article>

          <article className={`tr-player-card tr-player-card--opponent tr-player-card--${opponentSkinKey}${opponent ? '' : ' is-waiting'}`}>
            <div className="tr-player-card__head">
              <span>{room.is_host ? 'Joueur 2' : 'Joueur 1'} · {opponentPseudo || 'Adversaire'}</span>
              <strong>{opponent ? 'Humain' : 'En attente'}</strong>
            </div>
            <div className={`tr-tank-preview tr-tank-preview--${opponentSkinKey}`} aria-hidden="true" />
            <div className="tr-player-card__summary">
              <span>Char</span>
              <strong>{opponent ? `${getSkinData(opponent.skin).title} · ${getSkinData(opponent.skin).subtitle}` : 'Choix en attente'}</strong>
            </div>
          </article>
        </div>
      </article>

      <div className="tr-help-row">
        <article className="tr-help-card">
          <strong>Ton char tourne</strong>
          <span>Déplace-toi sans recharger la page.</span>
        </article>
        <article className="tr-help-card">
          <strong>Appui court : tirer</strong>
          <span>Le tir part vers la même direction.</span>
        </article>
        <article className="tr-help-card">
          <strong>Appui long : avancer</strong>
          <span>Maintiens pour foncer vers l'avant.</span>
        </article>
      </div>

      {message && <p className="tr-setup__message" role="status">{message}</p>}

      <div className="tr-action-row">
        <button type="button" className="tr-action tr-action--ghost" onClick={onExit}>Retour</button>
        <button type="button" className="tr-action tr-action--secondary" disabled={saving||busy} onClick={()=>void saveSetup()}>
          {saving ? 'Enregistrement…' : 'Valider'}
        </button>
        <button type="button" className="tr-action tr-action--primary" disabled={primaryDisabled} onClick={onStart}>
          {room.is_host ? (own&&opponent ? 'JOUER' : 'EN ATTENTE') : (own&&opponent ? 'PRÊT' : 'EN ATTENTE')}
        </button>
      </div>
      {!room.is_host && <p className="tr-setup__hint">Quand les deux choix sont prêts, le créateur du salon lance la partie.</p>}
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
