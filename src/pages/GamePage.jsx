import { IconGamepad } from "../components/Icons";

// Page "Game" : la liste des jeux. Les jeux eux-memes arrivent ensuite.
const GAMES = [
  { id: "football", name: "Football", text: "Match de foot avec ton personnage." },
  { id: "checkers", name: "Dames", text: "Partie de dames en ligne." },
];

export default function GamePage() {
  return (
    <main className="game-page">
      <header className="game-page__head">
        <h1 className="title-tech">
          <IconGamepad size={30} /> Game
        </h1>
        <p>Choisis un jeu.</p>
      </header>

      <section className="game-page__list" aria-label="Jeux">
        {GAMES.map((game) => (
          <article key={game.id} className="game-card">
            <h2>{game.name}</h2>
            <p>{game.text}</p>
            <span className="game-card__soon">Bientot</span>
          </article>
        ))}
      </section>
    </main>
  );
}
