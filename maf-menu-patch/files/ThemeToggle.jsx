import { useTheme } from "../theme/useTheme";
import { IconPalette } from "./Icons";

const NAMES = { ciel: "bleu ciel", rose: "rose pur" };

// Une seule icone : chaque clic passe au theme suivant (bleu ciel <-> rose).
export default function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      type="button"
      className="btn btn--round btn--glass theme-icon"
      aria-label={`Changer de theme (actuel : ${NAMES[theme]})`}
      title="Changer de theme"
      onClick={toggle}
    >
      <IconPalette size={22} />
    </button>
  );
}
