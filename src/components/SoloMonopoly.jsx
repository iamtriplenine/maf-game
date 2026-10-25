// MAF_MONOPOLY_V1_SOLO (etape 4) : Monopoly - mode entrainement (un seul ecran, aucun serveur, aucune mise)
import { useCallback, useEffect, useRef, useState } from 'react';
import MonopolyBoard from './MonopolyBoard';
import MonopolyActivity from './MonopolyActivity';
import MonopolySheet from './MonopolySheet';
import useMonopolyViewport from '../games/monopoly/useMonopolyViewport';
import usePawnTravel from '../games/monopoly/usePawnTravel';
import '../styles/monopoly.css';
import { SQUARES, PIECES, GROUP_COLORS } from '../games/monopoly/data';
import {
  createGame, rollDice, buy, build, sell, endTurn, giveUp, canBuy, sellOptions, buildOptions, ownedBy,
  setBalance, grantProperty, autoTurn,
} from '../games/monopoly/engine';

const usd = (n) => `${n} $`;
const STORE_KEY = 'maf:monopoly-training-v1';
const loadSaved = () => {
  try {
    const v = JSON.parse(sessionStorage.getItem(STORE_KEY));
    return v && v.version === 1 && Array.isArray(v.players) && v.players.length >= 2 ? v : null;
  } catch { return null; }
};

const RULES = [
  'Chaque joueur commence avec 1 500 $. On lance le dé, on avance, et la case décide : acheter, payer un loyer, une taxe ou tirer une carte.',
  'Passer par GO rapporte 200 $ (et 200 $ aussi si on s\'arrête dessus). « Go To Jail » envoie en prison (case 10) et coûte 50 $ ; il n\'y a pas de tour perdu.',
  'Loyer d\'une propriété : le loyer de base (×2 si on possède tout le groupe sans maison), puis ×5, ×15, ×45 avec 1, 2, 3 maisons, +200 $ avec 4 maisons, +400 $ avec l\'hôtel.',
  'Gares : 25, 50, 100 ou 200 $ selon le nombre de gares possédées. Compagnies : 4× le dé (10× si on a les deux).',
  'Construire : seulement avec un groupe de couleur complet, une maison à la fois sur la case la moins bâtie ; la 5e est un hôtel.',
  'Vendre une propriété rapporte la moitié de son prix (plus la moitié des maisons). Si on ne peut pas payer même en vendant tout : faillite. Le dernier joueur en jeu gagne.',
];
function Rules() {
  return (
    <details className="mono-panel mono-rules">
      <summary>📖 Règles du jeu</summary>
      <ul className="mono-log">{RULES.map((r) => <li key={r}>{r}</li>)}</ul>
    </details>
  );
}

function PlayerRow({ p, isCurrent, props }) {
  const prev = useRef(p.balance);
  const [delta, setDelta] = useState(null);
  useEffect(() => {
    if (prev.current === p.balance) return undefined;
    setDelta({ v: p.balance - prev.current, k: Date.now() });
    prev.current = p.balance;
    const t = setTimeout(() => setDelta(null), 1700);
    return () => clearTimeout(t);
  }, [p.balance]);
  return (
    <div className={`mono-player${isCurrent ? ' is-current' : ''}${p.bankrupt ? ' is-out' : ''}`}>
      <span className="mono-token" style={{ background: p.color }}>{PIECES[p.piece].emoji}</span>
      <span><strong>{p.name}</strong><small>{p.bankrupt ? 'Faillite' : `${props} propriété${props > 1 ? 's' : ''}`}</small></span>
      <span className="mono-money">
        {usd(p.balance)}
        {delta && <span key={delta.k} className={`mono-delta ${delta.v > 0 ? 'is-up' : 'is-down'}`}>{delta.v > 0 ? '+' : ''}{delta.v}</span>}
      </span>
    </div>
  );
}

