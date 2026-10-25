import RoomCountdown from './RoomCountdown'; // MAF_ROOM_30M_POLICY_V1
const stateName = {
  open: 'Disponible', pending: 'Demande recue', ready: 'Pret a jouer',
  playing: 'Partie en cours', finished: 'Termine',
};

export default function MultiRoomSlots({ rooms, monopolyRoom, busy, onOpen, onOpenMonopoly, gameName, gameSymbol }) {
  const count = rooms.length + (monopolyRoom ? 1 : 0);
  return (
    <section className={`maf-slots${count === 0 ? ' maf-slots--empty' : ''}`} aria-label="Mes salons de jeux">
      <header className="maf-slots__heading">
        <h2>Mes salons <span className="maf-slots__counter">{count}</span></h2>
      </header>
      {count > 0 && <div className="maf-slots__list">
          {monopolyRoom && <button key={`monopoly-${monopolyRoom.id}`} type="button"
            className={`maf-slots__item maf-slots__item--${monopolyRoom.status}`}
            onClick={() => onOpenMonopoly(monopolyRoom)} disabled={busy}>
            <span className="maf-slots__icon" aria-hidden="true">🎩</span>
            <span className="maf-slots__info"><strong>Monopoly</strong>
              <small>Salon #{monopolyRoom.code} · {monopolyRoom.players?.length || 1}/{monopolyRoom.maxPlayers} joueurs</small></span>
            <span className="maf-slots__stake">{new Intl.NumberFormat('fr-FR').format(monopolyRoom.stake)} F CFA</span>
            <RoomCountdown room={{status:monopolyRoom.status==='playing'?'playing':'open',expires_at:monopolyRoom.createdAt ? new Date(Date.parse(monopolyRoom.createdAt) + 30*60*1000).toISOString() : null, server_now:monopolyRoom.serverNow}} prefix="" />
            <span className="maf-slots__arrow" aria-hidden="true">→</span>
          </button>}
          {rooms.map((room) => <button key={room.id} type="button"
            className={`maf-slots__item maf-slots__item--${room.status}`}
            onClick={() => onOpen(room)} disabled={busy}>
            <span className="maf-slots__icon" aria-hidden="true">{gameSymbol(room.game)}</span>
            <span className="maf-slots__info">
              <strong>{gameName(room.game)}</strong>
              <small>Salon #{room.code} · {room.host_busy && ['open','pending'].includes(room.status) ? 'En partie, veuillez patienter' : stateName[room.status] || room.status}{/* MAF_ROOMS_FREE_UNTIL_ACCEPTED_V1 */}</small>
            </span>
            <RoomCountdown room={room} prefix="" />
            <span className="maf-slots__arrow" aria-hidden="true">→</span>
          </button>)}
        </div>}
    </section>
  );
}
