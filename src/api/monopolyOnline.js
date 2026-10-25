import { walletRequest } from './accounts';
import { API_URL } from './config';
const base = '/api/monopoly/rooms';
async function publicRequest(path) {
  const response = await fetch(`${API_URL}${path}`, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Impossible de charger les salons Monopoly.');
  return data;
}
export const publicRooms = async () => (await publicRequest(base)).rooms || [];
export const roomByCode = async code => (await publicRequest(`${base}/code/${encodeURIComponent(code)}`)).room;
export const mine = async () => (await walletRequest(`${base}/mine`)).room;
export const detail = async id => (await walletRequest(`${base}/${id}`)).room;
export const create = async (maxPlayers, stake) => (await walletRequest(base, {method:'POST',body:{maxPlayers,stake}})).room;
export const join = async id => (await walletRequest(`${base}/${id}/join`,{method:'POST'})).room;
export const leave = async id => (await walletRequest(`${base}/${id}/leave`,{method:'POST'})).room;
export const propose = async (id,count) => (await walletRequest(`${base}/${id}/propose`,{method:'POST',body:{count}})).room;
export const vote = async (id,accept) => (await walletRequest(`${base}/${id}/vote`,{method:'POST',body:{accept}})).room;
export const action = async (id,action,square) => (await walletRequest(`${base}/${id}/action`,{method:'POST',body:{action,...(Number.isInteger(square)?{square}:{})}})).room;

export const presence = async (id,state) => (await walletRequest(`${base}/${id}/presence`,{method:'POST',body:{state}})).room;
