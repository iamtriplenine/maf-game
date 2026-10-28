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
// MAF_TOURNOI_ETAPE2_V1 : reservation payante (le serveur debite et attribue la place en une seule operation)
export const reserveTournament = id => walletRequest(`/api/tournaments/${id}/reserve`, { method: 'POST', body: {} });
export const myTournamentReservations = () => walletRequest('/api/tournaments/mine');
export const setTournamentRegistration = (id, open, revision) => walletRequest(`/api/tournaments/owner/${id}/registration`, { method: 'POST', body: { open, revision } });

export const tournamentSkinCatalog = () => walletRequest('/api/tournaments/skins/catalog');
export const myUnlockedStudioSkins = () => walletRequest('/api/tournaments/skins/mine');
