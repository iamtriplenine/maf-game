import test from 'node:test';
import assert from 'node:assert/strict';
import { planCheckersReplay, visualSquare, readableSquare } from './checkersReplayPlan.js';

const empty = () => Array(100).fill('.');
function move({ from = 61, path = [50], captured = [], startPiece = 'w', endPiece = startPiece, ply = 1, key = 12 } = {}) {
  const oldBoard = empty(); oldBoard[from] = startPiece;
  const newBoard = empty(); newBoard[path.at(-1)] = endPiece;
  return { previous: { matchKey:key, ply: ply - 1, board:oldBoard }, incoming: { matchKey:key, ply, board:newBoard }, last: { from, path, captured } };
}
test('animation d un pion du joueur blanc', () => {
  const { previous, incoming, last } = move();
  const p = planCheckersReplay(previous, incoming, last, 12);
  assert.equal(p.piece, 'w');
  assert.equal(p.before[61], '.');
  assert.deepEqual(p.path, [50]);
});
test('animation des pions noirs dans le meme sens que le plateau', () => {
  const { previous, incoming, last } = move({from:32,path:[43],startPiece:'b'});
  assert.equal(planCheckersReplay(previous,incoming,last,12).piece, 'b');
  assert.deepEqual(visualSquare(32, true), {row:6,column:7});
  assert.equal(readableSquare(43, true), 'L6 C7');
});
test('rafle en plusieurs sauts, prises incluses', () => {
  const m = move({path:[43,25], captured:[52,34]});
  m.previous.board[52] = 'b'; m.previous.board[34] = 'b';
  const result = planCheckersReplay(m.previous,m.incoming,m.last,12);
  assert.deepEqual(result.captured,[52,34]);
  assert.equal(result.before[52],'b');
});
test('promotion du pion en dame', () => {
  const m = move({from:12,path:[1],endPiece:'W'});
  assert.equal(planCheckersReplay(m.previous,m.incoming,m.last,12).piece,'w');
});
test('pas de replay sur premier affichage, trou dans les tours, mauvais salon', () => {
  const m = move();
  assert.equal(planCheckersReplay(null,m.incoming,m.last,12),null);
  assert.equal(planCheckersReplay(m.previous,{...m.incoming,ply:3},m.last,12),null);
  assert.equal(planCheckersReplay(m.previous,m.incoming,m.last,13),null);
});
test('rejet des mouvements incomplets ou invalides', () => {
  const m = move();
  assert.equal(planCheckersReplay(m.previous,m.incoming,{from:61,path:[]},12),null);
  assert.equal(planCheckersReplay(m.previous,m.incoming,{from:61,path:[101]},12),null);
});
