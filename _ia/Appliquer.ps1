# Appliquer.ps1 - copie les fichiers du zip dans les projets (sauvegarde avant ecrasement)
param(
  [Parameter(Mandatory = $true)][string]$Frontend,
  [string]$Backend = ''
)
$ErrorActionPreference = 'Stop'
$racine = $PSScriptRoot
$stamp = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'

function Info($m, $c = 'Gray') { Write-Host $m -ForegroundColor $c }

function Ajouter-Gitignore($projet) {
  $gi = Join-Path $projet '.gitignore'
  $ligne = '.maf-sauvegardes/'
  if (Test-Path $gi) {
    $contenu = [IO.File]::ReadAllText($gi)
    if ($contenu -notmatch '(?m)^\.maf-sauvegardes/?\s*$') {
      $sep = ''
      if (-not $contenu.EndsWith("`n")) { $sep = "`r`n" }
      [IO.File]::AppendAllText($gi, $sep + $ligne + "`r`n")
    }
  } else {
    [IO.File]::WriteAllText($gi, $ligne + "`r`n")
  }
}

function Appliquer-Projet($nom, $source, $projet) {
  if (-not (Test-Path $source)) { return $false }
  if ([string]::IsNullOrWhiteSpace($projet)) {
    throw "Le zip contient des fichiers '$nom' mais aucun dossier '$nom' n'a ete indique."
  }
  if (-not (Test-Path (Join-Path $projet 'package.json'))) {
    throw "Dossier $nom introuvable ou invalide : $projet (package.json manquant)."
  }
  Info "== $nom : $projet" 'Cyan'
  Ajouter-Gitignore $projet
  $sauv = Join-Path $projet ".maf-sauvegardes\$stamp"
  $packageChange = $false
  $base = (Resolve-Path $source).Path.TrimEnd('\')

  Get-ChildItem -Path $source -Recurse -File | ForEach-Object {
    $rel = $_.FullName.Substring($base.Length + 1)
    $cible = Join-Path $projet $rel
    if (Test-Path $cible) {
      $a = (Get-FileHash $_.FullName -Algorithm SHA256).Hash
      $b = (Get-FileHash $cible -Algorithm SHA256).Hash
      if ($a -eq $b) { Info "  = $rel" 'DarkGray'; return }
      $copieSauv = Join-Path $sauv $rel
      New-Item -ItemType Directory -Force -Path (Split-Path $copieSauv) | Out-Null
      Copy-Item $cible $copieSauv -Force
      Copy-Item $_.FullName $cible -Force
      Info "  ~ $rel" 'Yellow'
    } else {
      New-Item -ItemType Directory -Force -Path (Split-Path $cible) | Out-Null
      Copy-Item $_.FullName $cible -Force
      Info "  + $rel" 'Green'
    }
    if ($rel -eq 'package.json') { $script:packageChange = $true }
  }

  # Suppressions demandees (deplacees dans la sauvegarde, pas effacees)
  $liste = Join-Path $racine 'fichiers\a-supprimer.txt'
  if (Test-Path $liste) {
    foreach ($ligne in (Get-Content $liste)) {
      $l = $ligne.Trim()
      if ($l -eq '' -or -not $l.StartsWith("$nom/")) { continue }
      $rel = $l.Substring($nom.Length + 1).Replace('/', '\')
      $cible = Join-Path $projet $rel
      if (Test-Path $cible) {
        $copieSauv = Join-Path $sauv $rel
        New-Item -ItemType Directory -Force -Path (Split-Path $copieSauv) | Out-Null
        Move-Item $cible $copieSauv -Force
        Info "  - $rel" 'Magenta'
      }
    }
  }

  if ($script:packageChange) {
    Info "  package.json modifie : npm install..." 'Cyan'
    Push-Location $projet
    try {
      & npm install
      if ($LASTEXITCODE -ne 0) { throw "npm install a echoue dans $nom." }
    } finally { Pop-Location }
  }
  return $true
}

try {
  $script:packageChange = $false
  $f = Appliquer-Projet 'frontend' (Join-Path $racine 'fichiers\frontend') $Frontend
  $script:packageChange = $false
  $b = Appliquer-Projet 'backend' (Join-Path $racine 'fichiers\backend') $Backend
  if (-not $f -and -not $b) { throw "Le zip ne contient aucun fichier a installer." }
  Info "Installation terminee." 'Green'
  exit 0
} catch {
  Write-Host "ERREUR : $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
