import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { mountLudoGame } from '../games/ludo/engine';
import frame from '../games/ludo/frame.html?raw';
import '../styles/ludo-online.css';
import '../styles/ludo-glass.css';

// MAF_LUDO_STAGE5 — Informations de connexion et de reconnexion côté client.
// Aucun lancer ni mouvement n'est validé par le navigateur : le backend reste souverain.
const STALE_MS = 12000;
const showSeconds = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

export default function LudoOnline({ room, match, busy, error, onStart, onRoll, onMove, onForfeit, onExit }) {
  const [boardReady, setBoardReady] = useState(false);
  const [boardError, setBoardError] = useState('');
  const [frameKey, setFrameKey] = useState(0);
  const [now, setNow] = useState(Date.now);
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine !== false);
  const disposer = useRef(null);
  const state = useRef(match);
  const busyRef = useRef(busy);
  const handlers = useRef({ onRoll, onMove });
  const connectionRef = useRef({ canPlay: false });
  const clockRef = useRef({ lastPacket: 0, offset: 0 });
  state.current = match;
  busyRef.current = busy;
  handlers.current = { onRoll, onMove };

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    const cameOnline = () => { setOnline(true); setNow(Date.now()); };
    const wentOffline = () => { setOnline(false); setNow(Date.now()); };
    window.addEventListener('online', cameOnline);
    window.addEventListener('offline', wentOffline);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('online', cameOnline);
      window.removeEventListener('offline', wentOffline);
    };
  }, []);

  useEffect(() => {
    if (Number.isFinite(match?.serverNow)) {
      const received = Date.now();
      clockRef.current = { lastPacket: received, offset: match.serverNow - received };
      setNow(received);
    }
  }, [match?.serverNow]);

  // Le match dispose de son propre ecran, comme le Monopoly.
  const fullscreen = room.status === 'playing' || room.status === 'finished';
  useEffect(() => {
    if (!fullscreen) return undefined;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = oldOverflow; };
  }, [fullscreen]);

  const playing = room.status === 'playing';
  const finished = room.status === 'finished' || match?.finished;
  const stale = playing && (clockRef.current.lastPacket === 0 || now - clockRef.current.lastPacket > STALE_MS);
  // Un rafraichissement lent ne doit pas rendre le de inutilisable.
  // Les erreurs de reseau et les tours invalides restent controles par le serveur.
  const disconnected = !online;
  connectionRef.current.canPlay = playing && !finished && online && !busy;

  const viewer = match?.viewer;
  const mine = viewer && match?.toMove === viewer;
  // Les pions jouables sont donnes par le serveur, jamais calcules par le navigateur.
  // Le bouton de secours permet d'avancer meme si un toucher 3D est intercepte sur mobile.
  const validPawns = playing && !finished && mine && match?.roll != null && Array.isArray(match?.valid)
    ? [...new Set(match.valid)].filter(index => Number.isInteger(index) && index >= 0 && index < 4)
    : [];
  const myColor = match?.colors?.[viewer];
  const serverNow = now + clockRef.current.offset;
  const secondsLeft = (deadline) => Number.isFinite(deadline)
    ? Math.max(0, Math.ceil((deadline - serverNow) / 1000)) : null;
  const turnSeconds = secondsLeft(match?.moveDeadline);
  const myReturnSeconds = secondsLeft(match?.returnDeadline);
  const rivalReturnSeconds = secondsLeft(match?.opponentReturnDeadline);

  const cleanup = useCallback(() => {
    disposer.current?.();
    disposer.current = null;
  }, []);
  useEffect(() => () => { disposer.current?.(); disposer.current = null; }, []);
  useEffect(() => { disposer.current?.sync?.(match); }, [match]);
  // Synchroniser le statut des boutons meme si la version du plateau n'a pas change.
  useEffect(() => { disposer.current?.refreshControls?.(); }, [busy, online, playing, finished, stale, match?.viewer, match?.toMove, match?.roll]);

  const load = useCallback((e) => {
    cleanup();
    setBoardError('');
    try {
      const doc = e.currentTarget.contentDocument;
      const view = e.currentTarget.contentWindow;
      if (!doc || !view) throw new Error('Le navigateur ne permet pas de charger le plateau.');
      disposer.current = mountLudoGame(doc, view, {
        mode: 'online', initialState: state.current,
        busy: () => busyRef.current || !connectionRef.current.canPlay,
        onRoll: () => { if (connectionRef.current.canPlay) handlers.current.onRoll?.(); },
        onMove: index => { if (connectionRef.current.canPlay) handlers.current.onMove?.(index); },
      });
      setBoardReady(true);
    } catch (err) {
      setBoardReady(false);
      setBoardError('Impossible d’afficher le plateau 3D. Réessaie ou vérifie la compatibilité WebGL de ton téléphone.');
      console.error('Ludo 3D:', err);
    }
  }, [cleanup]);

  const screen = <div className={`ludo-online${fullscreen ? ' ludo-online--fullscreen' : ''}`} role="region" aria-label="Duel Ludo 3D en ligne">
    <header className="ludo-online__header">
      <strong>🎲 Duel Ludo 3D · Salon {room.code}</strong>
      <span>{room.host?.pseudo} contre {room.guest?.pseudo}</span>
    </header>
    {room.status === 'ready' ? <div className="ludo-online__actions">
      <p>Les deux joueurs sont prêts. Le créateur peut lancer le duel.</p>
      {room.is_host ? <button type="button" className="btn btn--primary" disabled={busy} onClick={onStart}>Commencer le duel</button>
        : <p>Le créateur va lancer le match.</p>}
    </div> : <>
      <div className="ludo-online__state" role="status" aria-live="polite">
        <div>{finished ? match?.winner === viewer ? '🏆 Victoire !' : 'Partie terminée'
          : mine ? match?.roll != null ? `À toi : dé ${match.roll}, choisis un pion.` : 'À toi de lancer le dé.'
          : 'Tour de ton adversaire.'}</div>
        {match?.lastAction && <small>{match.lastAction}</small>}
        {playing && turnSeconds != null && <small>Temps restant pour ce tour : {showSeconds(turnSeconds)}</small>}
        {playing && myReturnSeconds != null && <small>Retour dans la partie : {showSeconds(myReturnSeconds)}</small>}
        {playing && rivalReturnSeconds != null && <small>Retour de l’adversaire : {showSeconds(rivalReturnSeconds)}</small>}
      </div>
      {playing && <div role="status" className={`ludo-online__connection${disconnected ? ' ludo-online__connection--offline' : ''}`}>
        <span className="ludo-online__connection-dot" aria-hidden="true" />
        {disconnected ? 'Hors ligne : vérifie ta connexion Internet.'
          : stale ? 'Actualisation des données en attente : le serveur vérifie toujours les coups.'
          : 'Connecté au serveur · dés et coups synchronisés'}
      </div>}
      {error && <p role="alert" className="ludo-online__error">{error}</p>}
      <iframe key={frameKey} title="Duel Ludo 3D" srcDoc={frame} className="ludo-online__frame"
        onLoad={load} allow="fullscreen" />
      {boardError ? <div role="alert" className="ludo-online__error">
        <p>{boardError}</p>
        <button type="button" className="btn btn--outline" onClick={() => { cleanup(); setBoardReady(false); setBoardError(''); setFrameKey(key => key + 1); }}>
          Recharger le plateau
        </button>
      </div> : !boardReady && <p role="status">Chargement du plateau 3D…</p>}
    </>}
    <div className="ludo-online__actions">
      {validPawns.length > 0 && <div role="group" aria-label="Choisir un pion Ludo" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', width: '100%', alignItems: 'center' }}>
        <span style={{ width: '100%', fontSize: '12px' }}>Dé {match.roll} : touche un pion sur le plateau ou utilise un bouton :</span>
        {validPawns.map(index => <button key={index} type="button" className="btn btn--primary"
          style={{ flex: '1 1 130px', minHeight: '44px' }}
          disabled={busy || !online}
          onClick={() => onMove?.(index)}
          aria-label={`${match?.tokens?.[myColor]?.[index] === -1 ? 'Sortir' : 'Avancer'} le pion ${index + 1}`}>
          {match?.tokens?.[myColor]?.[index] === -1 ? 'Sortir' : 'Avancer'} pion {index + 1}
        </button>)}
      </div>}
      {playing && !finished && mine && match?.roll == null && <button type="button" className="btn btn--primary" disabled={busy || !online} onClick={() => onRoll?.()} aria-label="Lancer le dé pour jouer ton tour">
        🎲 Lancer le dé
      </button>}
      <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => { cleanup(); onExit?.(); }}>Quitter l’écran</button>
      {playing && !finished && <button type="button" className="btn btn--outline" disabled={busy || disconnected} onClick={() => {
        if (window.confirm('Abandonner le duel et perdre ta mise ?')) onForfeit?.();
      }}>Abandonner</button>}
    </div>
  </div>;
  return fullscreen ? createPortal(screen, document.body) : screen;
}
