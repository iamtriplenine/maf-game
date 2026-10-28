import { useCallback,useEffect,useState } from 'react';
import { SKINS } from '../characters/skins';
import { clearLegacyTestGifts,createOwnerGift,ownerGiftList,revokeOwnerGift } from '../api/ownerGifts';
import '../styles/owner-gifts.css';
const TYPES=[['coupon','Coupon'],['skin','Skin exclusif'],['background','Arrière-plan'],['image','Image'],['balance','Solde réel (F)'],['bonus','Solde bonus (F)']];
const EMPTY={title:'',message:'',targetMode:'clientId',targetValue:'',kind:'coupon',amount:'',currency:'F',skinId:'',backgroundId:'matrix-rain',imageData:''};
const skins=SKINS.filter(s=>s.access==='exclusive');
const summarize=gift=>`${gift.title} · ${gift.lotCount>1?`${gift.lotCount} lots`:gift.kind} · ${gift.openedCount}/${gift.recipientCount} ouverts`;
const EMPTY_LOT={kind:'balance',amount:'',currency:'F',skinId:'',backgroundId:'matrix-rain',imageData:''};
function LotFields({lot,onChange,onImage}){
 const set=(key,value)=>onChange({...lot,[key]:value});
 return <div className="maf-owner-gifts__lot-fields">
  <label>Type de lot<select value={lot.kind} onChange={e=>set('kind',e.target.value)}>{TYPES.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
  {['coupon','balance','bonus'].includes(lot.kind)&&<label>Montant (F)<input required type="number" min="1" max="1000000" step="1" value={lot.amount} onChange={e=>set('amount',e.target.value)}/></label>}
  {lot.kind==='coupon'&&<label>Solde du coupon<select value={lot.currency} onChange={e=>set('currency',e.target.value)}><option value="F">Solde réel</option><option value="V">Solde bonus</option></select></label>}
  {lot.kind==='skin'&&<label>Skin<select required value={lot.skinId} onChange={e=>set('skinId',e.target.value)}><option value="">Choisir un skin</option>{skins.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>}
  {lot.kind==='background'&&<label>Arrière-plan<select value={lot.backgroundId} onChange={e=>set('backgroundId',e.target.value)}><option value="matrix-rain">Pluie Matrix</option><option value="classic">Classique</option></select></label>}
  {lot.kind==='image'&&<label>Image à offrir<input type="file" accept="image/png,image/jpeg,image/webp" required={!lot.imageData} onChange={e=>onImage(e.target.files?.[0])}/>{lot.imageData&&<img className="maf-owner-gifts__preview" src={lot.imageData} alt="Aperçu du lot"/>}</label>}
 </div>;
}
export default function OwnerGiftManager(){
 const [form,setForm]=useState(EMPTY),[multi,setMulti]=useState(false),[lots,setLots]=useState([{...EMPTY_LOT},{...EMPTY_LOT}]),[list,setList]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const set=(field,value)=>setForm(v=>({...v,[field]:value}));
 const load=useCallback(async()=>{const data=await ownerGiftList();setList(data.gifts||[]);},[]);
 useEffect(()=>{void load().catch(e=>setError(e.message));},[load]);
 const imageChange=async e=>{
  const file=e.target.files?.[0];if(!file)return;
  setError('');if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>480000){setError('Image PNG, JPEG ou WebP de moins de 480 Ko requise.');return;}
  const reader=new FileReader();reader.onload=()=>set('imageData',String(reader.result||''));reader.onerror=()=>setError('Impossible de lire cette image.');reader.readAsDataURL(file);
 };
 const imageForLot=(idx,file)=>{
  if(!file)return;
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>480000){setError('Image PNG, JPEG ou WebP de moins de 480 Ko requise.');return;}
  const reader=new FileReader();reader.onload=()=>setLots(prev=>prev.map((l,i)=>i===idx?{...l,imageData:String(reader.result||'')}:l));
  reader.onerror=()=>setError('Impossible de lire l’image.');reader.readAsDataURL(file);
 };
 const send=async e=>{
  e.preventDefault();if(busy)return;
  if(form.targetMode==='all'&&!window.confirm('Offrir ce cadeau à tous les comptes existants ?'))return;
  setBusy(true);setError('');setNotice('');
  try{
   const payload=multi?{...form,lots:lots.map(l=>({...l,amount:Number(l.amount)}))}:{...form,amount:Number(form.amount)};
   const out=await createOwnerGift(payload);
   setNotice(`Cadeau programmé pour ${out.recipientCount} compte(s).`);
   setForm(EMPTY);setMulti(false);setLots([{...EMPTY_LOT},{...EMPTY_LOT}]);await load();
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
    <label className="maf-owner-gifts__multi-toggle"><input type="checkbox" checked={multi} onChange={e=>setMulti(e.target.checked)}/> Plusieurs lots dans le même coffre</label>
    {multi?<section className="maf-owner-gifts__lots" aria-label="Lots du coffre">
      <h3>Contenu du coffre · {lots.length} lots</h3>
      {lots.map((lot,i)=><div key={i} className="maf-owner-gifts__lot">
        <div className="maf-owner-gifts__lot-head"><strong>Lot {i+1}</strong>{lots.length>2&&<button type="button" onClick={()=>setLots(v=>v.filter((_,j)=>j!==i))}>Retirer ce lot</button>}</div>
        <LotFields lot={lot} onChange={next=>setLots(v=>v.map((l,j)=>j===i?next:l))} onImage={file=>imageForLot(i,file)}/>
      </div>)}
      {lots.length<5&&<button type="button" onClick={()=>setLots(v=>[...v,{...EMPTY_LOT}])}>+ Ajouter un lot</button>}
    </section>:<>
    <label>Type de cadeau<select value={form.kind} onChange={e=>set('kind',e.target.value)}>{TYPES.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
    {['coupon','balance','bonus'].includes(form.kind)&&<label>Montant (francs entiers)<input required type="number" min="1" max="1000000" step="1" value={form.amount} onChange={e=>set('amount',e.target.value)}/></label>}
    {form.kind==='coupon'&&<label>Solde du coupon<select value={form.currency} onChange={e=>set('currency',e.target.value)}><option value="F">Solde réel</option><option value="V">Solde bonus</option></select><small>Un code de coupon unique sera créé pour chaque bénéficiaire.</small></label>}
    {form.kind==='skin'&&<label>Skin à débloquer<select required value={form.skinId} onChange={e=>set('skinId',e.target.value)}><option value="">Choisir un skin exclusif</option>{skins.map(s=><option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}</select></label>}
    {form.kind==='background'&&<label>Arrière-plan<select value={form.backgroundId} onChange={e=>set('backgroundId',e.target.value)}><option value="matrix-rain">Pluie Matrix</option><option value="classic">Classique</option></select></label>}
    {form.kind==='image'&&<label>Image à offrir<input type="file" required accept="image/png,image/jpeg,image/webp" onChange={imageChange}/>{form.imageData&&<img className="maf-owner-gifts__preview" src={form.imageData} alt="Image sélectionnée"/>}</label>}
    </>}
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
