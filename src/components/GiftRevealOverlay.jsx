import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
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
   <div className="maf-reveal-money__progress" aria-hidden="true"><span/></div>
 </div>;
}
function LotDisplay({lot,onComplete}){
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
 const next=()=>{if(!canContinue)return;if(index<lots.length-1){setIndex(i=>i+1);setCountDone(false);}else onClose();};
 return createPortal(<div className={`maf-reveal-stage maf-reveal-stage--${phase}`} role="dialog" aria-modal="true" aria-label={`Ouverture du cadeau ${gift.title}`}>
  {phase==='intro'||phase==='pressing'?<div className="maf-reveal-tap-scene">
   <button type="button" className={`maf-reveal-tap ${phase==='pressing'?'is-pressed':''}`} disabled={phase!=='intro'} onClick={()=>void start()} aria-label="TAP pour ouvrir ton cadeau">
    <span className="maf-reveal-tap__base"><span className="maf-reveal-tap__hole"/></span>
    <span className="maf-reveal-tap__stem"/><span className="maf-reveal-tap__top"><span>TAP</span></span>
   </button>
  </div>:phase==='error'?<div className="maf-reveal-error"><p role="alert">{error}</p><button onClick={()=>{setPhase('intro');}}>Réessayer</button><button onClick={onClose}>Retour aux cadeaux</button></div>:
   <div className="maf-reveal-lot-scene" onClick={canContinue?next:undefined}>
    <div className="maf-reveal-lot-scene__top">{gift.title}<small>LOT {index+1} / {lots.length}</small></div>
    <div key={index} className="maf-reveal-lot-scene__content"><LotDisplay lot={current} onComplete={()=>setCountDone(true)}/></div>
    <button type="button" className="maf-reveal-lot-scene__next" disabled={!canContinue} onClick={e=>{e.stopPropagation();next();}}>{!canContinue?'Révélation en cours…':index<lots.length-1?'Toucher pour le lot suivant':'Terminer'}</button>
   </div>}
  {phase!=='pressing'&&phase!=='intro'&&<button type="button" className="maf-reveal-stage__exit" onClick={onClose} aria-label="Quitter la révélation">×</button>}
 </div>,document.body);
}
