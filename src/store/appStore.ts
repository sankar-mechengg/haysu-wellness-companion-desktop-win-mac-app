import { create } from "zustand";
import type { AppConfig, AppStateSnapshot, HotkeyError, SystemInfo, UserProfile } from "../lib/api";

export type ResolvedTheme = "light" | "dark";

interface AppStore {
  ready: boolean;
  config: AppConfig | null;
  live: AppStateSnapshot | null;
  profile: UserProfile | null;
  system: SystemInfo | null;
  hotkeyErrors: HotkeyError[];
  resolvedTheme: ResolvedTheme;
  /** Bumped whenever an activity is logged, so views can refetch. */
  activityVersion: number;
  updateAvailable: { version: string; notes: string } | null;

  setReady: (ready: boolean) => void;
  setConfig: (config: AppConfig) => void;
  setLive: (live: AppStateSnapshot) => void;
  setProfile: (profile: UserProfile | null) => void;
  setSystem: (system: SystemInfo) => void;
  setHotkeyErrors: (errors: HotkeyError[]) => void;
  setResolvedTheme: (theme: ResolvedTheme) => void;
  bumpActivity: () => void;
  setUpdateAvailable: (u: AppStore["updateAvailable"]) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  ready: false,
  config: null,
  live: null,
  profile: null,
  system: null,
  hotkeyErrors: [],
  resolvedTheme: "light",
  activityVersion: 0,
  updateAvailable: null,

  setReady: (ready) => set({ ready }),
  setConfig: (config) => set({ config }),
  setLive: (live) => set({ live }),
  setProfile: (profile) => set({ profile }),
  setSystem: (system) => set({ system }),
  setHotkeyErrors: (hotkeyErrors) => set({ hotkeyErrors }),
  setResolvedTheme: (resolvedTheme) => set({ resolvedTheme }),
  bumpActivity: () => set((s) => ({ activityVersion: s.activityVersion + 1 })),
  setUpdateAvailable: (updateAvailable) => set({ updateAvailable }),
}));

/** Convenience selectors. */
export const useConfig = () => useAppStore((s) => s.config);
export const useLive = () => useAppStore((s) => s.live);
export const useProfile = () => useAppStore((s) => s.profile);
export const usePlatform = () => useAppStore((s) => s.system?.platform ?? "windows");
