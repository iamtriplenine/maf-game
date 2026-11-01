import { useCallback, useEffect, useRef, useState } from 'react';
import { mountLudoGame } from '../games/ludo/engine';
import ludoFrameDocument from '../games/ludo/frame.html?raw';
import '../styles/ludo-introduction.css';

// MAF_LUDO_STEP_2: moteur 3D local, sans compte, sans mise ni salle en ligne.
export default function LudoIntroduction() {
  const [opened, setOpened] = useState(false);
  const [error, setError] = useState('');
  const cleanupRef = useRef(null);
  const mountedRef = useRef(false);

  const close = useCallback(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    mountedRef.current = false;
    setOpened(false);
    setError('');
  }, []);

  useEffect(() => () => {
    cleanupRef.current?.();
    cleanupRef.current = null;
  }, []);

  const handleLoad = useCallback((event) => {
    if (mountedRef.current) {
      cleanupRef.current?.();
      cleanupRef.current = null;
      mountedRef.current = false;
    }
    try {
      const iframe = event.currentTarget;
      if (!iframe.contentDocument || !iframe.contentWindow) {
        throw new Error('Accès au plateau 3D impossible.');
      }
      cleanupRef.current = mountLudoGame(iframe.contentDocument, iframe.contentWindow);
      mountedRef.current = true;
      setError('');
    } catch (err) {
      setError(`Impossible de démarrer le Ludo : ${err?.message || 'erreur inconnue'}`);
    }
  }, []);

  return (
    <section className="ludo-introduction" aria-label="Ludo 3D MAF GAME">
      <p className="ludo-introduction__note">
        Plateau Ludo 3D intégré à MAF GAME. Pour cette étape, le moteur se teste à deux joueurs sur le même appareil, sans salon ni argent.
      </p>
      <div className="ludo-introduction__actions">
        <button type="button" className="btn btn--primary" onClick={() => { if (opened) close(); else { setError(''); mountedRef.current = false; setOpened(true); } }}>
          {opened ? 'Fermer le plateau' : 'Ouvrir le plateau 3D'}
        </button>
        <span className="ludo-introduction__soon">Mode bot et duel en ligne : étapes suivantes</span>
      </div>
      {error && <p className="ludo-introduction__error" role="alert">{error}</p>}
      {opened && (
        <div className="ludo-introduction__board-wrap">
          <iframe
            title="Plateau Ludo 3D - partie locale de test"
            className="ludo-introduction__board"
            srcDoc={ludoFrameDocument}
            onLoad={handleLoad}
            allowFullScreen
          />
          <p className="ludo-introduction__hint">Dé : appuie sur « Lancer le dé ». Pion : clique sur un pion éclairé. Souris ou tactile : tourne le plateau ; molette ou boutons : zoom.</p>
        </div>
      )}
      <div className="ludo-introduction__modes">
        <article className="ludo-introduction__mode">
          <span className="ludo-introduction__mode-icon" aria-hidden="true">🤖</span>
          <div><h3>Entraînement</h3><p>Un joueur contre un bot, sans mise.</p><span className="ludo-introduction__soon">Étape 3 — en préparation</span></div>
        </article>
        <article className="ludo-introduction__mode">
          <span className="ludo-introduction__mode-icon" aria-hidden="true">🎲</span>
          <div><h3>Duel en ligne</h3><p>Deux vrais joueurs, salons et système de mises MAF GAME.</p><span className="ludo-introduction__soon">Étape 4 — en préparation</span></div>
        </article>
      </div>
    </section>
  );
}
