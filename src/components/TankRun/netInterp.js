// MAF_TANKRUN_LAG_V1 : lissage du mode en ligne.
// Le serveur envoie ~20 images par seconde. Au lieu d'afficher la derniere image recue
// (ce qui "gratte" des que le reseau varie), on affiche le jeu avec un petit retard
// volontaire (~0,13 s) en melangeant deux images voisines : le mouvement est continu.
// Le retard s'ajuste tout seul a la qualite de la connexion.

const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;
export function angDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  else if (d < -Math.PI) d += TAU;
  return d;
}

const MIN_DELAY = 95;   // ms
const MAX_DELAY = 380;  // ms
const KEEP = 48;        // images gardees (~2,4 s)

export class SnapshotBuffer {
  constructor() { this.reset(); }

  reset() {
    this.snaps = [];
    this.lastArrival = 0;
    this.gap = 50;
    this.dev = 10;
    this.samples = [];
    this.off = null;
    this.delay = 140;
    this.lastRt = 0;
    this.lastStarve = 0;
  }

  get ready() { return this.snaps.length > 0; }

  push(snap, now) {
    const last = this.snaps[this.snaps.length - 1];
    if (last) {
      if (Number.isFinite(snap.serverNow) && Number.isFinite(last.serverNow) &&
          snap.serverNow < last.serverNow) return false;
      // Une reponse HTTP ancienne ne doit jamais faire reculer le jeu.
      // Un checkpoint plus ancien peut toutefois etre restaure apres redemarrage.
      if (snap.t < last.t - 0.5 && Number.isFinite(snap.serverNow) &&
          Number.isFinite(last.serverNow) && snap.serverNow > last.serverNow) this.reset();
      else if (snap.t <= last.t) return false;
    }
    if (this.lastArrival) {
      const gap = Math.min(500, now - this.lastArrival);
      this.dev += (Math.abs(gap - this.gap) - this.dev) * 0.1;
      this.gap += (gap - this.gap) * 0.1;
    }
    this.lastArrival = now;

    // Decalage horloge serveur / horloge locale : on retient la meilleure
    // (la plus rapide) des arrivees recentes.
    const sample = snap.t * 1000 - now;
    this.samples.push({ at: now, v: sample });
    while (this.samples.length && now - this.samples[0].at > 4000) this.samples.shift();
    let best = -Infinity;
    for (const s of this.samples) if (s.v > best) best = s.v;
    this.off = this.off == null ? best : this.off + (best - this.off) * 0.12;

    this.snaps.push({ ...snap, at: now });
    if (this.snaps.length > KEEP) this.snaps.splice(0, this.snaps.length - KEEP);
    return true;
  }

  // Instant de simulation (secondes) a afficher maintenant. Toujours croissant.
  renderTime(now) {
    if (!this.snaps.length || this.off == null) return null;
    const target = Math.min(MAX_DELAY, Math.max(MIN_DELAY, 2 * this.gap + 3 * this.dev + 30));
    const newest = this.snaps[this.snaps.length - 1].t * 1000;
    let rt = now + this.off - this.delay;
    if (rt > newest) {
      // plus d'image en reserve : on augmente le retard de ce qui manquait (jamais d'un coup)
      this.delay = Math.min(MAX_DELAY, this.delay + Math.min(12, (rt - newest) * 0.5 + 1));
      this.lastStarve = now;
      rt = newest;
    } else if (now - this.lastStarve > 1500 && this.delay > target) this.delay = Math.max(target, this.delay - 0.3);
    else if (this.delay < target) this.delay = Math.min(target, this.delay + 2);
    // Une pause d'onglet ne permet ni retour arriere ni depassement du serveur.
    rt = Math.min(newest, Math.max(this.snaps[0].t * 1000, this.lastRt, rt));
    this.lastRt = rt;
    return rt / 1000;
  }

