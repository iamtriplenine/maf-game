/*!
 * liquid-glass-apple.js — effet Liquid Glass autonome (réfraction réelle de l'arrière-plan)
 * Basé sur « Liquid Glass » © 2026 Archis Vaze, licence MIT.
 * (La licence MIT impose de conserver cette ligne de copyright.)
 *
 * Version MAF : physique d'origine conservee, espace de noms « lga- » et
 * global window.LiquidGlassApple (ne touche pas au Liquid Glass CSS existant).
 *   import LiquidGlassApple from './liquid-glass-apple.js';
 *   LiquidGlassApple.apply(element, { radius: 19, bezelWidth: 12 });
 *
 * Tout ce qui se trouve DERRIÈRE l'élément (texte, images, listes qui défilent…)
 * est déformé comme à travers une goutte d'eau / une lentille.
 * Réfraction réelle : Chrome, Edge, Brave, Opera, Chrome Android.
 * Safari / iPhone / Firefox : repli automatique sur un verre flouté (pas de déformation).
 */
const LiquidGlassApple = (function (global) {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Réglages par défaut (identiques à la démo d'origine)               */
  /* ------------------------------------------------------------------ */
  const DEFAULTS = {
    radius: 60,              // arrondi des coins (px)
    surface: 'convex_squircle', // profil du bord : convex_squircle | convex_circle | concave | lip
    glassThickness: 80,      // épaisseur du verre
    bezelWidth: 60,          // largeur du bord bombé (zone où la lumière est déviée)
    refractiveIndex: 3.0,    // indice de réfraction (eau ≈ 1.33, verre ≈ 1.5 ; plus haut = plus déformé)
    scaleRatio: 1.0,         // intensité globale de la déformation
    blur: 0.3,               // flou de ce qui est derrière
    specularOpacity: 0.5,    // intensité du reflet sur le bord
    specularSaturation: 4,   // saturation des couleurs dans le reflet
    specularAngle: Math.PI / 3, // direction de la lumière
    innerShadowColor: '#ffffff',
    innerShadowBlur: 20,
    innerShadowSpread: -5,
    tintColor: '#ffffff',
    tintOpacity: 0.06,       // 0 → 1
    outerShadowBlur: 24,
    // Ajouts (absents de l'original)
    interactive: true,       // déformation « liquide » au toucher / glisser
    pressScale: 1.06,        // gonflement à l'appui
    stretch: 0.0001,         // étirement en fonction de la vitesse du doigt
    maxStretch: 0.12,        // étirement maximal
    stiffness: 260,          // ressort : raideur
    damping: 14,             // ressort : amortissement (plus bas = plus de rebond)
    fallbackBlur: 14,        // flou utilisé quand la réfraction n'est pas supportée
    maxOffsetRatio: 2,       // MAF : décalage max = 2 × largeur du bord (évite le « bruit » sur les petits boutons)
  };

  /* ------------------------------------------------------------------ */
  /* Physique de la réfraction                                          */
  /* ------------------------------------------------------------------ */
  const SURFACE_FNS = {
    convex_squircle: (x) => Math.pow(1 - Math.pow(1 - x, 4), 0.25),
    convex_circle: (x) => Math.sqrt(1 - (1 - x) * (1 - x)),
    concave: (x) => 1 - Math.sqrt(1 - (1 - x) * (1 - x)),
    lip: (x) => {
      const convex = Math.pow(1 - Math.pow(1 - Math.min(x * 2, 1), 4), 0.25);
      const concave = 1 - Math.sqrt(1 - (1 - x) * (1 - x)) + 0.1;
      const t = 6 * x ** 5 - 15 * x ** 4 + 10 * x ** 3;
      return convex * (1 - t) + concave * t;
    },
  };

  // Loi de Snell-Descartes appliquée au profil du bord, échantillonnée.
  function refractionProfile(thickness, bezel, heightFn, ior, samples = 128) {
    const eta = 1 / ior;
    const refract = (nx, ny) => {
      const k = 1 - eta * eta * (1 - ny * ny);
      if (k < 0) return null; // réflexion totale
      const sq = Math.sqrt(k);
      return [-(eta * ny + sq) * nx, eta - (eta * ny + sq) * ny];
    };
    const profile = new Float64Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = i / samples;
      const y = heightFn(x);
      const dx = x < 1 ? 0.0001 : -0.0001;
      const deriv = (heightFn(x + dx) - y) / dx;
      const mag = Math.sqrt(deriv * deriv + 1);
      const ref = refract(-deriv / mag, -1 / mag);
      profile[i] = ref ? ref[0] * ((y * bezel + thickness) / ref[1]) : 0;
    }
    return profile;
  }

  // Parcourt uniquement les pixels du bord (le centre est plat → aucun calcul).
  function forEachBezelPixel(w, h, r, bezel, cb) {
    const rSq = r * r, r1Sq = (r + 1) ** 2, rBSq = Math.max(r - bezel, 0) ** 2;
    const wB = w - r * 2, hB = h - r * 2, sqR = Math.sqrt(rSq), sqR1 = Math.sqrt(r1Sq);
    const band = Math.ceil(r) + 1;
    for (let y1 = 0; y1 < h; y1++) {
      const inBandY = y1 < band || y1 >= h - band;
      for (let x1 = 0; x1 < w; x1++) {
        if (!inBandY && x1 >= band && x1 < w - band) { x1 = w - band - 1; continue; }
        const x = x1 < r ? x1 - r : x1 >= w - r ? x1 - r - wB : 0;
        const y = y1 < r ? y1 - r : y1 >= h - r ? y1 - r - hB : 0;
        const dSq = x * x + y * y;
        if (dSq > r1Sq || dSq < rBSq) continue;
        const dist = Math.sqrt(dSq);
        const op = dSq < rSq ? 1 : 1 - (dist - sqR) / (sqR1 - sqR);
        if (op <= 0 || dist === 0) continue;
        cb((y1 * w + x1) * 4, x / dist, y / dist, r - dist, op);
      }
    }
  }

  function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    return { c, ctx, img: ctx.createImageData(w, h) };
  }

  function displacementMap(w, h, r, bezel, profile, maxDisp) {
    const { c, ctx, img } = makeCanvas(w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) { d[i] = 128; d[i + 1] = 128; d[i + 2] = 0; d[i + 3] = 255; }
    const S = profile.length;
    forEachBezelPixel(w, h, r, bezel, (idx, cos, sin, fromSide, op) => {
      const disp = profile[Math.min(((fromSide / bezel) * S) | 0, S - 1)] || 0;
      d[idx] = (128 + ((-cos * disp) / maxDisp) * 127 * op + 0.5) | 0;
      d[idx + 1] = (128 + ((-sin * disp) / maxDisp) * 127 * op + 0.5) | 0;
    });
    ctx.putImageData(img, 0, 0);
    return c.toDataURL();
  }

  function specularMap(w, h, r, bezel, angle) {
    const { c, ctx, img } = makeCanvas(w, h);
    const d = img.data;
    const sv = [Math.cos(angle), Math.sin(angle)];
    forEachBezelPixel(w, h, r, bezel, (idx, cos, sin, fromSide, op) => {
      const dot = Math.abs(cos * sv[0] - sin * sv[1]);
      const edge = Math.sqrt(Math.max(0, 1 - (1 - fromSide) ** 2));
      const coeff = dot * edge;
      const col = (255 * coeff) | 0;
      d[idx] = d[idx + 1] = d[idx + 2] = col;
      d[idx + 3] = (col * coeff * op) | 0;
    });
    ctx.putImageData(img, 0, 0);
    return c.toDataURL();
  }

  /* ------------------------------------------------------------------ */
  /* Support navigateur                                                 */
  /* ------------------------------------------------------------------ */
  // backdrop-filter: url(#svg) n'est rendu que par Chromium (pas Safari/WebKit, pas Firefox).
  const SUPPORTS_REFRACTION = (() => {
    if (typeof navigator === 'undefined' || typeof ResizeObserver === 'undefined') return false;
    const brands = navigator.userAgentData && navigator.userAgentData.brands;
    if (brands) return brands.some((b) => /Chromium/.test(b.brand));
    return /(Chrome|Chromium)\//.test(navigator.userAgent) && !/Firefox\//.test(navigator.userAgent);
  })();

  /* ------------------------------------------------------------------ */
  /* Styles et conteneur SVG partagés (injectés une seule fois)         */
  /* ------------------------------------------------------------------ */
  let svgDefs = null;
  function ensureShared() {
    if (svgDefs) return;
    const style = document.createElement('style');
    style.setAttribute('data-maf', 'liquid-glass-apple');
    style.textContent = `
:where(.lga-glass){position:relative;isolation:isolate;border-radius:var(--lga-radius);transform-origin:center}
.lga-glass.lga-glass{
  backdrop-filter:var(--lga-filter)!important;-webkit-backdrop-filter:var(--lga-filter)!important;
  background-image:none!important;background-color:rgba(var(--lga-tint),var(--lga-tint-opacity))!important;
  box-shadow:inset 0 0 var(--lga-inner-blur) var(--lga-inner-spread) var(--lga-inner-color),
    inset 0 .5px 0 rgba(255,255,255,.12),0 4px var(--lga-outer-blur) rgba(0,0,0,.14)!important}
.lga-glass.lga-interactive{will-change:transform}
:where(.lga-glass.lga-interactive){touch-action:manipulation;user-select:none;-webkit-user-select:none}`;
    document.head.appendChild(style);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('color-interpolation-filters', 'sRGB');
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
    svgDefs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    svg.appendChild(svgDefs);
    document.body.appendChild(svg);
  }

  const hexToRgb = (hex) => {
    const n = hex.replace('#', '');
    const f = n.length === 3 ? n.split('').map((c) => c + c).join('') : n;
    return `${parseInt(f.slice(0, 2), 16)}, ${parseInt(f.slice(2, 4), 16)}, ${parseInt(f.slice(4, 6), 16)}`;
  };

  /* ------------------------------------------------------------------ */
  /* Instance                                                           */
  /* ------------------------------------------------------------------ */
  let uid = 0;

  class Glass {
    constructor(el, options) {
      ensureShared();
      this.el = el;
      this.o = Object.assign({}, DEFAULTS, options);
      this.id = `lga-filter-${++uid}`;
      this.filterEl = null;
      this.lastSize = '';
      el.classList.add('lga-glass');
      this._applyCss();
      // MAF : React réécrit className à chaque rendu (ex. « is-dragging ») et effaçait nos classes.
      this.mo = new MutationObserver(() => {
        if (!el.classList.contains('lga-glass')) el.classList.add('lga-glass');
        if (this.o.interactive && !el.classList.contains('lga-interactive')) el.classList.add('lga-interactive');
      });
      this.mo.observe(el, { attributes: true, attributeFilter: ['class'] });

      if (SUPPORTS_REFRACTION) {
        this.ro = new ResizeObserver(() => this._scheduleBuild());
        // MAF : premier calcul immédiat, puis recalcul seulement quand la taille est stable.
        this.ro.observe(el);
        this._build();
      } else {
        // iPhone / Safari / Firefox : pas de réfraction possible → verre presque net, comme en Chrome.
        el.style.setProperty('--lga-filter', `blur(${this.o.fallbackBlur}px) saturate(1.15)`);
      }
      if (this.o.interactive) this._initJelly();
    }

    /** Modifier des réglages à chaud : glass.update({ refractiveIndex: 1.8 }) */
    update(options) {
      Object.assign(this.o, options);
      this._applyCss();
      this.lastSize = '';
      if (SUPPORTS_REFRACTION) this._build();
    }

    /** Retirer l'effet */
    destroy() {
      this.mo && this.mo.disconnect();
      this.ro && this.ro.disconnect();
      clearTimeout(this._timer);
      this.filterEl && this.filterEl.remove();
      this._jellyOff && this._jellyOff();
      this.el.classList.remove('lga-glass', 'lga-interactive');
      ['--lga-radius', '--lga-outer-blur', '--lga-inner-blur', '--lga-inner-spread', '--lga-inner-color',
        '--lga-tint', '--lga-tint-opacity', '--lga-filter'].forEach((p) => this.el.style.removeProperty(p));
      this.el.style.transform = '';
    }

    _applyCss() {
      const s = this.el.style, o = this.o;
      s.setProperty('--lga-radius', o.radius + 'px');
      s.setProperty('--lga-outer-blur', o.outerShadowBlur + 'px');
      s.setProperty('--lga-inner-blur', o.innerShadowBlur + 'px');
      s.setProperty('--lga-inner-spread', o.innerShadowSpread + 'px');
      s.setProperty('--lga-inner-color', o.innerShadowColor);
      s.setProperty('--lga-tint', hexToRgb(o.tintColor));
      s.setProperty('--lga-tint-opacity', String(o.tintOpacity));
    }

    _scheduleBuild() {
      // MAF : attend la fin d'une animation de taille (bulle qui apparaît, champ qui s'élargit)
      // au lieu de recalculer les cartes à chaque image.
      clearTimeout(this._timer);
      this._timer = setTimeout(() => this._build(), 120);
    }

    _build() {
      // offsetWidth/Height ignorent le transform → la déformation au toucher ne relance pas le calcul.
      const w = this.el.offsetWidth, h = this.el.offsetHeight;
      if (w < 2 || h < 2) return;
      const o = this.o;
      const key = `${w}x${h}`;
      if (key === this.lastSize) return;
      this.lastSize = key;

      const radius = Math.floor(Math.min(o.radius, w / 2, h / 2));
      const bezel = Math.max(1, Math.min(o.bezelWidth, radius - 1, Math.min(w, h) / 2 - 1));
      const profile = refractionProfile(o.glassThickness, bezel, SURFACE_FNS[o.surface] || SURFACE_FNS.convex_squircle, o.refractiveIndex);
      let maxDisp = 0;
      for (let i = 0; i < profile.length; i++) maxDisp = Math.max(maxDisp, Math.abs(profile[i]));
      maxDisp = maxDisp || 1;

      const disp = displacementMap(w, h, radius, bezel, profile, maxDisp);
      const spec = specularMap(w, h, radius, bezel * 2.5, o.specularAngle);

      const scale = Math.min(maxDisp * o.scaleRatio, bezel * 2 * o.maxOffsetRatio);
      const markup = `<filter id="${this.id}" x="0%" y="0%" width="100%" height="100%">
  <feGaussianBlur in="SourceGraphic" stdDeviation="${o.blur}" result="blurred_source"/>
  <feImage href="${disp}" x="0" y="0" width="${w}" height="${h}" result="disp_map"/>
  <feDisplacementMap in="blurred_source" in2="disp_map" scale="${scale}" xChannelSelector="R" yChannelSelector="G" result="displaced"/>
  <feColorMatrix in="displaced" type="saturate" values="${o.specularSaturation}" result="displaced_sat"/>
  <feImage href="${spec}" x="0" y="0" width="${w}" height="${h}" result="spec_layer"/>
  <feComposite in="displaced_sat" in2="spec_layer" operator="in" result="spec_masked"/>
  <feComponentTransfer in="spec_layer" result="spec_faded"><feFuncA type="linear" slope="${o.specularOpacity}"/></feComponentTransfer>
  <feBlend in="spec_masked" in2="displaced" mode="normal" result="with_sat"/>
  <feBlend in="spec_faded" in2="with_sat" mode="normal"/>
</filter>`;
      const tmp = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      tmp.innerHTML = markup;
      const f = tmp.firstElementChild;
      if (this.filterEl) this.filterEl.replaceWith(f); else svgDefs.appendChild(f);
      this.filterEl = f;
      this.el.style.setProperty('--lga-filter', `url(#${this.id})`);
    }

    /* -------------------------------------------------------------- */
    /* Ajout : déformation « liquide » (gonfle à l'appui, s'étire     */
    /* dans le sens du mouvement, rebondit au relâchement)            */
    /* -------------------------------------------------------------- */
    _initJelly() {
      const el = this.el, o = this.o;
      el.classList.add('lga-interactive');
      // état du ressort : échelle, étirement, angle
      const st = { s: 1, vs: 0, ts: 1, k: 0, vk: 0, tk: 0, a: 0 };
      let pressed = false, lastX = 0, lastY = 0, lastT = 0, running = false, prev = 0;

      const step = (t) => {
        const dt = Math.min(0.032, Math.max(0.001, (t - prev) / 1000));
        prev = t;
        // ressort amorti (semi-implicite)
        st.vs += (o.stiffness * (st.ts - st.s) - o.damping * st.vs) * dt; st.s += st.vs * dt;
        st.vk += (o.stiffness * (st.tk - st.k) - o.damping * st.vk) * dt; st.k += st.vk * dt;
        if (!pressed) st.tk *= 0.8; // l'étirement retombe quand on ne bouge plus
        const sx = st.s * (1 + st.k), sy = st.s * (1 - st.k * 0.6);
        el.style.transform = `rotate(${st.a}rad) scale(${sx}, ${sy}) rotate(${-st.a}rad)`;
        const idle = !pressed && Math.abs(st.s - 1) < 1e-3 && Math.abs(st.vs) < 1e-3 && Math.abs(st.k) < 1e-3 && Math.abs(st.vk) < 1e-3;
        if (idle) { el.style.transform = ''; running = false; return; }
        requestAnimationFrame(step);
      };
      const kick = () => { if (!running) { running = true; prev = performance.now(); requestAnimationFrame(step); } };

      const down = (e) => {
        pressed = true; st.ts = o.pressScale;
        lastX = e.clientX; lastY = e.clientY; lastT = performance.now();
        kick();
      };
      const move = (e) => {
        if (!pressed) return;
        const now = performance.now(), dt = Math.max(1, now - lastT);
        const dx = e.clientX - lastX, dy = e.clientY - lastY;
        const speed = Math.hypot(dx, dy) / dt * 1000; // px/s
        if (speed > 1) {
          st.a = Math.atan2(dy, dx);
          st.tk = Math.min(o.maxStretch, speed * o.stretch);
        }
        lastX = e.clientX; lastY = e.clientY; lastT = now;
        kick();
      };
      const up = () => { if (!pressed) return; pressed = false; st.ts = 1; st.tk = 0; kick(); };

      el.addEventListener('pointerdown', down);
      window.addEventListener('pointermove', move, { passive: true });
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
      this._jellyOff = () => {
        el.removeEventListener('pointerdown', down);
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
      };
    }
  }

  const LiquidGlass = {
    /** Applique l'effet à un élément (ou une liste) et renvoie l'instance (ou un tableau). */
    apply(target, options) {
      if (typeof target === 'string') target = document.querySelectorAll(target);
      if (target instanceof Element) return new Glass(target, options);
      return Array.from(target, (el) => new Glass(el, options));
    },
    supportsRefraction: SUPPORTS_REFRACTION,
    defaults: DEFAULTS,
  };

  if (global) global.LiquidGlassApple = LiquidGlass;
  return LiquidGlass;
})(typeof window !== 'undefined' ? window : undefined);

export default LiquidGlassApple;
