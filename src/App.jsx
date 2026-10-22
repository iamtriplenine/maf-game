import ZoomLock from "./components/ZoomLock";
import RefreshCube from "./components/RefreshCube";
import { useEffect, useState } from "react";
import ProfilePage from "./pages/ProfilePage";
import Studio from "./pages/Studio";

const readView = () =>
  window.location.hash === "#studio" ? "studio" : "profile";

export default function App() {
  const [view, setView] = useState(readView);

  useEffect(() => {
    const sync = () => setView(readView());
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const go = (next) => {
    window.location.hash = next === "studio" ? "#studio" : "#profil";
  };

  return <><ZoomLock /><RefreshCube />{view === "studio" ? (
    <Studio onBack={() => go("profile")} />
  ) : (
    <ProfilePage onOpenStudio={() => go("studio")} />
  )}</>;
}