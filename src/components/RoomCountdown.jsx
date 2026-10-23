import { useEffect, useMemo, useState } from 'react';

// MAF_ROOM_30M_POLICY_V1: horaire serveur, visible par tous et stable apres reconnexion.
export default function RoomCountdown({ room, prefix = 'Expire dans' }) {
  const [clock, setClock] = useState(Date.now);
  const deadline = useMemo(() => {
    const expiry = Date.parse(room?.expires_at || '');
    const server = Number(room?.server_now);
    if (!Number.isFinite(expiry) || !Number.isFinite(server)) return null;
    return Date.now() + Math.max(0, expiry - server);
  }, [room?.expires_at, room?.server_now]);
  useEffect(() => {
    if (deadline == null) return;
    setClock(Date.now());
    const tick = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [deadline]);
  if (!['open','pending'].includes(room?.status) || deadline == null) return null;
  const seconds = Math.max(0, Math.ceil((deadline - clock) / 1000));
  const mm = Math.floor(seconds / 60), ss = seconds % 60;
  return <span className={`maf-room-countdown${seconds <= 60 ? ' maf-room-countdown--urgent' : ''}`}
    role="timer" aria-label={`Expiration dans ${mm} minutes et ${ss} secondes`}>
    ⏳ {prefix} {String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
  </span>;
}
