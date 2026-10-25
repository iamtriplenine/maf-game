import { useEffect, useRef, useState } from 'react';

const IMPORTANT_KINDS = new Set([
  'bankrupt',
  'game-over',
  'rent-paid',
  'tax-paid',
  'payment',
  'go-reward',
  'go-pass',
  'chance-card',
  'chest-card',
  'card-credit',
  'card-payment',
  'go-to-jail',
  'jail-fee',
  'purchase',
  'house-built',
  'hotel-built',
  'sale',
  'player-away',
  'player-return',
]);

function isImportant(entry) {
  if (!entry) return false;
  if (IMPORTANT_KINDS.has(entry.kind)) return true;
  const text = String(entry.text || '');
  if (/^\(test\)/i.test(text)) return false;
  return /(faillite|remporte la partie|a payé .*loyer|a payé .*\(taxe\)|a payé .*\(carte\)|a payé .*\(prison\)|a reçu 200 \$|est passé par GO|a tiré une carte Chance|a tiré une carte Caisse de communauté|est envoyé en prison|a acheté |a construit |a vendu )/i.test(text);
}

// Seulement les nouveaux evenements, jamais l'historique recharge.
// Une file conserve les cartes et paiements produits par un meme lancer.
export default function MonopolyActivity({ game, paused }) {
  const seen = useRef(game.seq);
  const [queue, setQueue] = useState([]);
  useEffect(() => {
    if (game.seq < seen.current) setQueue([]); // nouvelle partie
    const fresh = game.log
      .filter((entry) => entry.n > seen.current)
      .reverse()
      .filter(isImportant);
    seen.current = game.seq;
    if (fresh.length) setQueue((previous) => [...previous, ...fresh.map((entry) => ({
      ...entry, name: game.players[entry.player]?.name || 'Activité',
    }))]);
  }, [game]);
  const current = queue[0];
  useEffect(() => {
    if (!current || paused) return undefined;
    const timer = setTimeout(() => setQueue((previous) => previous.slice(1)), 2000);
    return () => clearTimeout(timer);
  }, [current, paused]);
  if (!current || paused) return null;
  return <div className="mono-activity" key={current.n} role="status" aria-live="polite" aria-atomic="true">
    <strong>{current.name}</strong><p>{current.text}</p>
  </div>;
}
