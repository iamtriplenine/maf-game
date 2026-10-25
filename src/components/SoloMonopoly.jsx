// MAF_MONOPOLY_V1_SOLO : Monopoly - mode entrainement (un seul ecran, aucun serveur, aucune mise)
import { useCallback, useEffect, useRef, useState } from 'react';
import MonopolyBoard from './MonopolyBoard';
import '../styles/monopoly.css';
import { SQUARES, PIECES, GROUP_COLORS } from '../games/monopoly/data';
import {
  createGame, rollDice, buy, sell, endTurn, giveUp, canBuy, sellOptions, ownedBy,
} from '../games/monopoly/engine';

const usd = (n) => `${n} $`;

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

function TileInfo({ game, id }) {
  const q = SQUARES[id];
  const owner = game.owners[id];
  const kind = { prop: 'Propriété', rail: 'Gare', util: 'Compagnie', tax: 'Taxe', chance: 'Chance', chest: 'Caisse de communauté', go: 'Départ', jail: 'Prison (visite)', parking: 'Parc gratuit', gojail: 'Allez en prison' }[q.type];
  return (
    <div className="mono-panel mono-info">
      <h3>{q.group && <span className="mono-dot" style={{ background: GROUP_COLORS[q.group] }} />}{q.name}</h3>
      <span>{kind}{q.price ? ` · prix ${usd(q.price)}` : ''}{q.tax ? ` · taxe ${usd(q.tax)}` : ''}</span>
      {q.type === 'prop' && <>
        <span>Loyer : {usd(q.rent)} (×2 si tout le groupe) · 1 maison {usd(q.rent * 5)} · 2 maisons {usd(q.rent * 15)} · 3 maisons {usd(q.rent * 45)}</span>
        <span>4 maisons {usd(q.rent * 45 + 200)} · hôtel {usd(q.rent * 45 + 400)} · maison {usd(q.house)}</span>
      </>}
      {q.type === 'rail' && <span>Loyer : 25 $ / 50 $ / 100 $ / 200 $ selon le nombre de gares possédées.</span>}
      {q.type === 'util' && <span>Loyer : 4× le dé (10× avec les 2 compagnies).</span>}
      {q.price && <span>{owner === null ? 'Libre' : `Propriétaire : ${game.players[owner].name}`}{game.houses[id] ? ` · ${game.houses[id] === 5 ? 'hôtel' : `${game.houses[id]} maison(s)`}` : ''}</span>}
    </div>
  );
}

