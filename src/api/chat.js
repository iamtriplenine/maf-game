// Chat global : lecture libre, ecriture reservee aux comptes connectes.
import { API_URL } from "./config";
import { walletRequest } from "./accounts";

// Messages plus recents que `after` (0 = les derniers messages).
// Renvoie aussi `epoch` : il change quand l'administrateur supprime des messages.
export async function fetchMessages(after = 0) {
  const res = await fetch(`${API_URL}/api/chat?after=${after}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`Chat indisponible (${res.status}).`);
  const data = await res.json().catch(() => ({}));
  return { messages: Array.isArray(data.messages) ? data.messages : [], epoch: data.epoch ?? 0 };
}

export async function postMessage(body) {
  const data = await walletRequest("/api/chat", { method: "POST", body: { body } });
  return data.message;
}

// Vocal : `audio` en base64, `ms` = duree (20 000 ms maximum, verifie aussi par le serveur)
export async function postVoice({ audio, ms }) {
  const data = await walletRequest("/api/chat/voice", { method: "POST", body: { audio, ms } });
  return data.message;
}

// Adresse du son d'un vocal (le serveur gere la lecture par morceaux, necessaire sur iPhone)
export const voiceUrl = (id) => `${API_URL}/api/chat/${id}/audio`;
