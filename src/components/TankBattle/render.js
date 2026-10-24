// ============================================================
//  RENDU CANVAS 2D — décor, chars, projectiles, effets, HUD
// ============================================================

import { buildThemedBackground } from './arenaRender';
import { TANK_SKINS } from './tanks';
import { drawAmmoBullet } from './ammo'; // MAF_TANK_EXTRAS_LOCAL_V1

const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y);
  g.closePath();
}

/** Zones tactiles : une par joueur humain (index = numéro du joueur). */
export function getZones(humans) {
  if (humans <= 1) return [{ x0: 0, y0: 0, x1: 1, y1: 1, corner: 'bl' }];
  if (humans === 2) return [
    { x0: 0, y0: 0, x1: 0.5, y1: 1, corner: 'bl' },
    { x0: 0.5, y0: 0, x1: 1, y1: 1, corner: 'br' },
  ];
  const z = [
    { x0: 0, y0: 0.5, x1: 0.5, y1: 1, corner: 'bl' },
    { x0: 0.5, y0: 0.5, x1: 1, y1: 1, corner: 'br' },
    { x0: 0, y0: 0, x1: 0.5, y1: 0.5, corner: 'tl' },
    { x0: 0.5, y0: 0, x1: 1, y1: 0.5, corner: 'tr' },
  ];
  return z.slice(0, humans);
}

// ---------------- Décor statique (pré-rendu une seule fois) ----------------
export function buildBackground(game, scale, dpr) {
  if (game.arena && game.arena.theme) return buildThemedBackground(game, scale, dpr);
  const cv = document.createElement('canvas');
  cv.width = Math.ceil(game.w * scale * dpr);
  cv.height = Math.ceil(game.h * scale * dpr);
  const g = cv.getContext('2d');
  g.scale(scale * dpr, scale * dpr);
  const rnd = mulberry32(99);
  const TS = 40;

  for (let ty = 0; ty < game.h / TS; ty++) {
    for (let tx = 0; tx < game.w / TS; tx++) {
      const x = tx * TS, y = ty * TS;
      g.fillStyle = `hsl(${26 + rnd() * 6},${30 + rnd() * 8}%,${34 + rnd() * 8}%)`;
      g.fillRect(x, y, TS, TS);
      g.strokeStyle = 'rgba(30,16,6,.45)';
      g.lineWidth = 1.5;
      g.strokeRect(x + 0.75, y + 0.75, TS - 1.5, TS - 1.5);
      g.strokeStyle = 'rgba(255,220,170,.10)';
      g.beginPath(); g.moveTo(x + 2, y + TS - 2); g.lineTo(x + 2, y + 2); g.lineTo(x + TS - 2, y + 2); g.stroke();
    }
  }
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (let i = 0; i < 28; i++) {
    let x = rnd() * game.w, y = rnd() * game.h;
    g.strokeStyle = 'rgba(25,12,4,.5)';
    g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 4; k++) { x += (rnd() - 0.5) * 34; y += (rnd() - 0.5) * 34; g.lineTo(x, y); }
    g.stroke();
  }
  for (let i = 0; i < 70; i++) {
    g.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,.16)' : 'rgba(255,230,190,.12)';
    g.beginPath(); g.ellipse(rnd() * game.w, rnd() * game.h, 1.5 + rnd() * 2.5, 1 + rnd() * 1.8, rnd() * 3, 0, TAU); g.fill();
  }
  const vg = g.createRadialGradient(game.w / 2, game.h / 2, game.h * 0.35, game.w / 2, game.h / 2, game.w * 0.65);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,.4)');
  g.fillStyle = vg;
  g.fillRect(0, 0, game.w, game.h);

  for (const rc of game.rects) {
    if (rc.type === 'crate') drawCrate(g, rc);
    else if (rc.type === 'steel') drawSteel(g, rc);
    else if (rc.type === 'rock') drawRock(g, rc);
    else drawBorder(g, rc, game);
  }
  return cv;
}

