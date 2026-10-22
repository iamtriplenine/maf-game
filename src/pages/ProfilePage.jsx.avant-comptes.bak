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