import { walletRequest } from './accounts';
export const ownerSkinPreview = () => walletRequest('/api/tournaments/skins/owner/preview', {method:'POST',body:{}});
export const ownerSkinStatus = id => walletRequest(`/api/tournaments/skins/owner/${encodeURIComponent(id)}`);
