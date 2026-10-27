// Routes du tournoi, meme authentification que le compte MAF.
import { walletRequest } from './accounts';
export const previewQualificationDraw = () => walletRequest('/api/tournaments/qualifications/owner/preview', {method:'POST',body:{}});
export const qualificationGroupsOwner = tournamentId => walletRequest(`/api/tournaments/qualifications/owner/${encodeURIComponent(tournamentId)}`);
