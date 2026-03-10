import { useState, useCallback } from "react";
import { api, DailyStats, WaterEntry, MovementEntry, PomodoroEntry } from "../lib/tauriApi";

/** Get today's date in YYYY-MM-DD format */
function todayStr(): string {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

/** Get the Monday of the current week in YYYY-MM-DD */
function weekStartStr(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split("T")[0];
}

export function useStats() {
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<DailyStats[]>([]);
  const [waterEntries, setWaterEntries] = useState<WaterEntry[]>([]);
  const [movementEntries, setMovementEntries] = useState<MovementEntry[]>([]);
  const [pomodoroEntries, setPomodoroEntries] = useState<PomodoroEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const loadDailyStats = useCallback(async (date?: string) => {
    try {
      setLoading(true);
      const d = date || todayStr();
      const stats = await api.getDailyStats(d);
      setDailyStats(stats);
      return stats;
    } catch (e) {
      console.error("Failed to load daily stats:", e);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadWeeklyStats = useCallback(async (startDate?: string) => {
    try {
      setLoading(true);
      const d = startDate || weekStartStr();
      const stats = await api.getWeeklyStats(d);
      setWeeklyStats(stats);
      return stats;
    } catch (e) {
      console.error("Failed to load weekly stats:", e);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTodayEntries = useCallback(async () => {
    try {
      const [water, movement, pomodoro] = await Promise.all([
        api.getWaterToday(),
        api.getMovementToday(),
        api.getPomodoroToday(),
      ]);
      setWaterEntries(water);
      setMovementEntries(movement);
      setPomodoroEntries(pomodoro);
    } catch (e) {
      console.error("Failed to load today entries:", e);
    }
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([loadDailyStats(), loadTodayEntries()]);
  }, [loadDailyStats, loadTodayEntries]);

  return {
    dailyStats,
    weeklyStats,
    waterEntries,
    movementEntries,
    pomodoroEntries,
    loading,
    loadDailyStats,
    loadWeeklyStats,
    loadTodayEntries,
    refresh,
    todayStr,
    weekStartStr,
  };
}
