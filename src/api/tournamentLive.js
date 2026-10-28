import { walletRequest } from './accounts';
export const myQualification = () => walletRequest('/api/tournaments/qualifications/mine');
export const qualificationPresence = (id,state='here') => walletRequest(`/api/tournaments/qualifications/${id}/presence`,{method:'POST',body:{state}});
export const qualificationAction = (id,revision,action,square) => walletRequest(`/api/tournaments/qualifications/${id}/action`,{method:'POST',body:{revision,action,square}});
