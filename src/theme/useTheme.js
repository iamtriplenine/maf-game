import { useCallback, useEffect, useState } from "react";

export const THEMES = ["ciel", "rose"];
const KEY = "maf-theme";

function readTheme() {
  try {
    const saved = localStorage.getItem(KEY);
    return THEMES.includes(saved) ? saved : "ciel";
  } catch {
    return "ciel";
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState(readTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* stockage indisponible : on ignore */
    }
  }, [theme]);

  const setTheme = useCallback((next) => {
    if (THEMES.includes(next)) setThemeState(next);
  }, []);

  const toggle = useCallback(() => {
    setThemeState((current) => (current === "ciel" ? "rose" : "ciel"));
  }, []);

  return { theme, setTheme, toggle };
}