export default function SoloMonopoly({ onPlayingChange }) {
  const [count, setCount] = useState(2);
  const [dice, setDice] = useState(1);
  const [names, setNames] = useState(['Joueur 1', 'Joueur 2', 'Joueur 3', 'Joueur 4', 'Joueur 5', 'Joueur 6', 'Joueur 7']);
  const [game, setGame] = useState(loadSaved);
  const [rolling, setRolling] = useState(false);
  const [tmpFaces, setTmpFaces] = useState([]);
  const [selected, setSelected] = useState(null);
  const [forced, setForced] = useState([0, 0]); // 0 = aleatoire
  const [auto, setAuto] = useState(false);
  const [testCash, setTestCash] = useState('100');
  const [testSquare, setTestSquare] = useState('39');
  const timer = useRef(null);
  const rollTimeout = useRef(null);
  const screenRef = useRef(null), consoleRef = useRef(null);
  const [panel, setPanel] = useState(null);
  const [cameraFocused, setCameraFocused] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  useMonopolyViewport(!!game, screenRef, consoleRef);
  useEffect(() => { onPlayingChange?.(!!game); }, [!!game, onPlayingChange]);
  useEffect(() => () => onPlayingChange?.(false), [onPlayingChange]);

  useEffect(() => () => { clearInterval(timer.current); clearTimeout(rollTimeout.current); }, []);

  // La partie survit si on change d'onglet dans l'application (effacee a la fermeture)
  useEffect(() => {
    try {
      if (game) sessionStorage.setItem(STORE_KEY, JSON.stringify(game));
      else sessionStorage.removeItem(STORE_KEY);
    } catch { /* stockage indisponible : pas grave */ }
  }, [game]);

  const { shown, walking, travel } = usePawnTravel(game);

  const start = () => {
    setCameraFocused(false);
    setAuto(false);
    setGame(createGame({ names: names.slice(0, count).map((n, i) => n.trim() || `Joueur ${i + 1}`), dice }));
    setSelected(null);
  };

  const onRoll = useCallback(() => {
    if (!game || game.phase !== 'roll' || rolling || walking) return;
    setRolling(true);
    timer.current = setInterval(() => setTmpFaces(Array.from({ length: game.dice }, () => 1 + Math.floor(Math.random() * 6))), 90);
    rollTimeout.current = setTimeout(() => {
      clearInterval(timer.current);
      setGame((g) => rollDice(g, { forced: forced.slice(0, g.dice).map((v) => v || null) }));
      setRolling(false);
    }, 850);
  }, [game, rolling, walking, forced]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== 'Space' || /INPUT|TEXTAREA|SELECT|BUTTON/.test(e.target?.tagName || '')) return;
      e.preventDefault();
      onRoll();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onRoll]);

  // Mode automatique : joue les tours tout seul pour voir les debits d'argent
  useEffect(() => {
    if (!auto || !game || game.phase === 'over' || walking || rolling) return undefined;
    const id = setTimeout(() => setGame((g) => autoTurn(g)), 900);
    return () => clearTimeout(id);
  }, [auto, game, walking, rolling]);

  if (!game) {
    return (
      <div className="mono">
        <div className="mono__setup">
          <h3>🏙️ Monopoly · entraînement</h3>
          <p className="mono__note">Mode test : tous les joueurs jouent sur le même écran, chacun son tour. Aucune mise, rien n'est envoyé au serveur. Tu peux voir le plateau, les débits d'argent, les cartes et les constructions.</p>
          <div><p className="mono__note">Nombre de joueurs</p>
            <div className="mono__row">{[2, 3, 4, 5, 6, 7].map((n) => <button key={n} type="button" className={`mono__chip${count === n ? ' is-on' : ''}`} onClick={() => setCount(n)}>{n}</button>)}</div></div>
          <div><p className="mono__note">Dés (l'original utilisait 1 seul dé)</p>
            <div className="mono__row">{[1, 2].map((n) => <button key={n} type="button" className={`mono__chip${dice === n ? ' is-on' : ''}`} onClick={() => setDice(n)}>{n} dé{n > 1 ? 's' : ''}</button>)}</div></div>
          <div className="mono__names">{Array.from({ length: count }, (_, i) => (
            <input key={i} value={names[i]} maxLength={14} aria-label={`Nom du joueur ${i + 1}`}
              onChange={(e) => setNames((a) => a.map((v, k) => (k === i ? e.target.value : v)))} />
          ))}</div>
          <button type="button" className="btn btn--primary btn--block" onClick={start}>Commencer l'entraînement</button>
          <Rules />
        </div>
      </div>
    );
  }

  const me = game.players[game.current];
  const faces = rolling ? tmpFaces : (game.lastRoll?.dice || []);
  const hint = (() => {
    if (game.phase === 'over') return '';
    if (rolling) return 'Lancer en cours…';
    if (walking) return 'Déplacement du pion…';
    if (game.phase === 'debt') return `${me.name}, tu dois ${usd(game.debt.amount)} mais tu as ${usd(me.balance)}. Vends une propriété ou déclare faillite.`;
    if (game.phase === 'roll') return `${me.name}, lance ${game.dice === 2 ? 'les dés' : 'le dé'} (bouton ou touche Espace).`;
    if (canBuy(game)) return `${me.name} est sur ${SQUARES[me.location].name} : achat possible pour ${usd(SQUARES[me.location].price)}.`;
    return 'Tu peux construire, vendre ou terminer ton tour.';
  })();
  const sells = sellOptions(game);
  const builds = buildOptions(game);

  return (
    <div className="mono mono--playing">
      <section className="mono-play-screen" ref={screenRef} aria-label="Partie de Monopoly">
        <MonopolyBoard game={game} selected={selected} onSelect={setSelected}
          rolling={rolling} diceFaces={faces} positions={shown} travel={travel}
          cameraFocused={cameraFocused} onCameraReadyChange={setCameraReady}
          renderCenter={() => <MonopolyActivity game={game} paused={rolling || walking || !!panel} />} />
        <div className="mono-console" ref={consoleRef}>
          <div className="mono-statusline">
            <span><span className="mono-token" style={{ background: me.color }}>{PIECES[me.piece].emoji}</span><strong>{me.name}</strong></span>
            <span>{usd(me.balance)} <small>· Tour {game.turn}</small></span>
          </div>
          {game.phase === 'over' ? (
            <div className="mono-win">
              <h3>{game.winner >= 0 ? `🏆 ${game.players[game.winner].name} gagne !` : 'Partie terminée'}</h3>
              <button type="button" className="btn btn--primary btn--sm" onClick={start}>Rejouer</button>
              <button type="button" className="btn btn--sm" onClick={() => setGame(null)}>Changer les réglages</button>
            </div>
          ) : <>
            <p className={`mono-hint${game.phase === 'debt' ? ' mono-hint--warn' : ''}`} title={hint}>{hint}</p>
            <div className="mono-actions">
              <button type="button" className="btn btn--primary btn--sm" disabled={game.phase !== 'roll' || rolling || walking} onClick={onRoll}>🎲 Lancer</button>
              <button type="button" className="btn btn--sm" disabled={!canBuy(game) || walking || rolling} onClick={() => setGame(g => buy(g))}>🏷️ Acheter{canBuy(game) ? ` (${usd(SQUARES[me.location].price)})` : ''}</button>
              <button type="button" className="btn btn--sm" disabled={game.phase !== 'after' || walking || rolling} onClick={() => setGame(g => endTurn(g))}>⏭️ Fin du tour</button>
            </div>
            <div className="mono-secondary-actions">
              <button type="button" className="btn btn--sm" disabled={!builds.length || walking || rolling} onClick={() => setPanel('build')}>🏠 Construire</button>
              <button type="button" className="btn btn--sm" disabled={(!sells.length && game.phase !== 'debt') || walking || rolling} onClick={() => setPanel('sell')}>🏷️ Vendre</button>
              <button type="button" className={`btn btn--sm${cameraFocused ? ' btn--primary' : ''}`}
                disabled={!cameraReady} aria-pressed={cameraFocused}
                title={cameraFocused ? 'Revenir à la vue générale du plateau' : 'Centrer la caméra sur le pion du joueur actif'}
                onClick={() => setCameraFocused((focused) => !focused)}>
                {cameraFocused ? '🗺️ Vue plateau' : '🎯 Mon pion'}
              </button>
              <button type="button" className="btn btn--sm" onClick={() => setPanel('more')}>••• Plus</button>
            </div>
          </>}
        </div>
      </section>
      <section className="mono-panel mono-history" aria-label="Activités">
        <h3>Activités</h3>
        <ul className="mono-log">{game.log.map(l => <li key={l.n}>{l.player === null ? '' : `${game.players[l.player].name} `}{l.text}</li>)}</ul>
      </section>
      {panel && <MonopolySheet title={panel === 'build' ? 'Construire' : panel === 'sell' ? 'Vendre' : 'Options de la partie'} onClose={() => setPanel(null)}>
      {panel === 'build' && (
        <section className="mono-panel" aria-label="Construire">
          <h3>🏠 Construire (groupe complet)</h3>
          <div className="mono-sell">
            {builds.map((o) => {
              const q = SQUARES[o.square];
              const n = game.houses[o.square];
              return (
                <div key={o.square} className="mono-sell__row">
                  <span><span className="mono-dot" style={{ background: GROUP_COLORS[q.group] }} />{q.name} · {n === 4 ? 'hôtel' : `maison n°${n + 1}`}</span>
                  <button type="button" className="btn btn--sm" disabled={walking || rolling} onClick={() => setGame((g) => build(g, o.square))}>−{usd(o.price)}</button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {panel === 'sell' && (
        <section className="mono-panel" aria-label="Propriétés">
          <h3>{game.phase === 'debt' ? '⚠️ Vends pour payer ta dette' : 'Mes propriétés'}</h3>
          <div className="mono-sell">
            {sells.length === 0 && <p className="mono__note">Aucune propriété.</p>}
            {sells.map((o) => {
              const q = SQUARES[o.square];
              return (
                <div key={o.square} className="mono-sell__row">
                  <span>{q.group && <span className="mono-dot" style={{ background: GROUP_COLORS[q.group] }} />}{q.name}{game.houses[o.square] ? ` (${game.houses[o.square] === 5 ? 'hôtel' : `${game.houses[o.square]} 🏠`})` : ''}</span>
                  <button type="button" className="btn btn--sm" disabled={walking || rolling} onClick={() => setGame((g) => sell(g, o.square))}>Vendre +{usd(o.value)}</button>
                </div>
              );
            })}
            {game.phase === 'debt' && <button type="button" className="btn btn--sm btn--outline" onClick={() => setGame((g) => giveUp(g))}>Déclarer faillite</button>}
          </div>
        </section>
      )}


        {panel === 'more' && <>
          <section className="mono-players" aria-label="Joueurs">
            {game.players.map(p => <PlayerRow key={p.id} p={p} isCurrent={p.id === game.current && game.phase !== 'over'} props={ownedBy(game,p.id).length} />)}
          </section>
          <Rules />
      {game.phase !== 'over' && (
        <details className="mono-panel mono-tools">
          <summary>🧪 Outils de test</summary>
          <p className="mono__note">Pour voir tous les cas sans attendre le hasard. Ces boutons n'existent qu'en entraînement.</p>
          <div className="mono__row">
            {Array.from({ length: game.dice }, (_, i) => (
              <label key={i} className="mono__note">Dé {i + 1}{' '}
                <select value={forced[i]} onChange={(e) => setForced((f) => f.map((v, k) => (k === i ? Number(e.target.value) : v)))}>
                  <option value={0}>Aléatoire</option>
                  {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
            ))}
          </div>
          <div className="mono__row">
            <input className="mono-tools__num" inputMode="numeric" value={testCash} aria-label="Nouveau solde"
              onChange={(e) => setTestCash(e.target.value.replace(/\D/g, '').slice(0, 6))} />
            <button type="button" className="btn btn--sm" onClick={() => setGame((g) => setBalance(g, Number(testCash || 0)))}>Fixer le solde de {me.name}</button>
          </div>
          <div className="mono__row">
            <select value={testSquare} onChange={(e) => setTestSquare(e.target.value)} aria-label="Propriété à donner">
              {SQUARES.filter((q) => q.price).map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}
            </select>
            <button type="button" className="btn btn--sm" onClick={() => setGame((g) => grantProperty(g, Number(testSquare)))}>Donner à {me.name}</button>
          </div>
          <div className="mono__row">
            <button type="button" className="btn btn--sm" disabled={auto || walking || rolling} onClick={() => setGame((g) => autoTurn(g))}>▶️ Jouer ce tour</button>
            <button type="button" className={`btn btn--sm${auto ? ' btn--primary' : ''}`} onClick={() => setAuto((a) => !a)}>{auto ? '⏸️ Arrêter l\'auto' : '⏩ Partie automatique'}</button>
          </div>
        </details>
      )}


          <button type="button" className="btn btn--sm btn--outline" onClick={() => { if (window.confirm('Quitter cette partie d’entraînement ?')) { setAuto(false); setPanel(null); setGame(null); clearInterval(timer.current); clearTimeout(rollTimeout.current); setRolling(false); } }}>Quitter la partie</button>
        </>}
      </MonopolySheet>}
    </div>
  );
}
