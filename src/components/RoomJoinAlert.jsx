import { useEffect, useState } from 'react';
import { useSession } from '../auth/useSession';
import * as roomsApi from '../api/rooms';
import '../styles/room-join-alert.css';

// L'ID du demandeur et l'horodatage de la demande sont fournis par le backend.
// Une nouvelle demande (meme du meme joueur) possede un nouvel updated_at.
export function pendingInvitationKey(room, userId) {
  if (!room || room.status !== 'pending' || !room.guest?.id || !room.host?.id
      || Number(room.host.id) !== Number(userId)) return null;
  return `${userId}:${room.id}:${room.guest.id}:${room.updated_at || 'pending'}`;
}

const dismissedStorageKey = (userId) => `maf:salon-invitation-dismissed:${userId}`;

function wasDismissed(userId, key) {
  try { return localStorage.getItem(dismissedStorageKey(userId)) === key; }
  catch { return false; }
}
function markDismissed(userId, key) {
  try { localStorage.setItem(dismissedStorageKey(userId), key); }
  catch { /* l'alerte reste fermable en memoire */ }
}

export default function RoomJoinAlert() {
  const { session } = useSession();
  const userId = session?.id;
  const [invitation, setInvitation] = useState(null);
  const [dismissedNow, setDismissedNow] = useState(null);

  useEffect(() => {
    let alive = true;
    let checking = false;
    setInvitation(null);
    setDismissedNow(null);
    if (!userId) return () => { alive = false; };

    const check = async () => {
      if (!alive || checking || document.hidden) return;
      checking = true;
      try {
        const room = await roomsApi.myRoom();
        if (!alive) return;
        const key = pendingInvitationKey(room, userId);
        if (!key || wasDismissed(userId, key)) {
          setInvitation(null);
        } else {
          setInvitation({ key, room });
        }
      } catch {
        // Coupure Internet / serveur Render en veille : ne pas effacer une demande visible.
      } finally { checking = false; }
    };

    void check();
    const timer = window.setInterval(() => void check(), 4000);
    const onVisible = () => { if (!document.hidden) void check(); };
    window.addEventListener('focus', onVisible);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [userId]);

  if (!invitation || invitation.key === dismissedNow) return null;
  const { room, key } = invitation;
  const gameName = room.game === 'tank' ? 'Tank Battle'
    : room.game === 'checkers' ? 'Dames' : 'Tir au but';

  const dismiss = () => {
    markDismissed(userId, key);
    setDismissedNow(key);
    setInvitation(null);
  };
  const goToRoom = () => {
    // Fermer cette alerte uniquement ; on pourra toujours consulter la demande dans le Salon.
    dismiss();
    const payload = { id: room.id, uid: userId };
    try { sessionStorage.setItem('maf:pending-room-to-open', JSON.stringify(payload)); }
    catch { /* l'evenement fonctionne si GamePage est deja affiche */ }
    if (window.location.hash === '#game') {
      window.dispatchEvent(new CustomEvent('maf:open-pending-room', { detail: payload }));
    } else {
      window.location.hash = '#game';
    }
  };

  return (
    <aside className="maf-room-join-alert" role="alert" aria-label="Nouvelle demande pour ton salon">
      <button type="button" className="maf-room-join-alert__dismiss" aria-label="Fermer la notification"
        title="Fermer cette demande" onClick={dismiss}>×</button>
      <div className="maf-room-join-alert__icon" aria-hidden="true">⚔</div>
      <div className="maf-room-join-alert__eyebrow">NOUVELLE DEMANDE DE DUEL</div>
      <h2>Un adversaire t'attend !</h2>
      <p><strong>{room.guest?.pseudo || 'Un joueur'}</strong> souhaite rejoindre ton salon <strong>#{room.code}</strong>.</p>
      <div className="maf-room-join-alert__details">
        <span>{gameName}</span>
        <span>Mise : {new Intl.NumberFormat('fr-FR').format(room.stake || 0)} F CFA</span>
      </div>
      <button type="button" className="maf-room-join-alert__go" onClick={goToRoom}>
        REJOINDRE LE SALON <span aria-hidden="true">→</span>
      </button>
      <small>La proposition reste en attente jusqu'à ta décision. Ferme cette alerte avec × si tu veux la consulter plus tard.</small>
    </aside>
  );
}
