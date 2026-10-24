// ============================================================
//  DÉCORS DES NOUVEAUX TERRAINS (pré-rendus une seule fois)
// ============================================================

const TAU = Math.PI * 2;

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
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

export function buildThemedBackground(game, scale, dpr) {
  const cv = document.createElement('canvas');
  cv.width = Math.ceil(game.w * scale * dpr);
  cv.height = Math.ceil(game.h * scale * dpr);
  const g = cv.getContext('2d');
  g.scale(scale * dpr, scale * dpr);
  g.lineCap = 'round'; g.lineJoin = 'round';
  const id = game.arena.theme.id;
  if (id === 'desert') floorDesert(g, game); else floorUsine(g, game);
  for (const rc of game.rects) (DRAW[rc.type] || DRAW.steel)(g, rc, id);
  return cv;
}

// ---------------- Sols ----------------
function floorDesert(g, game) {
  const rnd = mulberry32(2024);
  const gr = g.createLinearGradient(0, 0, game.w, game.h);
  gr.addColorStop(0, '#e2c488'); gr.addColorStop(1, '#cfa965');
  g.fillStyle = gr; g.fillRect(0, 0, game.w, game.h);
  for (let i = 0; i < 14; i++) {
    g.fillStyle = `rgba(150,105,50,${0.05 + rnd() * 0.06})`;
    g.beginPath(); g.ellipse(rnd() * game.w, rnd() * game.h, 40 + rnd() * 90, 18 + rnd() * 40, rnd() * 3, 0, TAU); g.fill();
  }
  // rides de dunes
  for (let i = 0; i < 90; i++) {
    const x = rnd() * game.w, y = rnd() * game.h, l = 30 + rnd() * 50;
    g.strokeStyle = rnd() < 0.5 ? 'rgba(130,90,40,.16)' : 'rgba(255,240,200,.22)';
    g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y - 6 - rnd() * 6, x + l, y); g.stroke();
  }
  for (let i = 0; i < 160; i++) {
    g.fillStyle = rnd() < 0.5 ? 'rgba(110,75,35,.22)' : 'rgba(255,245,215,.25)';
    g.beginPath(); g.arc(rnd() * game.w, rnd() * game.h, 0.8 + rnd() * 1.6, 0, TAU); g.fill();
  }
  // touffes d'herbe sèche
  for (let i = 0; i < 18; i++) {
    const x = 30 + rnd() * (game.w - 60), y = 30 + rnd() * (game.h - 60);
    g.strokeStyle = 'rgba(96,110,50,.55)'; g.lineWidth = 1.5;
    for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + k * 3, y - 6 - Math.abs(k)); g.stroke(); }
  }
  vignette(g, game, 0.35);
}

function hazard(g, x, y, w, h) {
  g.save();
  g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.fillStyle = '#f2c200'; g.fillRect(x, y, w, h);
  g.fillStyle = '#1b1b1d';
  const span = Math.max(w, h);
  for (let i = -h; i < span + h; i += 16) {
    g.beginPath();
    g.moveTo(x + i, y + h); g.lineTo(x + i + 8, y + h);
    g.lineTo(x + i + 8 + h, y); g.lineTo(x + i + h, y);
    g.closePath(); g.fill();
  }
  g.restore();
}

