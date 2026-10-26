import AnimatedAmount from './AnimatedAmount';
import { useCallback, useEffect, useRef, useState } from 'react';
import { walletRequest } from '../api/accounts';
import { registerRefresh } from '../api/refresh';
import HourglassLoader from './HourglassLoader';
import { withdrawalFees } from '../utils/ownerFees';

const money = n => new Intl.NumberFormat('fr-CI').format(n || 0);
const statuses = { pending:'En attente de paiement', approved:'Retrait payé', rejected:'Retrait refusé · solde remboursé' };
const unit = t => t.currency === 'V' ? 'V de bonus' : 'F CFA';
function readIntent(key) {
  try {
    const value = JSON.parse(sessionStorage.getItem(key));
    return value && ['F','V'].includes(value.currency) && Number.isSafeInteger(value.amount) && typeof value.request_key === 'string' ? value : null;
  } catch { return null; }
}
export default function WithdrawalForm({ user, onUser, onRecharge }) {
  const storageKey = `maf-withdrawal-${user.id}`;
  const [intent,setIntent] = useState(() => readIntent(storageKey));
  const [currency,setCurrency] = useState(() => readIntent(storageKey)?.currency || 'F');
  const [amount,setAmount] = useState(() => String(readIntent(storageKey)?.amount || 100));
  const [info,setInfo] = useState(null), [items,setItems] = useState([]);
  const [clock,setClock] = useState(Date.now);
  const [loading,setLoading] = useState(true), [busy,setBusy] = useState(false);
  const [error,setError] = useState(''), [message,setMessage] = useState('');
  const inFlight = useRef(false), generation = useRef(0);
  const [retry,setRetry] = useState(0);
  const load = useCallback(async () => {
    const [data,history] = await Promise.all([
      walletRequest('/api/wallet/withdrawal-info'),
      walletRequest('/api/wallet/transactions?limit=100'),
    ]);
    return { data,items:history.transactions.filter(t => t.kind === 'withdrawal').slice(0,10) };
  },[]);
  useEffect(() => {
    let alive = true, running = false;
    async function refresh() {
      if (running || inFlight.current) return;
      running = true;
      const current = generation.current;
      try {
        const result = await load();
        if (alive && current === generation.current) { setClock(Date.now()); setInfo(result.data); setItems(result.items); onUser(result.data.user); }
      } catch(e) { if (alive) setError(e.message); throw e; }
      finally { running = false; if (alive) setLoading(false); }
    }
    refresh().catch(() => {});
    const unregister = registerRefresh(refresh);
    const timer = setInterval(() => { if (!document.hidden) refresh().catch(() => {}); },15000);
    return () => { alive = false; unregister(); clearInterval(timer); };
  },[load,onUser,retry]);
  const account = info?.user;
  const expired = account?.phone && !account.phone_verified_at && (!account.phone_verification_deadline || new Date(account.phone_verification_deadline).getTime() <= clock);
  const balance = Number(currency === 'V' ? user.bonus_balance : user.balance) || 0;
  const value = Number(amount);
  const costs = Number.isSafeInteger(value) && value >= 100 && value <= 1000000 ? withdrawalFees(value) : null;
  const fee = costs?.fee_amount ?? null;
  const ownerFee = costs?.owner_fee_amount ?? 0;
  const total = costs ? costs.total_amount : 0;
  const valid = costs !== null && total <= balance;
  function forgetIntent() {
    try { sessionStorage.removeItem(storageKey); } catch { /* La reponse est deja connue. */ }
    setIntent(null);
  }
  async function submit(e) {
    e.preventDefault();
    if (inFlight.current || (!intent && !valid)) return;
    generation.current += 1;
    inFlight.current = true; setBusy(true); setError(''); setMessage('');
    let accepted = false;
    try {
      const request = intent || { currency,amount:value,request_key:crypto.randomUUID() };
      // Conserver la cle AVANT l'envoi : une reponse perdue se reessaie sans second debit.
      sessionStorage.setItem(storageKey,JSON.stringify(request));
      setIntent(request);
      const result = await walletRequest('/api/wallet/withdrawals',{ method:'POST',body:request });
      accepted = true;
      onUser(result.user);
      setInfo(old => old ? { ...old,user:result.user } : old);
      setItems(old => [result.transaction,...old.filter(t => t.id !== result.transaction.id)].slice(0,10));
      forgetIntent();
      setMessage(result.transaction.status === 'pending'
        ? `Demande envoyée : ${money(result.transaction.total_amount ?? request.amount)} ${unit(request)} débités (1 % de frais de service et 18 % de frais de retrait). Tu recevras ${money(request.amount)} F CFA au ${result.transaction.phone}.`
        : `Demande déjà traitée : ${statuses[result.transaction.status]}.`);
    } catch(e) {
      // Les erreurs de validation sont definitives ; une panne reseau garde la meme cle.
      if (!accepted && e.status >= 400 && e.status < 500) forgetIntent();
      setError(e.message);
    } finally { inFlight.current = false; setBusy(false); }
  }
  return <div className="wallet-form" aria-busy={loading || busy}>
    {loading ? <HourglassLoader/> : <>
      {!info && <button type="button" className="btn btn--glass" onClick={() => { setLoading(true); setError(''); setRetry(n => n+1); }}>Réessayer</button>}
      {info && (!account.phone || !info.has_deposit) && <div className="wallet-notice">
        <p>Un premier dépôt confirmé est nécessaire avant tout retrait. Le numéro de ce dépôt sera utilisé définitivement.</p>
        <button type="button" className="btn btn--primary btn--block" onClick={onRecharge}>Recharger mon compte</button>
      </div>}
      {info && account.phone && info.has_deposit && <>
        <div className="wallet-notice"><strong>Numéro de retrait : {account.phone}</strong><br/>Numéro définitif, non modifiable.</div>
        {expired && <p className="sheet__error">Le délai de vérification du numéro est dépassé. Contacte l’administrateur pour le faire vérifier.</p>}
      </>}
      {((info?.has_deposit && account?.phone) || intent) && <form className="wallet-form" onSubmit={submit}>
        <fieldset className="withdrawal-fields" disabled={busy || Boolean(intent)}>
          <legend>Choisis le solde à retirer</legend>
          <label className="wallet-check"><input type="radio" name="withdrawal-currency" checked={currency === 'F'} onChange={() => setCurrency('F')}/>Argent réel · <AnimatedAmount value={user.balance} cacheKey={`wallet:${user.id}:F`} suffix=" F CFA"/></label>
          <label className="wallet-check"><input type="radio" name="withdrawal-currency" checked={currency === 'V'} onChange={() => setCurrency('V')}/>Bonus · <AnimatedAmount value={user.bonus_balance} cacheKey={`wallet:${user.id}:V`} suffix=" V"/></label>
          <label className="wallet-label">Montant à recevoir en F CFA<input type="number" inputMode="numeric" min="100" max="1000000" step="1" required value={amount} onChange={e => setAmount(e.target.value)}/></label>
        </fieldset>
        {costs && <div className="wallet-fees" role="status" aria-live="polite"><span>Montant à recevoir : <strong>{money(value)} F CFA</strong></span><span>Frais de service (1 %) : <strong>{money(fee)} {currency === 'V' ? 'V' : 'F CFA'}</strong></span><span>Frais de retrait (18 %) : <strong>{money(ownerFee)} {currency === 'V' ? 'V' : 'F CFA'}</strong></span><span className="wallet-fees__total">Total débité (19 % de frais) : <strong>{money(total)} {currency === 'V' ? 'V' : 'F CFA'}</strong></span></div>}
        <p className="sheet__text">Minimum : 100 F CFA. Le total des frais est de 19 %, arrondi au franc supérieur, dont 1 % de frais de service et 18 % de frais de retrait. Pour les bonus : 1 V = 1 F CFA. En cas de refus, tout sera remboursé.</p>
        {!intent && fee !== null && total > balance && <p className="sheet__error">Solde insuffisant pour le retrait et les frais de 19 %.</p>}
        {intent && <p className="wallet-notice">Une demande doit être vérifiée après une interruption. Réessaie avec la même demande pour éviter un double débit.</p>}
        <button className="btn btn--primary btn--block" disabled={busy || (!intent && (!valid || expired || !info?.has_deposit))}>
          {busy ? 'Envoi…' : intent ? 'Vérifier / renvoyer ma demande' : 'Valider le retrait'}
        </button>
      </form>}
    </>}
    {busy && <HourglassLoader/>}
    {error && <p className="sheet__error" role="alert">{error}</p>}
    {message && <p className="wallet-notice" role="status">{message}</p>}
    {items.length > 0 && <section className="wallet-form" aria-label="Derniers retraits"><h3>Derniers retraits</h3>{items.map(t => <div className="wallet-notice" key={t.id}>
      <strong>{money(t.amount)} F CFA à recevoir · {t.currency === 'V' ? 'Bonus V' : 'Argent réel'}</strong><br/>{statuses[t.status] || t.status}<br/>
      <small>Frais : {money(t.fee_amount || 0)} + frais de retrait : {money(t.owner_fee_amount || 0)} {t.currency === 'V' ? 'V' : 'F CFA'} · Débit total : {money(t.total_amount ?? t.amount)} {t.currency === 'V' ? 'V' : 'F CFA'}</small><br/>
      <small>{new Date(t.created_at).toLocaleString('fr-FR')} · {t.phone} · #{t.id.slice(0,8)}</small>
      {t.admin_note && <p>{t.admin_note}</p>}
    </div>)}</section>}
  </div>;
}
