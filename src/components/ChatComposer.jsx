import { useRef, useState } from "react";
import { IconSend } from "./Icons";

// Petite pilule "Ecrire..." a droite du titre MARV GAME.
// Quand on touche dedans, elle s'etire sur toute la largeur pour taper tranquillement.
export default function ChatComposer({ session, onSend, onNeedLogin }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);

  if (!session) {
    return (
      <button type="button" className="chat-composer chat-composer--guest" onClick={onNeedLogin}>
        Connecte-toi pour ecrire
      </button>
    );
  }

  async function submit(event) {
    event.preventDefault();
    const value = text.trim();
    if (!value || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      await onSend(value);
      setText("");
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(""), 4000);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <form className="chat-composer" onSubmit={submit}>
      {error && (
        <span className="chat-composer__error" role="alert">
          {error}
        </span>
      )}
      <input
        value={text}
        maxLength={200}
        placeholder="Ecrire..."
        aria-label="Ecrire un message"
        enterKeyHint="send"
        autoComplete="off"
        onChange={(event) => setText(event.target.value)}
      />
      <button type="submit" aria-label="Envoyer" disabled={busy || !text.trim()}>
        <IconSend size={18} />
      </button>
    </form>
  );
}
