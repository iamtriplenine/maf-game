import {API_URL} from './config';
import {walletRequest} from './accounts';
export async function publicDuels(){
 const r=await fetch(`${API_URL}/api/tournaments/duels`,{cache:'no-store'});
 const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Impossible de charger les duels.');return d.duels||[];
}
export const ownerDuels=()=>walletRequest('/api/tournaments/duels/owner');
export const createDuel=data=>walletRequest('/api/tournaments/duels/owner',{method:'POST',body:data});
export const reserveDuel=id=>walletRequest(`/api/tournaments/duels/${id}/reserve`,{method:'POST',body:{}});
export const myDuels=()=>walletRequest('/api/tournaments/duels/mine');
export const duelGame=id=>walletRequest(`/api/tournaments/duels/${id}/game`);
export const duelAction=(id,revision,action,square)=>walletRequest(`/api/tournaments/duels/${id}/action`,{method:'POST',body:{revision,action,square}});
export const duelNotices=()=>walletRequest('/api/tournaments/duels/notices/mine');
export const duelGifts=()=>walletRequest('/api/tournaments/duels/gifts/mine');
export const openDuelGift=id=>walletRequest(`/api/tournaments/duels/gifts/${id}/open`,{method:'POST',body:{}});
export const editDuel=(id,data)=>walletRequest(`/api/tournaments/duels/owner/${id}`,{method:'PUT',body:data});
export const cancelDuel=id=>walletRequest(`/api/tournaments/duels/owner/${id}/cancel`,{method:'POST',body:{}});
export const archiveDuel=id=>walletRequest(`/api/tournaments/duels/owner/${id}/archive`,{method:'POST',body:{}});
