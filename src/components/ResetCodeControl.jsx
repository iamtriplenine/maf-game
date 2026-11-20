import { useRef, useState } from 'react';
import { adminRequest } from '../api/accounts';

export default function ResetCodeControl({ user, disabled, onBusy }) {
  const [confirming, setConfirming] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const inFlight = useRef(false);
  const protectedAccount = user.account_role === 'owner';

  async function reset() {
    if (inFlight.current || protectedAccount) return;
    inFlight.current = true;
    setBusy(true); onBusy(true); setError('');
    try {
      const data = await adminRequest(`/users/${user.id}/reset-code`, { method: 'POST', body: {} });
      setNewCode(data.code); setConfirming(false);
    } catch (e) { setError(e.message); }
    finally { inFlight.current = false; setBusy(false); onBusy(false); }
  }

  async function copy() {
    try { await navigator.clipboard.writeText(newCode); setCopied(true); } catch { setCopied(false); }
  }

  if (protectedAccount) return null;
  return <div className="admin-delete-user">
    {newCode ? <div className="admin-confirm" role="status">
      <strong>Nouveau code de {user.pseudo} (ID {user.client_id})</strong>
      <p style={{ fontSize: '1.6rem', letterSpacing: '0.15em', fontWeight: 700, margin: '8px 0' }}>{newCode}</p>
      <p>Donne-le au joueur. Il ne sera plus affiché après fermeture. L'ancien code ne marche plus.</p>
      <div className="admin-actions">
        <button type="button" className="admin-btn" onClick={copy}>{copied ? 'Copié ✓' : 'Copier'}</button>
        <button type="button" className="admin-btn" onClick={() => { setNewCode(''); setCopied(false); }}>Fermer</button>
      </div>
    </div> : !confirming ? <button type="button" className="admin-btn" disabled={disabled}
      onClick={() => { setConfirming(true); setError(''); }}>Réinitialiser le code</button>
    : <div className="admin-confirm" role="group" aria-label={`Réinitialiser le code de ${user.pseudo}`} aria-busy={busy}>
      <strong>Générer un nouveau code pour {user.pseudo} (ID {user.client_id}) ?</strong>
      <p>L'ancien code sera remplacé. Le compte sera aussi débloqué s'il était verrouillé.</p>
      <div className="admin-actions">
        <button type="button" className="admin-btn" disabled={busy} onClick={() => setConfirming(false)}>Annuler</button>
        <button type="button" className="admin-btn admin-btn--primary" disabled={busy || disabled} onClick={reset}>
          {busy ? 'Génération…' : 'Oui, générer un nouveau code'}
        </button>
      </div>
    </div>}
    {error && <p className="admin-error" role="alert">{error}</p>}
  </div>;
}
