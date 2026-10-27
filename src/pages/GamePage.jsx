import TournamentHub from '../components/TournamentHub';
import RoomCountdown from '../components/RoomCountdown'; // MAF_ROOM_30M_POLICY_V1
import '../styles/room-countdown.css';
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { IconGamepad } from '../components/Icons';
import { PenaltyArena, SoloPenalty } from '../components/PenaltyArena';
import CheckersArena from '../components/CheckersArena';
import SoloCheckers from '../components/SoloCheckers';
import TankArena from '../components/TankArena';
import TankRunOnline from '../components/TankRunOnline'; // MAF_TANKRUN_STAGE_4
import DiceArena from '../components/DiceArena'; // MAF_DICE_GAMEPAGE_V1
import SoloDice from '../components/SoloDice'; // MAF_DICE_PRACTICE_V1
import SoloTank from '../components/SoloTank';
import SoloMonopoly from '../components/SoloMonopoly'; // MAF_MONOPOLY_V1_GAMEPAGE : Monopoly (entrainement)
import MonopolyOnline from '../components/MonopolyOnline'; // MAF_MONOPOLY_ONLINE_V1
// MAF_TANK_ROTATION_LOCAL_V1 / module charge seulement au lancement proprietaire
// MAF_TANK_GAMEPAGE_V1
import { useSession } from '../auth/useSession';
import * as roomsApi from '../api/rooms';
import * as monopolyApi from '../api/monopolyOnline';
import MultiRoomSlots from '../components/MultiRoomSlots'; // MAF_MULTIROOM_V1
import { registerRefresh } from '../api/refresh';
import { syncWallet } from '../api/accounts';
import '../styles/game-rooms.css';
import '../styles/game-cards.css';
import '../styles/game-salon.css';
import '../styles/dice-arena.css';
import '../styles/dice-training.css';
import '../styles/multi-room-slots.css';
const TankRun = lazy(() => import('../components/TankRun')); // MAF_TANK_OWNER_ONLY_V1

const localRoomDeadline = room => room ? {
  ...room, localReturnDeadline:room.return_deadline ? Date.now() + room.return_deadline - (room.server_now || Date.now()) : null,
} : null;

const money = (value) => `${new Intl.NumberFormat('fr-FR').format(value)} F CFA`;
const gameName = (game) => game === 'monopoly' ? 'Monopoly' : game === 'tankrun' ? 'Tank Run' : game === 'dice' ? 'Lancer de dés' : game === 'tank' ? 'Tank Battle' : game === 'checkers' ? 'Dames' : 'Tir au but';
const gameSymbol = (game) => game === 'monopoly' ? '🎩' : game === 'tankrun' ? '🏎️' : game === 'dice' ? '🎲' : game === 'tank' ? '🚀' : game === 'checkers' ? '♛' : '⚽';
const GAMES = [
  {
    id: 'penalty', emoji: '⚽', name: 'Tir au but',
    about: 'Face à face tireur / gardien. Vise à gauche, au milieu ou à droite. Tu changes de rôle après chaque tir et tu comptes tes buts.',
    tags: ['3 tirs', '5 tirs', '10 tirs', '2 joueurs'],
  },
  {
    id: 'checkers', emoji: '♛', name: 'Jeu de dames',
    about: 'Duels de dames internationales sur un plateau de 100 cases. Prises obligatoires, combinaisons, promotions et strategie pour gagner.',
    tags: ['10 × 10', '20 pions chacun', '2 joueurs', 'Prises obligatoires'],
  },
  { id:'tank', emoji:'🚀', name:'Tank Battle',
    about:'Deux chars, six armes, tir tactique, carburant et terrain destructible.',
    tags:['2 joueurs','Terrain destructible','Missiles','Carburant'] },
  { id:'dice', emoji:'🎲', name:'Lancer de dés',
    about:'Défie un autre joueur avec 1 ou 2 dés, sur 1, 3, 5 ou 10 coups. En manches séparées ou en points cumulés.',
    tags:['1 ou 2 dés', '1 / 3 / 5 / 10 coups', 'Manches ou total', '2 joueurs'] },
  {
    id: 'tankrun', emoji: '🕹️', name: 'Tank Run',
    about: 'Combat de chars a rotation automatique. Appuie pour tirer ou maintiens pour avancer.',
    tags: ['2 joueurs en ligne', 'Salons', 'Choix du char', 'Choix du terrain'],
  },
  {
    id: 'monopoly', emoji: '🎩', name: 'Monopoly',
    about: 'Achète des propriétés, construis des maisons et des hôtels, encaisse les loyers et ruine tes adversaires. Pour l\'instant : mode entraînement uniquement (pas de salon ni de mise).',
    tags: ['En ligne : 2 à 4 joueurs', 'Salons & mises', 'Entraînement', 'Maisons & hôtels'],
  },
];
const statusLabel = { open: 'Ouvert', pending: 'Demande en cours', ready: 'Pret a jouer', playing: 'Match en cours', finished: 'Termine' };

