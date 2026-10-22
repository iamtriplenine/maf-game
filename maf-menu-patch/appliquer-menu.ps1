# MAF front : menu du bas (Studio 3D + Deconnexion avec confirmation), icones SVG, theme en une seule icone
# Lance ce script depuis le dossier maf-game (celui qui contient package.json et src).
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
  $bak = "$path.avant-menu.bak"
  if ((Test-Path $path) -and -not (Test-Path $bak)) { Copy-Item $path $bak }
}
function Patch-File($path, $pairs) {
  $raw = [IO.File]::ReadAllText($path)
  $crlf = $raw.Contains("`r`n")
  $txt = $raw -replace "`r`n", "`n"
  foreach ($p in $pairs) {
    $done = $p[1]
    if ($p.Count -ge 4) { $done = $p[3] }
    if ($done -ne '' -and $txt.Contains($done)) { Write-Host "  = deja fait : $($p[2])" -ForegroundColor DarkGray; continue }
    if (-not $txt.Contains($p[0])) { throw "Texte introuvable dans $(Split-Path $path -Leaf) : $($p[2])" }
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

# ---------- 1) icones + theme en une icone ----------
Copy-Item (Join-Path $files 'Icons.jsx') (Join-Path $src 'components/Icons.jsx') -Force
Write-Host "  + components/Icons.jsx (icones SVG)" -ForegroundColor Green
$theme = Join-Path $src 'components/ThemeToggle.jsx'
Backup $theme
Copy-Item (Join-Path $files 'ThemeToggle.jsx') $theme -Force
Write-Host "  + components/ThemeToggle.jsx (une seule icone)" -ForegroundColor Green

# ---------- 2) ProfilePage.jsx ----------
$page = Join-Path $src 'pages/ProfilePage.jsx'
Backup $page

$studioBtn = @'
          <button
            type="button"
            className="btn btn--sm btn--glass"
            onClick={onOpenStudio}
          >
            Studio 3D
          </button>
          <ThemeToggle />
'@
$logoutBtnOld = @'
              onClick={() => {
                logout();
                close();
              }}
            >
              Se deconnecter
'@
$logoutBtnNew = @'
              onClick={() => setSheet("logout")}
            >
              Se deconnecter
'@
$logoutSheet = @'
      <Sheet open={sheet === "logout"} title="Deconnexion" onClose={close}>
        <p className="sheet__text">
          Tu veux vraiment te deconnecter de ton compte ? Pour te reconnecter, il faudra ton pseudo et ton code a 10 chiffres.
        </p>
        <div className="confirm-actions">
          <button type="button" className="btn btn--glass" onClick={close}>
            Annuler
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              logout();
              close();
            }}
          >
            Oui, me deconnecter
          </button>
        </div>
      </Sheet>

      <Sheet open={sheet === "recharge"} title="Recharger" onClose={close}>
'@

$r = Patch-File $page @(
  ,@('import ThemeToggle from "../components/ThemeToggle";',
     "import ThemeToggle from `"../components/ThemeToggle`";`nimport { IconCube, IconLogin, IconLogout, IconPlus, IconUserPlus } from `"../components/Icons`";",
     'import des icones')
  ,@(($studioBtn -replace "`r`n", "`n").TrimEnd("`n"), '          <ThemeToggle />', 'bouton Studio 3D retire du haut', "<div className=`"profile__bar`">`n          <ThemeToggle />")
  ,@('+ Recharger', "<IconPlus />`n                Recharger", 'icone Recharger')
  ,@("`n                Login`n", "`n                <IconLogin />`n                Login`n", 'icone Login')
  ,@("`n                Sign Up`n", "`n                <IconUserPlus />`n                Sign Up`n", 'icone Sign Up')
  ,@(($logoutBtnOld -replace "`r`n", "`n").TrimEnd("`n"), ($logoutBtnNew -replace "`r`n", "`n").TrimEnd("`n"), 'Mon compte : deconnexion avec confirmation')
  ,@('      <Sheet open={sheet === "recharge"} title="Recharger" onClose={close}>',
     ($logoutSheet -replace "`r`n", "`n").TrimEnd("`n"),
     'fenetre de confirmation de deconnexion')
)

# Panneau du bas : on remplace tout le bloc (puce "Connecte" + Solde) par le menu
$newPanel = @'
<section className="profile__panel" aria-label="Menu">
          {!session && (
            <p className="profile__hint">
              Connecte-toi avec ton pseudo et ton code pour retrouver ton compte.
            </p>
          )}
          <div className="menu-grid">
            <button type="button" className="menu-btn" onClick={onOpenStudio}>
              <IconCube />
              <span>Studio 3D</span>
            </button>
            {session && (
              <button
                type="button"
                className="menu-btn menu-btn--danger"
                onClick={() => setSheet("logout")}
              >
                <IconLogout />
                <span>Deconnexion</span>
              </button>
            )}
          </div>
        </section>
'@
$newPanel = ($newPanel -replace "`r`n", "`n").TrimEnd("`n")
if ($r.Text.Contains('menu-grid')) {
  Write-Host "  = deja fait : menu du bas" -ForegroundColor DarkGray
} else {
  $re = [regex]'(?s)<section className="profile__panel">.*?</section>'
  if (-not $re.IsMatch($r.Text)) { throw "Panneau du bas introuvable dans ProfilePage.jsx" }
  $r.Text = $re.Replace($r.Text, { param($m) $newPanel }, 1)
  Write-Host "  + menu du bas (Studio 3D + Deconnexion), puce Connecte et Solde retires" -ForegroundColor Green
}
Save-File $page $r

# ---------- 3) styles ----------
$css = Join-Path $src 'styles/profile.css'
$cssRaw = [IO.File]::ReadAllText($css)
if ($cssRaw.Contains('menu-grid')) {
  Write-Host "  = styles deja ajoutes" -ForegroundColor DarkGray
} else {
  Backup $css
  $add = ([IO.File]::ReadAllText((Join-Path $files 'menu.css'))) -replace "`r?`n", "`r`n"
  [IO.File]::WriteAllText($css, $cssRaw.TrimEnd() + "`r`n" + $add, $utf8)
  Write-Host "  + styles du menu ajoutes" -ForegroundColor Green
}

Write-Host ""
Write-Host "Termine. Teste avec npm run dev, puis git push." -ForegroundColor Cyan
