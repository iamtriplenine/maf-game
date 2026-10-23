import test from 'node:test';
import assert from 'node:assert/strict';
import { startDicePractice, dicePracticeRoll, addDicePracticeRound } from './diceTrainingEngine.js';

test('modes et parametres de jeu de des en entrainement', () => {
  for (const diceCount of [1, 2]) for (const rounds of [1, 3, 5, 10]) {
    const config = startDicePractice(diceCount, rounds, 'separate');
    assert.equal(config.rounds, rounds);
    assert.equal(config.diceCount, diceCount);
  }
  assert.throws(() => startDicePractice(2, 2, 'separate'));
  assert.throws(() => startDicePractice(1, 1, 'cumulative'));
  assert.throws(() => startDicePractice(3, 5, 'cumulative'));
});

test('lancers individuels 1 et 2 des entre 1 et 6', () => {
  assert.deepEqual(dicePracticeRoll(1, () => 0), [1]);
  assert.deepEqual(dicePracticeRoll(2, () => 0.9999), [6, 6]);
});

test('manches separees : 2 victoires sur 3, totaux independants', () => {
  let game = startDicePractice(1, 3, 'separate');
  game = addDicePracticeRound(game, [6], [5]);
  game = addDicePracticeRound(game, [1], [6]);
  game = addDicePracticeRound(game, [6], [1]);
  assert.equal(game.winner, 'host');
  assert.equal(game.wins.host, 2);
  assert.equal(game.wins.guest, 1);
  assert.equal(game.finished, true);
  assert.throws(() => addDicePracticeRound(game, [6], [1]));
});

test('cumul : plus grand total gagne, independamment du nombre de manches', () => {
  let game = startDicePractice(2, 3, 'cumulative');
  game = addDicePracticeRound(game, [6, 6], [5, 5]);
  game = addDicePracticeRound(game, [2, 2], [3, 3]);
  game = addDicePracticeRound(game, [6, 6], [1, 1]);
  assert.equal(game.totals.host, 28);
  assert.equal(game.totals.guest, 18);
  assert.equal(game.winner, 'host');
});

test('egalite en mode separe ou cumul', () => {
  for (const mode of ['separate','cumulative']) {
    let game = startDicePractice(1, 3, mode);
    for (let i = 0; i < 3; i++) game = addDicePracticeRound(game, [4], [4]);
    assert.equal(game.draw, true);
    assert.equal(game.winner, null);
  }
});

test('10 manches cumul : utilise toutes les manches, 1 coup decide directement', () => {
  let ten = startDicePractice(1, 10, 'cumulative');
  for (let i = 0; i < 10; i++) ten = addDicePracticeRound(ten, [6], [1]);
  assert.equal(ten.history.length, 10);
  assert.equal(ten.winner, 'host');
  const one = addDicePracticeRound(startDicePractice(2, 1, 'separate'), [2, 4], [2, 3]);
  assert.equal(one.winner, 'host');
});

test('les entrees invalides ne changent pas le score', () => {
  const game = startDicePractice(2, 3, 'separate');
  assert.throws(() => addDicePracticeRound(game, [3], [3, 2]));
  assert.throws(() => addDicePracticeRound(game, [3, 7], [3, 2]));
  assert.equal(game.history.length, 0);
});
