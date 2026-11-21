// Monde 3D : panneaux publicitaires poses par les joueurs (type, position, image JPEG).
// Seul le compte proprietaire 99 pose et supprime les emplacements.
// Chaque joueur connecte peut gratuitement modifier ou retirer la photo (sans supprimer le panneau).
import { Router } from "express";
import { pool } from "./db.js";
import { requireSession } from "./auth.js";
import { isOwnerAccount } from "./accountRoles.js";

export const worldBillboardsRouter = Router();

const TYPES = new Set(["lowpoly", "metal", "busstop", "column"]);
const MAX_COORD = 2000;
const MIN_DIST = 3;
const MAX_IMAGE_BYTES = 1200000;
const MAX_LINK_LENGTH = 2048;
function normalizedLink(input) {
  if (typeof input !== "string" || input.length > MAX_LINK_LENGTH) return null;
  const raw = input.trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (!["https:", "http:"].includes(url.protocol) || !url.hostname ||
        url.username || url.password || /[\x00-\x1f\x7f]/.test(raw)) return null;
    return url.href.length <= MAX_LINK_LENGTH ? url.href : null;
  } catch { return null; }
}


let tableReady;
function ensureTable() {
  if (!tableReady) tableReady = pool.query(
    `CREATE TABLE IF NOT EXISTS maf_world_billboards (
       id serial PRIMARY KEY,
       owner_id integer NOT NULL REFERENCES maf_users(id) ON DELETE CASCADE,
       type varchar(16) NOT NULL,
       x double precision NOT NULL,
       z double precision NOT NULL,
       rot double precision NOT NULL,
       image bytea,
       external_url varchar(2048),
       image_version integer NOT NULL DEFAULT 0,
       created_at timestamptz NOT NULL DEFAULT now())`
  ).then(() => pool.query("ALTER TABLE maf_world_billboards ADD COLUMN IF NOT EXISTS external_url varchar(2048)"))
    .catch(error => { tableReady = null; throw error; });
  return tableReady;
}

const fail = (res, code, message) => res.status(code).json({ error: message });
const isNum = v => typeof v === "number" && Number.isFinite(v);
const parseId = req => { const id = Number(req.params.id); return Number.isSafeInteger(id) && id > 0 ? id : null; };

worldBillboardsRouter.get("/", requireSession, async (req, res) => {
  try {
    await ensureTable();
    const canManage = await isOwnerAccount(req.userId, pool);
    const { rows } = await pool.query(
      "SELECT id, owner_id, type, x, z, rot, image_version, external_url, (image IS NOT NULL) AS has_image FROM maf_world_billboards ORDER BY id");
    res.set("Cache-Control", "no-store").json({
      canPlace: canManage,
      boards: rows.map(r => ({ id: r.id, type: r.type, x: r.x, z: r.z, rot: r.rot,
        version: r.image_version, has_image: r.has_image, link: r.has_image ? (r.external_url || "") : "", mine: r.owner_id === req.userId,
        canEdit: true, canDelete: canManage }))
    });
  } catch (error) { console.error("world billboards:", error.message); fail(res, 503, "Panneaux indisponibles."); }
});

worldBillboardsRouter.post("/", requireSession, async (req, res) => {
  const { type, x, z, rot } = req.body || {};
  if (!TYPES.has(type) || ![x, z, rot].every(isNum) || Math.abs(x) > MAX_COORD || Math.abs(z) > MAX_COORD || Math.abs(rot) > 1000)
    return fail(res, 400, "Emplacement invalide.");
  try {
    if (!(await isOwnerAccount(req.userId, pool))) return fail(res, 403, "Pose reservee au compte proprietaire.");
    await ensureTable();
    const near = await pool.query(
      "SELECT 1 FROM maf_world_billboards WHERE (x-$1)^2 + (z-$2)^2 < $3 LIMIT 1", [x, z, MIN_DIST * MIN_DIST]);
    if (near.rows[0]) return fail(res, 409, "Un panneau est déjà trop près de cet endroit.");
    const row = (await pool.query(
      "INSERT INTO maf_world_billboards(owner_id, type, x, z, rot) VALUES ($1,$2,$3,$4,$5) RETURNING id, image_version",
      [req.userId, type, x, z, Math.round(rot * 1000) / 1000])).rows[0];
    res.json({ id: row.id, version: row.image_version });
  } catch (error) { console.error("world billboard create:", error.message); fail(res, 503, "Pose impossible pour le moment."); }
});

