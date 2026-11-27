import { useEffect, useRef, useState } from "react";
import { IconGlobe } from "../components/Icons";
import { currentSession, currentToken, refreshSession } from "../api/accounts";
import { API_URL } from "../api/config";
import { SKINS } from "../characters/skins";
import "../styles/nav.css";
import "../styles/world.css";

// Page "World" : on arrive sur un ecran calme avec un bouton "Acceder au monde".
// Le jeu (Viva City 3D, dans public/viva-city) ne s'ouvre qu'apres l'appui sur ce bouton,
// en plein ecran, pour ne jamais le lancer par erreur en touchant l'onglet World.
const GAME_URL = `${import.meta.env.BASE_URL}coastal-city/index.html?v=32`;

const tryFullscreen = () => {
  try {
    const el = document.documentElement;
    if (el.requestFullscreen && !document.fullscreenElement) {
      const p = el.requestFullscreen();
      if (p && p.catch) p.catch(() => {});
    }
  } catch {
    /* pas grave : le jeu reste en plein ecran dans la page */
  }
};

const leaveFullscreen = () => {
  try {
    if (window.screen.orientation && window.screen.orientation.unlock) window.screen.orientation.unlock();
  } catch {
    /* optionnel */
  }
  try {
    if (document.fullscreenElement && document.exitFullscreen) {
      const p = document.exitFullscreen();
      if (p && p.catch) p.catch(() => {});
    }
  } catch {
    /* pas grave */
  }
};

// MAF-WORLD-ROTATE-V1 : le jeu (iframe) demande ici de verrouiller l'ecran a l'horizontale, car seule
// cette page est en plein ecran. iPhone / Safari ne savent pas verrouiller : on repond "unsupported".
const lockLandscape = async (lock) => {
  const so = window.screen && window.screen.orientation;
  try {
    if (!lock) {
      if (so && so.unlock) so.unlock();
      return { ok: true, locked: false };
    }
    if (!so || !so.lock) return { ok: false, reason: "unsupported" };
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen();
    }
    await so.lock("landscape");
    return { ok: true, locked: true };
  } catch {
    return { ok: false, reason: "denied" };
  }
};

// Les autres joueurs du monde apparaissent avec le skin de leur profil : le jeu (iframe) a besoin
// de savoir quel fichier 3D correspond a chaque skin.
const buildSkinTable = () => {
  const out = {};
  for (const s of SKINS) {
    out[s.id] = {
      file: s.file,
      format: s.format,
      rotation: s.rotation || 0,
      movementType: s.movementType,
      walkFile: s.walkFile || null,
      runFile: s.runFile || null,
    };
  }
  out["mutant-run"] = out["mutant-swipe"];
  out["mutant-attack"] = out["mutant-swipe"];
  return out;
};

// Voitures que ce joueur peut conduire dans le World (la Porsche est pour tous ; le compte proprietaire a tout).
const worldCarsFor = (s) => {
  const own = s && Array.isArray(s.owned_cars) ? s.owned_cars.filter((x) => typeof x === "string") : [];
  if (s && s.account_role === "owner" && !own.includes("lamborghini-veneno-roadster")) own.push("lamborghini-veneno-roadster");
  return own;
};

