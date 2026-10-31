import { useEffect, useState } from 'react';
import { adminRequest, currentSession, walletRequest } from '../api/accounts';
import { useSession } from '../auth/useSession';
import '../styles/owner-request-alerts.css';

const money = n => new Intl.NumberFormat('fr-FR').format(n || 0);
const noticeId = a => `${a.id}:${a.event}`;
const caption = a => a.kind === 'withdrawal' ? 'NOUVEAU RETRAIT'
  : a.event === 'submitted' ? 'PREUVE DE DÉPÔT REÇUE' : 'NOUVELLE DEMANDE DE DÉPÔT';

export default function OwnerRequestAlerts() {
  const { session } = useSession();
  const ownerId = session?.account_role === 'owner' ? session.id : null;
  const [notices,setNotices] = useState([]);
  const [pending,setPending] = useState(null);
  const [error,setError] = useState('');
  useEffect(() => {
    let alive=true, working=false;
    setNotices([]); setError('');
    if (!ownerId) return () => { alive=false; };
    const check=async () => {
      if (!alive || working || document.hidden) return;
      working=true;
      try {
        const {notifications} = await walletRequest('/api/owner/notifications');
        if (alive && currentSession()?.id === ownerId) {
          setNotices(notifications || []);
          setError('');
        }
      } catch (e) {
        // Conserver les alertes visibles lorsque le reseau est coupe.
        if (alive) setError(e.message || 'Actualisation impossible.');
      } finally { working=false; }
    };
    void check();
    const timer=window.setInterval(check,12000);
    const onFocus=()=>void check();
    window.addEventListener('focus',onFocus);
    document.addEventListener('visibilitychange',onFocus);
    return () => {alive=false;window.clearInterval(timer);window.removeEventListener('focus',onFocus);document.removeEventListener('visibilitychange',onFocus);};
  },[ownerId]);

  if (!ownerId || notices.length===0) return null;
  const first=notices[0];
  const save=async (a) => {
    await walletRequest(`/api/owner/notifications/${encodeURIComponent(a.id)}/ack`,{
      method:'POST',body:{event:a.event}
    });
    setNotices(prev=>prev.filter(item=>noticeId(item)!==noticeId(a)));
  };
  const dismiss=async () => {
    if (pending) return;
    setPending(noticeId(first));setError('');
    try {await save(first);} catch (e) {setError(e.message || 'Impossible de fermer.');}
    finally {setPending(null);}
  };
  const view=async () => {
    if (pending) return;
    setPending(noticeId(first));setError('');
    try {
      // Lire le detail AVANT d'acquitter : un clic qui echoue ne supprime pas l'alerte.
      const {transaction} = await adminRequest(`/transactions/${encodeURIComponent(first.id)}`);
      if (!transaction || currentSession()?.id!==ownerId) throw Error('Demande indisponible.');
      await save(first);
      window.dispatchEvent(new CustomEvent('maf:owner-open-admin',{
        detail:{tab:first.kind==='withdrawal'?'withdrawals':'deposits',transaction}
      }));
    } catch (e) {setError(e.message || 'Impossible de consulter la demande.');}
    finally {setPending(null);}
  };
  return <aside className="maf-owner-alert" role="alert" aria-label="Nouvelle demande de paiement">
    <button type="button" className="maf-owner-alert__close" onClick={dismiss} disabled={Boolean(pending)} aria-label="Fermer définitivement cette alerte" title="Ne plus afficher cette alerte">×</button>
    <div className="maf-owner-alert__tag">● {caption(first)}</div>
    <div className="maf-owner-alert__title">{first.pseudo} · {money(first.amount)} {first.currency==='V'?'V':'F CFA'}</div>
    <div className="maf-owner-alert__caption">{first.kind==='withdrawal'?'Retrait à traiter':first.event==='submitted'?'Capture du paiement à contrôler':'Dépôt créé, paiement en attente'} · {new Date(first.happened_at).toLocaleString('fr-FR')}</div>
    {notices.length>1 && <div className="maf-owner-alert__count">+ {notices.length-1} autre(s) alerte(s)</div>}
    <button type="button" className="maf-owner-alert__view" onClick={view} disabled={Boolean(pending)}>{pending?'Traitement…':'VOIR LA DEMANDE →'}</button>
    {error && <p className="maf-owner-alert__error" role="status">{error}</p>}
  </aside>;
}