function drawCrate(g, rc) {
  g.fillStyle = 'rgba(0,0,0,.32)'; rr(g, rc.x + 5, rc.y + 7, rc.w, rc.h, 4); g.fill();
  g.fillStyle = '#c27a2c'; rr(g, rc.x, rc.y, rc.w, rc.h, 3); g.fill();
  g.strokeStyle = '#5e3410'; g.lineWidth = 3; rr(g, rc.x, rc.y, rc.w, rc.h, 3); g.stroke();
  g.strokeStyle = '#8a4f17'; g.lineWidth = 3;
  g.strokeRect(rc.x + 6, rc.y + 6, rc.w - 12, rc.h - 12);
  g.beginPath();
  g.moveTo(rc.x + 6, rc.y + 6); g.lineTo(rc.x + rc.w - 6, rc.y + rc.h - 6);
  g.moveTo(rc.x + rc.w - 6, rc.y + 6); g.lineTo(rc.x + 6, rc.y + rc.h - 6);
  g.stroke();
  g.strokeStyle = 'rgba(255,230,180,.35)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(rc.x + 2, rc.y + rc.h - 3); g.lineTo(rc.x + 2, rc.y + 2); g.lineTo(rc.x + rc.w - 3, rc.y + 2); g.stroke();
}

function drawSteel(g, rc) {
  g.fillStyle = 'rgba(0,0,0,.32)'; rr(g, rc.x + 4, rc.y + 6, rc.w, rc.h, 3); g.fill();
  const horiz = rc.w >= rc.h;
  const gr = horiz ? g.createLinearGradient(0, rc.y, 0, rc.y + rc.h) : g.createLinearGradient(rc.x, 0, rc.x + rc.w, 0);
  gr.addColorStop(0, '#d2d8df'); gr.addColorStop(1, '#868d97');
  g.fillStyle = gr; rr(g, rc.x, rc.y, rc.w, rc.h, 3); g.fill();
  g.strokeStyle = '#4b525a'; g.lineWidth = 2; rr(g, rc.x, rc.y, rc.w, rc.h, 3); g.stroke();
  g.fillStyle = '#4a5058';
  if (horiz) for (let x = rc.x + 10; x < rc.x + rc.w - 4; x += 16) { g.beginPath(); g.arc(x, rc.y + rc.h / 2, 1.8, 0, TAU); g.fill(); }
  else for (let y = rc.y + 10; y < rc.y + rc.h - 4; y += 16) { g.beginPath(); g.arc(rc.x + rc.w / 2, y, 1.8, 0, TAU); g.fill(); }
}

function drawRock(g, rc) {
  const rnd = mulberry32(rc.x * 7 + rc.y);
  const cx = rc.x + rc.w / 2, cy = rc.y + rc.h / 2;
  const pts = [];
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * TAU;
    pts.push([cx + Math.cos(a) * (rc.w / 2) * (0.84 + rnd() * 0.22), cy + Math.sin(a) * (rc.h / 2) * (0.84 + rnd() * 0.22)]);
  }
  const path = (ox, oy, s) => {
    g.beginPath();
    pts.forEach(([x, y], i) => {
      const px = cx + (x - cx) * s + ox, py = cy + (y - cy) * s + oy;
      if (i) g.lineTo(px, py); else g.moveTo(px, py);
    });
    g.closePath();
  };
  g.lineJoin = 'round';
  g.fillStyle = 'rgba(0,0,0,.32)'; path(5, 7, 1); g.fill();
  g.fillStyle = '#8d8f93'; path(0, 0, 1); g.fill();
  g.strokeStyle = '#55575c'; g.lineWidth = 2.5; path(0, 0, 1); g.stroke();
  g.fillStyle = '#a9abb0'; path(-3, -3, 0.6); g.fill();
}

function drawBorder(g, rc, game) {
  g.fillStyle = '#3b2b1f'; g.fillRect(rc.x, rc.y, rc.w, rc.h);
  g.strokeStyle = '#4f3a28'; g.lineWidth = 2;
  g.beginPath();
  if (rc.w > rc.h) for (let x = rc.x + 28; x < rc.x + rc.w; x += 28) { g.moveTo(x, rc.y); g.lineTo(x, rc.y + rc.h); }
  else for (let y = rc.y + 28; y < rc.y + rc.h; y += 28) { g.moveTo(rc.x, y); g.lineTo(rc.x + rc.w, y); }
  g.stroke();
  g.strokeStyle = '#7a5a3c'; g.lineWidth = 2;
  g.beginPath();
  if (rc.w > rc.h) { const y = rc.y < 10 ? rc.y + rc.h : rc.y; g.moveTo(rc.x, y); g.lineTo(rc.x + rc.w, y); }
  else { const x = rc.x < 10 ? rc.x + rc.w : rc.x; g.moveTo(x, rc.y); g.lineTo(x, rc.y + rc.h); }
  g.stroke();
}

