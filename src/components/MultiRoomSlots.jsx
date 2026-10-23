const stateName = {
  open: 'Disponible', pending: 'Demande recue', ready: 'Pret a jouer',
  playing: 'Partie en cours', finished: 'Termine',
};

export default function MultiRoomSlots({ rooms, busy, onOpen, gameName, gameSymbol }) {
  return (
    <section className="maf-slots" aria-label="Mes salons de jeux">
      <header className="maf-slots__heading">
        <h2>Mes salons <span className="maf-slots__counter">{rooms.length}/5</span></h2>
        <span className="maf-slots__tip">1 salon par jeu</span>
      </header>
      {rooms.length === 0 ? <p className="maf-slots__empty">Tu peux creer jusqu'a 5 salons, pour 5 jeux differents.</p> : (
        <div className="maf-slots__list">
          {rooms.map((room) => <button key={room.id} type="button"
            className={`maf-slots__item maf-slots__item--${room.status}`}
            onClick={() => onOpen(room)} disabled={busy}>
            <span className="maf-slots__icon" aria-hidden="true">{gameSymbol(room.game)}</span>
            <span className="maf-slots__info">
              <strong>{gameName(room.game)}</strong>
              <small>Salon #{room.code} · {room.host_busy && ['open','pending'].includes(room.status) ? 'En partie, veuillez patienter' : stateName[room.status] || room.status}{/* MAF_ROOMS_FREE_UNTIL_ACCEPTED_V1 */}</small>
            </span>
            <span className="maf-slots__arrow" aria-hidden="true">→</span>
          </button>)}
        </div>
      )}
      <p className="maf-slots__foot">Une demande en attente ne bloque pas tes autres salons. Ils affichent "En partie, veuillez patienter" seulement des qu'un match est accepte ailleurs.</p>
    </section>
  );
}
