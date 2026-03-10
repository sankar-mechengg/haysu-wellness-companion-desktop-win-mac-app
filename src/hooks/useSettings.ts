import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/tauriApi";
import { useAppStore } from "../store/appStore";

interface Settings {
  water_interval_min: string;
  movement_interval_min: string;
  pomodoro_work_min: string;
  pomodoro_short_break_min: string;
  pomodoro_long_break_min: string;
  pomodoro_sessions_before_long: string;
  sound_enabled: string;
  dnd_enabled: string;
  theme: string;
  widget_always_on_top: string;
  widget_visible: string;
  autostart_enabled: string;
  onboarding_complete: string;
  water_amount_ml: string;
  [key: string]: string;
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const setSoundEnabled = useAppStore((s) => s.setSoundEnabled);
  const setDnd = useAppStore((s) => s.setDnd);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const all = await api.getAllSettings();
      setSettings(all as Settings);

      // Sync store
      setSoundEnabled(all.sound_enabled !== "false");
      setDnd(all.dnd_enabled === "true");
    } catch (e) {
      console.error("Failed to load settings:", e);
    } finally {
      setLoading(false);
    }
  }, [setSoundEnabled, setDnd]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateSetting = useCallback(
    async (key: string, value: string) => {
      try {
        await api.setSetting(key, value);
        setSettings((prev) => (prev ? { ...prev, [key]: value } : null));
      } catch (e) {
        console.error(`Failed to update setting ${key}:`, e);
      }
    },
    []
  );

  const updateMultiple = useCallback(
    async (updates: Record<string, string>) => {
      try {
        await api.setMultipleSettings(updates);
        setSettings((prev) => (prev ? { ...prev, ...updates } : null));
      } catch (e) {
        console.error("Failed to update settings:", e);
      }
    },
    []
  );

  return { settings, loading, loadSettings, updateSetting, updateMultiple };
}
