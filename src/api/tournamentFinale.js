import { walletRequest } from './accounts';
export const ownerFinalePreview = body => walletRequest('/api/tournaments/qualifications/finale/owner/preview',{method:'POST',body});
export const ownerFinaleStatus = id => walletRequest(`/api/tournaments/qualifications/finale/owner/${encodeURIComponent(id)}`);
