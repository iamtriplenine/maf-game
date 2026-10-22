// Une animation purement visuelle : le serveur reste l'unique autorite sur les coups.
// On n'anime que les coups consécutifs pour ne jamais fabriquer un état erroné.
export function planCheckersReplay(previous, incoming, lastMove, matchKey) {
  if (!previous || previous.matchKey !== matchKey || incoming.ply !== previous.ply + 1) return null;
  if (!Array.isArray(previous.board) || !Array.isArray(incoming.board)
      || previous.board.length !== 100 || incoming.board.length !== 100) return null;
  const from = lastMove?.from;
  const path = lastMove?.path;
  if (!Number.isInteger(from) || from < 0 || from > 99 || !Array.isArray(path)
      || !path.length || path.some(p => !Number.isInteger(p) || p < 0 || p > 99)) return null;
  const piece = previous.board[from];
  const end = path[path.length - 1];
  if (!piece || piece === '.' || !incoming.board[end] || incoming.board[end] === '.'
      || piece.toLowerCase() !== incoming.board[end].toLowerCase()) return null;
  const before = previous.board.slice();
  before[from] = '.';
  const captured = Array.isArray(lastMove.captured) ? lastMove.captured : [];
  return {
    id: `${matchKey}-${incoming.ply}`, from, path: path.slice(), piece,
    captured: captured.slice(), before, finalBoard: incoming.board.slice(),
  };
}

export function visualSquare(index, reversed) {
  const position = reversed ? 99 - index : index;
  return { row: Math.floor(position / 10), column: position % 10 };
}

export function readableSquare(index, reversed) {
  const square = visualSquare(index, reversed);
  return `L${square.row + 1} C${square.column + 1}`;
}
