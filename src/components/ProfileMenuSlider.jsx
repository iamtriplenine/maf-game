import { Children, useRef, useState } from "react";
import "../styles/profile-menu-slider.css";

export default function ProfileMenuSlider({ children }) {
  // ProfilePage fournit les options puis le menu principal : afficher le principal en premier.
  const pages = Children.toArray(children).reverse();
  const [page, setPage] = useState(0);
  const [dragPosition, setDragPosition] = useState(null);
  const track = useRef(null);
  const gesture = useRef(null);
  const suppressClick = useRef(false);
  const clamp = value => Math.max(0, Math.min(pages.length - 1, value));
  const finish = (event, cancelled = false) => {
    const g = gesture.current;
    if (!g || g.id !== event.pointerId || g.cancellingButton) return;
    let destination = Math.round(g.position);
    if (cancelled) destination = g.page;
    else if (g.dragging) {
      const dx = event.clientX - g.x;
      const quickSwipe = Math.abs(dx) > 45 && event.timeStamp - g.started < 250;
      if (quickSwipe) destination = g.page + (dx < 0 ? 1 : -1);
    }
    setPage(clamp(destination));
    setDragPosition(null);
    gesture.current = null;
  };

  return (
    <div className="profile-menu-slider" role="region" aria-label="Menu à faire glisser" tabIndex={0}
      onKeyDown={event => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          if (gesture.current) return;
          setPage(current => clamp(current + (event.key === "ArrowLeft" ? -1 : 1)));
        }
      }}
      onPointerDownCapture={event => {
        if (!event.isPrimary || event.button !== 0 || gesture.current) return;
        const width = track.current.getBoundingClientRect().width;
        if (!width) return;
        // Reprendre la position visible, meme pendant la fin animee du geste precedent.
        const transform = getComputedStyle(track.current).transform;
        const position = clamp(transform === "none" ? page : -new DOMMatrixReadOnly(transform).m41 / width);
        suppressClick.current = false;
        gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY,
          target: event.target, width, base: position, position, page,
          started: event.timeStamp, dragging: false, cancellingButton: false };
        setDragPosition(position);
      }}
      onPointerMoveCapture={event => {
        const g = gesture.current;
        if (!g || g.id !== event.pointerId) return;
        const dx = event.clientX - g.x, dy = event.clientY - g.y;
        if (!g.dragging && Math.abs(dx) > 5 && Math.abs(dx) > Math.abs(dy)) {
          g.dragging = true;
          suppressClick.current = true;
          // Le glissement annule les appuis longs et les clics des boutons.
          g.cancellingButton = true;
          g.target.dispatchEvent(new PointerEvent("pointercancel", { bubbles: true, pointerId: event.pointerId }));
          g.cancellingButton = false;
          event.currentTarget.setPointerCapture(event.pointerId);
        }
        if (g.dragging) {
          g.position = clamp(g.base - dx / g.width);
          setDragPosition(g.position);
        }
      }}
      onPointerUp={event => finish(event)}
      onPointerCancel={event => finish(event, true)}
      onLostPointerCapture={event => {
        // Le bouton perd sa capture implicite quand le menu reprend le geste.
        if (event.target === event.currentTarget) finish(event, true);
      }}
      onPointerLeave={event => {
        if (event.pointerType === "mouse" && !gesture.current?.dragging) finish(event, true);
      }}
      onClickCapture={event => {
        if (suppressClick.current && event.detail !== 0) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}>
      <div className="profile-menu-slider__viewport">
        <div ref={track} className={`profile-menu-slider__track${dragPosition !== null ? " is-dragging" : ""}`}
          style={{ transform: `translate3d(-${(dragPosition ?? page) * 100}%, 0, 0)` }}>
          {pages.map((content, index) => (
            <div key={content.key} className="profile-menu-slider__page" inert={index !== page} aria-hidden={index !== page}>
              {content}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
