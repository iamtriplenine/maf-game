import ZoomLock from "./components/ZoomLock";
import RefreshCube from "./components/RefreshCube";
import BottomNav from "./components/BottomNav";
import ThemeToggle from "./components/ThemeToggle";
import { useEffect, useRef, useState } from "react";
import ProfilePage from "./pages/ProfilePage";
import GamePage from "./pages/GamePage";
import Studio from "./pages/Studio";

const HASHES = { studio: "#studio", game: "#game", profile: "#profil" };
// Ordre de gauche a droite dans la barre du bas (sert au sens du slide)
const ORDER = { game: 0, profile: 1 };

const readView = () => {
  const hash = window.location.hash;
  if (hash === HASHES.studio) return "studio";
  if (hash === HASHES.game) return "game";
  return "profile";
};

export default function App() {
  const [view, setView] = useState(readView);
  const previous = useRef(view);

  useEffect(() => {
    const sync = () => setView(readView());
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  useEffect(() => {
    previous.current = view;
  }, [view]);

  const go = (next) => {
    window.location.hash = HASHES[next] || HASHES.profile;
  };

  // Sens de l'animation : on arrive par la droite si on va vers "Profil",
  // par la gauche si on va vers "Game".
  let direction = "fade";
  if (view in ORDER && previous.current in ORDER && view !== previous.current) {
    direction = ORDER[view] > ORDER[previous.current] ? "right" : "left";
  }

  const showNav = view === "game" || view === "profile";

  return (
    <>
      <ZoomLock />
      <RefreshCube />
      <div key={view} className={`page page--${direction}`}>
        {view === "studio" && <Studio onBack={() => go("profile")} />}
        {view === "game" && <GamePage />}
        {view === "profile" && <ProfilePage onOpenStudio={() => go("studio")} />}
      </div>
      {showNav && (
        <div className="dock">
          <BottomNav value={view} onChange={go} />
          <ThemeToggle />
        </div>
      )}
    </>
  );
}
