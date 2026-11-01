import '../styles/ludo-introduction.css';

// MAF_LUDO_STEP_1_V1 : fiche de présentation uniquement, aucun moteur ni salon actif.
export default function LudoIntroduction() {
  return (
    <section className="ludo-introduction" aria-label="Présentation des modes Ludo">
      <p className="ludo-introduction__note" role="status">
        Le Ludo arrive bientôt sur MAF GAME. Le plateau 3D et les parties seront intégrés dans les prochaines étapes.
      </p>
      <div className="ludo-introduction__modes">
        <article className="ludo-introduction__mode">
          <span className="ludo-introduction__mode-icon" aria-hidden="true">🤖</span>
          <div>
            <h3>Entraînement</h3>
            <p>Apprendre à jouer contre un bot, sans mise.</p>
            <span className="ludo-introduction__soon">En préparation</span>
          </div>
        </article>
        <article className="ludo-introduction__mode">
          <span className="ludo-introduction__mode-icon" aria-hidden="true">🎲</span>
          <div>
            <h3>Duel en ligne</h3>
            <p>Affronter un autre joueur avec le système de salons et de mises de MAF GAME.</p>
            <span className="ludo-introduction__soon">En préparation</span>
          </div>
        </article>
      </div>
    </section>
  );
}
