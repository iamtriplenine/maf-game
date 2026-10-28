import { walletRequest } from './accounts';
export const myOwnerGifts=()=>walletRequest('/api/gifts/mine');
export const openOwnerGift=id=>walletRequest(`/api/gifts/${encodeURIComponent(id)}/open`,{method:'POST',body:{}});
export const ownerGiftList=()=>walletRequest('/api/gifts/owner');
export const createOwnerGift=data=>walletRequest('/api/gifts/owner',{method:'POST',body:data});
export const clearLegacyTestGifts=()=>walletRequest('/api/gifts/owner/cleanup-tests',{method:'POST',body:{confirmation:'MASQUER ANCIENS CADEAUX'}});
export const revokeOwnerGift=id=>walletRequest(`/api/gifts/owner/${encodeURIComponent(id)}/revoke`,{method:'POST',body:{}});
