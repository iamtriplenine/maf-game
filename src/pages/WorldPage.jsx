import { useEffect, useRef, useState } from "react";
import { IconGlobe } from "../components/Icons";
import "../styles/nav.css";
import "../styles/world.css";

// Page "World" : on arrive sur un ecran calme avec un bouton "Acceder au monde".
// Le jeu (Viva City 3D, dans public/viva-city) ne s'ouvre qu'apres l'appui sur ce bouton,
// en plein ecran, pour ne jamais le lancer par erreur en touchant l'onglet World.
const GAME_URL = `${import.meta.env.BASE_URL}viva-city/index.html`;

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
    if (document.fullscreenElement && document.exitFullscreen) {
      const p = document.exitFullscreen();
      if (p && p.catch) p.catch(() => {});
    }
  } catch {
    /* pas grave */
  }
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
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
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
        <button type="button" className="world-enter" onClick={enter}>
          Acceder au monde
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
          <button type="button" className="world-exit" onClick={leave} aria-label="Quitter le monde">
            &#10005;
          </button>
        </div>
      )}
    </>
  );
}
