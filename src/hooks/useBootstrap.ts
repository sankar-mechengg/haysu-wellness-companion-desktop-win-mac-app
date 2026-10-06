import { useEffect } from "react";
import { api, EVENTS, type AppConfig, type AppStateSnapshot, type UserProfile } from "../lib/api";
import { useAppStore } from "../store/appStore";
import { useTauriEvent } from "./useTauriEvent";

/**
 * Loads config, live state, profile and system info once, keeps them in sync
 * through backend events, and applies the theme to <html>.
 * Call exactly once per window.
 */
export function useBootstrap() {
  const setConfig = useAppStore((s) => s.setConfig);
  const setLive = useAppStore((s) => s.setLive);
  const setProfile = useAppStore((s) => s.setProfile);
  const setSystem = useAppStore((s) => s.setSystem);
  const setHotkeyErrors = useAppStore((s) => s.setHotkeyErrors);
  const setReady = useAppStore((s) => s.setReady);
  const bumpActivity = useAppStore((s) => s.bumpActivity);
  const setResolvedTheme = useAppStore((s) => s.setResolvedTheme);
  const theme = useAppStore((s) => s.config?.theme ?? "light");
  const darkVariant = useAppStore((s) => s.config?.dark_variant ?? "grey");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [config, live, profile, system, hotkeyErrors] = await Promise.all([
        api.getConfig(),
        api.getAppState(),
        api.getUserProfile().catch(() => null),
        api.getSystemInfo(),
        api.getHotkeyStatus().catch(() => []),
      ]);
      if (cancelled) return;
      setConfig(config);
      setLive(live);
      setProfile(profile);
      setSystem(system);
      setHotkeyErrors(hotkeyErrors);
      setReady(true);
    })().catch((e) => {
      console.error("[Haysu] bootstrap failed:", e);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [setConfig, setLive, setProfile, setSystem, setHotkeyErrors, setReady]);

  useTauriEvent<AppConfig>(EVENTS.config, setConfig);
  useTauriEvent<AppStateSnapshot>(EVENTS.tick, setLive);
  useTauriEvent<UserProfile>(EVENTS.profile, setProfile);
  useTauriEvent<string>(EVENTS.activity, () => bumpActivity());

  // Theme → <html class="dark theme-blue">
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && media.matches);
      document.documentElement.classList.toggle("dark", dark);
      document.documentElement.classList.toggle("theme-blue", darkVariant === "blue");
      setResolvedTheme(dark ? "dark" : "light");
    };
    apply();
    if (theme !== "system") return;
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme, darkVariant, setResolvedTheme]);
}
