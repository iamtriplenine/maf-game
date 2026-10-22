import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import '../styles/checkers-arena.css';
import '../styles/checkers-move-replay.css';
import useCheckersReplay from '../hooks/useCheckersReplay';
import { readableSquare, visualSquare } from '../utils/checkersReplayPlan';

const pieces = { w: '●', b: '●', W: '♛', B: '♛' };
const sideName = (side, room) => side === 'host' ? room?.host?.pseudo : room?.guest?.pseudo;
const other = side => side === 'host' ? 'guest' : 'host';
const secondsLeft = (deadline, serverNow, receivedAt, clock) => deadline == null
  ? null : Math.max(0, Math.ceil((deadline - serverNow - (clock - receivedAt)) / 1000));
const isSamePrefix = (whole, prefix) => prefix.every((v, i) => whole[i] === v);

export default function CheckersArena({ room, match, busy = false, onStart, onMove, onForfeit,
  onExit, onBack, onDrawOffer, onDrawRespond, error = '' }) {
  const [from, setFrom] = useState(null);
  const [path, setPath] = useState([]);
  const [clock, setClock] = useState(Date.now);
  const [receivedAt, setReceivedAt] = useState(Date.now);
  const [confirmForfeit, setConfirmForfeit] = useState(false);
  const status = room?.status;
  const solo = room?.id === 0;
  const viewer = match?.viewer || (room?.is_host ? 'host' : 'guest');
  const rival = other(viewer);
  const { displayBoard, moving } = useCheckersReplay(match, room?.id ?? 'unknown');
  const myTurn = status === 'playing' && !!match?.myTurn && !busy && !match?.returnDeadline && !moving;
  const finished = status === 'finished' || !!match?.finished;
  const legal = useMemo(() => match?.legal || [], [match?.legal]);
  const relevant = useMemo(() => legal.filter(m => m.from === from && isSamePrefix(m.path, path)), [legal, from, path]);
  const next = useMemo(() => new Set(relevant.map(m => m.path[path.length]).filter(v => v != null)), [relevant, path]);
  const starters = useMemo(() => new Set(legal.map(m => m.from)), [legal]);
  const reversed = viewer === 'guest';
  const last = match?.lastMove;

  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => { setReceivedAt(Date.now()); }, [match?.serverNow]);
  useEffect(() => { setFrom(null); setPath([]); }, [match?.ply, match?.toMove]);
  useEffect(() => { setConfirmForfeit(false); }, [finished]);

  function pick(i) {
    if (!myTurn) return;
    if (from === null || (path.length === 0 && starters.has(i))) {
      setFrom(starters.has(i) ? i : null);
      setPath([]);
      return;
    }
    if (next.has(i)) {
      const proposed = [...path, i];
      const complete = relevant.some(m => m.path.length === proposed.length && isSamePrefix(m.path, proposed));
      if (complete) {
        onMove?.({ from, path: proposed });
        setFrom(null); setPath([]);
      } else setPath(proposed);
    } else if (i === from) {
      setFrom(null); setPath([]);
    }
  }

  const ready = status === 'ready';
  if (ready) return (
    <div className="checkers-wait" aria-label="Pret pour les dames">
      <div className="checkers-wait__icon">♛</div>
      <strong>Dames internationales · 10 × 10</strong>
      <p>Blancs : {room.host.pseudo} · Noirs : {room.guest?.pseudo}</p>
      <p>Prise obligatoire, rafle maximale, les dames se deplacent en diagonale. Une sortie laisse 80 secondes pour revenir.</p>
      {room.is_host
        ? <button type="button" className="btn btn--primary" disabled={busy} onClick={onStart}>Lancer la partie</button>
        : <p>En attente du lancement par le createur...</p>}
      <button type="button" className="btn btn--sm" onClick={onBack}>Retour au salon</button>
    </div>
  );
  if (!match || !['playing', 'finished'].includes(status)) return <p>Chargement de la partie de dames...</p>;

  const rivalReturn = secondsLeft(match.opponentReturnDeadline, match.serverNow, receivedAt, clock);
  const ownReturn = secondsLeft(match.returnDeadline, match.serverNow, receivedAt, clock);
  const moveSeconds = secondsLeft(match.moveDeadline, match.serverNow, receivedAt, clock);
  const myDraw = match.drawOffer === viewer;
  const offeredByRival = match.drawOffer === rival;
  const outcome = match.draw ? solo ? 'Match nul.' : 'Match nul — les deux mises sont remboursees.'
    : match.winner === viewer ? 'Victoire !' : 'Defaite.';
  const board = <div className="checkers-board" role="grid" aria-label="Plateau de dames 10 par 10">
    {Array.from({ length: 100 }, (_, visual) => {
      const i = reversed ? 99 - visual : visual;
      const row = Math.floor(i / 10), col = i % 10;
      const dark = (row + col) % 2 === 1;
      const piece = displayBoard?.[i] || '.';
      const mine = viewer === 'host' ? piece.toLowerCase() === 'w' : piece.toLowerCase() === 'b';
      const selected = from === i || path.includes(i);
      const target = next.has(i);
      const lastHit = last && (last.from === i || last.path?.includes(i));
      const lastStart = last?.from === i;
      const lastEnd = last?.path?.at(-1) === i;
      const lastWaypoint = !!last?.path?.includes(i);
      const canChoose = myTurn && (target || (starters.has(i) && path.length === 0));
      return <button key={i} type="button" role="gridcell" onClick={() => pick(i)}
        disabled={!canChoose && !selected} aria-label={`Ligne ${row + 1}, colonne ${col + 1}${piece !== '.' ? `, ${piece.toLowerCase() === 'w' ? 'blanc' : 'noir'}${piece === piece.toUpperCase() ? ' dame' : ''}` : ''}`}
        aria-selected={!!selected} className={`checkers-cell ${dark ? 'is-dark' : 'is-light'} ${selected ? 'is-selected' : ''} ${target ? 'is-target' : ''} ${lastHit ? 'is-last' : ''} ${lastStart ? 'is-last-start' : ''} ${lastEnd ? 'is-last-end' : ''} ${lastWaypoint ? 'is-last-waypoint' : ''}`}>
        {piece !== '.' && <span className={`checkers-piece ${mine ? 'is-mine' : ''} ${piece.toLowerCase() === 'w' ? 'is-white' : 'is-black'} ${piece === piece.toUpperCase() ? 'is-king' : ''}`}>{pieces[piece]}</span>}
        {target && <span className="checkers-target" aria-hidden="true" />}
      </button>;
    })}
    {moving && (() => {
      const position = visualSquare(moving.position, reversed);
      return <div className="checkers-move-layer" aria-hidden="true">
        <div className="checkers-moving-slot" style={{ left: `${position.column * 10}%`, top: `${position.row * 10}%` }}>
          <span className={`checkers-piece ${moving.piece.toLowerCase() === 'w' ? 'is-white' : 'is-black'} ${moving.piece === moving.piece.toUpperCase() ? 'is-king' : ''}`}>{pieces[moving.piece]}</span>
        </div>
      </div>;
    })()}
  </div>;

  return createPortal(
    <div className="checkers-overlay" role="dialog" aria-modal="true" aria-label="Partie de dames">
      <div className="checkers-shell">
        <header className="checkers-header">
          <button type="button" className="checkers-back" onClick={onExit} disabled={busy}>← Quitter</button>
          <div><strong>DAMES</strong><small>Salon #{room.code}</small></div>
          <span className="checkers-header__round">{match.ply} coups</span>
        </header>
        <div className="checkers-players">
          <div className={`checkers-player ${match.toMove === 'host' && !finished ? 'is-playing' : ''}`}>
            <span className="checkers-player__disc is-white" />
            <div><strong>{sideName('host', room)}</strong><small>Blancs · {match.counts?.host ?? 0} pieces</small></div>
          </div>
          <div className={`checkers-player ${match.toMove === 'guest' && !finished ? 'is-playing' : ''}`}>
            <span className="checkers-player__disc is-black" />
            <div><strong>{sideName('guest', room)}</strong><small>Noirs · {match.counts?.guest ?? 0} pieces</small></div>
          </div>
        </div>
        <div className="checkers-info" role="status" aria-live="polite">
          {finished ? outcome : myTurn ? 'A toi de jouer' : `Au tour de ${sideName(match.toMove, room)}`}
          {!finished && moveSeconds != null && <span> · {moveSeconds} s pour ce coup</span>}
        </div>
        {last?.path?.length > 0 && <div className={`checkers-last-move ${moving ? 'is-animating' : ''}`} role="status" aria-live="polite">
          <span className="checkers-last-move__tag">{moving ? 'DÉPLACEMENT EN COURS' : 'DERNIER COUP'}</span>
          <strong>{last.side === viewer ? 'Ton pion' : `Pion de ${sideName(last.side, room) || 'ton adversaire'}`}</strong>
          <span className="checkers-last-move__route">{readableSquare(last.from, reversed)} → {readableSquare(last.path.at(-1), reversed)}</span>
          <span>{last.path.length > 1 ? `${last.path.length} sauts` : 'D : départ · A : arrivée'}</span>
        </div>}
        {board}
        <div className="checkers-help" role="status">
          {finished ? `Fin : ${match.reason || 'victoire'}`
            : moving ? 'Regarde le pion avancer : départ en jaune, arrivée en vert.'
              : from !== null ? path.length ? 'Continue ta prise en choisissant la case suivante.' : 'Choisis une case lumineuse pour jouer.'
              : myTurn ? 'Selectionne un de tes pions lumineux puis sa destination.' : 'Regarde la partie, ton adversaire joue.'}
        </div>
        {error && <p className="checkers-error" role="alert">{error}</p>}
        {rivalReturn != null && !finished && <p className="checkers-alert">Adversaire sorti : {rivalReturn} s avant forfait.</p>}
        {ownReturn != null && !finished && <p className="checkers-alert">Tu dois revenir dans la partie : {ownReturn} s.</p>}
        {!solo && offeredByRival && !finished && <div className="checkers-offer">
          <strong>Ton adversaire propose un match nul.</strong>
          <button type="button" disabled={busy} onClick={() => onDrawRespond(true)}>Accepter</button>
          <button type="button" disabled={busy} onClick={() => onDrawRespond(false)}>Refuser</button>
        </div>}
        {!finished && <div className="checkers-actions">
          {!solo && <button type="button" disabled={busy || myDraw || offeredByRival} onClick={onDrawOffer}>{myDraw ? 'Nulle proposee' : 'Proposer nulle'}</button>}
          <button type="button" disabled={busy} onClick={() => setConfirmForfeit(v => !v)}>Abandonner</button>
        </div>}
        {confirmForfeit && !finished && <div className="checkers-offer">
          <strong>{solo ? 'Terminer cet entrainement ?' : 'Abandonner donne la victoire a ton adversaire et lui verse la cagnotte.'}</strong>
          <button type="button" disabled={busy} onClick={() => { setConfirmForfeit(false); onForfeit(); }}>Confirmer</button>
          <button type="button" onClick={() => setConfirmForfeit(false)}>Annuler</button>
        </div>}
        {finished && <button type="button" className="checkers-finish" onClick={onBack}>{solo ? 'Fermer entrainement' : 'Retour aux salons'}</button>}
      </div>
    </div>, document.body,
  );
}
