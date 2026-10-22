import { useTheme } from "../theme/useTheme";

const LABELS = { ciel: "Theme bleu ciel", rose: "Theme rose pur" };

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="theme-toggle" role="group" aria-label="Choisir le theme">
      {Object.keys(LABELS).map((name) => (
        <button
          key={name}
          type="button"
          data-t={name}
          aria-label={LABELS[name]}
          aria-pressed={theme === name}
          onClick={() => setTheme(name)}
        />
      ))}
    </div>
  );
}