# 03 - La page profil devient la page d'accueil ; l'ancienne page passe en 'Studio 3D'
$ErrorActionPreference = 'Stop'
$root = (Get-Location).Path
if (-not (Test-Path "$root\package.json") -or -not (Test-Path "$root\src")) {
  Write-Host "ERREUR : lance ce script depuis le dossier du projet (celui qui contient package.json et src)." -ForegroundColor Red
  exit 1
}
function Write-File($rel, $content) {
  $p = Join-Path $root $rel
  $d = Split-Path $p
  if (-not (Test-Path $d)) { New-Item -ItemType Directory -Path $d -Force | Out-Null }
  [IO.File]::WriteAllText($p, $content, (New-Object Text.UTF8Encoding($false)))
  Write-Host "  + $rel" -ForegroundColor Green
}

$nl = "`r`n"
$app = Join-Path $root 'src\App.jsx'
$studio = Join-Path $root 'src\pages\Studio.jsx'
$txt = [IO.File]::ReadAllText($app)

if ($txt.Contains('ProfilePage')) {
  Write-Host "  = App.jsx deja branche" -ForegroundColor DarkGray
  exit 0
}

if (-not (Test-Path $studio)) {
  # Copie de l'ancienne page, avec chemins corriges et bouton retour
  $t = $txt.Replace('from "./', 'from "../').Replace("from './", "from '../")
  $t = $t.Replace('import "./App.css"', 'import "../App.css"')
  $t = $t.Replace('export default function App()', 'export default function Studio({ onBack })')
  $t = $t.Replace('<header className="topbar">', '<header className="topbar">' + $nl + '        <button type="button" className="btn btn--sm btn--glass" onClick={onBack}>&larr; Profil</button>')
  if (-not $t.Contains('Studio({ onBack })') -or -not $t.Contains('onClick={onBack}')) {
    Write-Host "ERREUR : App.jsx ne ressemble pas a ce qui est attendu. Rien n'a ete modifie." -ForegroundColor Red
    exit 1
  }
  Write-File 'src\pages\Studio.jsx' $t
}

Copy-Item $app (Join-Path $root 'src\App.avant-profil.bak') -Force
Write-File 'src\App.jsx' @'
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

  return view === "studio" ? (
    <Studio onBack={() => go("profile")} />
  ) : (
    <ProfilePage onOpenStudio={() => go("studio")} />
  );
}
'@
Write-Host "03 termine. Lance : npm run dev" -ForegroundColor Cyan
