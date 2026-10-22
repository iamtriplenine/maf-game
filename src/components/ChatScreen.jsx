import { useEffect, useRef, useState } from "react";
import ChatMessage from "./ChatMessage";
import ChatComposer from "./ChatComposer";
import { useStickBottom } from "../chat/useStickBottom";

// Chat global en plein ecran (ouvert par un appui long sur le bouton Chat).
export default function ChatScreen({ messages, myId, session, onSend, onNeedLogin, onClose }) {
  const listRef = useRef(null);
  const onScroll = useStickBottom(listRef, messages);
  const [height, setHeight] = useState(null);

  // Echap ferme ; la hauteur suit le clavier du telephone pour garder la zone d'ecriture visible
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const vv = window.visualViewport;
    const fit = () => vv && setHeight(vv.height);
    fit();
    vv?.addEventListener("resize", fit);
    return () => {
      window.removeEventListener("keydown", onKey);
      vv?.removeEventListener("resize", fit);
    };
  }, [onClose]);

  return (
    <div className="chat-screen" role="dialog" aria-modal="true" aria-label="Chat global" style={height ? { height } : undefined}>
      <header className="chat-screen__head">
        <h2 className="chat-screen__title title-tech">Chat global</h2>
        <button type="button" className="btn btn--round btn--glass btn--sm" aria-label="Fermer le chat" onClick={onClose}>
          &times;
        </button>
      </header>

      <div ref={listRef} className="chat-screen__list" role="log" aria-live="polite" onScroll={onScroll}>
        {messages.length === 0 && <p className="chat-feed__empty">Aucun message pour l'instant. Lance la conversation !</p>}
        {messages.map((message, i) => {
          const mine = myId != null && message.user_id === myId;
          return (
            <ChatMessage
              key={message.id}
              message={message}
              mine={mine}
              showName={!mine && messages[i - 1]?.user_id !== message.user_id}
            />
          );
        })}
      </div>

      <div className="chat-screen__foot">
        <ChatComposer session={session} onSend={onSend} onNeedLogin={onNeedLogin} />
      </div>
    </div>
  );
}
