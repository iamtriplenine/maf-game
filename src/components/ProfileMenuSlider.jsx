import { Children, useRef, useState } from "react";
import "../styles/profile-menu-slider.css";

export default function ProfileMenuSlider({ children }) {
  const pages = Children.toArray(children);
  const [page, setPage] = useState(1);
  const gesture = useRef(null);
  const suppressClick = useRef(false);
  const finish = (event, cancelled = false) => {
    const g = gesture.current;
    if (!g || g.id !== event.pointerId) return;
    if (!cancelled && g.dragging) {
      const dx = event.clientX - g.x;
      if (Math.abs(dx) >= 45) setPage(dx > 0 ? 0 : 1);
    }
    gesture.current = null;
  };

  return (
    <div className="profile-menu-slider" role="region" aria-label="Menu à faire glisser" tabIndex={0}
      onKeyDown={event => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          setPage(event.key === "ArrowLeft" ? 0 : 1);
        }
      }}
      onPointerDownCapture={event => {
        if (!event.isPrimary || event.button !== 0) return;
        suppressClick.current = false;
        gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, target: event.target, dragging: false };
      }}
      onPointerMoveCapture={event => {
        const g = gesture.current;
        if (!g || g.id !== event.pointerId) return;
        const dx = Math.abs(event.clientX - g.x), dy = Math.abs(event.clientY - g.y);
        if (!g.dragging && dx > 12 && dx > dy) {
          g.dragging = true;
          suppressClick.current = true;
          // Annuler aussi les appuis longs des boutons avant de capturer le geste.
          g.target.dispatchEvent(new PointerEvent("pointercancel", { bubbles: true, pointerId: event.pointerId }));
          gesture.current = g;
          event.currentTarget.setPointerCapture(event.pointerId);
        }
      }}
      onPointerUp={event => finish(event)}
      onPointerCancel={event => finish(event, true)}
      onClickCapture={event => {
        if (suppressClick.current && event.detail !== 0) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}>
      <div className="profile-menu-slider__viewport">
        <div className="profile-menu-slider__track" style={{ transform: `translateX(-${page * 100}%)` }}>
          {pages.map((content, index) => (
            <div key={content.key} className="profile-menu-slider__page" inert={index !== page} aria-hidden={index !== page}>
              {content}
            </div>
          ))}
        </div>
      </div>
      <p className="profile-menu-slider__hint" aria-live="polite">
        {page === 1 ? "Glisse vers la droite pour les autres boutons →" : "← Glisse vers la gauche pour le menu principal"}
      </p>
    </div>
  );
}
