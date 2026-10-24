import {walletRequest} from './accounts';
export const setTankRunSetup=(id,body)=>walletRequest(`/api/rooms/${id}/match/tankrun/prepare`,{method:'POST',body});
export const getTankRunSnapshot=id=>walletRequest(`/api/rooms/${id}/match/tankrun/snapshot`);
export const sendTankRunInput=(id,body)=>walletRequest(`/api/rooms/${id}/match/tankrun/input`,{method:'POST',body});
