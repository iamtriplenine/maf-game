// MAF_DICE_FRONTEND_V1 — Duel de des serveur, mode manches ou cumul.
import { useEffect, useState } from 'react';
import WinDicePicker, { useWinDice } from './WinDicePicker';
import { finishWinRoomMatch, winModeIsEnabled } from '../utils/winMode';
import { createPortal } from 'react-dom';

const pips = ['','⚀','⚁','⚂','⚃','⚄','⚅'];
const sideName = (room, side) => side === 'host' ? room.host?.pseudo : room.guest?.pseudo;
const diceText = (n) => n === 1 ? '1 dé' : '2 dés';
const roundText = (n) => n === 1 ? '1 lancer' : `${n} coups`;

function DiceFaces({ values, hidden = false }) {
  if (hidden) return <div className="maf-dice__faces" aria-label="Dés non révélés"><span className="maf-dice__die maf-dice__die--hidden">?</span></div>;
  if (!values?.length) return <div className="maf-dice__faces"><span className="maf-dice__die maf-dice__die--hidden">—</span></div>;
  return <div className="maf-dice__faces" aria-label={`Résultat : ${values.join(' et ')}`}>
    {values.map((num,index) => <span key={index} className="maf-dice__die" aria-label={`${num}`} title={`${num}`}>
      {pips[num] || num}</span>)}
  </div>;
}

