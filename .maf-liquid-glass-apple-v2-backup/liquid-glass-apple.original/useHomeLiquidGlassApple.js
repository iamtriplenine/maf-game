import { useEffect } from "react";
import "./liquid-glass-apple.js";
import "./liquid-glass-apple.css";

/** Activer Liquid Glass Apple exclusivement sur les bulles du feed d'accueil. */
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
        // Bulle vocale : l'action play/pause reste intacte.
        const instance = engine.apply(el, {
          radius: 19,
          surface: 'convex_squircle',
          glassThickness: 80,
          bezelWidth: 16,
          refractiveIndex: 2.6,
          scaleRatio: 1.0,
          blur: 0.3,
          specularOpacity: 0.56,
          specularSaturation: 3.2,
          tintColor: '#ffffff',
          tintOpacity: 0.06,
          pressScale: 1.035,
          stretch: 0.00007,
          maxStretch: 0.065,
          interactive: true,
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
