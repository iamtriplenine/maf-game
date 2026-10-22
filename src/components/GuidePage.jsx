// MAF GUIDE STAGE 1
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import '../styles/maf-guide.css';

export default function GuidePage({ onClose }) {
  const backRef = useRef(null);
  useEffect(() => {
    const before = document.activeElement;
    backRef.current?.focus();
    const escape = event => { if (event.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', escape);
    return () => { window.removeEventListener('keydown', escape); before?.focus?.(); };
  }, [onClose]);
  return createPortal(
    <div className="maf-guide-overlay" role="dialog" aria-modal="true" aria-label="Guide MAF Game">
      <button className="maf-guide-backdrop" type="button" aria-label="Fermer le guide" onClick={onClose} />
      <section className="maf-guide-shell">
        <header className="maf-guide-header">
          <button ref={backRef} type="button" className="maf-guide-back" onClick={onClose} aria-label="Retour a More">← Retour</button>
          <span className="maf-guide-header__tag">CENTRE D'AIDE</span>
          <span aria-hidden="true">✦</span>
        </header>
        <div className="maf-guide-scroll">
          <div className="maf-guide-hero">
            <span className="maf-guide-kicker">TON COMPAGNON DE JEU</span>
            <h2>LE GUIDE <em>MAF GAME</em></h2>
            <p>Les petits secrets du jeu, expliqués simplement pour que tu profites de chaque partie.</p>
            <span className="maf-guide-pill">✦ Découvre, comprends, joue.</span>
          </div>
          <article className="maf-guide-placeholder">
            <span className="maf-guide-placeholder__icon" aria-hidden="true">◎</span>
            <h3>Bienvenue dans le Guide !</h3>
            <p>Ton espace d'aide est en place. La partie 2 ajoutera les cartes illustrées, les règles des jeux et une reproduction de la boule d'actualisation.</p>
          </article>
        </div>
      </section>
    </div>, document.body
  );
}
