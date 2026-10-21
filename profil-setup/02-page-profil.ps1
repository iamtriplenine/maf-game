# 02 - Page profil : scene Loki, fenetres, page, styles
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

Write-File 'src\components\Sheet.jsx' @'
import { useEffect } from "react";

export default function Sheet({ open, title, onClose, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        className="sheet__backdrop"
        aria-label="Fermer"
        onClick={onClose}
      />
      <div className="sheet__body">
        <header className="sheet__head">
          <h2 className="sheet__title">{title}</h2>
          <button
            type="button"
            className="btn btn--round btn--glass btn--sm"
            aria-label="Fermer"
            onClick={onClose}
          >
            &times;
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
'@

Write-File 'src\components\ProfileStage.jsx' @'
import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import Loki from "../characters/loki/Loki";

const noop = () => {};

function readAccent() {
  return (
    getComputedStyle(document.documentElement)
      .getPropertyValue("--accent")
      .trim() || "#2bb8ff"
  );
}

// Suit le theme (ciel / rose) pour teinter la lumiere de contour.
function useAccent() {
  const [accent, setAccent] = useState(readAccent);

  useEffect(() => {
    const observer = new MutationObserver(() => setAccent(readAccent()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return accent;
}

export default function ProfileStage() {
  const accent = useAccent();

  return (
    <div className="profile__canvas">
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 1.15, 4.3], fov: 30 }}
        onCreated={({ camera }) => camera.lookAt(0, 0.95, 0)}
        fallback={<div className="notice">WebGL indisponible.</div>}
      >
        <hemisphereLight args={["#ffffff", "#334455", 1.7]} />
        <directionalLight position={[2, 4, 4]} intensity={2.6} />
        <directionalLight position={[-3, 2, -2]} intensity={3.2} color={accent} />

        <Suspense fallback={null}>
          <group rotation={[0, Math.PI - 0.3, 0]} position={[0, -0.05, 0]}>
            <Loki
              animation="Walk"
              paused={false}
              speed={1}
              onAnimations={noop}
            />
          </group>
        </Suspense>
      </Canvas>
    </div>
  );
}
'@

Write-File 'src\pages\ProfilePage.jsx' @'
import { useState } from "react";
import ProfileStage from "../components/ProfileStage";
import Sheet from "../components/Sheet";
import ThemeToggle from "../components/ThemeToggle";
import { useSession } from "../auth/useSession";
import { CODE_LENGTH } from "../api/accounts";
import "../styles/profile.css";

// Nom affiche sur la page (une ligne par element)
const APP_NAME = ["MARV", "GAME"];

const formatId = (id) => id.replace(/(\d{4})(\d{3})(\d{3})/, "$1 $2 $3");

function CodeForm({ mode, onSubmit }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isSignup = mode === "signup";

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSubmit(code);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <p className="sheet__text">
        {isSignup
          ? "Choisis ton code a 10 chiffres. Ce sera ton identifiant : il n'y a pas de mot de passe, garde-le bien."
          : "Entre ton code a 10 chiffres pour te connecter."}
      </p>

      <label className="field">
        <input
          className="code-input"
          name="code"
          inputMode="numeric"
          autoComplete="off"
          placeholder="0000000000"
          maxLength={CODE_LENGTH}
          value={code}
          onChange={(event) =>
            setCode(event.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH))
          }
          autoFocus
        />
        <span className="code-count">
          {code.length}/{CODE_LENGTH}
        </span>
      </label>

      <p className="sheet__error" role="alert">{error}</p>

      <button
        type="submit"
        className="btn btn--primary btn--block"
        disabled={busy || code.length !== CODE_LENGTH}
      >
        {isSignup ? "Creer mon compte" : "Me connecter"}
      </button>
    </form>
  );
}

export default function ProfilePage({ onOpenStudio }) {
  const { session, login, register, logout } = useSession();
  const [sheet, setSheet] = useState(null); // login | signup | account | recharge
  const close = () => setSheet(null);

  return (
    <>
      <main className="profile">
        <div className="profile__bar">
          <button
            type="button"
            className="btn btn--sm btn--glass"
            onClick={onOpenStudio}
          >
            Studio 3D
          </button>
          <ThemeToggle />
        </div>

        <section className="profile__stage" aria-label="Personnage">
          <ProfileStage />
          <h1 className="profile__title title-tech">
            {APP_NAME[0]}
            <span>{APP_NAME[1]}</span>
          </h1>
        </section>

        <div className="profile__actions">
          {session ? (
            <>
              <button
                type="button"
                className="btn btn--glass profile__btn"
                onClick={() => setSheet("account")}
              >
                <small>ID</small>
                {formatId(session.id)}
              </button>
              <button
                type="button"
                className="btn btn--primary profile__btn"
                onClick={() => setSheet("recharge")}
              >
                + Recharger
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn btn--glass profile__btn"
                onClick={() => setSheet("login")}
              >
                Login
              </button>
              <button
                type="button"
                className="btn btn--primary profile__btn"
                onClick={() => setSheet("signup")}
              >
                Sign Up
              </button>
            </>
          )}
        </div>

        <section className="profile__panel">
          <span className="chip">
            <span className="orb orb--sm" />
            {session ? "Connecte" : "Invite"}
          </span>
          {session ? (
            <div className="buy-bar">
              <div>
                <span className="price__label">Solde</span>
                <span className="price__value">{session.balance}</span>
              </div>
            </div>
          ) : (
            <p className="profile__hint">
              Connecte-toi avec ton code a 10 chiffres pour retrouver ton compte.
            </p>
          )}
        </section>
      </main>

      <Sheet open={sheet === "login"} title="Login" onClose={close}>
        <CodeForm
          mode="login"
          onSubmit={async (code) => {
            await login(code);
            close();
          }}
        />
      </Sheet>

      <Sheet open={sheet === "signup"} title="Sign Up" onClose={close}>
        <CodeForm
          mode="signup"
          onSubmit={async (code) => {
            await register(code);
            close();
          }}
        />
      </Sheet>

      <Sheet open={sheet === "account"} title="Mon compte" onClose={close}>
        {session && (
          <>
            <p className="sheet__text">
              Identifiant : <strong>{formatId(session.id)}</strong>
              <br />
              Solde : <strong>{session.balance}</strong>
            </p>
            <button
              type="button"
              className="btn btn--glass btn--block"
              onClick={() => {
                logout();
                close();
              }}
            >
              Se deconnecter
            </button>
          </>
        )}
      </Sheet>

      <Sheet open={sheet === "recharge"} title="Recharger" onClose={close}>
        <p className="sheet__text">
          La recharge sera disponible quand le backend sera en place.
        </p>
        <button
          type="button"
          className="btn btn--primary btn--block"
          onClick={close}
        >
          Compris
        </button>
      </Sheet>
    </>
  );
}
'@

Write-File 'src\styles\profile.css' @'
/* ============ PAGE PROFIL ============ */

.profile {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 480px;
  min-height: 100vh;
  min-height: 100dvh;
  margin: 0 auto;
  overflow: hidden;
}
@media (min-width: 520px) {
  .profile { border-inline: 1px solid var(--border); }
}

.profile .profile__bar {
  position: absolute;
  z-index: 3;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: max(14px, env(safe-area-inset-top)) 16px 0;
}

/* Scene du personnage */
.profile .profile__stage {
  position: relative;
  flex: 1 1 auto;
  min-height: 380px;
  background:
    radial-gradient(70% 55% at 50% 38%, var(--accent-soft), transparent 70%),
    linear-gradient(180deg, transparent 40%, var(--glow-1));
}
.profile .profile__stage::after {
  content: "";
  position: absolute;
  left: 50%;
  bottom: 12%;
  width: 70%;
  height: 36px;
  transform: translateX(-50%);
  background: radial-gradient(closest-side, var(--accent-soft), transparent);
  filter: blur(6px);
  pointer-events: none;
}
.profile .profile__canvas { position: absolute; inset: 0; }

.profile .profile__title {
  position: absolute;
  z-index: 2;
  left: 22px;
  bottom: 20px;
  margin: 0;
  font-size: clamp(26px, 8vw, 36px);
  text-shadow: 0 2px 20px rgba(0, 0, 0, .45);
}
.profile .profile__title span {
  display: block;
  background: var(--accent-grad);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  text-shadow: none;
}

/* Login / Sign Up (ou ID / + Recharger) */
.profile .profile__actions {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 0 16px 12px;
}
.profile .profile__btn {
  flex-direction: column;
  gap: 6px;
  min-height: 74px;
  border-radius: var(--r-xl);
  font-size: 15px;
}
.profile .profile__btn small {
  color: var(--text-dim);
  font-size: 10px;
  letter-spacing: .16em;
}

/* Panneau du bas : colle jusqu'au bord de l'ecran */
.profile .profile__panel {
  display: flex;
  flex: 0 0 clamp(150px, 26dvh, 240px);
  flex-direction: column;
  gap: 14px;
  padding: 20px 22px max(20px, env(safe-area-inset-bottom));
  border: 1px solid var(--border);
  border-bottom: 0;
  border-radius: var(--r-xl) var(--r-xl) 0 0;
  background: var(--glass);
  -webkit-backdrop-filter: blur(var(--blur));
  backdrop-filter: blur(var(--blur));
}
.profile .profile__panel .chip { align-self: flex-start; }
.profile .profile__hint { margin: 0; color: var(--text-dim); font-size: 13px; line-height: 1.6; }
.orb--sm { width: 10px; height: 10px; box-shadow: none; }

/* Fenetre qui monte du bas */
.sheet { position: fixed; inset: 0; z-index: 50; display: flex; align-items: flex-end; justify-content: center; }
.sheet__backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(0, 0, 0, .55);
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
}
.sheet__body {
  position: relative;
  width: 100%;
  max-width: 480px;
  padding: 22px 22px max(24px, env(safe-area-inset-bottom));
  border: 1px solid var(--border);
  border-bottom: 0;
  border-radius: var(--r-xl) var(--r-xl) 0 0;
  background: linear-gradient(180deg, var(--surface), var(--bg-2));
  animation: sheet-up .28s var(--ease);
}
@keyframes sheet-up {
  from { transform: translateY(40px); opacity: 0; }
  to { transform: none; opacity: 1; }
}
.sheet__head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.sheet__title { margin: 0; font: 400 16px/1.2 var(--font-tech); letter-spacing: .06em; text-transform: uppercase; }
.sheet__text { margin: 0 0 16px; color: var(--text-dim); font-size: 13px; line-height: 1.6; }
.sheet__text strong { color: var(--text); letter-spacing: .06em; }
.sheet__error { min-height: 1.2em; margin: 10px 0; color: #ff9d8a; font-size: 13px; }

.field .code-input {
  font: 600 20px/1 var(--font-ui);
  font-variant-numeric: tabular-nums;
  letter-spacing: .22em;
}
.code-count { padding-right: 14px; color: var(--text-faint); font-size: 12px; }
'@

Write-Host "02 termine." -ForegroundColor Cyan
