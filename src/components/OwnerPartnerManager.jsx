import { useCallback, useEffect, useRef, useState } from 'react';
import { partnerAccounts, changePartnerStatus } from '../api/partners';
import '../styles/partners.css';
const roleName=role=>role==='partner'?'Partenaire':'Joueur';
export default function OwnerPartnerManager(){
  const [query,setQuery]=useState(''),[data,setData]=useState(null),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[pending,setPending]=useState(null);
  const page=useRef({q:'',offset:0}),sequence=useRef(0),alive=useRef(false),inFlight=useRef(false);
  const load=useCallback(async(q,offset)=>{
    const seq=++sequence.current;
    setLoading(true);setError('');
    try{
      const result=await partnerAccounts(q,offset);
      if(alive.current&&seq===sequence.current){setData(result);page.current={q,offset};}
    }catch(e){if(alive.current&&seq===sequence.current)setError(e.message||'Impossible de charger les comptes.');}
    finally{if(alive.current&&seq===sequence.current)setLoading(false);}
  },[]);
  useEffect(()=>{alive.current=true;void load('',0);return()=>{alive.current=false;sequence.current+=1;};},[load]);
  async function apply(intent){
    if(inFlight.current)return;
    inFlight.current=true;setSaving(true);setError('');setNotice('');
    try{
      const result=await changePartnerStatus(intent);
      if(!alive.current)return;
      setPending(null);
      setData(old=>old?{...old,accounts:old.accounts.map(item=>item.id===result.account.id?result.account:item)}:old);
      await load(page.current.q,page.current.offset);
      if(alive.current)setNotice(`${result.account.pseudo} : ${roleName(result.account.account_role).toLowerCase()}.`);
    }catch(e){
      if(!alive.current)return;
      if(e.status>=400&&e.status<500){setPending(null);if(e.status===409)await load(page.current.q,page.current.offset);}
      if(alive.current)setError(e.message||'Impossible de modifier le statut.');
    }finally{inFlight.current=false;if(alive.current)setSaving(false);}
  }
  function choose(account){
    if(inFlight.current||pending)return;
    const intent={id:account.id,active:account.account_role!=='partner',expected_role:account.account_role,request_key:crypto.randomUUID()};
    setPending(intent);void apply(intent);
  }
  const disabled=loading||saving||Boolean(pending);
  return <section className="partners" aria-label="Gestion des partenaires" aria-busy={loading||saving}>
    <p className="sheet__text">Choisis les comptes qui auront accès à « Mes commissions ». Leurs droits restent limités à leur espace partenaire.</p>
    <div className="partners__count"><strong>{data?.active_partner_count??'…'}</strong><span>partenaire(s) actif(s)</span></div>
    <form className="partners__search" onSubmit={e=>{e.preventDefault();if(!disabled){setNotice('');void load(query.trim(),0);}}}>
      <label className="wallet-label" htmlFor="partner-search">Pseudo ou identifiant du compte</label>
      <div><input id="partner-search" type="search" maxLength={40} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher un compte" disabled={saving||Boolean(pending)}/><button className="btn btn--primary" disabled={disabled}>Rechercher</button></div>
    </form>
    {loading&&<p className="sheet__text" role="status">Chargement des comptes…</p>}
    {error&&<p className="sheet__error" role="alert">{error}</p>}
    {notice&&<p className="wallet-notice" role="status">{notice}</p>}
    {pending&&!saving&&<div className="wallet-notice"><p>La réponse doit être vérifiée. Réessaie la même demande avant de modifier un autre compte.</p><button type="button" className="btn btn--primary btn--block" onClick={()=>void apply(pending)}>Vérifier la demande</button></div>}
    {data&&<>
      <ul className="partners__accounts" aria-label="Comptes disponibles">{data.accounts.map(account=><li key={account.id}>
        <div className="partners__identity"><strong>{account.pseudo}</strong><small>#{account.client_id}</small><span className={`partners__role${account.account_role==='partner'?' is-active':''}`}>{roleName(account.account_role)}</span></div>
        <button type="button" className={`btn ${account.account_role==='partner'?'btn--glass':'btn--primary'}`} disabled={disabled} aria-label={`${account.account_role==='partner'?'Retirer le statut partenaire à':'Activer comme partenaire'} ${account.pseudo}`} onClick={()=>choose(account)}>{account.account_role==='partner'?'Retirer le statut':'Activer'}</button>
      </li>)}</ul>
      {!loading&&!data.accounts.length&&<p className="sheet__text">Aucun compte ne correspond à cette recherche.</p>}
      <div className="partners__pagination"><button type="button" className="btn btn--glass" disabled={disabled||data.offset===0} onClick={()=>void load(page.current.q,Math.max(0,data.offset-30))}>Précédent</button><span>Page {Math.floor(data.offset/30)+1}</span><button type="button" className="btn btn--glass" disabled={disabled||!data.has_more} onClick={()=>void load(page.current.q,data.offset+30)}>Suivant</button></div>
      {data.recent_changes.length>0&&<details className="partners__history"><summary>Dernières décisions</summary><ul>{data.recent_changes.map((event,index)=><li key={`${event.user_id}:${event.created_at}:${index}`}><strong>{event.pseudo}</strong><span>{roleName(event.previous_role)} → {roleName(event.new_role)}</span><small>{new Date(event.created_at).toLocaleString('fr-FR',{timeZone:'Africa/Abidjan'})}</small></li>)}</ul></details>}
    </>}
    <p className="sheet__text">Retirer le statut ferme l’accès partenaire. Les bonus déjà présents sur le compte sont conservés.</p>
    <button type="button" className="btn btn--glass btn--block" disabled={disabled} onClick={()=>void load(page.current.q,page.current.offset)}>Actualiser les comptes</button>
  </section>;
}
