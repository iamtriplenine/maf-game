import { useEffect, useState } from "react";
import { adminRequest } from "../api/accounts";
import ChatMessage from "./ChatMessage";
import HourglassLoader from "./HourglassLoader";
import "../styles/admin-chat.css";

const PAGE = 20;
const date = (value) => (value ? new Date(value).toLocaleString("fr-FR") : "—");

// Onglet "Messages" du panel admin : voir, ecouter et supprimer les messages et les vocaux.
export default function AdminChat({ onBusy }) {
  const [offset, setOffset] = useState(0);
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState({ key: null, rows: [], total: 0, error: "" });
  const [confirm, setConfirm] = useState(null); // id du message, "all", ou null
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");
  const [problem, setProblem] = useState("");
  const key = `${offset}|${revision}`;
  const loading = data.key !== key;

  useEffect(() => {
    let alive = true;
    adminRequest(`/chat?limit=${PAGE}&offset=${offset}`)
      .then((result) => {
        if (alive) setData({ key, rows: result.messages, total: result.total, error: "" });
      })
      .catch((error) => {
        if (alive) setData({ key, rows: [], total: 0, error: error.message });
      });
    return () => {
      alive = false;
    };
  }, [key, offset]);

  async function run(request, done) {
    if (busy) return;
    setBusy(true);
    onBusy(true);
    setProblem("");
    try {
      await request();
      setConfirm(null);
      setFlash(done);
      setRevision((n) => n + 1);
    } catch (error) {
      setProblem(error.message);
    } finally {
      setBusy(false);
      onBusy(false);
    }
  }

  const removeOne = (id) =>
    run(async () => {
      await adminRequest(`/chat/${id}`, { method: "DELETE" });
      if (data.rows.length === 1 && offset > 0) setOffset((n) => Math.max(0, n - PAGE)); // page devenue vide
    }, "Message supprime.");

  const removeAll = () =>
    run(async () => {
      await adminRequest("/chat", { method: "DELETE", body: { confirm: "tout-supprimer" } });
      setOffset(0);
    }, "Tous les messages et vocaux ont ete supprimes.");

  const { rows, total, error } = data;

  return (
    <section aria-label="Messages du chat">
      <div className="admin-toolbar">
        <p className="admin-muted admin-chat__count">{loading ? "Chargement…" : `${total} message${total > 1 ? "s" : ""} et vocaux`}</p>
        <div className="admin-actions">
          <button type="button" className="admin-btn" disabled={loading || busy} onClick={() => setRevision((n) => n + 1)}>
            Actualiser
          </button>
          <button
            type="button"
            className="admin-btn admin-btn--danger"
            disabled={loading || busy || total === 0}
            onClick={() => setConfirm("all")}
          >
            Tout supprimer
          </button>
        </div>
      </div>

      {confirm === "all" && (
        <div className="admin-confirm" role="alertdialog" aria-label="Confirmer la suppression de tout le chat">
          <strong>Supprimer les {total} messages et vocaux ?</strong>
          <p>Le chat sera vide pour tout le monde. Cette action est definitive.</p>
          {busy && <HourglassLoader />}
          <div className="admin-actions">
            <button type="button" className="admin-btn" disabled={busy} onClick={() => setConfirm(null)}>
              Annuler
            </button>
            <button type="button" className="admin-btn admin-btn--danger" disabled={busy} onClick={removeAll}>
              {busy ? "Suppression…" : "Oui, tout supprimer"}
            </button>
          </div>
        </div>
      )}

      {flash && (
        <p className="admin-success" role="status">
          {flash}
        </p>
      )}
      {(error || problem) && (
        <p className="admin-error" role="alert">
          {error || problem}
        </p>
      )}

      <div className="admin-chat__list" aria-busy={loading}>
        {loading ? (
          <HourglassLoader />
        ) : !error && rows.length === 0 ? (
          <div className="admin-empty">Le chat est vide.</div>
        ) : (
          rows.map((m) => (
            <article className="admin-card admin-chat__row" key={m.id}>
              <div className="admin-card__top">
                <div>
                  <strong>{m.pseudo || `ID ${m.user_id}`}</strong>
                  <p className="admin-muted">
                    {date(m.created_at)} · {m.audio_ms != null ? "Vocal" : "Message"} #{m.id}
                  </p>
                </div>
              </div>
              <div className="admin-chat__msg">
                <ChatMessage message={m} mine={false} showName={false} />
              </div>
              {confirm === m.id ? (
                <div className="admin-confirm">
                  <strong>Supprimer ce {m.audio_ms != null ? "vocal" : "message"} ?</strong>
                  {busy && <HourglassLoader />}
                  <div className="admin-actions">
                    <button type="button" className="admin-btn" disabled={busy} onClick={() => setConfirm(null)}>
                      Annuler
                    </button>
                    <button type="button" className="admin-btn admin-btn--danger" disabled={busy} onClick={() => removeOne(m.id)}>
                      {busy ? "Suppression…" : "Oui, supprimer"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="admin-btn admin-btn--danger"
                  disabled={busy}
                  onClick={() => {
                    setConfirm(m.id);
                    setFlash("");
                  }}
                >
                  Supprimer
                </button>
              )}
            </article>
          ))
        )}
      </div>

      {!loading && !error && total > PAGE && (
        <div className="admin-pagination">
          <button type="button" className="admin-btn" disabled={offset === 0 || busy} onClick={() => setOffset((n) => Math.max(0, n - PAGE))}>
            Precedent
          </button>
          <span>
            {Math.min(offset + 1, total)}–{Math.min(offset + PAGE, total)} / {total}
          </span>
          <button type="button" className="admin-btn" disabled={offset + PAGE >= total || busy} onClick={() => setOffset((n) => n + PAGE)}>
            Suivant
          </button>
        </div>
      )}
    </section>
  );
}
