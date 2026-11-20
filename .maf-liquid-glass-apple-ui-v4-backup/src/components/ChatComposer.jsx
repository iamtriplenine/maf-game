import { useRef, useState } from "react";
import { IconSend } from "./Icons";
import { IconMic } from "./VoiceIcons";
import { useVoiceRecorder, voiceSupported, VOICE_MAX_MS } from "../chat/useVoiceRecorder";
import "../styles/voice.css";

const clock = (ms) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;

// Petite pilule "Ecrire..." a droite du titre MARV GAME.
// Quand on touche dedans, elle s'etire sur toute la largeur pour taper tranquillement.
// Tant que le champ est vide, le bouton devient un micro : on le MAINTIENT pour parler,
// on le lache et le vocal part (20 secondes maximum).
export default function ChatComposer({ session, onSend, onNeedLogin }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const errorTimer = useRef(null);

  const showError = (message) => {
    setError(message);
    clearTimeout(errorTimer.current);
    errorTimer.current = setTimeout(() => setError(""), 4000);
  };

  // envoi d'un texte (string) ou d'un vocal ({ audio, ms }) : un seul envoi a la fois
  async function deliver(content, onDone) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      await onSend(content);
      onDone?.();
    } catch (err) {
      showError(err.message);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  const voice = useVoiceRecorder({ onVoice: (clip) => deliver(clip), onError: showError });

  if (!session) {
    return (
      <button type="button" className="chat-composer chat-composer--guest" onClick={onNeedLogin}>
        Connecte-toi pour ecrire
      </button>
    );
  }

  function submit(event) {
    event.preventDefault();
    const value = text.trim();
    if (value) deliver(value, () => setText(""));
  }

  const hasText = text.trim().length > 0;
  const canVoice = !hasText && voiceSupported();

  const hold = {
    onPointerDown: (event) => {
      if (busy || (event.pointerType === "mouse" && event.button !== 0)) return;
      event.currentTarget.setPointerCapture?.(event.pointerId); // le doigt peut glisser sans couper
      voice.start();
    },
    onPointerUp: voice.finish,
    onPointerCancel: voice.finish,
    onContextMenu: (event) => event.preventDefault(), // pas de menu du navigateur sur appui long
    onMouseDown: (event) => event.preventDefault(), // le clavier reste ouvert si le champ etait actif
  };

  return (
    <form className={`chat-composer${voice.recording ? " chat-composer--rec" : ""}`} onSubmit={submit}>
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
      {voice.recording && (
        <div className="chat-composer__rec" role="status" aria-live="off">
          <i aria-hidden="true" />
          <span>{clock(voice.elapsed)}</span>
          <small>/ {clock(VOICE_MAX_MS)}</small>
        </div>
      )}
      {canVoice ? (
        <button
          type="button"
          className={`chat-composer__mic${voice.recording ? " is-rec" : ""}`}
          aria-label="Maintenir pour enregistrer un vocal"
          disabled={busy}
          {...hold}
        >
          <IconMic size={18} />
        </button>
      ) : (
        <button type="submit" aria-label="Envoyer" disabled={busy || !hasText}>
          <IconSend size={18} />
        </button>
      )}
    </form>
  );
}