export default function SoloMonopoly() {
  const [count, setCount] = useState(2);
  const [dice, setDice] = useState(1);
  const [names, setNames] = useState(['Joueur 1', 'Joueur 2', 'Joueur 3', 'Joueur 4', 'Joueur 5', 'Joueur 6', 'Joueur 7']);
  const [game, setGame] = useState(null);
  const [rolling, setRolling] = useState(false);
  const [tmpFaces, setTmpFaces] = useState([]);
  const [selected, setSelected] = useState(null);
  const timer = useRef(null);

  useEffect(() => () => clearInterval(timer.current), []);

  const start = () => {
    setGame(createGame({ names: names.slice(0, count).map((n, i) => n.trim() || `Joueur ${i + 1}`), dice }));
    setSelected(null);
  };

  const onRoll = useCallback(() => {
    if (!game || game.phase !== 'roll' || rolling) return;
    setRolling(true);
    timer.current = setInterval(() => setTmpFaces(Array.from({ length: dice }, () => 1 + Math.floor(Math.random() * 6))), 90);
    setTimeout(() => {
      clearInterval(timer.current);
      setGame((g) => rollDice(g));
      setRolling(false);
    }, 850);
  }, [game, rolling, dice]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== 'Space' || /INPUT|TEXTAREA|SELECT|BUTTON/.test(e.target?.tagName || '')) return;
      e.preventDefault();
      onRoll();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onRoll]);

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
        </div>
      </div>
    );
  }

  const me = game.players[game.current];
  const faces = rolling ? tmpFaces : (game.lastRoll?.dice || []);
  const hint = (() => {
    if (game.phase === 'over') return '';
    if (game.phase === 'debt') return `${me.name}, tu dois ${usd(game.debt.amount)} mais tu as ${usd(me.balance)}. Vends une propriété ou déclare faillite.`;
    if (game.phase === 'roll') return `${me.name}, lance ${dice === 2 ? 'les dés' : 'le dé'} (bouton ou touche Espace).`;
    if (canBuy(game)) return `${me.name} est sur ${SQUARES[me.location].name} : achat possible pour ${usd(SQUARES[me.location].price)}.`;
    return game.log[0] ? `${game.log[0].player === null ? '' : `${game.players[game.log[0].player].name} `}${game.log[0].text}` : '';
  })();
  const sells = sellOptions(game);

  return (
    <div className="mono">
      <div className="mono-turn">
        <span className="mono-turn__who"><span className="mono-token" style={{ background: me.color }}>{PIECES[me.piece].emoji}</span>
          {game.phase === 'over' ? 'Partie terminée' : `Tour de ${me.name}`}</span>
        <small>Tour n°{game.turn}</small>
      </div>

      <MonopolyBoard game={game} selected={selected} onSelect={(i) => setSelected((s) => (s === i ? null : i))}
        rolling={rolling} diceFaces={faces} />

      {game.phase === 'over' ? (
        <div className="mono-win">
          <h3>{game.winner >= 0 ? `🏆 ${game.players[game.winner].name} gagne !` : 'Partie terminée'}</h3>
          <button type="button" className="btn btn--primary btn--sm" onClick={start}>Rejouer</button>
          <button type="button" className="btn btn--sm" onClick={() => setGame(null)}>Changer les réglages</button>
        </div>
      ) : (
        <>
          {game.card && <p className={`mono-card${game.card.deck === 'chest' ? ' mono-card--chest' : ''}`}>
            <strong>{game.card.deck === 'chest' ? 'CAISSE DE COMMUNAUTÉ' : 'CHANCE'}</strong>{game.card.text}</p>}
          {hint && <p className={`mono-hint${game.phase === 'debt' ? ' mono-hint--warn' : ''}`}>{hint}</p>}
          <div className="mono-actions">
            <button type="button" className="btn btn--primary btn--sm" disabled={game.phase !== 'roll' || rolling} onClick={onRoll}>🎲 Lancer</button>
            <button type="button" className="btn btn--sm" disabled={!canBuy(game)} onClick={() => setGame((g) => buy(g))}>
              🏷️ Acheter{canBuy(game) ? ` (${usd(SQUARES[me.location].price)})` : ''}</button>
            <button type="button" className="btn btn--sm" disabled={game.phase !== 'after'} onClick={() => setGame((g) => endTurn(g))}>⏭️ Fin du tour</button>
          </div>
        </>
      )}

      {selected !== null && <TileInfo game={game} id={selected} />}

      {game.phase !== 'over' && (game.phase === 'debt' || sells.length > 0) && (
        <section className="mono-panel" aria-label="Propriétés">
          <h3>{game.phase === 'debt' ? '⚠️ Vends pour payer ta dette' : 'Mes propriétés'}</h3>
          <div className="mono-sell">
            {sells.length === 0 && <p className="mono__note">Aucune propriété.</p>}
            {sells.map((o) => {
              const q = SQUARES[o.square];
              return (
                <div key={o.square} className="mono-sell__row">
                  <span>{q.group && <span className="mono-dot" style={{ background: GROUP_COLORS[q.group] }} />}{q.name}{game.houses[o.square] ? ` (${game.houses[o.square] === 5 ? 'hôtel' : `${game.houses[o.square]} 🏠`})` : ''}</span>
                  <button type="button" className="btn btn--sm" onClick={() => setGame((g) => sell(g, o.square))}>Vendre +{usd(o.value)}</button>
                </div>
              );
            })}
            {game.phase === 'debt' && <button type="button" className="btn btn--sm btn--outline" onClick={() => setGame((g) => giveUp(g))}>Déclarer faillite</button>}
          </div>
        </section>
      )}

      <section className="mono-players" aria-label="Joueurs">
        {game.players.map((p) => <PlayerRow key={p.id} p={p} isCurrent={p.id === game.current && game.phase !== 'over'} props={ownedBy(game, p.id).length} />)}
      </section>

      <section className="mono-panel" aria-label="Activité">
        <h3>Activité</h3>
        <ul className="mono-log">
          {game.log.slice(0, 6).map((l) => <li key={l.n}>{l.player === null ? '' : `${game.players[l.player].name} `}{l.text}</li>)}
        </ul>
      </section>

      <button type="button" className="btn btn--sm btn--outline" onClick={() => { if (window.confirm('Quitter cette partie d\'entraînement ?')) setGame(null); }}>Quitter la partie</button>
    </div>
  );
}