export default function GamePage() {
  const { session } = useSession();
  const [clock, setClock] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const [tab, setTab] = useState('jeux');
  const [gameId, setGameId] = useState(null);
  const [monopolyPlaying, setMonopolyPlaying] = useState(false);
  const [monopolyOnlinePlaying, setMonopolyOnlinePlaying] = useState(false);
  const [monopolyTrainingOpen,setMonopolyTrainingOpen] = useState(false);
  const [tankRunTraining, setTankRunTraining] = useState(false); // MAF_TANKRUN_SALONS_FIX_V1
  const [rooms, setRooms] = useState([]);
  const [mine, setMine] = useState(null);
  const [myRooms, setMyRooms] = useState([]);
  const [monopolyRooms, setMonopolyRooms] = useState([]);
  const [monopolyMine, setMonopolyMine] = useState(null);
  const [selectedMonopoly, setSelectedMonopoly] = useState(null);
  const [selected, setSelected] = useState(null);
  const [match, setMatch] = useState(null);
  const [results, setResults] = useState([]);
  const selectedId = useRef(null);
  const [code, setCode] = useState('');
  const [shots, setShots] = useState(3);
  const [diceCount, setDiceCount] = useState(1);
  const [diceRounds, setDiceRounds] = useState(3);
  const [diceMode, setDiceMode] = useState('separate');
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
      const [publicRooms, myActiveRoom, recent, ownedRooms] = await Promise.all([
        roomsApi.listRooms(), roomsApi.myRoom(), roomsApi.recentResults(), roomsApi.myRooms(),
      ]);
      setRooms(publicRooms);
      // Le catalogue Monopoly est rassemble dans la meme page Salon.
      const [publicMonopoly, mineMonopoly] = await Promise.all([
        monopolyApi.publicRooms().catch(() => []),
        session?.id ? monopolyApi.mine().catch(() => null) : Promise.resolve(null),
      ]);
      setMonopolyRooms(publicMonopoly);
      setMonopolyMine(mineMonopoly);
      setMyRooms(ownedRooms);
      setMine(localRoomDeadline(myActiveRoom));
      setResults(recent);
      // Une mise vient d'etre retenue, rendue ou versee : on met le solde a jour.
      const key = `${myActiveRoom?.id}|${myActiveRoom?.status}|${myActiveRoom?.escrow}|${recent[0]?.id}|${recent[0]?.payout}`;
      if (moneyKey.current !== key) {
        moneyKey.current = key;
        void syncWallet().catch(() => {});
      }
      if (selectedId.current) {
        const requestedId = selectedId.current;
        let detail;
        try { detail = await roomsApi.roomById(requestedId); }
        catch (err) {
          if (err.status !== 404) throw err;
          detail = null;
        }
        if (selectedId.current === requestedId) {
          selectedId.current = detail?.id ?? null;
          setSelected(detail);
          if (detail && ['ready', 'playing', 'finished'].includes(detail.status)
            && (session?.id === detail.host.id || session?.id === detail.guest?.id)) {
            try {
              const state = await roomsApi.getMatch(detail.id);
              if (selectedId.current === detail.id) { setSelected(state.room); setMatch(state.match); }
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

  useEffect(() => registerRefresh(() => refresh()), [refresh]);

  useEffect(() => {
    let alive = true;
    // Quand on change de compte, ne pas conserver les informations de l'ancien.
    selectedId.current = null;
    setSelected(null);
    setMatch(null);
    setResults([]);
    setMine(null);
    setMyRooms([]);
    setRooms([]);
    setMonopolyRooms([]);
    setMonopolyMine(null);
    setSelectedMonopoly(null);
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

  const action = async (run, message, selectResult = true) => {
    if (busy) return false;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const next = await run();
      if (selectResult) chooseRoom(next);
      else chooseRoom(null);
      setNotice(message);
      await refresh({ quiet: true });
      return true;
    } catch (err) { setError(err.message); return false; }
    finally { setBusy(false); }
  };

  useEffect(() => {
    if (!monopolyOnlinePlaying && (selected?.id || selectedMonopoly?.id) && tab === 'salon')
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [selected?.id, selectedMonopoly?.id, tab, monopolyOnlinePlaying]);
  useEffect(() => {
    if (monopolyOnlinePlaying && selectedMonopoly?.id && tab === 'salon') window.scrollTo(0, 0);
  }, [monopolyOnlinePlaying, selectedMonopoly?.id, tab]);

  const openGame = (id) => {
    // Tank Run disponible pour tous les comptes.
    setError('');
    setNotice('');
    setGameId(id);
    setTankRunTraining(false);
  };
  const visibleGames = GAMES;
  const currentGame = visibleGames.find((g) => g.id === gameId) || null;

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
    if (!/^(\d{4}|\d{6})$/.test(code)) {
      setError('Saisis 4 chiffres pour les autres jeux ou 6 chiffres pour Monopoly.');
      return;
    }
    if (code.length === 6) {
      setBusy(true); setError('');
      try { openMonopolyRoom(await monopolyApi.roomByCode(code)); }
      catch (err) { setError(err.message); }
      finally { setBusy(false); }
      return;
    }
    await action(async () => {
      const room = await roomsApi.roomByCode(code);
      return room.status === 'playing' ? (await roomsApi.resumeMatch(room.id)).room : room;
    }, 'Salon retrouvé.');
  };

  const openRoom = async (room) => {
    if (busy) return;
    setSelectedMonopoly(null);
    setBusy(true); setError('');
    try {
      if (room.status === 'playing') {
        const data = await roomsApi.resumeMatch(room.id);
        chooseRoom(data.room); setMatch(data.match);
        window.dispatchEvent(new CustomEvent('maf:match-resumed', { detail: { id: data.room.id } }));
      } else chooseRoom(await roomsApi.roomById(room.id));
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  // Quand le joueur revient via la grande alerte, ouvrir directement son match.
  useEffect(() => {
    const reopen = (event) => {
      let rawId = event?.detail?.id;
      if (!rawId) {
        try { rawId = sessionStorage.getItem('maf:room-to-reopen'); } catch { /* optionnel */ }
      }
      const id = Number(rawId);
      if (!Number.isSafeInteger(id) || id <= 0) return;
      try { sessionStorage.removeItem('maf:room-to-reopen'); } catch { /* optionnel */ }
      setTab('salon');
      void openRoom({ id, status: 'playing' });
    };
    window.addEventListener('maf:reopen-match', reopen);
    reopen();
    return () => window.removeEventListener('maf:reopen-match', reopen);
  }, [session?.id]);

  // MAF_ROOM_INVITATION_NAV_V1 : ouvrir directement la demande depuis le Profil ou Studio.
  useEffect(() => {
    const openPendingRoom = (event) => {
      let payload = event?.detail || null;
      if (!payload) {
        try { payload = JSON.parse(sessionStorage.getItem('maf:pending-room-to-open') || 'null'); }
        catch { payload = null; }
      }
      const roomId = Number(payload?.id);
      if (!session?.id || Number(payload?.uid) !== Number(session.id)
          || !Number.isSafeInteger(roomId) || roomId <= 0) return;
      try { sessionStorage.removeItem('maf:pending-room-to-open'); } catch { /* facultatif */ }
      setTab('salon');
      void openRoom({ id: roomId, status: 'pending' });
    };
    window.addEventListener('maf:open-pending-room', openPendingRoom);
    openPendingRoom();
    return () => window.removeEventListener('maf:open-pending-room', openPendingRoom);
  }, [session?.id]);

  const openMonopolyRoom = (room) => {
    chooseRoom(null);
    setSelectedMonopoly({ ...room, id: Number(room.id) });
    setTab('salon');
  };

  const exitArena = async () => {
    if (busy) return;
    if (selected?.status !== 'playing') { chooseRoom(null); return; }
    setBusy(true); setError('');
    try {
      const data = await roomsApi.exitMatch(selected.id);
      chooseRoom(null); setMine(data.room.status === 'playing' ? localRoomDeadline(data.room) : null);
      if (data.room?.return_deadline) {
        window.dispatchEvent(new CustomEvent('maf:match-exited', { detail: { room: data.room } }));
      }
      setTab('salon');
      await syncWallet();
      void refresh({ quiet:true });
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const doCreate = (event) => {
    event.preventDefault();
    const value = Number(stake);
    if (!/^\d+$/.test(stake) || !Number.isSafeInteger(value) || value < 100 || value > 1000000) {
      setError('Choisis une mise entiere de 100 a 1 000 000 F CFA.');
      return;
    }
    void (async () => {
      const ok = await action(() => roomsApi.createRoom({ game: currentGame?.id || 'penalty',
        shots: currentGame?.id === 'penalty' ? shots : currentGame?.id === 'dice' ? diceRounds : null,
        diceCount: currentGame?.id === 'dice' ? diceCount : null, diceMode: currentGame?.id === 'dice' ? (diceRounds === 1 ? 'separate' : diceMode) : null, stake: value }),
        'Ton salon est public ! Partage son code a 4 chiffres.', false);
      if (ok) { setGameId(null); setTab('salon'); }
    })();
  };

  const startSwipe = (event) => {
    const touch = event.touches?.[0];
    if (touch) swipe.current = { x: touch.clientX, y: touch.clientY };
  };
  const endSwipe = (event) => {
    // Pas de glissement d'onglet pendant une partie Monopoly ni un duel.
    if (monopolyOnlinePlaying || (selected?.status === 'playing' && match)) { swipe.current = null; return; }
    const touch = event.changedTouches?.[0];
    const start = swipe.current;
    swipe.current = null;
    if (!touch || !start) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) >= 70 && Math.abs(dx) > Math.abs(dy) * 1.35) {
      const tabs = ['jeux', 'tournoi', 'salon'];
      const nextIndex = Math.max(0, Math.min(tabs.length - 1, tabs.indexOf(tab) + (dx < 0 ? 1 : -1)));
      setTab(tabs[nextIndex]);
    }
  };

  const isHost = selected && session?.id === selected.host.id;
  const isGuest = selected && session?.id === selected.guest?.id;
  const isParticipant = isHost || isGuest;
  const myHostedRooms = myRooms.filter((room) => room.is_host);
  const activeMonopoly = monopolyMine?.status === 'playing' ? monopolyMine : null;
  const myMonopolyAwayAt = activeMonopoly?.game?.presence?.away?.[String(session?.id)];
  const hostedMonopoly = monopolyMine && Number(monopolyMine.hostId) === Number(session?.id)
    && ['waiting', 'proposed', 'playing'].includes(monopolyMine.status) ? monopolyMine : null;
  const visibleMonopolyRooms = monopolyRooms.filter((room) => ['waiting', 'proposed'].includes(room.status));
  const sameGameRoom = myHostedRooms.some((room) => room.game === currentGame?.id);
  const slotLimitReached = myHostedRooms.length >= 5;
  // MAF_ROOMS_FREE_UNTIL_ACCEPTED_V1: seuls une autre demande sortante et les matchs acceptes bloquent l'invitation.
  const guestRequestElsewhere = myRooms.some((room) => room.is_guest &&
    ['pending','ready','playing'].includes(room.status) && room.id !== selected?.id);
  const acceptedMatchElsewhere = myRooms.some((room) =>
    ['ready','playing'].includes(room.status) && room.id !== selected?.id);
  const canJoin = selected?.status === 'open' && !selected.host_busy && !!session &&
    !isParticipant && !guestRequestElsewhere && !acceptedMatchElsewhere;

  return (
    <main className={`game-page game-hub${currentGame?.id === 'monopoly' && tab === 'jeux' && (monopolyPlaying || monopolyOnlinePlaying) ? ' game-hub--monopoly-playing' : ''}`}>
      <header className="game-page__head">
        <h1 className="title-tech"><IconGamepad size={30} /> GAME</h1>
        <p>Explore les jeux, cree un salon et trouve ton adversaire.</p>
      </header>

      <div className="game-hub__tabs" role="tablist" aria-label="Sections de Game"
        onTouchStart={startSwipe} onTouchEnd={endSwipe}
        onTouchCancel={() => { swipe.current = null; }}>
        <button id="game-tab-jeux" type="button" role="tab" aria-controls="game-panel-jeux"
          aria-selected={tab === 'jeux'} className={tab === 'jeux' ? 'is-current' : ''}
          onClick={() => setTab('jeux')}>Game</button>
        <button id="game-tab-tournoi" type="button" role="tab" aria-controls="game-panel-tournoi"
          aria-selected={tab === 'tournoi'} className={tab === 'tournoi' ? 'is-current' : ''}
          onClick={() => setTab('tournoi')}>Tournoi</button>
        <button id="game-tab-salon" type="button" role="tab" aria-controls="game-panel-salon"
          aria-selected={tab === 'salon'} className={tab === 'salon' ? 'is-current' : ''}
          onClick={() => setTab('salon')}>Salon</button>
      </div>

      {tab === 'tournoi' ? (
        <section id="game-panel-tournoi" role="tabpanel" aria-labelledby="game-tab-tournoi" className="game-hub__content">
          <TournamentHub key={session?.id || 'guest'} session={session} />
        </section>
      ) : tab === 'salon' ? (
        <section id="game-panel-salon" role="tabpanel" aria-labelledby="game-tab-salon" className="game-hub__content">
          <div className="game-hub__line">
            <h2>Salons disponibles <span className="game-hub__count">{rooms.length + visibleMonopolyRooms.length}</span></h2>
            <button type="button" className="game-hub__refresh" disabled={loading || busy}
              onClick={() => void refresh()} aria-label="Actualiser les salons">↻ Actualiser</button>
          </div>
          {error && <p role="alert" className="game-hub__error">{error}</p>}
          {notice && <p role="status" className="game-hub__notice">{notice}</p>}

          {activeMonopoly && (!selectedMonopoly || Number(selectedMonopoly.id) !== Number(activeMonopoly.id)) &&
            <button type="button" className="game-hub__mine game-hub__mine--monopoly-return" onClick={() => openMonopolyRoom(activeMonopoly)}>
              <span>{myMonopolyAwayAt!==undefined
                ? `⚠ Monopoly #${activeMonopoly.code} · ${Math.max(0,Math.ceil((Number(myMonopolyAwayAt)+120000-clock)/1000))} s pour revenir`
                : `🎩 Partie Monopoly #${activeMonopoly.code} en cours`}</span><strong>Revenir au plateau →</strong>
            </button>}
          {session && <MultiRoomSlots rooms={myHostedRooms} monopolyRoom={hostedMonopoly} busy={busy}
            onOpen={(room) => void openRoom(room)} onOpenMonopoly={openMonopolyRoom}
            gameName={gameName} gameSymbol={gameSymbol} />}
          {mine && selected?.id !== mine.id && (mine.return_deadline || !myHostedRooms.some((r) => r.id === mine.id)) && (
            <button type="button" className={`game-hub__mine${mine.return_deadline ? ' game-hub__mine--return' : ''}`} onClick={() => void openRoom(mine)}>
              <span>{mine.return_deadline
                ? `⚠ MATCH INTERROMPU — ${Math.max(0, Math.ceil(((mine.localReturnDeadline || mine.return_deadline) - clock) / 1000))} s pour revenir !`
                : 'Ton salon actif'} <strong>#{mine.code}</strong></span>
              <span>{mine.return_deadline ? 'REVENIR →' : 'Voir →'}</span>
            </button>
          )}

          <div className="salon-list" aria-live="polite">
            {rooms.length + visibleMonopolyRooms.length === 0 && <p className="game-hub__empty">{loading ? 'Chargement des salons...' : 'Aucun salon public. Crée le premier depuis l\'onglet Game !'}</p>}
            {visibleMonopolyRooms.map((room) => <button type="button" key={`monopoly-${room.id}`}
              className={`salon-row salon-row--open${selectedMonopoly?.id === room.id ? ' is-selected' : ''}`}
              onClick={() => openMonopolyRoom(room)}>
              <span className="salon-row__code">#{room.code}</span>
              <span className="salon-row__main">
                <strong>{room.host}</strong>
                <small>🎩 Monopoly · {room.present}/{room.maxPlayers} joueurs · {room.status === 'proposed' ? 'Accord de départ en cours' : 'Ouvert'}</small>
              </span>
              <span className="salon-row__stake">{money(room.stake)}
                <RoomCountdown room={{status:'open',expires_at:room.createdAt ? new Date(Date.parse(room.createdAt) + 30*60*1000).toISOString() : null, server_now: room.serverNow}} prefix="" />
              </span>
            </button>)}
            {rooms.map((room) => <button type="button" key={room.id}
              className={`salon-row salon-row--${room.status}${room.host_busy ? ' salon-row--host-busy' : ''}${selected?.id === room.id ? ' is-selected' : ''}`}
              onClick={() => void openRoom(room)}>
              <span className="salon-row__code">#{room.code}</span>
              <span className="salon-row__main">
                <strong>{room.host.pseudo}</strong>
                <small>{gameSymbol(room.game)} {gameName(room.game)}{room.game === 'penalty' ? ` · ${room.shots} tirs` : room.game === 'dice' ? ` · ${room.dice_count} dé(s) · ${room.shots} coup(s)` : ''} · {room.host_busy && ['open','pending'].includes(room.status) ? 'En partie, veuillez patienter' : statusLabel[room.status]}</small>
              </span>
              <span className="salon-row__stake">{money(room.stake)}<RoomCountdown room={room} prefix="" /></span>
            </button>)}
          </div>
          {selectedMonopoly && <article ref={detailRef}
            className={`game-hub__detail${monopolyOnlinePlaying ? ' game-hub__detail--monopoly-fullscreen' : ''}`}
            aria-label={monopolyOnlinePlaying ? 'Partie Monopoly en cours' : 'Détails du salon Monopoly'}>
            <div className="game-hub__line game-hub__monopoly-head">
              <h3>{monopolyOnlinePlaying ? '🎩 Monopoly · Partie en cours' : `🎩 Monopoly · Salon #${selectedMonopoly.code}`}</h3>
              <button type="button" className="game-hub__close"
                aria-label={monopolyOnlinePlaying ? 'Revenir aux salons sans abandonner' : 'Fermer les détails du salon'}
                onClick={async () => {
                  if (monopolyOnlinePlaying) {
                    try { await monopolyApi.presence(selectedMonopoly.id,'away'); }
                    catch (e) { setError(e.message || 'Impossible de signaler ton depart.'); return; }
                  }
                  setSelectedMonopoly(null);setMonopolyOnlinePlaying(false);window.scrollTo(0,0);
                }}>
                {monopolyOnlinePlaying ? '← Salons' : '×'}</button>
            </div>
            <MonopolyOnline mode="detail" selectedRoomId={selectedMonopoly.id} previewRoom={selectedMonopoly}
              onPlayingChange={setMonopolyOnlinePlaying} onOpenRoom={openMonopolyRoom}/>
          </article>}
          {selected && (
            <article ref={detailRef} className={`game-hub__detail${selected.game === 'tankrun' ? ' game-hub__detail--tankrun' : ''}${selected.game === 'tankrun' && isParticipant && ['ready','playing','finished'].includes(selected.status) ? ' game-hub__detail--tankrun-live' : ''}`} aria-label="Details du salon">
              <div className="game-hub__line">
                <div>
                  <span className="game-hub__eyebrow">SALON SELECTIONNE</span>
                  <h3>#{selected.code} <span className={`game-hub__state game-hub__state--${selected.status}`}>{statusLabel[selected.status]}</span></h3>
                </div>
                <button type="button" className="game-hub__close" onClick={() => chooseRoom(null)} aria-label="Masquer ce salon">×</button>
              </div>
              <div className={`game-hub__facts${selected.game === 'tankrun' ? ' game-hub__facts--tankrun' : ''}`}>
                <span>{gameSymbol(selected.game)} {gameName(selected.game)}</span>{selected.game === 'penalty' ? <span>{selected.shots} tirs / joueur</span> : selected.game === 'dice' ? <span>{selected.dice_count} dé(s) · {selected.shots} coup(s) · {selected.dice_mode === 'cumulative' ? 'Cumul' : 'Manches'}</span> : selected.game === 'tankrun' ? <span>2 chars · duel en course · configuration compacte</span> : selected.game === 'tank' ? <span>2 chars · armes tactiques</span> : <span>10 × 10 · 20 pions / joueur</span>}
                <span>Mise : {money(selected.stake)} par joueur</span><span>Gain : {money(selected.stake * 2)}</span>
                {selected.escrow > 0 && selected.status !== 'finished' && <span>Cagnotte retenue : {money(selected.escrow)}</span>}
                <RoomCountdown room={selected} />
              </div>
              {selected.host_busy && ['open','pending'].includes(selected.status) && (
                <p role="status" className="maf-room-busy">🔒 En partie, veuillez patienter. Le createur joue deja une autre partie.</p>
              )}
              {selected.funds_alert && (
                <p role="alert" className="game-hub__error">
                  {selected.funds_alert.self
                    ? "Tu n'as pas assez de fonds sur ton compte pour cette mise. Recharge ton compte depuis le Profil."
                    : selected.status === 'open'
                      ? "Un joueur voulait rejoindre ton salon mais n'a pas de fonds suffisants."
                      : "Ton adversaire n'a pas de fonds suffisants. Aucune mise n'a été prélevée."}
                </p>
              )}
              <div className={`game-hub__players${selected.game === 'tankrun' ? ' game-hub__players--tankrun' : ''}`}>
                <div><small>CREATEUR</small><strong>{selected.host.pseudo}</strong><span>ID {selected.host.id}</span></div>
                <div className="game-hub__vs">VS</div>
                <div><small>ADVERSAIRE</small><strong>{selected.guest?.pseudo || (selected.status === 'pending' ? 'Demande en cours' : 'En attente...')}</strong><span>{selected.guest ? `ID ${selected.guest.id}` : 'Place libre / non confirmee'}</span></div>
              </div>
              <div className={`game-hub__actions${selected.game === 'tankrun' ? ' game-hub__actions--tankrun' : ''}`}>
                {isHost && selected.status === 'open' && <p>Salon visible par tous. Donne le code <strong>{selected.code}</strong> a ton ami.</p>}
                {isHost && selected.status === 'pending' && <>
                  <p><strong>{selected.guest?.pseudo || 'Un joueur'}</strong> souhaite rejoindre ton salon. Si tu acceptes, la mise de {money(selected.stake)} est prélevée sur vos deux comptes.</p>
                  <button className="btn btn--primary btn--sm" type="button" disabled={busy || selected.host_busy}
                    onClick={() => void action(() => roomsApi.acceptRoom(selected.id), 'Adversaire accepte !')}>Accepter</button>
                  <button className="btn btn--sm" type="button" disabled={busy}
                    onClick={() => void action(() => roomsApi.declineRoom(selected.id), 'Demande refusee. Salon de nouveau ouvert.')}>Refuser</button>
                </>}
                {isGuest && selected.status === 'pending' && <p>Demande envoyée. Quand le créateur t'accepte, ta mise de {money(selected.stake)} est prélevée.</p>}
                {selected.status === 'ready' && <p>Les deux joueurs sont confirmes. Le createur peut lancer le match ci-dessous.</p>}
                {canJoin && <button className="btn btn--primary btn--sm" type="button" disabled={busy}
                  onClick={() => void action(() => roomsApi.joinRoom(selected.id), 'Demande envoyee au createur.')}>Demander a rejoindre</button>}
                {!session && selected.status === 'open' && <p>Connecte-toi depuis le Profil pour rejoindre.</p>}
                {!isParticipant && selected.status === 'open' && guestRequestElsewhere &&
                  <p>Tu as deja une demande envoyee dans un autre salon. Annule-la avant d'en envoyer une autre.</p>}
                {!isParticipant && selected.status === 'open' && acceptedMatchElsewhere &&
                  <p>Tu es en partie, veuillez patienter jusqu'a la fin du match.</p>}
                {selected.status === 'pending' && !isParticipant && <p>Ce salon attend deja la reponse a une demande.</p>}
                {isParticipant && ['open', 'pending', 'ready'].includes(selected.status) && <button type="button" className="btn btn--sm btn--outline" disabled={busy}
                  onClick={() => void action(() => roomsApi.leaveRoom(selected.id), 'Tu as quitte le salon.')}>
                  {isHost ? 'Fermer le salon' : selected.status === 'pending' ? 'Annuler ma demande' : 'Quitter le salon'}
                </button>}
              </div>
              {isParticipant && ['ready', 'playing', 'finished'].includes(selected.status) && (
                selected.game === 'tankrun' ? <TankRunOnline
                  room={selected} match={match} busy={busy}
                  onStart={() => void matchAction(() => roomsApi.startMatch(selected.id))}
                  onExit={() => void exitArena()}
                  onForfeit={() => void matchAction(() => roomsApi.forfeitMatch(selected.id))} /> :
                selected.game === 'checkers' ? <CheckersArena
                  room={selected} match={match} busy={busy} error={error} onExit={() => void exitArena()}
                  onStart={() => void matchAction(() => roomsApi.startMatch(selected.id))}
                  onMove={(move) => void matchAction(() => roomsApi.moveCheckers(selected.id, move))}
                  onDrawOffer={() => void matchAction(() => roomsApi.offerCheckersDraw(selected.id))}
                  onDrawCancel={() => void matchAction(() => roomsApi.cancelCheckersDraw(selected.id))}
                  onEmote={(emote) => void matchAction(() => roomsApi.sendCheckersEmote(selected.id, emote))}
                  onDrawRespond={(accept) => void matchAction(() => roomsApi.respondCheckersDraw(selected.id, accept))}
                  onForfeit={() => void matchAction(() => roomsApi.forfeitMatch(selected.id))}
                  onBack={() => chooseRoom(null)} /> : selected.game === 'tank' ? <TankArena
                    room={selected} match={match} busy={busy} error={error} onExit={() => void exitArena()}
                    onStart={() => void matchAction(() => roomsApi.startMatch(selected.id))}
                    onFire={(shot) => void matchAction(() => roomsApi.fireTank(selected.id,shot))}
                    onDraw={(action,accept) => void matchAction(() => roomsApi.tankDrawAction(selected.id,action,accept))}
                    onReact={(emote) => void matchAction(() => roomsApi.tankReaction(selected.id,emote))}
                    onForfeit={() => void matchAction(() => roomsApi.forfeitMatch(selected.id))}
                    onBack={() => chooseRoom(null)} /> : selected.game === 'dice' ? <DiceArena
                    room={selected} match={match} busy={busy} error={error} onExit={() => void exitArena()}
                    onStart={() => void matchAction(() => roomsApi.startMatch(selected.id))}
                    onRoll={(dice) => void matchAction(() => roomsApi.rollDice(selected.id,dice))}
                    onForfeit={() => void matchAction(() => roomsApi.forfeitMatch(selected.id))}
                    onBack={() => chooseRoom(null)} /> : <PenaltyArena
                    room={selected} match={match} busy={busy} error={error} onExit={() => void exitArena()}
                    onStart={() => void matchAction(() => roomsApi.startMatch(selected.id))}
                    onChoose={(direction) => void matchAction(() => roomsApi.chooseDirection(selected.id, direction))}
                    onForfeit={() => void matchAction(() => roomsApi.forfeitMatch(selected.id))}
                    onBack={() => chooseRoom(null)} />)}
            </article>
          )}

          <div className="salon-note" role="note">Duels classiques : 2 joueurs, mise bloquée lors de l'acceptation. Monopoly : 2 à 4 joueurs, mises retenues uniquement après l'accord de tous.</div>
          <button type="button" className="btn btn--sm btn--block salon-create" onClick={() => setTab('jeux')}>＋ Créer un salon (choisir un jeu)</button>
          <div className="game-hub__panels game-hub__panels--single">
            <section className="game-hub__panel" aria-label="Rechercher un salon">
              <span className="game-hub__eyebrow">UN AMI T'ATTEND ?</span>
              <h3>Rechercher un code</h3>
              <form onSubmit={findCode} className="game-hub__form">
                <label>Code du salon (4 chiffres · Monopoly : 6)
                  <input className="game-hub__code-input" type="text" inputMode="numeric" pattern="([0-9]{4}|[0-9]{6})"
                    autoComplete="off" placeholder="0000" required maxLength={6} value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} />
                </label>
                <button className="btn btn--sm btn--block" type="submit" disabled={busy || !/^(\d{4}|\d{6})$/.test(code)}>Rechercher</button>
              </form>
              <p className="game-hub__muted">La recherche fonctionne meme si le salon ne figure plus dans les premiers resultats.</p>
            </section>
          </div>
          {!!results.length && <section className="game-hub__results" aria-label="Mes derniers resultats">
            <h2>Mes derniers matchs</h2>
            {results.slice(0, 5).map((room) => <button className="game-hub__result" type="button" key={room.id}
              onClick={() => void openRoom(room)}>
              <span>{gameSymbol(room.game)} Salon #{room.code} · {gameName(room.game)}{room.game === 'penalty' ? ` · ${room.shots} tirs` : ''}</span>
              <strong className={room.result.draw ? '' : room.result.winner === (session?.id === room.host.id ? 'host' : 'guest') ? 'is-win' : 'is-loss'}>
                {room.result.draw ? '🤝 Match nul' : room.result.winner === (session?.id === room.host.id ? 'host' : 'guest') ? '🏆 Victoire' : 'Défaite'}
                {room.game === 'penalty' ? ` · ${room.result.scores?.host ?? 0} - ${room.result.scores?.guest ?? 0}` : room.game === 'dice' ? ` · ${room.result.dice?.[room.result.dice.mode === 'cumulative' ? 'totals' : 'wins']?.host ?? 0} - ${room.result.dice?.[room.result.dice.mode === 'cumulative' ? 'totals' : 'wins']?.guest ?? 0}` : ''}
              </strong>
              <span>Voir →</span>
            </button>)}
          </section>}
        </section>
      ) : (
        <section id="game-panel-jeux" role="tabpanel" aria-labelledby="game-tab-jeux" className="game-hub__content">
          {!currentGame ? (
            <>
              <div className="game-hub__line"><h2>Les jeux</h2><span className="game-hub__count">{visibleGames.length} disponible{visibleGames.length > 1 ? 's' : ''}</span></div>
              <div className="game-grid">
                {visibleGames.map((game) => (
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
              {currentGame.id === 'monopoly' ? (
                <section className="game-detail__training" aria-label="Monopoly en ligne et entrainement">
                  <MonopolyOnline mode="create" onPlayingChange={setMonopolyOnlinePlaying}
                    onOpenRoom={openMonopolyRoom}
                    onCreated={(created) => {
                      setGameId(null);setSelectedMonopoly(null);setTab('salon');
                      if(created) {
                        setMonopolyMine(created);
                        setMonopolyRooms((old) => [{id:created.id,code:created.code,status:created.status,
                          maxPlayers:created.maxPlayers,stake:created.stake,host:session?.pseudo||'Moi',
                          present:created.players?.length||1,createdAt:created.createdAt,serverNow:created.serverNow},
                          ...old.filter((r)=>r.id!==created.id)]);
                      }
                      void refresh({quiet:true});
                    }}/>
                  {!monopolyOnlinePlaying&&<div className="mono-online-training-toggle">
                    <button type="button" className="btn btn--sm" onClick={()=>setMonopolyTrainingOpen(v=>!v)}>
                      {monopolyTrainingOpen?'Fermer l’entrainement':'Mode entrainement sans mise'}
                    </button>
                    {monopolyTrainingOpen&&<SoloMonopoly onPlayingChange={setMonopolyPlaying}/>} 
                  </div>}
                </section>
              ) : currentGame.id === 'tankrun' && tankRunTraining ? (
                <Suspense fallback={<p role="status">Chargement de Tank Run...</p>}>
                  <TankRun onExit={() => setTankRunTraining(false)} />
                </Suspense>
              ) : (
                <>
              <section className="game-hub__panel" aria-label="Créer un salon">
                <span className="game-hub__eyebrow">JOUER A DEUX</span>
                <h3>Créer un salon pour ce jeu</h3>
                <form onSubmit={doCreate} className="game-hub__form">
                  {currentGame.id === 'penalty' ? <fieldset className="game-hub__shots"><legend>Nombre de tirs par joueur</legend>
                    {[3, 5, 10].map((n) => <label key={n} className={shots === n ? 'is-checked' : ''}>
                      <input type="radio" name="shots" value={n} checked={shots === n} onChange={() => setShots(n)} />{n} tirs
                    </label>)}
                  </fieldset> : currentGame.id === 'dice' ? <>
                    <fieldset className="game-hub__shots"><legend>Nombre de dés</legend>
                      {[1,2].map(n => <label key={n} className={diceCount===n?'is-checked':''}><input type="radio" name="dice-count" checked={diceCount===n} onChange={() => setDiceCount(n)} />{n} dé{n>1?'s':''}</label>)}
                    </fieldset>
                    <fieldset className="game-hub__shots"><legend>Nombre de coups par joueur</legend>
                      {[1,3,5,10].map(n => <label key={n} className={diceRounds===n?'is-checked':''}><input type="radio" name="dice-rounds" checked={diceRounds===n} onChange={() => setDiceRounds(n)} />{n} coup{n>1?'s':''}</label>)}
                    </fieldset>
                    {diceRounds>1 && <fieldset className="game-hub__shots"><legend>Comment choisir le gagnant ?</legend>
                      <label className={diceMode==='separate'?'is-checked':''}><input type="radio" name="dice-mode" checked={diceMode==='separate'} onChange={() => setDiceMode('separate')} />Manches séparées</label>
                      <label className={diceMode==='cumulative'?'is-checked':''}><input type="radio" name="dice-mode" checked={diceMode==='cumulative'} onChange={() => setDiceMode('cumulative')} />Résultats cumulés</label>
                    </fieldset>}
                    <p className="game-hub__muted">{diceRounds===1 ? 'Un seul lancer chacun : le plus grand résultat gagne.' : diceMode==='separate' ? 'Chaque coup est une manche indépendante. Celui qui gagne le plus de manches gagne le duel.' : 'Les points des coups sont additionnés. Le plus grand total gagne à la fin.'} En cas d’égalité finale, le match est nul et les mises sont remboursées.</p>
                  </> : <p className="game-hub__muted">{currentGame.id === 'tankrun' ? 'Tank Run · deux joueurs à distance · choix du char et du terrain dans le salon.' : currentGame.id === 'tank' ? 'Tank Battle · 100 PV · 6 armes · carburant · 2 minutes maximum par tour.' : 'Dames · 10 × 10 · prises obligatoires · 2 minutes par coup.'}</p>}
                  <label>Mise par joueur (F CFA)
                    <input type="text" inputMode="numeric" pattern="[0-9]+" required maxLength={7}
                      value={stake} onChange={(e) => setStake(e.target.value.replace(/\D/g, '').slice(0, 7))}
                      aria-describedby="game-stake-info" />
                  </label>
                  <p id="game-stake-info" className="game-hub__muted">100 à 1 000 000 F. Gain si tu gagnes : {money(Number(stake || 0) * 2)}. La mise est prélevée quand ton adversaire est accepté.</p>
                  <button className="btn btn--primary btn--block" type="submit" disabled={busy || !session || slotLimitReached || sameGameRoom}>
                    {sameGameRoom ? 'Tu as deja un salon pour ce jeu' : slotLimitReached ? 'Limite de 5 salons atteinte' : 'Creer mon salon public'}</button>
                  {!session && <p className="game-hub__muted">Connecte-toi depuis le Profil pour créer un salon.</p>}
                </form>
              </section>
              <button type="button" className="btn btn--sm btn--block" onClick={() => setTab('salon')}>Voir les salons ouverts</button>
              <section className="game-detail__training" aria-label="Entraînement">
                <span className="game-hub__eyebrow">ENTRAINEMENT</span>
                <p className="game-hub__muted">Entraîne-toi contre le robot avant de défier un autre joueur. Aucune mise en jeu.</p>
                {currentGame.id === 'tankrun' ? <button type="button" className="btn btn--sm btn--block" onClick={() => setTankRunTraining(true)}>Lancer un entraînement local (sans salon)</button> : currentGame.id === 'penalty' ? <SoloPenalty /> : currentGame.id === 'checkers' ? <SoloCheckers /> : currentGame.id === 'dice' ? <SoloDice key={`${diceCount}-${diceRounds}-${diceRounds === 1 ? 'separate' : diceMode}`} diceCount={diceCount} rounds={diceRounds} mode={diceRounds === 1 ? 'separate' : diceMode} /> : <SoloTank />}
              </section>
                </>
              )}
            </article>
          )}
        </section>
      )}
    </main>
  );
}

// MAF_TANKRUN_STAGE_1

// MAF_TANKRUN_STAGE_4
