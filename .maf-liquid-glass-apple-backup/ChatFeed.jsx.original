import { useRef } from "react";
import ChatMessage from "./ChatMessage";
import { useStickBottom } from "../chat/useStickBottom";

// Bulles du chat (style messages Apple) posees sur la scene du personnage.
// Glisser le doigt SUR une bulle fait defiler tout le chat (gauche et droite ensemble) ;
// partout ailleurs, le doigt agit sur le personnage 3D comme avant.
const VISIBLE = 40; // bulles gardees a l'ecran (l'historique complet est dans le chat plein ecran)

export default function ChatFeed({ messages, myId }) {
  const ref = useRef(null);
  const shown = messages.slice(-VISIBLE);
  const onScroll = useStickBottom(ref, messages);

  return (
    <div ref={ref} className="chat-feed" role="log" aria-live="polite" aria-label="Chat global" onScroll={onScroll}>
      {shown.length === 0 && <p className="chat-feed__empty">Aucun message pour l'instant.</p>}
      {shown.map((message, i) => (
        <ChatMessage
          key={message.id}
          message={message}
          mine={myId != null && message.user_id === myId}
          showName={!(myId != null && message.user_id === myId) && shown[i - 1]?.user_id !== message.user_id}
        />
      ))}
    </div>
  );
}
