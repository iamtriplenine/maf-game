import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import "../styles/skins-carousel.css";

// Carrousel 3D de cartes (inspire de Uiverse "card-3d") pilote au doigt / a la souris.
// Reglages : DRAG_RATIO = degres de rotation par pixel glisse (plus grand = tourne plus vite).
const DRAG_RATIO = 0.55;
const TAP_SLOP = 6;
const wrap = (a) => ((((a + 180) % 360) + 360) % 360) - 180;

export default function SkinCarousel({ skins, activeId, onChange, disabled = false, renderCard }) {
  const count = skins.length || 1;
  const step = 360 / count;
  const radius = Math.round(Math.max(135, 52 / Math.tan(Math.PI / Math.max(count, 3)) + 42));
  const activeIndex = Math.max(0, skins.findIndex((skin) => skin.id === activeId));

  const trackRef = useRef(null);
  const cardsRef = useRef([]);
  const onChangeRef = useRef(onChange);
  const st = useRef({
    rot: -activeIndex * step,
    target: null,
    dragging: false,
    moved: false,
    startX: 0,
    lastX: 0,
    lastT: 0,
    vel: 0,
    index: activeIndex,
    raf: 0,
    t: 0,
  });
  const [settled, setSettled] = useState(activeIndex);

  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const paint = useCallback(() => {
    const s = st.current;
    if (trackRef.current) {
      trackRef.current.style.transform = `translateZ(${-radius}px) rotateY(${s.rot}deg)`;
    }
    cardsRef.current.forEach((el, i) => {
      if (!el) return;
      const a = Math.abs(wrap(i * step + s.rot));
      const k = Math.max(0, Math.cos((a * Math.PI) / 180));
      el.style.filter = `brightness(${(0.28 + 0.72 * k).toFixed(3)})`;
    });
  }, [radius, step]);

  const syncIndex = useCallback(() => {
    const s = st.current;
    const idx = ((Math.round(-s.rot / step) % count) + count) % count;
    if (idx !== s.index) {
      s.index = idx;
      if (onChangeRef.current) onChangeRef.current(skins[idx].id);
    }
  }, [count, step, skins]);

  const run = useCallback(() => {
    const s = st.current;
    if (s.raf) return;
    s.t = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.05, (now - s.t) / 1000);
      s.t = now;
      if (s.dragging || s.target === null) {
        s.raf = 0;
        return;
      }
      s.rot += (s.target - s.rot) * (1 - Math.exp(-dt * 11));
      if (Math.abs(s.target - s.rot) < 0.04) {
        s.rot = s.target;
        s.target = null;
        s.raf = 0;
        paint();
        syncIndex();
        setSettled(s.index);
        return;
      }
      paint();
      syncIndex();
      s.raf = requestAnimationFrame(tick);
    };
    s.raf = requestAnimationFrame(tick);
  }, [paint, syncIndex]);

  const goTo = useCallback((i) => {
    const s = st.current;
    s.target = s.rot + wrap(-i * step - s.rot);
    run();
  }, [step, run]);

  useLayoutEffect(() => {
    paint();
  }, [paint]);

  // Changement venu de l'exterieur (ex. ouverture de la fenetre) : on tourne vers la bonne carte.
  useEffect(() => {
    const s = st.current;
    if (s.dragging || activeIndex === s.index) return;
    s.index = activeIndex;
    setSettled(null);
    goTo(activeIndex);
  }, [activeIndex, goTo]);

  useEffect(() => () => cancelAnimationFrame(st.current.raf), []);

  const onDown = (e) => {
    if (disabled || (e.pointerType === "mouse" && e.button !== 0)) return;
    const s = st.current;
    s.dragging = true;
    s.moved = false;
    s.target = null;
    s.vel = 0;
    s.startX = e.clientX;
    s.lastX = e.clientX;
    s.lastT = e.timeStamp;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* facultatif */ }
  };

  const onMove = (e) => {
    const s = st.current;
    if (!s.dragging) return;
    if (!s.moved) {
      if (Math.abs(e.clientX - s.startX) < TAP_SLOP) return;
      s.moved = true;
      s.lastX = e.clientX;
      s.lastT = e.timeStamp;
      setSettled(null);
      return;
    }
    const dx = e.clientX - s.lastX;
    const dtm = Math.max(1, e.timeStamp - s.lastT) / 1000;
    s.rot += dx * DRAG_RATIO;
    s.vel = s.vel * 0.65 + ((dx * DRAG_RATIO) / dtm) * 0.35;
    s.lastX = e.clientX;
    s.lastT = e.timeStamp;
    paint();
    syncIndex();
  };

  const onUp = (e) => {
    const s = st.current;
    if (!s.dragging) return;
    s.dragging = false;
    if (s.moved) {
      const v = e.timeStamp - s.lastT > 90 ? 0 : s.vel;
      const push = Math.max(-step * 1.5, Math.min(step * 1.5, v * 0.16));
      s.target = Math.round((s.rot + push) / step) * step;
      run();
      return;
    }
    const el = e.type === "pointerup" ? document.elementFromPoint(e.clientX, e.clientY) : null;
    const card = el && el.closest ? el.closest("[data-i]") : null;
    if (card) {
      const i = Number(card.dataset.i);
      if (i !== s.index) setSettled(null);
      goTo(i);
    } else {
      s.target = Math.round(s.rot / step) * step;
      run();
    }
  };

  const onKeyDown = (e) => {
    if (disabled) return;
    const s = st.current;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      setSettled(null);
      goTo((s.index + 1) % count);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setSettled(null);
      goTo((s.index - 1 + count) % count);
    }
  };

  return (
    <div
      className="skins-carousel"
      tabIndex={disabled ? -1 : 0}
      role="listbox"
      aria-label="Personnages : glisse pour tourner"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onKeyDown={onKeyDown}
    >
      <div className="skins-carousel__track" ref={trackRef}>
        {skins.map((skin, i) => (
          <div
            key={skin.id}
            ref={(el) => { cardsRef.current[i] = el; }}
            data-i={i}
            role="option"
            aria-selected={skin.id === activeId}
            className={`skin-card${skin.id === activeId ? " is-active" : ""}`}
            style={{ transform: `translate(-50%, -50%) rotateY(${i * step}deg) translateZ(${radius}px)` }}
          >
            {renderCard(skin, settled === i)}
          </div>
        ))}
      </div>
    </div>
  );
}
