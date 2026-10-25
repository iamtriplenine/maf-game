// MAF_MONOPOLY_V1_BOARD : plateau 2D (image du projet Unity) + pions, proprietes et maisons
import { SQUARES, PIECES } from '../games/monopoly/data';

const C = 0.1328; // taille d'une case d'angle (fraction du plateau)
const T = (1 - 2 * C) / 9; // largeur d'une case normale

// Centre de la case i (0..39) en fraction du plateau. GO est en bas a droite, le sens est horaire.
function squareCenter(i) {
  const half = C / 2;
  if (i === 0) return { x: 1 - half, y: 1 - half, side: 'corner' };
  if (i < 10) return { x: 1 - C - (i - 0.5) * T, y: 1 - half, side: 'bottom' };
  if (i === 10) return { x: half, y: 1 - half, side: 'corner' };
  if (i < 20) return { x: half, y: 1 - C - (i - 10 - 0.5) * T, side: 'left' };
  if (i === 20) return { x: half, y: half, side: 'corner' };
  if (i < 30) return { x: C + (i - 20 - 0.5) * T, y: half, side: 'top' };
  if (i === 30) return { x: 1 - half, y: half, side: 'corner' };
  return { x: 1 - half, y: C + (i - 30 - 0.5) * T, side: 'right' };
}
const INNER = { bottom: [0, -1], top: [0, 1], left: [1, 0], right: [-1, 0], corner: [0, 0] };
const pct = (v) => `${(v * 100).toFixed(3)}%`;
const OFFSETS = [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0], [-1, 0], [1, 0]];

export default function MonopolyBoard({ game, selected, onSelect, rolling, diceFaces, renderCenter }) {
  const pawnsBySquare = {};
  game.players.forEach((p) => {
    if (p.bankrupt) return;
    (pawnsBySquare[p.location] ||= []).push(p);
  });
  return (
    <div className="mono-board" role="group" aria-label="Plateau de Monopoly">
      <img className="mono-board__img" src="/games/monopoly/board.jpg" alt="" draggable="false" />

      {SQUARES.map((q) => {
        const c = squareCenter(q.id);
        const owner = game.owners[q.id];
        const houses = game.houses[q.id];
        const inner = INNER[c.side];
        const horizontal = c.side === 'bottom' || c.side === 'top';
        const style = { left: pct(c.x), top: pct(c.y), width: pct(c.side === 'left' || c.side === 'right' ? C : (c.side === 'corner' ? C : T)), height: pct(c.side === 'bottom' || c.side === 'top' ? C : (c.side === 'corner' ? C : T)) };
        return (
          <div key={q.id} className={`mono-sq${selected === q.id ? ' is-selected' : ''}`} style={style}>
            <button type="button" className="mono-sq__hit" aria-label={`${q.name}`} onClick={() => onSelect?.(q.id)} />
            {owner !== null && (
              <span className="mono-owner" style={{
                background: game.players[owner].color,
                left: horizontal ? '16%' : `${50 - inner[0] * 38}%`,
                top: horizontal ? `${50 - inner[1] * 38}%` : '16%',
              }} title={`Propriétaire : ${game.players[owner].name}`} />
            )}
            {houses > 0 && (
              <span className={`mono-houses${horizontal ? '' : ' is-vertical'}`} style={{
                left: `${50 + inner[0] * 40}%`, top: `${50 + inner[1] * 40}%`,
              }}>
                {houses === 5
                  ? <i className="mono-hotel" />
                  : Array.from({ length: houses }, (_, k) => <i key={k} className="mono-house" />)}
              </span>
            )}
          </div>
        );
      })}

      {game.players.map((p, idx) => {
        if (p.bankrupt) return null;
        const c = squareCenter(p.location);
        const group = pawnsBySquare[p.location] || [p];
        const k = group.indexOf(p);
        const off = group.length === 1 ? [0, 0] : OFFSETS[k % OFFSETS.length];
        return (
          <span key={p.id} className={`mono-pawn${game.current === idx && game.phase !== 'over' ? ' is-current' : ''}`}
            style={{
              left: `calc(${pct(c.x)} + ${off[0] * 1.6}cqw)`,
              top: `calc(${pct(c.y)} + ${off[1] * 1.6}cqw)`,
              background: p.color,
            }} title={`${p.name} · ${PIECES[p.piece].label}`}>
            {PIECES[p.piece].emoji}
          </span>
        );
      })}

      <div className="mono-center">
        <div className={`mono-dice${rolling ? ' is-rolling' : ''}`} aria-live="polite">
          {(diceFaces && diceFaces.length ? diceFaces : []).map((f, i) => (
            <span key={i} className="mono-die">{['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][f - 1]}</span>
          ))}
        </div>
        {renderCenter?.()}
      </div>
    </div>
  );
}

