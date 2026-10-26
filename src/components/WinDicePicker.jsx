import { useEffect, useState } from 'react';
import { winModeIsEnabled, onWinModeChange } from '../utils/winMode';
import '../styles/win-dice.css';

export function useWinDice(game,solo,turnKey,count) {
  const [enabled,setEnabled]=useState(()=>winModeIsEnabled(game,solo));
  const [choice,setChoice]=useState(null);
  useEffect(()=>onWinModeChange(()=>{
    const active=winModeIsEnabled(game,solo);
    setEnabled(active);
    if(!active)setChoice(null);
  }),[game,solo]);
  const value=Array.from({length:count===2?2:1},(_,i)=>
    choice?.key===turnKey?choice.values[i]??null:null);
  const complete=value.every(n=>Number.isInteger(n)&&n>=1&&n<=6);
  return {enabled,value,faces:complete?value:undefined,
    incomplete:value.some(n=>n!==null)&&!complete,
    choose:values=>setChoice({key:turnKey,values})};
}

export default function WinDicePicker({count,value,onChange,disabled=false,label='Prochain lancer'}) {
  return <fieldset className="win-dice" disabled={disabled}>
    <legend>🟢 Mode Win · {label}</legend>
    {Array.from({length:count===2?2:1},(_,i)=><div className="win-dice__row" key={i}>
      <span>Dé {i+1}</span>
      <div className="win-dice__faces" role="group" aria-label={`Face du dé ${i+1}`}>
        {[1,2,3,4,5,6].map(n=><button type="button" key={n} aria-label={`Dé ${i+1} : ${n}`}
          aria-pressed={value[i]===n} onClick={()=>onChange(value.map((face,k)=>k===i?n:face))}>{n}</button>)}
      </div>
    </div>)}
    <div className="win-dice__selection">
      <output aria-live="polite">{value.some(n=>n!==null)?value.map(n=>n??'—').join(' + '):'Aléatoire'}</output>
      <button type="button" onClick={()=>onChange(value.map(()=>null))}>Aléatoire</button>
    </div>
  </fieldset>;
}
