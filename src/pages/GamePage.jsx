import { useCallback, useEffect, useRef, useState } from 'react';
import { IconGamepad } from '../components/Icons';
import { useSession } from '../auth/useSession';
import * as roomsApi from '../api/rooms';
import '../styles/game-rooms.css';

const money = (value) => `${new Intl.NumberFormat('fr-FR').format(value)} F CFA`;
const gameName = () => 'Tir au but';
const statusLabel = { open: 'Ouvert', pending: 'Demande en cours', ready: 'Deux joueurs confirmes' };

export default function GamePage() {
  const { session } = useSession();
  const [tab, setTab] = useState('salon');
  const [rooms, setRooms] = useState([]);
  const [mine, setMine] = useState(null);
  const [selected, setSelected] = useState(null);
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

  const chooseRoom = (room) => {
    selectedId.current = room?.id ?? null;
    setSelected(room);
    setError('');
    setNotice('');
  };

  const refresh = useCallback(async ({ quiet = false } = {}) => {
    if (fetching.current) return;
    fetching.current = true;
    if (!quiet) setLoading(true);
    try {
      const [publicRooms, myActiveRoom] = await Promise.all([
        roomsApi.listRooms(), roomsApi.myRoom(),
      ]);
      setRooms(publicRooms);
      setMine(myActiveRoom);
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
    setMine(null);
    setRooms([]);
    const tick = () => { if (alive && !document.hidden) void refresh({ quiet: true }); };
    void refresh();
    const interval = window.setInterval(tick, 7000);
    const onVisible = () => { if (!document.hidden) void refresh({ quiet: true }); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  const action = async (run, message) => {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const next = await run();
      chooseRoom(next);
      setNotice(message);
      await refresh({ quiet: true });
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
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
    void action(() => roomsApi.createRoom({ game: 'penalty', shots, stake: value }), 'Ton salon est public ! Partage son code a 4 chiffres.');
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
      setTab(dx < 0 ? 'jeux' : 'salon');
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
        <button id="game-tab-salon" type="button" role="tab" aria-controls="game-panel-salon"
          aria-selected={tab === 'salon'} className={tab === 'salon' ? 'is-current' : ''}
          onClick={() => setTab('salon')}>Salon</button>
        <button id="game-tab-jeux" type="button" role="tab" aria-controls="game-panel-jeux"
          aria-selected={tab === 'jeux'} className={tab === 'jeux' ? 'is-current' : ''}
          onClick={() => setTab('jeux')}>Game</button>
      </div>

      {tab === 'salon' ? (
        <section id="game-panel-salon" role="tabpanel" aria-labelledby="game-tab-salon" className="game-hub__content">
          <div className="game-hub__line">
            <h2>Salons publics</h2>
            <button type="button" className="game-hub__refresh" disabled={loading || busy}
              onClick={() => void refresh()} aria-label="Actualiser les salons">↻ Actualiser</button>
          </div>
          <p className="game-hub__muted">2 joueurs maximum par salon. Le createur choisit le jeu, les tirs et la mise.</p>
          <div className="game-hub__test" role="note">
            <strong>Mode test des salons</strong>
            <span>Les mises sont indiquees pour preparer les matchs. Aucun F CFA n'est preleve ou verse dans cette etape.</span>
          </div>

          {error && <p role="alert" className="game-hub__error">{error}</p>}
          {notice && <p role="status" className="game-hub__notice">{notice}</p>}

          {mine && selected?.id !== mine.id && (
            <button type="button" className="game-hub__mine" onClick={() => void openRoom(mine)}>
              <span>Ton salon actif <strong>#{mine.code}</strong></span>
              <span>Voir →</span>
            </button>
          )}

          {selected && (
            <article className="game-hub__detail" aria-label="Details du salon">
              <div className="game-hub__line">
                <div>
                  <span className="game-hub__eyebrow">SALON SELECTIONNE</span>
                  <h3>#{selected.code} <span className={`game-hub__state game-hub__state--${selected.status}`}>{statusLabel[selected.status]}</span></h3>
                </div>
                <button type="button" className="game-hub__close" onClick={() => chooseRoom(null)} aria-label="Masquer ce salon">×</button>
              </div>
              <div className="game-hub__facts">
                <span>⚽ {gameName()}</span><span>{selected.shots} tirs / joueur</span>
                <span>Mise : {money(selected.stake)}</span><span>Gain prevu : {money(selected.stake * 2)} (non actif)</span>
              </div>
              <div className="game-hub__players">
                <div><small>CREATEUR</small><strong>{selected.host.pseudo}</strong><span>ID {selected.host.id}</span></div>
                <div className="game-hub__vs">VS</div>
                <div><small>ADVERSAIRE</small><strong>{selected.guest?.pseudo || (selected.status === 'pending' ? 'Demande en cours' : 'En attente...')}</strong><span>{selected.guest ? `ID ${selected.guest.id}` : 'Place libre / non confirmee'}</span></div>
              </div>
              <div className="game-hub__actions">
                {isHost && selected.status === 'open' && <p>Salon visible par tous. Donne le code <strong>{selected.code}</strong> a ton ami.</p>}
                {isHost && selected.status === 'pending' && <>
                  <p><strong>{selected.guest?.pseudo || 'Un joueur'}</strong> souhaite rejoindre ton salon. Tu acceptes ?</p>
                  <button className="btn btn--primary btn--sm" type="button" disabled={busy}
                    onClick={() => void action(() => roomsApi.acceptRoom(selected.id), 'Adversaire accepte !')}>Accepter</button>
                  <button className="btn btn--sm" type="button" disabled={busy}
                    onClick={() => void action(() => roomsApi.declineRoom(selected.id), 'Demande refusee. Salon de nouveau ouvert.')}>Refuser</button>
                </>}
                {isGuest && selected.status === 'pending' && <p>Demande envoyee. Le createur doit accepter ton entree.</p>}
                {selected.status === 'ready' && <p>Les deux joueurs sont confirmes ! Le match de tir au but sera activé a l'etape 2.</p>}
                {canJoin && <button className="btn btn--primary btn--sm" type="button" disabled={busy}
                  onClick={() => void action(() => roomsApi.joinRoom(selected.id), 'Demande envoyee au createur.')}>Demander a rejoindre</button>}
                {!session && selected.status === 'open' && <p>Connecte-toi depuis le Profil pour rejoindre.</p>}
                {otherRoom && !isParticipant && <p>Tu dois quitter ton salon actuel avant d'en rejoindre un autre.</p>}
                {selected.status === 'pending' && !isParticipant && <p>Ce salon attend deja la reponse a une demande.</p>}
                {isParticipant && <button type="button" className="btn btn--sm btn--outline" disabled={busy}
                  onClick={() => void action(() => roomsApi.leaveRoom(selected.id), 'Tu as quitte le salon.')}>
                  {isHost ? 'Fermer le salon' : selected.status === 'pending' ? 'Annuler ma demande' : 'Quitter le salon'}
                </button>}
              </div>
            </article>
          )}

          <div className="game-hub__panels">
            <section className="game-hub__panel" aria-label="Creer un salon">
              <span className="game-hub__eyebrow">JOUER A DEUX</span>
              <h3>Creer un salon</h3>
              <form onSubmit={doCreate} className="game-hub__form">
                <label>Jeu
                  <select value="penalty" aria-label="Jeu" disabled><option value="penalty">⚽ Tir au but</option></select>
                </label>
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
                <p id="game-stake-info" className="game-hub__muted">100 a 1 000 000 F. Gain theorique : {money(Number(stake || 0) * 2)}.</p>
                <button className="btn btn--primary btn--block" type="submit" disabled={busy || !!mine || !session}>
                  {mine ? 'Tu as deja un salon actif' : 'Creer mon salon public'}</button>
                {!session && <p className="game-hub__muted">Connecte-toi depuis le Profil pour creer un salon.</p>}
              </form>
            </section>
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

          <div className="game-hub__line"><h2>Salons disponibles</h2><span className="game-hub__count">{rooms.length} affiches</span></div>
          <div className="game-hub__rooms" aria-live="polite">
            {rooms.length === 0 && <p className="game-hub__empty">{loading ? 'Chargement des salons...' : 'Aucun salon public. Cree le premier !'}</p>}
            {rooms.map((room) => <button type="button" key={room.id}
              className={`game-hub__room${selected?.id === room.id ? ' is-selected' : ''}`}
              onClick={() => void openRoom(room)}>
              <span className="game-hub__room-top"><strong>#{room.code}</strong><span className={`game-hub__state game-hub__state--${room.status}`}>{statusLabel[room.status]}</span></span>
              <span className="game-hub__room-name">{room.host.pseudo} <small>· ID {room.host.id}</small></span>
              <span className="game-hub__room-bottom">⚽ {room.shots} tirs · {money(room.stake)}<span>Voir →</span></span>
            </button>)}
          </div>
        </section>
      ) : (
        <section id="game-panel-jeux" role="tabpanel" aria-labelledby="game-tab-jeux" className="game-hub__content">
          <div className="game-hub__line"><h2>Les jeux</h2><span className="game-hub__count">1 en preparation</span></div>
          <p className="game-hub__muted">Ici, tu pourras lancer les jeux pour t'entrainer en solo ou les tester avant d'entrer dans un salon.</p>
          <article className="game-hub__featured">
            <span className="game-hub__ball" aria-hidden="true">⚽</span>
            <div><span className="game-hub__eyebrow">PREMIER JEU</span>
              <h3>Tir au but</h3>
              <p>Face a face tireur / gardien. Vise a gauche, au milieu ou a droite. Change de role apres chaque tir et compte tes buts.</p>
              <div className="game-hub__tags"><span>3 tirs</span><span>5 tirs</span><span>10 tirs</span><span>2 joueurs</span></div>
              <p className="game-hub__muted">Jeu et entrainement solo prevus pour l'etape 2. Les salons peuvent deja etre crees.</p>
              <button type="button" className="btn btn--primary btn--sm" onClick={() => setTab('salon')}>Voir les salons</button>
            </div>
          </article>
        </section>
      )}
    </main>
  );
}
