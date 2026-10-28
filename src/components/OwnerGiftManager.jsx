import { useCallback,useEffect,useState } from 'react';
import { SKINS } from '../characters/skins';
import { clearLegacyTestGifts,createOwnerGift,ownerGiftList,revokeOwnerGift } from '../api/ownerGifts';
import '../styles/owner-gifts.css';
const TYPES=[['coupon','Coupon'],['skin','Skin exclusif'],['background','Arrière-plan'],['image','Image'],['balance','Solde réel (F)'],['bonus','Solde bonus (F)']];
const EMPTY={title:'',message:'',targetMode:'clientId',targetValue:'',kind:'coupon',amount:'',currency:'F',skinId:'',backgroundId:'matrix-rain',imageData:''};
const skins=SKINS.filter(s=>s.access==='exclusive');
const summarize=gift=>`${gift.title} · ${gift.kind} · ${gift.openedCount}/${gift.recipientCount} ouverts`;
export default function OwnerGiftManager(){
 const [form,setForm]=useState(EMPTY),[list,setList]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const set=(field,value)=>setForm(v=>({...v,[field]:value}));
 const load=useCallback(async()=>{const data=await ownerGiftList();setList(data.gifts||[]);},[]);
 useEffect(()=>{void load().catch(e=>setError(e.message));},[load]);
 const imageChange=async e=>{
  const file=e.target.files?.[0];if(!file)return;
  setError('');if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>480000){setError('Image PNG, JPEG ou WebP de moins de 480 Ko requise.');return;}
  const reader=new FileReader();reader.onload=()=>set('imageData',String(reader.result||''));reader.onerror=()=>setError('Impossible de lire cette image.');reader.readAsDataURL(file);
 };
 const send=async e=>{
  e.preventDefault();if(busy)return;
  if(form.targetMode==='all'&&!window.confirm('Offrir ce cadeau à tous les comptes existants ?'))return;
  setBusy(true);setError('');setNotice('');
  try{
   const out=await createOwnerGift({...form,amount:Number(form.amount)});
   setNotice(`Cadeau programmé pour ${out.recipientCount} compte(s).`);
   setForm(EMPTY);await load();
  }catch(ex){setError(ex.message);}finally{setBusy(false);}
 };
 const clear=async()=>{
  if(busy||!window.confirm('Masquer tous les anciens cadeaux de tournois et de duels pour tous les comptes ? Les crédits et les historiques financiers restent conservés.'))return;
  setBusy(true);setError('');setNotice('');
  try{await clearLegacyTestGifts();setNotice('Anciens coffres de test masqués pour tous les comptes.');await load();}
  catch(e){setError(e.message);}finally{setBusy(false);}
 };
 const cancel=async gift=>{
  if(busy||!window.confirm(`Retirer « ${gift.title} » des coffres non ouverts ? Les crédits déjà reçus ne seront pas annulés.`))return;
  setBusy(true);setError('');
  try{await revokeOwnerGift(gift.id);setNotice('Cadeau retiré.');await load();}catch(e){setError(e.message);}finally{setBusy(false);}
 };
 return <div className="maf-owner-gifts">
   <header><h2>Programmer un cadeau</h2><p>Compte propriétaire 999 · Distribution indépendante des tournois</p></header>
   {error&&<p className="maf-owner-gifts__error" role="alert">{error}</p>}
   {notice&&<p className="maf-owner-gifts__success" role="status">{notice}</p>}
   <form onSubmit={send} className="maf-owner-gifts__form">
    <label>Titre<input required maxLength={80} minLength={3} value={form.title} onChange={e=>set('title',e.target.value)} placeholder="Un cadeau pour toi"/></label>
    <label>Message<textarea maxLength={300} value={form.message} onChange={e=>set('message',e.target.value)} placeholder="Message facultatif"/></label>
    <label>Type de cadeau<select value={form.kind} onChange={e=>set('kind',e.target.value)}>{TYPES.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
    {['coupon','balance','bonus'].includes(form.kind)&&<label>Montant (francs entiers)<input required type="number" min="1" max="1000000" step="1" value={form.amount} onChange={e=>set('amount',e.target.value)}/></label>}
    {form.kind==='coupon'&&<label>Solde du coupon<select value={form.currency} onChange={e=>set('currency',e.target.value)}><option value="F">Solde réel</option><option value="V">Solde bonus</option></select><small>Un code de coupon unique sera créé pour chaque bénéficiaire.</small></label>}
    {form.kind==='skin'&&<label>Skin à débloquer<select required value={form.skinId} onChange={e=>set('skinId',e.target.value)}><option value="">Choisir un skin exclusif</option>{skins.map(s=><option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}</select></label>}
    {form.kind==='background'&&<label>Arrière-plan<select value={form.backgroundId} onChange={e=>set('backgroundId',e.target.value)}><option value="matrix-rain">Pluie Matrix</option><option value="classic">Classique</option></select></label>}
    {form.kind==='image'&&<label>Image à offrir<input type="file" required accept="image/png,image/jpeg,image/webp" onChange={imageChange}/>{form.imageData&&<img className="maf-owner-gifts__preview" src={form.imageData} alt="Image sélectionnée"/>}</label>}
    <label>Pour qui ?<select value={form.targetMode} onChange={e=>set('targetMode',e.target.value)}><option value="clientId">Identifiant client</option><option value="pseudo">Pseudo précis</option><option value="all">Tous les comptes existants</option></select></label>
    {form.targetMode!=='all'&&<label>{form.targetMode==='pseudo'?'Pseudo du joueur':'ID client à cinq chiffres'}<input required value={form.targetValue} maxLength={form.targetMode==='pseudo'?20:5} onChange={e=>set('targetValue',e.target.value)} placeholder={form.targetMode==='pseudo'?'Pseudo':'00000'}/></label>}
    <button className="maf-owner-gifts__primary" type="submit" disabled={busy}>{busy?'Enregistrement…':'Programmer et envoyer le cadeau'}</button>
   </form>
   <section className="maf-owner-gifts__history"><h3>Mes cadeaux programmés</h3>
    {!list.length&&<p>Aucun cadeau envoyé pour le moment.</p>}
    {list.map(g=><div className="maf-owner-gifts__history-row" key={g.id}><span>{summarize(g)}{g.revokedAt?' · Retiré':''}</span>{!g.revokedAt&&<button disabled={busy} type="button" onClick={()=>void cancel(g)}>Retirer</button>}</div>)}
   </section>
   <section className="maf-owner-gifts__clean"><h3>Nettoyage des essais Duo</h3><p>Masquer les anciens coffres de tournois et de duels sur tous les profils. Aucun solde, bonus, coupon utilisé ou historique financier ne sera supprimé.</p>
    <button type="button" disabled={busy} onClick={()=>void clear()}>Vider l'affichage des anciens cadeaux de test</button>
   </section>
 </div>;
}
