import { useEffect, useRef, useState } from 'react';

// Seulement les nouveaux evenements, jamais l'historique recharge.
// Une file conserve les cartes et paiements produits par un meme lancer.
export default function MonopolyActivity({ game, paused }) {
  const seen = useRef(game.seq);
  const [queue, setQueue] = useState([]);
  useEffect(() => {
    if (game.seq < seen.current) setQueue([]); // nouvelle partie
    const fresh = game.log.filter(entry => entry.n > seen.current).reverse();
    seen.current = game.seq;
    if (fresh.length) setQueue(previous => [...previous, ...fresh.map(entry => ({
      ...entry, name: game.players[entry.player]?.name || 'Activité',
    }))]);
  }, [game]);
  const current = queue[0];
  useEffect(() => {
    if (!current || paused) return undefined;
    const timer = setTimeout(() => setQueue(previous => previous.slice(1)), 2000);
    return () => clearTimeout(timer);
  }, [current, paused]);
  if (!current || paused) return null;
  return <div className="mono-activity" key={current.n} role="status" aria-live="polite" aria-atomic="true">
    <strong>{current.name}</strong><p>{current.text}</p>
  </div>;
}