// ---------------- Éléments dynamiques ----------------
function drawTank(g, t, x, y, ang, wreck) {
  if (!wreck && t.skin && TANK_SKINS[t.skin]) { TANK_SKINS[t.skin](g, t, x, y, ang); return; }
  const col = wreck ? { main: '#3a3a3a', dark: '#151515', light: '#555' } : t.color;
  g.save();
  g.translate(x, y);
  if (wreck) {
    g.fillStyle = 'rgba(0,0,0,.45)';
    g.beginPath(); g.ellipse(0, 0, 26, 22, 0, 0, TAU); g.fill();
  }
  g.fillStyle = 'rgba(0,0,0,.3)'; rr(g, -11, -6, 30, 24, 5); g.fill();
  g.rotate(ang);

  // chenilles animées
  for (const side of [-1, 1]) {
    const ty = side > 0 ? 7 : -15;
    g.fillStyle = '#1d1d22'; rr(g, -17, ty, 34, 8, 2); g.fill();
    g.fillStyle = '#3d3d46';
    const ph = (((-t.tread) % 6) + 6) % 6;
    for (let px = -17 + ph; px < 16; px += 6) g.fillRect(px, ty + 1, 2, 6);
  }
  // coque
  g.fillStyle = col.main; rr(g, -14, -10, 28, 20, 5); g.fill();
  g.strokeStyle = col.dark; g.lineWidth = 2; rr(g, -14, -10, 28, 20, 5); g.stroke();
  g.fillStyle = hexA(col.dark.length === 7 ? col.dark : '#000000', 0.45);
  g.fillRect(-14, -5, 4, 10);
  g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(-9, -9, 20, 3);
  if (t.hitFlash > 0 && !wreck) {
    g.fillStyle = `rgba(255,255,255,${t.hitFlash * 0.75})`; rr(g, -14, -10, 28, 20, 5); g.fill();
  }
  // canon (recul au tir)
  const rc = wreck ? 0 : t.recoil * 4;
  g.fillStyle = '#2a2d33'; rr(g, 2 - rc, -3, 22, 6, 2); g.fill();
  g.strokeStyle = '#0e0f12'; g.lineWidth = 1.5; rr(g, 2 - rc, -3, 22, 6, 2); g.stroke();
  g.fillStyle = '#4a4e57'; g.fillRect(19 - rc, -4, 5, 8);
  // tourelle
  g.fillStyle = col.light; g.beginPath(); g.arc(0, 0, 8.5, 0, TAU); g.fill();
  g.strokeStyle = col.dark; g.lineWidth = 2; g.stroke();
  g.fillStyle = col.main; g.beginPath(); g.arc(0, 0, 4, 0, TAU); g.fill();
  g.restore();
}

function drawRotationArrow(g, t, x, y, ang) {
  const r = 27, a0 = ang + t.dir * 0.2, a1 = ang + t.dir * 0.85;
  g.save();
  g.strokeStyle = hexA(t.color.main, 0.45);
  g.fillStyle = hexA(t.color.main, 0.45);
  g.lineWidth = 2.5; g.lineCap = 'round';
  g.setLineDash([4, 4]);
  g.beginPath(); g.arc(x, y, r, a0, a1, t.dir < 0); g.stroke();
  g.setLineDash([]);
  const ex = x + Math.cos(a1) * r, ey = y + Math.sin(a1) * r;
  const tx = -Math.sin(a1) * t.dir, ty = Math.cos(a1) * t.dir;
  const nx = Math.cos(a1), ny = Math.sin(a1);
  g.beginPath();
  g.moveTo(ex + tx * 6, ey + ty * 6);
  g.lineTo(ex - tx * 1 + nx * 4, ey - ty * 1 + ny * 4);
  g.lineTo(ex - tx * 1 - nx * 4, ey - ty * 1 - ny * 4);
  g.closePath(); g.fill();
  g.restore();
}

