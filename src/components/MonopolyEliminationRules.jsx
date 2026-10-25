// MAF_MONOPOLY_ELIM_V1 : conditions d'elimination affichees aux joueurs (reprennent les regles reellement appliquees par le serveur).
const francs = (n) => `${new Intl.NumberFormat('fr-FR').format(n)} F CFA`;

export default function MonopolyEliminationRules({ stake = 0, open = false }) {
  return (
    <details className="mono-panel mono-elim" open={open}>
      <summary>⚠️ Conditions pour être éliminé</summary>
      <ul className="mono-log">
        <li><strong>Faillite :</strong> tu dois payer (loyer, taxe, carte, prison) et, même en vendant tous tes terrains, tu n'as pas assez.</li>
        <li><strong>Dette :</strong> si tu peux payer en vendant, tu as 60 secondes pour le faire. Ensuite le serveur vend tes terrains les moins chers, puis te met en faillite s'il en manque encore.</li>
        <li><strong>Abandon :</strong> le bouton « Abandonner » (dans « Plus ») t'élimine tout de suite.</li>
        <li><strong>Absence :</strong> si tu quittes le plateau plus de 20 secondes (écran en veille, onglet masqué, autre menu), un compte à rebours de 2 minutes démarre. Sans retour, tu es éliminé.</li>
        <li><strong>Plusieurs absents :</strong> celui qui est parti en premier est éliminé en premier. Le dernier joueur resté gagne, même si son écran s'est endormi un moment.</li>
        <li><strong>Délais de jeu :</strong> 50 secondes pour lancer les dés, 60 secondes pour finir ton tour. Passé ce délai, le serveur joue à ta place (sans rien acheter).</li>
        <li><strong>Mise :</strong> être éliminé fait perdre ta mise{stake ? ` (${francs(stake)})` : ''}. Le dernier joueur resté gagne tout le pot (nombre de joueurs × mise), sans commission. Les mises ne sont remboursées que si la partie reste bloquée plus de 24 h.</li>
      </ul>
    </details>
  );
}
