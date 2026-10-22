import { useEffect, useRef, useState } from 'react';
import { adminRequest } from '../api/accounts';
import HourglassLoader from './HourglassLoader';
import AdminChat from './AdminChat';
import WithdrawalAdmin from './WithdrawalAdmin';
import AdminCoupons from './AdminCoupons';
import '../styles/admin.css';

const money=value=>new Intl.NumberFormat('fr-CI').format(value || 0);
const date=value=>value ? new Date(value).toLocaleString('fr-FR') : '—';
const statusNames={awaiting_payment:'Capture attendue',pending:'À vérifier',approved:'Confirmé',rejected:'Refusé'};
const PAGE=25;
function Status({value}) { return <span className={'admin-status admin-status--'+value}>{statusNames[value] || value}</span>; }
function Info({label,children}) { return <div className="admin-info"><dt>{label}</dt><dd>{children || '—'}</dd></div>; }

function DepositDetail({transaction:t,onBack,onDone,onBusy}) {
  const [proof,setProof]=useState(''), [loading,setLoading]=useState(Boolean(t.has_proof));
  const [error,setError]=useState(''), [proofError,setProofError]=useState('');
  const [reference,setReference]=useState(''), [note,setNote]=useState(''), [checked,setChecked]=useState(false);
  const [decision,setDecision]=useState(null), [busy,setBusy]=useState(false);
  const [imageReady,setImageReady]=useState(false);
  const inFlight=useRef(false);
  const open=['awaiting_payment','pending'].includes(t.status);
  useEffect(()=>{
    if (!t.has_proof) return undefined;
    let alive=true, objectUrl;
    adminRequest(`/transactions/${t.id}/proof`,{responseType:'blob'}).then(blob=>{
      if (!alive) return;
      objectUrl=URL.createObjectURL(blob);setProof(objectUrl);
    }).catch(e=>{if(alive) setProofError(e.message);}).finally(()=>{if(alive)setLoading(false);});
    return ()=>{alive=false;if(objectUrl)URL.revokeObjectURL(objectUrl);};
  },[t.id,t.has_proof]);
  async function confirm() {
    if(inFlight.current || !decision) return;
    if(decision==='approve' && (!checked || reference.trim().length<4 || !imageReady)) return;
    if(decision==='reject' && !note.trim()) return;
    inFlight.current=true;setBusy(true);onBusy(true);setError('');
    try {
      const result=await adminRequest(`/deposits/${t.id}/${decision}`,{method:'POST',body:{payment_reference:reference.trim(),note:note.trim()}});
      onDone(result.transaction.status==='approved' ? `Dépôt confirmé : ${money(t.amount)} F CFA crédités à ${t.pseudo}.` : `Dépôt de ${t.pseudo} refusé.`);
    } catch(e) {setError(e.message);}
    finally {inFlight.current=false;setBusy(false);onBusy(false);}
  }
  return <section className="admin-detail" aria-label="Détail du dépôt" aria-busy={busy}>
    <button className="admin-btn admin-btn--quiet" type="button" onClick={onBack} disabled={busy}>← Retour aux dépôts</button>
    <div className="admin-card">
      <div className="admin-card__top"><div><p className="admin-eyebrow">Dépôt de {t.pseudo}</p><h2>{money(t.amount)} <small>F CFA</small></h2></div><Status value={t.status}/></div>
      <dl className="admin-info-grid"><Info label="Compte">{t.pseudo} · #{t.user_id}</Info><Info label="Numéro Wave">{t.phone}</Info><Info label="Demande créée">{date(t.created_at)}</Info><Info label="Capture envoyée">{date(t.submitted_at)}</Info><Info label="Référence de la demande">{t.id}</Info><Info label="Décision">{date(t.decided_at)}</Info></dl>
      {t.payment_reference && <p className="admin-message">Référence Wave : {t.payment_reference}</p>}
      {t.admin_note && <p className="admin-message">Note : {t.admin_note}</p>}
    </div>
    <div className="admin-card"><h3>Capture du paiement</h3>
      {loading && <HourglassLoader/>}
      {!t.has_proof && <p className="admin-muted">Le joueur n’a pas encore envoyé de capture. Le crédit reste indisponible.</p>}
      {proof && <a className="admin-proof-link" href={proof} target="_blank" rel="noopener noreferrer" title="Ouvrir la capture en grand"><img className="admin-proof" src={proof} alt="Capture du paiement envoyée par le joueur" onLoad={()=>setImageReady(true)} onError={()=>{setImageReady(false);setProofError('Cette capture ne peut pas être affichée.');}}/></a>}
      {proof && !proofError && <p className="admin-muted">Appuie sur la capture pour l’ouvrir en grand.</p>}
      {proofError && <p role="alert" className="admin-error">{proofError}</p>}
    </div>
    {open && <div className="admin-card">
      <h3>Traiter ce dépôt</h3>
      <p className="admin-muted">Compare la capture avec le paiement réellement reçu sur Wave. Vérifie le montant et le numéro avant de confirmer.</p>
      <fieldset className="admin-fields" disabled={busy || Boolean(decision)}>
        <label>Référence du paiement reçu sur Wave<input value={reference} maxLength={160} onChange={e=>setReference(e.target.value)} placeholder="Référence de la transaction Wave" autoComplete="off"/></label>
        <label>Note / motif du refus<textarea value={note} maxLength={1000} onChange={e=>setNote(e.target.value)} rows={3} placeholder="Motif obligatoire si tu refuses le dépôt"/></label>
        <label className="admin-check"><input type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)}/>J’ai vérifié le paiement reçu sur Wave : le montant et le numéro correspondent.</label>
      </fieldset>
      {!decision ? <div className="admin-actions">
        <button type="button" className="admin-btn admin-btn--primary" disabled={busy || t.status!=='pending' || !imageReady || !checked || reference.trim().length<4} onClick={()=>setDecision('approve')}>Confirmer le dépôt</button>
        <button type="button" className="admin-btn admin-btn--danger" disabled={busy || !note.trim()} onClick={()=>setDecision('reject')}>Refuser</button>
      </div> : <div className="admin-confirm">
        <strong>{decision==='approve' ? `Créditer ${money(t.amount)} F CFA au compte ${t.pseudo} ?` : `Refuser ce dépôt de ${money(t.amount)} F CFA ?`}</strong>
        <p>{decision==='approve' ? 'Le solde sera crédité une seule fois.' : 'Le motif sera visible par le joueur. Aucun crédit ne sera ajouté.'}</p>
        {busy && <HourglassLoader/>}
        <div className="admin-actions"><button type="button" className="admin-btn" disabled={busy} onClick={()=>setDecision(null)}>Annuler</button><button type="button" className={'admin-btn '+(decision==='approve'?'admin-btn--primary':'admin-btn--danger')} disabled={busy} onClick={confirm}>{busy?'Traitement…':decision==='approve'?'Oui, créditer le solde':'Oui, refuser'}</button></div>
      </div>}
      {error && <p role="alert" className="admin-error">{error}</p>}
    </div>}
  </section>;
}

