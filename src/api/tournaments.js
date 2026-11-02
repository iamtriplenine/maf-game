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

export const myPenaltyTournamentDuel = () => walletRequest('/api/tournaments/penalty/mine');
export async function penaltyTournamentBracket(id) {
  const response=await fetch(`${API_URL}/api/tournaments/penalty/bracket/${encodeURIComponent(id)}`,{cache:'no-store'});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||'Tableau indisponible.');
  return data;
}

// Salons de tournoi : lecture reservee aux deux participants, choix secrets cote serveur.
export const penaltyTournamentMatch = id => walletRequest(`/api/tournaments/penalty/matches/${encodeURIComponent(id)}`);
export const startPenaltyTournamentMatch = id => walletRequest(`/api/tournaments/penalty/matches/${encodeURIComponent(id)}/start`,{method:'POST',body:{}});
export const choosePenaltyTournamentMatch = (id,direction) => walletRequest(`/api/tournaments/penalty/matches/${encodeURIComponent(id)}/choose`,{method:'POST',body:{direction}});
export const forfeitPenaltyTournamentMatch = id => walletRequest(`/api/tournaments/penalty/matches/${encodeURIComponent(id)}/forfeit`,{method:'POST',body:{}});

export const pingPenaltyTournamentMatch = id => walletRequest(`/api/tournaments/penalty/matches/${encodeURIComponent(id)}/presence`,{method:'POST',body:{}});

export const reschedulePenaltyTournamentMatch = id => walletRequest(`/api/tournaments/penalty/matches/${encodeURIComponent(id)}/reschedule`,{method:'POST',body:{}});
