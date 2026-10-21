# 04 - Branche le design dans main.jsx, index.html et App.jsx (avec sauvegardes .bak)
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

function Patch($rel, $find, $replace, $marker) {
  $p = Join-Path $root $rel
  if (-not (Test-Path $p)) { Write-Host "  ! $rel introuvable" -ForegroundColor Yellow; return $false }
  $txt = [IO.File]::ReadAllText($p)
  if ($txt.Contains($marker)) { Write-Host "  = $rel (deja fait)" -ForegroundColor DarkGray; return $true }
  if (-not $txt.Contains($find)) { Write-Host "  ! $rel : repere non trouve, a faire a la main (voir LISEZ-MOI)" -ForegroundColor Yellow; return $false }
  if (-not (Test-Path "$p.bak")) { Copy-Item $p "$p.bak" }
  [IO.File]::WriteAllText($p, $txt.Replace($find, $replace), (New-Object Text.UTF8Encoding($false)))
  Write-Host "  ~ $rel" -ForegroundColor Green
  return $true
}
$nl = "`r`n"

# main.jsx : le design est importe APRES App pour passer par-dessus App.css
$null = Patch 'src\main.jsx' "import App from './App.jsx'" ("import App from './App.jsx'" + $nl + "import './styles/index.css'") "styles/index.css"

# index.html : theme applique avant l'affichage (pas de flash)
$script = "    <script>try{var t=localStorage.getItem('maf-theme');document.documentElement.dataset.theme=(t==='rose')?'rose':'ciel'}catch(e){document.documentElement.dataset.theme='ciel'}</script>" + $nl + "  </head>"
$null = Patch 'index.html' "  </head>" $script "maf-theme"

# App.jsx : bouton de theme dans la barre du haut
$ok1 = Patch 'src\App.jsx' 'import CharacterViewer from "./components/CharacterViewer";' ('import CharacterViewer from "./components/CharacterViewer";' + $nl + 'import ThemeToggle from "./components/ThemeToggle";') "ThemeToggle"
$ok2 = Patch 'src\App.jsx' '<span>Studio de personnages</span>' ('<span>Studio de personnages</span>' + $nl + '        <ThemeToggle />') "<ThemeToggle />"

Write-Host "04 termine. Lance : npm run dev" -ForegroundColor Cyan