function floorUsine(g, game) {
  const rnd = mulberry32(777);
  const TS = 40;
  for (let ty = 0; ty < game.h / TS; ty++) {
    for (let tx = 0; tx < game.w / TS; tx++) {
      g.fillStyle = `hsl(215,6%,${33 + rnd() * 5}%)`;
      g.fillRect(tx * TS, ty * TS, TS, TS);
      g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1.2;
      g.strokeRect(tx * TS + 0.6, ty * TS + 0.6, TS - 1.2, TS - 1.2);
      g.fillStyle = 'rgba(0,0,0,.35)';
      for (const [bx, by] of [[4, 4], [TS - 4, 4], [4, TS - 4], [TS - 4, TS - 4]]) {
        g.beginPath(); g.arc(tx * TS + bx, ty * TS + by, 1.1, 0, TAU); g.fill();
      }
    }
  }
  for (let i = 0; i < 8; i++) {
    g.fillStyle = `rgba(10,10,12,${0.12 + rnd() * 0.12})`;
    g.beginPath(); g.ellipse(rnd() * game.w, rnd() * game.h, 14 + rnd() * 30, 8 + rnd() * 16, rnd() * 3, 0, TAU); g.fill();
  }
  // bandes de danger le long de l'enceinte
  hazard(g, 14, 14, game.w - 28, 8);
  hazard(g, 14, game.h - 22, game.w - 28, 8);
  hazard(g, 14, 22, 8, game.h - 44);
  hazard(g, game.w - 22, 22, 8, game.h - 44);
  // marquage central
  g.strokeStyle = 'rgba(242,194,0,.6)'; g.lineWidth = 3; g.setLineDash([14, 10]);
  g.strokeRect(300, 170, 200, 140); g.setLineDash([]);
  vignette(g, game, 0.45);
}

