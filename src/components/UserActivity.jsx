import { useState } from 'react';
import { adminRequest } from '../api/accounts';
import '../styles/user-activity.css';

const GAMES = { monopoly:'Monopoly',penalty:'Tir au but',ludo:'Ludo',checkers:'Dames',tank:'Tank Battle',tankrun:'Tank Run',dice:'Dés' };
const KINDS = { deposit:'Dépôt',withdrawal:'Retrait',coupon:'Coupon',game_stake:'Mise',game_payout:'Gain',game_refund:'Remboursement',
  tournament_stake:'Tournoi · mise',tournament_refund:'Tournoi · remboursé',tournament_payout:'Tournoi · gain' };
const OUTCOMES = { won:'Gagné',lost:'Perdu',cancelled:'Annulé',ongoing:'En cours',unknown:'Inconnu' };
const fmt = n => new Intl.NumberFormat('fr-CI').format(n || 0);
const signed = n => (n > 0 ? '+' : '') + fmt(n);
const when = v => v ? new Date(v).toLocaleString('fr-FR',{ day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'Africa/Abidjan' }) : '—';
const cls = n => n > 0 ? 'ua-pos' : n < 0 ? 'ua-neg' : 'ua-zero';

function score(g) {
  const s = g.scores;
  if (!s || typeof s !== 'object' || typeof s.host !== 'number' || typeof s.guest !== 'number') return null;
  return g.viewer_side === 'guest' ? `${s.guest}–${s.host}` : `${s.host}–${s.guest}`;
}

export default function UserActivity({ userId }) {
  const [data, setData] = useState(null), [error, setError] = useState(''), [loading, setLoading] = useState(false);
  async function load() {
    if (data || loading) return;
    setLoading(true); setError('');
    try { setData(await adminRequest(`/users/${userId}/activity?limit=30`)); }
    catch (e) { setError(e.message || 'Chargement impossible.'); }
    finally { setLoading(false); }
  }
  const sm = data?.summary;
  return <details className="ua" onToggle={e => { if (e.currentTarget.open) void load(); }}>
    <summary>Activité du joueur (parties et argent)</summary>
    {loading && <p className="ua-muted">Chargement…</p>}
    {error && <p className="admin-error" role="alert">{error}</p>}
    {data && <>
      <p className="ua-sum">{fmt(data.total_games)} parties · {fmt(sm?.won)} gagnées · {fmt(sm?.lost)} perdues · net <b className={cls(sm?.net)}>{signed(sm?.net)} F</b></p>
      {data.games.length === 0 ? <p className="ua-muted">Aucune partie.</p> : <ul className="ua-list">
        {data.games.map(g => <li key={g.game + g.id}><details>
          <summary><span className="ua-date">{when(g.updated_at)}</span><span className="ua-game">{GAMES[g.game] || g.game}</span>
            <span className={'ua-net ' + (g.net == null ? 'ua-zero' : cls(g.net))}>{g.net == null ? '…' : signed(g.net)}</span></summary>
          <div className="ua-detail">
            <span>Adversaire : <b>{g.opponent || 'inconnu'}</b></span>
            <span>Résultat : {OUTCOMES[g.outcome] || g.outcome}{g.forfeit_side ? ' (forfait)' : ''}</span>
            <span>Mise : {fmt(g.stake)} F · Reçu : {g.received == null ? '—' : fmt(g.received) + ' F'}</span>
            {score(g) && <span>Score : {score(g)}</span>}
            <span>Salon : {g.code || g.id}</span>
          </div>
        </details></li>)}
      </ul>}
      {data.total_games > data.games.length && <p className="ua-muted">Les {data.games.length} plus récentes sur {fmt(data.total_games)}.</p>}
      <details className="ua-moves">
        <summary>Mouvements d’argent ({fmt(data.total_movements)})</summary>
        <ul className="ua-list">
          {data.movements.map(m => <li key={m.id} className="ua-move">
            <span className="ua-date">{when(m.created_at)}</span>
            <span className="ua-game">{KINDS[m.kind] || m.kind}{m.status && m.status !== 'approved' ? ` · ${m.status === 'pending' ? 'à vérifier' : m.status === 'rejected' ? 'refusé' : 'en attente'}` : ''}{m.note ? ` · ${m.note}` : ''}</span>
            <span className={'ua-net ' + cls(Number(m.delta))}>{Number(m.delta) ? signed(Number(m.delta)) : fmt(m.amount)}{m.currency === 'V' ? ' V' : ''}</span>
          </li>)}
        </ul>
      </details>
    </>}
  </details>;
}
