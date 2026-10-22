// Bulles du chat (style messages Apple) posees sur la scene du personnage.
// Les messages des autres sont a gauche, les tiens a droite ; les plus anciens
// montent et s'effacent en haut de la zone.
const VISIBLE = 10;

export default function ChatFeed({ messages, myId }) {
  const shown = messages.slice(-VISIBLE);

  return (
    <div className="chat-feed" role="log" aria-live="polite" aria-label="Chat global">
      {shown.length === 0 && <p className="chat-feed__empty">Aucun message pour l'instant.</p>}
      {shown.map((message, i) => {
        const mine = myId != null && message.user_id === myId;
        const previous = shown[i - 1];
        const showName = !mine && previous?.user_id !== message.user_id;
        const age = shown.length - 1 - i; // 0 = le plus recent
        return (
          <div
            key={message.id}
            className={`chat-msg${mine ? " chat-msg--me" : ""}`}
            style={{ "--o": Math.max(0.4, 1 - age * 0.07) }}
          >
            {showName && <span className="chat-msg__name">{message.pseudo || `ID ${message.user_id}`}</span>}
            <span className="chat-msg__bubble">{message.body}</span>
          </div>
        );
      })}
    </div>
  );
}
