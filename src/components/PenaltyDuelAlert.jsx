import { useEffect, useRef, useState } from 'react';
import { useSession } from '../auth/useSession';
import { myPenaltyTournamentDuel } from '../api/tournaments';
import { penaltyJoinWindow, penaltyClock } from '../tournaments/penaltyJoinWindow';
import '../styles/penalty-duel-alert.css';

// Alerte globale : prevenue ou que soit le joueur dans le jeu, avec le temps restant (heure du serveur).
function openTournament() {
  try { sessionStorage.setItem('maf:open-tab', 'tournoi'); } catch { /* optionnel */ }
  if (window.location.hash !== '#game') window.location.hash = '#game';
  else window.dispatchEvent(new Event('maf:open-tab-tournoi'));
}

export default function PenaltyDuelAlert() {
  const { session } = useSession();
  const [duel, setDuel] = useState(null);
  const [clock, setClock] = useState(Date.now());
  const offset = useRef(0);

  useEffect(() => {
    if (!session?.id) { setDuel(null); return undefined; }
    let alive = true;
    let loading = false;
    const check = async () => {
      if (loading || document.hidden) return;
      loading = true;
      try {
        const data = await myPenaltyTournamentDuel();
        if (!alive) return;
        if (Number.isFinite(data.serverNow)) offset.current = data.serverNow - Date.now();
        setClock(Date.now() + offset.current);
        setDuel(data.match || null);
      } catch { /* on garde l'etat precedent si le reseau coupe */ }
      finally { loading = false; }
    };
    void check();
    const poll = window.setInterval(check, 15000);
    const onVisible = () => { if (!document.hidden) void check(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { alive = false; window.clearInterval(poll); document.removeEventListener('visibilitychange', onVisible); };
  }, [session?.id]);

  const active = !!duel && ['scheduled', 'waiting', 'playing'].includes(duel.status);
  useEffect(() => {
    if (!active) return undefined;
    const timer = window.setInterval(() => setClock(Date.now() + offset.current), 1000);
    return () => window.clearInterval(timer);
  }, [active]);

  const win = active ? penaltyJoinWindow(duel, clock) : null;
  // MAF_RAPPELS_V1 : rappel de 10 a 5 minutes avant le duel (le salon ouvre ensuite 5 minutes avant le debut).
  const reminder = !!win && win.phase === 'closed' && win.startSeconds <= 600;
  const phase = reminder ? 'reminder' : (win && ['early', 'waiting', 'playing'].includes(win.phase) ? win.phase : null);
  const key = phase ? `${duel.id}:${phase}` : '';
  useEffect(() => {
    if (!key) return;
    try { navigator.vibrate?.([200, 100, 200]); } catch { /* optionnel */ }
  }, [key]);

  if (!phase) return null;
  // Deja dans l'onglet Tournoi : la carte du duel y est affichee.
  if (window.location.hash === '#game' && document.body.dataset.mafTab === 'tournoi') return null;
  const seconds = (phase === 'early' || phase === 'reminder') ? win.startSeconds : win.deadlineSeconds;
  const urgent = phase === 'waiting' && seconds <= 60;
  return (
    <aside className={`penalty-duel-alert${urgent ? ' penalty-duel-alert--urgent' : ''}`} role="alert"
      aria-label="Ton duel de tir au but">
      <div className="penalty-duel-alert__heading"><span aria-hidden="true">⚽</span> TON DUEL DE TIR AU BUT</div>
      {phase === 'reminder' && <p>Rappel : ton duel de tir au but approche. Le salon ouvre 5 minutes avant le début et un joueur absent est disqualifié. Début dans :</p>}
      {phase === 'early' && <p>Le salon est ouvert. Ton duel commence dans :</p>}
      {phase === 'waiting' && <p>Entre dans le salon maintenant, sinon tu seras disqualifié. Temps restant :</p>}
      {phase === 'playing' && <p>Ton duel est en cours. Reviens jouer, un joueur qui ne joue pas pendant 5 minutes est disqualifié.</p>}
      {phase !== 'playing' && <div className="penalty-duel-alert__clock" aria-label={`Temps restant : ${seconds} secondes`}>
        <strong aria-hidden="true">{penaltyClock(seconds)}</strong>
      </div>}
      <button type="button" className="penalty-duel-alert__go" onClick={openTournament}>
        {phase === 'playing' ? '↩ RETOURNER AU DUEL' : phase === 'reminder' ? 'VOIR MON DUEL' : 'ENTRER DANS LE SALON'}
      </button>
    </aside>
  );
}
