import { useCallback, useEffect, useState } from "react";
import {
  api,
  type DailyStats,
  type MovementEntry,
  type PomodoroEntry,
  type Streaks,
  type WaterEntry,
} from "../lib/api";
import { localDateString, weekStart } from "../lib/format";
import { useAppStore } from "../store/appStore";

/** Today's stats, entries and streaks. Refetches whenever activity is logged. */
export function useTodayStats() {
  const activityVersion = useAppStore((s) => s.activityVersion);
  const [daily, setDaily] = useState<DailyStats | null>(null);
  const [streaks, setStreaks] = useState<Streaks | null>(null);
  const [water, setWater] = useState<WaterEntry[]>([]);
  const [movement, setMovement] = useState<MovementEntry[]>([]);
  const [pomodoro, setPomodoro] = useState<PomodoroEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const today = localDateString();
      const [d, s, w, m, p] = await Promise.all([
        api.getDailyStats(today),
        api.getStreaks(),
        api.getWaterToday(),
        api.getMovementToday(),
        api.getPomodoroToday(),
      ]);
      setDaily(d);
      setStreaks(s);
      setWater(w);
      setMovement(m);
      setPomodoro(p);
      setError(null);
    } catch (e) {
      console.error("[Haysu] stats refresh failed:", e);
      setError(String(e));
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, activityVersion]);

  // Also refresh when the day rolls over while the window stays open.
  useEffect(() => {
    let last = localDateString();
    const id = window.setInterval(() => {
      const now = localDateString();
      if (now !== last) {
        last = now;
        refresh();
      }
    }, 60_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  return { daily, streaks, water, movement, pomodoro, error, refresh };
}

/** Seven days of stats starting on the Monday `offsetWeeks` from this week. */
export function useWeeklyStats(offsetWeeks: number) {
  const activityVersion = useAppStore((s) => s.activityVersion);
  const [days, setDays] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const start = weekStart(new Date(), offsetWeeks);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getWeeklyStats(localDateString(start))
      .then((d) => {
        if (!cancelled) setDays(d);
      })
      .catch((e) => console.error("[Haysu] weekly stats failed:", e))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offsetWeeks, activityVersion]);

  return { days, loading, start };
}
