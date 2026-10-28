import { useEffect, useState } from 'react';
import { myOwnerGifts } from '../api/ownerGifts';
import { duelGifts } from '../api/officialDuel';
import { myTournamentGifts } from '../api/tournamentGifts';

// Indicateur strictement personnel : n'affiche que les cadeaux disponibles
// et non ouverts. Les appels API sont authentifies comme pour la liste Cadeaux.
export default function usePendingGifts(sessionId, currentSheet) {
  const [pending, setPending] = useState(0);
  useEffect(() => {
    if (!sessionId) { setPending(0); return undefined; }
    let active = true;
    let inflight = false;
    const counts = { owner: 0, duel: 0, tournament: 0 };
    const update = async () => {
      if (inflight || (typeof document !== 'undefined' && document.hidden)) return;
      inflight = true;
      try {
        const results = await Promise.allSettled([myOwnerGifts(), duelGifts(), myTournamentGifts()]);
        if (!active) return;
        if (results[0].status === 'fulfilled')
          counts.owner = (results[0].value.gifts || []).filter(g => !g.openedAt && !g.revokedAt).length;
        if (results[1].status === 'fulfilled')
          counts.duel = (results[1].value.gifts || []).filter(g => g.status === 'ready').length;
        if (results[2].status === 'fulfilled')
          counts.tournament = (results[2].value.gifts || []).filter(g => g.status === 'ready').length;
        setPending(counts.owner + counts.duel + counts.tournament);
      } finally { inflight = false; }
    };
    void update();
    const timer = window.setInterval(() => { void update(); }, 30000);
    const visible = () => { if (!document.hidden) void update(); };
    document.addEventListener('visibilitychange', visible);
    return () => { active = false; window.clearInterval(timer); document.removeEventListener('visibilitychange', visible); };
  }, [sessionId, currentSheet]); // relit l'etat lorsque la section Cadeaux se ferme
  return pending;
}
