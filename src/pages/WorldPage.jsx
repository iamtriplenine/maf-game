import { IconGlobe } from "../components/Icons";
import "../styles/nav.css";

// Page "World" (bouton du milieu de la barre du bas).
// Phase 1 : page vide. Le nouveau jeu sera ajoute ici dans les phases suivantes.
export default function WorldPage() {
  return (
    <main className="game-page">
      <header className="game-page__head">
        <h1>
          <IconGlobe size={36} />
          World
        </h1>
        <p>Un nouveau jeu arrive bientot ici.</p>
      </header>
    </main>
  );
}
