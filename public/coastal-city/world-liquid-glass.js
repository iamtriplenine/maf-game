// MAF WORLD : moteur Liquid Glass Apple identique aux bulles de messages.
import LiquidGlassApple from './liquid-glass-apple.js';

const transparent = {
  surface: 'convex_squircle', scaleRatio: 1, glassThickness: 30,
  refractiveIndex: 1.55, blur: 0, bezelWidth: 12,
  specularOpacity: 0.30, specularSaturation: 3,
  tintColor: '#ffffff', tintOpacity: 0.012,
  innerShadowColor: 'rgba(255,255,255,.23)', innerShadowBlur: 12,
  innerShadowSpread: -5, outerShadowBlur: 14,
  fallbackBlur: 4, maxOffsetRatio: 2,
  interactive: true, pressScale: 1.045, stretch: 0.00007,
  maxStretch: 0.065, stiffness: 260, damping: 14
};

function mountGlass() {
  const options = [
    ['#statusBar', { ...transparent, radius: 18, bezelWidth: 13, interactive: false }],
    ['#btnWorldTools', { ...transparent, radius: 999, surface: 'convex_circle' }],
    ['#btnMenu', { ...transparent, radius: 999, surface: 'convex_circle' }],
    ['#btnWorldChat', { ...transparent, radius: 999, surface: 'convex_circle' }],
    ['#worldComms', { ...transparent, radius: 16, bezelWidth: 12, interactive: false }],
    ['#btnWorldMic', { ...transparent, radius: 13, bezelWidth: 10, pressScale: 1.03, stretch: 0.00005, maxStretch: 0.045 }],
    ['#worldChatPanel', { ...transparent, radius: 18, glassThickness: 28, refractiveIndex: 1.55, bezelWidth: 13, specularOpacity: 0.33, tintOpacity: 0.009, fallbackBlur: 5, interactive: false }],
  ];
  for (const [selector, config] of options) {
    const element = document.querySelector(selector);
    if (!element) continue;
    try { LiquidGlassApple.apply(element, config); }
    catch (error) { console.warn('MAF World Liquid Glass Apple', selector, error); }
  }
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountGlass, {once:true});
else mountGlass();
