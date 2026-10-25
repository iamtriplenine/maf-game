// Nouveau bouton Monopoly : appui bref = afficher/masquer ; maintenir = enregistrer, relacher = envoyer.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useVoiceRecorder, voiceSupported } from '../chat/useVoiceRecorder';
import { IconMic, IconPlay, IconPause } from './VoiceIcons';
import { listMatchVoices, sendMatchVoice, fetchMatchVoice } from '../api/monopolyVoices';
import '../styles/monopoly-voices.css';

const fmt=ms=>`${Math.floor(ms/60000)}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}`;
const bars=Array.from({length:25},(_,i)=>20+Math.round(75*Math.abs(Math.sin(i*12.46+3.2))));
let currentAudio=null;
function VoiceLine({voice,roomId,mine}){
  const audio=useRef(null),objectUrl=useRef(null);
  const [playing,setPlaying]=useState(false),[loading,setLoading]=useState(false),[position,setPosition]=useState(0),[error,setError]=useState('');
  useEffect(()=>()=>{
    audio.current?.pause();
    if(currentAudio===audio.current)currentAudio=null;
    if(objectUrl.current)URL.revokeObjectURL(objectUrl.current);
  },[]);
  const toggle=async()=>{
    if(audio.current&&!audio.current.paused){audio.current.pause();return;}
    setError('');setLoading(true);
    try{
      if(!audio.current){
        const blob=await fetchMatchVoice(roomId,voice.id);
        objectUrl.current=URL.createObjectURL(blob);
        const a=new Audio(objectUrl.current);
        a.preload='auto';
        a.addEventListener('timeupdate',()=>setPosition(a.currentTime*1000));
        a.addEventListener('playing',()=>{setPlaying(true);setLoading(false);});
        a.addEventListener('pause',()=>setPlaying(false));
        a.addEventListener('ended',()=>{setPlaying(false);setPosition(0);if(currentAudio===a)currentAudio=null;});
        a.addEventListener('error',()=>{setPlaying(false);setLoading(false);setError('Lecture impossible.');});
        audio.current=a;
      }
      if(currentAudio&&currentAudio!==audio.current)currentAudio.pause();
      currentAudio=audio.current;
      await audio.current.play();
    }catch{setError('Lecture impossible.');}finally{setLoading(false);}
  };
  const progress=Math.max(0,Math.min(1,position/Math.max(voice.ms,1)));
  return <div className={`mono-voice-line${mine?' is-mine':''}`}>
    <div className="mono-voice-name">{voice.name}{mine?' · toi':''}</div>
    <div className="mono-voice-player">
      <button type="button" aria-label={playing?'Pause':'Ecouter le vocal'} onClick={toggle} className="mono-voice-play" disabled={loading}>
        {playing?<IconPause size={17}/>:<IconPlay size={17}/>}
      </button>
      <div className="mono-voice-wave" aria-hidden="true">{bars.map((height,i)=><i key={i} style={{height:`${height}%`}} className={i/bars.length<progress?'is-on':''}/>)}</div>
      <small>{loading?'…':fmt(playing?position:voice.ms)}</small>
    </div>
    {error&&<small className="mono-voice-error">{error}</small>}
  </div>;
}

export default function MonopolyVoices({roomId,userId}){
  const [opened,setOpened]=useState(false),[voices,setVoices]=useState([]),[sending,setSending]=useState(false),[error,setError]=useState('');
  const hold=useRef(null),activePointer=useRef(null),wasHold=useRef(false),sendingRef=useRef(false);
  const refresh=useCallback(async()=>{
    try{setVoices(await listMatchVoices(roomId));}catch(e){setError(e.message);}
  },[roomId]);
  useEffect(()=>{
    if(!opened)return undefined;
    void refresh();
    const timer=setInterval(()=>{if(!document.hidden)void refresh();},2500);
    return()=>clearInterval(timer);
  },[opened,refresh]);
  const send=useCallback(async voice=>{
    if(sendingRef.current)return;
    sendingRef.current=true;setSending(true);setOpened(true);setError('');
    try{await sendMatchVoice(roomId,voice);await refresh();}
    catch(e){setError(e.message||'Envoi impossible.');}
    finally{sendingRef.current=false;setSending(false);}
  },[roomId,refresh]);
  const recorder=useVoiceRecorder({onVoice:send,onError:setError});
  const onDown=e=>{
    if(!e.isPrimary||activePointer.current!==null||sending)return;
    e.preventDefault();
    activePointer.current=e.pointerId;wasHold.current=false;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    hold.current=setTimeout(()=>{
      hold.current=null;wasHold.current=true;setError('');
      if(!voiceSupported())setError('Micro indisponible sur cet appareil.');
      else void recorder.start();
    },300);
  };
  const onUp=e=>{
    if(activePointer.current!==e.pointerId)return;
    e.preventDefault();activePointer.current=null;
    if(hold.current!==null){clearTimeout(hold.current);hold.current=null;}
    if(wasHold.current)recorder.finish();
    else {setOpened(o=>!o);setError('');}
  };
  useEffect(()=>()=>{if(hold.current!==null)clearTimeout(hold.current);},[]);
  return <>
    <button type="button" className={`mono-voice-trigger${recorder.recording?' is-recording':''}`}
      aria-label={opened?'Masquer les vocaux. Maintenir pour enregistrer.':'Afficher les vocaux. Maintenir pour enregistrer.'}
      aria-pressed={opened} title="Toucher : vocaux · Maintenir : parler" onPointerDown={onDown} onPointerUp={onUp}
      onPointerCancel={e=>{if(activePointer.current===e.pointerId){activePointer.current=null;if(hold.current!==null){clearTimeout(hold.current);hold.current=null;}if(wasHold.current)recorder.finish();}}}
      onContextMenu={e=>e.preventDefault()} onClick={e=>{if(e.detail===0){setOpened(o=>!o);setError('');}}}><IconMic size={22}/>
      {recorder.recording&&<span className="mono-voice-recording-dot"/>}
    </button>
    {(opened||recorder.recording||sending)&&<section className="mono-voice-overlay" role="region" aria-label="Vocaux de la partie">
      <header><strong>Vocaux · {voices.length}/10</strong><button type="button" onClick={()=>setOpened(false)} aria-label="Masquer les vocaux">×</button></header>
      {recorder.recording&&<p className="mono-voice-record-state">● Enregistrement {fmt(recorder.elapsed)} · Relâche pour envoyer</p>}
      {sending&&<p className="mono-voice-note">Envoi du vocal…</p>}
      {error&&<p className="mono-voice-error" role="alert">{error}</p>}
      <div className="mono-voice-list">
        {voices.length?voices.map(voice=><VoiceLine key={voice.id} voice={voice} roomId={roomId} mine={Number(voice.userId)===Number(userId)}/>):
          <p className="mono-voice-empty">Aucun vocal. Maintiens le micro rouge pour parler.</p>}
      </div>
    </section>}
  </>;
}
