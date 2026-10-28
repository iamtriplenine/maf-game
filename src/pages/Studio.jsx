import { useEffect, useState } from "react";
import CharacterViewer from "../components/CharacterViewer";
import ThemeToggle from "../components/ThemeToggle";
import { SKINS } from "../characters/skins";
import "../App.css";
import "../styles/studio-gallery.css";

export default function Studio({ onBack }) {
  const [selectedId, setSelectedId] = useState("samba");
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

      <section className="studio__heading">
        <div>
          <span className="studio__eyebrow">COLLECTION DE PERSONNAGES</span>
          <h1>Explore les skins.</h1>
          <p>Un personnage en grand, ses mouvements a portee de main.</p>
        </div>
        <span className="studio__count">{SKINS.length} SKINS</span>
      </section>

      <nav className="studio__roster" aria-label="Choisir un skin du Studio 3D">
        {SKINS.map((skin) => (
          <button
            type="button"
            key={skin.id}
            className={`studio__skin-button${skin.id === selected.id ? " is-selected" : ""}`}
            aria-pressed={skin.id === selected.id}
            onClick={() => setSelectedId(skin.id)}
          >
            <strong>{skin.name}</strong>
            <small>{skin.access === "exclusive" ? "Exclusif" : "Public"}</small>
          </button>
        ))}
      </nav>

      <section className="studio__showcase" aria-label={`Presentation 3D de ${selected.name}`}>
        <CharacterViewer key={selected.id} character={selected} />
      </section>

      <footer className="studio__fixed-return">
        <button type="button" onClick={onBack} aria-label="Retourner au profil depuis le Studio 3D">
          <span aria-hidden="true">←</span> Retour au profil
        </button>
        <span>{selected.access === "exclusive" ? "SKIN EXCLUSIF" : "COLLECTION PUBLIQUE"} · {selected.name}</span>
      </footer>
    </main>
  );
}
