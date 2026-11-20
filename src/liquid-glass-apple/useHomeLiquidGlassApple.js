import { useEffect } from "react";
import LiquidGlassApple from "./liquid-glass-apple.js";
import "./liquid-glass-apple.css";

// Reglages des bulles : bord fin (12 px) et deformation proportionnee a leur petite taille.
// L'ancienne version poussait la deformation a ~130 px sur une bulle de 33 px : bruit illisible.
export const BUBBLE_GLASS = {
  radius: 19,
  surface: "convex_squircle",
  glassThickness: 30,
  bezelWidth: 12,
  refractiveIndex: 1.5,
  scaleRatio: 1,
  blur: 0,
  specularOpacity: 0.22,
  specularSaturation: 3,
  tintColor: "#ffffff",
  tintOpacity: 0,
  innerShadowColor: "rgba(255, 255, 255, .22)",
  innerShadowBlur: 10,
  innerShadowSpread: -6,
  outerShadowBlur: 10,
  fallbackBlur: 12,
  interactive: true,
  pressScale: 1.05,
  stretch: 0.0001,
  maxStretch: 0.1,
  stiffness: 260,
  damping: 14,
};

const FADE = 0.28; // meme zone de fondu que l'ancien masque CSS (28 % du haut)

/** Liquid Glass sur les bulles des messages de l'accueil (ChatFeed). */
export function useHomeLiquidGlassApple(feedRef) {
  useEffect(() => {
    const root = feedRef.current;
    const engine = LiquidGlassApple;
    if (!root || !engine) return;
    const instances = new Map();

    // Un masque CSS sur la zone du chat empeche la refraction de « voir » le decor :
    // en Chrome on le remplace par un fondu bulle par bulle.
    const refraction = engine.supportsRefraction;
    if (refraction) root.classList.add("lga-feed");
    let raf = 0;
    const fade = () => {
      raf = 0;
      if (!refraction) return;
      const zone = root.clientHeight * FADE;
      const top = root.getBoundingClientRect().top;
      for (const msg of root.querySelectorAll(".chat-msg")) {
        const y = msg.getBoundingClientRect().top - top;
        const o = zone > 0 ? Math.max(0, Math.min(1, y / zone)) : 1;
        // Opacite sur la bulle et le pseudo (pas sur .chat-msg : son animation d'entree l'ecraserait
        // et une opacite sur un parent couperait la refraction).
        const value = o >= 0.995 ? "" : String(Math.round(o * 100) / 100);
        for (const child of msg.children) child.style.opacity = value;
      }
    };
    const scheduleFade = () => { if (!raf) raf = requestAnimationFrame(fade); };

    const sync = () => {
      const bubbles = new Set(root.querySelectorAll(".chat-msg__bubble"));
      for (const [el, instance] of instances) {
        if (!bubbles.has(el)) {
          instance.destroy();
          instances.delete(el);
        }
      }
      for (const el of bubbles) {
        if (!instances.has(el)) instances.set(el, engine.apply(el, BUBBLE_GLASS));
      }
      scheduleFade();
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { childList: true, subtree: true });
    root.addEventListener("scroll", scheduleFade, { passive: true });
    window.addEventListener("resize", scheduleFade);
    return () => {
      observer.disconnect();
      root.removeEventListener("scroll", scheduleFade);
      window.removeEventListener("resize", scheduleFade);
      cancelAnimationFrame(raf);
      root.classList.remove("lga-feed");
      for (const child of root.querySelectorAll(".chat-msg > *")) child.style.opacity = "";
      for (const instance of instances.values()) instance.destroy();
      instances.clear();
    };
  }, [feedRef]);
}
