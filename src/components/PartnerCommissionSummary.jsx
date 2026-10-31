import { useEffect, useState } from 'react';
import AnimatedAmount from './AnimatedAmount';
import { currentSession } from '../api/accounts';
import { partnerCommissions } from '../api/partners';
import '../styles/owner-commissions.css';
const fmt=n=>new Intl.NumberFormat('fr-CI').format(n||0);
export default function PartnerCommissionSummary(){
  const [data,setData]=useState(null),[error,setError]=useState(''),[refresh,setRefresh]=useState(0);
  useEffect(()=>{
    let alive=true;setData(null);setError('');
    partnerCommissions().then(result=>{if(alive)setData(result);}).catch(e=>{if(alive)setError(e.message||'Impossible de charger tes commissions.');});
    return()=>{alive=false;};
  },[refresh]);
  return <section className="owner-earnings" aria-label="Commissions partenaire">
    {!data&&!error&&<p className="sheet__text">Chargement de tes commissions…</p>}
    {error&&<p className="sheet__error" role="alert">{error}</p>}
    {data&&<>
      <p className="wallet-notice"><strong>Statut partenaire actif</strong></p>
      <div className="owner-earnings__summary">
        <div><span>Aujourd’hui</span><strong>{fmt(data.today)} V</strong></div>
        <div><span>7 derniers jours</span><strong>{fmt(data.last_7_days)} V</strong></div>
        <div><span>Commissions cumulées</span><strong>{fmt(data.total)} V</strong></div>
        <div><span>Bonus actuel du compte</span><strong><AnimatedAmount value={data.bonus_balance} cacheKey={`wallet:${currentSession()?.id}:V`} suffix=" V"/></strong></div>
      </div>
      <p className="sheet__text">Parrainage en préparation. Ton lien d’invitation et le suivi de tes filleuls seront disponibles lors de son activation.</p>
      <p className="sheet__text">Aucune commission de parrainage n’a encore été versée. Ton solde bonus peut aussi contenir tes gains de jeu.</p>
    </>}
    <button type="button" className="btn btn--glass btn--block" onClick={()=>setRefresh(n=>n+1)}>Actualiser les gains</button>
  </section>;
}
