import { useCallback, useEffect, useRef, useState } from 'react';
import { IconGamepad } from '../components/Icons';
import { PenaltyArena, SoloPenalty } from '../components/PenaltyArena';
import { useSession } from '../auth/useSession';
import * as roomsApi from '../api/rooms';
import { syncWallet } from '../api/accounts';
import '../styles/game-rooms.css';
import '../styles/game-cards.css';
import '../styles/game-salon.css';

const money = (value) => `${new Intl.NumberFormat('fr-FR').format(value)} F CFA`;
const gameName = () => 'Tir au but';
const GAMES = [
  {
    id: 'penalty', emoji: '⚽', name: 'Tir au but',
    about: 'Face à face tireur / gardien. Vise à gauche, au milieu ou à droite. Tu changes de rôle après chaque tir et tu comptes tes buts.',
    tags: ['3 tirs', '5 tirs', '10 tirs', '2 joueurs'],
  },
];
const statusLabel = { open: 'Ouvert', pending: 'Demande en cours', ready: 'Pret a jouer', playing: 'Match en cours', finished: 'Termine' };

export default function GamePage() {
  const { session } = useSession();
  const [tab, setTab] = useState('jeux');
  const [gameId, setGameId] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [mine, setMine] = useState(null);
  const [selected, setSelected] = useState(null);
  const [match, setMatch] = useState(null);
  const [results, setResults] = useState([]);
  const selectedId = useRef(null);
  const [code, setCode] = useState('');
  const [shots, setShots] = useState(3);
  const [stake, setStake] = useState('500');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const swipe = useRef(null);
  const fetching = useRef(false);
  const moneyKey = useRef('');
  const detailRef = useRef(null);

  const chooseRoom = (room) => {
    selectedId.current = room?.id ?? null;
    setSelected(room);
    setMatch(null);
    setError('');
    setNotice('');
  };

  const refresh = useCallback(async ({ quiet = false } = {}) => {
    if (fetching.current) return;
    fetching.current = true;
    if (!quiet) setLoading(true);
    try {
      const [publicRooms, myActiveRoom, recent] = await Promise.all([
        roomsApi.listRooms(), roomsApi.myRoom(), roomsApi.recentResults(),
      ]);
      setRooms(publicRooms);
      setMine(myActiveRoom);
      setResults(recent);
      // Une mise vient d'etre retenue, rendue ou versee : on met le solde a jour.
      const key = `${myActiveRoom?.id}|${myActiveRoom?.status}|${myActiveRoom?.escrow}|${recent[0]?.id}|${recent[0]?.payout}`;
      if (moneyKey.current !== key) {
        moneyKey.current = key;
        void syncWallet().catch(() => {});
      }
      if (selectedId.current) {
        let detail;
        try { detail = await roomsApi.roomById(selectedId.current); }
        catch (err) {
          if (err.status !== 404) throw err;
          detail = null;
        }
        if (selectedId.current) {
          selectedId.current = detail?.id ?? null;
          setSelected(detail);
          if (detail && ['ready', 'playing', 'finished'].includes(detail.status)
            && (session?.id === detail.host.id || session?.id === detail.guest?.id)) {
            try {
              const state = await roomsApi.getMatch(detail.id);
              if (selectedId.current === detail.id) setMatch(state.match);
            } catch (err) { if (err.status !== 404) throw err; }
          } else setMatch(null);
        }
      }
      setError('');
    } catch (err) {
      if (!quiet) setError(err.message);
    } finally {
      fetching.current = false;
      setLoading(false);
    }
  }, [session?.id]);

  useEffect(() => {
    let alive = true;
    // Quand on change de compte, ne pas conserver les informations de l'ancien.
    selectedId.current = null;
    setSelected(null);
    setMatch(null);
    setResults([]);
    setMine(null);
    setRooms([]);
    const tick = () => { if (alive && !document.hidden) void refresh({ quiet: true }); };
    void refresh();
    const interval = window.setInterval(tick, 3000);
    const onVisible = () => { if (!document.hidden) void refresh({ quiet: true }); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  const action = async (run, message) => {
    if (busy) return false;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const next = await run();
      chooseRoom(next);
      setNotice(message);
      await refresh({ quiet: true });
      return true;
    } catch (err) { setError(err.message); return false; }
    finally { setBusy(false); }
  };

  useEffect(() => {
    if (selected?.id && tab === 'salon') detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [selected?.id, tab]);

  const openGame = (id) => {
    setError('');
    setNotice('');
    setGameId(id);
  };
  const currentGame = GAMES.find((g) => g.id === gameId) || null;

  const matchAction = async (run) => {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const data = await run();
      selectedId.current = data.room.id;
      setSelected(data.room);
      setMatch(data.match);
      void refresh({ quiet: true });
    } catch (err) {
      setError(err.message);
      // Recharger en cas de concurrence (l'autre joueur a deja resolu le tir).
      void refresh({ quiet: true });
    } finally { setBusy(false); }
  };

  const findCode = async (event) => {
    event.preventDefault();
    if (!/^\d{4}$/.test(code)) {
      setError('Saisis exactement 4 chiffres.');
      return;
    }
    await action(() => roomsApi.roomByCode(code), 'Salon retrouve.');
  };

  const openRoom = async (room) => {
    chooseRoom(room);
    // Si le salon est en attente, le createur voit le demandeur sur le detail authentifie.
    if (session) {
      try {
        const detail = await roomsApi.roomById(room.id);
        if (selectedId.current === room.id) setSelected(detail);
      } catch { /* Liste deja utilisable : actualisation prochaine. */ }
    }
  };

  const doCreate = (event) => {
    event.preventDefault();
    const value = Number(stake);
    if (!/^\d+$/.test(stake) || !Number.isSafeInteger(value) || value < 100 || value > 1000000) {
      setError('Choisis une mise entiere de 100 a 1 000 000 F CFA.');
      return;
    }
    void (async () => {
      const ok = await action(() => roomsApi.createRoom({ game: currentGame?.id || 'penalty', shots, stake: value }),
        'Ton salon est public ! Partage son code a 4 chiffres.');
      if (ok) { setGameId(null); setTab('salon'); }
    })();
  };

  const startSwipe = (event) => {
    const touch = event.touches?.[0];
    if (touch) swipe.current = { x: touch.clientX, y: touch.clientY };
  };
  const endSwipe = (event) => {
    const touch = event.changedTouches?.[0];
    const start = swipe.current;
    swipe.current = null;
    if (!touch || !start) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) >= 70 && Math.abs(dx) > Math.abs(dy) * 1.35) {
      setTab(dx < 0 ? 'salon' : 'jeux');
    }
  };

  const isHost = selected && session?.id === selected.host.id;
  const isGuest = selected && session?.id === selected.guest?.id;
  const isParticipant = isHost || isGuest;
  const otherRoom = mine && selected && mine.id !== selected.id;
  const canJoin = selected?.status === 'open' && session && !isParticipant && !otherRoom;

  return (
    <main className="game-page game-hub" onTouchStart={startSwipe} onTouchEnd={endSwipe}>
      <header className="game-page__head">
        <h1 className="title-tech"><IconGamepad size={30} /> GAME</h1>
        <p>Explore les jeux, cree un salon et trouve ton adversaire.</p>
      </header>

      <div className="game-hub__tabs" role="tablist" aria-label="Sections de Game">
        <button id="game-tab-jeux" type="button" role="tab" aria-controls="game-panel-jeux"
          aria-selected={tab === 'jeux'} className={tab === 'jeux' ? 'is-current' : ''}
          onClick={() => setTab('jeux')}>Game</button>
        <button id="game-tab-salon" type="button" role="tab" aria-controls="game-panel-salon"
          aria-selected={tab === 'salon'} className={tab === 'salon' ? 'is-current' : ''}
          onClick={() => setTab('salon')}>Salon</button>
      </div>

      {tab === 'salon' ? (
        <section id="game-panel-salon" role="tabpanel" aria-labelledby="game-tab-salon" className="game-hub__content">
          <div className="game-hub__line">
            <h2>Salons disponibles <span className="game-hub__count">{rooms.length}</span></h2>
            <button type="button" className="game-hub__refresh" disabled={loading || busy}
              onClick={() => void refresh()} aria-label="Actualiser les salons">↻ Actualiser</button>
          </div>
          {error && <p role="alert" className="game-hub__error">{error}</p>}
          {notice && <p role="status" className="game-hub__notice">{notice}</p>}

          {mine && selected?.id !== mine.id && (
            <button type="button" className="game-hub__mine" onClick={() => void openRoom(mine)}>
              <span>Ton salon actif <strong>#{mine.code}</strong></span>
              <span>Voir →</span>
            </button>
          )}

          <div className="salon-list" aria-live="polite">
            {rooms.length === 0 && <p className="game-hub__empty">{loading ? 'Chargement des salons...' : 'Aucun salon public. Crée le premier depuis l\'onglet Game !'}</p>}
            {rooms.map((room) => <button type="button" key={room.id}
              className={`salon-row salon-row--${room.status}${selected?.id === room.id ? ' is-selected' : ''}`}
              onClick={() => void openRoom(room)}>
              <span className="salon-row__code">#{room.code}</span>
              <span className="salon-row__main">
                <strong>{room.host.pseudo}</strong>
                <small>⚽ {room.shots} tirs · {statusLabel[room.status]}</small>
              </span>
              <span className="salon-row__stake">{money(room.stake)}</span>
            </button>)}
          </div>
          {selected && (
            <article ref={detailRef} className="game-hub__detail" aria-label="Details du salon">
              <div className="game-hub__line">
                <div>
                  <span className="game-hub__eyebrow">SALON SELECTIONNE</span>
                  <h3>#{selected.code} <span className={`game-hub__state game-hub__state--${selected.status}`}>{statusLabel[selected.status]}</span></h3>
                </div>
                <button type="button" className="game-hub__close" onClick={() => chooseRoom(null)} aria-label="Masquer ce salon">×</button>
              </div>
              <div className="game-hub__facts">
                <span>⚽ {gameName()}</span><span>{selected.shots} tirs / joueur</span>
                <span>Mise : {money(selected.stake)} par joueur</span><span>Gain : {money(selected.stake * 2)}</span>
                {selected.escrow > 0 && selected.status !== 'finished' && <span>Cagnotte retenue : {money(selected.escrow)}</span>}
              </div>
              {selected.funds_alert && (
                <p role="alert" className="game-hub__error">
                  {selected.funds_alert.self
                    ? "Tu n'as pas assez de fonds sur ton compte pour cette mise. Recharge ton compte depuis le Profil."
                    : selected.status === 'open'
                      ? "Un joueur voulait rejoindre ton salon mais n'a pas de fonds suffisants."
                      : "Ton adversaire n'a pas de fonds suffisants. Aucune mise n'a été prélevée."}
                </p>
              )}
              <div className="game-hub__players">
                <div><small>CREATEUR</small><strong>{selected.host.pseudo}</strong><span>ID {selected.host.id}</span></div>
                <div className="game-hub__vs">VS</div>
                <div><small>ADVERSAIRE</small><strong>{selected.guest?.pseudo || (selected.status === 'pending' ? 'Demande en cours' : 'En attente...')}</strong><span>{selected.guest ? `ID ${selected.guest.id}` : 'Place libre / non confirmee'}</span></div>
              </div>
              <div className="game-hub__actions">
                {isHost && selected.status === 'open' && <p>Salon visible par tous. Donne le code <strong>{selected.code}</strong> a ton ami.</p>}
                {isHost && selected.status === 'pending' && <>
                  <p><strong>{selected.guest?.pseudo || 'Un joueur'}</strong> souhaite rejoindre ton salon. Si tu acceptes, la mise de {money(selected.stake)} est prélevée sur vos deux comptes.</p>
                  <button className="btn btn--primary btn--sm" type="button" disabled={busy}
                    onClick={() => void action(() => roomsApi.acceptRoom(selected.id), 'Adversaire accepte !')}>Accepter</button>
                  <button className="btn btn--sm" type="button" disabled={busy}
                    onClick={() => void action(() => roomsApi.declineRoom(selected.id), 'Demande refusee. Salon de nouveau ouvert.')}>Refuser</button>
                </>}
                {isGuest && selected.status === 'pending' && <p>Demande envoyée. Quand le créateur t'accepte, ta mise de {money(selected.stake)} est prélevée.</p>}
                {selected.status === 'ready' && <p>Les deux joueurs sont confirmes. Le createur peut lancer le match ci-dessous.</p>}
                {canJoin && <button className="btn btn--primary btn--sm" type="button" disabled={busy}
                  onClick={() => void action(() => roomsApi.joinRoom(selected.id), 'Demande envoyee au createur.')}>Demander a rejoindre</button>}
                {!session && selected.status === 'open' && <p>Connecte-toi depuis le Profil pour rejoindre.</p>}
                {otherRoom && !isParticipant && <p>Tu dois quitter ton salon actuel avant d'en rejoindre un autre.</p>}
                {selected.status === 'pending' && !isParticipant && <p>Ce salon attend deja la reponse a une demande.</p>}
                {isParticipant && ['open', 'pending', 'ready'].includes(selected.status) && <button type="button" className="btn btn--sm btn--outline" disabled={busy}
                  onClick={() => void action(() => roomsApi.leaveRoom(selected.id), 'Tu as quitte le salon.')}>
                  {isHost ? 'Fermer le salon' : selected.status === 'pending' ? 'Annuler ma demande' : 'Quitter le salon'}
                </button>}
              </div>
              {isParticipant && ['ready', 'playing', 'finished'].includes(selected.status) && <PenaltyArena
                room={selected} match={match} busy={busy} error={error} onExit={() => chooseRoom(null)}
                onStart={() => void matchAction(() => roomsApi.startMatch(selected.id))}
                onChoose={(direction) => void matchAction(() => roomsApi.chooseDirection(selected.id, direction))}
                onForfeit={() => void matchAction(() => roomsApi.forfeitMatch(selected.id))}
                onBack={() => chooseRoom(null)} />}
            </article>
          )}

          <div className="salon-note" role="note">Mise prélevée quand le créateur accepte son adversaire, retenue pendant le match, puis versée au gagnant. 2 joueurs maximum par salon.</div>
          <button type="button" className="btn btn--sm btn--block salon-create" onClick={() => setTab('jeux')}>＋ Créer un salon (choisir un jeu)</button>
          <div className="game-hub__panels game-hub__panels--single">
            <section className="game-hub__panel" aria-label="Rechercher un salon">
              <span className="game-hub__eyebrow">UN AMI T'ATTEND ?</span>
              <h3>Rechercher un code</h3>
              <form onSubmit={findCode} className="game-hub__form">
                <label>Code du salon (4 chiffres)
                  <input className="game-hub__code-input" type="text" inputMode="numeric" pattern="[0-9]{4}"
                    autoComplete="off" placeholder="0000" required maxLength={4} value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))} />
                </label>
                <button className="btn btn--sm btn--block" type="submit" disabled={busy || code.length !== 4}>Rechercher</button>
              </form>
              <p className="game-hub__muted">La recherche fonctionne meme si le salon ne figure plus dans les premiers resultats.</p>
            </section>
          </div>
          {!!results.length && <section className="game-hub__results" aria-label="Mes derniers resultats">
            <h2>Mes derniers matchs</h2>
            {results.slice(0, 5).map((room) => <button className="game-hub__result" type="button" key={room.id}
              onClick={() => void openRoom(room)}>
              <span>⚽ Salon #{room.code} · {room.shots} tirs</span>
              <strong className={room.result.winner === (session?.id === room.host.id ? 'host' : 'guest') ? 'is-win' : 'is-loss'}>{room.result.winner === (session?.id === room.host.id ? 'host' : 'guest') ? '🏆 Victoire' : 'Défaite'} · {room.result.scores?.host ?? 0} - {room.result.scores?.guest ?? 0}</strong>
              <span>Voir →</span>
            </button>)}
          </section>}
        </section>
      ) : (
        <section id="game-panel-jeux" role="tabpanel" aria-labelledby="game-tab-jeux" className="game-hub__content">
          {!currentGame ? (
            <>
              <div className="game-hub__line"><h2>Les jeux</h2><span className="game-hub__count">{GAMES.length} disponible{GAMES.length > 1 ? 's' : ''}</span></div>
              <div className="game-grid">
                {GAMES.map((game) => (
                  <button key={game.id} type="button" className="game-card" onClick={() => openGame(game.id)}>
                    <span className="game-card__emoji" aria-hidden="true">{game.emoji}</span>
                    <span className="game-card__name">{game.name}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <article className="game-detail" aria-label={currentGame.name}>
              <button type="button" className="game-detail__back" onClick={() => openGame(null)}>← Tous les jeux</button>
              <div className="game-detail__hero">
                <span className="game-detail__emoji" aria-hidden="true">{currentGame.emoji}</span>
                <div>
                  <span className="game-hub__eyebrow">JEU</span>
                  <h2>{currentGame.name}</h2>
                  <p>{currentGame.about}</p>
                  <div className="game-hub__tags">{currentGame.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
                </div>
              </div>
              {error && <p role="alert" className="game-hub__error">{error}</p>}
              <section className="game-hub__panel" aria-label="Créer un salon">
                <span className="game-hub__eyebrow">JOUER A DEUX</span>
                <h3>Créer un salon pour ce jeu</h3>
                <form onSubmit={doCreate} className="game-hub__form">
                  <fieldset className="game-hub__shots"><legend>Nombre de tirs par joueur</legend>
                    {[3, 5, 10].map((n) => <label key={n} className={shots === n ? 'is-checked' : ''}>
                      <input type="radio" name="shots" value={n} checked={shots === n} onChange={() => setShots(n)} />{n} tirs
                    </label>)}
                  </fieldset>
                  <label>Mise par joueur (F CFA)
                    <input type="text" inputMode="numeric" pattern="[0-9]+" required maxLength={7}
                      value={stake} onChange={(e) => setStake(e.target.value.replace(/\D/g, '').slice(0, 7))}
                      aria-describedby="game-stake-info" />
                  </label>
                  <p id="game-stake-info" className="game-hub__muted">100 à 1 000 000 F. Gain si tu gagnes : {money(Number(stake || 0) * 2)}. La mise est prélevée quand ton adversaire est accepté.</p>
                  <button className="btn btn--primary btn--block" type="submit" disabled={busy || !!mine || !session}>
                    {mine ? 'Tu as déjà un salon actif' : 'Créer mon salon public'}</button>
                  {!session && <p className="game-hub__muted">Connecte-toi depuis le Profil pour créer un salon.</p>}
                </form>
              </section>
              <button type="button" className="btn btn--sm btn--block" onClick={() => setTab('salon')}>Voir les salons ouverts</button>
              {currentGame.id === 'penalty' && (
                <section className="game-detail__training" aria-label="Entraînement">
                  <span className="game-hub__eyebrow">ENTRAINEMENT</span>
                  <p className="game-hub__muted">Entraîne-toi contre le robot avant de défier un autre joueur. Aucune mise en jeu.</p>
                  <SoloPenalty />
                </section>
              )}
            </article>
          )}
        </section>
      )}
    </main>
  );
}
