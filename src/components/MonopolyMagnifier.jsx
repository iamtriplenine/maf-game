// Loupe mobile du Monopoly : maintien sur le plateau, puis glissement du doigt.
// Capture le plateau 2D ET le canvas 3D local pour voir les maisons et les pions.
import { useEffect, useRef, useState } from 'react';

const HOLD_MS = 340;
const ZOOM = 2.75;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export default function MonopolyMagnifier({ boardRef }) {
  const [lens, setLens] = useState(null);
  const latest = useRef(null);
  const canvasRef = useRef(null);
  const activeRef = useRef(false);
  latest.current = lens;

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return undefined;
    let holding = null;
    let timer = 0;
    let suppressClick = false;
    let suppressReset = 0;

    const coords = (event) => {
      const bounds = board.getBoundingClientRect();
      return {
        x: clamp(event.clientX - bounds.left, 0, bounds.width),
        y: clamp(event.clientY - bounds.top, 0, bounds.height),
        side: event.clientX - bounds.left < bounds.width / 2 ? 'right' : 'left',
      };
    };
    const cancelTimer = () => {
      if (timer) window.clearTimeout(timer);
      timer = 0;
    };
    const onDown = (event) => {
      if (event.button !== 0 || !event.isPrimary || holding) return;
      // Ne pas intercepter le de ou les notifications situees au centre.
      if (event.target.closest?.('.mono-center')) return;
      const p = coords(event);
      holding = { id: event.pointerId, startX: p.x, startY: p.y, x: p.x, y: p.y, side: p.side, active: false };
      timer = window.setTimeout(() => {
        timer = 0;
        if (!holding || holding.id !== event.pointerId) return;
        holding.active = true;
        activeRef.current = true;
        suppressClick = true;
        setLens({ x: holding.x, y: holding.y, side: holding.side });
        try { board.setPointerCapture(holding.id); } catch { /* pointer peut deja avoir disparu */ }
      }, HOLD_MS);
    };
    const onMove = (event) => {
      if (!holding || holding.id !== event.pointerId) return;
      const p = coords(event);
      holding.x = p.x;
      holding.y = p.y;
      holding.side = p.side;
      if (!holding.active) {
        // Un glissement sans maintien ne declenche pas la loupe.
        if (Math.hypot(p.x - holding.startX, p.y - holding.startY) > 14) {
          cancelTimer();
          holding = null;
        }
        return;
      }
      setLens(p);
    };
    const onEnd = (event) => {
      if (!holding || holding.id !== event.pointerId) return;
      cancelTimer();
      const wasActive = holding.active;
      holding = null;
      if (wasActive) {
        activeRef.current = false;
        setLens(null);
        if (board.hasPointerCapture?.(event.pointerId)) board.releasePointerCapture(event.pointerId);
        window.clearTimeout(suppressReset);
        suppressReset = window.setTimeout(() => { suppressClick = false; }, 350);
      }
    };
    // Capture native : un maintien ne doit pas declencher l'achat/la selection d'une case.
    const onClick = (event) => {
      if (suppressClick) { event.preventDefault(); event.stopImmediatePropagation(); suppressClick = false; }
    };
    board.addEventListener('pointerdown', onDown);
    board.addEventListener('pointermove', onMove);
    board.addEventListener('pointerup', onEnd);
    board.addEventListener('pointercancel', onEnd);
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);
    board.addEventListener('click', onClick, true);
    return () => {
      cancelTimer();
      window.clearTimeout(suppressReset);
      activeRef.current = false;
      board.removeEventListener('pointerdown', onDown);
      board.removeEventListener('pointermove', onMove);
      board.removeEventListener('pointerup', onEnd);
      board.removeEventListener('pointercancel', onEnd);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);
      board.removeEventListener('click', onClick, true);
    };
  }, [boardRef]);

  useEffect(() => {
    if (!lens) return undefined;
    let frame = 0;
    let lastDraw = 0;
    const draw = (now) => {
      frame = requestAnimationFrame(draw);
      if (now - lastDraw < 35) return;
      lastDraw = now;
      const board = boardRef.current;
      const canvas = canvasRef.current;
      const pos = latest.current;
      if (!board || !canvas || !pos || !activeRef.current) return;
      const bounds = board.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const size = canvas.getBoundingClientRect().width;
      if (!size) return;
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const pixels = Math.round(size * pixelRatio);
      if (canvas.width !== pixels || canvas.height !== pixels) {
        canvas.width = pixels;
        canvas.height = pixels;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      ctx.clearRect(0, 0, size, size);
      ctx.fillStyle = '#cfe5cf';
      ctx.fillRect(0, 0, size, size);
      // La loupe lit directement les calques du plateau deja a l'ecran.
      // Les modeles 3D restent visibles, sans refaire une seconde scene Three.js.
      const left = size / 2 - pos.x * ZOOM;
      const top = size / 2 - pos.y * ZOOM;
      const image = board.querySelector('.mono-board__img');
      const surface = board.querySelector('.mono-scene3d canvas');
      if (image?.complete && image.naturalWidth && window.getComputedStyle(image).visibility !== 'hidden') {
        ctx.drawImage(image, left, top, bounds.width * ZOOM, bounds.height * ZOOM);
      }
      if (board.classList.contains('is-3d') && surface && window.getComputedStyle(surface.parentElement).visibility !== 'hidden') {
        try { ctx.drawImage(surface, left, top, bounds.width * ZOOM, bounds.height * ZOOM); }
        catch { /* canvas WebGL momentaneement indisponible */ }
      }
      ctx.strokeStyle = 'rgba(255,255,255,.78)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(size / 2 - 9, size / 2);
      ctx.lineTo(size / 2 + 9, size / 2);
      ctx.moveTo(size / 2, size / 2 - 9);
      ctx.lineTo(size / 2, size / 2 + 9);
      ctx.stroke();
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [!!lens, boardRef]);

  if (!lens) return null;
  return (
    <div className={`mono-magnifier mono-magnifier--${lens.side}`} role="status" aria-label="Loupe du plateau, déplacement du doigt pour voir les maisons">
      <canvas ref={canvasRef} aria-hidden="true" />
      <span className="mono-magnifier__caption">Loupe ×{ZOOM}</span>
    </div>
  );
}
