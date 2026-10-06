import { useEffect, useState } from "react";
import { create } from "zustand";
import { api, EVENTS, type CarePreset, type CareRoutine, type Weather } from "../lib/api";
import { useTauriEvent } from "./useTauriEvent";

const useCareVersion = create<{ v: number; bump: () => void }>((set) => ({
  v: 0,
  bump: () => set((s) => ({ v: s.v + 1 })),
}));

export function useCareSync() {
  const bump = useCareVersion((s) => s.bump);
  useTauriEvent(EVENTS.care, () => bump());
}

export function useCareRoutines() {
  const v = useCareVersion((s) => s.v);
  const [routines, setRoutines] = useState<CareRoutine[]>([]);
  const [presets, setPresets] = useState<CarePreset[]>([]);
  useEffect(() => {
    api
      .careList()
      .then(setRoutines)
      .catch(() => {});
  }, [v]);
  useEffect(() => {
    api
      .carePresets()
      .then(setPresets)
      .catch(() => {});
  }, []);
  return { routines, presets };
}

/** Current weather for the configured location; refreshes every 30 min. */
export function useWeather(enabled = true) {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const load = () => {
      setLoading(true);
      api
        .weatherNow()
        .then((w) => !cancelled && setWeather(w))
        .catch(() => {})
        .finally(() => !cancelled && setLoading(false));
    };
    load();
    const id = window.setInterval(load, 30 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [enabled]);
  return { weather, loading };
}
