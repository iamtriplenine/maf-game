import { useEffect, useState } from "react";
import CharacterViewer from "../components/CharacterViewer";
import ThemeToggle from "../components/ThemeToggle";
import { SKINS } from "../characters/skins";
import { useSession } from "../auth/useSession";
import { saveProfileBackground } from "../api/accounts";
import { PROFILE_BACKGROUNDS, readGuestProfileBackground, saveGuestProfileBackground, validProfileBackground } from "../profileBackgroundCatalog";
import "../App.css";
import "../styles/studio-gallery.css";

export default function Studio({ onBack }) {
  const { session, updateUser } = useSession();
  const [section, setSection] = useState('skins');
  const [selectedId, setSelectedId] = useState("samba");
  const [backgroundId, setBackgroundId] = useState(() => session ? validProfileBackground(session.profile_background_id) : readGuestProfileBackground());
  const [backgroundSaving, setBackgroundSaving] = useState(false);
  const [backgroundNotice, setBackgroundNotice] = useState('');

  useEffect(() => {
    setBackgroundId(session ? validProfileBackground(session.profile_background_id) : readGuestProfileBackground());
    setBackgroundNotice('');
  }, [session?.id, session?.profile_background_id]);

  const applyBackground = async () => {
    if (backgroundSaving) return;
    setBackgroundSaving(true);
    setBackgroundNotice('');
    try {
      if (session) {
        const user = await saveProfileBackground(backgroundId);
        updateUser(user);
      } else {
        saveGuestProfileBackground(backgroundId);
      }
      setBackgroundNotice('Arriere-plan applique au profil.');
    } catch (error) {
      setBackgroundNotice(error.message || "Impossible d'enregistrer l'arriere-plan.");
    } finally {
      setBackgroundSaving(false);
    }
  };
  const selected = SKINS.find((item) => item.id === selectedId) || SKINS[0];

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") onBack();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onBack]);

  return (
    <main className="studio studio--gallery">
      <header className="studio__toolbar">
        <button type="button" className="studio__exit" onClick={onBack} aria-label="Quitter le Studio 3D et revenir au profil">
          <span aria-hidden="true">←</span> Profil
        </button>
        <div className="studio__identity"><span>MAF GAME</span><strong>Studio 3D</strong></div>
        <ThemeToggle />
      </header>

      <nav className="studio__tabs" aria-label="Rubriques du Studio 3D">
        <button type="button" className={section === 'skins' ? 'is-active' : ''}
          aria-current={section === 'skins' ? 'page' : undefined}
          onClick={() => setSection('skins')}>Skins</button>
        <button type="button" className={section === 'backgrounds' ? 'is-active' : ''}
          aria-current={section === 'backgrounds' ? 'page' : undefined}
          onClick={() => setSection('backgrounds')}>Arrière-plans</button>
      </nav>

      <section className="studio__heading">
        <div>
          <span className="studio__eyebrow">{section === 'skins' ? 'COLLECTION DE PERSONNAGES' : 'DECORS DU PROFIL'}</span>
          <h1>{section === 'skins' ? 'Explore les skins.' : 'Choisis ton ambiance.'}</h1>
          <p>{section === 'skins' ? 'Un personnage en grand, ses mouvements a portee de main.' : 'Les caracteres de Matrix adoptent ton theme bleu ou rose.'}</p>
        </div>
        <span className="studio__count">{section === 'skins' ? `${SKINS.length} SKINS` : `${PROFILE_BACKGROUNDS.length} FONDS`}</span>
      </section>

      {section === 'skins' ? (
        <nav className="studio__roster" aria-label="Choisir un skin du Studio 3D">
          {SKINS.map((skin) => (
            <button type="button" key={skin.id}
              className={`studio__skin-button${skin.id === selected.id ? ' is-selected' : ''}`}
              aria-pressed={skin.id === selected.id}
              onClick={() => setSelectedId(skin.id)}>
              <strong>{skin.name}</strong>
              <small>{skin.access === 'exclusive' ? 'Exclusif' : 'Public'}</small>
            </button>
          ))}
        </nav>
      ) : (
        <div className="studio__background-picker" aria-label="Choisir un arriere-plan pour mon profil">
          {PROFILE_BACKGROUNDS.map((background) => (
            <button type="button" key={background.id}
              className={`studio__background-button${backgroundId === background.id ? ' is-selected' : ''}`}
              aria-pressed={backgroundId === background.id}
              onClick={() => { setBackgroundId(background.id); setBackgroundNotice(''); }}>
              <strong>{background.name}</strong>
              <small>{background.description}</small>
            </button>
          ))}
        </div>
      )}

      <section className="studio__showcase" aria-label={`Presentation 3D de ${selected.name}`}>
        <CharacterViewer key={selected.id} character={selected} backgroundId={backgroundId} />
      </section>

      {section === 'backgrounds' && (
        <div className="studio__background-actions">
          <button type="button" disabled={backgroundSaving} onClick={applyBackground}>
            {backgroundSaving ? 'Enregistrement...' : 'Appliquer sur mon profil'}
          </button>
          <p role="status" aria-live="polite">{backgroundNotice || 'Tous les fonds actuels sont accessibles gratuitement.'}</p>
        </div>
      )}

      <footer className="studio__fixed-return">
        <button type="button" onClick={onBack} aria-label="Retourner au profil depuis le Studio 3D">
          <span aria-hidden="true">←</span> Retour au profil
        </button>
        <span>{selected.access === "exclusive" ? "SKIN EXCLUSIF" : "COLLECTION PUBLIQUE"} · {selected.name}</span>
      </footer>
    </main>
  );
}
