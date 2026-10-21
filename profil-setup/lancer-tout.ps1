# A executer depuis la racine du projet :
#   powershell -ExecutionPolicy Bypass -File .\profil-setup\lancer-tout.ps1
$ErrorActionPreference = 'Stop'
foreach ($s in '01-comptes.ps1','02-page-profil.ps1','03-brancher.ps1') {
  Write-Host "`n>>> $s" -ForegroundColor Cyan
  & (Join-Path $PSScriptRoot $s)
}
Write-Host "`nTout est en place. Lance : npm run dev" -ForegroundColor Green
