import "../styles/referrals.css";
import { useRef, useState } from "react";
import HourglassLoader from "./HourglassLoader";
import CodeDials from "./CodeDials";
import {
  PSEUDO_MAX,
  cleanPseudo,
  isValidCode,
  isValidPseudo,
} from "../api/accounts";

// Formulaire Login / Sign Up : pseudo + code a 10 chiffres (molettes 3D).
// Attente utilisateur : sablier aux couleurs du theme, sans message technique.
export default function AuthForm({ mode, onSubmit, referral, onRetryReferral, onClearReferral }) {
  const [pseudo, setPseudo] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isSignup = mode === "signup";
  const inFlight = useRef(false);
  const referralBlocked = isSignup && referral && !['none','valid'].includes(referral.status);

  async function handleSubmit(event) {
    event.preventDefault();
    if (inFlight.current || referralBlocked) return;
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

      {isSignup && referral?.status !== 'none' && referral && <div className="referral-notice">
        {referral.code && <label className="wallet-label" htmlFor="signup-referral-code">Code de parrainage
          <input id="signup-referral-code" className="referral-code" value={referral.code} readOnly autoComplete="off" aria-readonly="true" />
        </label>}
        {referral.status === 'loading' && <p role="status">Vérification du lien de parrainage…</p>}
        {referral.status === 'valid' && <><p>Invité par <strong>{referral.partner_pseudo}</strong>.</p><small>Code renseigné automatiquement par le lien, non modifiable.</small></>}
        {['error','expired'].includes(referral.status) && <p className="sheet__error" role="alert">{referral.message}</p>}
        {referral.status !== 'loading' && <button type="button" className="btn btn--glass btn--block" disabled={busy} onClick={onRetryReferral}>Actualiser le lien</button>}
        <button type="button" className="btn btn--glass btn--block" disabled={busy} onClick={onClearReferral}>Continuer sans parrainage</button>
      </div>}

      <CodeDials onChange={setCode} disabled={busy} />
      <p className="dials-hint">Fais rouler chaque molette sur ton chiffre.</p>

      <p className="sheet__error" role="alert">
        {error}
      </p>

      {busy && <HourglassLoader />}

      <button
        type="submit"
        className="btn btn--primary btn--block"
        disabled={busy || referralBlocked || !isValidPseudo(pseudo) || !isValidCode(code)}
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
