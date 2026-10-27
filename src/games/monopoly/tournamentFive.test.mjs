import assert from 'node:assert/strict';
import { createGame, rollDice, buy, endTurn, buildOptions, ownedBy, giveUp } from './engine.js';
import { PIECES, PLAYER_COLORS } from './data.js';
const names=Array.from({length:5},(_,i)=>`Test ${i+1}`);
let game=createGame({ names, dice:2, rng:()=>0 });
assert.equal(game.players.length,5);
assert.equal(new Set(game.players.map(p=>p.piece)).size,5);
assert.equal(new Set(game.players.map(p=>p.color)).size,5);
assert.ok(PIECES[game.players[4].piece]);
assert.ok(PLAYER_COLORS[4]);
for(let i=0;i<5;i++) {
  game=rollDice(game,{forced:[1,2]});
  assert.equal(game.players[i].location,3);
  assert.equal(game.current,i);
  if(i===0){game=buy(game);assert.deepEqual(ownedBy(game,0),[3]);assert.equal(buildOptions(game).length,1);}
  game=endTurn(game);
}
assert.equal(game.current,0);
assert.equal(game.turn,6);
let finale=createGame({names,dice:2});
for(let i=0;i<4;i++)finale=giveUp(finale);
assert.equal(finale.phase,'over');
assert.equal(finale.winner,4);
for(let n=2;n<=4;n++)assert.equal(createGame({names:names.slice(0,n)}).players.length,n);
console.log('OK : 5 pions differents, cycle de 5 tours, actions, victoire et regression 2-4.');
