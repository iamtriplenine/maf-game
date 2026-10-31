import AnimatedAmount from './AnimatedAmount';
import {currentSession} from '../api/accounts';
import {useEffect,useState} from 'react';
import {walletRequest} from '../api/accounts';
import '../styles/owner-commissions.css';
const fmt=n=>new Intl.NumberFormat('fr-CI').format(n||0);
export default function OwnerCommissionSummary(){
  const [data,setData]=useState(null),[error,setError]=useState(''),[refresh,setRefresh]=useState(0);
  useEffect(()=>{
    let live=true;
    walletRequest('/api/wallet/owner-commissions').then(result=>{if(live)setData(result);})
      .catch(e=>{if(live)setError(e.message||'Erreur de chargement');});
    return ()=>{live=false;};
  },[refresh]);
  return <section className="owner-earnings" aria-label="Commissions proprietaire">
    {!data && !error && <p>Chargement de tes commissions…</p>}
    {error && <p role="alert" className="sheet__error">{error}</p>}
    {data && <>
      <p className="sheet__text">Compte propriétaire · Accès exclusif</p>
      <div className="owner-earnings__summary">
        <div><span>Aujourd’hui</span><strong>{fmt(data.today)} V</strong></div>
        <div><span>7 derniers jours</span><strong>{fmt(data.last_7_days)} V</strong></div>
        <div><span>Commissions cumulées</span><strong>{fmt(data.total)} V</strong></div>
        <div><span>Bonus actuel du compte</span><strong><AnimatedAmount value={data.owner_bonus_balance} cacheKey={`wallet:${currentSession()?.id}:V`} suffix=" V"/></strong></div>
      </div>
      <p className="sheet__text">{data.withdrawal_count} retrait(s) validé(s) ayant généré une commission. Historique daté à Abidjan (UTC+0).</p>
      <h3>Détail par jour</h3>
      {data.daily.length ? <div className="owner-earnings__daily">{data.daily.map(d=><div key={d.date}><span>{d.date} · {d.withdrawals} retrait(s)</span><strong>+{fmt(d.amount)} V</strong></div>)}</div> : <p className="sheet__text">Aucune commission encaissée.</p>}
    </>}
    <button type="button" className="btn btn--glass btn--block" onClick={()=>{setData(null);setError('');setRefresh(n=>n+1);}}>Actualiser les gains</button>
  </section>;
}
