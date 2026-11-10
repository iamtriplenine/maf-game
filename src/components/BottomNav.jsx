import { useRef, useState } from "react";
import { IconGamepad, IconGlobe, IconUser } from "./Icons";

// Barre de navigation du bas : Game (gauche) | World (milieu) | Profil (droite).
// On peut APPUYER sur un bouton, ou GLISSER le doigt / la souris d'un bouton a l'autre.
const ITEMS = [
  { id: "game", label: "Game", Icon: IconGamepad },
  { id: "world", label: "World", Icon: IconGlobe },
  { id: "profile", label: "Profil", Icon: IconUser },
];
const COUNT = ITEMS.length;
const PAD = 5; // doit rester egal a --nav-pad dans nav.css
const DRAG_START = 5; // pixels avant de considerer que c'est un glissement

const clamp = (n) => Math.min(COUNT - 1, Math.max(0, n));

export default function BottomNav({ value, onChange }) {
  const rootRef = useRef(null);
  const gesture = useRef(null);
  const [dragPos, setDragPos] = useState(null); // 0 (Game) .. 2 (Profil) pendant le glissement

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
      track: (rect.width - PAD * 2) / COUNT, // largeur d'un bouton
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
      choose(Math.round(g.pos)); // on lache : on va vers le bouton le plus proche
    } else {
      // simple appui : on trouve le bouton touche
      const x = event.clientX - g.rect.left - PAD;
      choose(clamp(Math.floor(x / g.track)));
    }
  };

  const onKeyDown = (event) => {
    if (event.key === "ArrowLeft") choose(clamp(index - 1));
    if (event.key === "ArrowRight") choose(clamp(index + 1));
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
          <Icon size={24} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
