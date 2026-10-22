import { useEffect, useRef, useState } from 'react';
import { adminRequest } from '../api/accounts';
import HourglassLoader from './HourglassLoader';
const money = n => new Intl.NumberFormat('fr-CI').format(n || 0);
const date = n => n ? new Date(n).toLocaleString('fr-FR') : '—';
const labels = { pending:'À payer', approved:'Payé', rejected:'Refusé et remboursé' };
const PAGE = 25;
function Detail({ transaction:t,onBack,onDone,onBusy }) {
  const [reference,setReference] = useState(''), [note,setNote] = useState('');
  const [checked,setChecked] = useState(false), [decision,setDecision] = useState(null);
  const [busy,setBusy] = useState(false), [error,setError] = useState('');
  const inFlight = useRef(false);
  async function submit() {
    if (inFlight.current || !decision) return;
    inFlight.current = true; setBusy(true); onBusy(true); setError('');
    try {
      await adminRequest(`/withdrawals/${t.id}/${decision}`,{ method:'POST',body:{ payment_reference:reference.trim(),note:note.trim() } });
      onDone(decision === 'approve' ? `Retrait de ${t.pseudo} confirmé.` : `Retrait refusé : ${money(t.total_amount ?? t.amount)} ${t.currency === 'V' ? 'V' : 'F CFA'} remboursés (frais compris).`);
    } catch(e) { setError(e.message); }
    finally { inFlight.current = false; setBusy(false); onBusy(false); }
  }
  return <section className="admin-detail" aria-busy={busy}>
    <button className="admin-btn" type="button" disabled={busy} onClick={onBack}>← Retour aux retraits</button>
    <article className="admin-card">
      <div className="admin-card__top"><h2>{money(t.amount)} F CFA</h2><span className={'admin-status admin-status--'+t.status}>{labels[t.status]}</span></div>
      <dl className="admin-info-grid">
        <div className="admin-info"><dt>Joueur</dt><dd>{t.pseudo} · #{t.user_id}</dd></div>
        <div className="admin-info"><dt>Numéro de paiement définitif</dt><dd>{t.phone}</dd></div>
        <div className="admin-info"><dt>Solde débité</dt><dd>{money(t.total_amount ?? t.amount)} {t.currency === 'V' ? 'V' : 'F CFA'} · {t.currency === 'V' ? 'Bonus (1 V = 1 F CFA)' : 'Argent réel'}</dd></div>
        <div className="admin-info"><dt>Frais service 1 %</dt><dd>{money(t.fee_amount || 0)} {t.currency === 'V' ? 'V' : 'F CFA'}</dd></div>
        <div className="admin-info"><dt>Commission propriétaire 18 %</dt><dd>{money(t.owner_fee_amount || 0)} {t.currency === 'V' ? 'V' : 'F CFA'} · créditée après validation</dd></div>
        <div className="admin-info"><dt>Demande</dt><dd>{date(t.created_at)}</dd></div>
        <div className="admin-info"><dt>Identifiant</dt><dd>{t.id}</dd></div>
        <div className="admin-info"><dt>Décision</dt><dd>{date(t.decided_at)}</dd></div>
      </dl>
      {t.payment_reference && <p>Référence Wave : {t.payment_reference}</p>}
      {t.admin_note && <p>Note : {t.admin_note}</p>}
    </article>
    {t.status === 'pending' && <div className="admin-card">
      <h3>Traiter le retrait</h3>
      <p className="admin-muted">Le solde du joueur a déjà été débité. Effectue le paiement de {money(t.amount)} F CFA au {t.phone}, puis confirme ici avec sa référence Wave. Un refus rembourse le solde d’origine.</p>
      <fieldset className="admin-fields" disabled={busy || Boolean(decision)}>
        <label>Référence du paiement Wave envoyé<input value={reference} maxLength={160} onChange={e => setReference(e.target.value)}/></label>
        <label>Note / motif de refus<textarea rows={3} maxLength={1000} value={note} onChange={e => setNote(e.target.value)}/></label>
        <label className="admin-check"><input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)}/>J’ai envoyé le paiement au numéro indiqué et vérifié le montant.</label>
      </fieldset>
      {decision ? <div className="admin-confirm">
        <strong>{decision === 'approve' ? 'Confirmer le paiement effectué ?' : `Refuser et rembourser ${money(t.total_amount ?? t.amount)} ${t.currency === 'V' ? 'V' : 'F CFA'} (frais compris) ?`}</strong>
        <div className="admin-actions"><button type="button" className="admin-btn" disabled={busy} onClick={() => setDecision(null)}>Annuler</button><button type="button" className="admin-btn admin-btn--primary" disabled={busy} onClick={submit}>{busy ? 'Traitement…' : 'Confirmer'}</button></div>
      </div> : <div className="admin-actions">
        <button type="button" className="admin-btn admin-btn--primary" disabled={!checked || reference.trim().length < 4 || busy} onClick={() => setDecision('approve')}>Paiement effectué</button>
        <button type="button" className="admin-btn admin-btn--danger" disabled={!note.trim() || busy} onClick={() => setDecision('reject')}>Refuser et rembourser</button>
      </div>}
      {busy && <HourglassLoader/>}
      {error && <p className="admin-error" role="alert">{error}</p>}
    </div>}
  </section>;
}
export default function WithdrawalAdmin({ onBusy }) {
  const [filter,setFilter] = useState('pending'), [offset,setOffset] = useState(0), [revision,setRevision] = useState(0);
  const [selected,setSelected] = useState(null), [flash,setFlash] = useState('');
  const [result,setResult] = useState({ key:null,rows:[],total:0,error:'' });
  const requestKey = JSON.stringify([filter,offset,revision]);
  const loading = requestKey !== result.key;
  useEffect(() => {
    let alive = true;
    adminRequest(`/transactions?kind=withdrawal&limit=${PAGE}&offset=${offset}${filter ? '&status='+filter : ''}`)
      .then(data => { if (alive) setResult({ key:requestKey,rows:data.transactions,total:data.total,error:'' }); })
      .catch(e => { if (alive) setResult({ key:requestKey,rows:[],total:0,error:e.message }); });
    return () => { alive = false; };
  },[filter,offset,requestKey]);
  if (selected) return <Detail key={selected.id} transaction={selected} onBusy={onBusy} onBack={() => setSelected(null)} onDone={message => { setFlash(message); setSelected(null); setRevision(n => n+1); }}/>;
  return <>
    {flash && <p className="admin-success" role="status">{flash}</p>}
    <div className="admin-toolbar"><label>État du retrait<select value={filter} onChange={e => { setFilter(e.target.value); setOffset(0); }}><option value="pending">À payer</option><option value="approved">Payés</option><option value="rejected">Refusés</option><option value="">Tous</option></select></label><button type="button" className="admin-btn" disabled={loading} onClick={() => setRevision(n => n+1)}>Actualiser</button></div>
    <section className="admin-results" aria-label="Liste des retraits" aria-busy={loading}>
      {loading ? <HourglassLoader/> : result.error ? <p role="alert" className="admin-error">{result.error}</p> : result.rows.length === 0 ? <p className="admin-empty">Aucun retrait pour ce filtre.</p> : result.rows.map(t => <article className="admin-card" key={t.id}>
        <div className="admin-card__top"><div><strong>{t.pseudo}</strong><p className="admin-muted">{t.phone} · {t.currency === 'V' ? 'Bonus V' : 'Argent réel'}</p></div><span className={'admin-status admin-status--'+t.status}>{labels[t.status]}</span></div>
        <div className="admin-card__bottom"><div className="admin-amount">{money(t.amount)} <small>F CFA</small><time>{date(t.created_at)}</time></div><button type="button" className="admin-btn admin-btn--primary" onClick={() => { setSelected(t); setFlash(''); }}>Examiner</button></div>
      </article>)}
    </section>
    {!loading && !result.error && result.total > 0 && <div className="admin-pagination"><button type="button" className="admin-btn" disabled={offset === 0} onClick={() => setOffset(n => Math.max(0,n-PAGE))}>Précédent</button><span>{offset+1}–{Math.min(offset+PAGE,result.total)} / {result.total}</span><button type="button" className="admin-btn" disabled={offset+PAGE >= result.total} onClick={() => setOffset(n => n+PAGE)}>Suivant</button></div>}
  </>;
}
