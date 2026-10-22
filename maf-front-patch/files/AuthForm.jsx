import { useEffect, useState } from "react";
import {
  CODE_LENGTH,
  PSEUDO_MAX,
  cleanPseudo,
  isValidCode,
  isValidPseudo,
} from "../api/accounts";

// Formulaire Login / Sign Up : pseudo + code a 10 chiffres.
// Pendant l'attente (serveur gratuit qui se reveille) : animation + compteur.
export default function AuthForm({ mode, onSubmit }) {
  const [pseudo, setPseudo] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const isSignup = mode === "signup";
  const slow = busy && seconds >= 3;

  useEffect(() => {
    if (!busy) return undefined;
    const start = Date.now();
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => {
      clearInterval(timer);
      setSeconds(0);
    };
  }, [busy]);

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSubmit(pseudo, code);
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
          ? "Choisis ton pseudo et ton code a 10 chiffres. Il n'y a pas de mot de passe : garde bien ton code."
          : "Entre ton pseudo et ton code a 10 chiffres pour te connecter."}
      </p>

      <label className="field">
        <input
          className="pseudo-input"
          name="pseudo"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="Pseudo"
          maxLength={PSEUDO_MAX}
          value={pseudo}
          disabled={busy}
          onChange={(event) => setPseudo(cleanPseudo(event.target.value))}
          autoFocus
        />
      </label>

      <label className="field">
        <input
          className="code-input"
          name="code"
          inputMode="numeric"
          autoComplete="off"
          placeholder="0000000000"
          maxLength={CODE_LENGTH}
          value={code}
          disabled={busy}
          onChange={(event) =>
            setCode(event.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH))
          }
        />
        <span className="code-count">
          {code.length}/{CODE_LENGTH}
        </span>
      </label>

      <p className="sheet__error" role="alert">
        {error}
      </p>

      {slow && (
        <div className="wake" role="status">
          <span className="spinner" aria-hidden="true" />
          <div>
            <strong>Le serveur se reveille...</strong>
            <span>
              Ca peut prendre jusqu'a 60 secondes apres un moment d'inactivite ({seconds}s)
            </span>
            <div className="wake__bar" aria-hidden="true">
              <i />
            </div>
          </div>
        </div>
      )}

      <button
        type="submit"
        className="btn btn--primary btn--block"
        disabled={busy || !isValidPseudo(pseudo) || !isValidCode(code)}
      >
        {busy ? (
          <>
            <span className="spinner spinner--sm" aria-hidden="true" />
            {isSignup ? "Creation..." : "Connexion..."}
          </>
        ) : isSignup ? (
          "Creer mon compte"
        ) : (
          "Me connecter"
        )}
      </button>
    </form>
  );
}
