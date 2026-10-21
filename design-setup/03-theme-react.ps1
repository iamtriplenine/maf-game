# 03 - Pont vers l'existant, index CSS, hook de theme et bouton de theme
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

Write-File 'src\styles\bridge.css' @'
/* ============ PONT : applique le nouveau design a l'existant ============
   Fichier optionnel : supprime son @import dans index.css pour revenir
   a l'ancien look (App.css n'est pas modifie). */

.topbar { border-bottom-color: var(--border); }
.brand { color: var(--text); font-family: var(--font-tech); font-weight: 400; letter-spacing: .12em; }
.topbar > span, .intro p, .help { color: var(--text-dim); }
.eyebrow, .character-card .card-action { color: var(--accent); }
h1 { font-family: var(--font-tech); font-weight: 400; text-transform: uppercase; letter-spacing: .02em; }

.character-card {
  color: var(--text);
  background: var(--glass);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  -webkit-backdrop-filter: blur(var(--blur));
  backdrop-filter: blur(var(--blur));
  transition: transform var(--t) var(--ease), border-color var(--t) var(--ease), box-shadow var(--t) var(--ease);
}
.character-card:hover { transform: translateY(-3px); border-color: var(--accent); }
.character-card.selected { background: var(--accent-soft); border-color: var(--accent); box-shadow: var(--accent-glow); }
.character-card.empty { color: var(--text-faint); background: transparent; border-style: dashed; }
.card-number { color: var(--text-faint); }

.local-badge { color: var(--accent); background: var(--accent-soft); }

.viewer-panel {
  background: var(--glass);
  border: 1px solid var(--border);
  border-radius: var(--r-xl);
  -webkit-backdrop-filter: blur(var(--blur));
  backdrop-filter: blur(var(--blur));
}

.controls button {
  color: var(--text);
  background: var(--glass);
  border: 1px solid var(--border);
  border-radius: var(--r-pill);
  transition: transform var(--t) var(--ease), background var(--t) var(--ease);
}
.controls button:hover { transform: translateY(-2px); }
.controls button.active {
  color: var(--on-accent);
  background: var(--accent-grad);
  border-color: transparent;
  box-shadow: var(--accent-glow);
}
.speed input { accent-color: var(--accent); }
.loading { background: var(--surface); color: var(--text); }
'@

Write-File 'src\styles\index.css' @'
/* Point d'entree du design : importe dans main.jsx */
@import "./tokens.css";
@import "./base.css";
@import "./components.css";
@import "./bridge.css";
'@

Write-File 'src\theme\useTheme.js' @'
import { useCallback, useEffect, useState } from "react";

export const THEMES = ["ciel", "rose"];
const KEY = "maf-theme";

function readTheme() {
  try {
    const saved = localStorage.getItem(KEY);
    return THEMES.includes(saved) ? saved : "ciel";
  } catch {
    return "ciel";
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState(readTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* stockage indisponible : on ignore */
    }
  }, [theme]);

  const setTheme = useCallback((next) => {
    if (THEMES.includes(next)) setThemeState(next);
  }, []);

  const toggle = useCallback(() => {
    setThemeState((current) => (current === "ciel" ? "rose" : "ciel"));
  }, []);

  return { theme, setTheme, toggle };
}
'@

Write-File 'src\components\ThemeToggle.jsx' @'
import { useTheme } from "../theme/useTheme";

const LABELS = { ciel: "Theme bleu ciel", rose: "Theme rose pur" };

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="theme-toggle" role="group" aria-label="Choisir le theme">
      {Object.keys(LABELS).map((name) => (
        <button
          key={name}
          type="button"
          data-t={name}
          aria-label={LABELS[name]}
          aria-pressed={theme === name}
          onClick={() => setTheme(name)}
        />
      ))}
    </div>
  );
}
'@

Write-Host "03 termine." -ForegroundColor Cyan