  // Image juste avant l'instant rt.
  lower(rt) {
    const s = this.snaps;
    if (!s.length) return null;
    for (let i = s.length - 1; i >= 0; i--) if (s[i].t <= rt) return s[i];
    return s[0];
  }

  // Construit la scene a dessiner (meme forme que celle attendue par render()).
  // ownIndex/ownAngle : si ownAngle est donne, le char du joueur garde cet angle
  // (le temps que le serveur confirme son appui).
  sceneAt(rt, statics, ownIndex, ownAngle) {
    const s = this.snaps;
    if (!s.length || !statics) return null;
    let a = s[0], b = s[0];
    if (rt >= s[s.length - 1].t) { a = b = s[s.length - 1]; }
    else if (rt > s[0].t) {
      for (let i = s.length - 1; i > 0; i--) {
        if (s[i - 1].t <= rt) { a = s[i - 1]; b = s[i]; break; }
      }
    }
    const span = b.t - a.t;
    const k = span > 1e-6 ? Math.min(1, Math.max(0, (rt - a.t) / span)) : 1;
    // Les etats discrets et les effets viennent du PASSE uniquement. Utiliser
    // l'image future ressuscitait GO et agrandissait les anneaux a rayon negatif.
    const near = a;
    const dt = Math.max(0, rt - near.t);

    const tanks = b.tanks.map((tb, i) => {
      const ta = a.tanks[i] || tb;
      const c = ta;
      const x = lerp(ta.x, tb.x, k), y = lerp(ta.y, tb.y, k);
      let angle = ta.angle + angDiff(ta.angle, tb.angle) * k;
      if (ownAngle != null && i === ownIndex && c.alive) angle = ownAngle;
      return { ...c, x, y, px: x, py: y, angle, pangle: angle, tread: lerp(ta.tread, tb.tread, k) };
    });

    const prev = new Map();
    for (const q of a.bullets) prev.set(q.id, q);
    const bullets = [];
    for (const q of b.bullets) {
      const p = prev.get(q.id);
      let x, y;
      if (p) { x = lerp(p.x, q.x, k); y = lerp(p.y, q.y, k); }
      else { x = q.x - q.vx * (b.t - rt); y = q.y - q.vy * (b.t - rt); }
      if (!p && a !== b && k < 1) continue;
      const life = Number.isFinite(q.life) ? Math.max(0, q.life + b.t - rt) : rt;
      bullets.push({ ...q, x, y, px: x, py: y, life });
    }
    if (a !== b && k < 1) {
      const now = new Set(b.bullets.map((q) => q.id));
      for (const p of a.bullets) {
        if (now.has(p.id)) continue;
        const x = p.x + p.vx * (rt - a.t), y = p.y + p.vy * (rt - a.t);
        bullets.push({ ...p, x, y, px: x, py: y, life: Number.isFinite(p.life) ? Math.max(0, p.life - (rt - a.t)) : rt });
      }
    }

    const particles = [];
    for (const p of near.particles) {
      const life = p.life - dt;
      if (!Number.isFinite(life) || life <= 0 || !(p.max > 0)) continue;
      particles.push({ ...p, x: p.x + p.vx * dt, y: p.y + p.vy * dt, life: Math.min(p.max, life), rot: (p.rot || 0) + (p.vr || 0) * dt });
    }
    const flashes = [];
    for (const f of near.flashes) {
      const life = f.life - dt;
      if (life > 0) flashes.push({ ...f, life });
    }

    return {
      w: statics.w, h: statics.h, cfg: statics.cfg, arena: statics.arena, rects: statics.rects,
      tanks, bullets, particles, flashes,
      time: rt, phase: near.phase,
      countdown: near.phase === 'countdown' ? Math.max(0, near.countdown - dt) : near.countdown,
      goTimer: near.goTimer > 0 ? Math.max(0, near.goTimer - dt) : 0,
      shake: Math.max(0, near.shake - dt * 2.2),
      winner: near.winner,
    };
  }
}
