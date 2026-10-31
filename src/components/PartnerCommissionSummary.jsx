import { useEffect, useState } from 'react';
import AnimatedAmount from './AnimatedAmount';
import { currentSession } from '../api/accounts';
import { partnerCommissions } from '../api/partners';
import { referralLink } from '../referrals/context';
import '../styles/owner-commissions.css';
import '../styles/referrals.css';
const fmt=n=>new Intl.NumberFormat('fr-CI').format(n||0);
export default function PartnerCommissionSummary(){
  const [data,setData]=useState(null),[error,setError]=useState(''),[refresh,setRefresh]=useState(0),[copyMessage,setCopyMessage]=useState('');
  useEffect(()=>{
    let alive=true;setData(null);setError('');setCopyMessage('');
    partnerCommissions().then(result=>{if(alive)setData(result);}).catch(e=>{if(alive)setError(e.message||'Impossible de charger tes commissions.');});
    return()=>{alive=false;};
  },[refresh]);
  const link=data?.invitation?.code?referralLink(data.invitation.code,window.location.href):'';
  async function copyLink(){
    try{await navigator.clipboard.writeText(link);setCopyMessage('Lien copié.');}
    catch{setCopyMessage('Sélectionne le lien ci-dessus pour le copier.');}
  }
  return <section className="owner-earnings" aria-label="Commissions partenaire">
    {!data&&!error&&<p className="sheet__text">Chargement de tes commissions…</p>}
    {error&&<p role="alert" className="sheet__error">{error}</p>}
    {data&&<>
      <p className="wallet-notice"><strong>Statut partenaire actif</strong></p>
      {link&&<div className="referral-notice">
        <label className="wallet-label" htmlFor="partner-referral-link">Ton lien de parrainage</label>
        <input id="partner-referral-link" className="referral-link" value={link} readOnly onFocus={e=>e.target.select()} />
        <button type="button" className="btn btn--primary btn--block" onClick={()=>void copyLink()}>Copier mon lien</button>
        {copyMessage&&<small role="status">{copyMessage}</small>}
        <p><strong>{fmt(data.invitation.referral_count)}</strong> filleul(s) inscrit(s).</p>
        <small>Les nouveaux comptes créés avec ce lien seront rattachés à ton compte partenaire.</small>
      </div>}
      <div className="owner-earnings__summary">
        <div><span>Aujourd’hui</span><strong>{fmt(data.today)} V</strong></div>
        <div><span>7 derniers jours</span><strong>{fmt(data.last_7_days)} V</strong></div>
        <div><span>Commissions cumulées</span><strong>{fmt(data.total)} V</strong></div>
        <div><span>Bonus actuel du compte</span><strong><AnimatedAmount value={data.bonus_balance} cacheKey={`wallet:${currentSession()?.id}:V`} suffix=" V"/></strong></div>
      </div>
      {data.referrals_enabled&&link ? !data.commissions_enabled&&<p className="sheet__text">Les inscriptions par parrainage sont actives. Les commissions de 10 % sur les rechargements ne sont pas encore activées.</p> : <p className="sheet__text">Ton lien de parrainage est en préparation. Actualise dans un instant.</p>}
      <p className="sheet__text">Ton solde bonus peut aussi contenir tes gains de jeu.</p>
    </>}
    <button type="button" className="btn btn--glass btn--block" onClick={()=>setRefresh(n=>n+1)}>Actualiser les gains</button>
  </section>;
}
