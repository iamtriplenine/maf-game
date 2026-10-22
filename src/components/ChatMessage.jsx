import { useEffect, useRef, useState } from "react";
import { voiceUrl } from "../api/chat";
import { IconPause, IconPlay } from "./VoiceIcons";
import "../styles/voice.css";

const BARS = 24;
const clock = (ms) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;
// hauteur des barres : toujours la meme pour un vocal donne (petit hasard fixe a partir de l'id)
const barHeight = (id, i) => 28 + 72 * Math.abs(Math.sin(id * 12.9898 + i * 78.233) * 43758.5453 % 1);

let playing = null; // une seule lecture a la fois

// Bulle vocale : bouton lecture/pause, barres qui se remplissent, duree
function VoiceBubble({ id, ms }) {
  const audio = useRef(null);
  const [state, setState] = useState("idle"); // idle | loading | playing | error
  const [position, setPosition] = useState(0);

  useEffect(
    () => () => {
      const a = audio.current;
      if (!a) return;
      a.pause();
      if (playing === a) playing = null;
    },
    []
  );

  async function toggle() {
    let a = audio.current;
    if (!a) {
      a = new Audio();
      a.preload = "auto";
      a.src = voiceUrl(id);
      a.addEventListener("timeupdate", () => setPosition(a.currentTime * 1000));
      a.addEventListener("playing", () => setState("playing"));
      a.addEventListener("waiting", () => setState("loading"));
      a.addEventListener("pause", () => setState((s) => (s === "error" ? s : "idle")));
      a.addEventListener("ended", () => {
        a.currentTime = 0;
        setPosition(0);
        setState("idle");
        if (playing === a) playing = null;
      });
      a.addEventListener("error", () => setState("error"));
      audio.current = a;
    }
    if (!a.paused) {
      a.pause();
      return;
    }
    if (playing && playing !== a) playing.pause();
    playing = a;
    setState("loading");
    try {
      await a.play();
    } catch (error) {
      if (error?.name !== "AbortError") setState("error");
    }
  }

  const progress = Math.min(1, position / Math.max(ms, 1));
  const label = state === "error" ? "Lecture impossible" : state === "playing" ? clock(position) : clock(ms);

  return (
    <div className="chat-msg__bubble chat-msg__bubble--voice">
      <button
        type="button"
        className="voice__btn"
        onClick={toggle}
        aria-label={state === "playing" ? "Mettre le vocal en pause" : "Ecouter le vocal"}
      >
        {state === "playing" ? <IconPause size={16} /> : <IconPlay size={16} />}
      </button>
      <span className="voice__bars" aria-hidden="true">
        {Array.from({ length: BARS }, (_, i) => (
          <i key={i} className={i / BARS < progress ? "on" : ""} style={{ height: `${barHeight(id, i)}%` }} />
        ))}
      </span>
      <span className="voice__time">{label}</span>
    </div>
  );
}

// Une bulle de message (gauche = les autres, droite = moi)
export default function ChatMessage({ message, mine, showName }) {
  return (
    <div className={`chat-msg${mine ? " chat-msg--me" : ""}`}>
      {showName && <span className="chat-msg__name">{message.pseudo || `ID ${message.user_id}`}</span>}
      {message.audio_ms != null ? (
        <VoiceBubble id={message.id} ms={message.audio_ms} />
      ) : (
        <span className="chat-msg__bubble">{message.body}</span>
      )}
    </div>
  );
}