function vignette(g, game, a) {
  const vg = g.createRadialGradient(game.w / 2, game.h / 2, game.h * 0.35, game.w / 2, game.h / 2, game.w * 0.65);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${a})`);
  g.fillStyle = vg; g.fillRect(0, 0, game.w, game.h);
}

// ---------------- Obstacles ----------------
const shadow = (g, rc, r = 4) => { g.fillStyle = 'rgba(0,0,0,.3)'; rr(g, rc.x + 5, rc.y + 7, rc.w, rc.h, r); g.fill(); };

const DRAW = {
  crate(g, rc) {
    shadow(g, rc);
    g.fillStyle = '#c27a2c'; rr(g, rc.x, rc.y, rc.w, rc.h, 3); g.fill();
    g.strokeStyle = '#5e3410'; g.lineWidth = 3; rr(g, rc.x, rc.y, rc.w, rc.h, 3); g.stroke();
    g.strokeStyle = '#8a4f17';
    g.strokeRect(rc.x + 6, rc.y + 6, rc.w - 12, rc.h - 12);
    g.beginPath();
    g.moveTo(rc.x + 6, rc.y + 6); g.lineTo(rc.x + rc.w - 6, rc.y + rc.h - 6);
    g.moveTo(rc.x + rc.w - 6, rc.y + 6); g.lineTo(rc.x + 6, rc.y + rc.h - 6);
    g.stroke();
  },

  rock(g, rc, theme) {
    const rnd = mulberry32(rc.x * 7 + rc.y);
    const cx = rc.x + rc.w / 2, cy = rc.y + rc.h / 2;
    const pts = [];
    for (let k = 0; k < 11; k++) {
      const a = (k / 11) * TAU;
      pts.push([cx + Math.cos(a) * (rc.w / 2) * (0.82 + rnd() * 0.24), cy + Math.sin(a) * (rc.h / 2) * (0.82 + rnd() * 0.24)]);
    }
    const path = (ox, oy, s) => {
      g.beginPath();
      pts.forEach(([x, y], i) => {
        const px = cx + (x - cx) * s + ox, py = cy + (y - cy) * s + oy;
        if (i) g.lineTo(px, py); else g.moveTo(px, py);
      });
      g.closePath();
    };
    g.fillStyle = 'rgba(0,0,0,.3)'; path(5, 7, 1); g.fill();
    g.fillStyle = theme === 'desert' ? '#b78d62' : '#8d8f93'; path(0, 0, 1); g.fill();
    g.strokeStyle = theme === 'desert' ? '#6d4e32' : '#55575c'; g.lineWidth = 2.5; path(0, 0, 1); g.stroke();
    g.fillStyle = theme === 'desert' ? '#d2ab80' : '#a9abb0'; path(-3, -3, 0.62); g.fill();
    g.strokeStyle = 'rgba(80,50,25,.35)'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(cx - rc.w * 0.2, cy + rc.h * 0.1); g.lineTo(cx + rc.w * 0.05, cy + rc.h * 0.28); g.stroke();
  },

  cactus(g, rc) {
    const cx = rc.x + rc.w / 2, cy = rc.y + rc.h / 2, r = rc.w / 2;
    g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(cx + 4, cy + 6, r, r * 0.9, 0, 0, TAU); g.fill();
    g.fillStyle = '#3f9142'; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill();
    g.strokeStyle = '#1f5a28'; g.lineWidth = 2; g.stroke();
    g.strokeStyle = '#2d7a35'; g.lineWidth = 1.5;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU;
      g.beginPath(); g.moveTo(cx + Math.cos(a) * 3, cy + Math.sin(a) * 3); g.lineTo(cx + Math.cos(a) * (r - 1), cy + Math.sin(a) * (r - 1)); g.stroke();
    }
    g.fillStyle = '#f5f0c8';
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU + 0.2;
      g.beginPath(); g.arc(cx + Math.cos(a) * (r - 3), cy + Math.sin(a) * (r - 3), 0.9, 0, TAU); g.fill();
    }
    g.fillStyle = '#ff6fa8'; g.beginPath(); g.arc(cx, cy, 3.2, 0, TAU); g.fill();
    g.fillStyle = '#ffe066'; g.beginPath(); g.arc(cx, cy, 1.3, 0, TAU); g.fill();
  },

  fence(g, rc) {
    shadow(g, rc, 2);
    g.fillStyle = '#9a6a38'; rr(g, rc.x, rc.y, rc.w, rc.h, 2); g.fill();
    g.strokeStyle = '#4a2d12'; g.lineWidth = 2; rr(g, rc.x, rc.y, rc.w, rc.h, 2); g.stroke();
    g.strokeStyle = 'rgba(60,35,12,.7)'; g.lineWidth = 1.2; g.beginPath();
    if (rc.w >= rc.h) for (let x = rc.x + 14; x < rc.x + rc.w; x += 14) { g.moveTo(x, rc.y); g.lineTo(x, rc.y + rc.h); }
    else for (let y = rc.y + 14; y < rc.y + rc.h; y += 14) { g.moveTo(rc.x, y); g.lineTo(rc.x + rc.w, y); }
    g.stroke();
    g.fillStyle = '#5a3615';
    if (rc.w >= rc.h) for (let x = rc.x + 2; x < rc.x + rc.w; x += 38) g.fillRect(x, rc.y - 1, 5, rc.h + 2);
    else for (let y = rc.y + 2; y < rc.y + rc.h; y += 38) g.fillRect(rc.x - 1, y, rc.w + 2, 5);
  },

  steel(g, rc) {
    shadow(g, rc, 3);
    const horiz = rc.w >= rc.h;
    const gr = horiz ? g.createLinearGradient(0, rc.y, 0, rc.y + rc.h) : g.createLinearGradient(rc.x, 0, rc.x + rc.w, 0);
    gr.addColorStop(0, '#d2d8df'); gr.addColorStop(1, '#868d97');
    g.fillStyle = gr; rr(g, rc.x, rc.y, rc.w, rc.h, 2); g.fill();
    g.strokeStyle = '#4b525a'; g.lineWidth = 2; rr(g, rc.x, rc.y, rc.w, rc.h, 2); g.stroke();
    g.fillStyle = '#4a5058';
    if (horiz) for (let x = rc.x + 8; x < rc.x + rc.w - 3; x += 14) { g.beginPath(); g.arc(x, rc.y + rc.h / 2, 1.5, 0, TAU); g.fill(); }
    else for (let y = rc.y + 8; y < rc.y + rc.h - 3; y += 14) { g.beginPath(); g.arc(rc.x + rc.w / 2, y, 1.5, 0, TAU); g.fill(); }
  },

  container(g, rc) {
    const pal = ['#c0392b', '#2e86c1', '#d68910', '#1e8449'];
    const col = pal[Math.abs((rc.x * 3 + rc.y) | 0) % pal.length];
    shadow(g, rc, 3);
    g.fillStyle = col; rr(g, rc.x, rc.y, rc.w, rc.h, 3); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = 1.2; g.beginPath();
    if (rc.w >= rc.h) for (let y = rc.y + 5; y < rc.y + rc.h - 2; y += 5) { g.moveTo(rc.x + 5, y); g.lineTo(rc.x + rc.w - 5, y); }
    else for (let x = rc.x + 5; x < rc.x + rc.w - 2; x += 5) { g.moveTo(x, rc.y + 5); g.lineTo(x, rc.y + rc.h - 5); }
    g.stroke();
    g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 2.5; rr(g, rc.x, rc.y, rc.w, rc.h, 3); g.stroke();
    g.fillStyle = 'rgba(0,0,0,.45)';
    for (const [px, py] of [[0, 0], [rc.w - 7, 0], [0, rc.h - 7], [rc.w - 7, rc.h - 7]]) g.fillRect(rc.x + px, rc.y + py, 7, 7);
    g.fillStyle = 'rgba(255,255,255,.75)';
    if (rc.w >= rc.h) g.fillRect(rc.x + rc.w / 2 - 9, rc.y + rc.h / 2 - 3, 18, 6);
    else g.fillRect(rc.x + rc.w / 2 - 3, rc.y + rc.h / 2 - 9, 6, 18);
  },

  barrel(g, rc) {
    const cx = rc.x + rc.w / 2, cy = rc.y + rc.h / 2, r = rc.w / 2;
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.arc(cx + 4, cy + 6, r, 0, TAU); g.fill();
    g.fillStyle = '#b03a2e'; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill();
    g.strokeStyle = '#641e16'; g.lineWidth = 2; g.stroke();
    g.strokeStyle = '#f1c40f'; g.lineWidth = 2.5; g.beginPath(); g.arc(cx, cy, r - 4.5, 0, TAU); g.stroke();
    g.fillStyle = '#7b241c'; g.beginPath(); g.arc(cx, cy, r - 7, 0, TAU); g.fill();
    g.fillStyle = '#2b2b2b'; g.beginPath(); g.arc(cx + 2, cy - 2, 1.8, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.arc(cx - 3, cy - 4, 2.2, 0, TAU); g.fill();
  },

  border(g, rc, theme) {
    const desert = theme === 'desert';
    g.fillStyle = desert ? '#8c6a47' : '#2c3036'; g.fillRect(rc.x, rc.y, rc.w, rc.h);
    g.strokeStyle = desert ? '#6d4f33' : '#444a52'; g.lineWidth = 2; g.beginPath();
    const horiz = rc.w > rc.h;
    if (horiz) for (let x = rc.x + 34; x < rc.x + rc.w; x += 34) { g.moveTo(x, rc.y); g.lineTo(x, rc.y + rc.h); }
    else for (let y = rc.y + 34; y < rc.y + rc.h; y += 34) { g.moveTo(rc.x, y); g.lineTo(rc.x + rc.w, y); }
    g.stroke();
    if (!desert) {
      g.fillStyle = '#6a717b';
      if (horiz) for (let x = rc.x + 17; x < rc.x + rc.w; x += 34) { g.beginPath(); g.arc(x, rc.y + rc.h / 2, 1.6, 0, TAU); g.fill(); }
      else for (let y = rc.y + 17; y < rc.y + rc.h; y += 34) { g.beginPath(); g.arc(rc.x + rc.w / 2, y, 1.6, 0, TAU); g.fill(); }
    }
    g.strokeStyle = desert ? '#c9a070' : '#8a929c'; g.lineWidth = 2; g.beginPath();
    if (horiz) { const y = rc.y < 10 ? rc.y + rc.h : rc.y; g.moveTo(rc.x, y); g.lineTo(rc.x + rc.w, y); }
    else { const x = rc.x < 10 ? rc.x + rc.w : rc.x; g.moveTo(x, rc.y); g.lineTo(x, rc.y + rc.h); }
    g.stroke();
  },
};
