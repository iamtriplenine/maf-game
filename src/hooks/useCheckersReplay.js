import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { planCheckersReplay } from '../utils/checkersReplayPlan';

const STEP_MS = 1040; // 80 ms d'amorce, 800 ms de mouvement et une pause lisible.

export default function useCheckersReplay(match, matchKey) {
  const [displayBoard, setDisplayBoard] = useState(() => match?.board?.slice() ?? []);
  const [moving, setMoving] = useState(null);
  const lastSnapshot = useRef(null);
  const activeId = useRef(null);

  // useLayoutEffect empêche l'affichage fugitif du coup « téléporté » avant l'animation.
  useLayoutEffect(() => {
    if (!Array.isArray(match?.board)) return;
    const incoming = { matchKey, ply: match.ply, board: match.board.slice() };
    const previous = lastSnapshot.current;
    if (previous && previous.matchKey === matchKey && previous.ply === incoming.ply) return;
    lastSnapshot.current = incoming;
    const reducedMotion = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const replay = !reducedMotion && planCheckersReplay(previous, incoming, match.lastMove, matchKey);
    if (!replay) {
      activeId.current = null;
      setMoving(null);
      setDisplayBoard(incoming.board);
      return;
    }
    activeId.current = replay.id;
    setDisplayBoard(replay.before);
    setMoving({ ...replay, step: 0, position: replay.from });
  }, [matchKey, match?.ply, match?.board, match?.lastMove]);

  useEffect(() => {
    if (!moving) return undefined;
    const { id, step, path, captured, finalBoard } = moving;
    const begin = window.setTimeout(() => {
      if (activeId.current !== id) return;
      setMoving(current => current?.id === id && current.step === step
        ? { ...current, position: path[step] } : current);
    }, 80);
    const finish = window.setTimeout(() => {
      if (activeId.current !== id) return;
      if (step + 1 < path.length) {
        const removed = captured[step];
        if (Number.isInteger(removed) && removed >= 0 && removed < 100) {
          setDisplayBoard(board => {
            const updated = board.slice();
            updated[removed] = '.';
            return updated;
          });
        }
        setMoving(current => current?.id === id && current.step === step
          ? { ...current, step: step + 1, position: path[step] } : current);
      } else {
        activeId.current = null;
        setDisplayBoard(finalBoard);
        setMoving(null);
      }
    }, STEP_MS);
    return () => { window.clearTimeout(begin); window.clearTimeout(finish); };
  }, [moving?.id, moving?.step]);

  return { displayBoard, moving };
}
