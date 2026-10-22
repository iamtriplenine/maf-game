import { useCallback, useEffect, useRef, useState } from "react";

// Enregistre un vocal tant que le bouton est maintenu. Maximum 20 secondes : au-dela, il part tout seul.
export const VOICE_MAX_MS = 20000;
const VOICE_MIN_MS = 600; // en dessous : appui trop court, on ignore
const BITRATE = 48000; // qualite "voix" : net, et un vocal de 20 s reste leger (~120 Ko)

// mp4 (AAC) d'abord : c'est le seul format que TOUS les telephones savent relire (iPhone compris)
const TYPES = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];

export const voiceSupported = () =>
  typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof window.MediaRecorder !== "undefined";

const pickType = () => TYPES.find((type) => window.MediaRecorder.isTypeSupported?.(type)) ?? "";

const toBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

function micError(error) {
  if (error?.name === "NotAllowedError" || error?.name === "SecurityError") return "Autorise le micro pour envoyer un vocal.";
  if (error?.name === "NotFoundError" || error?.name === "OverconstrainedError") return "Aucun micro detecte.";
  return "Micro indisponible.";
}

// onVoice({ audio, ms }) est appele quand le doigt est leve ; onError(message) pour les alertes.
export function useVoiceRecorder({ onVoice, onError }) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const run = useRef(null);
  const callbacks = useRef({ onVoice, onError });
  useEffect(() => {
    callbacks.current = { onVoice, onError };
  });

  const release = useCallback(() => {
    const r = run.current;
    if (!r) return;
    clearTimeout(r.limit);
    clearInterval(r.tick);
    r.stream?.getTracks().forEach((track) => track.stop()); // coupe le micro (sinon l'iPhone baisse le volume)
    run.current = null;
    setRecording(false);
    setElapsed(0);
  }, []);

  const stopRecorder = (r) => {
    if (r.recorder && r.recorder.state === "recording") r.recorder.stop();
  };

  const start = useCallback(async () => {
    if (run.current) return;
    const r = { stopRequested: false, cancelled: false, chunks: [], stream: null, recorder: null, startedAt: 0 };
    run.current = r;
    try {
      r.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      if (r.stopRequested || r.cancelled) {
        // doigt leve avant que le micro soit pret
        release();
        callbacks.current.onError?.("Maintiens le bouton pour parler.");
        return;
      }
      const type = pickType();
      const recorder = new window.MediaRecorder(r.stream, { ...(type ? { mimeType: type } : {}), audioBitsPerSecond: BITRATE });
      r.recorder = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size) r.chunks.push(event.data);
      };
      recorder.onerror = () => {
        r.cancelled = true;
        release();
        callbacks.current.onError?.("Enregistrement impossible.");
      };
      recorder.onstop = async () => {
        const ms = Math.min(Date.now() - r.startedAt, VOICE_MAX_MS);
        const blob = new Blob(r.chunks, { type: recorder.mimeType || type || "audio/mp4" });
        const cancelled = r.cancelled;
        release();
        if (cancelled) return;
        if (ms < VOICE_MIN_MS || !blob.size) {
          callbacks.current.onError?.("Maintiens le bouton pour parler.");
          return;
        }
        try {
          callbacks.current.onVoice?.({ audio: await toBase64(blob), ms });
        } catch {
          callbacks.current.onError?.("Vocal impossible a envoyer.");
        }
      };
      recorder.start();
      r.startedAt = Date.now();
      r.tick = setInterval(() => setElapsed(Math.min(Date.now() - r.startedAt, VOICE_MAX_MS)), 100);
      r.limit = setTimeout(() => stopRecorder(r), VOICE_MAX_MS); // 20 s : envoi automatique
      setRecording(true);
      if (r.stopRequested) stopRecorder(r);
    } catch (error) {
      release();
      callbacks.current.onError?.(micError(error));
    }
  }, [release]);

  // doigt leve : on arrete et le vocal part
  const finish = useCallback(() => {
    const r = run.current;
    if (!r) return;
    r.stopRequested = true;
    stopRecorder(r);
  }, []);

  // la page se ferme pendant l'enregistrement : on coupe tout sans envoyer
  useEffect(
    () => () => {
      const r = run.current;
      if (!r) return;
      r.cancelled = true;
      stopRecorder(r);
      release();
    },
    [release]
  );

  return { recording, elapsed, start, finish };
}
