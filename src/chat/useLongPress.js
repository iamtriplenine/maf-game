import { useRef, useState } from "react";

// Appui court = onClick, appui long (maintenu) = onLong.
// `pressing` passe a vrai pendant l'appui, pour l'animation du bouton.
export function useLongPress({ onClick, onLong, ms = 550 }) {
  const timer = useRef(null);
  const fired = useRef(false);
  const origin = useRef(null);
  const [pressing, setPressing] = useState(false);

  const cancel = () => {
    clearTimeout(timer.current);
    timer.current = null;
    setPressing(false);
  };

  return {
    pressing,
    handlers: {
      onPointerDown: (event) => {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        fired.current = false;
        origin.current = { x: event.clientX, y: event.clientY };
        setPressing(true);
        timer.current = setTimeout(() => {
          fired.current = true;
          cancel();
          try {
            navigator.vibrate?.(18);
          } catch {
            /* pas grave */
          }
          onLong();
        }, ms);
      },
      // le doigt a bouge : c'est un defilement, pas un appui long
      onPointerMove: (event) => {
        const o = origin.current;
        if (timer.current && o && Math.hypot(event.clientX - o.x, event.clientY - o.y) > 12) cancel();
      },
      onPointerUp: cancel,
      onPointerLeave: cancel,
      onPointerCancel: cancel,
      onContextMenu: (event) => event.preventDefault(), // pas de menu du navigateur sur appui long
      onClick: () => {
        if (fired.current) {
          fired.current = false; // l'appui long a deja agi : on ignore le "clic" qui suit
          return;
        }
        onClick();
      },
    },
  };
}
