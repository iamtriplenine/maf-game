import { useEffect, useState } from 'react';
import '../styles/penalty-arena.css';

const SIDES = [
  { id: 'left', title: 'Gauche', icon: '↖' },
  { id: 'center', title: 'Milieu', icon: '↑' },
  { id: 'right', title: 'Droite', icon: '↗' },
];
const directionName = (value) => ({ left: 'gauche', center: 'milieu', right: 'droite' })[value] || '';
const fmt = (value) => `${new Intl.NumberFormat('fr-FR').format(value)} F CFA`;
const randomSide = () => SIDES[Math.floor(Math.random() * SIDES.length)].id;

// Points d'impact du ballon dans le but (repere du dessin 400 x 260).
const TARGETS = { left: { x: 112, y: 108 }, center: { x: 200, y: 92 }, right: { x: 288, y: 108 } };
const BALL_SPOT = { x: 200, y: 238 };

// Terrain dessine en SVG : but avec poteaux, filet, gardien en grand, ballon.
function Scene({ last }) {
  const target = TARGETS[last?.shot || 'center'];
  const save = last?.save || 'idle';
  const stripes = [0, 1, 2, 3, 4, 5];
  return (
    <svg className="penalty__svg" viewBox="0 0 400 260" role="img"
      aria-label="But, gardien et ballon sur le point de penalty">
      <defs>
        <linearGradient id="pa-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#071626" /><stop offset="1" stopColor="#14425a" />
        </linearGradient>
        <linearGradient id="pa-grass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1c8f57" /><stop offset="1" stopColor="#0b5f3c" />
        </linearGradient>
        <pattern id="pa-net" width="12" height="12" patternUnits="userSpaceOnUse">
          <path d="M0 0H12M0 0V12" stroke="#e8fff6" strokeOpacity=".55" strokeWidth="1" fill="none" />
        </pattern>
        <pattern id="pa-crowd" width="14" height="10" patternUnits="userSpaceOnUse">
          <circle cx="4" cy="5" r="2.6" fill="#7fc5e6" fillOpacity=".5" />
          <circle cx="11" cy="3" r="2.2" fill="#f2c9a0" fillOpacity=".45" />
        </pattern>
      </defs>
      <rect width="400" height="260" fill="url(#pa-sky)" />
      <ellipse cx="200" cy="-6" rx="210" ry="80" fill="#d5fff4" opacity=".13" />
      <rect y="62" width="400" height="86" fill="url(#pa-crowd)" opacity=".55" />
      <rect y="146" width="400" height="114" fill="url(#pa-grass)" />
      {stripes.map((i) => (
        <rect key={i} y={148 + i * 19} width="400" height={9 + i * 2} fill="#ffffff" opacity={i % 2 ? 0.05 : 0} />
      ))}
      {/* Lignes du terrain */}
      <polygon points="122,176 278,176 342,258 58,258" fill="none" stroke="#eafff2" strokeOpacity=".6" strokeWidth="2.2" />
      <polygon points="152,176 248,176 270,208 130,208" fill="none" stroke="#eafff2" strokeOpacity=".5" strokeWidth="2" />
      <circle cx={BALL_SPOT.x} cy={BALL_SPOT.y + 12} r="3" fill="#fff" opacity=".8" />
      {/* Fond du but + filet */}
      <rect x="62" y="44" width="276" height="126" fill="#04141c" opacity=".5" />
      <polygon points="62,44 338,44 318,58 82,58" fill="#04141c" opacity=".35" />
      <rect x="62" y="44" width="276" height="126" fill="url(#pa-net)" />
      {/* Gardien (grand) */}
      <g key={last ? `k${last.number}` : 'k0'} className={`penalty__gk penalty__gk--${save}`}>
        <ellipse cx="200" cy="170" rx="30" ry="4" fill="#000" opacity=".3" />
        <rect x="190" y="130" width="8" height="40" rx="3" fill="#16324a" />
        <rect x="202" y="130" width="8" height="40" rx="3" fill="#16324a" />
        <ellipse cx="193" cy="170" rx="8" ry="3.5" fill="#0a1622" />
        <ellipse cx="207" cy="170" rx="8" ry="3.5" fill="#0a1622" />
        <rect x="186" y="118" width="28" height="18" rx="5" fill="#10263a" />
        <line x1="187" y1="94" x2="160" y2="66" stroke="#ffd23f" strokeWidth="10" strokeLinecap="round" />
        <line x1="213" y1="94" x2="240" y2="66" stroke="#ffd23f" strokeWidth="10" strokeLinecap="round" />
        <rect x="183" y="84" width="34" height="42" rx="9" fill="#ffd23f" />
        <rect x="183" y="102" width="34" height="6" fill="#f09d00" />
        <circle cx="157" cy="62" r="10" fill="#ff6b2b" />
        <circle cx="243" cy="62" r="10" fill="#ff6b2b" />
        <circle cx="200" cy="68" r="14" fill="#e8b48a" />
        <path d="M186 66a14 14 0 0 1 28 0z" fill="#2b1d14" />
      </g>
      {/* Poteaux et barre transversale */}
      <rect x="54" y="38" width="10" height="136" rx="3" fill="#f6fafc" />
      <rect x="336" y="38" width="10" height="136" rx="3" fill="#f6fafc" />
      <rect x="54" y="36" width="292" height="10" rx="3" fill="#f6fafc" />
      {/* Ballon */}
      <g key={last ? `b${last.number}` : 'b0'} className={last ? 'penalty__ball-fly' : 'penalty__ball-rest'}
        style={{ '--tx': `${target.x - BALL_SPOT.x}px`, '--ty': `${target.y - BALL_SPOT.y}px` }}>
        <g transform={`translate(${BALL_SPOT.x} ${BALL_SPOT.y})`}>
          <circle r="12" fill="#fff" stroke="#1d2530" strokeWidth="1.4" />
          <polygon points="0,-5 4.7,-1.5 2.9,4 -2.9,4 -4.7,-1.5" fill="#1d2530" />
        </g>
      </g>
    </svg>
  );
}

