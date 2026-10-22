import { useLayoutEffect, useRef } from "react";

// Garde une liste scrollable collee en bas quand de nouveaux messages arrivent,
// sauf si la personne est remontee pour relire (alors on ne bouge pas).
const NEAR_BOTTOM = 70; // px

export function useStickBottom(ref, dependency) {
  const stick = useRef(true);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dependency]);

  return () => {
    const node = ref.current;
    stick.current = node.scrollHeight - node.scrollTop - node.clientHeight < NEAR_BOTTOM;
  };
}
