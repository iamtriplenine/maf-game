import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import { saveProfileBackground } from '../api/accounts';
import { useSession } from '../auth/useSession';
import ProfileBackground from './ProfileBackground';
import '../styles/gift-reveal.css';

const MIN_COUNT_MS=5300;
const hold=ms=>new Promise(done=>setTimeout(done,ms));
const fmt=n=>new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0}).format(n);
const typeName={balance:'Solde réel',bonus:'Solde bonus',coupon:'Coupon',skin:'Skin exclusif',background:'Arrière-plan',image:'Image'};
function normalizedLots(receipt){
 if(!receipt)return [];
 if(Array.isArray(receipt.lots))return receipt.lots;
 if(receipt.reward){
  const r=receipt.reward, lots=[];
  if(Number(r.realFranc??(r.realCents||0)/100)>0)lots.push({kind:'balance',amount:Number(r.realFranc??r.realCents/100)});
  if(Number(r.bonusFranc??(r.bonusCents||0)/100)>0)lots.push({kind:'bonus',amount:Number(r.bonusFranc??r.bonusCents/100)});
  for(const s of r.chosenSkins||[])lots.push({kind:'skin',skinId:s.name||s.skinId||s.id});
  return lots.length?lots:[{kind:'trophy',place:r.place}];
 }
 return [receipt];
}
function MoneyCount({amount,kind,onComplete}){
 const [value,setValue]=useState(0),[done,setDone]=useState(false);
 const finishRef=useRef(onComplete);finishRef.current=onComplete;
 useEffect(()=>{
  let raf=0,started=0,finished=false;
  const reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const frame=at=>{
   if(!started)started=at;
   const progress=Math.min(1,(at-started)/MIN_COUNT_MS);
   setValue(Math.round(amount*(1-Math.pow(1-progress,3))));
   if(progress<1){raf=requestAnimationFrame(frame);}else if(!finished){finished=true;setDone(true);finishRef.current?.();}
  };
  if(reduce){const t=setTimeout(()=>{setValue(amount);setDone(true);finishRef.current?.();},MIN_COUNT_MS);return()=>clearTimeout(t);}
  raf=requestAnimationFrame(frame);return()=>cancelAnimationFrame(raf);
 },[amount]);
 return <div className="maf-reveal-money"><div className="maf-reveal-money__caption">{kind==='bonus'?'BONUS REÇU':'SOLDE REÇU'}</div>
   <div className={`maf-reveal-money__number ${done?'is-done':''}`} aria-live="off"><span aria-hidden="true">+</span>{fmt(value)}<small>F</small></div>
 </div>;
}
function BackgroundGift({backgroundId}) {
 const { updateUser }=useSession();
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const apply=async(e)=>{
  e.stopPropagation(); if(busy)return;
  setBusy(true);setNotice('');
  try{const user=await saveProfileBackground(backgroundId);updateUser(user);
   setNotice('Applique au profil.');}
  catch(error){setNotice(error?.message||'Impossible d’appliquer ce decor.');}
  finally{setBusy(false);}
 };
 return <div className={`maf-reveal-background ${backgroundId==='matrix-rain'?'maf-reveal-background--matrix':''}`}>
   {backgroundId==='matrix-rain'&&<ProfileBackground id="matrix-rain"/>}
   <div className="maf-reveal-background__action">
    <button type="button" onClick={apply} disabled={busy}>{busy?'Application...':'Appliquer'}</button>
    {notice&&<p role="status">{notice}</p>}
   </div>
  </div>;
}
function LotDisplay({lot,onComplete}){
 if(lot.kind==='background')return <BackgroundGift backgroundId={lot.backgroundId}/>;
 if(['balance','bonus'].includes(lot.kind))return <MoneyCount key={`${lot.kind}-${lot.amount}`} amount={Number(lot.amount||0)} kind={lot.kind} onComplete={onComplete}/>;
 const title=typeName[lot.kind]||'Récompense';
 return <div className="maf-reveal-object">
   <span className="maf-reveal-object__symbol" aria-hidden="true">{lot.kind==='skin'?'♛':lot.kind==='coupon'?'✦':lot.kind==='image'?'✧':lot.kind==='background'?'◈':'★'}</span>
   <p>{title}</p>
   {lot.kind==='image'&&lot.imageData?<img src={lot.imageData} alt="Image offerte"/>:<strong>{lot.skinId||lot.backgroundId||lot.code||(lot.place?`Place ${lot.place}`:'Cadeau débloqué')}</strong>}
   {lot.kind==='coupon'&&<><small>{fmt(lot.amount)} {lot.currency==='V'?'bonus':'F'}</small><button type="button" className="maf-reveal-object__coupon" onClick={e=>{e.stopPropagation();void navigator.clipboard?.writeText(lot.code||'');}}>Copier le coupon</button></>}
 </div>;
}
/** Toujours ouvrir sur le serveur une seule fois; l'animation ne credite jamais elle-meme. */
export default function GiftRevealOverlay({gift,onClose}){
 const [phase,setPhase]=useState('intro'),[lots,setLots]=useState([]),[index,setIndex]=useState(0),[countDone,setCountDone]=useState(false),[error,setError]=useState('');
 const alive=useRef(true),inFlight=useRef(false);
 useEffect(()=>{alive.current=true;const before=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{alive.current=false;document.body.style.overflow=before;};},[]);
 const start=async()=>{
  if(inFlight.current)return;inFlight.current=true;setPhase('pressing');setError('');
  try{
   // Deux secondes complètes pour laisser le bouton descendre dans son socle.
   await hold(2000);
   if(!alive.current)return;
   const result=gift.existing||await gift.claim();
   if(!alive.current)return;
   const values=normalizedLots(result);
   setLots(values.length?values:[{kind:'trophy'}]);setIndex(0);setCountDone(false);setPhase('reveal');
  }catch(e){if(alive.current){setError(e?.message||'Ouverture indisponible.');setPhase('error');}}
  finally{inFlight.current=false;}
 };
 const current=lots[index],isMoney=current&&['balance','bonus'].includes(current.kind);
 const canContinue=!isMoney||countDone;
 const next=()=>{
  if(!canContinue)return;
  if(index<lots.length-1){setIndex(i=>i+1);setCountDone(false);}
  else onClose();
 };
 // Aucun bouton de sortie dans la revelation. Echap reste disponible au clavier.
 useEffect(()=>{
  const escape=e=>{if(e.key==='Escape'&&phase==='reveal'&&canContinue){e.preventDefault();next();}};
  window.addEventListener('keydown',escape);
  return()=>window.removeEventListener('keydown',escape);
 });
 return createPortal(<div className={`maf-reveal-stage maf-reveal-stage--${phase}`} role="dialog" aria-modal="true" aria-label={`Ouverture du cadeau ${gift.title}`}>
  {phase==='intro'||phase==='pressing'?<div className="maf-reveal-tap-scene">
   <button type="button" className={`maf-reveal-tap-3d ${phase==='pressing'?'is-pressed':''}`} disabled={phase!=='intro'} onClick={()=>void start()} aria-label="TAP pour ouvrir ton cadeau">
    <span className="maf-reveal-tap-3d__head"><span className="maf-reveal-tap-3d__top"><span>TAP</span></span></span>
    <span className="maf-reveal-tap-3d__body"><span className="maf-reveal-tap-3d__left"/><span className="maf-reveal-tap-3d__right"/></span>
    <span className="maf-reveal-tap-3d__base"><span className="maf-reveal-tap-3d__base-body"><span className="maf-reveal-tap-3d__hole">
     <span className="maf-reveal-tap-3d__rest"><span className="maf-reveal-tap-3d__left"/><span className="maf-reveal-tap-3d__right"/></span>
     <span className="maf-reveal-tap-3d__shadow"/>
    </span></span></span>
   </button>
  </div>:phase==='error'?<div className="maf-reveal-error"><p role="alert">{error}</p><button onClick={()=>{setPhase('intro');}}>Réessayer</button><button onClick={onClose}>Retour aux cadeaux</button></div>:
   <div className={`maf-reveal-lot-scene ${canContinue?'is-ready':''}`} onClick={next} role="button" tabIndex={canContinue?0:-1} onKeyDown={e=>{if(canContinue&&(e.key==='Enter'||e.key===' ')){e.preventDefault();next();}}} aria-label={index<lots.length-1?'Toucher pour voir le prochain lot':'Toucher pour revenir aux cadeaux'}>
    <div key={index} className="maf-reveal-lot-scene__content"><LotDisplay lot={current} onComplete={()=>setCountDone(true)}/></div>
   </div>}
 </div>,document.body);
}
