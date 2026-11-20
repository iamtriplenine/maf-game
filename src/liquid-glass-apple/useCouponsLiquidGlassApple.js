import { useEffect } from "react";
import LiquidGlassApple from "./liquid-glass-apple.js";
import "./coupons-liquid-glass.css";

// Bouton Coupons : 60 px de haut, coins de 34 px -> bord plus large que les bulles.
const COUPONS_GLASS = {
  radius: 34,
  surface: "convex_squircle",
  glassThickness: 36,
  bezelWidth: 18,
  refractiveIndex: 1.6,
  scaleRatio: 1,
  blur: 0,
  specularOpacity: 0.22,
  specularSaturation: 3,
  tintColor: "#ffffff",
  tintOpacity: 0,
  innerShadowColor: "rgba(255, 255, 255, .22)",
  innerShadowBlur: 14,
  innerShadowSpread: -7,
  outerShadowBlur: 16,
  fallbackBlur: 3,
  interactive: true,
  pressScale: 1.05,
  stretch: 0.0001,
  maxStretch: 0.1,
  stiffness: 260,
  damping: 13,
};

export default function useCouponsLiquidGlassApple() {
  useEffect(() => {
    const engine = LiquidGlassApple;
    if (!engine) return;
    let button = null;
    let instance = null;
    const sync = () => {
      const current = document.querySelector(".profile .profile__btn.maf-lga-coupons");
      if (current === button) return;
      if (instance) { instance.destroy(); instance = null; }
      button = current;
      if (button) instance = engine.apply(button, COUPONS_GLASS);
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
