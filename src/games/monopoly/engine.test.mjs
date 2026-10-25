// MAF_MONOPOLY_V1_TEST : node src/games/monopoly/engine.test.mjs
import assert from 'node:assert/strict';
import {
  createGame, rollDice, buy, build, sell, endTurn, rentOf, canBuy, buildOptions,
  setBalance, grantProperty, autoTurn, giveUp,
} from './engine.js';

let n = 0;
const ok = (name, fn) => { fn(); n += 1; console.log('  ok -', name); };

ok('depart : 1500 $, premier joueur commence, 40 cases', () => {
  const s = createGame({ names: ['A', 'B'] });
  assert.equal(s.players[0].balance, 1500);
  assert.equal(s.current, 0);
  assert.equal(s.owners.length, 40);
});
ok('achat puis loyer a l autre joueur (Mediterranean 2 $)', () => {
  let s = createGame({ names: ['A', 'B'] });
  s = rollDice(s, { forced: [1] });
  assert.equal(s.players[0].location, 1);
  assert.ok(canBuy(s));
  s = buy(s);
  assert.equal(s.players[0].balance, 1440);
  s = endTurn(s);
  s = rollDice(s, { forced: [1] });
  assert.equal(s.players[1].balance, 1498);
  assert.equal(s.players[0].balance, 1442);
});
ok('loyer double si groupe complet, x5 avec 1 maison, hotel', () => {
  let s = createGame({ names: ['A', 'B'] });
  s = grantProperty(s, 1); s = grantProperty(s, 3);
  assert.equal(rentOf(s, 1), 4);
  s = build(s, 1); assert.equal(rentOf(s, 1), 10);
  s = build(s, 3); s = build(s, 1); s = build(s, 3);
  assert.equal(rentOf(s, 1), 30);
  s = build(s, 1); s = build(s, 3); s = build(s, 1); s = build(s, 3);
  s = build(s, 1); s = build(s, 3);
  assert.equal(s.houses[1], 5);
  assert.equal(rentOf(s, 1), 2 * 45 + 400);
});
ok('construction : on construit d abord sur la case la moins batie', () => {
  let s = createGame({ names: ['A', 'B'] });
  s = grantProperty(s, 1); s = grantProperty(s, 3);
  s = build(s, 1);
  assert.deepEqual(buildOptions(s).map((o) => o.square), [3]);
});
ok('passage par GO : +200, arrivee sur GO : +200', () => {
  let s = createGame({ names: ['A', 'B'] });
  s.players[0].location = 38;
  s = rollDice(s, { forced: [3] }); // 41 -> 1
  assert.equal(s.players[0].balance, 1700 - 0);
  let t = createGame({ names: ['A', 'B'] });
  t.players[0].location = 36;
  t = rollDice(t, { forced: [4] }); // 40 -> 0
  assert.equal(t.players[0].location, 0);
  assert.equal(t.players[0].balance, 1700);
});
ok('taxe : Income Tax 200 $', () => {
  let s = createGame({ names: ['A', 'B'] });
  s.players[0].location = 1;
  s = rollDice(s, { forced: [3] });
  assert.equal(s.players[0].location, 4);
  assert.equal(s.players[0].balance, 1300);
});
ok('Go To Jail : prison + 50 $', () => {
  let s = createGame({ names: ['A', 'B'] });
  s.players[0].location = 26;
  s = rollDice(s, { forced: [4] });
  assert.equal(s.players[0].location, 10);
  assert.equal(s.players[0].balance, 1450);
});
ok('cartes : montant et deplacement appliques', () => {
  let s = createGame({ names: ['A', 'B'], rng: () => 0.3 });
  s.players[0].location = 4;
  s = rollDice(s, { forced: [3] }); // case 7 Chance
  assert.ok(s.card && s.card.deck === 'chance');
  assert.equal(s.decks.chance.length, 11);
});
ok('gares et compagnies', () => {
  let s = createGame({ names: ['A', 'B'] });
  s = grantProperty(s, 5); assert.equal(rentOf(s, 5), 25);
  s = grantProperty(s, 15); assert.equal(rentOf(s, 5), 50);
  s = grantProperty(s, 12); assert.equal(rentOf(s, 12, 5), 20);
  s = grantProperty(s, 28); assert.equal(rentOf(s, 12, 5), 50);
});
ok('vraie dette puis vente', () => {
  let s = createGame({ names: ['A', 'B'] });
  s = endTurn(rollDice(s, { forced: [1] })); // tour de B
  s.owners[39] = 0; s.houses[39] = 0; // A possede Boardwalk
  s = grantProperty(s, 1); // B possede Mediterranean (valeur 30)
  s = setBalance(s, 10);
  s.players[1].location = 38;
  s = rollDice(s, { forced: [1] }); // B sur Boardwalk : loyer 50 ; 10 + 30 < 50 -> faillite
  assert.ok(s.players[1].bankrupt);
  assert.equal(s.phase, 'over');
  assert.equal(s.winner, 0);
  let t = createGame({ names: ['A', 'B'] });
  t = endTurn(rollDice(t, { forced: [1] }));
  t.owners[39] = 0;
  t = grantProperty(t, 37); // valeur 175
  t = setBalance(t, 10);
  t.players[1].location = 38;
  t = rollDice(t, { forced: [1] });
  assert.equal(t.phase, 'debt');
  const a0 = t.players[0].balance;
  t = sell(t, 37);
  assert.equal(t.phase, 'after');
  assert.equal(t.players[1].balance, 10 + 175 - 50);
  assert.equal(t.players[0].balance, a0 + 50);
});
ok('derniere personne en vie gagne', () => {
  let s = createGame({ names: ['A', 'B'] });
  s = giveUp(s);
  assert.equal(s.phase, 'over');
  assert.equal(s.winner, 1);
});
ok('partie automatique de 4 joueurs : aucune erreur, argent coherent', () => {
  let s = createGame({ names: ['A', 'B', 'C', 'D'] });
  for (let i = 0; i < 4000 && s.phase !== 'over'; i += 1) s = autoTurn(s);
  for (const p of s.players) assert.ok(Number.isFinite(p.balance) && p.balance >= 0);
  console.log('     -> tours joués :', s.turn, '| phase :', s.phase, '| gagnant :', s.winner);
});
console.log(`\n${n} tests OK`);
