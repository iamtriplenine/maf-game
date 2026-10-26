// MAF_DICE_SOLO_V1 : mode entrainement sur cet appareil, sans argent et sans salon.
import { useEffect, useRef, useState } from 'react';
import WinDicePicker, { useWinDice } from './WinDicePicker';
import { beginWinSoloMatch, finishWinSoloMatch, winModeIsEnabled } from '../utils/winMode';
import { addDicePracticeRound, dicePracticeRoll, startDicePractice } from '../utils/diceTrainingEngine';

const faces = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

function PracticeFaces({ values }) {
  return <div className="maf-solo-dice__faces" aria-label={values?.length ? `Des : ${values.join(', ')}` : 'Pas encore de lancer'}>
    {values?.length ? values.map((value, i) => <span className="maf-solo-dice__face" key={i} role="img" aria-label={`${value}`}>
      {faces[value]}</span>) : <span className="maf-solo-dice__empty">?</span>}
  </div>;
}

export default function SoloDice({ diceCount = 1, rounds = 3, mode = 'separate' }) {
  const [game, setGame] = useState(null);
  const [rolling, setRolling] = useState(false);
  const timer = useRef(null);
  const starting=useRef(false);
  const [startingGame,setStartingGame]=useState(false);
  const [sessionNumber,setSessionNumber]=useState(0);
  const win=useWinDice('dice',true,`${sessionNumber}:${game?.history.length}`,game?.diceCount??diceCount);
  useEffect(()=>{if(game?.finished)finishWinSoloMatch('dice');},[game?.finished]);
  useEffect(()=>()=>finishWinSoloMatch('dice'),[]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const reset = async () => {
    if(starting.current)return;
    starting.current=true;setStartingGame(true);
    try {
      finishWinSoloMatch('dice');
      await beginWinSoloMatch('dice');
      setSessionNumber(n=>n+1);
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      setRolling(false);
      setGame(startDicePractice(diceCount, rounds, mode));
    } finally { starting.current=false;setStartingGame(false); }
  };
  const play = () => {
    if (!game || game.finished || rolling || starting.current || (win.enabled&&win.incomplete)) return;
    setRolling(true);
    const mine = winModeIsEnabled('dice',true)&&win.faces ? [...win.faces] : dicePracticeRoll(game.diceCount);
    const robot = dicePracticeRoll(game.diceCount);
    timer.current = setTimeout(() => {
      setGame(previous => previous && !previous.finished
        ? addDicePracticeRound(previous, mine, robot) : previous);
      setRolling(false);
      timer.current = null;
    }, 550);
  };

  if (!game) return <div className="maf-solo-dice maf-solo-dice--start">
    <div className="maf-solo-dice__welcome" aria-hidden="true">🎲</div>
    <h3>Essayer le lancer de dés</h3>
    <p>Affronte un robot, gratuitement et sans créer de salon. Tu peux tester toutes les règles.</p>
    <p className="maf-solo-dice__config">{diceCount} dé{diceCount === 2 ? 's' : ''} · {rounds} coup{rounds > 1 ? 's' : ''} · {mode === 'cumulative' ? 'Résultats cumulés' : 'Manches séparées'}</p>
    <button type="button" className="maf-solo-dice__button" disabled={startingGame} onClick={reset}>🎲 Commencer l'entraînement</button>
  </div>;

  const last = game.history.at(-1);
  const category = game.mode === 'cumulative' ? 'totals' : 'wins';
  const summary = game.draw ? '🤝 Égalité !' : game.winner === 'host' ? '🏆 Tu as gagné !' : '🤖 Le robot a gagné !';
  return <div className="maf-solo-dice" aria-label="Partie d'entraînement gratuite">
    <div className="maf-solo-dice__top">
      <strong>🎲 Mode entraînement</strong><span>Sans mise · Contre le robot</span>
    </div>
    <div className="maf-solo-dice__heading">
      <span>{game.finished ? 'Partie terminée' : `Coup ${game.history.length + 1} sur ${game.rounds}`}</span>
      <span>{game.diceCount} dé{game.diceCount === 2 ? 's' : ''} · {game.mode === 'cumulative' ? 'Cumul' : 'Manches'}</span>
    </div>
    <div className="maf-solo-dice__opponents">
      <section className="maf-solo-dice__person">
        <small>TOI</small><PracticeFaces values={last?.host.dice} />
        <strong>{last ? `${last.host.total} pts` : 'À lancer'}</strong>
        <span>{game.mode === 'cumulative' ? 'Points' : 'Manches gagnées'} : {game[category].host}</span>
      </section>
      <section className="maf-solo-dice__person">
        <small>ROBOT 🤖</small><PracticeFaces values={last?.guest.dice} />
        <strong>{last ? `${last.guest.total} pts` : 'À lancer'}</strong>
        <span>{game.mode === 'cumulative' ? 'Points' : 'Manches gagnées'} : {game[category].guest}</span>
      </section>
    </div>
    <div className="maf-solo-dice__actions" aria-live="polite">
      {game.finished ? <>
        <strong>{summary}</strong>
        <p>Résultat final : {game[category].host} – {game[category].guest} {game.mode === 'cumulative' ? 'points' : 'manches'}.</p>
        <button type="button" className="maf-solo-dice__button" disabled={startingGame} onClick={reset}>↻ Rejouer gratuitement</button>
      </> : <>
        <p>{rolling ? 'Les dés roulent…' : 'Lance tes dés : le robot joue le même coup automatiquement.'}</p>
        {win.enabled&&<WinDicePicker count={game.diceCount} value={win.value} onChange={win.choose} disabled={rolling||startingGame}/>}
        <button type="button" className="maf-solo-dice__button" disabled={rolling||startingGame||(win.enabled&&win.incomplete)} onClick={play}>
          {rolling ? '🎲 Lancement…' : `🎲 Lancer ${game.diceCount === 1 ? 'le dé' : 'les 2 dés'}`}
        </button>
      </>}
      <button type="button" className="maf-solo-dice__reset" onClick={reset}>Recommencer avec les mêmes réglages</button>
    </div>
    {game.history.length > 0 && <section className="maf-solo-dice__history" aria-label="Historique des lancers">
      <h4>Historique des coups</h4>
      <div className="maf-solo-dice__scroll"><table><thead><tr><th>Coup</th><th>Toi</th><th>Robot</th><th>Gagnant</th></tr></thead>
        <tbody>{game.history.map(h => <tr key={h.round}>
          <th>{h.round}</th><td>{h.host.dice.join(' + ')} = {h.host.total}</td>
          <td>{h.guest.dice.join(' + ')} = {h.guest.total}</td>
          <td>{h.winner === 'host' ? 'Toi' : h.winner === 'guest' ? 'Robot' : 'Égalité'}</td>
        </tr>)}</tbody>
      </table></div>
    </section>}
  </div>;
}
