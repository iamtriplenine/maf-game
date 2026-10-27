import { useEffect, useState } from 'react';
import { ownerTournaments } from '../api/tournaments';
import { walletRequest } from '../api/accounts';
import '../styles/tournaments.css';

/** Gestion visible uniquement via le panneau proprietaire; l'API reverifie le compte 999. */
export default function TournamentDeletionPanel({ onDeleted, refreshKey }) {
  const [items,setItems] = useState([]);
  const [busy,setBusy] = useState(null);
  const [error,setError] = useState('');
  const [message,setMessage] = useState('');
  useEffect(() => {
    let active = true;
    ownerTournaments().then(data => {
      if (active) setItems((data.tournaments || []).filter(t => !t.deletedAt));
    }).catch(e => {if(active)setError(e.message);});
    return () => {active=false;};
  }, [refreshKey]);
  async function remove(t) {
    if (busy != null) return;
    const count = Number(t.registered || 0);
    const confirmation = count
      ? `Supprimer « ${t.title} » ? Les ${count} inscrit(s) recevront chacun 500 F CFA sur leur solde reel. Cette action est irreversible.`
      : `Supprimer « ${t.title} » ? Cette action est irreversible.`;
    if (!window.confirm(confirmation)) return;
    setBusy(t.id);setError('');setMessage('');
    try {
      const result = await walletRequest(`/api/tournaments/owner/${t.id}`, {
        method:'DELETE',body:{revision:t.revision}
      });
      setItems(previous => previous.filter(item => item.id !== t.id));
      setMessage(result.refunded
        ? `Tournoi supprime. ${result.refunded} remboursement(s), total ${result.refundTotal} F CFA.`
        : 'Tournoi supprime. Aucun remboursement necessaire.');
      onDeleted?.();
    } catch(e) { setError(e.message); }
    finally { setBusy(null); }
  }
  return <section className="tourney-delete-panel" aria-label="Supprimer les tournois crees">
    <h3>Tournois créés · gestion des suppressions</h3>
    <p>Choisis une carte pour supprimer le tournoi. Si des joueurs sont inscrits, chacun récupère automatiquement ses 500 F CFA. Les paiements restent dans l’historique.</p>
    <div className="tourney-delete-panel__grid">
      {items.map(t => <article key={t.id} className="tourney-delete-panel__card">
        <strong>{t.title}</strong>
        <small>{t.registered} / {t.capacity} inscrits · {t.status === 'published' ? 'Publié' : t.status === 'draft' ? 'Brouillon' : 'Archivé'}</small>
        <button type="button" disabled={busy != null} onClick={()=>remove(t)}>
          {busy === t.id ? 'Suppression…' : 'Supprimer'}
        </button>
      </article>)}
    </div>
    {error && <p role="alert" className="tourney-error">{error}</p>}
    {message && <p role="status" className="tourney-success">{message}</p>}
  </section>;
}