function drawPips(g, t, x, y, hpMax) {
  const w = 8, gap = 3, total = hpMax * w + (hpMax - 1) * gap;
  let px = x - total / 2;
  for (let i = 0; i < hpMax; i++) {
    g.fillStyle = i < t.hp ? t.color.main : 'rgba(0,0,0,.5)';
    rr(g, px, y - 32, w, 5, 2); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1; g.stroke();
    px += w + gap;
  }
}

function drawBullet(g, b, alpha) {
  if (drawAmmoBullet(g, b, alpha)) return;
  const x = lerp(b.px, b.x, alpha), y = lerp(b.py, b.y, alpha);
  g.lineCap = 'round';
  g.globalAlpha = 0.4; g.strokeStyle = b.color; g.lineWidth = b.r * 1.7;
  g.beginPath(); g.moveTo(x - b.vx * 0.035, y - b.vy * 0.035); g.lineTo(x, y); g.stroke();
  g.globalAlpha = 0.3; g.fillStyle = b.color; g.beginPath(); g.arc(x, y, b.r * 2.4, 0, TAU); g.fill();
  g.globalAlpha = 1; g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, b.r, 0, TAU); g.fill();
  g.strokeStyle = b.color; g.lineWidth = 1.5; g.stroke();
}

function drawFlash(g, f) {
  const k = f.life / f.max;
  g.save();
  g.translate(f.x, f.y); g.rotate(f.angle); g.globalAlpha = k;
  g.fillStyle = '#ffb703';
  g.beginPath(); g.moveTo(-2, -6 * k - 1); g.lineTo(20 * k + 6, 0); g.lineTo(-2, 6 * k + 1); g.closePath(); g.fill();
  g.fillStyle = '#fff3b0';
  g.beginPath(); g.arc(0, 0, 8 * k + 2, 0, TAU); g.fill();
  g.restore();
}

function drawParticle(g, p) {
  const k = p.life / p.max;
  switch (p.k) {
    case 'fire':
      g.globalAlpha = Math.min(1, k * 1.4);
      g.fillStyle = `hsl(${12 + 42 * k},100%,${48 + 10 * k}%)`;
      g.beginPath(); g.arc(p.x, p.y, p.size * (0.4 + k * 0.6), 0, TAU); g.fill();
      break;
    case 'spark':
      g.globalAlpha = k; g.strokeStyle = p.color; g.lineWidth = 2; g.lineCap = 'round';
      g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); g.stroke();
      break;
    case 'smoke':
      g.globalAlpha = k * 0.4; g.fillStyle = '#2a2623';
      g.beginPath(); g.arc(p.x, p.y, p.size * (1.7 - k * 0.7), 0, TAU); g.fill();
      break;
    case 'dust':
      g.globalAlpha = k * 0.45; g.fillStyle = '#e4c99a';
      g.beginPath(); g.arc(p.x, p.y, p.size * (1.8 - k * 0.8), 0, TAU); g.fill();
      break;
    case 'ring':
      g.globalAlpha = k; g.strokeStyle = '#ffd36b'; g.lineWidth = 1 + 3 * k;
      g.beginPath(); g.arc(p.x, p.y, 4 + p.size * (1 - k), 0, TAU); g.stroke();
      break;
    case 'debris':
      g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.globalAlpha = Math.min(1, k * 1.5);
      g.fillStyle = p.color; g.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      g.restore();
      break;
    default: break;
  }
  g.globalAlpha = 1;
}