// Une ligne de ronds par joueur : vert = but marque, rouge = rate / arrete.
function ScoreTrack({ name, side, history, total, score, turnSide, finished, mine }) {
  const shots = (history || []).filter((h) => h.shooter === side);
  return (
    <div className={`penalty__track${mine ? ' penalty__track--mine' : ''}`}>
      <div className="penalty__track-head">
        <span className="penalty__track-name">{name}</span>
        <strong className="penalty__track-score">{score}</strong>
      </div>
      <div className="penalty__rounds" role="img"
        aria-label={`${name} : ${shots.filter((s) => s.goal).length} but(s) sur ${shots.length} tir(s)`}>
        {Array.from({ length: Math.max(total, shots.length) }).map((_, i) => {
          const done = shots[i];
          const state = done ? (done.goal ? 'goal' : 'miss')
            : (!finished && turnSide === side && i === shots.length ? 'next' : 'idle');
          return <span key={i} className={`penalty__round penalty__round--${state}`} />;
        })}
      </div>
    </div>
  );
}

// Vue partagee par les matchs en ligne et l'entrainement solo.
export function PenaltyArena({ room = null, match, busy = false, onChoose, onStart, onForfeit, onBack }) {
  const isSolo = !room;
  const status = room?.status || (match?.finished ? 'finished' : 'playing');
  const viewer = match?.viewer || 'host';
  const rivalSide = viewer === 'host' ? 'guest' : 'host';
  const last = match?.history?.at(-1) || null;
  const role = match?.role || 'shooter';
  const ownName = isSolo ? 'Toi' : viewer === 'host' ? room?.host?.pseudo : room?.guest?.pseudo;
  const rivalName = isSolo ? 'Robot' : viewer === 'host' ? room?.guest?.pseudo : room?.host?.pseudo;
  const ownScore = match?.scores?.[viewer] ?? 0;
  const rivalScore = match?.scores?.[rivalSide] ?? 0;
  const isWinner = match?.winner === viewer;
  const awaiting = !!match?.myChoice;
  const finished = !!match?.finished || status === 'finished';
  const myLastShot = last && last.shooter === viewer;
  const displayRole = role === 'shooter' ? 'TIREUR' : 'GARDIEN';
  const total = match?.totalPerPlayer || room?.shots || 3;
  const alertNow = status === 'playing' && !finished && !awaiting && !!match?.otherReady;

  // Petite vibration (telephone) quand l'adversaire vient de jouer.
  useEffect(() => {
    if (alertNow && typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([160, 80, 160]);
  }, [alertNow, match?.turn]);

  return (
    <section className="penalty" aria-label={isSolo ? 'Entrainement tir au but' : 'Match tir au but'}>
      <div className="penalty__top">
        <div>
          <span className="game-hub__eyebrow">{isSolo ? 'MODE ENTRAINEMENT' : `SALON #${room.code}`}</span>
          <h3>⚽ Tir au but</h3>
        </div>
        <span className="penalty__phase">{finished ? 'MATCH TERMINE' : status === 'ready' ? 'PRET A JOUER' : `TIR ${Math.floor((match?.turn || 0) / 2) + 1} / ${total}`}</span>
      </div>

      {alertNow && (
        <div className="penalty__alert" role="alert">
          <strong>⚡ {role === 'keeper' ? 'Ton adversaire a tiré !' : 'Ton adversaire est prêt dans les buts !'}</strong>
          <span>À toi de jouer maintenant</span>
        </div>
      )}

      <div className="penalty__scoreboard" aria-live="polite">
        <ScoreTrack mine name={ownName || 'Moi'} side={viewer} history={match?.history} total={total}
          score={ownScore} turnSide={match?.shooter} finished={finished} />
        <ScoreTrack name={rivalName || 'Adversaire'} side={rivalSide} history={match?.history} total={total}
          score={rivalScore} turnSide={match?.shooter} finished={finished} />
        <p className="penalty__legend"><i className="penalty__round penalty__round--goal" /> but marqué
          <i className="penalty__round penalty__round--miss" /> tir raté / arrêté</p>
      </div>
      {match?.overtime > 0 && !finished && <p className="penalty__extra">Égalité ! Prolongation n° {match.overtime} : 3 tirs de plus par joueur.</p>}

      <div className="penalty__stadium" aria-label="Vue du terrain et du but">
        <Scene last={last} />
        {last && <span key={last.number} className={`penalty__outcome ${last.goal ? 'penalty__outcome--goal' : 'penalty__outcome--miss'}`}>
          {last.goal ? 'BUT !' : 'ARRÊT !'}
        </span>}
      </div>

      {status === 'ready' && (
        <div className="penalty__interaction">
          <p>Deux joueurs confirmés. {room.escrow > 0 ? `Cagnotte retenue : ${fmt(room.escrow)}. ` : ''}Chaque tir se résout quand le tireur et le gardien ont choisi.</p>
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
          {awaiting && <p role="status" className="penalty__wait">Choix enregistré ({directionName(match.myChoice)}). En attente de l'adversaire…</p>}
        </div>
      )}
      {finished && (
        <div className="penalty__interaction penalty__finish" role="status">
          <strong>{isWinner ? '🏆 Victoire !' : 'Fin du match — Défaite'}</strong>
          <p>{isWinner ? 'Bien joué ! Tu remportes cette partie.' : 'Une revanche sera possible dans un nouveau salon.'}</p>
          <p className="penalty__no-money">{!room ? 'Entraînement : aucune mise en jeu.'
            : isWinner ? `${fmt(room.payout > 0 ? room.payout : room.stake * 2)} versés sur ton compte.`
              : `Ta mise de ${fmt(room.stake)} est perdue.`}</p>
          {onBack && <button className="btn btn--primary btn--sm" type="button" onClick={onBack}>{isSolo ? 'Rejouer' : 'Retour aux salons'}</button>}
        </div>
      )}
      {last && (
        <p className="penalty__last">Dernier tir : {myLastShot ? ownName : rivalName} a visé {directionName(last.shot)}, le gardien a plongé {directionName(last.save)}. <strong>{last.goal ? 'But marqué (vert).' : 'Tir arrêté (rouge).'}</strong></p>
      )}
      {room && !finished && status === 'playing' && onForfeit && <button type="button" className="penalty__forfeit" disabled={busy}
        onClick={() => { if (window.confirm('Abandonner le match ? Ton adversaire sera déclaré gagnant et recevra la cagnotte.')) onForfeit(); }}>Abandonner le match</button>}
      <p className="penalty__disclaimer">{!room ? 'Entraînement : aucune mise en jeu.'
        : finished ? 'Match terminé.' : `Mise de ${fmt(room.stake)} par joueur, retenue pendant le match.`}</p>
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
