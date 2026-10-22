// Une bulle de message (gauche = les autres, droite = moi)
export default function ChatMessage({ message, mine, showName }) {
  return (
    <div className={`chat-msg${mine ? " chat-msg--me" : ""}`}>
      {showName && <span className="chat-msg__name">{message.pseudo || `ID ${message.user_id}`}</span>}
      <span className="chat-msg__bubble">{message.body}</span>
    </div>
  );
}
