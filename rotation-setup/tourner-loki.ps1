# Loki : glisser horizontalement pour le tourner a 360 degres (la marche continue)
$ErrorActionPreference = 'Stop'
$root = (Get-Location).Path
if (-not (Test-Path "$root\package.json") -or -not (Test-Path "$root\src")) {
  Write-Host "ERREUR : lance ce script depuis le dossier du projet (celui qui contient package.json et src)." -ForegroundColor Red
  exit 1
}
$nl = "`r`n"
$utf8 = New-Object Text.UTF8Encoding($false)

# ---------- 1) ProfileStage.jsx ----------
$stage = Join-Path $root 'src\components\ProfileStage.jsx'
$txt = [IO.File]::ReadAllText($stage)

if ($txt.Contains('Turntable')) {
  Write-Host "  = ProfileStage.jsx deja fait" -ForegroundColor DarkGray
} else {
$defs = @'
const BASE_ANGLE = Math.PI - 0.3;

// Glisser horizontalement = tourner le personnage (360 degres, rien d'autre).
function useDragRotation() {
  const angle = useRef(0);
  const lastX = useRef(null);

  const end = () => {
    lastX.current = null;
  };

  const handlers = {
    onPointerDown: (event) => {
      lastX.current = event.clientX;
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove: (event) => {
      if (lastX.current === null) return;
      angle.current += (event.clientX - lastX.current) * 0.012;
      lastX.current = event.clientX;
    },
    onPointerUp: end,
    onPointerCancel: end,
  };

  return { angle, handlers };
}

// Fait pivoter le personnage en douceur ; l'animation de marche continue.
function Turntable({ angle, children, ...props }) {
  const ref = useRef();

  useEffect(() => {
    if (ref.current) ref.current.rotation.y = BASE_ANGLE + angle.current;
  }, [angle]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const smooth = 1 - Math.exp(-delta * 12);
    const target = BASE_ANGLE + angle.current;
    ref.current.rotation.y += (target - ref.current.rotation.y) * smooth;
  });

  return (
    <group ref={ref} {...props}>
      {children}
    </group>
  );
}

'@
  $defs = $defs -replace "`r?`n", $nl

  # Ordre important : les definitions (qui contiennent </group>) sont ajoutees en dernier.
  $pairs = @(
    @('import { Suspense, useEffect, useState } from "react";', 'import { Suspense, useEffect, useRef, useState } from "react";'),
    @('import { Canvas } from "@react-three/fiber";', 'import { Canvas, useFrame } from "@react-three/fiber";'),
    @('<div className="profile__canvas">', '<div className="profile__canvas" {...drag.handlers}>'),
    @('<group rotation={[0, Math.PI - 0.3, 0]} position={[0, -0.05, 0]}>', '<Turntable angle={drag.angle} position={[0, -0.05, 0]}>'),
    @('</group>', '</Turntable>'),
    @('const accent = useAccent();', ('const accent = useAccent();' + $nl + '  const drag = useDragRotation();')),
    @('export default function ProfileStage() {', ($defs + 'export default function ProfileStage() {'))
  )
  foreach ($p in $pairs) {
    if (-not $txt.Contains($p[0])) {
      Write-Host "ERREUR : repere introuvable dans ProfileStage.jsx :" -ForegroundColor Red
      Write-Host "  $($p[0])" -ForegroundColor Red
      Write-Host "Rien n'a ete modifie." -ForegroundColor Red
      exit 1
    }
  }
  Copy-Item $stage "$stage.avant-rotation.bak" -Force
  foreach ($p in $pairs) { $txt = $txt.Replace($p[0], $p[1]) }
  [IO.File]::WriteAllText($stage, $txt, $utf8)
  Write-Host "  ~ src\components\ProfileStage.jsx" -ForegroundColor Green
}

# ---------- 2) profile.css : curseur main + zone de glisse ----------
$css = Join-Path $root 'src\styles\profile.css'
$ctxt = [IO.File]::ReadAllText($css)
if ($ctxt.Contains('cursor: grab')) {
  Write-Host "  = profile.css deja fait" -ForegroundColor DarkGray
} else {
$add = @'

/* Glisser pour tourner le personnage */
.profile .profile__canvas { cursor: grab; touch-action: pan-y; user-select: none; -webkit-user-select: none; }
.profile .profile__canvas:active { cursor: grabbing; }
.profile .profile__title { pointer-events: none; }
'@
  $add = $add -replace "`r?`n", $nl
  [IO.File]::WriteAllText($css, ($ctxt.TrimEnd() + $nl + $add + $nl), $utf8)
  Write-Host "  ~ src\styles\profile.css" -ForegroundColor Green
}
Write-Host "Termine. Glisse a gauche / a droite sur le personnage." -ForegroundColor Cyan
