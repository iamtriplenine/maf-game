import { useEffect, useState } from 'react';
import { useSession } from '../auth/useSession';
import { walletRequest } from '../api/accounts';
import '../styles/deposit-reminder.css';

// MAF_RAPPELS_V1 : rappel automatique quand une recharge attend sa capture depuis plus de 30 minutes.
const AFTER_MS = 30 * 60 * 1000;     // delai avant le rappel
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // au-dela, la demande est consideree abandonnee
const SNOOZE_MS = 30 * 60 * 1000;    // "Plus tard" : nouveau rappel apres 30 min
const MAX_SNOOZES = 3;               // puis on arrete de deranger
const POLL_MS = 60 * 1000;
const storeKey = id => `maf:deposit-reminder:${id}`;

function readSnooze(id) {
  try { return JSON.parse(localStorage.getItem(storeKey(id)) || 'null') || { t: 0, n: 0 }; } catch { return { t: 0, n: 0 }; }
}
function writeSnooze(id) {
  const old = readSnooze(id);
  try { localStorage.setItem(storeKey(id), JSON.stringify({ t: Date.now(), n: old.n + 1 })); } catch { /* optionnel */ }
}
function ageLabel(ms) {
  const min = Math.max(1, Math.floor(ms / 60000));
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h`;
}

export default function DepositReminder() {
  const { session } = useSession();
  const [deposit, setDeposit] = useState(null);

  useEffect(() => {
    if (!session?.id) { setDeposit(null); return undefined; }
    let alive = true;
    let loading = false;
    const check = async () => {
      if (loading || document.hidden) return;
      loading = true;
      try {
        const data = await walletRequest('/api/wallet/transactions?limit=10');
        if (!alive) return;
        const now = Date.now();
        const late = (data.transactions || []).find(t => {
          if (t.kind !== 'deposit' || t.status !== 'awaiting_payment') return false;
          const age = now - Date.parse(t.created_at);
          if (!Number.isFinite(age) || age < AFTER_MS || age > MAX_AGE_MS) return false;
          const snooze = readSnooze(t.id);
          return snooze.n < MAX_SNOOZES && now - snooze.t >= SNOOZE_MS;
        });
        setDeposit(late ? { id: late.id, amount: late.amount, age: now - Date.parse(late.created_at) } : null);
      } catch { /* on garde l'etat precedent si le reseau coupe */ }
      finally { loading = false; }
    };
    void check();
    const poll = window.setInterval(check, POLL_MS);
    const onVisible = () => { if (!document.hidden) void check(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { alive = false; window.clearInterval(poll); document.removeEventListener('visibilitychange', onVisible); };
  }, [session?.id]);

  if (!deposit) return null;

  const later = () => { writeSnooze(deposit.id); setDeposit(null); };
  const openRecharge = () => {
    writeSnooze(deposit.id);
    setDeposit(null);
    try { sessionStorage.setItem('maf:open-sheet', 'recharge'); } catch { /* optionnel */ }
    const hash = window.location.hash;
    if (hash === '#game' || hash === '#studio') window.location.hash = '#profil'; // le Profil lit la demande a son ouverture
    else {
      try { sessionStorage.removeItem('maf:open-sheet'); } catch { /* optionnel */ }
      window.dispatchEvent(new Event('maf:open-recharge'));
    }
  };

  return (
    <aside className="deposit-reminder" role="status" aria-label="Rappel de recharge">
      <div className="deposit-reminder__heading"><span aria-hidden="true">💳</span> RECHARGE EN ATTENTE</div>
      <p>
        Tu as lancé une recharge de <strong>{Number(deposit.amount).toLocaleString('fr-FR')} F</strong> il y a {ageLabel(deposit.age)}.
        {' '}Si tu as déjà payé sur Wave, envoie ta capture pour être crédité. Sinon, tu peux ignorer ce message.
      </p>
      <div className="deposit-reminder__actions">
        <button type="button" className="deposit-reminder__go" onClick={openRecharge}>ENVOYER MA CAPTURE</button>
        <button type="button" className="deposit-reminder__later" onClick={later}>PLUS TARD</button>
      </div>
    </aside>
  );
}
