import { useEffect, useState } from "react";

// Indicateur discret : mesure seulement un petit fichier du site, pas le serveur Render.
// Les valeurs expriment une estimation de la qualite du reseau, pas le nombre de barres radio.
const CHECK_INTERVAL_MS = 30000;
const TIMEOUT_MS = 3500;
const EMPTY_SIGNAL = { level: 0, state: "checking" };

function levelFromLatency(ms, connection) {
  let level = ms < 230 ? 4 : ms < 550 ? 3 : ms < 1300 ? 2 : 1;
  if (connection) {
    const type = connection.effectiveType;
    if (type === "slow-2g" || type === "2g") level = Math.min(level, 1);
    else if (type === "3g") level = Math.min(level, 2);
    const downlink = Number(connection.downlink);
    if (Number.isFinite(downlink) && downlink > 0) {
      if (downlink < 0.6) level = Math.min(level, 1);
      else if (downlink < 1.5) level = Math.min(level, 2);
      else if (downlink < 2.5) level = Math.min(level, 3);
    }
  }
  return level;
}

function useNetworkSignal() {
  const [signal, setSignal] = useState(() =>
    typeof navigator !== "undefined" && navigator.onLine === false
      ? { level: 0, state: "offline" } : EMPTY_SIGNAL
  );

  useEffect(() => {
    let alive = true;
    let running = false;
    let activeController = null;
    let abortTimer = null;
    const recent = [];
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

    const check = async () => {
      if (!alive || running || document.hidden) return;
      if (!navigator.onLine) {
        recent.length = 0;
        setSignal({ level: 0, state: "offline" });
        return;
      }
      running = true;
      const controller = new AbortController();
      activeController = controller;
      const started = performance.now();
      abortTimer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        // URL differente a chaque mesure pour eviter une ancienne reponse du cache.
        // La requete reste sur le domaine du site et ne reveille pas le backend gratuit.
        const response = await fetch(`/favicon.svg?netcheck=${Date.now()}`, {
          method: "GET", cache: "no-store", signal: controller.signal,
        });
        if (!response.ok) throw new Error("Controle reseau indisponible");
        await response.arrayBuffer();
        const elapsed = performance.now() - started;
        const current = levelFromLatency(elapsed, connection);
        recent.push(current);
        if (recent.length > 3) recent.shift();
        // Moyenne glissante pour eviter que les barres clignotent a chaque verification.
        const level = Math.max(1, Math.min(4, Math.round(recent.reduce((a, b) => a + b, 0) / recent.length)));
        if (alive) setSignal({ level, state: "measured" });
      } catch {
        if (alive) {
          recent.length = 0;
          setSignal({ level: navigator.onLine ? 1 : 0, state: navigator.onLine ? "measured" : "offline" });
        }
      } finally {
        window.clearTimeout(abortTimer);
        if (activeController === controller) activeController = null;
        running = false;
      }
    };

    const offline = () => {
      recent.length = 0;
      activeController?.abort();
      setSignal({ level: 0, state: "offline" });
    };
    const online = () => { void check(); };
    const visible = () => { if (!document.hidden) void check(); };
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    document.addEventListener("visibilitychange", visible);
    connection?.addEventListener?.("change", online);
    const interval = window.setInterval(() => { void check(); }, CHECK_INTERVAL_MS);
    void check();
    return () => {
      alive = false;
      activeController?.abort();
      window.clearTimeout(abortTimer);
      window.clearInterval(interval);
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
      document.removeEventListener("visibilitychange", visible);
      connection?.removeEventListener?.("change", online);
    };
  }, []);
  return signal;
}

const statusText = {
  checking: "Mesure de la connexion en cours",
  offline: "Hors ligne",
};

export default function ProfileIdentity({ pseudo }) {
  const { level, state } = useNetworkSignal();
  const letters = Array.from(String(pseudo || ""));
  const head = letters.slice(0, 5);
  const rest = letters.slice(5).join("");
  const quality = state === "measured"
    ? (level === 1 ? "Connexion tres instable" : level === 2 ? "Connexion moyenne" : level === 3 ? "Bonne connexion" : "Tres bonne connexion")
    : statusText[state];

  return (
    <aside className="profile-id" aria-label="Identite et qualite du reseau">
      <span className="profile-id__caption">PSEUDO</span>
      {letters.length ? (
        <div className="profile-id__username" title={pseudo}>
          <span className="profile-id__access">{pseudo}</span>
          <span className="profile-id__tiles" aria-hidden="true">
            {Array.from({ length: 5 }, (_, i) => (
              <span className={`profile-id__tile${head[i] ? "" : " profile-id__tile--empty"}`} key={i}>{head[i] || "\u00a0"}</span>
            ))}
          </span>
          {rest && <span className="profile-id__extra" aria-hidden="true">{rest}</span>}
        </div>
      ) : <span className="profile-id__guest">Invite</span>}
      <div className={`profile-id__signal profile-id__signal--${state === "checking" ? "pending" : level === 0 || level === 1 ? "red" : level === 2 ? "yellow" : "green"}`}
        role="img" aria-label={`${quality}${state === "measured" ? ` (${level} sur 4 barres)` : ""}`}
        title={quality}>
        <span className="profile-id__signal-bars" aria-hidden="true">
          {[1, 2, 3, 4].map((n) => <i key={n} className={n <= level ? "is-active" : ""} />)}
        </span>
      </div>
    </aside>
  );
}
