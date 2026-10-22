import { useState } from 'react';
import '../styles/penalty-arena.css';

const SIDES = [
  { id: 'left', title: 'Gauche', icon: '↖' },
  { id: 'center', title: 'Milieu', icon: '↑' },
  { id: 'right', title: 'Droite', icon: '↗' },
];
const directionName = (value) => ({ left: 'gauche', center: 'milieu', right: 'droite' })[value] || '';
const randomSide = () => SIDES[Math.floor(Math.random() * SIDES.length)].id;

// Vue partagee par les matchs en ligne et l'entrainement solo.
export function PenaltyArena({ room = null, match, busy = false, onChoose, onStart, onForfeit, onBack }) {
  const isSolo = !room;
  const status = room?.status || (match?.finished ? 'finished' : 'playing');
  const viewer = match?.viewer || 'host';
  const last = match?.history?.at(-1) || null;
  const role = match?.role || 'shooter';
  const ownName = isSolo ? 'Toi' : viewer === 'host' ? room?.host?.pseudo : room?.guest?.pseudo;
  const rivalName = isSolo ? 'Robot' : viewer === 'host' ? room?.guest?.pseudo : room?.host?.pseudo;
  const ownScore = match?.scores?.[viewer] ?? 0;
  const rivalScore = match?.scores?.[viewer === 'host' ? 'guest' : 'host'] ?? 0;
  const isWinner = match?.winner === viewer;
  const awaiting = !!match?.myChoice;
  const finished = !!match?.finished || status === 'finished';
  const myLastShot = last && last.shooter === viewer;
  const displayRole = role === 'shooter' ? 'TIREUR' : 'GARDIEN';
  return (
    <section className="penalty" aria-label={isSolo ? 'Entrainement tir au but' : 'Match tir au but'}>
      <div className="penalty__top">
        <div>
          <span className="game-hub__eyebrow">{isSolo ? 'MODE ENTRAINEMENT' : `SALON #${room.code}`}</span>
          <h3>⚽ Tir au but</h3>
        </div>
        <span className="penalty__phase">{finished ? 'MATCH TERMINE' : status === 'ready' ? 'PRET A JOUER' : `TIR ${Math.floor((match?.turn || 0) / 2) + 1} / ${match?.totalPerPlayer || room?.shots || 3}`}</span>
      </div>
      <div className="penalty__scoreboard" aria-live="polite">
        <div className="penalty__team"><span>{ownName || 'Moi'}</span><strong>{ownScore}</strong></div>
        <span className="penalty__dash">:</span>
        <div className="penalty__team"><span>{rivalName || 'Adversaire'}</span><strong>{rivalScore}</strong></div>
      </div>
      {match?.overtime > 0 && !finished && <p className="penalty__extra">Égalité ! Prolongation n° {match.overtime} : 3 tirs de plus par joueur.</p>}
      <div className="penalty__stadium" aria-label="Vue du terrain et du but">
        <div className="penalty__stadium-glow" />
        <div className="penalty__goal">
          <div className="penalty__net" />
          <div className={`penalty__keeper penalty__keeper--${last?.save || 'center'}`} aria-hidden="true">🧍</div>
          {last && <div className={`penalty__goal-ball penalty__goal-ball--${last.shot}`} aria-hidden="true">⚽</div>}
        </div>
        <div className="penalty__pitch">
          <div className="penalty__penalty-area" />
          <div className="penalty__spot">{!last && '⚽'}</div>
        </div>
        {last && <span className={`penalty__outcome ${last.goal ? 'penalty__outcome--goal' : 'penalty__outcome--miss'}`}>
          {last.goal ? 'BUT !' : 'ARRÊT !'}
        </span>}
      </div>
      {status === 'ready' && (
        <div className="penalty__interaction">
          <p>Deux joueurs confirmés. Chaque tir se résout quand le tireur et le gardien ont choisi.</p>
          {room.is_host ? <button type="button" className="btn btn--primary" disabled={busy} onClick={onStart}>Lancer le match</button>
            : <p className="penalty__waiting">En attente du lancement par {room.host.pseudo}…</p>}
        </div>
      )}
      {status === 'playing' && match && !finished && (
        <div className="penalty__interaction">
          <span className={`penalty__role ${role === 'shooter' ? 'penalty__role--shot' : 'penalty__role--save'}`}>{displayRole}</span>
          <p>{role === 'shooter' ? 'Choisis où tirer le ballon.' : 'Choisis où ton gardien va plonger.'}</p>
          <div className="penalty__directions" role="group" aria-label={role === 'shooter' ? 'Direction du tir' : 'Direction du gardien'}>
            {SIDES.map((side) => <button key={side.id} type="button"
              className={`penalty__direction ${match.myChoice === side.id ? 'penalty__direction--chosen' : ''}`}
              disabled={busy || awaiting} onClick={() => onChoose(side.id)}>
              <span>{role === 'keeper' && side.id === 'left' ? '↙' : role === 'keeper' && side.id === 'right' ? '↘' : side.icon}</span>
              {side.title}
            </button>)}
          </div>
          {awaiting && <p role="status" className="penalty__waiting">Choix enregistré ({directionName(match.myChoice)}). En attente de l'adversaire…</p>}
          {!awaiting && match.otherReady && <p className="penalty__waiting">Ton adversaire a déjà choisi. À toi de jouer !</p>}
        </div>
      )}
      {finished && (
        <div className="penalty__interaction penalty__finish" role="status">
          <strong>{isWinner ? '🏆 Victoire !' : 'Fin du match — Défaite'}</strong>
          <p>{isWinner ? 'Bien joué ! Tu remportes cette partie.' : 'Une revanche sera possible dans un nouveau salon.'}</p>
          <p className="penalty__no-money">Gain virtuel théorique : {isWinner && room ? `${new Intl.NumberFormat('fr-FR').format(room.stake * 2)} F CFA` : 'aucun'} — aucun transfert réel.</p>
          {onBack && <button className="btn btn--primary btn--sm" type="button" onClick={onBack}>{isSolo ? 'Rejouer' : 'Retour aux salons'}</button>}
        </div>
      )}
      {!!match?.history?.length && (
        <div className="penalty__history">
          <h4>Historique des tirs</h4>
          <div className="penalty__dots" aria-label="Succès et échecs des tirs">
            {match.history.map((shot) => <div key={shot.number} className={`penalty__dot ${shot.goal ? 'penalty__dot--goal' : 'penalty__dot--miss'}`}
              title={`Tir ${shot.number} : ${shot.shooter === viewer ? ownName : rivalName} ${shot.goal ? 'but' : 'arrêt'}. Tir ${directionName(shot.shot)}, gardien ${directionName(shot.save)}.`}>
              <span>{shot.number}</span><strong>{shot.goal ? '✓' : '×'}</strong>
            </div>)}
          </div>
          <p className="penalty__last">Vert : tir marque. Rouge : tir arrete.</p>
          {last && <p className="penalty__last">Dernier tir : {myLastShot ? ownName : rivalName} a visé {directionName(last.shot)}, le gardien a plongé {directionName(last.save)}. <strong>{last.goal ? 'But marqué (vert).' : 'Tir arrêté (rouge).'}</strong></p>}
        </div>
      )}
      {room && !finished && status === 'playing' && onForfeit && <button type="button" className="penalty__forfeit" disabled={busy}
        onClick={() => { if (window.confirm('Abandonner le match ? Ton adversaire sera déclaré gagnant (sans paiement).')) onForfeit(); }}>Abandonner le match</button>}
      <p className="penalty__disclaimer">Version de démonstration : aucune mise prélevée, aucun gain versé.</p>
    </section>
  );
}

const newSoloState = (shots) => ({
  turn: 0, regularPerPlayer: shots, totalPerPlayer: shots, overtime: 0,
  scores: { host: 0, guest: 0 }, history: [], pending: { shooter: null, keeper: null },
  winner: null, finished: false, viewer: 'host', role: 'shooter', shooter: 'host', myChoice: null, otherReady: false,
});
function resolveSolo(old, direction) {
  const shooter = old.turn % 2 === 0 ? 'host' : 'guest';
  const shot = shooter === 'host' ? direction : randomSide();
  const save = shooter === 'host' ? randomSide() : direction;
  const goal = shot !== save;
  const scores = { ...old.scores };
  if (goal) scores[shooter] += 1;
  const turn = old.turn + 1;
  let { overtime, totalPerPlayer, winner } = old;
  if (turn === totalPerPlayer * 2) {
    if (scores.host === scores.guest) { overtime += 1; totalPerPlayer += 3; }
    else winner = scores.host > scores.guest ? 'host' : 'guest';
  }
  return {
    ...old, turn, totalPerPlayer, overtime, winner, scores, finished: !!winner,
    history: [...old.history, { number: turn, shooter, shot, save, goal, scores: { ...scores } }],
    role: turn % 2 === 0 ? 'shooter' : 'keeper', shooter: turn % 2 === 0 ? 'host' : 'guest',
  };
}
export function SoloPenalty() {
  const [shots, setShots] = useState(3);
  const [state, setState] = useState(() => newSoloState(3));
  const [sessionNumber, setSessionNumber] = useState(1);
  const reset = (count = shots) => { setShots(count); setState(newSoloState(count)); setSessionNumber((s) => s + 1); };
  return (
    <div className="penalty-solo">
      <div className="penalty-solo__options">
        <span>Entraînement :</span>
        {[3, 5, 10].map((count) => <button key={count} type="button" className={shots === count ? 'active' : ''}
          onClick={() => reset(count)}>{count} tirs</button>)}
      </div>
      <PenaltyArena key={sessionNumber} match={state} onChoose={(side) => setState((s) => s.finished ? s : resolveSolo(s, side))}
        onBack={() => reset()} />
    </div>
  );
}
