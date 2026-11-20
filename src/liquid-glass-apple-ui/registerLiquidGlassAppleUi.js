import "./liquid-glass-apple.js";
import "./maf-liquid-glass-apple-ui.css";

const LiquidGlass = typeof window !== "undefined" ? window.LiquidGlassApple : null;
const SELECTOR = ".maf-liquid-apple-ui";
const instances = new WeakMap();

function optionsFor(el) {
  if (el.classList.contains("maf-liquid-apple-ui--pill")) {
    return {
      radius: 28,
      surface: "convex_squircle",
      glassThickness: 74,
      bezelWidth: 28,
      refractiveIndex: 2.8,
      scaleRatio: 1.28,
      blur: 0.08,
      specularOpacity: 0.24,
      specularSaturation: 2.5,
      innerShadowColor: "#ffffff",
      innerShadowBlur: 10,
      innerShadowSpread: -4,
      tintColor: "#ffffff",
      tintOpacity: 0.008,
      outerShadowBlur: 14,
      interactive: true,
      pressScale: 1.04,
      stretch: 0.00008,
      maxStretch: 0.08,
      stiffness: 250,
      damping: 15,
      fallbackBlur: 10,
    };
  }
  if (el.classList.contains("maf-liquid-apple-ui--composer")) {
    return {
      radius: 22,
      surface: "convex_squircle",
      glassThickness: 68,
      bezelWidth: 22,
      refractiveIndex: 2.75,
      scaleRatio: 1.25,
      blur: 0.06,
      specularOpacity: 0.20,
      specularSaturation: 2.2,
      innerShadowColor: "#ffffff",
      innerShadowBlur: 8,
      innerShadowSpread: -4,
      tintColor: "#ffffff",
      tintOpacity: 0.006,
      outerShadowBlur: 12,
      interactive: true,
      pressScale: 1.025,
      stretch: 0.00005,
      maxStretch: 0.05,
      stiffness: 270,
      damping: 16,
      fallbackBlur: 10,
    };
  }
  return {
    radius: 999,
    surface: "convex_circle",
    glassThickness: 72,
    bezelWidth: 16,
    refractiveIndex: 2.9,
    scaleRatio: 1.32,
    blur: 0.04,
    specularOpacity: 0.22,
    specularSaturation: 2.3,
    innerShadowColor: "#ffffff",
    innerShadowBlur: 8,
    innerShadowSpread: -3,
    tintColor: "#ffffff",
    tintOpacity: 0.004,
    outerShadowBlur: 10,
    interactive: true,
    pressScale: 1.08,
    stretch: 0.0001,
    maxStretch: 0.11,
    stiffness: 260,
    damping: 14,
    fallbackBlur: 9,
  };
}

function mount(node) {
  if (!(node instanceof Element) || instances.has(node) || !LiquidGlass?.apply) return;
  try {
    const instance = LiquidGlass.apply(node, optionsFor(node));
    instances.set(node, instance);
  } catch (error) {
    console.warn("Liquid Glass Apple UI: application impossible", error);
  }
}

function unmount(node) {
  if (!(node instanceof Element)) return;
  const instance = instances.get(node);
  if (instance?.destroy) {
    try { instance.destroy(); } catch {}
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
      mutation.addedNodes.forEach((node) => scan(node));
      mutation.removedNodes.forEach((node) => sweep(node));
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
