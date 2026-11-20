import { useEffect } from "react";
import "./liquid-glass-apple.js";
import "./coupons-liquid-glass.css";

// Meme moteur, memes options que useHomeLiquidGlassApple.js (bulles V3).
export default function useCouponsLiquidGlassApple() {
  useEffect(() => {
    const engine = window.LiquidGlassApple;
    if (!engine) return;
    let button = null;
    let instance = null;
    const options = {
      radius: 19,
      surface: 'convex_squircle',
      glassThickness: 92,
      bezelWidth: 14,
      refractiveIndex: 3.0,
      scaleRatio: 1.6,
      blur: 0.0,
      specularOpacity: 0.3,
      specularSaturation: 2.0,
      tintColor: '#ffffff',
      tintOpacity: 0.0,
      innerShadowBlur: 0,
      innerShadowSpread: 0,
      outerShadowBlur: 8,
      fallbackBlur: 0,
      interactive: true,
      pressScale: 1.085,
      stretch: 0.00012,
      maxStretch: 0.12,
      stiffness: 260,
      damping: 12,
    };
    const sync = () => {
      const current = document.querySelector('.profile .profile__btn.maf-lga-coupons');
      if (current === button) return;
      if (instance) { instance.destroy(); instance = null; }
      button = current;
      if (button) instance = engine.apply(button, options);
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      if (instance) instance.destroy();
    };
  }, []);
}
