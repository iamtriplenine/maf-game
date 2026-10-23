// Dessins SVG des munitions de Tank Battle.
// Chaque forme est dessinee dans une boite 48 x 24, pointe vers la droite.
export const WEAPON_INFO = {
  shell: { short: 'Obus', hint: 'Tir en cloche, munitions illimitees.' },
  heavy: { short: 'Missile lourd', hint: 'Gros degats et grande explosion.' },
  stone: { short: 'Bombe ronde', hint: 'Lourde : elle retombe tres vite.' },
  direct: { short: 'Missile direct', hint: 'Trajectoire tendue, presque droite.' },
  sky: { short: 'Missile vertical', hint: 'Monte, survole, puis plonge sur la cible.' },
  cluster: { short: 'Fragmentation', hint: 'Eclate en 3 explosions.' },
};

export function WeaponShape({ kind }) {
  switch (kind) {
    case 'heavy':
      return <g>
        <polygon points="4,2 12,8 12,16 4,22" fill="#b5392e" stroke="#3a1612" strokeWidth="1.1" strokeLinejoin="round" />
        <rect x="8" y="5" width="26" height="14" rx="4" fill="#6f7a86" stroke="#242a31" strokeWidth="1.2" />
        <path d="M34 5 Q47 12 34 19 Z" fill="#d9442f" stroke="#3a1612" strokeWidth="1.2" strokeLinejoin="round" />
        <rect x="18" y="5" width="4" height="14" fill="#f2c230" />
        <path d="M10 8 H32" stroke="#ffffff" strokeWidth="1" opacity=".35" />
      </g>;
    case 'stone':
      return <g>
        <circle cx="26" cy="13" r="10" fill="#2d3239" stroke="#0e1114" strokeWidth="1.3" />
        <ellipse cx="22" cy="9.5" rx="4" ry="2.6" fill="#ffffff" opacity=".28" />
        <path d="M18 5 Q14 1 9 3" stroke="#c9b27a" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <circle cx="8.5" cy="3" r="2" fill="#ffb347" />
        <circle cx="8.5" cy="3" r="1" fill="#fff6c8" />
      </g>;
    case 'direct':
      return <g>
        <polygon points="3,6 11,10 11,14 3,18" fill="#2f86c9" stroke="#0e2a42" strokeWidth="1" strokeLinejoin="round" />
        <rect x="8" y="8.5" width="26" height="7" rx="2.5" fill="#d7dde4" stroke="#2b343d" strokeWidth="1.1" />
        <path d="M34 8.5 L46 12 L34 15.5 Z" fill="#2f86c9" stroke="#0e2a42" strokeWidth="1.1" strokeLinejoin="round" />
        <rect x="16" y="8.5" width="3" height="7" fill="#2f86c9" />
      </g>;
    case 'sky':
      return <g>
        <polygon points="3,4 12,9 12,15 3,20" fill="#7a4fd1" stroke="#2f2150" strokeWidth="1" strokeLinejoin="round" />
        <rect x="8" y="7" width="26" height="10" rx="3.5" fill="#e6e0f5" stroke="#2f2150" strokeWidth="1.1" />
        <path d="M34 7 Q47 12 34 17 Z" fill="#7a4fd1" stroke="#2f2150" strokeWidth="1.1" strokeLinejoin="round" />
        <path d="M18 14 L22 9 L26 14" stroke="#7a4fd1" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>;
    case 'cluster':
      return <g>
        <path d="M5 6 H28 Q43 6 43 12 Q43 18 28 18 H5 Z" fill="#e0892d" stroke="#4d2a08" strokeWidth="1.2" strokeLinejoin="round" />
        <circle cx="13" cy="12" r="3" fill="#3a2a16" />
        <circle cx="22" cy="9.3" r="2.6" fill="#3a2a16" />
        <circle cx="22" cy="14.7" r="2.6" fill="#3a2a16" />
        <circle cx="31" cy="12" r="2.6" fill="#3a2a16" />
        <path d="M8 8 H27" stroke="#ffffff" strokeWidth="1" opacity=".3" />
      </g>;
    default:
      return <g>
        <path d="M6 7 H30 Q46 7 46 12 Q46 17 30 17 H6 Z" fill="#c9a24a" stroke="#4a3714" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M30 7 Q46 7 46 12 Q46 17 30 17 Z" fill="#8f949c" stroke="#3b3f46" strokeWidth="1.2" strokeLinejoin="round" />
        <rect x="10" y="7" width="3" height="10" fill="#7d5d22" />
        <rect x="4" y="8" width="3" height="8" rx="1" fill="#e2c26c" stroke="#4a3714" strokeWidth="1" />
        <path d="M14 9 H28" stroke="#fff4c4" strokeWidth="1" opacity=".5" />
      </g>;
  }
}

export function WeaponIcon({ kind, size = 26 }) {
  return <svg className="tank-wicon" viewBox="0 0 48 24" width={size * 2} height={size} aria-hidden="true" focusable="false">
    <WeaponShape kind={kind} />
  </svg>;
}
