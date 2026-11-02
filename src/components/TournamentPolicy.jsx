export default function TournamentPolicy({ fee = 500, game = 'monopoly' }) {
  const amount = `${Number(fee).toLocaleString('fr-FR')} F CFA`;
  return <p className="tourney-policy">
    <strong>Réservation définitive :</strong> après paiement des {amount}, le joueur ne peut pas annuler sa participation.
    Si l'organisateur supprime le tournoi ou si le seuil requis pour lancer le tournoi n'est pas atteint,
    la mise de {amount} est remboursée intégralement sur le solde réel. Présence à l'heure prévue obligatoire.
    {game === 'penalty' && <> <strong>Présence :</strong> chaque duel s'ouvre 5 minutes avant son heure et le joueur dispose de 5 minutes
    pour arriver, sinon il est déclaré forfait. Après une déconnexion, il a 2 minutes pour revenir. Un joueur qui ne joue pas pendant
    5 minutes perd par forfait. Un duel ne démarre jamais avant son heure officielle, et la finale n'est pas lancée avant l'heure « Finale »,
    même si tous les joueurs sont prêts. Si le nombre d'inscrits est impair, le dernier inscrit est remboursé.</>}
  </p>;
}
