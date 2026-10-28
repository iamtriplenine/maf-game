import { lazy, Suspense, useState } from 'react';
import { SKINS } from '../characters/skins';
import '../styles/tournament-skin-showcase.css';

// Charge le rendu WebGL uniquement quand un joueur ouvre le volet.
// Les skins exclusifs peuvent etre visualises mais ne sont pas debloques.
const ProfileStage = lazy(() => import('./ProfileStage'));

export default function TournamentSkinShowcase({ participantId, winnerId, participantName, winnerName }) {
  const [expanded, setExpanded] = useState(false);
  const [selection, setSelection] = useState('participant');
  const slots = [
    { id: 'participant', title: 'Participation', caption: 'Pour chaque joueur retenu', skinId: participantId, backendName: participantName },
    { id: 'winner', title: 'Champion', caption: 'Réservé au vainqueur de la finale', skinId: winnerId, backendName: winnerName },
  ];
  const chosen = slots.find(s => s.id === selection) || slots[0];
  // Important : ne jamais afficher Loki par defaut pour un skin inconnu.
  const skin = SKINS.find(item => item.id === chosen.skinId);
  const display = skin?.name || chosen.backendName || (chosen.skinId ? 'Skin à venir' : 'Non sélectionné');
  return (
    <details className="tourney-skin-showcase" onToggle={e => setExpanded(e.currentTarget.open)}>
      <summary><span>03</span> Les skins prévus <b aria-hidden="true">＋</b></summary>
      {expanded && <div className="tourney-skin-showcase__inner">
        <div className="tourney-skin-showcase__choices" role="group" aria-label="Choisir le skin à visualiser">
          {slots.map(s => {
            const selectedSkin = SKINS.find(item => item.id === s.skinId);
            return <button key={s.id} type="button" className={`tourney-skin-showcase__choice${s.id === selection ? ' is-selected' : ''}`}
              aria-pressed={s.id === selection} onClick={() => setSelection(s.id)}>
              <small>{s.title}</small>
              <strong>{selectedSkin?.name || s.backendName || (s.skinId ? 'Skin à venir' : 'Non choisi')}</strong>
            </button>;
          })}
        </div>
        <div className="tourney-skin-showcase__display">
          <p className="tourney-skin-showcase__eyebrow">{chosen.caption}</p>
          <h4>{display}</h4>
          {skin ? <>
            <div className="tourney-skin-showcase__viewer" aria-label={`Aperçu 3D du skin ${display}, fais glisser pour tourner`}>
              <Suspense fallback={<p className="tourney-skin-showcase__loading">Chargement du personnage…</p>}>
                <ProfileStage key={skin.id} skinId={skin.id} />
              </Suspense>
            </div>
            <p className="tourney-skin-showcase__hint">Fais glisser le personnage pour le tourner. Aperçu seulement : le skin sera débloqué après attribution de la récompense.</p>
          </> : <p className="tourney-skin-showcase__empty">
            {chosen.skinId ? 'Le modèle 3D de ce skin n’est pas encore disponible dans cette version.' : 'Aucun skin cadeau n’a été sélectionné pour cette catégorie.'}
          </p>}
        </div>
      </div>}
    </details>
  );
}
