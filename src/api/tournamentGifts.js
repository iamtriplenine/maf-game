import { walletRequest } from './accounts';
export const myTournamentGifts = () => walletRequest('/api/tournaments/gifts/mine');
export const openTournamentGift = id => walletRequest(`/api/tournaments/gifts/${encodeURIComponent(id)}/open`,{method:'POST',body:{}});
export const giftOwnerTournaments = () => walletRequest('/api/tournaments/gifts/owner');
export const scheduleTournamentGift = (id,releaseAt) => walletRequest(`/api/tournaments/gifts/owner/${encodeURIComponent(id)}/schedule`,{method:'PUT',body:{releaseAt}});
export const giftOwnerPreview = players => walletRequest('/api/tournaments/gifts/owner/preview',{method:'POST',body:{players}});
