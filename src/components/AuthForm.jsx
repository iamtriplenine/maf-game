import { useRef, useState } from "react";
import HourglassLoader from "./HourglassLoader";
import {
  CODE_LENGTH,
  PSEUDO_MAX,
  cleanPseudo,
  isValidCode,
  isValidPseudo,
} from "../api/accounts";

// Formulaire Login / Sign Up : pseudo + code a 10 chiffres.
// Attente utilisateur : sablier aux couleurs du theme, sans message technique.
export default function AuthForm({ mode, onSubmit }) {
  const [pseudo, setPseudo] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isSignup = mode === "signup";
  const inFlight = useRef(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      await onSubmit(pseudo, code);
    } catch (err) {
      setError(err.message);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-busy={busy}>
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

      {busy && <HourglassLoader />}

      <button
        type="submit"
        className="btn btn--primary btn--block"
        disabled={busy || !isValidPseudo(pseudo) || !isValidCode(code)}
      >
        {busy ? (
          <>
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
