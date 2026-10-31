export const REFERRAL_STORAGE='maf-referral-signup-v1';
export const REFERRAL_CODE=/^MAF-[A-F0-9]{24}$/;
export const validReferralCode=value=>typeof value==='string'&&REFERRAL_CODE.test(value);
export function referralFromUrl(href){
 const url=new URL(href),codes=url.searchParams.getAll('parrainage');
 if(!codes.length)return{present:false,code:null};
 return{present:true,code:codes.length===1&&validReferralCode(codes[0])?codes[0]:null};
}
export function storedReferral(raw,now=Date.now()){
 try{const value=JSON.parse(raw);return validReferralCode(value?.code)&&Number.isSafeInteger(value.saved_at)&&value.saved_at<=now&&now-value.saved_at<86400000?value.code:null;}catch{return null;}
}
export function referralLink(code,href){
 if(!validReferralCode(code))throw new Error('Code de parrainage invalide.');
 const url=new URL(href);if(!['http:','https:'].includes(url.protocol))throw new Error('Adresse du site invalide.');
 url.search='';url.searchParams.set('parrainage',code);url.hash='profil';return url.toString();
}
export function withoutReferral(href){const url=new URL(href);url.searchParams.delete('parrainage');return url.toString();}
