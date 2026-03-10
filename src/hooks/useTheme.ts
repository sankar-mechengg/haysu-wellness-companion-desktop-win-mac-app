import { useCallback } from "react";
import { useAppStore } from "../store/appStore";
import { api } from "../lib/tauriApi";

export function useTheme() {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);

  const initTheme = useCallback(async () => {
    try {
      const saved = await api.getSetting("theme");
      if (saved === "dark") {
        setTheme("dark");
      } else {
        setTheme("light");
      }
    } catch {
      // Default to light
      setTheme("light");
    }
  }, [setTheme]);

  const toggleTheme = useCallback(async () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    try {
      await api.setSetting("theme", next);
    } catch (e) {
      console.error("Failed to save theme setting:", e);
    }
  }, [theme, setTheme]);

  const setThemeExplicit = useCallback(
    async (mode: "light" | "dark") => {
      setTheme(mode);
      try {
        await api.setSetting("theme", mode);
      } catch (e) {
        console.error("Failed to save theme setting:", e);
      }
    },
    [setTheme]
  );

  return { theme, initTheme, toggleTheme, setTheme: setThemeExplicit };
}
