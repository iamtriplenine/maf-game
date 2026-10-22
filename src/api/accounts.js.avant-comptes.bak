// Comptes LOCAUX (stockes dans le navigateur) en attendant le backend.
// Quand le backend existera, on remplace uniquement le corps de ces fonctions :
// le reste de l'application n'a pas a changer.

const KEY_ACCOUNTS = "maf-accounts";
const KEY_SESSION = "maf-session";

export const CODE_LENGTH = 10;
export const isValidCode = (code) => /^\d{10}$/.test(code);

function loadAccounts() {
  try {
    return JSON.parse(localStorage.getItem(KEY_ACCOUNTS)) || {};
  } catch {
    return {};
  }
}

function saveAccounts(accounts) {
  try {
    localStorage.setItem(KEY_ACCOUNTS, JSON.stringify(accounts));
  } catch {
    /* stockage indisponible */
  }
}

function setSession(id) {
  try {
    if (id) localStorage.setItem(KEY_SESSION, id);
    else localStorage.removeItem(KEY_SESSION);
  } catch {
    /* stockage indisponible */
  }
}

export function currentSession() {
  try {
    const id = localStorage.getItem(KEY_SESSION);
    const account = id ? loadAccounts()[id] : null;
    return account ? { id, balance: account.balance } : null;
  } catch {
    return null;
  }
}

export async function register(code) {
  if (!isValidCode(code)) {
    throw new Error("Le code doit contenir exactement 10 chiffres.");
  }
  const accounts = loadAccounts();
  if (accounts[code]) {
    throw new Error("Ce code est deja pris, choisis-en un autre.");
  }
  accounts[code] = { balance: 0, createdAt: Date.now() };
  saveAccounts(accounts);
  setSession(code);
  return { id: code, balance: 0 };
}

export async function login(code) {
  if (!isValidCode(code)) {
    throw new Error("Le code doit contenir exactement 10 chiffres.");
  }
  const account = loadAccounts()[code];
  if (!account) throw new Error("Code inconnu. Utilise Sign Up pour le creer.");
  setSession(code);
  return { id: code, balance: account.balance };
}

export function logout() {
  setSession(null);
}