export default function WorldPage() {
  const [playing, setPlaying] = useState(false);
  const frameRef = useRef(null);

  const enter = () => {
    tryFullscreen();
    try {
      window.history.pushState({ mafWorld: true }, "");
    } catch {
      /* pas grave */
    }
    setPlaying(true);
  };

  const leave = () => {
    // Le bouton retour du telephone et le bouton de sortie font la meme chose.
    if (window.history.state && window.history.state.mafWorld) window.history.back();
    else setPlaying(false);
  };

  useEffect(() => {
    if (!playing) return undefined;
    const onPop = () => setPlaying(false);
    // Le bouton de sortie est maintenant dans le menu du jeu (iframe) : il nous previent par message.
    const onMsg = (e) => {
      if (e.origin !== window.location.origin || !e.data) return;
      if (e.data.mafWorldWalletChanged) {
        void refreshSession(); // le solde reel a change dans le World : on met a jour le profil
        return;
      }
      if (e.data.mafWorldOrientation) {
        const src = e.source;
        void lockLandscape(e.data.mafWorldOrientation === "lock").then((result) => {
          try { src.postMessage({ mafWorldOrientationResult: result }, window.location.origin); } catch { /* iframe fermee */ }
        });
        return;
      }
      if (e.data.mafWorldExit) {
        leave();
        return;
      }
      if (e.data.mafWorldOpenRoom) {
        // Salon accepte dans la ville : on quitte le monde et on ouvre le salon dans l'onglet Game.
        const id = Number(e.data.mafWorldOpenRoom.id);
        const uid = (currentSession() || {}).id;
        if (Number.isSafeInteger(id) && id > 0 && uid) {
          try { sessionStorage.setItem("maf:pending-room-to-open", JSON.stringify({ id, uid })); } catch { /* optionnel */ }
          setPlaying(false);
          window.location.hash = "#game";
        }
        return;
      }
      if (e.data.mafWorldHello && frameRef.current && e.source === frameRef.current.contentWindow) {
        const token = currentToken();
        if (!token) return; // visiteur non connecte : pas de multijoueur
        e.source.postMessage(
          { mafWorldInit: { api: API_URL, token, base: import.meta.env.BASE_URL, skins: buildSkinTable(), mySkin: (currentSession() || {}).skin_id || null, myCars: worldCarsFor(currentSession()) } },
          window.location.origin
        );
      }
    };
    window.addEventListener("popstate", onPop);
    window.addEventListener("message", onMsg);
    // Si le joueur quitte le plein ecran, l'orientation est liberee : on previent le jeu pour remettre le bouton a jour.
    const onFs = () => {
      if (document.fullscreenElement) return;
      try {
        frameRef.current.contentWindow.postMessage({ mafWorldOrientationResult: { ok: true, locked: false, silent: true } }, window.location.origin);
      } catch { /* pas grave */ }
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("message", onMsg);
      leaveFullscreen();
    };
  }, [playing]);

  return (
    <>
      <main className="game-page world-page">
        <header className="game-page__head">
          <h1>
            <IconGlobe size={36} />
            World
          </h1>
          <p>Une ville 3D a explorer.</p>
        </header>
        <section className="world-start-guide" aria-labelledby="world-start-title">
          <div className="world-start-intro">
            <span className="world-start-kicker">GUIDE DE DÉPART</span>
            <h2 id="world-start-title">Bienvenue dans World</h2>
            <p>Une ville vivante où les joueurs explorent, consomment, produisent et commercent. Tu commences comme consommateur, puis tu peux devenir entrepreneur.</p>
          </div>
          <div className="world-start-grid">
            <article><span aria-hidden="true">💵</span><h3>Ton portefeuille</h3><p>Le dollar ($) est la monnaie de World. Tu peux convertir ton solde réel : 100 FCFA = $65 000. Prévois un budget avant de faire tes achats.</p></article>
            <article><span aria-hidden="true">⚡</span><h3>Ton énergie</h3><p>Surveille ton énergie pendant tes déplacements. Le système alimentaire prévu utilisera des baguettes à $12 000, chacune restaurant 50 % d’énergie. Deux baguettes couvriront une journée au repos.</p><small>Alimentation : à venir</small></article>
            <article><span aria-hidden="true">🗺️</span><h3>Explore la ville</h3><p>Utilise la carte pour repérer les lieux, les terrains et les commerces. Approche-toi des hologrammes pour découvrir les actions disponibles ; le point d’interrogation explique leur fonctionnement.</p></article>
            <article><span aria-hidden="true">🌱</span><h3>Deviens agriculteur</h3><p>Achète un terrain et des graines ($100 les 10). Sème du blé sur ton terrain, attends 12 heures, même hors connexion, puis récolte. Vends ton blé aux usines au tarif fixe de $3 500 par unité, selon leurs commandes disponibles.</p></article>
            <article><span aria-hidden="true">🏭</span><h3>Deviens entrepreneur</h3><p>Les usines coûtent $150 000 ou $200 000. Le propriétaire préfinance ses achats de blé et transforme son stock en farine. La vente de farine à $8 000 aux boulangeries est prévue pour une prochaine étape.</p></article>
            <article><span aria-hidden="true">🥖</span><h3>Une économie entre joueurs</h3><p>Les agriculteurs alimentent les usines, puis les boulangeries alimenteront les consommateurs. Les prix sont fixés par le jeu. Les revenus dépendent des ventes réellement réalisées.</p></article>
          </div>
          <div className="world-start-note"><strong>Avant de commencer</strong><p>Explore à ton rythme. Retrouve les tarifs et les détails des activités dans le menu burger → Paramètres → Guide World.</p></div>
        </section>
        <button type="button" className="world-enter" onClick={enter}>
          Entrer dans le monde
        </button>
      </main>

      {playing && (
        <div className="world-play">
          <iframe
            ref={frameRef}
            title="Viva City"
            src={GAME_URL}
            allow="fullscreen; autoplay"
            onLoad={() => {
              try {
                frameRef.current.contentWindow.focus();
              } catch {
                /* pas grave */
              }
            }}
          />
        </div>
      )}
    </>
  );
}
