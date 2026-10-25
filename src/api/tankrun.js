import {walletRequest} from './accounts';
// MAF_TANKRUN_LAG_V1 : images legeres (?lite=1) ; le terrain n'est demande qu'une fois (?full=1).
export const setTankRunSetup=(id,body)=>walletRequest(`/api/rooms/${id}/match/tankrun/prepare`,{method:'POST',body});
export const getTankRunSnapshot=(id,{full}={})=>walletRequest(`/api/rooms/${id}/match/tankrun/snapshot?lite=1${full?'&full=1':''}`);
export const sendTankRunInput=(id,body)=>walletRequest(`/api/rooms/${id}/match/tankrun/input`,{method:'POST',body});
