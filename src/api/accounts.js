// Comptes MAF : parle au serveur (Render). Pseudo + code a 10 chiffres, pas de mot de passe.
// Le serveur gratuit s'endort apres 15 min : le premier appel peut durer ~60 s.
import { API_URL } from "./config";

const KEY_SESSION = "maf-session-v2"; // { token, user }

export const CODE_LENGTH = 10;
export const PSEUDO_MAX = 20;
const PSEUDO_CHARS = /[^\p{L}\p{N}@._\-#$!*+]/gu;
export const cleanPseudo = (value) => value.replace(PSEUDO_CHARS, "").slice(0, PSEUDO_MAX);
export const isValidPseudo = (pseudo) => pseudo.length >= 3 && pseudo.length <= PSEUDO_MAX;
export const isValidCode = (code) => /^\d{10}$/.test(code);

const WAIT_LIMIT = 80000; // on patiente jusqu'a 80 s pour laisser le serveur se reveiller
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function readStored() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY_SESSION));
    return data?.token && data?.user ? data : null;
  } catch {
    return null;
  }
}

function writeStored(data) {
  try {
    if (data) localStorage.setItem(KEY_SESSION, JSON.stringify(data));
    else localStorage.removeItem(KEY_SESSION);
  } catch {
    /* stockage indisponible */
  }
}

// Appel serveur ; reessaie tout seul si le serveur est en train de se reveiller (502/503/504).
async function request(path, { method = "GET", body, token } = {}) {
  const start = Date.now();
  let networkRetries = 0;
  for (;;) {
    let res;
    try {
      res = await fetch(`${API_URL}${path}`, {
        method,
        headers: {
          ...(body ? { "Content-Type": "application/json" } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(WAIT_LIMIT),
      });
    } catch (error) {
      const canRetry = method === "GET" && networkRetries < 3 && Date.now() - start < WAIT_LIMIT - 8000;
      if (canRetry) {
        networkRetries += 1;
        await sleep(4000);
        continue;
      }
      throw new Error(
        error?.name === "TimeoutError"
          ? "Le serveur met trop de temps a repondre. Reessaie dans un instant."
          : "Impossible de joindre le serveur. Verifie ta connexion et reessaie."
      );
    }
    if (method === "GET" && [502, 503, 504].includes(res.status) && Date.now() - start < WAIT_LIMIT - 8000) {
      await sleep(4000);
      continue;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = new Error(data.error || `Erreur serveur (${res.status}).`);
      error.status = res.status;
      throw error;
    }
    return data;
  }
}

// Reveille le serveur en arriere-plan des l'ouverture de la page.
export function wakeServer() {
  fetch(`${API_URL}/health`).catch(() => {});
}

export function currentSession() {
  return readStored()?.user ?? null;
}

async function authenticate(path, pseudo, code) {
  if (!isValidPseudo(pseudo)) throw new Error("Le pseudo doit faire entre 3 et 20 caracteres.");
  if (!isValidCode(code)) throw new Error("Le code doit contenir exactement 10 chiffres.");
  const { token, user } = await request(path, { method: "POST", body: { pseudo, code } });
  writeStored({ token, user });
  return user;
}

export const register = (pseudo, code) => authenticate("/api/register", pseudo, code);
export const login = (pseudo, code) => authenticate("/api/login", pseudo, code);

// Met a jour le solde ; deconnecte si la session a expire. Hors ligne : on garde la session.
export async function refreshSession() {
  const stored = readStored();
  if (!stored) return null;
  try {
    const { user } = await request("/api/me", { token: stored.token });
    writeStored({ token: stored.token, user });
    return user;
  } catch (error) {
    if (error.status === 401) {
      writeStored(null);
      return null;
    }
    return stored.user;
  }
}

export function logout() {
  writeStored(null);
}

export async function walletRequest(path, options = {}) {
  const stored = readStored();
  if (!stored) throw new Error("Connecte-toi pour continuer.");
  return request(path, { ...options, token: stored.token });
}
export function storeWalletUser(user) {
  const stored = readStored();
  if (stored && stored.user.id === user.id) writeStored({ ...stored, user });
}
