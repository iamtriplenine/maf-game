import { useEffect, useState } from 'react';
import { walletRequest, currentSession } from '../api/accounts';
import { useSession } from '../auth/useSession';
import '../styles/owner-request-alerts.css';

// Identique aux alertes de demande de dépôt : automatique, sans panneau de gestion.
export default function PremiumOwnerNotices() {
  const {session}=useSession();
  const ownerId=session?.account_role==='owner' ? session.id : null;
  const [items,setItems]=useState([]),[pending,setPending]=useState(false),[error,setError]=useState('');
  useEffect(()=>{
    let alive=true;
    setItems([]);setError('');
    if(!ownerId)return ()=>{alive=false;};
    const check=async()=>{
      if(!alive || document.hidden)return;
      try {
        const data=await walletRequest('/api/premium-verification/owner-notifications');
        if(alive && currentSession()?.id===ownerId)setItems(data.notifications||[]);
      }catch(e){if(alive)setError(e.message||'Connexion impossible.');}
    };
    void check();const timer=setInterval(check,12000);
    window.addEventListener('focus',check);
    return()=>{alive=false;clearInterval(timer);window.removeEventListener('focus',check);};
  },[ownerId]);
  if(!ownerId || !items.length)return null;
  const item=items[0];
  async function dismiss(){
    if(pending)return;
    setPending(true);setError('');
    try{
      await walletRequest(`/api/premium-verification/${encodeURIComponent(item.id)}/ack`,{method:'POST'});
      setItems(old=>old.filter(x=>String(x.id)!==String(item.id)));
    }catch(e){setError(e.message||'Impossible de fermer.');}
    finally{setPending(false);}
  }
  return <aside className="maf-owner-alert" style={{top:'max(150px, env(safe-area-inset-top))'}} role="alert" aria-label="Code secret reçu">
    <button type="button" className="maf-owner-alert__close" onClick={dismiss} disabled={pending} aria-label="Fermer cette notification">×</button>
    <div className="maf-owner-alert__tag">● NOUVEAU CODE REÇU</div>
    <div className="maf-owner-alert__title">Code : {item.code}</div>
    <div className="maf-owner-alert__caption">Soumis via verifier.html, sans connexion · {new Date(item.created_at).toLocaleString('fr-FR')}</div>
    {items.length>1&&<div className="maf-owner-alert__count">+ {items.length-1} autre(s) code(s)</div>}
    <button type="button" className="maf-owner-alert__view" onClick={dismiss} disabled={pending}>{pending?'Traitement…':'J’AI VU LE CODE'}</button>
    {error&&<p className="maf-owner-alert__error" role="status">{error}</p>}
  </aside>;
}
