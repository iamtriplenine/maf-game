import messi from "./characters/messi/character.json";
import { useState } from "react";
import CharacterViewer from "./components/CharacterViewer";
import loki from "./characters/loki/character.json";
import samba from "./characters/samba/character.json";
import "./App.css";

const characters = [loki, samba, messi];

export default function App() {
  const [selectedId, setSelectedId] = useState("samba");
  const selected = characters.find((item) => item.id === selectedId);

  return (
    <main className="studio">
      <header className="topbar">
        <a className="brand" href="./">MARV GAME</a>
        <span>Studio de personnages</span>
      </header>

      <section className="intro">
        <span className="eyebrow">LA COLLECTION</span>
        <h1>Les personnages prennent vie.</h1>
        <p>Selectionne un personnage pour observer et tester ses mouvements.</p>
      </section>

      <section className="cards" aria-label="Choisir un personnage">
        {characters.map((character, index) => (
          <button
            key={character.id}
            className={`character-card ${
              selectedId === character.id ? "selected" : ""
            }`}
            aria-pressed={selectedId === character.id}
            onClick={() => setSelectedId(character.id)}
          >
            <span className="card-number">0{index + 1}</span>
            <strong>{character.name}</strong>
            <span>{character.description}</span>
            <span className="card-action">Ouvrir le personnage ↗</span>
          </button>
        ))}

        {[4, 5].map((number) => (
          <div className="character-card empty" key={number}>
            <span className="card-number">0{number}</span>
            <strong>A ajouter</strong>
            <span>Emplacement disponible</span>
          </div>
        ))}
      </section>

      {selected.id === "messi" && (
        <p className="help">
          Modele statique : rotation et zoom disponibles.
          Un squelette devra etre ajoute pour animer ce personnage.
        </p>
      )}
      <CharacterViewer key={selected.id} character={selected} />
    </main>
  );
}