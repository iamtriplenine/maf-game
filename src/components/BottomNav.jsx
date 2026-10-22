import { useRef, useState } from "react";
import { IconGamepad, IconUser } from "./Icons";

// Barre de navigation du bas : Game (gauche) | Profil (droite).
// On peut APPUYER sur un cote, ou GLISSER le doigt / la souris d'un cote a l'autre.
const ITEMS = [
  { id: "game", label: "Game", Icon: IconGamepad },
  { id: "profile", label: "Profil", Icon: IconUser },
];
const PAD = 5; // doit rester egal a --nav-pad dans nav.css
const DRAG_START = 5; // pixels avant de considerer que c'est un glissement

const clamp = (n) => Math.min(1, Math.max(0, n));

export default function BottomNav({ value, onChange }) {
  const rootRef = useRef(null);
  const gesture = useRef(null);
  const [dragPos, setDragPos] = useState(null); // 0 (Game) .. 1 (Profil) pendant le glissement

  const index = Math.max(0, ITEMS.findIndex((item) => item.id === value));
  const pos = dragPos ?? index;
  const shown = Math.round(pos);

  const choose = (target) => {
    if (ITEMS[target].id !== value) onChange(ITEMS[target].id);
  };

  const onPointerDown = (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const rect = rootRef.current.getBoundingClientRect();
    gesture.current = {
      startX: event.clientX,
      startPos: index,
      track: (rect.width - PAD * 2) / 2, // largeur d'une moitie
      rect,
      moved: false,
      pos: index,
    };
  };

  const onPointerMove = (event) => {
    const g = gesture.current;
    if (!g) return;
    const dx = event.clientX - g.startX;
    if (!g.moved) {
      if (Math.abs(dx) < DRAG_START) return;
      g.moved = true;
      try {
        rootRef.current.setPointerCapture(event.pointerId);
      } catch {
        /* pas grave */
      }
    }
    g.pos = clamp(g.startPos + dx / g.track);
    setDragPos(g.pos);
  };

  const finish = (event, cancelled) => {
    const g = gesture.current;
    gesture.current = null;
    if (!g) return;
    setDragPos(null);
    if (cancelled) return;
    if (g.moved) {
      choose(g.pos >= 0.5 ? 1 : 0); // on lache : on va du cote le plus proche
    } else {
      choose(event.clientX - g.rect.left < g.rect.width / 2 ? 0 : 1); // simple appui
    }
  };

  const onKeyDown = (event) => {
    if (event.key === "ArrowLeft") choose(0);
    if (event.key === "ArrowRight") choose(1);
  };

  return (
    <nav
      ref={rootRef}
      className={`bottom-nav${dragPos !== null ? " is-dragging" : ""}`}
      style={{ "--pos": pos }}
      aria-label="Navigation principale"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(event) => finish(event, false)}
      onPointerCancel={(event) => finish(event, true)}
      onKeyDown={onKeyDown}
    >
      <span className="bottom-nav__thumb" aria-hidden="true" />
      {ITEMS.map(({ id, label, Icon }, i) => (
        <button
          key={id}
          type="button"
          className={`bottom-nav__item${shown === i ? " is-active" : ""}`}
          aria-current={value === id ? "page" : undefined}
          // Clavier uniquement (detail 0) : souris et doigt sont geres plus haut
          onClick={(event) => {
            if (event.detail === 0) choose(i);
          }}
        >
          <Icon size={26} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
