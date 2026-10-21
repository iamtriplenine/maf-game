# 01 - Themes (bleu ciel / rose pur) + base
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

Write-File 'src\styles\tokens.css' @'
@import url("https://fonts.googleapis.com/css2?family=Michroma&family=Inter:wght@400;500;600;700&display=swap");

/* ============ MAF GAME - TOKENS ============
   Deux themes : "ciel" (bleu ciel) et "rose" (rose pur).
   Changer de theme = changer <html data-theme="ciel|rose">.
   Tout le reste du design lit ces variables. */

:root {
  --font-ui: Inter, "Segoe UI", system-ui, sans-serif;
  --font-tech: "Michroma", "Orbitron", "Segoe UI", sans-serif;

  --r-sm: 12px;
  --r-md: 18px;
  --r-lg: 26px;
  --r-xl: 34px;
  --r-pill: 999px;

  --s-1: 4px;
  --s-2: 8px;
  --s-3: 12px;
  --s-4: 16px;
  --s-5: 24px;
  --s-6: 32px;

  --blur: 18px;
  --ease: cubic-bezier(.2, .8, .2, 1);
  --t: .22s;
}

/* ---------- Theme BLEU CIEL (defaut) ---------- */
:root,
[data-theme="ciel"] {
  --bg: #07121f;
  --bg-2: #0c1e31;
  --surface: #11263c;
  --glass: rgba(150, 205, 255, .10);
  --glass-strong: rgba(150, 205, 255, .18);
  --border: rgba(160, 215, 255, .20);
  --overlay: rgba(4, 14, 26, .78);

  --text: #eaf6ff;
  --text-dim: #9db8cf;
  --text-faint: #6c8499;

  --accent: #2bb8ff;
  --accent-2: #7fdcff;
  --accent-deep: #0a7fd6;
  --accent-soft: rgba(43, 184, 255, .18);
  --accent-grad: linear-gradient(135deg, #8fe3ff 0%, #2bb8ff 48%, #0a7fd6 100%);
  --accent-glow: 0 10px 30px rgba(43, 184, 255, .45);
  --on-accent: #031624;

  --hero-grad: linear-gradient(160deg, #1b4d78 0%, #2f86bd 55%, #9bd8ff 125%);
  --glow-1: rgba(43, 184, 255, .22);
  --glow-2: rgba(127, 220, 255, .12);
}

/* ---------- Theme ROSE PUR ---------- */
[data-theme="rose"] {
  --bg: #15070f;
  --bg-2: #230c1b;
  --surface: #331228;
  --glass: rgba(255, 150, 205, .10);
  --glass-strong: rgba(255, 150, 205, .18);
  --border: rgba(255, 170, 215, .22);
  --overlay: rgba(26, 4, 16, .78);

  --text: #fff0f8;
  --text-dim: #d0a3bd;
  --text-faint: #9a6c85;

  --accent: #ff2e93;
  --accent-2: #ff7fc0;
  --accent-deep: #cc0a6c;
  --accent-soft: rgba(255, 46, 147, .20);
  --accent-grad: linear-gradient(135deg, #ff9ccf 0%, #ff2e93 48%, #cc0a6c 100%);
  --accent-glow: 0 10px 30px rgba(255, 46, 147, .5);
  --on-accent: #ffffff;

  --hero-grad: linear-gradient(160deg, #5a1240 0%, #b3207a 55%, #ff9ccf 125%);
  --glow-1: rgba(255, 46, 147, .24);
  --glow-2: rgba(255, 127, 192, .12);
}
'@

Write-File 'src\styles\base.css' @'
/* ============ MAF GAME - BASE ============ */

*, *::before, *::after { box-sizing: border-box; }

html {
  color-scheme: dark;
  background: var(--bg);
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
  font-family: var(--font-ui);
  color: var(--text);
  background:
    radial-gradient(900px 520px at 12% -10%, var(--glow-1), transparent 62%),
    radial-gradient(760px 520px at 105% 8%, var(--glow-2), transparent 60%),
    linear-gradient(180deg, var(--bg) 0%, var(--bg-2) 100%);
  background-attachment: fixed;
  -webkit-font-smoothing: antialiased;
  transition: background-color var(--t) var(--ease), color var(--t) var(--ease);
}

button, input { font: inherit; color: inherit; }
button { cursor: pointer; }
button:disabled { cursor: default; opacity: .45; }

a { color: var(--accent-2); }

button:focus-visible, a:focus-visible, input:focus-visible {
  outline: 3px solid var(--accent);
  outline-offset: 4px;
}

::selection { background: var(--accent); color: var(--on-accent); }

/* Titres "techwear" : large, majuscules, lettres espacees */
.title-tech {
  font-family: var(--font-tech);
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: .04em;
  line-height: 1.1;
}

.muted { color: var(--text-dim); }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { transition: none !important; animation: none !important; }
}
'@

Write-Host "01 termine." -ForegroundColor Cyan
