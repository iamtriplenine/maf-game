import { useLayoutEffect, useRef } from "react";

// Bulles du chat (style messages Apple) posees sur la scene du personnage.
// Les messages des autres sont a gauche, les tiens a droite.
// Glisser le doigt SUR une bulle fait defiler tout le chat (gauche et droite ensemble) ;
// partout ailleurs, le doigt agit sur le personnage 3D comme avant.
const NEAR_BOTTOM = 70; // px : en dessous, on suit les nouveaux messages automatiquement

export default function ChatFeed({ messages, myId }) {
  const ref = useRef(null);
  const stick = useRef(true); // true = on est en bas, donc on suit les nouveaux messages

  const toBottom = () => {
    const node = ref.current;
    if (node) node.scrollTop = node.scrollHeight;
  };

  useLayoutEffect(() => {
    if (!stick.current) return undefined;
    toBottom();
    // l'animation d'arrivee agrandit la bulle un instant : on recale juste apres
    const timer = setTimeout(() => stick.current && toBottom(), 420);
    return () => clearTimeout(timer);
  }, [messages]);

  const onScroll = () => {
    const node = ref.current;
    stick.current = node.scrollHeight - node.scrollTop - node.clientHeight < NEAR_BOTTOM;
  };

  return (
    <div ref={ref} className="chat-feed" role="log" aria-live="polite" aria-label="Chat global" onScroll={onScroll}>
      {messages.length === 0 && <p className="chat-feed__empty">Aucun message pour l'instant.</p>}
      {messages.map((message, i) => {
        const mine = myId != null && message.user_id === myId;
        const showName = !mine && messages[i - 1]?.user_id !== message.user_id;
        return (
          <div key={message.id} className={`chat-msg${mine ? " chat-msg--me" : ""}`}>
            {showName && <span className="chat-msg__name">{message.pseudo || `ID ${message.user_id}`}</span>}
            <span className="chat-msg__bubble">{message.body}</span>
          </div>
        );
      })}
    </div>
  );
}
