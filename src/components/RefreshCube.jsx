import { useCallback, useEffect, useRef, useState } from 'react';
import { refreshData } from '../api/refresh';
import '../styles/refresh.css';

const KEY = 'maf-refresh-position';
const COOLDOWN = 'maf-refresh-until';
const clamp = point => ({ x: Math.max(8, Math.min(window.innerWidth - 88, point.x)), y: Math.max(8, Math.min(window.innerHeight - 108, point.y)) });
const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const save = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* stockage facultatif */ } };

export default function RefreshCube() {
  const [position, setPosition] = useState(() => {
    const value = read(KEY, null);
    return clamp(value && Number.isFinite(value.x) && Number.isFinite(value.y) ? value : { x: window.innerWidth - 96, y: window.innerHeight - 180 });
  });
  const [until, setUntil] = useState(() => Math.min(Number(read(COOLDOWN, 0)) || 0, Date.now() + 60000));
  const [now, setNow] = useState(Date.now);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const lock = useRef(false), drag = useRef(null), moved = useRef(false), mounted = useRef(false);
  const remaining = Math.max(0, Math.ceil((until - now) / 1000));
  const refresh = useCallback(async (manual = false) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    if (manual) setMessage('');
    try {
      await refreshData();
      if (mounted.current && manual) setMessage('Données actualisées');
    } catch {
      if (mounted.current) setMessage('Actualisation indisponible. Réessaie dans un instant.');
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    const automatic = () => { if (!document.hidden) refresh(); };
    automatic();
    const poll = setInterval(automatic, 15000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const resize = () => setPosition(current => clamp(current));
    window.addEventListener('resize', resize);
    window.addEventListener('focus', automatic);
    window.addEventListener('online', automatic);
    document.addEventListener('visibilitychange', automatic);
    return () => {
      mounted.current = false;
      clearInterval(poll); clearInterval(tick);
      window.removeEventListener('resize', resize);
      window.removeEventListener('focus', automatic);
      window.removeEventListener('online', automatic);
      document.removeEventListener('visibilitychange', automatic);
    };
  }, [refresh]);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(''), 5000);
    return () => clearTimeout(timer);
  }, [message]);
  function click(event) {
    if ((event.detail !== 0 && moved.current) || lock.current || Date.now() < until) return;
    const next = Date.now() + 60000;
    setUntil(next); setNow(Date.now()); save(COOLDOWN, next);
    refresh(true);
  }
  function end(event) {
    if (drag.current?.id !== event.pointerId) return;
    drag.current = null;
    save(KEY, position);
  }
  return <div className="refresh-control" style={{ left: position.x, top: position.y }}>
    <button type="button" className={`refresh-control__button ${busy ? 'is-busy' : ''}`}
      aria-label={busy ? 'Actualisation en cours' : remaining ? `Actualiser dans ${remaining} secondes` : 'Actualiser les données'}
      aria-disabled={busy || remaining > 0} aria-busy={busy}
      title="Actualiser · Fais glisser pour déplacer · Flèches au clavier"
      onClick={click}
      onPointerDown={event => {
        if (!event.isPrimary || event.button !== 0) return;
        moved.current = false;
        drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, origin: position };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={event => {
        const start = drag.current;
        if (!start || start.id !== event.pointerId) return;
        const dx = event.clientX - start.x, dy = event.clientY - start.y;
        if (Math.hypot(dx, dy) > 6) moved.current = true;
        if (moved.current) setPosition(clamp({ x: start.origin.x + dx, y: start.origin.y + dy }));
      }} onPointerUp={end} onPointerCancel={event => { moved.current = true; end(event); }}
      onKeyDown={event => {
        const directions = { ArrowLeft: [-12, 0], ArrowRight: [12, 0], ArrowUp: [0, -12], ArrowDown: [0, 12] };
        const direction = directions[event.key];
        if (!direction) return;
        event.preventDefault();
        const next = clamp({ x: position.x + direction[0], y: position.y + direction[1] });
        setPosition(next); save(KEY, next);
      }}>
      <span className="refresh-cube" aria-hidden="true">{Array.from({ length: 6 }, (_, i) => <span key={i} />)}</span>
      <span className="refresh-control__label">{busy ? 'En cours…' : remaining ? `${remaining}s` : 'Actualiser'}</span>
    </button>
    <span role="status" className={message ? 'refresh-control__message' : 'refresh-control__silent'}>{message}</span>
  </div>;
}
