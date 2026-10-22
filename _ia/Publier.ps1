# Publier.ps1 - build de controle puis git commit + push des projets touches par le zip
param(
  [Parameter(Mandatory = $true)][string]$Frontend,
  [string]$Backend = ''
)
$ErrorActionPreference = 'Continue'
$racine = $PSScriptRoot

function Info($m, $c = 'Gray') { Write-Host $m -ForegroundColor $c }
function Echec($m) { Write-Host "ERREUR : $m" -ForegroundColor Red; exit 1 }

$message = 'Mise a jour'
$fm = Join-Path $racine 'message.txt'
if (Test-Path $fm) {
  $m = (Get-Content $fm -Raw).Trim()
  if ($m) { $message = $m }
}

function Publier-Projet($nom, $projet, $avecBuild) {
  if (-not (Test-Path (Join-Path $racine "fichiers\$nom"))) { return }
  Info "== $nom" 'Cyan'
  if (-not (Test-Path (Join-Path $projet '.git'))) {
    Info "  Pas un depot git : publication ignoree (fichiers deja installes)." 'Yellow'
    return
  }
  Push-Location $projet
  try {
    $etat = (& git status --porcelain) -join "`n"
    if (-not $etat.Trim()) { Info "  Rien a publier." 'DarkGray'; return }

    if ($avecBuild) {
      Info "  Build de controle..." 'Cyan'
      & npm run build
      if ($LASTEXITCODE -ne 0) { Echec "Le build a echoue ($nom). Rien n'a ete publie." }
    }

    & git add -A
    if ($LASTEXITCODE -ne 0) { Echec "git add a echoue ($nom)." }
    & git commit -m $message
    if ($LASTEXITCODE -ne 0) { Echec "git commit a echoue ($nom)." }
    & git push
    if ($LASTEXITCODE -ne 0) { Echec "git push a echoue ($nom). Verifie ta connexion / tes acces GitHub." }
    Info "  Publie : $message" 'Green'
  } finally { Pop-Location }
}

if (-not (Test-Path $Frontend)) { Echec "Dossier front introuvable : $Frontend" }
Publier-Projet 'frontend' $Frontend $true
if ($Backend) {
  if (-not (Test-Path $Backend)) { Echec "Dossier back introuvable : $Backend" }
  Publier-Projet 'backend' $Backend $false
}
Info "Publication terminee." 'Green'
exit 0
