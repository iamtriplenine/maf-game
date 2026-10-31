import { useCallback, useEffect, useRef, useState } from 'react';
import { resolveReferral } from '../api/accounts';
import { REFERRAL_STORAGE, referralFromUrl, storedReferral, withoutReferral } from './context';
export default function useReferralSignup(session,onOpenSignup){
 const [referral,setReferral]=useState({status:'none'}),generation=useRef(0);
 const refresh=useCallback(async()=>{
  const current=++generation.current,fromUrl=referralFromUrl(window.location.href);
  let stored=null;try{stored=storedReferral(sessionStorage.getItem(REFERRAL_STORAGE));}catch{}
  if(fromUrl.present&&!fromUrl.code){
   try{sessionStorage.removeItem(REFERRAL_STORAGE);}catch{}
   setReferral({status:'error',message:'Ce lien de parrainage est invalide.'});
   if(!session?.id)onOpenSignup();return;
  }
  const code=fromUrl.present?fromUrl.code:stored;
  if(!code){setReferral({status:'none'});return;}
  try{sessionStorage.setItem(REFERRAL_STORAGE,JSON.stringify({code,saved_at:Date.now()}));}catch{}
  setReferral({status:'loading',code});if(!session?.id)onOpenSignup();
  try{
   const data=await resolveReferral(code);
   if(current!==generation.current)return;
   if(data.code!==code||typeof data.proof!=='string'||!Number.isFinite(Date.parse(data.expires_at)))throw new Error('Impossible de vérifier ce lien de parrainage.');
   setReferral({status:'valid',code,proof:data.proof,partner_pseudo:data.partner_pseudo,expires_at:data.expires_at});
  }catch(e){if(current===generation.current)setReferral({status:'error',code,message:e.message||'Impossible de vérifier ce lien.'});}
 },[session?.id,onOpenSignup]);
 useEffect(()=>{
  void refresh();const sync=()=>void refresh();
  window.addEventListener('popstate',sync);window.addEventListener('hashchange',sync);
  return()=>{generation.current+=1;window.removeEventListener('popstate',sync);window.removeEventListener('hashchange',sync);};
 },[refresh]);
 useEffect(()=>{
  if(referral.status!=='valid')return undefined;
  const timer=window.setTimeout(()=>setReferral(old=>old.status==='valid'?{...old,status:'expired',proof:undefined,message:'Le lien doit être actualisé avant de créer ton compte.'}:old),Math.max(0,Date.parse(referral.expires_at)-Date.now()));
  return()=>window.clearTimeout(timer);
 },[referral.status,referral.expires_at]);
 const clear=useCallback(()=>{
  generation.current+=1;try{sessionStorage.removeItem(REFERRAL_STORAGE);}catch{}
  window.history.replaceState(window.history.state,'',withoutReferral(window.location.href));setReferral({status:'none'});
 },[]);
 return{referral,refresh,clear};
}
