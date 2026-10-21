# Lance les 4 scripts a la suite. A executer depuis la racine du projet :
#   powershell -ExecutionPolicy Bypass -File .\design-setup\lancer-tout.ps1
$ErrorActionPreference = 'Stop'
foreach ($s in '01-tokens-et-base.ps1','02-composants.ps1','03-theme-react.ps1','04-brancher.ps1') {
  Write-Host "`n>>> $s" -ForegroundColor Cyan
  & (Join-Path $PSScriptRoot $s)
}
Write-Host "`nTout est en place. Lance : npm run dev" -ForegroundColor Green
