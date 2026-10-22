import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from '../auth/useSession';
import * as roomsApi from '../api/rooms';
import '../styles/match-return-alert.css';

// Le serveur decide de la fin du delai. L'heure locale sert uniquement a l'affichage.
function incomingRoom(room) {
  if (!room || room.status !== 'playing' || room.return_deadline == null || !Number.isFinite(Number(room.return_deadline))) return null;
  const serverNow = Number(room.server_now) || Date.now();
  return { id: room.id, code: room.code, game: room.game,
    localDeadline: Date.now() + Number(room.return_deadline) - serverNow };
}

export default function MatchReturnAlert() {
  const { session } = useSession();
  const [room, setRoom] = useState(null);
  const [clock, setClock] = useState(Date.now);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const present = useRef(false);
  const requestEpoch = useRef(0);

  useEffect(() => { present.current = !!room; }, [room]);
  useEffect(() => {
    if (!room) return undefined;
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [!!room]);

  useEffect(() => {
    let alive = true;
    let loading = false;
    const check = async () => {
      if (loading || !session?.id) return;
      loading = true;
      const epoch = ++requestEpoch.current;
      try {
        const active = await roomsApi.myRoom();
        if (alive && epoch === requestEpoch.current) setRoom(incomingRoom(active));
      } catch { /* Pas de fausse mise a zero si le reseau est indisponible. */ }
      finally { loading = false; }
    };
    requestEpoch.current++;
    setRoom(null);
    setError('');
    void check();
    const onExit = (event) => {
      requestEpoch.current++;
      if (alive) { setRoom(incomingRoom(event.detail?.room)); setClock(Date.now()); setError(''); }
    };
    const onResume = () => { requestEpoch.current++; if (alive) { setRoom(null); setError(''); } };
    const onVisible = () => { if (!document.hidden) void check(); };
    window.addEventListener('maf:match-exited', onExit);
    window.addEventListener('maf:match-resumed', onResume);
    document.addEventListener('visibilitychange', onVisible);
    // Revalidation en cours de delai, y compris si l'autre joueur a gagne.
    const refresh = window.setInterval(() => {
      if (present.current && !document.hidden) void check();
    }, 8000);
    return () => {
      alive = false;
      window.clearInterval(refresh);
      window.removeEventListener('maf:match-exited', onExit);
      window.removeEventListener('maf:match-resumed', onResume);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [session?.id]);

  const returnToGame = useCallback(async () => {
    if (!room || busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await roomsApi.resumeMatch(room.id);
      if (result.room?.status !== 'playing') {
        setRoom(null);
        setError('Cette partie est deja terminee. Consulte les resultats dans les salons.');
        window.location.hash = '#game';
        return;
      }
      setRoom(null);
      window.dispatchEvent(new CustomEvent('maf:match-resumed', { detail: { id: room.id } }));
      try { sessionStorage.setItem('maf:room-to-reopen', String(room.id)); } catch { /* optionnel */ }
      if (window.location.hash !== '#game') window.location.hash = '#game';
      else window.dispatchEvent(new CustomEvent('maf:reopen-match', { detail: { id: room.id } }));
    } catch (e) { setError(e.message || 'Impossible de reprendre la partie.'); }
    finally { setBusy(false); }
  }, [room, busy]);

  if (!room) return null;
  const left = Math.max(0, Math.ceil((room.localDeadline - clock) / 1000));
  const urgent = left <= 20;
  return (
    <aside className={`match-return-alert${urgent ? ' match-return-alert--urgent' : ''}`}
      role="alert" aria-label="Attention, match interrompu">
      <div className="match-return-alert__heading"><span aria-hidden="true">⚠</span> ATTENTION : MATCH EN COURS</div>
      <p>Tu as quitté la partie ! Reviens avant la fin du délai pour éviter le forfait.</p>
      <div className="match-return-alert__clock" aria-label={`Temps restant : ${left} secondes`}>
        <strong aria-hidden="true">{left}</strong><span>secondes restantes</span>
      </div>
      <button type="button" className="match-return-alert__return" onClick={() => void returnToGame()} disabled={busy}>
        {busy ? 'Reconnexion…' : '↩ RETOURNER AU MATCH'}
      </button>
      {error && <small className="match-return-alert__error">{error}</small>}
      {left === 0 && <small>Vérification du forfait auprès du serveur…</small>}
    </aside>
  );
}
