import { useEffect, useState } from 'react';
import AnimatedAmount from './AnimatedAmount';
import { currentSession } from '../api/accounts';
import { partnerCommissions } from '../api/partners';
import { referralLink } from '../referrals/context';
import '../styles/owner-commissions.css';
import '../styles/referrals.css';
import '../styles/partner-commissions.css';
const fmt=n=>new Intl.NumberFormat('fr-CI').format(n||0);
const when=value=>new Date(value).toLocaleString('fr-FR',{timeZone:'Africa/Abidjan'});
export default function PartnerCommissionSummary(){
  const [data,setData]=useState(null),[error,setError]=useState(''),[refresh,setRefresh]=useState(0),[copyMessage,setCopyMessage]=useState(''),[offset,setOffset]=useState(0);
  useEffect(()=>{
    let alive=true;setData(null);setError('');setCopyMessage('');
    partnerCommissions(offset).then(result=>{if(alive)setData(result);}).catch(e=>{if(alive)setError(e.message||'Impossible de charger tes commissions.');});
    return()=>{alive=false;};
  },[refresh,offset]);
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
      {data.commissions_enabled&&<>
        <p className="wallet-notice">Tu reçois 10 % du montant net de chaque rechargement confirmé de tes filleuls, hors frais, arrondis au franc inférieur. Statut partenaire actif requis à la validation. Aucun gain sur une demande en attente ou refusée.</p>
        <p className="sheet__text">{fmt(data.deposit_count)} rechargement(s) rémunéré(s). Ton solde bonus peut aussi contenir tes gains de jeu.</p>
        <section className="partner-commissions" aria-label="Historique des commissions">
          <h3>Historique des commissions</h3>
          {(data.history||[]).length ? <ul>{data.history.map(item=><li key={item.transaction_id}>
            <div className="partner-commissions__line"><strong>+{fmt(item.amount)} V</strong><span>{item.player_pseudo}</span></div>
            <span>Rechargement confirmé : {fmt(item.deposit_amount)} F CFA</span>
            <small>{when(item.created_at)} · #{item.transaction_id.slice(0,8)}</small>
          </li>)}</ul> : <p className="sheet__text">Aucune commission pour le moment. Tes gains apparaîtront ici après la validation des rechargements de tes filleuls.</p>}
          {(offset>0||data.has_more)&&<div className="partner-commissions__pages">
            <button type="button" className="btn btn--glass" disabled={offset===0} onClick={()=>setOffset(n=>Math.max(0,n-20))}>Précédent</button>
            <span>Page {Math.floor((data.history_offset??offset)/20)+1}</span>
            <button type="button" className="btn btn--glass" disabled={!data.has_more} onClick={()=>setOffset(n=>n+20)}>Suivant</button>
          </div>}
          <small>Dates et totaux par jour : Abidjan (UTC+0).</small>
        </section>
        {(data.daily||[]).length>0&&<details className="partner-commissions__daily"><summary>Gains par jour</summary><ul>{data.daily.map(day=><li key={day.date}><span>{day.date} · {day.deposits} rechargement(s)</span><strong>+{fmt(day.amount)} V</strong></li>)}</ul></details>}
      </>}
      {!data.commissions_enabled&&<p className="sheet__text">Ton solde bonus peut aussi contenir tes gains de jeu.</p>}
    </>}
    <button type="button" className="btn btn--glass btn--block" onClick={()=>{setOffset(0);setRefresh(n=>n+1);}}>Actualiser les gains</button>
  </section>;
}
