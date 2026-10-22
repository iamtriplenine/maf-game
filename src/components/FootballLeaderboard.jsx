import { useEffect, useState } from 'react';
import { footballLeaderboard } from '../api/rooms';
import '../styles/maf-football-ranking.css';

const medals = ['🥇', '🥈', '🥉'];
const ordinals = ['1er', '2e', '3e'];

export default function FootballLeaderboard() {
  const [refresh, setRefresh] = useState(0);
  const [data, setData] = useState({ players: [], hasMore: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    footballLeaderboard().then(result => {
      if (!active) return;
      setData({ players: Array.isArray(result?.players) ? result.players : [], hasMore: !!result?.hasMore });
    }).catch(err => {
      if (active) setError(err?.message || 'Classement momentanement indisponible.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refresh]);

  const players = data.players;
  return (
    <div className="maf-foot-ranking" aria-label="Classement des joueurs de football">
      <div className="maf-foot-ranking__intro">
        <span className="maf-foot-ranking__kicker">⚽ SAISON EN COURS</span>
        <h3>Les champions du foot</h3>
        <p>Chaque victoire compte. Grimpe au sommet du classement !</p>
      </div>
      <div className="maf-foot-ranking__toolbar">
        <span>🏅 Victoires au tir au but</span>
        <button type="button" className="maf-foot-ranking__refresh" onClick={() => setRefresh(n => n + 1)} disabled={loading}>
          ↻ Actualiser
        </button>
      </div>

      {loading ? <div className="maf-foot-ranking__state" role="status">Chargement des champions…</div> :
        error ? <div className="maf-foot-ranking__state maf-foot-ranking__state--error" role="alert">{error}</div> :
        players.length === 0 ? (
          <div className="maf-foot-ranking__state">
            <span className="maf-foot-ranking__empty-icon" aria-hidden="true">🏆</span>
            <strong>Le podium t'attend !</strong>
            <p>Aucun match de football gagnant n'est encore enregistré. Sois le premier à prendre la tête !</p>
          </div>
        ) : (
          <>
            <div className="maf-foot-ranking__podium" aria-label="Les trois meilleurs joueurs">
              {players.slice(0, 3).map((player, index) => (
                <div key={player.place} className={`maf-foot-ranking__champion maf-foot-ranking__champion--${index + 1}`}>
                  <span className="maf-foot-ranking__medal" aria-hidden="true">{medals[index]}</span>
                  <span className="maf-foot-ranking__place">{ordinals[index]} PLACE</span>
                  <strong title={player.pseudo}>{player.pseudo}</strong>
                  <span className="maf-foot-ranking__wins">{player.wins} {player.wins === 1 ? 'victoire' : 'victoires'}</span>
                </div>
              ))}
            </div>
            <h4 className="maf-foot-ranking__subtitle">Tous les challengers</h4>
            <ol className="maf-foot-ranking__list" aria-label="Ordre du classement">
              {players.map(player => (
                <li key={player.place} className={`maf-foot-ranking__item${player.place <= 3 ? ' maf-foot-ranking__item--top' : ''}`}>
                  <span className="maf-foot-ranking__number">{player.place <= 3 ? medals[player.place - 1] : `#${player.place}`}</span>
                  <span className="maf-foot-ranking__player" title={player.pseudo}>{player.pseudo}</span>
                  <span className="maf-foot-ranking__results">
                    <strong>{player.wins} V</strong><small>{player.losses} D</small>
                  </span>
                </li>
              ))}
            </ol>
            {data.hasMore && <p className="maf-foot-ranking__footnote">Les 50 premiers joueurs sont affichés.</p>}
          </>
        )}
      <p className="maf-foot-ranking__footnote">Football uniquement · Résultats des matchs terminés et réglés · Égalités départagées par le nombre de défaites puis la victoire la plus récente. Les parties annulées ou nulles ne comptent pas.</p>
    </div>
  );
}
