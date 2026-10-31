import { useRef, useState } from 'react';
import { adminRequest } from '../api/accounts';

export default function DeleteUserControl({ user, disabled, onBusy, onDeleted }) {
  const [confirming, setConfirming] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const expected = `SUPPRIMER ${user.client_id}`;
  const protectedAccount = user.account_role === 'owner';
  const empty = Number(user.balance) === 0 && Number(user.bonus_balance) === 0;

  async function remove() {
    if (inFlight.current || confirmation !== expected || !empty || protectedAccount) return;
    inFlight.current = true;
    setBusy(true); onBusy(true); setError('');
    try {
      await adminRequest(`/users/${user.id}`, { method: 'DELETE', body: { confirmation } });
      onDeleted(`Le compte ${user.pseudo} (ID ${user.client_id}) a été supprimé définitivement.`);
    } catch (e) { setError(e.message); }
    finally { inFlight.current = false; setBusy(false); onBusy(false); }
  }

  return <div className="admin-delete-user">
    {!confirming ? <>
      <button type="button" className="admin-btn admin-btn--danger" disabled={disabled || protectedAccount || !empty}
        onClick={() => { setConfirming(true); setConfirmation(''); setError(''); }}>Supprimer le compte</button>
      {(protectedAccount || !empty) && <p className="admin-muted">{protectedAccount ? 'Le compte propriétaire est protégé.' : 'La suppression exige un solde de 0 F et 0 V.'}</p>}
    </> : <div className="admin-confirm" role="group" aria-label={`Confirmation de suppression de ${user.pseudo}`} aria-busy={busy}>
      <strong>Supprimer définitivement le compte {user.pseudo} (ID {user.client_id}) ?</strong>
      <p>Cette action est irréversible. Le compte ne pourra plus se connecter. Un historique lié peut empêcher sa suppression.</p>
      <label className="admin-fields">Pour confirmer, saisis {expected}
        <input aria-label={`Confirmation pour ${user.pseudo}`} value={confirmation} autoComplete="off" spellCheck={false}
          disabled={busy || disabled} onChange={e => setConfirmation(e.target.value)} />
      </label>
      <div className="admin-actions">
        <button type="button" className="admin-btn" disabled={busy} onClick={() => { setConfirming(false); setError(''); }}>Annuler</button>
        <button type="button" className="admin-btn admin-btn--danger" disabled={busy || disabled || confirmation !== expected} onClick={remove}>
          {busy ? 'Suppression…' : 'Oui, supprimer définitivement'}
        </button>
      </div>
      {error && <p className="admin-error" role="alert">{error}</p>}
    </div>}
  </div>;
}
