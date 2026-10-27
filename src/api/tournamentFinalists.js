import { walletRequest } from './accounts';
// Seule la session proprietaire authentifiee peut appeler ces routes.
export const previewFinalists = completedCount => walletRequest('/api/tournaments/qualifications/finalists/owner/preview',{
  method:'POST',body:{completedCount}
});
export const ownerFinalistLobby = id => walletRequest(`/api/tournaments/qualifications/finalists/owner/${encodeURIComponent(id)}`);