worldBillboardsRouter.put("/:id/image", requireSession, async (req, res) => {
  const id = parseId(req);
  if (!id) return fail(res, 400, "Panneau inconnu.");
  const raw = req.body ? req.body.image : undefined;
  let buffer = null;
  if (raw !== null) {
    const m = typeof raw === "string" ? /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(raw) : null;
    if (!m) return fail(res, 400, "Image JPEG attendue.");
    buffer = Buffer.from(m[1], "base64");
    if (buffer.length > MAX_IMAGE_BYTES) return fail(res, 413, "Image trop lourde (1,2 Mo maximum).");
    if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) return fail(res, 400, "Image JPEG invalide.");
  }
  try {
    await ensureTable();
    const row = (await pool.query(
      "UPDATE maf_world_billboards SET image=$1, external_url=CASE WHEN $1::bytea IS NULL THEN NULL ELSE external_url END, image_version=image_version+1 WHERE id=$2 RETURNING image_version",
      [buffer, id])).rows[0];
    if (!row) return fail(res, 404, "Panneau introuvable.");
    res.json({ version: row.image_version });
  } catch (error) { console.error("world billboard image:", error.message); fail(res, 503, "Enregistrement impossible."); }
});

// Lien public associe a la photo. Aucun paiement et aucune redirection automatique.
worldBillboardsRouter.put("/:id/link", requireSession, async (req, res) => {
  const id = parseId(req);
  if (!id) return fail(res, 400, "Panneau inconnu.");
  const link = normalizedLink(req.body?.link);
  if (link === null) return fail(res, 400, "Lien invalide : utilise http:// ou https:// (2048 caracteres maximum).");
  try {
    await ensureTable();
    const row = (await pool.query(
      "UPDATE maf_world_billboards SET external_url=$1 WHERE id=$2 RETURNING external_url",
      [link || null, id])).rows[0];
    if (!row) return fail(res, 404, "Panneau introuvable.");
    res.json({ link: row.external_url || "" });
  } catch (error) { console.error("world billboard link:", error.message); fail(res, 503, "Lien non enregistre."); }
});

worldBillboardsRouter.get("/:id/image", requireSession, async (req, res) => {
  const id = parseId(req);
  if (!id) return fail(res, 400, "Panneau inconnu.");
  try {
    await ensureTable();
    const row = (await pool.query("SELECT image FROM maf_world_billboards WHERE id=$1", [id])).rows[0];
    if (!row || !row.image) return fail(res, 404, "Pas d'image.");
    res.set("Cache-Control", "private, max-age=600").type("image/jpeg").send(row.image);
  } catch (error) { console.error("world billboard get image:", error.message); fail(res, 503, "Image indisponible."); }
});

worldBillboardsRouter.delete("/:id", requireSession, async (req, res) => {
  const id = parseId(req);
  if (!id) return fail(res, 400, "Panneau inconnu.");
  try {
    if (!(await isOwnerAccount(req.userId, pool))) return fail(res, 403, "Suppression reservee au compte proprietaire.");
    await ensureTable();
    const r = await pool.query("DELETE FROM maf_world_billboards WHERE id=$1", [id]);
    if (!r.rowCount) return fail(res, 404, "Panneau introuvable.");
    res.json({ ok: true });
  } catch (error) { console.error("world billboard delete:", error.message); fail(res, 503, "Suppression impossible."); }
});
