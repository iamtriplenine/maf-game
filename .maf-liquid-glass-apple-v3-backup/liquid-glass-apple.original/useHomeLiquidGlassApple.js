import { useEffect } from "react";
import "./liquid-glass-apple.js";
import "./liquid-glass-apple.css";

/** Test uniquement sur les bulles des messages de l'accueil (ChatFeed). */
export function useHomeLiquidGlassApple(feedRef) {
  useEffect(() => {
    const root = feedRef.current;
    const engine = window.LiquidGlassApple;
    if (!root || !engine) return;
    const instances = new Map();
    const sync = () => {
      const bubbles = new Set(root.querySelectorAll('.chat-msg__bubble'));
      for (const [el, instance] of instances) {
        if (!bubbles.has(el)) {
          instance.destroy();
          instances.delete(el);
        }
      }
      for (const el of bubbles) {
        if (instances.has(el)) continue;
        const instance = engine.apply(el, {
          radius: 19,
          surface: 'convex_squircle',
          glassThickness: 92,
          bezelWidth: 18,
          refractiveIndex: 3.0,
          scaleRatio: 1.4,
          blur: 0.0,
          specularOpacity: 0.34,
          specularSaturation: 2.0,
          tintColor: '#ffffff',
          tintOpacity: 0.0,
          innerShadowBlur: 0,
          innerShadowSpread: 0,
          outerShadowBlur: 8,
          fallbackBlur: 1.3,
          interactive: true,
          pressScale: 1.085,
          stretch: 0.00012,
          maxStretch: 0.12,
          stiffness: 260,
          damping: 12,
        });
        instances.set(el, instance);
      }
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      for (const instance of instances.values()) instance.destroy();
      instances.clear();
    };
  }, [feedRef]);
}
