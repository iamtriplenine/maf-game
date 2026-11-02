import { useCallback, useEffect, useRef, useState } from 'react';
import { mountLudoGame } from '../games/ludo/engine';
import ludoFrameDocument from '../games/ludo/frame.html?raw';
import '../styles/ludo-introduction.css';

// MAF_LUDO_STEP_3 : entrainement humain contre bot, sans compte ni mise.
const COLOR_OPTIONS = [
  { value: 'red', label: 'Rouge' },
  { value: 'blue', label: 'Bleu' },
  { value: 'green', label: 'Vert' },
  { value: 'yellow', label: 'Jaune' },
];

export default function LudoIntroduction() {
  const [opened, setOpened] = useState(false);
  const [mode, setMode] = useState('training');
  const [color, setColor] = useState('red');
  const [sessionId, setSessionId] = useState(0);
  const [error, setError] = useState('');
  const cleanupRef = useRef(null);
  const configurationRef = useRef({ mode: 'training', humanColor: 'red' });

  const cleanEngine = useCallback(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
  }, []);

  const close = useCallback(() => {
    cleanEngine();
    setOpened(false);
    setError('');
  }, [cleanEngine]);

  useEffect(() => () => cleanEngine(), [cleanEngine]);

  const start = useCallback((nextMode) => {
    cleanEngine();
    configurationRef.current = { mode: nextMode, humanColor: color };
    setMode(nextMode);
    setError('');
    setOpened(true);
    setSessionId((previous) => previous + 1);
  }, [cleanEngine, color]);

  const restart = useCallback(() => {
    cleanEngine();
    setError('');
    setSessionId((previous) => previous + 1);
  }, [cleanEngine]);

  const handleLoad = useCallback((event) => {
    cleanEngine();
    try {
      const iframe = event.currentTarget;
      if (!iframe.contentDocument || !iframe.contentWindow) {
        throw new Error('Accès au plateau 3D impossible.');
      }
      cleanupRef.current = mountLudoGame(iframe.contentDocument, iframe.contentWindow, {
        ...configurationRef.current,
        onRestart: restart,
      });
      setError('');
    } catch (err) {
      setError(`Impossible de démarrer le Ludo : ${err?.message || 'erreur inconnue'}`);
    }
  }, [cleanEngine, restart]);

  return (
    <section className="ludo-introduction" aria-label="Ludo 3D MAF GAME">
      <p className="ludo-introduction__note">
        Choisis une couleur, puis joue contre le bot. L'entraînement est gratuit : aucune mise, aucun gain et aucun salon en ligne.
      </p>
      <div className="ludo-introduction__setup">
        <label className="ludo-introduction__color-label" htmlFor="ludo-player-color">Couleur de tes pions</label>
        <select
          id="ludo-player-color"
          className="ludo-introduction__color-select"
          value={color}
          onChange={(event) => setColor(event.target.value)}
          disabled={opened}
        >
          {COLOR_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>
      <div className="ludo-introduction__actions">
        <button type="button" className="btn btn--primary" onClick={() => start('training')}>
          {opened && mode === 'training' ? 'Nouvel entraînement' : "S'entraîner contre le bot"}
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => start('local')}>
          {opened && mode === 'local' ? 'Nouvelle partie locale' : 'Partie locale à deux'}
        </button>
        {opened && <button type="button" className="btn btn--ghost" onClick={close}>Fermer le plateau</button>}
      </div>
      {error && <p className="ludo-introduction__error" role="alert">{error}</p>}
      {opened && (
        <div className="ludo-introduction__board-wrap">
          <div className="ludo-introduction__board-header" aria-live="polite">
            <span>{mode === 'training' ? 'Entraînement · Toi contre le bot' : 'Partie locale · 2 joueurs'}</span>
            <button className="ludo-introduction__restart" type="button" onClick={restart}>Recommencer</button>
          </div>
          <iframe
            key={sessionId}
            title={mode === 'training' ? 'Ludo 3D contre le bot' : 'Ludo 3D à deux joueurs'}
            className="ludo-introduction__board"
            srcDoc={ludoFrameDocument}
            onLoad={handleLoad}
            allowFullScreen
          />
          <p className="ludo-introduction__hint">Lance le dé puis sélectionne un pion éclairé. Le bot joue automatiquement à son tour. Tourne le plateau avec le doigt et utilise les boutons pour zoomer.</p>
        </div>
      )}
      <div className="ludo-introduction__modes">
        <article className="ludo-introduction__mode">
          <span className="ludo-introduction__mode-icon" aria-hidden="true">🤖</span>
          <div><h3>Entraînement</h3><p>Un joueur contre le bot, avec les règles complètes du Ludo. Gratuit et sans mise.</p><span className="ludo-introduction__ready">Disponible</span></div>
        </article>
        <article className="ludo-introduction__mode">
          <span className="ludo-introduction__mode-icon" aria-hidden="true">🎲</span>
          <div><h3>Duel en ligne</h3><p>Deux joueurs connectés, salons et système de mises MAF GAME.</p><span className="ludo-introduction__ready">Disponible dans les salons</span></div>
        </article>
      </div>
    </section>
  );
}
