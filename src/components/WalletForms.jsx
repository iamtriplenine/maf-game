import { registerRefresh } from '../api/refresh';
import { useEffect, useRef, useState } from 'react';
import { walletRequest, setAdminAccess } from '../api/accounts';
import { IconFranc, IconV } from './Icons';
import HourglassLoader from './HourglassLoader';

const format = n => new Intl.NumberFormat('fr-CI').format(n || 0);
const labels = { awaiting_payment:'Paiement et capture attendus', pending:'En cours de verification', approved:'Recharge confirmee', rejected:'Demande refusee' };
export function WalletBalances({ user }) {
  return <div className="wallet-balances" aria-label="Mes soldes">
    <div className="wallet-balance"><IconFranc size={26}/><span><small>Solde · F CFA</small><strong>{format(user?.balance)}</strong></span></div>
    <div className="wallet-balance wallet-balance--bonus"><IconV size={22}/><span><small>Bonus · V</small><strong>{format(user?.bonus_balance)}</strong></span></div>
  </div>;
}
export function CouponForm({ onUser, onAdmin }) {
  const [code,setCode] = useState(''), [busy,setBusy] = useState(false), [error,setError] = useState(''), [message,setMessage] = useState('');
  const inFlight = useRef(false);
  async function submit(e) {
    e.preventDefault(); if (inFlight.current) return; inFlight.current=true; setBusy(true); setError(''); setMessage('');
    try {
      const result = await walletRequest('/api/wallet/coupons/redeem',{ method:'POST',body:{ code } });
      if (result.admin_access) {
        setAdminAccess(result.admin_access);
        onAdmin?.();
        return;
      }
      onUser(result.user);
      setMessage(result.already_used ? 'Tu as deja utilise ce coupon. Son montant a deja ete credite.' : `${format(result.amount)} ${result.currency === 'F' ? 'F CFA' : 'V'} ajoutes a ton solde !`);
      setCode('');
    } catch(e) { setError(e.message); } finally { inFlight.current=false; setBusy(false); }
  }
  return <form className="wallet-form" onSubmit={submit} aria-busy={busy}>
    <p className="sheet__text">Entre ton code voucher pour recevoir une recharge ou des bonus V.</p>
    <label className="wallet-label">Code coupon<input autoComplete="off" maxLength={40} value={code} disabled={busy} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="TON-CODE" required/></label>
    {error && <p className="sheet__error" role="alert">{error}</p>}
    {message && <p className="wallet-notice" role="status">{message}</p>}
    {busy && <HourglassLoader />}
    <button className="btn btn--primary btn--block" disabled={busy || code.trim().length<4}>{busy ? 'Verification…':'Utiliser le coupon'}</button>
  </form>;
}
async function imageData(file) {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Choisis une capture PNG, JPEG ou WebP.');
  if (file.size > 2*1024*1024) throw new Error('La capture doit faire 2 Mo maximum.');
  return new Promise((resolve,reject)=>{const reader = new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Impossible de lire cette image.'));reader.readAsDataURL(file);});
}
export function RechargeForm({ user, onUser }) {
  const [phone,setPhone] = useState(''), [accepted,setAccepted] = useState(false), [amount,setAmount] = useState('100');
  const [items,setItems] = useState([]), [selected,setSelected] = useState(null), [file,setFile] = useState(null), [preview,setPreview] = useState('');
  const [busy,setBusy] = useState(false), [loading,setLoading] = useState(true), [error,setError] = useState('');
  const requestKey = useRef(null), inFlight = useRef(false), resumed = useRef(false);
  const [clock,setClock] = useState(Date.now);
  // Demandes retrouvees depuis PostgreSQL : reprise apres fermeture, redirection ou rechargement.
  useEffect(()=>{
    let alive = true, running = false;
    async function load() {
      if (running) return; running = true;
      try {
        const [wallet,history] = await Promise.all([walletRequest('/api/wallet'),walletRequest('/api/wallet/transactions')]);
        if (!alive) return;
        onUser(wallet.user); setClock(Date.now()); const deposits = history.transactions.filter(t=>t.kind==='deposit'); setItems(deposits);
        const resume = !resumed.current; resumed.current = true;
        setSelected(current=> current ? deposits.find(t=>t.id===current.id) || current : resume ? deposits.find(t=>['awaiting_payment','pending'].includes(t.status)) || null : null);
      } catch(e) { if (alive) setError(e.message); throw e; }
      finally { running=false; if (alive) setLoading(false); }
    }
    const unregister = registerRefresh(load);
    load().catch(()=>{});
    return ()=>{alive=false;unregister();};
  },[onUser]);
  useEffect(()=>()=>{ if (preview) URL.revokeObjectURL(preview); },[preview]);
  async function run(fn) {
    if (inFlight.current) return; inFlight.current=true; setBusy(true); setError('');
    try { await fn(); } catch(e) { setError(e.message); } finally { inFlight.current=false;setBusy(false); }
  }
  const deadline = user?.phone_verification_deadline;
  const expired = user?.phone && !user.phone_verified_at && deadline && new Date(deadline).getTime() <= clock;
  const phoneInfo = user?.phone && <div className="wallet-notice"><strong>{user.phone}</strong><br/>{user.phone_verified_at ? 'Numero verifie.' : `Verification en attente${deadline ? ' · avant le '+new Date(deadline).toLocaleDateString('fr-FR') : ''}.`}<br/>{expired ? 'Delai depasse : verification necessaire pour toute nouvelle transaction.' : 'Numero definitif pour tes depots et retraits.'}</div>;
  function select(t) {setSelected(t);setFile(null);setPreview('');setError('');}
  return <div className="wallet-form" aria-busy={loading || busy}>
    {busy && <HourglassLoader />}
    {loading ? <HourglassLoader /> : <>
      {phoneInfo}
      {!user?.phone ? <form className="wallet-form" onSubmit={e=>{e.preventDefault();run(async()=>{
        const result=await walletRequest('/api/wallet/phone',{method:'POST',body:{phone,accepted}});onUser(result.user);
      });}}>
        <p className="sheet__text">Enregistre ton numero Wave. Une fois enregistre, ce sera le seul numero autorise pour tes depots et retraits et tu ne pourras pas le changer. Tu peux l'utiliser immediatement pendant les 10 jours prevus pour sa verification.</p>
        <label className="wallet-label">Numero de telephone (+225)<input type="tel" autoComplete="tel" placeholder="07 00 00 00 00" value={phone} onChange={e=>setPhone(e.target.value)} disabled={busy} required/></label>
        <label className="wallet-check"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)} disabled={busy}/>Je confirme que ce numero sera definitif.</label>
        <button className="btn btn--primary btn--block" disabled={busy || !accepted}>{busy?'Enregistrement…':'Enregistrer et continuer'}</button>
      </form> : selected ? <>
        <div className="wallet-notice"><strong>{format(selected.amount)} F CFA</strong><br/>{labels[selected.status]}<br/><small>Demande {selected.id.slice(0,8)}</small></div>
        {selected.status==='awaiting_payment' && <>
          <a className="btn btn--primary btn--block" href={selected.payment_url} target="_blank" rel="noopener noreferrer">Acceder au paiement Wave ↗</a>
          <p className="sheet__text">Paie exactement {format(selected.amount)} F CFA depuis le numero {selected.phone}, puis reviens ici pour joindre la capture de confirmation du paiement.</p>
          <form className="wallet-form" onSubmit={e=>{e.preventDefault();run(async()=>{
            if (!file) throw new Error('Ajoute une capture du paiement.');
            const image=await imageData(file);
            const result=await walletRequest(`/api/wallet/deposits/${selected.id}/proof`,{method:'POST',body:{image}});
            setSelected(result.transaction);setItems(old=>old.map(t=>t.id===result.transaction.id?result.transaction:t));setFile(null);setPreview('');
          });}}>
            <label className="wallet-label">Capture du depot (2 Mo max.)<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e=>{const next=e.target.files?.[0]||null;setFile(next);setPreview(next?URL.createObjectURL(next):'');setError('');}} required/></label>
            {preview && <img className="wallet-proof" src={preview} alt="Apercu de ta capture de paiement"/>}
            <button className="btn btn--primary btn--block" disabled={busy || !file}>{busy?'Envoi…':'Valider le depot'}</button>
          </form>
        </>}
        {selected.status==='pending' && <p className="wallet-notice" role="status">Ta capture a ete envoyee. Objectif de traitement : moins de cinq minutes, apres verification du paiement par un administrateur. Ton solde se mettra a jour automatiquement.</p>}
        {selected.status==='approved' && <p className="wallet-notice" role="status">Depot confirme : ton solde a ete credite.</p>}
        {selected.status==='rejected' && <p className="sheet__error">{selected.admin_note || 'Contacte le support pour cette demande.'}</p>}
        <button type="button" className="btn btn--glass btn--block" disabled={busy} onClick={()=>select(null)}>Retour aux recharges</button>
      </> : <form className="wallet-form" onSubmit={e=>{e.preventDefault();run(async()=>{
        const value=Number(amount);
        if (!Number.isSafeInteger(value)||value<100||value>1000000) throw new Error('Entre un montant entier de 100 a 1 000 000 F CFA.');
        if (!requestKey.current || requestKey.current.amount!==value) requestKey.current={amount:value,key:crypto.randomUUID()};
        const result=await walletRequest('/api/wallet/deposits',{method:'POST',body:{amount:value,request_key:requestKey.current.key}});
        requestKey.current=null;setItems(old=>[result.transaction,...old.filter(t=>t.id!==result.transaction.id)]);select(result.transaction);
        // Navigation dans le meme onglet : fonctionne aussi si les popups sont bloques.
        window.location.assign(result.transaction.payment_url);
      });}}>
        <label className="wallet-label">Montant a recharger · F CFA<input type="number" inputMode="numeric" min="100" max="1000000" step="1" value={amount} onChange={e=>setAmount(e.target.value)} disabled={busy || expired} required/></label>
        <p className="sheet__text">Minimum 100 F CFA. Ta demande sera enregistree avant l'ouverture de Wave. Au retour, ouvre Recharger pour ajouter la capture.</p>
        <button className="btn btn--primary btn--block" disabled={busy || expired}>{busy?'Preparation…':'Acceder au paiement'}</button>
      </form>}
      {user?.phone && items.length>0 && <div className="wallet-history"><h3>Mes recharges recentes</h3>{items.map(t=><button type="button" key={t.id} disabled={busy} onClick={()=>select(t)}><strong>{format(t.amount)} F CFA</strong><span>{labels[t.status]}</span><small>{new Date(t.created_at).toLocaleString('fr-FR')}</small></button>)}</div>}
    </>}
    {error && <p className="sheet__error" role="alert">{error}</p>}
  </div>;
}
