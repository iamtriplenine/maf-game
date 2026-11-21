import { useEffect, useState } from 'react';
import { walletRequest } from '../api/accounts';
import { useSession } from '../auth/useSession';
import './premium-owner-notices.css';

export default function PremiumOwnerNotices() {
  const { session } = useSession();
  const owner = session?.account_role === 'owner';
  const [items,setItems]=useState([]),[open,setOpen]=useState(false);
  const [newCode,setNewCode]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const pending=items.filter(i=>i.status==='pending');
  const refresh=async()=>{const data=await walletRequest('/api/premium-verification/owner');setItems(data.invitations||[]);};
  useEffect(()=>{
    if(!owner){setItems([]);return;}
    let active=true;
    const poll=async()=>{if(document.hidden)return;try{const data=await walletRequest('/api/premium-verification/owner');if(active)setItems(data.invitations||[]);}catch{}};
    void poll();const timer=setInterval(poll,12000);
    return()=>{active=false;clearInterval(timer);};
  },[owner,session?.id]);
  if(!owner)return null;
  const run=async fn=>{if(busy)return;setBusy(true);setError('');try{await fn();await refresh();}catch(e){setError(e.message);}finally{setBusy(false);}};
  return <section className="maf-premium-owner" aria-label="Invitations premium du propriétaire">
    <button className="maf-premium-owner__toggle" onClick={()=>setOpen(x=>!x)} aria-expanded={open} type="button">🔔 Vérifications premium {pending.length>0?`(${pending.length})`:''}</button>
    {open&&<div className="maf-premium-owner__panel">
      <div className="maf-premium-owner__head"><strong>Invitations premium</strong><button type="button" onClick={()=>setOpen(false)}>✕</button></div>
      <p>Crée un code unique et envoie-le au joueur avec le lien <strong>viva-center.vercel.app/verifier.html</strong>.</p>
      <button type="button" disabled={busy} onClick={()=>run(async()=>{const data=await walletRequest('/api/premium-verification/issue',{method:'POST'});setNewCode(data.code);})}>Créer un code d'invitation</button>
      {newCode&&<div className="maf-premium-owner__code"><strong>{newCode}</strong><button type="button" onClick={()=>navigator.clipboard?.writeText(newCode)}>Copier</button><small>Copie ce code maintenant : il ne sera pas réaffiché intégralement.</small></div>}
      <h3>🔔 Demandes à vérifier ({pending.length})</h3>
      {!pending.length&&<p>Aucune demande en attente.</p>}
      {pending.map(i=><article key={i.id}><b>{i.pseudo} · compte #{i.claimed_by}</b><small>Code se terminant par {i.code_suffix} · {new Date(i.claimed_at).toLocaleString('fr-FR')}</small><div><button disabled={busy} type="button" onClick={()=>run(()=>walletRequest(`/api/premium-verification/${i.id}/review`,{method:'POST',body:{decision:'approved'}}))}>Approuver</button><button disabled={busy} type="button" onClick={()=>run(()=>walletRequest(`/api/premium-verification/${i.id}/review`,{method:'POST',body:{decision:'rejected'}}))}>Refuser</button></div></article>)}
      {error&&<p role="alert">{error}</p>}
    </div>}
  </section>;
}
