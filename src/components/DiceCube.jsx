// MAF_DICE_DESIGN_V1 : vrai de dessine en CSS (remplace les glyphes Unicode), avec animation de lancer.
import '../styles/dice-pro.css';

// Cases de la grille 3x3 allumees pour chaque valeur.
const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

export default function DiceCube({ value = 1, rolling = false, hidden = false, delay = 0 }) {
  const style = delay ? { animationDelay: `${delay}ms` } : undefined;
  if (hidden) {
    return <span className="mafd mafd--hidden" role="img" aria-label="Dé non révélé" style={style}><b className="mafd__q">?</b></span>;
  }
  const lit = PIPS[value] || PIPS[1];
  return (
    <span className={`mafd${rolling ? ' mafd--rolling' : ''}`} data-v={value} role="img" aria-label={`${value}`} style={style}>
      {Array.from({ length: 9 }, (_, i) => <i key={i} className={lit.includes(i) ? 'on' : ''} />)}
    </span>
  );
}
