import { useEffect, useMemo, useState } from 'react';
import CheckersArena from './CheckersArena';
import { blankCheckers, legalMoves, applyMove, checkersView, forfeitCheckers } from '../api/checkersEngine';

const cloneState = value => JSON.parse(JSON.stringify(value));

export default function SoloCheckers() {
  const [started, setStarted] = useState(false);
  const [game, setGame] = useState(blankCheckers);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!started || game.finished || game.toMove !== 'guest') return undefined;
    setBusy(true);
    const timer = setTimeout(() => {
      setGame(previous => {
        if (previous.finished || previous.toMove !== 'guest') return previous;
        const next = cloneState(previous);
        const moves = legalMoves(next);
        if (moves.length) {
          const longest = Math.max(...moves.map(m => m.captured.length));
          const candidates = moves.filter(m => m.captured.length === longest);
          const chosen = candidates[Math.floor(Math.random() * candidates.length)];
          applyMove(next, 'guest', { from: chosen.from, path: chosen.path });
        }
        return next;
      });
      setBusy(false);
    }, 500);
    return () => { clearTimeout(timer); setBusy(false); };
  }, [started, game]);

  const match = useMemo(() => ({
    ...checkersView(game, 'host'), viewer: 'host', serverNow: Date.now(),
    moveDeadline: null, returnDeadline: null, opponentReturnDeadline: null,
  }), [game]);
  const room = useMemo(() => ({
    id: 0, code: 'SOLO', game: 'checkers', status: game.finished ? 'finished' : 'playing',
    is_host: true, host: { pseudo: 'Toi' }, guest: { pseudo: 'Robot' },
  }), [game.finished]);

  const reset = () => { setGame(blankCheckers()); setStarted(true); setBusy(false); };
  if (!started) return <button type="button" className="btn btn--sm btn--block" onClick={reset}>♛ Jouer contre le robot</button>;
  return <CheckersArena room={room} match={match} busy={busy}
    onMove={move => {
      setGame(previous => {
        if (previous.finished || previous.toMove !== 'host') return previous;
        const next = cloneState(previous);
        try { applyMove(next, 'host', move); } catch { return previous; }
        return next;
      });
    }}
    onForfeit={() => setGame(previous => {
      const next = cloneState(previous);
      forfeitCheckers(next, 'host');
      return next;
    })}
    onDrawOffer={() => {}}
    onDrawRespond={() => {}}
    onExit={() => setStarted(false)} onBack={() => setStarted(false)} />;
}
