import { useState } from 'react';
import { ownerTournaments } from '../api/tournaments';
import { ownerSkinPreview, ownerSkinStatus } from '../api/tournamentSkins';
import '../styles/tournament-step-nine.css';

const sample = [
  {name:'1er finaliste',rank:1,real:'2 000',bonus:'100',winner:true},
  {name:'2e finaliste',rank:2,real:'1 600',bonus:'100',winner:true},
  {name:'3e finaliste',rank:3,real:'1 500',bonus:'100',winner:true},
  {name:'4e finaliste',rank:4,real:'1 400',bonus:'100',winner:true},
  {name:'Joueur éliminé',rank:null,real:'62,50',bonus:'100',winner:false},
];

function SkinPreview({kind}) {
  const finalist = kind === 'finalist';
  return <div className={`tourney-nine__skin tourney-nine__skin--${kind}`} aria-label={finalist?'Emplacement skin des finalistes':'Emplacement skin de participation'}>
    <span aria-hidden="true" className="tourney-nine__skin-icon">{finalist?'♛':'✦'}</span>
    <strong>{finalist?'Skin des finalistes':'Skin de participation'}</strong>
    <small>Visuel définitif à fournir</small>
  </div>;
}

export default function TournamentStepNineLab(){
  const [open,setOpen]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [tournaments,setTournaments]=useState([]);
  const [selection,setSelection]=useState('');
  const [view,setView]=useState(null);
  const [index,setIndex]=useState(-1);
  async function toggle(){
    if(open){setOpen(false);setError('');return;}
    setBusy(true);setError('');
    try {
      const owner=await ownerTournaments();
      if(!Array.isArray(owner?.tournaments))throw new Error('Verification proprietaire impossible.');
      const preview=await ownerSkinPreview();
      if(preview.type!=='demo'||preview.total!==24)throw new Error('Reponse de demonstration incoherente.');
      setTournaments(owner.tournaments);setView(preview);setSelection('');setIndex(-1);setOpen(true);
    } catch(e){setError(e?.message||'Demonstration indisponible.');}
    finally{setBusy(false);}
  }
  async function select(value){
    setSelection(value);setBusy(true);setError('');setIndex(-1);
    try {setView(value?await ownerSkinStatus(value):await ownerSkinPreview());}
    catch(e){setError(e?.message||'Inspection indisponible.');setView(null);}
    finally{setBusy(false);}
  }
  const demo=view?.type==='demo';
  const player=index>=0?sample[index]:null;
  return <section className="tourney-nine" aria-label="Étape neuf, skins et résultats du tournoi">
    <button className="tourney-nine__toggle" type="button" onClick={()=>void toggle()} disabled={busy} aria-expanded={open}>
      ✨ Étape 9 · Skins et animation des résultats {open?'−':'+'}
    </button>
    {error&&<p role="alert" className="tourney-nine__error">{error}</p>}
    {open&&<div className="tourney-nine__body">
      <p><strong>Test réservé au propriétaire 999.</strong> Le résultat est fictif : aucun compte ni inventaire n'est modifié.</p>
      <label>Choisir le mode
        <select disabled={busy} value={selection} onChange={e=>void select(e.target.value)}>
          <option value="">Démonstration avec 20 joueurs fictifs</option>
          {tournaments.map(t=><option key={t.id} value={String(t.id)}>{t.title}</option>)}
        </select>
      </label>
      {demo&&<>
        <div className="tourney-nine__skins">
          <SkinPreview kind="participation"/>
          <SkinPreview kind="finalist"/>
        </div>
        <p>Chaque participant : <strong>1 skin</strong> · Chaque finaliste : <strong>2 skins</strong> au total.</p>
        <p><strong>{view.participation}</strong> droits de participation + <strong>{view.finalists}</strong> droits finalistes = <strong>{view.total}</strong> droits prévus.</p>
        <div className="tourney-nine__controls">
          <button type="button" onClick={()=>setIndex(-1)}>Recommencer</button>
          <button type="button" onClick={()=>setIndex(i=>Math.min(sample.length-1,i+1))} disabled={index===sample.length-1}>
            {index<0?'Animer les résultats':'Résultat suivant'}
          </button>
        </div>
        <div className="tourney-nine__result" aria-live="polite" key={index}>
          {player?<>
            <span className="tourney-nine__ribbon">{player.rank===1?'🏆 Champion':player.rank?`Finaliste · ${player.rank}e place`:'Participation'}</span>
            <h4>{player.name}</h4>
            <div className="tourney-nine__money"><span>Gain réel<br/><strong>{player.real} F</strong></span><span>Bonus<br/><strong>{player.bonus} F</strong></span></div>
            <p>Skins prévus : {player.winner?'Participation + Finaliste':'Participation'}</p>
            <span className="tourney-nine__note">Animation fictive · aucun versement et aucune attribution</span>
          </>:<p>Appuie sur « Animer les résultats » pour afficher successivement les quatre finalistes puis un exemple de joueur éliminé.</p>}
        </div>
      </>}
      {view&&!demo&&<div className="tourney-nine__result" aria-live="polite">
        <h4>{view.title}</h4>
        <p>Historique de gains préparé : {view.awardsPrepared}/20 joueurs.</p>
        <p>Droits de skins préparés : {view.entitlementsPrepared}/24.</p>
        <p>Participation : {view.participation}/20 · Finalistes : {view.finalists}/4.</p>
        <p>Attributions dans l'inventaire : non activées.</p>
        <p className="tourney-nine__note">Lecture seule : sélectionner un tournoi ne crée aucun droit.</p>
      </div>}
      <p className="tourney-nine__warning">Les deux créations de skins et leurs identifiants doivent être fournis pour une intégration réelle. Cette étape ne modifie pas les skins existants des joueurs.</p>
    </div>}
  </section>;
}
