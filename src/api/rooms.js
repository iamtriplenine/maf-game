// Salons et matchs de tir au but MARV GAME (argent simule uniquement).
import { API_URL } from './config';
import { currentSession, walletRequest } from './accounts';

async function openRequest(path) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      cache: 'no-store', signal: AbortSignal.timeout(80000),
    });
  } catch {
    throw new Error('Connexion aux salons impossible. Reessaie dans un instant.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || `Erreur des salons (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return data;
}

export const listRooms = async () => (await openRequest('/api/rooms')).rooms || [];
export const myRoom = async () => currentSession()
  ? (await walletRequest('/api/rooms/mine')).room : null;
export const roomById = async (id) =>
  (await (currentSession() ? walletRequest(`/api/rooms/${id}`) : openRequest(`/api/rooms/${id}`))).room;
export const roomByCode = async (code) =>
  (await (currentSession() ? walletRequest(`/api/rooms/code/${code}`) : openRequest(`/api/rooms/code/${code}`))).room;
export const createRoom = async ({ game, stake, shots }) =>
  (await walletRequest('/api/rooms', { method: 'POST', body: { game, stake, shots } })).room;
export const joinRoom = async (id) =>
  (await walletRequest(`/api/rooms/${id}/join`, { method: 'POST' })).room;
export const acceptRoom = async (id) =>
  (await walletRequest(`/api/rooms/${id}/accept`, { method: 'POST' })).room;
export const declineRoom = async (id) =>
  (await walletRequest(`/api/rooms/${id}/decline`, { method: 'POST' })).room;
export const leaveRoom = async (id) =>
  (await walletRequest(`/api/rooms/${id}/leave`, { method: 'POST' })).room;

export const getMatch = async (id) =>
  walletRequest(`/api/rooms/${id}/match`);
export const startMatch = async (id) =>
  walletRequest(`/api/rooms/${id}/match/start`, { method: 'POST' });
export const chooseDirection = async (id, direction) =>
  walletRequest(`/api/rooms/${id}/match/choose`, { method: 'POST', body: { direction } });
export const forfeitMatch = async (id) =>
  walletRequest(`/api/rooms/${id}/match/forfeit`, { method: 'POST' });
export const recentResults = async () => currentSession()
  ? (await walletRequest('/api/rooms/results/recent')).rooms || [] : [];

export const exitMatch = id => walletRequest(`/api/rooms/${id}/match/exit`, { method:'POST' });
export const resumeMatch = id => walletRequest(`/api/rooms/${id}/match/resume`, { method:'POST' });
