import { useEffect, useRef, useState } from "react";
import "../styles/dials.css";

// Code a 10 chiffres sous forme de molettes 3D (comme une valise a code).
// On fait rouler chaque molette : glisser vers le haut/bas, molette de souris,
// appui sur le chiffre du haut/bas, ou fleches du clavier.
const COUNT = 10; // nombre de molettes
const SIDES = 10; // chiffres 0-9 sur chaque molette
const FACE_H = 40; // hauteur d'un chiffre (px) - doit rester egale a --face-h dans dials.css
const STEP = 38; // pixels de glissement pour changer d'un chiffre
const RADIUS = Math.round(FACE_H / 2 / Math.tan(Math.PI / SIDES)); // rayon du cylindre

const mod = (n) => ((n % SIDES) + SIDES) % SIDES;
const tick = () => {
  try {
    navigator.vibrate?.(6);
  } catch {
    /* pas grave */
  }
};

function Dial({ index, disabled, onSet }) {
  const [turn, setTurn] = useState(0); // position en nombre de crans (peut etre decimale)
  const [dragging, setDragging] = useState(false);
  const ref = useRef(null);
  const gesture = useRef(null);
  const turnRef = useRef(0);
  const wheelAt = useRef(0);

  const apply = (value, settle) => {
    turnRef.current = value;
    setTurn(value);
    if (settle) onSet(index, mod(Math.round(value)));
  };

  // Molette de la souris (ecouteur "non passif" pour empecher le defilement de la page)
  useEffect(() => {
    const node = ref.current;
    const onWheel = (event) => {
      if (disabled) return;
      event.preventDefault();
      const now = Date.now();
      if (now - wheelAt.current < 90) return;
      wheelAt.current = now;
      apply(Math.round(turnRef.current) + (event.deltaY > 0 ? 1 : -1), true);
      tick();
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  });

  const onPointerDown = (event) => {
    if (disabled) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    ref.current.setPointerCapture(event.pointerId);
    gesture.current = { y: event.clientY, start: turnRef.current, moved: false, last: Math.round(turnRef.current) };
    setDragging(true);
  };

  const onPointerMove = (event) => {
    const g = gesture.current;
    if (!g) return;
    const dy = event.clientY - g.y;
    if (!g.moved && Math.abs(dy) < 4) return;
    g.moved = true;
    const next = g.start - dy / STEP; // doigt vers le bas = chiffres precedents
    apply(next, false);
    const rounded = Math.round(next);
    if (rounded !== g.last) {
      g.last = rounded;
      tick();
    }
  };

  const onPointerUp = (event) => {
    const g = gesture.current;
    gesture.current = null;
    setDragging(false);
    if (!g) return;
    if (g.moved) {
      apply(Math.round(turnRef.current), true);
    } else {
      // Simple appui : haut = chiffre precedent, bas = chiffre suivant
      const rect = ref.current.getBoundingClientRect();
      const y = (event.clientY - rect.top) / rect.height;
      const base = Math.round(turnRef.current);
      if (y < 0.34) apply(base - 1, true);
      else if (y > 0.66) apply(base + 1, true);
      else apply(base, true);
    }
  };

  const onKeyDown = (event) => {
    if (disabled) return;
    const base = Math.round(turnRef.current);
    if (event.key === "ArrowUp") apply(base + 1, true);
    else if (event.key === "ArrowDown") apply(base - 1, true);
    else if (/^\d$/.test(event.key)) apply(base + (Number(event.key) - mod(base)), true);
    else return;
    event.preventDefault();
  };

  const digit = mod(Math.round(turn));

  return (
    <div
      ref={ref}
      className={`dial${dragging ? " is-dragging" : ""}${disabled ? " is-disabled" : ""}`}
      role="spinbutton"
      tabIndex={disabled ? -1 : 0}
      aria-label={`Chiffre ${index + 1} sur ${COUNT}`}
      aria-valuemin={0}
      aria-valuemax={9}
      aria-valuenow={digit}
      aria-disabled={disabled || undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
    >
      <div className="dial__drum" style={{ transform: `translateZ(${-RADIUS}px) rotateX(${turn * (360 / SIDES)}deg)` }}>
        {Array.from({ length: SIDES }, (_, k) => (
          <div
            key={k}
            className="dial__face"
            style={{ transform: `rotateX(${-k * (360 / SIDES)}deg) translateZ(${RADIUS}px)` }}
          >
            {k}
          </div>
        ))}
      </div>
    </div>
  );
}

// onChange(code) est appele avec une chaine de 10 chiffres des qu'une molette bouge.
export default function CodeDials({ onChange, disabled = false }) {
  const digits = useRef(Array(COUNT).fill(0));

  const set = (index, digit) => {
    digits.current[index] = digit;
    onChange(digits.current.join(""));
  };

  return (
    <div className="code-dials" role="group" aria-label="Code a 10 chiffres">
      {Array.from({ length: COUNT }, (_, i) => (
        <Dial key={i} index={i} disabled={disabled} onSet={set} />
      ))}
    </div>
  );
}
