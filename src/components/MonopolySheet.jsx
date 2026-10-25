import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
export default function MonopolySheet({ title, onClose, children }) {
 const panel=useRef(null),close=useRef(onClose);close.current=onClose;
 useEffect(()=>{
  const previous=document.activeElement,overflow=document.body.style.overflow;
  document.body.style.overflow='hidden';panel.current?.querySelector('button')?.focus({preventScroll:true});
  const key=e=>{
   if(e.key==='Escape'){e.preventDefault();close.current();}
   if(e.key!=='Tab')return;
   const nodes=[...panel.current.querySelectorAll('button:not(:disabled),input,select,textarea,summary,[tabindex="0"]')].filter(n=>n.getClientRects().length);
   const first=nodes[0],last=nodes.at(-1);if(!first){e.preventDefault();return;}
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
   else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  };
  document.addEventListener('keydown',key);
  return()=>{document.body.style.overflow=overflow;document.removeEventListener('keydown',key);previous?.focus?.({preventScroll:true});};
 },[]);
 return createPortal(<div className="mono-sheet-backdrop" onClick={onClose}>
  <section ref={panel} className="mono-sheet" role="dialog" aria-modal="true" aria-label={title} onClick={e=>e.stopPropagation()}>
   <header><h2>{title}</h2><button type="button" className="btn btn--sm" onClick={onClose} aria-label="Fermer le panneau">✕</button></header>
   <div className="mono-sheet__content">{children}</div>
  </section>
 </div>,document.body);
}
