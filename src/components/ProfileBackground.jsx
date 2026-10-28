import { DEFAULT_PROFILE_BACKGROUND, validProfileBackground } from '../profileBackgroundCatalog';
import '../styles/profile-backgrounds.css';

// Colonnes deterministes : aucune mesure d'ecran, minuterie JS ni re-render necessaire.
// La transparence laisse apparaitre le decor du profil et le modele 3D.
const SYMBOLS = [
  'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン',
  'ガギグゲゴザジズゼゾダヂヅデドバビブベボパピプペポヴァィゥェォャュョッ',
  'アカサタナハマヤラワイキシチニヒミリウクスツヌフムユルエケセテネヘメレ',
  'ンヲロヨモホノトソコオレメヘネテセケエルユムフヌツスクウリミヒニチシキイ',
  'ワヲン１２３４５６７８９０アイウエオカキクケコサシスセソタチツテトナニヌネノ',
];
const COLUMNS = Array.from({ length: 36 }, (_, index) => ({
  key: index,
  text: `${SYMBOLS[index % SYMBOLS.length]}${SYMBOLS[(index + 2) % SYMBOLS.length]}`,
  style: {
    '--matrix-index': index,
    '--matrix-duration': `${6.5 + ((index * 11) % 15) * 0.43}s`,
    '--matrix-delay': `${-((index * 17) % 100) / 10}s`,
  },
}));

export default function ProfileBackground({ id = DEFAULT_PROFILE_BACKGROUND }) {
  if (validProfileBackground(id) !== 'matrix-rain') return null;
  return (
    <div className="profile-background profile-background--matrix" aria-hidden="true">
      <div className="profile-background__rain">
        {COLUMNS.map((column) => (
          <span key={column.key} className="profile-background__column" style={column.style}>
            {column.text}
          </span>
        ))}
      </div>
    </div>
  );
}
