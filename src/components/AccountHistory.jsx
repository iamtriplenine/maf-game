import { useEffect, useState } from 'react';
import { walletRequest } from '../api/accounts';
import { registerRefresh } from '../api/refresh';
import HourglassLoader from './HourglassLoader';
import '../styles/history.css';

const PAGE = 20;
const money = value => new Intl.NumberFormat('fr-CI').format(value || 0);
const date = value => value ? new Date(value).toLocaleString('fr-FR') : '—';
const unit = currency => currency === 'V' ? 'V' : 'F CFA';
const signed = value => `${value > 0 ? '+' : value < 0 ? '−' : ''}${money(Math.abs(value))}`;
const tone = value => value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral';
const titles = { deposit:'Dépôt',withdrawal:'Retrait',coupon:'Coupon utilisé',game_stake:'Mise de jeu',game_payout:'Gain de jeu',game_refund:'Mise remboursée' };
function status(t) {
  if (t.status === 'awaiting_payment') return 'Paiement et capture attendus';
  if (t.status === 'pending') return t.kind === 'withdrawal' ? 'Paiement en attente' : 'Vérification en cours';
  if (t.status === 'rejected') return t.kind === 'withdrawal' ? 'Refusé · remboursé' : 'Refusé';
  if (t.kind === 'withdrawal') return 'Payé';
  if (t.kind === 'deposit') return 'Confirmé';
  return 'Effectué';
}
function Transaction({ item:t }) {
  return <article className="history-card">
    <div className="history-card__top"><h3>{titles[t.kind] || 'Transaction'}</h3><strong className={'history-amount history-amount--'+tone(t.delta)}>{t.delta ? signed(t.delta) : money(t.amount)} <small>{unit(t.currency)}</small></strong></div>
    <p className={'history-status history-status--'+t.status}>{status(t)}</p>
    <p className="history-muted">{t.currency === 'V' ? 'Solde bonus' : 'Solde argent'}{t.room_code ? ` · Salon ${t.room_code}` : ''}</p>
    {(t.kind === 'deposit' || t.kind === 'withdrawal') && <p className="history-muted">{t.kind === 'deposit' ? 'Montant crédité' : 'Montant à recevoir'} : {money(t.amount)} {unit(t.currency)} · Frais (1 %) : {money(t.fee_amount || 0)} {unit(t.currency)}{t.kind === 'withdrawal' ? ` · Frais de retrait (18 %) : ${money((t.total_amount ?? t.amount) - t.amount - (t.fee_amount || 0))} ${unit(t.currency)}` : ''} · {t.kind === 'deposit' ? (t.status === 'approved' ? 'Total payé' : 'Total demandé') : 'Total débité'} : {money(t.total_amount ?? t.amount)} {unit(t.currency)}</p>}
    {t.delta === 0 && <p className="history-muted">{t.kind === 'withdrawal' ? 'Le débit initial a été remboursé sur le solde d’origine.' : 'Ce montant n’a pas été crédité.'}</p>}
    {t.phone && <p className="history-muted">Numéro : {t.phone}</p>}
    {t.reference && <p className="history-reference">{t.kind === 'coupon' ? 'Coupon' : t.room_code ? 'Partie' : 'Référence du paiement'} : {t.reference}</p>}
    {t.note && <p className="history-note">{t.note}</p>}
    <time className="history-date" dateTime={t.created_at}>{date(t.created_at)}</time>
    {t.decided_at && <p className="history-muted">Décision : {date(t.decided_at)}</p>}
  </article>;
}
function Game({ item:g }) {
  const mine = g.viewer_side, theirs = mine === 'host' ? 'guest' : 'host';
  const score = g.scores && Number.isFinite(g.scores[mine]) && Number.isFinite(g.scores[theirs]);
  const labels = { won:'Victoire',lost:'Défaite',cancelled:'Partie annulée',ongoing:g.status === 'ready' ? 'En attente de lancement' : 'Partie en cours',unknown:'Résultat indisponible' };
  return <article className="history-card">
    <div className="history-card__top"><h3>{g.game === 'monopoly' ? 'Monopoly' : 'Tir au but'}</h3><span className={'history-result history-result--'+g.outcome}>{labels[g.outcome]}</span></div>
    <p className="history-opponent">Toi contre <strong>{g.opponent || 'Adversaire'}</strong></p>
    {score && <p className="history-score" aria-label={`Ton score ${g.scores[mine]}, adversaire ${g.scores[theirs]}`}>{g.scores[mine]} <span>–</span> {g.scores[theirs]}</p>}
    {g.forfeit_side && <p className="history-muted">{g.forfeit_side === mine ? 'Tu as abandonné la partie.' : 'Ton adversaire a abandonné la partie.'}</p>}
    <dl className="history-game-money"><div><dt>Mise</dt><dd>{money(g.stake)} F CFA</dd></div><div><dt>{g.outcome === 'cancelled' ? 'Remboursé' : 'Reçu'}</dt><dd>{g.received === null ? 'En attente' : `${money(g.received)} F CFA`}</dd></div><div><dt>Bilan net</dt><dd className={'history-amount--'+tone(g.net)}>{g.net === null ? 'En attente' : `${signed(g.net)} F CFA`}</dd></div></dl>
    <p className="history-muted">Salon {g.code}{g.game === 'monopoly' ? '' : ` · ${g.shots} tirs par joueur`}{g.net === null && g.status === 'finished' ? ' · Règlement non confirmé' : ''}</p>
    <time className="history-date" dateTime={g.updated_at}>{date(g.updated_at)}</time>
  </article>;
}
export default function AccountHistory() {
  const [tab,setTab] = useState('transactions'), [offset,setOffset] = useState(0), [revision,setRevision] = useState(0);
  const [result,setResult] = useState({ key:null,items:[],total:0,summary:null,error:'' });
  const requestKey = JSON.stringify([tab,offset,revision]);
  const loading = result.key !== requestKey;
  useEffect(() => {
    let alive = true, call = 0;
    async function load() {
      const current = ++call;
      try {
        const data = await walletRequest(`/api/history/${tab}?limit=${PAGE}&offset=${offset}`);
        if (alive && current === call) setResult({ key:requestKey,items:data.items,total:data.total,summary:data.summary || null,error:'' });
      } catch(e) {
        if (alive && current === call) setResult(old => old.key === requestKey ? { ...old,error:e.message } : { key:requestKey,items:[],total:0,summary:null,error:e.message });
        throw e;
      }
    }
    load().catch(() => {});
    const unregister = registerRefresh(load);
    const timer = setInterval(() => { if (!document.hidden) load().catch(() => {}); },15000);
    return () => { alive = false; unregister(); clearInterval(timer); };
  },[tab,offset,requestKey]);
  function changeTab(value) { setTab(value); setOffset(0); }
  const summary = !loading && tab === 'games' ? result.summary : null;
  return <section className="account-history">
    <nav className="history-tabs" aria-label="Type d’historique">
      <button type="button" aria-pressed={tab === 'transactions'} onClick={() => changeTab('transactions')}>Transactions</button>
      <button type="button" aria-pressed={tab === 'games'} onClick={() => changeTab('games')}>Jeux</button>
    </nav>
    <p className="history-description">{tab === 'transactions' ? 'Dépôts, retraits, coupons, mises et gains, du plus récent au plus ancien.' : 'Tes parties et leurs résultats. Le bilan net correspond à la somme reçue moins ta mise.'}</p>
    {summary && <>
      <dl className="history-summary"><div><dt>Parties terminées</dt><dd>{money(summary.played)}</dd></div><div><dt>Victoires</dt><dd>{money(summary.won)}</dd></div><div><dt>Défaites</dt><dd>{money(summary.lost)}</dd></div><div><dt>Bilan net réglé · F CFA</dt><dd className={'history-amount--'+tone(summary.net)}>{signed(summary.net)}</dd></div></dl>
      {summary.unsettled > 0 && <p className="history-muted">{money(summary.unsettled)} partie(s) en attente de règlement, exclue(s) du bilan net.</p>}
    </>}
    <div className="history-toolbar"><span>{loading ? 'Chargement…' : `${money(result.total)} élément(s)`}</span><button type="button" className="btn btn--glass btn--sm" disabled={loading} onClick={() => setRevision(n => n+1)}>Actualiser</button></div>
    {!loading && result.error && <p className="sheet__error" role="alert">{result.error}</p>}
    <div className="history-list" aria-busy={loading} aria-label={tab === 'games' ? 'Historique des jeux' : 'Historique des transactions'}>
      {loading ? <HourglassLoader/> : result.items.length === 0 && !result.error ? <p className="history-empty">{tab === 'games' ? 'Aucune partie jouée pour le moment.' : 'Aucune transaction pour le moment.'}</p> : result.items.map(item => tab === 'games' ? <Game key={`${item.game}:${item.id}`} item={item}/> : <Transaction key={item.id} item={item}/>)}
    </div>
    {!loading && result.total > 0 && <div className="history-pagination">
      <button type="button" className="btn btn--glass btn--sm" disabled={offset === 0} onClick={() => setOffset(n => Math.max(0,n-PAGE))}>Précédent</button>
      <span>{Math.min(offset+1,result.total)}–{Math.min(offset+PAGE,result.total)} / {money(result.total)}</span>
      <button type="button" className="btn btn--glass btn--sm" disabled={offset+PAGE >= result.total} onClick={() => setOffset(n => n+PAGE)}>Suivant</button>
    </div>}
  </section>;
}
