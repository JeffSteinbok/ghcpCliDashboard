import { useEffect, useCallback, useState } from "react";

export type Mode = "dark" | "light";
export type Palette =
  | "default"
  | "pink"
  | "ocean"
  | "forest"
  | "sunset"
  | "mono"
  | "neon"
  | "slate"
  | "rosegold";

export interface ThemeState {
  mode: Mode;
  palette: Palette;
}

function readTheme(): ThemeState {
  return {
    mode: (localStorage.getItem("dash-mode") as Mode) || "dark",
    palette: (localStorage.getItem("dash-palette") as Palette) || "default",
  };
}

function applyToDocument(t: ThemeState) {
  document.documentElement.setAttribute("data-mode", t.mode);
  document.documentElement.setAttribute("data-palette", t.palette);
}

export function useTheme() {
  const [theme, setTheme] = useState<ThemeState>(readTheme);

  useEffect(() => {
    applyToDocument(theme);
  }, [theme]);

  const toggleMode = useCallback(() => {
    setTheme((prev) => {
      const next: ThemeState = {
        ...prev,
        mode: prev.mode === "dark" ? "light" : "dark",
      };
      localStorage.setItem("dash-mode", next.mode);
      return next;
    });
  }, []);

  const setPalette = useCallback((p: Palette) => {
    setTheme((prev) => {
      const next: ThemeState = { ...prev, palette: p };
      localStorage.setItem("dash-palette", next.palette);
      return next;
    });
  }, []);

  return { theme, toggleMode, setPalette };
}
