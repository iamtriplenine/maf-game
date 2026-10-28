import {useState} from 'react';
import '../styles/tournament-references.css';

// Un code de suivi ne donne jamais acces a une partie privee.
export default function TournamentReference({value,label='Référence partie'}) {
 const [message,setMessage]=useState('');
 if(!value)return null;
 async function copy(){
  try{
   if(!navigator.clipboard?.writeText)throw Error('Copie indisponible');
   await navigator.clipboard.writeText(value);setMessage('Copié');
  }catch{setMessage('Sélectionne le code pour le copier');}
 }
 return <span className="maf-match-reference" aria-label={`${label} : ${value}`}>
   <span className="maf-match-reference__label">{label}</span>
   <code title="Code à donner au support en cas de problème">{value}</code>
   <button type="button" onClick={()=>void copy()} aria-label={`Copier ${label.toLowerCase()}`} title="Copier la référence">Copier</button>
   {message&&<small role="status">{message}</small>}
 </span>;
}
