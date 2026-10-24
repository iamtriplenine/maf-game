import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { refreshData } from '../api/refresh';
import { currentSession } from '../api/accounts';
import { winModeIsEnabled, winModeIndicatorIsEnabled, setWinModeActive, onWinModeChange } from '../utils/winMode';
import '../styles/refresh.css';

const KEY = 'maf-refresh-position';
const COOLDOWN = 'maf-refresh-until';
const clamp = point => ({ x: Math.max(8, Math.min(window.innerWidth - 88, point.x)), y: Math.max(8, Math.min(window.innerHeight - 88, point.y)) });
const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const save = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* stockage facultatif */ } };

export default function RefreshCube() {
  const maskId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const [pulse, setPulse] = useState(0);
  const [position, setPosition] = useState(() => {
    const value = read(KEY, null);
    return clamp(value && Number.isFinite(value.x) && Number.isFinite(value.y) ? value : { x: window.innerWidth - 96, y: window.innerHeight - 180 });
  });
  const [until, setUntil] = useState(() => Math.min(Number(read(COOLDOWN, 0)) || 0, Date.now() + 60000));
  const [now, setNow] = useState(Date.now);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [winEnabled, setWinEnabled] = useState(winModeIndicatorIsEnabled);
  const [owner, setOwner] = useState(() => currentSession()?.pseudo === '999');
  const holdTimer = useRef(null), suppressClick = useRef(false);
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
  useEffect(() => {
    const sync = () => { setOwner(currentSession()?.pseudo === '999'); setWinEnabled(winModeIndicatorIsEnabled()); };
    window.addEventListener('maf:session', sync);
    const off = onWinModeChange(sync);
    return () => { window.removeEventListener('maf:session', sync); off(); clearTimeout(holdTimer.current); };
  }, []);
  const cancelHold = () => { clearTimeout(holdTimer.current); holdTimer.current = null; };
  function click(event) {
    if (suppressClick.current) { suppressClick.current = false; return; }
    if (event.detail !== 0 && moved.current) return;
    setPulse(value => value + 1);
    const next = Date.now() + 60000;
    setUntil(next); setNow(Date.now()); save(COOLDOWN, next);
    refresh(true);
  }
  function end(event) {
    if (drag.current?.id !== event.pointerId) return;
    cancelHold();
    drag.current = null;
    save(KEY, position);
  }
  return createPortal(<div className="refresh-control" style={{ left: position.x, top: position.y }}>
    <button type="button" className={`refresh-control__button ${busy ? 'is-busy' : ''} ${winEnabled ? 'is-win' : ''}`}
      aria-label="Actualiser les données" aria-busy={busy}
      title="Actualiser · Fais glisser pour déplacer · Flèches au clavier"
      onClick={click}
      onPointerDown={event => {
        if (!event.isPrimary || event.button !== 0) return;
        moved.current = false;
        suppressClick.current = false;
        cancelHold();
        if (owner) holdTimer.current = setTimeout(() => {
          holdTimer.current = null;
          if (moved.current || !drag.current) return;
          suppressClick.current = true;
          const enabled = setWinModeActive(!winModeIsEnabled());
          setWinEnabled(enabled);
          setMessage(enabled ? 'Mode Win active' : 'Mode Fair Play active');
          if (navigator.vibrate) navigator.vibrate(120);
        }, 5000);
        drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, origin: position };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={event => {
        const start = drag.current;
        if (!start || start.id !== event.pointerId) return;
        const dx = event.clientX - start.x, dy = event.clientY - start.y;
        if (Math.hypot(dx, dy) > 6) { moved.current = true; cancelHold(); }
        if (moved.current) setPosition(clamp({ x: start.origin.x + dx, y: start.origin.y + dy }));
      }} onPointerUp={end} onPointerCancel={event => { moved.current = true; cancelHold(); end(event); }}
      onKeyDown={event => {
        const directions = { ArrowLeft: [-12, 0], ArrowRight: [12, 0], ArrowUp: [0, -12], ArrowDown: [0, 12] };
        const direction = directions[event.key];
        if (!direction) return;
        event.preventDefault();
        const next = clamp({ x: position.x + direction[0], y: position.y + direction[1] });
        setPosition(next); save(KEY, next);
      }}>
      <span key={pulse} className={`refresh-orb ${pulse ? 'refresh-orb--tap' : ''}`} aria-hidden="true">
        <svg className="refresh-orb__art" viewBox="0 0 100 100" width="76" height="76">
          <defs>
            <linearGradient id={`${maskId}-gradient`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="30%" stopColor="var(--accent-2, #55d7ff)" />
              <stop offset="70%" stopColor="var(--accent, #168bda)" />
            </linearGradient>
            <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100" style={{ maskType: 'luminance' }}>
              <g className="refresh-orb__mask">
                <polygon points="0,0 100,0 100,100 0,100" fill="black" />
                <polygon points="25,25 75,25 50,75" fill="white" />
                <polygon points="50,25 75,75 25,75" fill="white" />
                {[0,1,2,3].map(i => <polygon key={i} points="35,35 65,35 50,65" fill="white" />)}
              </g>
            </mask>
          </defs>
          <circle cx="50" cy="50" r="48" className="refresh-orb__rim" />
          <rect width="100" height="100" fill={`url(#${maskId}-gradient)`} mask={`url(#${maskId})`} />
        </svg>
      </span>
      <span className="refresh-control__count" aria-hidden="true">{remaining > 0 ? remaining : ''}</span>
    </button>
    <span role="status" className={message ? 'refresh-control__message' : 'refresh-control__silent'}>{message}</span>
  </div>, document.body);
}
