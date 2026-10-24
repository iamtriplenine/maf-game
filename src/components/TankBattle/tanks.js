// ============================================================
//  NOUVEAUX CHARS : « spectre » (profilé, néon) et « titan » (blindé, lourd)
//  Dessinés face à +x, à l'intérieur d'un rayon d'environ 18 px.
//  Utilisent les couleurs du joueur : t.color.main / dark / light.
// ============================================================

const TAU = Math.PI * 2;

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
function poly(g, pts) {
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
}
function ngon(n, r, rot = 0) {
  return Array.from({ length: n }, (_, k) => [Math.cos(rot + (k / n) * TAU) * r, Math.sin(rot + (k / n) * TAU) * r]);
}

// ---------- SPECTRE ----------
const SPECTRE_HULL = [[-17, -8], [4, -11], [17, -5], [17, 5], [4, 11], [-17, 8], [-13, 0]];

function spectre(g, t, x, y, ang) {
  const c = t.color, rc = t.recoil * 4;
  g.save();
  g.translate(x, y);
  g.save(); g.translate(5, 7); g.rotate(ang); g.fillStyle = 'rgba(0,0,0,.3)'; poly(g, SPECTRE_HULL); g.fill(); g.restore();
  g.rotate(ang);

  // patins latéraux avec liseré lumineux animé
  for (const s of [-1, 1]) {
    g.fillStyle = '#14161c';
    poly(g, [[-17, s * 8], [12, s * 8], [17, s * 12.5], [-17, s * 14.5]]); g.fill();
    g.strokeStyle = '#000'; g.lineWidth = 1; g.stroke();
    g.save();
    g.strokeStyle = hexA(c.light, 0.95); g.lineWidth = 1.6;
    g.setLineDash([4, 5]); g.lineDashOffset = t.tread;
    g.beginPath(); g.moveTo(-15, s * 11.6); g.lineTo(13, s * 11.6); g.stroke();
    g.restore();
  }

  // coque
  const hg = g.createLinearGradient(0, -11, 0, 11);
  hg.addColorStop(0, c.light); hg.addColorStop(0.5, c.main); hg.addColorStop(1, c.dark);
  g.fillStyle = hg; poly(g, SPECTRE_HULL); g.fill();
  g.strokeStyle = '#0b0c10'; g.lineWidth = 1.6; g.stroke();
  g.fillStyle = 'rgba(255,255,255,.14)'; poly(g, [[-10, -3], [8, -3], [12, 0], [8, 3], [-10, 3]]); g.fill();
  g.strokeStyle = hexA(c.light, 0.85); g.lineWidth = 1;
  g.beginPath(); g.moveTo(-12, -6.5); g.lineTo(5, -8.6); g.moveTo(-12, 6.5); g.lineTo(5, 8.6); g.stroke();
  g.fillStyle = '#bff6ff';
  for (const s of [-1, 1]) { g.beginPath(); g.arc(-14.5, s * 4, 1.6, 0, TAU); g.fill(); }

  // canon rail
  g.fillStyle = '#20232b'; rr(g, 6 - rc, -2, 16, 4, 1.5); g.fill();
  g.strokeStyle = '#000'; g.lineWidth = 1; g.stroke();
  g.fillStyle = hexA(c.light, 0.95);
  g.fillRect(8 - rc, -3.1, 12, 1.1); g.fillRect(8 - rc, 2, 12, 1.1);
  g.fillStyle = '#3a3f4b'; poly(g, [[20 - rc, -3.6], [26 - rc, -2], [26 - rc, 2], [20 - rc, 3.6]]); g.fill();
  g.strokeStyle = '#000'; g.stroke();

  // tourelle hexagonale + cœur énergétique
  const tg = g.createRadialGradient(-2, -2, 1, 0, 0, 9);
  tg.addColorStop(0, c.light); tg.addColorStop(0.6, c.main); tg.addColorStop(1, c.dark);
  g.fillStyle = tg; poly(g, ngon(6, 8.8, Math.PI / 6)); g.fill();
  g.strokeStyle = '#0b0c10'; g.lineWidth = 1.6; g.stroke();
  const k = 0.65 + 0.35 * t.recoil;
  const cg = g.createRadialGradient(0, 0, 0, 0, 0, 5);
  cg.addColorStop(0, 'rgba(255,255,255,' + k + ')'); cg.addColorStop(0.5, hexA(c.light, 0.9 * k)); cg.addColorStop(1, hexA(c.light, 0));
  g.fillStyle = cg; g.beginPath(); g.arc(0, 0, 5.2, 0, TAU); g.fill();

  if (t.hitFlash > 0) {
    g.fillStyle = `rgba(255,255,255,${t.hitFlash * 0.75})`;
    poly(g, SPECTRE_HULL); g.fill();
    poly(g, ngon(6, 8.8, Math.PI / 6)); g.fill();
  }
  g.restore();
}