function bigText(g, text, x, y, size, alpha, color = '#ffffff', outline = '#3b1a8c') {
  g.save();
  g.globalAlpha = alpha;
  g.font = `900 ${size}px Impact, "Arial Black", system-ui, sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineJoin = 'round'; g.lineWidth = size * 0.16;
  g.strokeStyle = outline; g.strokeText(text, x, y);
  g.fillStyle = color; g.fillText(text, x, y);
  g.restore();
}

function drawHUD(g, game, view) {
  const { W, H } = view;
  const zones = getZones(view.humans);
  const hpMax = game.cfg.hp;
  for (const t of game.tanks) {
    const left = t.corner[1] === 'l', top = t.corner[0] === 't';
    const zone = t.human ? zones[t.i] : null;
    const RR = 34;
    const cx = left ? 56 : W - 56, cy = top ? 56 : H - 56;
    const panelW = 54 + hpMax * 13, panelH = 26;
    const px = left ? 14 : W - 14 - panelW;
    let py;
    if (zone) py = top ? cy + RR + 8 : cy - RR - 8 - panelH;
    else py = top ? 14 : H - 14 - panelH;

    g.save();
    g.globalAlpha = t.alive ? 1 : 0.45;
    g.fillStyle = 'rgba(5,3,15,.62)'; rr(g, px, py, panelW, panelH, 8); g.fill();
    g.fillStyle = t.color.main; g.beginPath(); g.arc(px + 13, py + panelH / 2, 6, 0, TAU); g.fill();
    g.fillStyle = '#fff'; g.font = '700 12px system-ui, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillText(t.human ? `J${t.i + 1}` : 'BOT', px + 24, py + panelH / 2 + 0.5);
    for (let i = 0; i < hpMax; i++) {
      g.fillStyle = i < t.hp ? t.color.main : 'rgba(255,255,255,.18)';
      rr(g, px + 54 + i * 13, py + 8, 10, 10, 3); g.fill();
    }
    g.restore();

    if (zone && game.phase !== 'over') {
      const pressed = t.pressed, p = Math.min(1, t.heldFor / game.cfg.holdThreshold);
      g.save();
      g.globalAlpha = t.alive ? 1 : 0.3;
      g.fillStyle = hexA(t.color.main, t.moving ? 0.5 : pressed ? 0.3 : 0.14);
      g.beginPath(); g.arc(cx, cy, RR, 0, TAU); g.fill();
      g.strokeStyle = hexA(t.color.main, 0.7); g.lineWidth = 4;
      g.beginPath(); g.arc(cx, cy, RR, 0, TAU); g.stroke();
      if (pressed && !t.moving) {
        g.strokeStyle = '#fff'; g.lineWidth = 5; g.lineCap = 'round';
        g.beginPath(); g.arc(cx, cy, RR - 7, -Math.PI / 2, -Math.PI / 2 + p * TAU); g.stroke();
      }
      g.fillStyle = hexA('#ffffff', t.moving ? 0.95 : 0.6);
      g.beginPath(); g.arc(cx, cy, t.moving ? 9 : 6, 0, TAU); g.fill();
      g.restore();
    }
  }
}

// ---------------- Image complète ----------------
export function render(g, game, view, alpha) {
  const { W, H, dpr, scale, ox, oy } = view;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#05030F';
  g.fillRect(0, 0, g.canvas.width, g.canvas.height);
  g.setTransform(dpr, 0, 0, dpr, 0, 0);

  const sh = game.shake > 0 ? game.shake * 7 : 0;
  g.save();
  g.translate(ox + (sh ? (Math.random() - 0.5) * sh : 0), oy + (sh ? (Math.random() - 0.5) * sh : 0));
  g.scale(scale, scale);

  if (view.bg) g.drawImage(view.bg, 0, 0, game.w, game.h);

  for (const p of game.particles) if (p.k === 'smoke' || p.k === 'dust') drawParticle(g, p);

  for (const t of game.tanks) if (!t.alive) drawTank(g, t, t.x, t.y, t.angle, true);

  for (const t of game.tanks) {
    if (!t.alive) continue;
    const x = lerp(t.px, t.x, alpha), y = lerp(t.py, t.y, alpha), a = lerp(t.pangle, t.angle, alpha);
    if (!t.moving && game.phase !== 'over') drawRotationArrow(g, t, x, y, a);
    drawTank(g, t, x, y, a, false);
    drawPips(g, t, x, y, game.cfg.hp);
  }

  for (const b of game.bullets) drawBullet(g, b, alpha);
  for (const f of game.flashes) drawFlash(g, f);
  for (const p of game.particles) if (p.k !== 'smoke' && p.k !== 'dust') drawParticle(g, p);
  g.restore();

  drawHUD(g, game, view);

  const size = Math.min(W, H) * 0.22;
  if (game.phase === 'countdown') {
    const n = Math.ceil(game.countdown);
    const frac = n - game.countdown;
    bigText(g, String(n), W / 2, H / 2, size * (1.25 - 0.25 * Math.min(1, frac * 3)), 1 - frac * frac * frac);
  } else if (game.goTimer > 0) {
    bigText(g, 'GO !', W / 2, H / 2, size, Math.min(1, game.goTimer / 0.3), '#ffe066', '#7a2d00');
  }
}
