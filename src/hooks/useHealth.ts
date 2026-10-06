import { useCallback, useEffect, useState } from "react";
import { create } from "zustand";
import {
  api,
  EVENTS,
  type AdherenceStats,
  type Condition,
  type DiaryEntry,
  type DoseSlot,
  type FoodEntry,
  type Measurement,
  type MeasurementKind,
  type Medicine,
} from "../lib/api";
import { useTauriEvent } from "./useTauriEvent";

/** Bumps whenever the backend reports a health-data change. */
const useHealthVersion = create<{ v: number; bump: () => void }>((set) => ({
  v: 0,
  bump: () => set((s) => ({ v: s.v + 1 })),
}));

/** Mount once per window so the hooks below refetch on changes. */
export function useHealthSync() {
  const bump = useHealthVersion((s) => s.bump);
  useTauriEvent<string>(EVENTS.health, () => bump());
}

function useLoader<T>(load: () => Promise<T>, initial: T, deps: unknown[]) {
  const version = useHealthVersion((s) => s.v);
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setData(await load());
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    let cancelled = false;
    load()
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, ...deps]);

  return { data, loading, error, refresh };
}

export function useMedicines() {
  return useLoader<Medicine[]>(() => api.listMedicines(), [], []);
}

export function useDoseSchedule(date: string) {
  return useLoader<DoseSlot[]>(() => api.getDoseSchedule(date), [], [date]);
}

export function useAdherence(days: number) {
  return useLoader<AdherenceStats | null>(() => api.getAdherence(days), null, [days]);
}

export function useConditions() {
  return useLoader<Condition[]>(() => api.listConditions(), [], []);
}

export function useDiary(from: string, to: string) {
  return useLoader<DiaryEntry[]>(() => api.listDiary(from, to), [], [from, to]);
}

export function useMeasurements(kind: MeasurementKind | undefined, days: number) {
  return useLoader<Measurement[]>(() => api.listMeasurements(kind, days), [], [kind, days]);
}

export function useFood(days: number) {
  return useLoader<FoodEntry[]>(() => api.listFood(days), [], [days]);
}

export function useSymptomSuggestions() {
  return useLoader<string[]>(() => api.getSymptomSuggestions(), [], []);
}