// ---------- TITAN ----------
function titan(g, t, x, y, ang) {
  const c = t.color, rc = t.recoil * 5;
  g.save();
  g.translate(x, y);
  g.save(); g.translate(5, 7); g.rotate(ang); g.fillStyle = 'rgba(0,0,0,.3)'; rr(g, -19, -16, 38, 32, 6); g.fill(); g.restore();
  g.rotate(ang);

  // chenilles larges : maillons + galets
  for (const s of [-1, 1]) {
    const ty = s > 0 ? 8 : -16;
    g.fillStyle = '#17181c'; rr(g, -19, ty, 38, 8, 3); g.fill();
    const ph = (((-t.tread) % 7) + 7) % 7;
    g.fillStyle = '#34363d';
    for (let px = -19 + ph; px < 16; px += 7) g.fillRect(px, ty + 1, 3.5, 6);
    g.fillStyle = '#555963';
    for (const wx of [-14, -5, 5, 14]) { g.beginPath(); g.arc(wx, ty + 4, 2.6, 0, TAU); g.fill(); }
    g.strokeStyle = '#0b0b0d'; g.lineWidth = 1.2; rr(g, -19, ty, 38, 8, 3); g.stroke();
  }

  // coque blindée
  g.fillStyle = c.main; rr(g, -16, -9, 32, 18, 5); g.fill();
  g.fillStyle = 'rgba(255,255,255,.15)'; rr(g, -16, -9, 32, 7, 5); g.fill();
  g.strokeStyle = c.dark; g.lineWidth = 2; rr(g, -16, -9, 32, 18, 5); g.stroke();
  g.strokeStyle = hexA(c.dark, 0.8); g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(-8, -9); g.lineTo(-8, 9); g.moveTo(8, -9); g.lineTo(8, 9); g.stroke();
  g.fillStyle = c.dark;
  for (const [rx, ry] of [[-12, -6], [-12, 6], [12, -6], [12, 6], [0, -7], [0, 7]]) { g.beginPath(); g.arc(rx, ry, 1, 0, TAU); g.fill(); }
  g.fillStyle = '#23252b'; rr(g, -15, -6, 7, 12, 2); g.fill();
  g.strokeStyle = '#6a6e78'; g.lineWidth = 1;
  g.beginPath(); for (const vy of [-3, 0, 3]) { g.moveTo(-14, vy); g.lineTo(-9, vy); } g.stroke();
  g.fillStyle = 'rgba(255,255,255,.28)'; g.fillRect(2, -9, 3, 18);

  // canon lourd + frein de bouche
  g.fillStyle = '#2b2e35'; rr(g, 4 - rc, -3.2, 18, 6.4, 2); g.fill();
  g.strokeStyle = '#0b0b0d'; g.lineWidth = 1.5; g.stroke();
  g.fillStyle = '#3a3e47'; g.fillRect(10 - rc, -4, 3, 8);
  g.fillStyle = '#4a4f5a'; rr(g, 20 - rc, -4.5, 6, 9, 1.5); g.fill();
  g.strokeStyle = '#0b0b0d'; g.stroke();
  g.fillStyle = '#15161a'; g.fillRect(22 - rc, -4, 1, 8); g.fillRect(24 - rc, -4, 1, 8);

  // tourelle octogonale, trappes, antenne
  const tg = g.createRadialGradient(-3, -3, 1, 0, 0, 11);
  tg.addColorStop(0, c.light); tg.addColorStop(0.65, c.main); tg.addColorStop(1, c.dark);
  g.fillStyle = tg; poly(g, ngon(8, 10, Math.PI / 8)); g.fill();
  g.strokeStyle = c.dark; g.lineWidth = 2; g.stroke();
  g.fillStyle = c.dark; g.strokeStyle = '#0b0b0d'; g.lineWidth = 1;
  g.beginPath(); g.arc(-3, -4, 2.8, 0, TAU); g.fill(); g.stroke();
  g.beginPath(); g.arc(-3, 4, 2.3, 0, TAU); g.fill(); g.stroke();
  g.strokeStyle = '#222'; g.lineWidth = 1;
  g.beginPath(); g.moveTo(-6, 5.5); g.lineTo(-17, 12); g.stroke();
  g.fillStyle = '#ff5a4d'; g.beginPath(); g.arc(-17, 12, 1.2, 0, TAU); g.fill();

  if (t.hitFlash > 0) {
    g.fillStyle = `rgba(255,255,255,${t.hitFlash * 0.75})`;
    rr(g, -16, -9, 32, 18, 5); g.fill();
    poly(g, ngon(8, 10, Math.PI / 8)); g.fill();
  }
  g.restore();
}

export const TANK_SKINS = { spectre, titan };
export const SKIN_NAMES = Object.keys(TANK_SKINS);