export default function DiceArena({ room, match, busy, error, onStart, onRoll, onForfeit, onBack, onExit }) {
  const [confirmForfeit, setConfirmForfeit] = useState(false);
  const ready = room.status === 'ready';
  const win=useWinDice('dice',false,`${room.id}:${match?.round}:${match?.viewer}`,match?.diceCount??room.dice_count);
  const winAvailable=win.enabled && !!match?.winModeAvailable;
  useEffect(()=>{if(room.status==='finished')finishWinRoomMatch('dice');},[room.id,room.status]);
  if (!ready && (!match || !['playing','finished'].includes(room.status)))
    return <p role="status">Chargement de la partie de dés...</p>;
  const viewer = match?.viewer || (room.is_host ? 'host' : 'guest');
  const rival = viewer === 'host' ? 'guest' : 'host';
  const count = match?.diceCount ?? room.dice_count;
  const rounds = match?.rounds ?? room.shots;
  const mode = match?.mode ?? room.dice_mode;
  const finished = room.status === 'finished' || !!match?.finished;
  const last = match?.history?.at(-1) ?? null;
  const myScore = mode === 'cumulative' ? match?.totals?.[viewer] : match?.wins?.[viewer];
  const rivalScore = mode === 'cumulative' ? match?.totals?.[rival] : match?.wins?.[rival];
  const outcome = match?.draw ? 'Match nul : les mises sont remboursées.' : match?.winner === viewer ? '🏆 Tu as gagné !' : 'Partie perdue.';

  const body = <div className="maf-dice-overlay" role="dialog" aria-modal="true" aria-label="Jeu de lancer de dés">
    <div className="maf-dice" >
      <header className="maf-dice__header">
        <button type="button" className="maf-dice__link" onClick={onExit} disabled={busy}>← Quitter</button>
        <div><strong>🎲 DÉFI DÉS</strong><small>Salon #{room.code}</small></div>
        <span className="maf-dice__round">{ready ? 'Prêt' : finished ? 'Terminé' : `Coup ${match.round}/${rounds}`}</span>
      </header>
      <div className="maf-dice__intro">
        <h2>{diceText(count)} · {roundText(rounds)}</h2>
        <p>{mode === 'cumulative' ? 'Résultats cumulés : le plus grand total gagne.' : 'Résultats séparés : le plus de manches gagnées remporte le duel.'}</p>
        <p>Chacun lance une fois par coup. Les résultats apparaissent après les deux lancers.</p>
      </div>
      {ready ? <div className="maf-dice__callout">
        <p><strong>{room.host?.pseudo}</strong> contre <strong>{room.guest?.pseudo}</strong></p>
        {room.is_host ? <button className="btn btn--primary" type="button" disabled={busy} onClick={onStart}>Lancer la partie 🎲</button>
          : <p>En attente du lancement par le créateur...</p>}
        <button className="btn btn--sm" type="button" onClick={onBack}>Retour au salon</button>
      </div> : <>
        <div className="maf-dice__players">
          {['host','guest'].map(side => <section key={side} className={`maf-dice__player${side === viewer ? ' is-me' : ''}`}>
            <small>{side === viewer ? 'TOI' : 'ADVERSAIRE'}</small>
            <strong>{sideName(room, side)}</strong>
            <DiceFaces values={last?.[side]?.dice} />
            <span className="maf-dice__points">{last ? `${last[side].total} point${last[side].total > 1 ? 's':''}` : 'Aucun lancer révélé'}</span>
            <span className="maf-dice__score">{mode === 'cumulative' ? 'Total' : 'Manches'} : {match?.[mode === 'cumulative' ? 'totals' : 'wins']?.[side] ?? 0}</span>
          </section>)}
        </div>
        {finished ? <div className="maf-dice__callout" role="status">
          <h3>{outcome}</h3>
          <p>Score final : {myScore ?? 0} – {rivalScore ?? 0} {mode === 'cumulative' ? 'points' : 'manches'}.</p>
        </div> : <div className="maf-dice__callout" role="status" aria-live="polite">
          {match.myRolled ? <>
            <strong>✓ Ton lancer est enregistré.</strong>
            <p>{match.opponentRolled ? 'Résolution du coup...' : 'L’adversaire doit encore lancer. Les dés seront révélés ensemble.'}</p>
            <DiceFaces hidden />
          </> : <>
            <strong>{last ? 'À toi de lancer pour le prochain coup !' : 'À toi de jouer !'}</strong>
            <p>Appuie sur le bouton pour lancer {diceText(count).toLowerCase()}.</p>
            {winAvailable && <WinDicePicker count={count} value={win.value} onChange={win.choose} disabled={busy}/>}
            <button type="button" className="maf-dice__roll" disabled={busy||(winAvailable&&win.incomplete)} onClick={()=>onRoll(winAvailable&&winModeIsEnabled('dice')?win.faces:undefined)}>🎲 {busy ? 'Lancement...' : `Lancer ${count === 1 ? 'le dé' : 'les 2 dés'}`}</button>
          </>}
          {match.opponentRolled && !match.myRolled && <p>✓ L’adversaire a déjà lancé.</p>}
        </div>}
        {!!match.history?.length && <section className="maf-dice__history" aria-label="Historique des coups">
          <h3>Résultats coup par coup</h3>
          <div className="maf-dice__scroll"><table><thead><tr><th>Coup</th><th>{room.host?.pseudo}</th><th>{room.guest?.pseudo}</th><th>Manche</th></tr></thead>
            <tbody>{match.history.map(round => <tr key={round.round}>
              <th>{round.round}</th><td>{round.host.dice.join(' + ')} = <strong>{round.host.total}</strong></td>
              <td>{round.guest.dice.join(' + ')} = <strong>{round.guest.total}</strong></td>
              <td>{round.winner ? sideName(room,round.winner) : 'Égalité'}</td>
            </tr>)}</tbody>
          </table></div>
          {mode === 'cumulative' && <p>Totaux cumulés : {room.host?.pseudo} {match.totals.host} • {room.guest?.pseudo} {match.totals.guest}</p>}
        </section>}
        {error && <p role="alert" className="maf-dice__error">{error}</p>}
        <div className="maf-dice__footer">
          {finished ? <button className="btn btn--primary" type="button" onClick={onBack}>Retour aux salons</button> : <>
            <button type="button" className="btn btn--sm" disabled={busy} onClick={onExit}>Sortir temporairement</button>
            <button type="button" className="btn btn--sm btn--outline" disabled={busy} onClick={() => setConfirmForfeit(true)}>Abandonner</button>
          </>}
        </div>
        {confirmForfeit && !finished && <div className="maf-dice__confirm" role="group" aria-label="Confirmer l'abandon">
          <p>Abandonner fait gagner l'adversaire et lui verse la cagnotte.</p>
          <button type="button" className="btn btn--primary" disabled={busy} onClick={() => { setConfirmForfeit(false); onForfeit(); }}>Oui, abandonner</button>
          <button type="button" className="btn" onClick={() => setConfirmForfeit(false)}>Annuler</button>
        </div>}
      </>}
    </div>
  </div>;
  return createPortal(body, document.body);
}
