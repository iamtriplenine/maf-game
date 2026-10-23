import { useCallback, useEffect, useRef, useState } from 'react';
import { adminRequest, currentSession } from '../api/accounts';
import { registerRefresh } from '../api/refresh';
import HourglassLoader from './HourglassLoader';
import '../styles/admin-coupons.css';

const PAGE=25;
const money=n=>new Intl.NumberFormat('fr-CI').format(n || 0);
const date=n=>n ? new Date(n).toLocaleString('fr-FR') : 'Aucune';
const statusNames={active:'Disponible',expired:'Coupon expiré',disabled:'Désactivé'};
const unit=c=>c.currency==='V'?'V de bonus':'F CFA';
function readIntent(key) {
  try {
    const value=JSON.parse(sessionStorage.getItem(key));
    return value && typeof value.code==='string' && Number.isSafeInteger(value.amount) && ['F','V'].includes(value.currency) && value.max_uses===1 && (value.target_client_id == null || Number.isInteger(value.target_client_id) && value.target_client_id>=10000 && value.target_client_id<=99999) ? value : null;
  } catch { return null; }
}
function localDate(iso) {
  if(!iso)return '';
  const d=new Date(iso),pad=n=>String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function Status({coupon}) {
  return <span className={'coupon-status coupon-status--'+coupon.status}>{statusNames[coupon.status] || coupon.status}</span>;
}
function useAdminRead(path) {
  const [revision,setRevision]=useState(0),[result,setResult]=useState({key:null,data:null,error:''});
  const key=JSON.stringify([path,revision]);
  const reload=useCallback(()=>setRevision(n=>n+1),[]);
  useEffect(()=>{
    if(!path)return undefined;
    let alive=true,call=0;
    async function load() {
      const current=++call;
      try {
        const data=await adminRequest(path);
        if(alive && current===call)setResult({key,data,error:''});
      }catch(e){
        if(alive && current===call)setResult(old=>({key,data:old.key===key?old.data:null,error:e.message}));
        throw e;
      }
    }
    load().catch(()=>{});
    const unregister=registerRefresh(load);
    const timer=setInterval(()=>{if(!document.hidden)load().catch(()=>{});},15000);
    return ()=>{alive=false;unregister();clearInterval(timer);};
  },[path,key]);
  const loading=Boolean(path) && result.key!==key;
  return {data:loading?null:result.data,error:loading?'':result.error,loading,reload};
}
function CopyCode({code}) {
  const [message,setMessage]=useState('');
  async function copy() {
    try {await navigator.clipboard.writeText(code);setMessage('Code copié.');}
    catch {setMessage('Sélectionne le code ci-dessus pour le copier.');}
  }
  return <div className="coupon-copy">
    <input aria-label="Code du coupon" readOnly value={code} onFocus={e=>e.target.select()}/>
    <button type="button" className="admin-btn" onClick={copy}>Copier</button>
    {message && <p className="admin-muted" role="status">{message}</p>}
  </div>;
}
function CouponDetail({initial,onBack,onBusy}) {
  const [offset,setOffset]=useState(0),[busy,setBusy]=useState(false),[actionError,setActionError]=useState('');
  const inFlight=useRef(false);
  const {data,error,loading,reload}=useAdminRead(`/coupons/${encodeURIComponent(initial.code)}/uses?limit=${PAGE}&offset=${offset}`);
  const coupon=data?.coupon || initial;
  async function toggle() {
    if(inFlight.current)return;
    inFlight.current=true;setBusy(true);onBusy(true);setActionError('');
    try {
      await adminRequest(`/coupons/${encodeURIComponent(coupon.code)}`,{method:'PATCH',body:{active:!coupon.active}});
      reload();
    }catch(e){setActionError(e.message);}
    finally{inFlight.current=false;setBusy(false);onBusy(false);}
  }
  return <section className="admin-detail" aria-busy={busy}>
    <button type="button" className="admin-btn" disabled={busy} onClick={onBack}>← Retour aux coupons</button>
    <div className="admin-card">
      <div className="admin-card__top"><h2>{money(coupon.amount)} <small>{unit(coupon)}</small></h2><Status coupon={coupon}/></div>
      <CopyCode code={coupon.code}/>
      <p className="admin-muted">Destinataire : {coupon.target_client_id ? `Client ID ${coupon.target_client_id}` : 'Tout le monde'}</p>
      <dl className="admin-info-grid"><div className="admin-info"><dt>Création</dt><dd>{date(coupon.created_at)}</dd></div><div className="admin-info"><dt>Expiration prévue</dt><dd>{date(coupon.expires_at)}</dd></div><div className="admin-info"><dt>Utilisations</dt><dd>{money(coupon.uses)} / {money(coupon.max_uses)}</dd></div></dl>
      {coupon.status==='expired' && <p className="admin-muted">{coupon.expiry_reason==='used'?'Ce coupon a atteint sa limite d’utilisation.':'La date d’expiration est dépassée.'} Il ne peut plus être utilisé ni réactivé.</p>}
      {coupon.status!=='expired' && <button type="button" className="admin-btn" disabled={busy || loading || !data} onClick={toggle}>{coupon.active?'Désactiver le coupon':'Réactiver le coupon'}</button>}
      {actionError && <p className="admin-error" role="alert">{actionError}</p>}
    </div>
    <div className="admin-toolbar"><h3>Utilisé par</h3><button type="button" className="admin-btn" disabled={loading || busy} onClick={reload}>Actualiser les utilisations</button></div>
    {error && <p className="admin-error" role="alert">{error}</p>}
    {loading ? <HourglassLoader/> : data && data.redemptions.length===0 ? <p className="admin-empty">Personne n’a encore utilisé ce coupon.</p> : data?.redemptions.map(use=><article className="admin-card" key={use.user_id}>
      <strong>{use.pseudo}</strong><p className="admin-muted">Compte #{use.user_id} · Utilisé le {date(use.used_at)}</p><p className="admin-muted">{money(coupon.amount)} {unit(coupon)} crédités.</p>
    </article>)}
    {!loading && data?.total>0 && <div className="admin-pagination"><button type="button" className="admin-btn" disabled={busy || offset===0} onClick={()=>setOffset(n=>Math.max(0,n-PAGE))}>Précédent</button><span>{offset+1}–{Math.min(offset+PAGE,data.total)} / {data.total}</span><button type="button" className="admin-btn" disabled={busy || offset+PAGE>=data.total} onClick={()=>setOffset(n=>n+PAGE)}>Suivant</button></div>}
  </section>;
}
export default function AdminCoupons({onBusy}) {
  const [storageKey]=useState(()=>'maf-coupon-draft-'+currentSession()?.id);
  const [intent,setIntent]=useState(()=>readIntent(storageKey));
  const [amount,setAmount]=useState(()=>String(readIntent(storageKey)?.amount || 100));
  const [currency,setCurrency]=useState(()=>readIntent(storageKey)?.currency || 'F');
  const [audience,setAudience]=useState(()=>readIntent(storageKey)?.target_client_id ? 'client' : 'all');
  const [targetId,setTargetId]=useState(()=>String(readIntent(storageKey)?.target_client_id || ''));
  const [expiry,setExpiry]=useState(()=>localDate(readIntent(storageKey)?.expires_at));
  const [created,setCreated]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [filter,setFilter]=useState(''),[offset,setOffset]=useState(0),[selected,setSelected]=useState(null);
  const inFlight=useRef(false);
  const {data,error:loadError,loading,reload}=useAdminRead(selected?null:`/coupons?limit=${PAGE}&offset=${offset}${filter?'&status='+filter:''}`);
  function clearIntent(){try{sessionStorage.removeItem(storageKey);}catch{/* reponse recue */}setIntent(null);}
  async function create(e) {
    e.preventDefault();if(inFlight.current)return;
    inFlight.current=true;setBusy(true);onBusy(true);setError('');
    try {
      const request=intent || {code:'MAF-'+crypto.randomUUID().replaceAll('-','').toUpperCase(),amount:Number(amount),currency,max_uses:1,target_client_id:audience==='client'?Number(targetId):null,expires_at:expiry?new Date(expiry).toISOString():null};
      sessionStorage.setItem(storageKey,JSON.stringify(request));setIntent(request);
      const result=await adminRequest('/coupons',{method:'POST',body:request});
      setCreated(result.coupon);clearIntent();setOffset(0);setFilter('');reload();
    }catch(e){
      if(e.status>=400 && e.status<500)clearIntent();
      setError(e.message);
    }finally{inFlight.current=false;setBusy(false);onBusy(false);}
  }
  if(selected)return <CouponDetail key={selected.code} initial={selected} onBusy={onBusy} onBack={()=>{setSelected(null);reload();}}/>;
  return <section className="admin-coupons">
    <form className="admin-card" onSubmit={create} aria-busy={busy}>
      <h2>Générer un coupon</h2><p className="admin-muted">Usage unique : le premier joueur autorisé reçoit le montant choisi. Choisis un coupon accessible à tous ou réservé à un client.</p>
      <fieldset className="admin-fields" disabled={busy || Boolean(intent)}>
        <label>Destinataire<select value={audience} onChange={e=>setAudience(e.target.value)}><option value="all">Tout le monde</option><option value="client">Un client spécifique</option></select></label>
        {audience==='client' && <label>ID du client (5 chiffres)<input value={targetId} onChange={e=>setTargetId(e.target.value.replace(/\D/g,'').slice(0,5))} inputMode="numeric" pattern="[1-9][0-9]{4}" minLength={5} maxLength={5} placeholder="Ex. 10000" required/><span className="admin-muted">Retrouve cet ID dans Utilisateurs. Seul ce client pourra utiliser le code.</span></label>}
        <label>Montant du coupon<input type="number" inputMode="numeric" min="1" max="1000000" step="1" value={amount} onChange={e=>setAmount(e.target.value)} required/></label>
        <label>Solde à créditer<select value={currency} onChange={e=>setCurrency(e.target.value)}><option value="F">Argent réel · F CFA</option><option value="V">Bonus · V</option></select></label>
        <label>Expiration facultative (heure locale)<input type="datetime-local" value={expiry} onChange={e=>setExpiry(e.target.value)}/></label>
      </fieldset>
      {intent && <p className="admin-muted">Une création doit être vérifiée après une interruption. Réessaie pour retrouver le même coupon.</p>}
      <button className="admin-btn admin-btn--primary" disabled={busy || (!intent && (!Number.isSafeInteger(Number(amount)) || Number(amount)<1 || Number(amount)>1000000 || audience==='client' && !/^[1-9][0-9]{4}$/.test(targetId)))}>{busy?'Création…':intent?'Vérifier / reprendre la création':'Créer le coupon'}</button>
      {busy && <HourglassLoader/>}{error && <p className="admin-error" role="alert">{error}</p>}
    </form>
    {created && <div className="admin-card coupon-created" role="status"><strong>Coupon enregistré</strong><Status coupon={created}/><p>{money(created.amount)} {unit(created)} · Usage unique</p><p className="admin-muted">{created.target_client_id ? `Réservé au client ID ${created.target_client_id}` : 'Accessible à tout le monde'}</p><CopyCode key={created.code} code={created.code}/><button type="button" className="admin-btn" disabled={busy} onClick={()=>setSelected(created)}>Voir ce coupon</button></div>}
    {data?.summary && <div className="admin-stats"><div><span>Disponibles</span><strong>{money(data.summary.active)}</strong></div><div><span>Expirés</span><strong>{money(data.summary.expired)}</strong></div><div><span>Désactivés</span><strong>{money(data.summary.disabled)}</strong></div></div>}
    <div className="admin-toolbar"><label>État des coupons<select disabled={busy} value={filter} onChange={e=>{setFilter(e.target.value);setOffset(0);}}><option value="">Tous</option><option value="active">Disponibles</option><option value="expired">Expirés</option><option value="disabled">Désactivés</option></select></label><button type="button" className="admin-btn" disabled={busy || loading} onClick={reload}>Actualiser les coupons</button></div>
    {loadError && <p className="admin-error" role="alert">{loadError}</p>}
    <div className="admin-results" aria-label="Liste des coupons" aria-busy={loading}>
      {loading?<HourglassLoader/>:data?.coupons.length===0?<p className="admin-empty">Aucun coupon pour ce filtre.</p>:data?.coupons.map(c=><article className="admin-card" key={c.code}>
        <div className="admin-card__top"><strong>{money(c.amount)} {unit(c)}</strong><Status coupon={c}/></div>
        <p className="coupon-code">{c.code}</p><p className="admin-muted">{c.target_client_id ? `Client ID ${c.target_client_id}` : 'Tout le monde'}</p><p className="admin-muted">{money(c.uses)} / {money(c.max_uses)} utilisation(s) · Expiration : {date(c.expires_at)}</p>
        <button type="button" className="admin-btn" disabled={busy} onClick={()=>setSelected(c)}>Détails / utilisations</button>
      </article>)}
    </div>
    {!loading && data?.total>0 && <div className="admin-pagination"><button type="button" className="admin-btn" disabled={busy || offset===0} onClick={()=>setOffset(n=>Math.max(0,n-PAGE))}>Précédent</button><span>{offset+1}–{Math.min(offset+PAGE,data.total)} / {data.total}</span><button type="button" className="admin-btn" disabled={busy || offset+PAGE>=data.total} onClick={()=>setOffset(n=>n+PAGE)}>Suivant</button></div>}
  </section>;
}
