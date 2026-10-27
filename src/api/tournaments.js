import { API_URL } from './config';
import { walletRequest } from './accounts';
export async function publicTournaments(signal) {
  const response = await fetch(`${API_URL}/api/tournaments`, { cache: 'no-store', signal });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Impossible de charger les tournois. Réessaie dans quelques instants.');
  return data;
}
export const ownerTournaments = () => walletRequest('/api/tournaments/owner');
export const saveTournament = (id, body) => walletRequest(`/api/tournaments/owner${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body });
