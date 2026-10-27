// Banc d'essai local de l'etape 4 : 5 joueurs sur UN appareil, jamais de mises.
// Invisible en production et interdit hors de la gestion proprietaire.
import { useState } from 'react';
import MonopolyBoard from './MonopolyBoard';
import {
  createGame, rollDice, buy, build, sell, endTurn, giveUp,
  canBuy, buildOptions, sellOptions, ownedBy,
} from '../games/monopoly/engine';
import { PIECES } from '../games/monopoly/data';
import { ownerTournaments } from '../api/tournaments';
import '../styles/monopoly.css';
import '../styles/tournament-five-lab.css';

const TEST_NAMES = ['Joueur 1', 'Joueur 2', 'Joueur 3', 'Joueur 4', 'Joueur 5'];
const fresh = () => createGame({ names: TEST_NAMES, dice: 2 });

export default function TournamentFivePlayerLab() {
  const [open, setOpen] = useState(false);
  const [game, setGame] = useState(fresh);
  const [message, setMessage] = useState('');
  const [selected,setSelected] = useState(null);
  const [checkingOwner,setCheckingOwner] = useState(false);
  const [ownerVerified,setOwnerVerified] = useState(false);
  const [accessError,setAccessError] = useState('');
  async function toggle() {
    if (open) { setOpen(false); setOwnerVerified(false); return; }
    if (checkingOwner) return;
    setCheckingOwner(true); setAccessError('');
    try {
      // Route protegee par session signee ET controle pseudo_key 999 dans PostgreSQL.
      const result=await ownerTournaments();
      if (!Array.isArray(result?.tournaments)) throw new Error('Verification proprietaire invalide.');
      setOwnerVerified(true); setOpen(true);
    } catch (error) {setOwnerVerified(false);setAccessError(error.message||'Acces refuse.');}
    finally {setCheckingOwner(false);}
  }
  const current = game.players[game.current];
  const changes = {
    roll: () => rollDice(game),
    buy: () => buy(game),
    end: () => endTurn(game),
    abandon: () => giveUp(game),
  };
  function perform(action, square) {
    const next = action === 'build' ? build(game, square)
      : action === 'sell' ? sell(game, square) : changes[action]?.();
    if (next && next !== game) { setGame(next); setMessage(''); }
    else setMessage('Action impossible dans cette phase.');
  }
  const builds = buildOptions(game), sells = sellOptions(game);
  return <section className="tourney-lab" aria-label="Simulation privée de qualification à cinq joueurs">
    <button type="button" className="tourney-lab__toggle" onClick={toggle} disabled={checkingOwner} aria-expanded={open}>
      🎲 Test propriétaire : plateau de 5 joueurs {checkingOwner ? '· Vérification…' : open ? '−' : '+'}
    </button>
    {accessError && <p role="alert" className="tourney-error">{accessError}</p>}
    {open && ownerVerified && <div className="tourney-lab__content">
      <p><strong>Simulation de qualification</strong> : 5 joueurs fictifs sur cet appareil.
        Aucun vrai joueur, paiement, reservation, classement ou skin n'est affecte.</p>
      <div className="tourney-lab__layout">
        <div className="tourney-lab__board"><MonopolyBoard game={game} selected={selected} onSelect={setSelected}
          rolling={false} diceFaces={game.lastRoll?.dice||[]} /></div>
        <div className="tourney-lab__controls">
          <h4>{game.phase === 'over' ? `🏆 ${game.players[game.winner]?.name || 'Partie terminee'}`
            : `Tour ${game.turn} · ${current?.name}`}</h4>
          <p>Phase : {game.phase} · 2 dés · {game.players.filter(p=>!p.bankrupt).length} joueurs actifs</p>
          <div className="tourney-lab__actions">
            <button type="button" disabled={game.phase!=='roll'} onClick={()=>perform('roll')}>🎲 Lancer</button>
            <button type="button" disabled={!canBuy(game)} onClick={()=>perform('buy')}>Acheter</button>
            <button type="button" disabled={game.phase!=='after'} onClick={()=>perform('end')}>Fin du tour</button>
          </div>
          <details><summary>Construire / vendre</summary>
            <div className="tourney-lab__actions">
              {builds.map(({square,price})=><button key={`b${square}`} type="button" onClick={()=>perform('build',square)}>Construire case {square} (−{price} $)</button>)}
              {sells.map(({square,value})=><button key={`s${square}`} type="button" onClick={()=>perform('sell',square)}>Vendre case {square} (+{value} $)</button>)}
              {!builds.length&&!sells.length&&<span>Aucune action disponible.</span>}
            </div>
          </details>
          <button type="button" disabled={game.phase==='over'} onClick={()=>perform('abandon')}>Faire abandonner le joueur actif (test)</button>
          <button type="button" onClick={()=>{setGame(fresh());setMessage('');setSelected(null);}}>Nouvelle simulation</button>
          {message&&<p role="alert">{message}</p>}
        </div>
      </div>
      <ol className="tourney-lab__players">
        {game.players.map((p,index)=><li key={p.id} style={{'--lab-color':p.color}} aria-current={game.current===index?'true':undefined}>
          <strong>{PIECES[p.piece].emoji} {p.name}</strong>
          <span>{p.bankrupt?'Éliminé':`${p.balance} $ · ${ownedBy(game,index).length} propriétés`}</span>
        </li>)}
      </ol>
      <details><summary>Historique de la simulation</summary><ul>{game.log.slice(0,20).map(entry=><li key={entry.n}>{entry.player == null ? '' : `${game.players[entry.player]?.name}: `}{entry.text}</li>)}</ul></details>
    </div>}
  </section>;
}
