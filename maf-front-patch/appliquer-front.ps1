# MAF front : connexion / inscription avec pseudo + code, relies au serveur, avec animation d'attente
# Lance ce script depuis le dossier maf-game (celui qui contient package.json et src).
param([string]$Api = '')
$ErrorActionPreference = 'Stop'
$root = (Get-Location).Path
if (-not (Test-Path (Join-Path $root 'package.json')) -or -not (Test-Path (Join-Path $root 'src'))) {
  Write-Host "ERREUR : lance ce script depuis le dossier du projet (celui qui contient package.json et src)." -ForegroundColor Red
  exit 1
}
$utf8 = New-Object Text.UTF8Encoding($false)
$files = Join-Path $PSScriptRoot 'files'
$src = Join-Path $root 'src'

function Backup($path) {
  $bak = "$path.avant-comptes.bak"
  if ((Test-Path $path) -and -not (Test-Path $bak)) { Copy-Item $path $bak }
}

# Remplacements exacts dans un fichier (gere les fins de ligne Windows)
function Patch-File($path, $pairs) {
  $raw = [IO.File]::ReadAllText($path)
  $crlf = $raw.Contains("`r`n")
  $txt = $raw -replace "`r`n", "`n"
  foreach ($p in $pairs) {
    if ($p[1] -ne '' -and $txt.Contains($p[1])) { Write-Host "  = deja fait : $($p[2])" -ForegroundColor DarkGray; continue }
    if (-not $txt.Contains($p[0])) {
      if ($p[1] -eq '') { Write-Host "  = deja fait : $($p[2])" -ForegroundColor DarkGray; continue }
      throw "Texte introuvable dans $(Split-Path $path -Leaf) : $($p[2])"
    }
    $txt = $txt.Replace($p[0], $p[1])
    Write-Host "  + $($p[2])" -ForegroundColor Green
  }
  return @{ Text = $txt; Crlf = $crlf }
}
function Save-File($path, $result) {
  $txt = $result.Text
  if ($result.Crlf) { $txt = $txt -replace "`n", "`r`n" }
  [IO.File]::WriteAllText($path, $txt, $utf8)
}

# ---------- 1) adresse du serveur (src/api/config.js) ----------
$config = Join-Path $src 'api/config.js'
if (Test-Path $config) {
  Write-Host "  = config.js deja la (adresse du serveur conservee)" -ForegroundColor DarkGray
} else {
  if (-not $Api) { $Api = Read-Host "Adresse de ton serveur Render (ex : https://maf-backend.onrender.com)" }
  $Api = $Api.Trim().TrimEnd('/')
  if ($Api -notmatch '^https?://') { Write-Host "ERREUR : l'adresse doit commencer par https://" -ForegroundColor Red; exit 1 }
  [IO.File]::WriteAllText($config, "// Adresse du serveur (backend Render)`r`nexport const API_URL = `"$Api`";`r`n", $utf8)
  Write-Host "  + config.js cree ($Api)" -ForegroundColor Green
}

# ---------- 2) fichiers remplaces / nouveaux ----------
Backup (Join-Path $src 'api/accounts.js')
Copy-Item (Join-Path $files 'accounts.js') (Join-Path $src 'api/accounts.js') -Force
Write-Host "  + api/accounts.js (appelle le serveur)" -ForegroundColor Green
Backup (Join-Path $src 'auth/useSession.js')
Copy-Item (Join-Path $files 'useSession.js') (Join-Path $src 'auth/useSession.js') -Force
Write-Host "  + auth/useSession.js" -ForegroundColor Green
Copy-Item (Join-Path $files 'AuthForm.jsx') (Join-Path $src 'components/AuthForm.jsx') -Force
Write-Host "  + components/AuthForm.jsx (pseudo + code + animation)" -ForegroundColor Green

# ---------- 3) ProfilePage.jsx (petites modifications) ----------
$page = Join-Path $src 'pages/ProfilePage.jsx'
Backup $page
$r = Patch-File $page @(
  ,@('import { useState } from "react";', 'import { useEffect, useState } from "react";', 'import useEffect')
  ,@('import { CODE_LENGTH } from "../api/accounts";', "import AuthForm from `"../components/AuthForm`";`nimport { wakeServer } from `"../api/accounts`";", 'import AuthForm / wakeServer')
  ,@("const formatId = (id) => id.replace(/(\d{4})(\d{3})(\d{3})/, `"`$1 `$2 `$3`");`n`n", '', 'ancien formatId')
  ,@('const close = () => setSheet(null);', "const close = () => setSheet(null);`n  useEffect(() => {`n    wakeServer();`n  }, []);", 'reveil du serveur au chargement')
  ,@('<CodeForm', '<AuthForm', 'formulaire AuthForm')
  ,@('async (code) => {', 'async (pseudo, code) => {', 'onSubmit(pseudo, code)')
  ,@('await login(code);', 'await login(pseudo, code);', 'login(pseudo, code)')
  ,@('await register(code);', 'await register(pseudo, code);', 'register(pseudo, code)')
  ,@('<small>ID</small>', '<small>PSEUDO</small>', 'bouton PSEUDO')
  ,@('{formatId(session.id)}', '{session.pseudo}', 'affichage du pseudo')
  ,@('Identifiant : ', 'Pseudo : ', 'libelle Pseudo')
  ,@('Connecte-toi avec ton code a 10 chiffres pour retrouver ton compte.', 'Connecte-toi avec ton pseudo et ton code pour retrouver ton compte.', 'texte invite')
  ,@('La recharge sera disponible quand le backend sera en place.', 'La recharge via Wave arrive bientot.', 'texte recharge')
)
# Supprime l'ancien formulaire CodeForm (remplace par AuthForm)
$r.Text = [regex]::Replace($r.Text, '(?s)function CodeForm\(\{ mode, onSubmit \}\) \{.*?\n\}\n\n(?=export default function ProfilePage)', '')
if ($r.Text.Contains('function CodeForm')) { throw "Ancien CodeForm non supprime dans ProfilePage.jsx" }
Save-File $page $r

# ---------- 4) styles (ajoutes a la fin de profile.css) ----------
$css = Join-Path $src 'styles/profile.css'
$cssRaw = [IO.File]::ReadAllText($css)
if ($cssRaw.Contains('maf-spin')) {
  Write-Host "  = styles deja ajoutes" -ForegroundColor DarkGray
} else {
  Backup $css
  $add = ([IO.File]::ReadAllText((Join-Path $files 'auth.css'))) -replace "`r?`n", "`r`n"
  [IO.File]::WriteAllText($css, $cssRaw.TrimEnd() + "`r`n" + $add, $utf8)
  Write-Host "  + styles ajoutes (spinner, bandeau d'attente)" -ForegroundColor Green
}

Write-Host ""
Write-Host "Front pret. Lance le site (npm run dev) pour tester, puis git push." -ForegroundColor Cyan