export default function AdminPanel({onClose}) {
  const [tab,setTab]=useState('deposits'), [filter,setFilter]=useState('pending');
  const [search,setSearch]=useState(''), [draft,setDraft]=useState(''), [offset,setOffset]=useState(0);
  const [result,setResult]=useState({key:null,rows:[],total:0,summary:null,error:''});
  const [flash,setFlash]=useState('');
  const [revision,setRevision]=useState(0), [selected,setSelected]=useState(null), [acting,setActing]=useState(false);
  const requestKey=JSON.stringify([tab,filter,search,offset,revision]);
  const loading=result.key!==requestKey;
  const rows=loading?[]:result.rows, total=result.total, summary=result.summary;
  const error=loading?'':result.error;
  const root=useRef(null);
  useEffect(()=>{
    const previous=document.activeElement,overflow=document.body.style.overflow;
    document.body.style.overflow='hidden';root.current?.focus();
    return ()=>{document.body.style.overflow=overflow;if(previous?.isConnected)previous.focus();};
  },[]);
  useEffect(()=>{
    const key=e=>{
      if(e.key==='Escape' && !acting) {e.preventDefault();onClose();}
      if(e.key!=='Tab') return;
      const controls=[...root.current.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href]')];
      if(!controls.length) {e.preventDefault();root.current.focus();return;}
      const first=controls[0],last=controls.at(-1);
      if(e.shiftKey && (document.activeElement===first || document.activeElement===root.current)) {e.preventDefault();last.focus();}
      else if(!e.shiftKey && document.activeElement===last) {e.preventDefault();first.focus();}
    };
    document.addEventListener('keydown',key);return ()=>document.removeEventListener('keydown',key);
  },[acting,onClose]);
  useEffect(()=>{
    let alive=true;
    if(tab==='chat' || tab==='withdrawals' || tab==='coupons') return undefined; // l'onglet Messages charge ses propres donnees
    const query=tab==='deposits' ? `/transactions?kind=deposit&limit=${PAGE}&offset=${offset}${filter?'&status='+filter:''}` : `/users?limit=${PAGE}&offset=${offset}&q=${encodeURIComponent(search)}`;
    Promise.all([adminRequest(query),adminRequest('/summary')]).then(([data,stats])=>{
      if(!alive)return;
      setResult({key:requestKey,rows:tab==='deposits'?data.transactions:data.users,total:data.total,summary:stats,error:''});
    }).catch(e=>{if(alive)setResult(previous=>({...previous,key:requestKey,rows:[],error:e.message}));});
    return ()=>{alive=false;};
  },[tab,filter,search,offset,requestKey]);
  function changeTab(value) {setTab(value);setOffset(0);setSelected(null);setFlash('');}
  const pending=summary?.deposits.find(d=>d.status==='pending');
  const approved=summary?.deposits.find(d=>d.status==='approved');
  return <div className="admin-panel" ref={root} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="admin-title">
    <header className="admin-header"><div><p className="admin-eyebrow">VIVA CENTER</p><h1 id="admin-title">Administration</h1></div><button type="button" className="admin-btn" disabled={acting} onClick={onClose}>Fermer ✕</button></header>
    <main className="admin-main">
      <div className="admin-stats"><div><span>Utilisateurs</span><strong>{summary?money(summary.users):'—'}</strong></div><div><span>Dépôts à vérifier</span><strong>{summary?money(pending?.count):'—'}</strong></div><div><span>Dépôts confirmés · F CFA</span><strong>{summary?money(approved?.amount):'—'}</strong></div></div>
      <nav className="admin-tabs" aria-label="Sections du panel"><button type="button" aria-pressed={tab==='deposits'} disabled={acting} onClick={()=>changeTab('deposits')}>Dépôts</button><button type="button" aria-pressed={tab==='withdrawals'} disabled={acting} onClick={()=>changeTab('withdrawals')}>Retraits</button><button type="button" aria-pressed={tab==='coupons'} disabled={acting} onClick={()=>changeTab('coupons')}>Coupons</button><button type="button" aria-pressed={tab==='users'} disabled={acting} onClick={()=>changeTab('users')}>Utilisateurs</button><button type="button" aria-pressed={tab==='chat'} disabled={acting} onClick={()=>changeTab('chat')}>Messages</button></nav>
      {flash && <p className="admin-success" role="status">{flash}</p>}
      {tab==='coupons' ? <AdminCoupons onBusy={setActing}/> : tab==='withdrawals' ? <WithdrawalAdmin onBusy={setActing}/> : tab==='chat' ? <AdminChat onBusy={setActing}/> : selected ? <DepositDetail key={selected.id} transaction={selected} onBusy={setActing} onBack={()=>setSelected(null)} onDone={message=>{setFlash(message);setSelected(null);setRevision(n=>n+1);}}/> : <>
        <div className="admin-toolbar">
          {tab==='deposits' ? <label>État du dépôt<select value={filter} onChange={e=>{setFilter(e.target.value);setOffset(0);}}><option value="pending">À vérifier</option><option value="awaiting_payment">Capture attendue</option><option value="approved">Confirmés</option><option value="rejected">Refusés</option><option value="">Tous les dépôts</option></select></label> : <form onSubmit={e=>{e.preventDefault();setSearch(draft.trim());setOffset(0);}} className="admin-search"><label>Rechercher un utilisateur<input placeholder="Pseudo, numéro ou identifiant" value={draft} maxLength={80} onChange={e=>setDraft(e.target.value)}/></label><button className="admin-btn" type="submit">Rechercher</button></form>}
          <button className="admin-btn" type="button" disabled={loading} onClick={()=>setRevision(n=>n+1)}>Actualiser</button>
        </div>
        {error && <p className="admin-error" role="alert">{error}</p>}
        <section className="admin-results" aria-label={tab==='deposits'?'Liste des dépôts':'Liste des utilisateurs'} aria-busy={loading}>
          {loading ? <HourglassLoader/> : !error && rows.length===0 ? <div className="admin-empty">{tab==='deposits'?'Aucun dépôt pour ce filtre.':'Aucun utilisateur trouvé.'}</div> : rows.map(row=>tab==='deposits' ? <article className="admin-card admin-deposit" key={row.id}>
            <div className="admin-card__top"><div><strong>{row.pseudo}</strong><p className="admin-muted">{row.phone}</p></div><Status value={row.status}/></div>
            <div className="admin-card__bottom"><div className="admin-amount">{money(row.amount)} <small>F CFA</small><time>{date(row.created_at)}</time></div><button type="button" className="admin-btn admin-btn--primary" onClick={()=>{setSelected(row);setFlash('');}}>Examiner</button></div>
          </article> : <article className="admin-card" key={row.id}>
            <div className="admin-card__top"><div className="admin-user"><span className="admin-avatar" aria-hidden="true">{row.pseudo.slice(0,2).toUpperCase()}</span><div><strong>{row.pseudo}</strong><p className="admin-muted">Compte #{row.id}</p></div></div><span className="admin-muted">{row.phone_verified_at?'Numéro vérifié':row.phone?'À vérifier':'Sans numéro'}</span></div>
            <dl className="admin-info-grid"><Info label="Téléphone">{row.phone}</Info><Info label="Inscription">{date(row.created_at)}</Info><Info label="Solde F CFA">{money(row.balance)}</Info><Info label="Bonus V">{money(row.bonus_balance)}</Info>{row.phone && !row.phone_verified_at && <Info label="Vérification avant">{date(row.phone_verification_deadline)}</Info>}</dl>
          </article>)}
        </section>
        {!loading && !error && total>0 && <div className="admin-pagination"><button type="button" className="admin-btn" disabled={offset===0} onClick={()=>setOffset(n=>Math.max(0,n-PAGE))}>Précédent</button><span>{Math.min(offset+1,total)}–{Math.min(offset+PAGE,total)} / {total}</span><button type="button" className="admin-btn" disabled={offset+PAGE>=total} onClick={()=>setOffset(n=>n+PAGE)}>Suivant</button></div>}
      </>}
    </main>
  </div>;
}
