import { walletRequest } from './accounts';
export function partnerAccounts(q='',offset=0){
  const query=new URLSearchParams({q,offset:String(offset)});
  return walletRequest('/api/owner/partners?'+query);
}
export function changePartnerStatus({id,active,expected_role,request_key}){
  return walletRequest('/api/owner/partners/'+id,{method:'PATCH',body:{active,expected_role,request_key}});
}
export const partnerCommissions=()=>walletRequest('/api/partner/commissions');
