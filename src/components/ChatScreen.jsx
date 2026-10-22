import { useEffect, useRef, useState } from "react";
import ChatMessage from "./ChatMessage";
import ChatComposer from "./ChatComposer";
import { useStickBottom } from "../chat/useStickBottom";

// Chat global en plein ecran (ouvert par un appui long sur le bouton Chat).
export default function ChatScreen({ messages, myId, session, onSend, onNeedLogin, onClose }) {
  const listRef = useRef(null);
  const onScroll = useStickBottom(listRef, messages);
  const [box, setBox] = useState(null); // { top, height } de la zone visible (au-dessus du clavier)

  // Echap ferme ; la zone suit le clavier du telephone (iPhone : la page est decalee quand le clavier s'ouvre)
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    // La page derriere ne bouge plus tant que le chat est ouvert
    const body = document.body;
    const saved = { position: body.style.position, top: body.style.top, width: body.style.width, overflow: body.style.overflow };
    const scrollY = window.scrollY;
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";

    const vv = window.visualViewport;
    const fit = () => {
      if (!vv) return;
      setBox({ top: Math.round(vv.offsetTop), height: Math.round(vv.height) });
      if (window.scrollX || window.scrollY) window.scrollTo(0, 0);
    };
    fit();
    vv?.addEventListener("resize", fit);
    vv?.addEventListener("scroll", fit);
    return () => {
      window.removeEventListener("keydown", onKey);
      vv?.removeEventListener("resize", fit);
      vv?.removeEventListener("scroll", fit);
      body.style.position = saved.position;
      body.style.top = saved.top;
      body.style.width = saved.width;
      body.style.overflow = saved.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [onClose]);

  // Quand le clavier s'ouvre ou se ferme, on reste sur le dernier message
  useEffect(() => {
    const node = listRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [box?.height]);

  return (
    <>
    <div className="chat-backdrop" aria-hidden="true" />
    <div className="chat-screen" role="dialog" aria-modal="true" aria-label="Chat global" style={box ? { top: box.top, height: box.height } : undefined}>
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
    </>
  );
}
