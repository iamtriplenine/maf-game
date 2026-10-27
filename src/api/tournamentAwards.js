import { walletRequest } from './accounts';
export const ownerAwardPreview = () => walletRequest('/api/tournaments/awards/owner/preview', {method:'POST',body:{}});
export const ownerAwardStatus = id => walletRequest(`/api/tournaments/awards/owner/${encodeURIComponent(id)}`);
