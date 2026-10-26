import { useState } from 'react';
import { walletRequest } from '../api/accounts';
import '../styles/owner-win-codes.css';

const OPTIONS = [
  {value:'match',label:'Une partie'},
  {value:'60',label:'1 minute'},
  {value:'120',label:'2 minutes'},
  {value:'300',label:'5 minutes'},
  {value:'3600',label:'1 heure'},
  {value:'86400',label:'1 jour'},
];
export default function OwnerWinCodes() {
  const [game,setGame] = useState('all');
  const [length,setLength] = useState('match');
  const [coupon,setCoupon] = useState(null);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [copied,setCopied] = useState(false);
  async function create(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);setError('');setCopied(false);setCoupon(null);
    try {
      const result = await walletRequest('/api/win-practice/create', {
        method:'POST',body:{game,kind:length==='match'?'match':'duration',
          ...(length==='match'?{}:{duration_seconds:Number(length)})},
      });
      setCoupon(result.coupon);
    } catch(err) { setError(err.message || 'Creation impossible.'); }
    finally { setBusy(false); }
  }
  async function copy() {
    if (!coupon) return;
    try { await navigator.clipboard.writeText(coupon.code); setCopied(true); }
    catch { setError('Selectionne le code pour le copier.'); }
  }
  return <section className="win-codes">
    <p className="sheet__text">Génère un code personnel de Mode Win. Il fonctionne dans les parties contre le robot et les parties multijoueurs. Les mises et les gains suivent les règles habituelles du jeu.</p>
    <form className="wallet-form" onSubmit={create}>
      <label className="wallet-label">Jeu
        <select value={game} onChange={e=>setGame(e.target.value)} disabled={busy}>
          <option value="all">Tous les jeux compatibles</option>
          <option value="penalty">Tir au but</option>
          <option value="tank">Tank Battle</option>
          <option value="dice">Lancer de dés</option>
          <option value="monopoly">Monopoly</option>
        </select>
      </label>
      <label className="wallet-label">Validité après utilisation du coupon
        <select value={length} onChange={e=>setLength(e.target.value)} disabled={busy}>
          {OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
      <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
        {busy?'Génération…':'Générer le code Win'}
      </button>
    </form>
    {error && <p className="sheet__error" role="alert">{error}</p>}
    {coupon && <div className="win-codes__result" aria-live="polite">
      <strong>Code prêt à partager</strong>
      <input readOnly value={coupon.code} onFocus={e=>e.currentTarget.select()} aria-label="Code Win généré" />
      <button className="btn btn--glass btn--block" type="button" onClick={copy}>{copied?'Copié !':'Copier le code'}</button>
      <p className="sheet__text">Le destinataire saisit ce code dans « Coupons ». Un code est utilisable par un seul compte.</p>
    </div>}
  </section>;
}
