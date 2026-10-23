// MAF_DICE_TRAINING_ENGINE_V1 : partie de demonstration locale, sans API ni mises.
export const PRACTICE_ROUND_OPTIONS = [1, 3, 5, 10];

export function startDicePractice(diceCount, rounds, mode) {
  if (![1, 2].includes(diceCount)) throw new Error('Choisis 1 ou 2 des.');
  if (!PRACTICE_ROUND_OPTIONS.includes(rounds)) throw new Error('Choisis 1, 3, 5 ou 10 coups.');
  if (!['separate', 'cumulative'].includes(mode)) throw new Error('Mode de resultat invalide.');
  if (rounds === 1 && mode !== 'separate') throw new Error('Un coup ne peut pas etre cumule.');
  return {
    diceCount, rounds, mode, history: [],
    wins: { host: 0, guest: 0, draw: 0 }, totals: { host: 0, guest: 0 },
    finished: false, winner: null, draw: false,
  };
}

export function dicePracticeRoll(diceCount, random = Math.random) {
  if (![1, 2].includes(diceCount)) throw new Error('Nombre de des invalide.');
  // Mode demonstration uniquement ; aucun resultat ne sert a regler une mise.
  return Array.from({ length: diceCount }, () => Math.floor(random() * 6) + 1);
}

export function addDicePracticeRound(state, hostDice, guestDice) {
  if (!state || state.finished) throw new Error('Cette partie est terminee.');
  const valid = values => Array.isArray(values)
    && values.length === state.diceCount
    && values.every(n => Number.isInteger(n) && n >= 1 && n <= 6);
  if (!valid(hostDice) || !valid(guestDice)) throw new Error('Des invalides.');
  const hostTotal = hostDice.reduce((a, b) => a + b, 0);
  const guestTotal = guestDice.reduce((a, b) => a + b, 0);
  const roundWinner = hostTotal === guestTotal ? null : hostTotal > guestTotal ? 'host' : 'guest';
  const history = [...state.history, {
    round: state.history.length + 1,
    host: { dice: [...hostDice], total: hostTotal },
    guest: { dice: [...guestDice], total: guestTotal }, winner: roundWinner,
  }];
  const totals = { host: state.totals.host + hostTotal, guest: state.totals.guest + guestTotal };
  const wins = { ...state.wins, [roundWinner || 'draw']: state.wins[roundWinner || 'draw'] + 1 };
  const finished = history.length === state.rounds;
  const result = state.mode === 'cumulative' ? totals : wins;
  const winner = !finished || result.host === result.guest ? null : result.host > result.guest ? 'host' : 'guest';
  return {
    ...state, history, totals, wins, finished,
    winner, draw: finished && winner === null,
  };
}
