import LiquidGlassApple from "./liquid-glass-apple.js";
import "./maf-liquid-glass-apple-ui.css";

// Ajouter la classe « maf-liquid-apple-ui » a un element suffit pour lui donner le Liquid Glass Apple.
//   --composer : pilule de saisie du chat     --pill : bouton pilule     (defaut) : bouton rond
const SELECTOR = ".maf-liquid-apple-ui";
const instances = new WeakMap();

const BASE = {
  surface: "convex_squircle",
  scaleRatio: 1,
  specularSaturation: 3,
  tintColor: "#ffffff",
  innerShadowColor: "#ffffff",
  interactive: true,
  stretch: 0.0001,
  stiffness: 260,
  damping: 14,
  fallbackBlur: 12,
};

function optionsFor(el) {
  if (el.classList.contains("maf-liquid-apple-ui--composer")) {
    return { ...BASE, radius: 22, glassThickness: 30, bezelWidth: 14, refractiveIndex: 1.5, blur: 0.2,
      specularOpacity: 0.45, tintOpacity: 0.05, innerShadowBlur: 10, innerShadowSpread: -6,
      outerShadowBlur: 12, pressScale: 1.02, maxStretch: 0.05 };
  }
  if (el.classList.contains("maf-liquid-apple-ui--pill")) {
    return { ...BASE, radius: 30, glassThickness: 34, bezelWidth: 16, refractiveIndex: 1.6, blur: 0.25,
      specularOpacity: 0.5, tintOpacity: 0.05, innerShadowBlur: 12, innerShadowSpread: -6,
      outerShadowBlur: 14, pressScale: 1.05, maxStretch: 0.1 };
  }
  return { ...BASE, radius: 999, surface: "convex_circle", glassThickness: 26, bezelWidth: 10,
    refractiveIndex: 1.5, blur: 0.2, specularOpacity: 0.5, tintOpacity: 0.06, innerShadowBlur: 8,
    innerShadowSpread: -4, outerShadowBlur: 8, pressScale: 1.1, maxStretch: 0.12 };
}

// Un verre DANS un autre verre ne voit que le verre parent (regle des navigateurs) :
// les boutons micro/envoi places dans la pilule de saisie restent en verre simple (CSS).
function nested(node) {
  return !!node.parentElement?.closest(SELECTOR);
}

function mount(node) {
  if (!(node instanceof Element) || instances.has(node) || !LiquidGlassApple?.apply) return;
  if (nested(node)) { node.classList.add("maf-liquid-apple-ui--inner"); return; }
  try {
    instances.set(node, LiquidGlassApple.apply(node, optionsFor(node)));
  } catch (error) {
    console.warn("Liquid Glass Apple UI: application impossible", error);
  }
}

function unmount(node) {
  if (!(node instanceof Element)) return;
  const instance = instances.get(node);
  if (instance?.destroy) {
    try { instance.destroy(); } catch { /* deja retire */ }
  }
  instances.delete(node);
}

function scan(root) {
  if (!(root instanceof Element) && root !== document) return;
  if (root instanceof Element && root.matches(SELECTOR)) mount(root);
  root.querySelectorAll?.(SELECTOR).forEach(mount);
}

function sweep(root) {
  if (!(root instanceof Element)) return;
  if (root.matches(SELECTOR)) unmount(root);
  root.querySelectorAll?.(SELECTOR).forEach(unmount);
}

function boot() {
  scan(document);
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.removedNodes.forEach((node) => sweep(node));
      mutation.addedNodes.forEach((node) => scan(node));
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

if (typeof window !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
}
